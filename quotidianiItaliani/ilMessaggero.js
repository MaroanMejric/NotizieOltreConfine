const QuotidianoItaliano = require('../quotidianoItaliano');

const nomeQuotidiano = 'ilMessaggero';
const linkQuotidiano = 'https://www.ilmessaggero.it/';
const nomePaese = 'Italia';
const nomeContinente = 'Europa';

const classeTitoli = 'titolo';

const ilMessaggero = new QuotidianoItaliano(nomeQuotidiano, linkQuotidiano, nomePaese, nomeContinente, classeTitoli);

async function scrapeTitles() {                            //carica nel database tutti i titoli presenti nella pagina del quotidiano senza duplicati
    await ilMessaggero.scrapeTitles();
}

async function checkTopicDiscussed(titleToCheck) {                  //ritorna true se l'argomento non é giá stato trattato dal quotidiano in question ed é quindi pubblicabile, altrimenti ritorna false
    return await ilMessaggero.checkTopicDiscussed(titleToCheck);
}

module.exports = { scrapeTitles, checkTopicDiscussed };