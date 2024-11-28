
const dbClient = require('../config/dbClient')


exports.getUser = async(username) => {

    const client  = await dbClient.getDbClient()
    try {
        const query = 'select * from administrators WHERE adm_email = $1'
        const values = [username]
        client.connect()
        const result = await client.query(query, values);
        // Check if rows were affected
        
        return {status:200, msg: result.rows[0]}
    } catch(err) {
        console.log('errac=', err)
        return {status:500, msg: err} 
    }
    

}