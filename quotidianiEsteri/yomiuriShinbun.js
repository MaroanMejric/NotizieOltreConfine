const { QuotidianoEstero, axios, cheerio } = require('../quotidianoEstero');

const nomeQuotidiano = 'yomiuriShinbun';
const linkQuotidiano = 'https://www.yomiuri.co.jp/';
const nomePaese = 'Giappone';
const nomeContinente = 'Asia';

const yomiuriShinbun = new QuotidianoEstero(nomeQuotidiano, linkQuotidiano, nomePaese, nomeContinente);

async function scrapeTitles() {                                                                  //carica nel database tutti i titoli presenti nella pagina del quotidiano senza duplicati
    try{
        const response = await axios.get(linkQuotidiano);
        const $ = cheerio.load(response.data);
        
        let filteredTitles = $('.title').filter((i, el) => {
            let infoSibling = $(el).next();
            return infoSibling.hasClass('info') && !infoSibling.find('svg').length;               //ho rimosso quelli con il tag svg poiché sono gli articoli a pagamento
        });

        let arrayOggettiArticolo = filteredTitles.map((i, el) => {
            let titleText = $(el).text().trim();
            let linkHref = $(el).find('a').attr('href');
    
            if (linkHref && linkHref.includes('yomiuri.co.jp')) {                               //ci sono link anche di altre pagine
                return { titolo: titleText, link: linkHref };
            }
        }).get();
        
        await yomiuriShinbun.loadScrapedTitles(arrayOggettiArticolo);
    }catch (e) {
        console.error('Error scraping data' + e + ' at line : ' + e.stack);
        return;
    }
}

async function loadText(link) {                                                                   // carica il testo dell'articolo nel database
    try {
        const response = await axios.get(link);
        const $ = cheerio.load(response.data);
        let paragraphs = $('p[itemprop="articleBody"]');
        var testoArticolo = '';

        paragraphs.each(function() {
            testoArticolo += $(this).text() + ' ';
        });

        testoArticolo = testoArticolo.replace(/'/g, "\\'").replace(/"/g, '\\"').trim();

        await yomiuriShinbun.loadArticleText(link, testoArticolo);

        return testoArticolo;
    } catch (e) {
        console.error('Error loading articleText' + e + ' at line : ' + e.stack);
        return;
    }
}

module.exports = { scrapeTitles, loadText };