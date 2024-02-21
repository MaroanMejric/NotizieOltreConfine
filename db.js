const mysql = require('mysql');
require('dotenv').config();

const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    connectTimeout: 15000
});

async function queryAsync(sql) {
    try {
        const RETRY_DELAY = 2000;

        async function executeWithRetries(fn) {
            while (true) {
                try {
                    return await fn();
                } catch (error) {
                    console.log('SQL error --> ' + error + 'at lien ' + error.stack);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                }
            }
        }

        async function performTransaction(connection) {
            const transactionId = Math.random().toString(36).substr(2, 9);
            return new Promise((resolve, reject) => {
                connection.beginTransaction(async (beginErr) => {
                    if (beginErr) {
                        reject(beginErr);
                        return;
                    }

                    try {
                        const result = await executeWithRetries(() => {
                            return new Promise((resolveQuery, rejectQuery) => {
                                connection.query(sql, (queryErr, result) => {
                                    if (queryErr) {
                                        connection.rollback(() => {
                                            rejectQuery(queryErr);
                                        });
                                    } else {
                                        connection.commit((commitErr) => {
                                            if (commitErr) {
                                                connection.rollback(() => {
                                                    rejectQuery(commitErr);
                                                });
                                            } else {
                                                resolveQuery(result);
                                            }
                                        });
                                    }
                                });
                            });
                        });

                        resolve(result);
                    } catch (transactionError) {
                        console.log('transactionError is --> ' + transactionError);
                        reject(transactionError);
                    }
                });
            });
        }

        let connection = null;

        while (!connection) {
            try {
                connection = await getConnectionFromPool(pool);
            } catch (connectionError) {
                console.log(`Error connecting to the database. Retrying in ${RETRY_DELAY / 1000} seconds...`);
                console.log('connectionError is --> ' + connectionError);

                if (connection) {
                    connection.release();
                }

                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
        }

        try {
            const queryResult = await performTransaction(connection);
            return queryResult;
        } catch (queryError) {
            console.log('queryError --> ' + queryError);
            throw queryError;
        } finally {
            try {
                if (connection) {
                    connection.release();
                }
            } catch (releaseError) {
                console.error('Error releasing database connection : ', releaseError);
            }
        }
    } catch (e) {
        console.log('\x1b[37m', 'ERROR QUERY ASYNC ' + e + ' at line : ' + e.stack);
        throw e;
    }
}

function getConnectionFromPool(pool) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                console.log('err is --> ' + err);
                reject(err);
            } else {
                resolve(connection);
            }
        });
    });
}

module.exports = { queryAsync };