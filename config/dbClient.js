const cf = require('./config.json');
const { Client } = require('pg');



exports.getDbClient = async() =>  {
    // Setup database connection
    const client = new Client({
        host: cf.dbhost,
        port: cf.dbport,
        user: cf.dbuser,
        password: cf.dbpassword,
        database: cf.dbdatabase, 
        ssl: true  // Enable SSL
    });

    return client
}