const { QuotidianoEstero, axios, cheerio } = require('../quotidianoEstero');
const puppeteer = require('puppeteer');                                                         //ho dovuto utilizzare puppeteer a cause del 'lazy loading', per caricare l'intera pagina bisogna scrollarla per intero

const nomeQuotidiano = 'alJazeera';
const linkQuotidiano = 'https://www.aljazeera.com/';
const nomePaese = 'Qatar';
const nomeContinente = 'Asia';

const alJazeera = new QuotidianoEstero(nomeQuotidiano, linkQuotidiano, nomePaese, nomeContinente);

async function autoScroll(page) {                                                                //funzione che semplicemente scrolla fino in fondo in una pagina di un browser Puppeteer
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            let totalHeight = 0;
            let distance = 1000;
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

async function scrapeTitles() {                                                                //carica nel database tutti i titoli presenti nella pagina del quotidiano senza duplicati
    try{
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(linkQuotidiano, { waitUntil: 'networkidle2' });

        await autoScroll(page);

        const arrayOggettiArticolo = await page.evaluate(() => {
            const items = Array.from(document.getElementsByClassName('article-card--type-post'));
            let allArticles = [];

            items.forEach(item => {
                const aTags = item.querySelectorAll('a');                                                   // Trova tutti i tag <a> all'interno del singolo item
                aTags.forEach(aTag => {
                    allArticles.push({
                        titolo: aTag.innerText.trim().replace(/-/g, ''),
                        link: aTag.href
                    });
                });
            });

            return allArticles;
        });

        await browser.close();
        await alJazeera.loadScrapedTitles(arrayOggettiArticolo);
    }catch (e) {
        console.error('Error scraping data' + e + ' at line : ' + e.stack);
        return;
    }
}

async function loadText(link) {                                                                   // carica il testo dell'articolo nel database
    try {
        const response = await axios.get(link);
        const $ = cheerio.load(response.data);
        let testoArticolo = '';
        $('#main-content-area p:not([class])').each(function() {
            testoArticolo += $(this).text() + ' ';
        });

        testoArticolo = testoArticolo.replace(/'/g, "\\'").replace(/"/g, '\\"').trim();

        await alJazeera.loadArticleText(link, testoArticolo);
        
        return testoArticolo;
    } catch (e) {
        console.error('Error loading articleText' + e + ' at line : ' + e.stack);
        return;
    }
}

module.exports = { scrapeTitles, loadText };