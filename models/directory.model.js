

const dbClient = require('../config/dbClient')





exports.getPayerByEmail= async(email) => {

    const client  = await dbClient.getDbClient()
    try {
        let query = 'select p.*, a.* from payer_details as p left join administrators as a'
        query +=     ' on p.payer_id = a.payer_id where a.adm_email = $1'
        const values = [email]
        client.connect()
        const result = await client.query(query, values);
        // Check if rows were affected
        //console.log('result=', result)
        if(result.rows.length > 0) {
            return {status:200, msg: result.rows[0]}
        } else {
            return {status:404, msg: 'Email does not exist'} 
        }
    } catch(err) {
        console.log('errac=', err)
        return {status:500, msg: err} 
    }
    

}