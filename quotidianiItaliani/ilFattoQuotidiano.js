const QuotidianoItaliano = require('../quotidianoItaliano');

const nomeQuotidiano = 'ilFattoQuotidiano';
const linkQuotidiano = 'https://www.ilfattoquotidiano.it/';
const nomePaese = 'Italia';
const nomeContinente = 'Europa';

const classeTitoli = 'p-item';

const ilFattoQuotidiano = new QuotidianoItaliano(nomeQuotidiano, linkQuotidiano, nomePaese, nomeContinente, classeTitoli);

async function scrapeTitles() {                                  //carica nel database tutti i titoli presenti nella pagina del quotidiano senza duplicati
    await ilFattoQuotidiano.scrapeTitles();
}

async function checkTopicDiscussed(titleToCheck) {                  //ritorna true se l'argomento non é giá stato trattato dal quotidiano in question ed é quindi pubblicabile, altrimenti ritorna false
    return await ilFattoQuotidiano.checkTopicDiscussed(titleToCheck);
}

module.exports = { scrapeTitles, checkTopicDiscussed };