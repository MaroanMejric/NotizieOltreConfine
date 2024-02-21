const axios = require('axios');
const cheerio = require('cheerio');
const { queryAsync } = require('./db');

class QuotidianoEstero {
    constructor(nomeQuotidiano, linkQuotidiano, nomePaese, nomeContinente) {
        this.nomeQuotidiano = nomeQuotidiano;
        this.linkQuotidiano = linkQuotidiano;
        this.nomePaese = nomePaese;
        this.nomeContinente = nomeContinente;
    }

    async addNewsPaper() {                               //aggiunge il quotidiano nel caso non sia contenuto all'interno del database
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

    async loadScrapedTitles(arrayOggettiArticolo) {         //passo come parametro [{titolo: 'titolo1', link: 'link1'}, {titolo: 'titolo2', link: 'link2'}, ... ]
        var resultIdQuotidiano = await queryAsync(`SELECT idQuotidiano FROM tblquotidiani WHERE nomeQuotidiano = '${this.nomeQuotidiano}'`);
        if (resultIdQuotidiano.length == 0) {
            await this.addNewsPaper();
            resultIdQuotidiano = await queryAsync(`SELECT idQuotidiano FROM tblquotidiani WHERE nomeQuotidiano = '${this.nomeQuotidiano}'`);
        }

        var idQuotidiano = resultIdQuotidiano[0].idQuotidiano;

        for (const singleArticle of arrayOggettiArticolo) {
            var escapedTitle = singleArticle.titolo.replace(/'/g, "\\'").replace(/"/g, '\\"'); 
            var resultStessoArticolo = await queryAsync(`SELECT idNotiziaEstera FROM tblnotizieestere WHERE quotidiano = ${idQuotidiano} AND (titoloNotiziaEstera = '${escapedTitle}' OR linkNotiziaEstera = '${singleArticle.link}')`);
            if(resultStessoArticolo.length==0){                               //per evitare duplicati
                queryAsync(`INSERT INTO tblnotizieestere (quotidiano, titoloNotiziaEstera, linkNotiziaEstera) VALUES (${idQuotidiano},'${escapedTitle}','${singleArticle.link}')`);
            }
        }
    }

    async loadArticleText(linkArticolo, testoArticolo) {                       //caricheró i testi solo degli articoli che verranno tradotti e riscritti
        queryAsync(`UPDATE tblnotizieestere SET testoNotiziaEstera = '${testoArticolo}' WHERE linkNotiziaEstera = '${linkArticolo}'`);
    }
}

module.exports = { QuotidianoEstero, axios, cheerio };