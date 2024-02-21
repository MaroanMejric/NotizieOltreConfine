const { QuotidianoEstero, axios, cheerio } = require('../quotidianoEstero');

const nomeQuotidiano = 'cnn';
const linkQuotidiano = 'https://edition.cnn.com/';
const nomePaese = 'USA';
const nomeContinente = 'Nord America';

const cnn = new QuotidianoEstero(nomeQuotidiano, linkQuotidiano, nomePaese, nomeContinente);

async function scrapeTitles() {                                                                  //carica nel database tutti i titoli presenti nella pagina del quotidiano senza duplicati
    try{
        const response = await axios.get(linkQuotidiano);
        const $ = cheerio.load(response.data);
        var arrayOggettiArticolo = [];

        $('.container__headline-text').each(function() {
            const titolo = $(this).text().trim();
            const relativeLink = $(this).parent().parent().parent().attr('href');
            const fullLink = `https://edition.cnn.com${relativeLink}`;
            arrayOggettiArticolo.push({ titolo: titolo, link: fullLink });
        });

        await cnn.loadScrapedTitles(arrayOggettiArticolo);
    }catch (e) {
        console.error('Error scraping data' + e + ' at line : ' + e.stack);
        return;
    }
}

async function loadText(link) {                                                                   // carica il testo dell'articolo nel database
    try {
        const response = await axios.get(link);
        const $ = cheerio.load(response.data);
        let testoArticolo = $('.paragraph.inline-placeholder').map((i, el) => {
            return $(el).text().trim();
        }).get().join(' ');

        testoArticolo = testoArticolo.replace(/'/g, "\\'").replace(/"/g, '\\"').trim();

        await cnn.loadArticleText(link, testoArticolo);

        return testoArticolo;
    } catch (e) {
        console.error('Error loading articleText' + e + ' at line : ' + e.stack);
        return;
    }
}

module.exports = { scrapeTitles, loadText };