const axios = require('axios');
const cheerio = require('cheerio');
const { queryAsync } = require('./db');
const { queryChatGPT } = require('./chatGPT');

class QuotidianoItaliano {
    constructor(nomeQuotidiano, linkQuotidiano, nomePaese, nomeContinente, classeTitoli) {
        this.nomeQuotidiano = nomeQuotidiano;
        this.linkQuotidiano = linkQuotidiano;
        this.nomePaese = nomePaese;
        this.nomeContinente = nomeContinente;
        this.classeTitoli = classeTitoli;
    }

    async addNewsPaper() {                      //aggiunge il quotidiano nel caso non sia contenuto all'interno del database
        var resultIdPaese = await queryAsync(`SELECT idPaese FROM tblpaesi WHERE nomePaese = '${this.nomePaese}'`);
        if (resultIdPaese.length == 0) {
            const resultIdContinente = await queryAsync(`SELECT idContinente FROM tblcontinenti WHERE nomeContinente = '${this.nomeContinente}'`);
            const idContinente = resultIdContinente[0].idContinente;
            await queryAsync(`INSERT INTO tblpaesi (nomePaese, continente) VALUES ('${this.nomePaese}',${idContinente})`);
            resultIdPaese = await queryAsync(`SELECT idPaese FROM tblpaesi WHERE nomePaese = '${this.nomePaese}'`);
        }

        var idPaese = resultIdPaese[0].idPaese;

        await queryAsync(`INSERT INTO tblquotidiani (nomeQuotidiano, linkQuotidiano, paeseProvenienza) VALUES ('${this.nomeQuotidiano}', '${this.linkQuotidiano}', ${idPaese})`);
    }

    async scrapeTitles() {                             //carica nel database tutti i titoli presenti nella pagina del quotidiano senza duplicati
        try{
            var resultIdQuotidiano = await queryAsync(`SELECT idQuotidiano FROM tblquotidiani WHERE nomeQuotidiano = '${this.nomeQuotidiano}'`);
            if (resultIdQuotidiano.length == 0) {
                await this.addNewsPaper();
                resultIdQuotidiano = await queryAsync(`SELECT idQuotidiano FROM tblquotidiani WHERE nomeQuotidiano = '${this.nomeQuotidiano}'`);
            }

            var idQuotidiano = resultIdQuotidiano[0].idQuotidiano;

            var currentTitles = [];
            try {
                const response = await axios.get(this.linkQuotidiano);
                const $ = cheerio.load(response.data);
                currentTitles = $(`.${this.classeTitoli}`).map((i, el) => $(el).text()).get();
                currentTitles = currentTitles.map(title => title.replace(/(\r\n|\n|\r)/gm, "").replace(/'/g, "\\'").replace(/"/g, '\\"').trim());
            } catch (e) {
                console.error('Error scraping data' + e + ' at line : ' + e.stack);
                return;
            }

            const resultTitoliUltimoControllo = await queryAsync(`SELECT idNotiziaItaliana, listaTitoliNotizieItaliane FROM tblnotizieitaliane WHERE DATE(ultimoAggiornamento) = CURDATE() AND quotidiano = ${idQuotidiano} ORDER BY ultimoAggiornamento DESC LIMIT 1`);
            if (resultTitoliUltimoControllo.length == 0) {
                queryAsync(`INSERT INTO tblnotizieitaliane (quotidiano, listaTitoliNotizieItaliane) VALUES (${idQuotidiano}, '${currentTitles}')`);
            } else {
                queryAsync(`UPDATE tblnotizieitaliane SET listaTitoliNotizieItaliane = '${currentTitles}', ultimoAggiornamento = NOW() WHERE idNotiziaItaliana = ${resultTitoliUltimoControllo[0].idNotiziaItaliana}`);
            }
        }catch (e) {
            console.error('Error scraping data' + e + ' at line : ' + e.stack);
            return;
        }
    }

    async checkTopicDiscussed(titleToCheck) {                //ritorna true se l'argomento non é giá stato trattato dal quotidiano in question ed é quindi pubblicabile, altrimenti ritorna false
        try{
            var resultIdQuotidiano = await queryAsync(`SELECT idQuotidiano FROM tblquotidiani WHERE nomeQuotidiano = '${this.nomeQuotidiano}'`);
            var idQuotidiano = resultIdQuotidiano[0].idQuotidiano;
            const resultTitoliUltimoControllo = await queryAsync(`SELECT listaTitoliNotizieItaliane FROM tblnotizieitaliane WHERE DATE(ultimoAggiornamento) >= CURDATE() - INTERVAL 1 DAY AND DATE(ultimoAggiornamento) <= CURDATE() AND quotidiano = ${idQuotidiano} ORDER BY ultimoAggiornamento DESC LIMIT 2`);

            for (const singleList of resultTitoliUltimoControllo) {
                try {
                    var answerChatGPT = await queryChatGPT(`Il titolo "${titleToCheck}" é trattato o ha qualcosa in comune con uno o piú dei seguenti titoli? Rispondi esattamente 'si' o 'no' (sii molto scrupoloso al minimo sospetto rispondimi con 'si'). \n \n ${singleList.listaTitoliNotizieItaliane}`);
                    answerChatGPT = answerChatGPT.toLowerCase();
                    if (answerChatGPT.includes('si') || answerChatGPT.includes('yes')) {   //avvolte risponde in inglese anche se gli ho detto di rispondere 'si' oppure 'no'
                        return false;
                    }
                } catch (e) {
                    return await this.checkTopicDiscussed(titleToCheck);
                }
            }
            return true;
        }catch (e) {
            console.error('Error chekingTopic data' + e + ' at line : ' + e.stack);
            return;
        }
    }
}

module.exports = QuotidianoItaliano;