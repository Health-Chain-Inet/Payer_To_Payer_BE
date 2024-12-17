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
        ssl: { rejectUnauthorized: false }, // Ensuring SSL is enabled correctly in production
        max: 20, // Number of connections in the pool (adjust as necessary)
        idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
        connectionTimeoutMillis: 2000, // Timeout for acquiring a connection from the pool
    });

    return client
}