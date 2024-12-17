
const dbClient = require('../config/dbClient')
const moment = require('moment-timezone');


exports.getPayerIdByEmail = async(email) => {
    const client  = await dbClient.getDbClient()
    try {
        let query = 'select a.payer_id, p.payer_name from administrators as a '
        query += ' left join payer_details p on a.payer_id = p.payer_id '
        query += ' where a.adm_email = $1'
        const values = [email]
        client.connect();
        const result = await client.query(query, values);
        // Check if rows were affected
        if(result.rows.length > 0) {
            client.end();
            return {status:200, msg: { payer_id: result.rows[0].payer_id, payer_name:result.rows[0].payer_name }}
        } else {
            client.end();
            return {status:404, msg: 'Email does not exist'} 
        }
    } catch(err) {
        console.log('getPayerIdByEmail=', err)
        return {status:500, msg: err} 
    } 
}

exports.getEmailByPayerId = async(payer_id) => {
    const client  = await dbClient.getDbClient()
    try {
        let query = 'select a.adm_email, p.payer_name from administrators as a '
        query += ' left join payer_details p on a.payer_id=p.payer_id '
        query += ' where a.payer_id = $1'
        const values = [payer_id]
        client.connect();
        const result = await client.query(query, values);
        // Check if rows were affected
        //console.log('result=', result)
        if(result.rows.length > 0) {
            client.end();
            return {status:200, msg: { email: result.rows[0].adm_email, payer_name:result.rows[0].payer_name }}
        } else {
            client.end();
            return {status:404, msg: 'Email does not exist'} 
        }
    } catch(err) {
        console.log('getEmailByPayerId=', err)
        return {status:500, msg: err} 
    } 
}

exports.checkIfCertificateVerified = async (npid,opid) => {
    const client  = await dbClient.getDbClient()
    try {

        let query = ' SELECT COUNT(*)  as cnt FROM certificates WHERE payer_id IN ($1,$2) '
        query += ' AND certificate_verified = $3 '
        //query += ' where a.payer_id = $1'
        const values = [npid,opid, true]
        client.connect();
        const result = await client.query(query, values);
        // Check if rows were affected
        //console.log('result=', result)
        if(result.rows.length > 0) {
            if(result.rows[0].cnt == 4) {
                client.end();
                return {status:200, msg: 'Verified'}
            } else {
                client.end();
                return {status:200, msg: 'Not-Verified'}
            }
        } else {
            client.end();
            return {status:404, msg: 'Not-Verified'} 
        }
    } catch(err) {
        console.log('checkIfCertificateVerified=', err)
        return {status:500, msg: 'Not-Verified'} 
    } 
}

exports.payerConnect = async(npid,opid,npsv, opsv, status, remarks) => {
   const created_date = moment().tz('America/Los_Angeles').format();
   let iquery = "";
   iquery += "insert into p2p_connect (new_payer_id, old_payer_id, new_payer_side_validation, "
   iquery += "old_payer_side_validation, status, remarks, created_date) "
   iquery += " values($1,$2,$3,$4,$5,$6,$7) "
   iquery += " ON CONFLICT (new_payer_id, old_payer_id) "
   iquery += " DO update  SET status =  '"+status+"',"
   iquery += " remarks = '"+remarks+"', created_date = '"+created_date+"', "
   iquery += " new_payer_side_validation='"+npsv+"', old_payer_side_validation='"+opsv+"' "

   const values = [npid,opid,npsv,opsv,status,remarks, created_date]
   const client  = await dbClient.getDbClient()
   try {
         client.connect();
        // Begin the transaction
        await client.query('BEGIN'); 
        console.log('Transaction started.')
        const pconnected =  await client.query(iquery, values);
        await client.query('COMMIT');
        console.log('Transaction committed successfully.');
        await client.end();
        return {'status':200, 'data':pconnected} 
   }
   catch(err) {
    console.error('Error occurred during transaction:', err)
    console.log('Transaction rolled back.')
    return {'status':500, 'data':err}
   }
} 

exports.payerConnectUpdate = async(npid,opid,npsv, opsv, status, remarks, encodedCode) => {
    const created_date = moment().tz('America/Los_Angeles').format();
    let iquery = "";
    iquery += "update p2p_connect SET new_payer_side_validation=$1,old_payer_side_validation=$2, "
    iquery += " status=$3, remarks=$4, updated_date=$5 , secret_key=$6 "
    iquery += " where new_payer_id=$7 and old_payer_id=$8"
    const values = [npsv,opsv,status,remarks,created_date,encodedCode ,npid, opid]
    const client  = await dbClient.getDbClient()
 
    try {
        client.connect();;
        // Begin the transaction
        await client.query('BEGIN'); 
        console.log('Transaction started.')
        const pconnected =  await client.query(iquery, values);
        await client.query('COMMIT');
        console.log('Transaction committed successfully.');
        await client.end();
        return {'status':200, 'data':pconnected} 
    }
    catch(err) {
        console.error('Error occurred during transaction:', err)
        console.log('Transaction rolled back.')
        return {'status':500, 'data':err}
    } 
} 


exports.payerApprovalConns = async(opid) => {
    const client  = await dbClient.getDbClient()
    let gquery = "select np.payer_name as npname, op.payer_name as opname, pp.* from p2p_connect pp "
    gquery += " left join payer_details op on pp.old_payer_id = op.payer_id "
    gquery += " left join payer_details as np on pp.new_payer_id = np.payer_id "
    gquery += " where pp.old_payer_id = $1 and old_payer_side_validation = $2 "
    const values = [opid, false]
    try {
        client.connect();
        const result = await client.query(gquery, values);
        // Check if rows were affected
        //console.log('result=', result)
        if(result.rows.length > 0) {
            await client.end();
            return {status:200, msg: result.rows }
        } else {
            await client.end();
            return {status:404, msg: 'Payer has no active connections'} 
        }
    }
    catch(err)  {
        console.log('payerApprovalConns=', err)
        return {status:500, msg: err} 
    } 
}