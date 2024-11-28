
const dbClient = require('../config/dbClient')


exports.getUser = async(username) => {

    const client  = await dbClient.getDbClient()
    try {
        const query = 'select * from administrators WHERE adm_email = $1'
        const values = [username]
        client.connect()
        const result = await client.query(query, values);
        // Check if rows were affected
<<<<<<< HEAD
        //console.log('result=', result)
        if(result.rows.length > 0) {
            return {status:200, msg: result.rows[0].adm_password}
        } else {
            return {status:404, msg: 'Username does not exist'} 
        }
=======
        
        return {status:200, msg: result.rows[0]}
>>>>>>> 64db200899342fd38d66fb4398923e64765fda9f
    } catch(err) {
        console.log('errac=', err)
        return {status:500, msg: err} 
    }
    

}