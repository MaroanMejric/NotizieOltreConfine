const QuotidianoItaliano = require('../quotidianoItaliano');

const nomeQuotidiano = 'laStampa';
const linkQuotidiano = 'https://www.lastampa.it/';
const nomePaese = 'Italia';
const nomeContinente = 'Europa';

const classeTitoli = 'entry__title';

const laStampa = new QuotidianoItaliano(nomeQuotidiano, linkQuotidiano, nomePaese, nomeContinente, classeTitoli);

async function scrapeTitles() {                                    //carica nel database tutti i titoli presenti nella pagina del quotidiano senza duplicati
    await laStampa.scrapeTitles();
}

async function checkTopicDiscussed(titleToCheck) {                  //ritorna true se l'argomento non é giá stato trattato dal quotidiano in question ed é quindi pubblicabile, altrimenti ritorna false
    return await laStampa.checkTopicDiscussed(titleToCheck);
}

module.exports = { scrapeTitles, checkTopicDiscussed };