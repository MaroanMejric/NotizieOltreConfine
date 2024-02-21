const QuotidianoItaliano = require('../quotidianoItaliano');

const nomeQuotidiano = 'ilCorriereDellaSera';
const linkQuotidiano = 'https://www.corriere.it/';
const nomePaese = 'Italia';
const nomeContinente = 'Europa';

const classeTitoli = 'has-text-black';

const ilCorriereDellaSera = new QuotidianoItaliano(nomeQuotidiano, linkQuotidiano, nomePaese, nomeContinente, classeTitoli);

async function scrapeTitles() {                                //carica nel database tutti i titoli presenti nella pagina del quotidiano senza duplicati
    await ilCorriereDellaSera.scrapeTitles();
}

async function checkTopicDiscussed(titleToCheck) {                  //ritorna true se l'argomento non é giá stato trattato dal quotidiano in question ed é quindi pubblicabile, altrimenti ritorna false
    return await ilCorriereDellaSera.checkTopicDiscussed(titleToCheck);
}

module.exports = { scrapeTitles, checkTopicDiscussed };