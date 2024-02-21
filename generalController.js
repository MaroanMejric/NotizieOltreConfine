const fs = require('fs');
const path = require('path');
const { queryAsync } = require('./db');
const { queryChatGPT } = require('./chatGPT');

function getCurrentTime(){
    try{
        var currentTime = new Date;
        return currentTime.toLocaleTimeString();
    }catch(e){
        return getCurrentTime();
    }
}

async function getItalianModulesAsArray(){                 //mi ritorna un array con tutti i moduli all'interno della cartella ./quotidianiItaliani
    const directoryPath = path.join(__dirname, './quotidianiItaliani');
    const files = fs.readdirSync(directoryPath);
    const modulesArray = [];

    for (const file of files) {
        const modulePath = path.join(directoryPath, file);
        const newspaperModule = require(modulePath);
        modulesArray.push(newspaperModule);
    }

    return modulesArray;
}

async function scrapeDirectory(directory) {                   //per ogni modulo (quotidiano) all'interno della cartella passata come parametro carica tutti i titoli presenti nelle loro pagine web
    const directoryPath = path.join(__dirname, directory);
    const files = fs.readdirSync(directoryPath);

    for (const file of files) {
        const modulePath = path.join(directoryPath, file);
        const newspaperModule = require(modulePath);

        if (newspaperModule.scrapeTitles) {
            await newspaperModule.scrapeTitles();
        }
    }
}

async function scrapeAllTitles(){                       //carica nel database tutti i titoli dei quotidiani, prima quelli italiani e poi quelli esteri                   
    await scrapeDirectory('./quotidianiItaliani');
    await scrapeDirectory('./quotidianiEsteri');
}

async function rewriteAndTranslateArticle(articleToRewrite){                //traduce e riscrive un articolo che gli passiamo come parametro
    var sentence = `Traduci in italiano e riscrivi il seguente articolo in modo che sia facilmente comprensibile ad un lettore italiano (dammi solo il testo dell'articolo non voglio nient'altro) : "${articleToRewrite}"`;                // se si omette il 'facilmente comprensibile ad un lettore italiano', da molte cose per scontato che in realtá non lo sono
    return await queryChatGPT(sentence);
}

async function getTitleFromArticle(article){                                //genera un titolo per un articolo che gli passiamo come parametro
    var sentence = `Scrivimi il titolo in italiano di questo articolo per il mio quotidiano (dammi solo il testo del titolo non voglio nient'altro) : "${article}"`;
    return await queryChatGPT(sentence);
}

async function getIdCategoryFromArticle(article){                           //mi ritorna l'id della categoria (tblcategorie) scelta dall'IA per l'articolo passato come parametro
    try{
        var resultCategories = await queryAsync ('SELECT * FROM tblcategorie');
        var categoriesConcatenated = '';
        for (const singleCategorie of resultCategories){
            categoriesConcatenated += singleCategorie.nomeCategoria + ', ';
        }

        console.log(categoriesConcatenated);

        var sentence = `Quale di queste categorie (${categoriesConcatenated}) sceglieresti per questo articolo (dammi il testo esatto della categoria) : "${article}"`;
        const answerChatGPT = await queryChatGPT(sentence);

        for (const singleCategorie of resultCategories){
            if(answerChatGPT.toLowerCase().includes(singleCategorie.nomeCategoria.toLowerCase())){
                return singleCategorie.idCategoria;
            }
        }

        return null;
    }catch(e){
        console.error('Error getting idCategoria ' + e + ' at line : ' + e.stack);
        return null;
    }
}

async function setPublishableFlags(){                  //setta i flag pubblicabile e verificata nel database
    const italianModulesArray = await getItalianModulesAsArray();
    var resultUnverifiedArticles = await queryAsync(`SELECT idNotiziaEstera, titoloNotiziaEstera FROM tblnotizieestere WHERE verificata=0`);
    for(const singleUnverifiedArticle of resultUnverifiedArticles){
        var isItPublishable = [];           //se saranno tutti a true nessuno dei quotidiani italiani ne ha parlato
        for(const singleModule of italianModulesArray){        //avrei potuto utilizzare await Promise.all[...]; per controllare tutti i quotidiani italiani in parallelo ma ho optato per controllare un quotidiano per volta per via dei limiti di richieste per minuto che OpenAI ci permette di fare
            var isTopicUsable = await singleModule.checkTopicDiscussed(singleUnverifiedArticle.titoloNotiziaEstera);
            isItPublishable.push(isTopicUsable);
            if(!isTopicUsable){
                break;                     //esce dal for al primo false che trova (un quotidiano italiano ne ha giá parlato)
            }
        }

        var allTrue = isItPublishable.every(element => element === true);              //controlla se sono tutti true
        if(allTrue){
            await queryAsync(`UPDATE tblnotizieestere SET verificata=1, pubblicabile=1 WHERE idNotiziaEstera=${singleUnverifiedArticle.idNotiziaEstera}`);
        }else{
            await queryAsync(`UPDATE tblnotizieestere SET verificata=1 WHERE idNotiziaEstera=${singleUnverifiedArticle.idNotiziaEstera}`);
        }
    }
}

async function setCategoryAndArticleText(idNewsPaper, linkArticle){          //setta categoria e testoNotiziaEstera
    var resultNewspapers = await queryAsync(`SELECT nomeQuotidiano FROM tblquotidiani WHERE idQuotidiano = ${idNewsPaper}`); 
    if(resultNewspapers.length>0){
        var newspaperName = resultNewspapers[0].nomeQuotidiano;
        const moduleNewsPaper = require(`./quotidianiEsteri/${newspaperName}`);
        var textArticle = await moduleNewsPaper.loadText(linkArticle);               //a questo punto il testo é giá nel database
        var idCategoryArticle = await getIdCategoryFromArticle(textArticle);
        console.log(`UPDATE tblnotizieestere SET categoria = ${idCategoryArticle} WHERE linkNotiziaEstera='${linkArticle}'`);
        await queryAsync(`UPDATE tblnotizieestere SET categoria = ${idCategoryArticle} WHERE linkNotiziaEstera='${linkArticle}'`);
        return [idCategoryArticle, textArticle];
    }else{
        return;
    }
}

async function getRewrittenData(articleText){                                 //ritorna una coppia con titolo e testo riscritti dandogli il tessto originale
    var newArticleText = await rewriteAndTranslateArticle(articleText);
    var newTitle = await getTitleFromArticle(newArticleText);
    return [newTitle, newArticleText];
}

async function publishArticle(category, title, text, idOriginalArticle){                //inserisce il nuovo articolo in tblnotiziepubblicate e setta la chiave esterna nell'articolo originale
    title = title.replace(/'/g, "\\'").replace(/"/g, '\\"');        //per evitare errory SQL con i caratteri ' e "
    text = text.replace(/'/g, "\\'").replace(/"/g, '\\"');
    await queryAsync(`INSERT INTO tblnotiziepubblicate (categoria, titoloNotiziaPubblicata, testoNotiziaPubblicata) VALUES (${category},'${title}', '${text}')`);
    var resultIdPublishedArticle = await queryAsync(`SELECT idNotiziaPubblicata FROM tblnotiziepubblicate WHERE testoNotiziaPubblicata='${text}'`);
    if(resultIdPublishedArticle.length>0){
        var idPublishedArticle = resultIdPublishedArticle[0].idNotiziaPubblicata;
        queryAsync(`UPDATE tblnotizieestere SET notiziaPubblicata = ${idPublishedArticle} WHERE idNotiziaEstera = ${idOriginalArticle}`);
    }

    //pubblica su telegram ecc...
}

async function executeRoutineTasks(){                                     //mette insieme il tutto
    //console.log('\x1b[37m' + `///////////////////////////////////////////////////////////`);
    //console.log('\x1b[32m' + getCurrentTime() + ' ROUTINE HAS STARTED');
    //await scrapeAllTitles();
    //console.log('\x1b[32m' + getCurrentTime() + ' ALL TITLES HAVE BEEN SCRAPED');
    //await setPublishableFlags();
    //console.log('\x1b[32m' + getCurrentTime() + ' ALL FLAGS ARE SET');
    var resultPublishableArticles = await queryAsync(`SELECT idNotiziaEstera, quotidiano, linkNotiziaEstera FROM tblnotizieestere WHERE pubblicabile=1 AND notiziaPubblicata IS NULL`);
    for(const singlePublishableArticle of resultPublishableArticles){
        var [category, articleText] = await setCategoryAndArticleText(singlePublishableArticle.quotidiano, singlePublishableArticle.linkNotiziaEstera);
        var [newTitle, newArticleText] = await getRewrittenData(articleText);
        await publishArticle(category, newTitle, newArticleText, singlePublishableArticle.idNotiziaEstera);
        console.log('\x1b[37m' + getCurrentTime() + ` NEW ARTICLE PUBLISHED --> "${newTitle}"`);
    }
    console.log('\x1b[32m' + getCurrentTime() + ' ROUTINE COMPLETED');
    
}

module.exports = {
    executeRoutineTasks: executeRoutineTasks
};