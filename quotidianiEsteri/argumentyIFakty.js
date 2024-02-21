const { QuotidianoEstero, axios, cheerio } = require('../quotidianoEstero');

const nomeQuotidiano = 'argumentyIFakty';
const linkQuotidiano = 'https://aif.ru/';
const nomePaese = 'Russia';
const nomeContinente = 'Europa';

const argumentyIFakty = new QuotidianoEstero(nomeQuotidiano, linkQuotidiano, nomePaese, nomeContinente);

async function scrapeTitles() {                                                                 //carica nel database tutti i titoli presenti nella pagina del quotidiano senza duplicati
    try{
        const response = await axios.get(linkQuotidiano);
        const $ = cheerio.load(response.data);
        var arrayOggettiArticolo = [];

        $('.item_text').each((index, element) => {
            let titolo = $(element).text().trim();
            let link = $(element).find('a').attr('href');

            arrayOggettiArticolo.push({ titolo: titolo, link: link });
        });

        await argumentyIFakty.loadScrapedTitles(arrayOggettiArticolo);
    }catch (e) {
        console.error('Error scraping data' + e + ' at line : ' + e.stack);
        return;
    }
}

async function loadText(link) {                                                                   // carica il testo dell'articolo nel database
    try {
        const response = await axios.get(link);
        const $ = cheerio.load(response.data);
        const tagArticolo = $('.article_text').first();

        var testoArticolo = '';
        tagArticolo.find('p').each((index, element) => {               // Mette insieme tutti i tag p che sono all'interno del tag con classe 'article_text'
            testoArticolo += $(element).text() + ' ';
        });

        testoArticolo = testoArticolo.replace(/'/g, "\\'").replace(/"/g, '\\"').trim();

        await argumentyIFakty.loadArticleText(link, testoArticolo);

        return testoArticolo;
    } catch (e) {
        console.error('Error loading articleText' + e + ' at line : ' + e.stack);
        return;
    }
}

module.exports = { scrapeTitles, loadText };