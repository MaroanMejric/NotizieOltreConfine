const QuotidianoItaliano = require('../quotidianoItaliano');

const nomeQuotidiano = 'laRepubblica';
const linkQuotidiano = 'https://www.repubblica.it/';
const nomePaese = 'Italia';
const nomeContinente = 'Europa';

const classeTitoli = 'entry__title';

const laRepubblica = new QuotidianoItaliano(nomeQuotidiano, linkQuotidiano, nomePaese, nomeContinente, classeTitoli);

async function scrapeTitles() {                                 //carica nel database tutti i titoli presenti nella pagina del quotidiano senza duplicati
    await laRepubblica.scrapeTitles();
}

async function checkTopicDiscussed(titleToCheck) {                  //ritorna true se l'argomento non é giá stato trattato dal quotidiano in question ed é quindi pubblicabile, altrimenti ritorna false
    return await laRepubblica.checkTopicDiscussed(titleToCheck);
}

module.exports = { scrapeTitles, checkTopicDiscussed };