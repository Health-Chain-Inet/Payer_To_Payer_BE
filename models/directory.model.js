

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
        console.log('result=', result)
        if(result.rows.length > 0) {
            await client.end();
            return {status:200, msg: result.rows[0]}
        } else {
            await client.end();
            return {status:404, msg: 'Email does not exist'} 
        }
    } catch(err) {
        console.log('getPayerByEmail=', err)
        return {status:500, msg: err} 
    } 
}

exports.getPayerByEmailWithCertificate= async(email) => {

    const client  = await dbClient.getDbClient()
    try {
        let query = 'select p.*, a.*, c.* from payer_details as p left join administrators as a'
        query += ' on p.payer_id = a.payer_id left join certificates c'
        query += ' on c.adm_id = a.adm_id and c.payer_id = a.payer_id'
        query += ' where a.adm_email = $1 order by c.created_date limit 1'
        const values = [email]
        client.connect()
        const result = await client.query(query, values);
        // Check if rows were affected
        //console.log('result=', result)
        if(result.rows.length > 0) {
            await client.end();
            return {status:200, msg: result.rows[0]}
        } else {
            await client.end();
            return {status:404, msg: 'Email does not exist'} 
        }
    } catch(err) {
        console.log('getPayerByEmailWithCertificate=', err)
        return {status:500, msg: err} 
    } 
}


exports.getAllPayers= async() => {

    const client  = await dbClient.getDbClient()
    try {
        let query = "select p.*, a.*, (select count(*) from certificates where payer_id=p.payer_id and "
        query +=  " certificate_verified='true') as certificates_verified_count "
        query += " from payer_details as p left join administrators as a"
        query +=  " on p.payer_id = a.payer_id where a.active=$1"
        const values = [true]
        client.connect()
        const result = await client.query(query, values);
        // Check if rows were affected
        //console.log('result=', result)
        if(result.rows.length > 0) {
            await client.end();
            return {status:200, msg: result.rows}
        } else {
            await client.end();
            return {status:404, msg: 'No Payers found'} 
        }
    } catch(err) {
        console.log('getAllPayers=', err)
        return {status:500, msg: err} 
    } 
}

exports.getAllPayersNotInConnect= async(payer_id) => {

    const client  = await dbClient.getDbClient()
    try {
        let query = "select p.*, a.*, (select count(*) from certificates where payer_id=p.payer_id and "
        query +=  " certificate_verified='true') as certificates_verified_count "
        query += " from payer_details as p left join administrators as a"
        query +=  " on p.payer_id = a.payer_id where a.active=$1"
        const values = [true]
        client.connect()
        const result = await client.query(query, values);
        // Check if rows were affected
        //console.log('result=', result)
        if(result.rows.length > 0) {
            await client.end();
            return {status:200, msg: result.rows}
        } else {
            await client.end();
            return {status:404, msg: 'No Payers found'} 
        }
    } catch(err) {
        console.log('getAllPayersNotInConnect=', err)
        return {status:500, msg: err} 
    } 
}


exports.fetchCertificateDetails = async(email) => {
    const client  = await dbClient.getDbClient()
    try {
        let query = 'select c.*, p.*, a.adm_id, a.adm_name,a.adm_email, a.adm_phone  from Certificates as c left join administrators as a'
        query += ' on c.payer_id = a.payer_id and c.adm_id = a.adm_id  left join payer_details as p'
        query += ' on  a.payer_id = p.payer_id '
        query += ' where a.adm_email = $1'
        //console.log('query=', query);
        const values = [email]
        await client.connect()
        const result = await client.query(query, values);

        // Check if rows were affected
        //console.log('result=', result)
        if(result.rows.length > 0) {
            await client.end();
            return {status:200, msg: result.rows}
        } else {
            await client.end();
            return {status:404, msg: 'Email does not exist'} 
        }
    } catch(err) {
        console.log('fetchCertificateDetails=', err)
        return {status:500, msg: err} 
    } 

}


exports.certificateSubmissionOld  = async(tblcert) => {
    let payer_id = tblcert.payer_id;
    let adm_id = tblcert.adm_id;
    let email = tblcert.adm_email;
    let bundle_id = tblcert.bundle_id; 
    let validity_notbefore = tblcert.validity_notbefore;
    let validity_notafter = tblcert.validity_notafter;
    let created_date = Date.now().toString();
    let certificate_uploaded = true; 
    let certificate_verified = false; 
    let cert_type = tblcert.cert_type;
    let certificate_uploaded_adm = (cert_type == 'client')?false: true;
    let org_id = (cert_type == 'client')?'': tblcert.org_id;
    let endpoint_id = (cert_type == 'client')?'': tblcert.endpoint_id;

    let certquery = "";
    certquery += "insert into Certificates(payer_id, adm_id, email, validity_notbefore,validity_notafter, created_date, "
    certquery += " certificate_uploaded, certificate_verified, cert_type, org_id, endp_id) "
    certquery += "values('"+payer_id+"','"+adm_id+"','"+email+"','"+validity_notbefore+"','"+validity_notafter+"','"+created_date+"',"
    certquery += "'"+certificate_uploaded+"','"+certificate_verified+"','"+cert_type+"','"+org_id+"','"+endpoint_id+"') ";
    certquery += " ON CONFLICT (payer_id, adm_id, cert_type) "
    certquery += " DO update  SET validity_notbefore =  '"+validity_notbefore+"',"
    certquery += " validity_notafter = '"+validity_notafter+"', updated_date = '"+created_date+"'"
    //certquery +=  " where payer_id='"+payer_id+"', adm_id='"+adm_id+"', cert_type='"+cert_type+"'"
    console.log('certquery=', certquery);

    let updateQuery = "";
    updateQuery = "update administrators set certificate_uploaded=$1, certificate_verified=$1 where adm_id=$2 and payer_id=$3"
    const values = [certificate_uploaded_adm, adm_id, payer_id]
    const client  = await dbClient.getDbClient()
    try {
        client.connect();
        // Begin the transaction
        await client.query('BEGIN'); 
        console.log('Transaction started.')
        const certIngest =  await client.query(certquery);
        const certUpdate = await client.query(updateQuery, values);
        await client.query('COMMIT');
        console.log('Transaction committed successfully.');
        await client.end();
        return {'status':200, 'data':{'certificate':certIngest , 'adminResponse':certUpdate}} 
    }
    catch(err) {
        console.error('Error occurred during transaction:', err)
        // if(client) {
        //     await client.query('ROLLBACK')
        // }
        console.log('Transaction rolled back.')
        return {status:500, data:err}
    } 


}


exports.certificateSubmission  = async(tblcert, validFrom, ValidTo, cert_type, org_id, endpoint_id) => {
    let payer_id = tblcert.payer_id;
    let adm_id = tblcert.adm_id;
    let email = tblcert.adm_email;
    let validity_notbefore = validFrom;
    let validity_notafter = ValidTo;
    let created_date = Date.now().toString();
    let certificate_uploaded = true; 
    let certificate_verified = false; 
    let certificate_uploaded_adm = (cert_type == 'client')?false: true;


    let certquery = "";
    certquery += "insert into Certificates(payer_id, adm_id, email, validity_notbefore,validity_notafter, created_date, "
    certquery += " certificate_uploaded, certificate_verified, cert_type, org_id, endp_id) "
    certquery += "values('"+payer_id+"','"+adm_id+"','"+email+"','"+validity_notbefore+"','"+validity_notafter+"','"+created_date+"',"
    certquery += "'"+certificate_uploaded+"','"+certificate_verified+"','"+cert_type+"','"+org_id+"','"+endpoint_id+"') ";
    certquery += " ON CONFLICT (payer_id, adm_id, cert_type) "
    certquery += " DO update  SET validity_notbefore =  '"+validity_notbefore+"',"
    certquery += " validity_notafter = '"+validity_notafter+"', updated_date = '"+created_date+"'"
    //certquery +=  " where payer_id='"+payer_id+"', adm_id='"+adm_id+"', cert_type='"+cert_type+"'"
    console.log('certquery=', certquery);

    let updateQuery = "";
    updateQuery = "update administrators set certificate_uploaded=$1 where adm_id=$2 and payer_id=$3"
    const values = [certificate_uploaded_adm, adm_id, payer_id]
    const client  = await dbClient.getDbClient()
    try {
        client.connect();
        // Begin the transaction
        await client.query('BEGIN'); 
        console.log('Transaction started.')
        const certIngest =  await client.query(certquery);
        const certUpdate = await client.query(updateQuery, values);
        await client.query('COMMIT');
        console.log('Transaction committed successfully.');
        await client.end();
        return {'status':200, 'data':{'certificate':certIngest , 'adminResponse':certUpdate}} 
    }
    catch(err) {
        console.error('Error occurred during transaction:', err)
        // if(client) {
        //     await client.query('ROLLBACK')
        // }
        console.log('Transaction rolled back.')
        return {status:500, data:err}
    } 


}


exports.getCertificateByPayerId = async(payer_id) => {
    const client  = await dbClient.getDbClient()
    try {
        let query = `select * from certificates where payer_id=$1 and cert_type=$2`
        const values = [payer_id, 'server']
        client.connect()
        const result = await client.query(query, values);
        // Check if rows were affected
        //console.log('result=', result)
        if(result.rows.length > 0) {
            await client.end();
            return {status:200, msg: result.rows}
        } else {
            await client.end();
            return {status:404, msg: 'No Payers found'} 
        }
    } catch(err) {
        console.log('getCertificateByPayerId=', err)
        return {status:500, msg: err} 
    } 

}

exports.updateValidation = async(verified, payer_id, cert_type) => {
    let updateQuery = "";
    updateQuery = "update certificates set certificate_verified=$1 where payer_id=$2 and cert_type=$3"
    const values = [verified, payer_id, cert_type]
    const client  = await dbClient.getDbClient()
    try{
        await client.connect();
        // Begin the transaction
        await client.query('BEGIN'); 
        console.log('Transaction started.')
        const certUpdate = await client.query(updateQuery, values);
        await client.query('COMMIT');
        console.log('Transaction committed successfully.');
        await client.end();
        return {'status':200, 'data':certUpdate}
    }
    catch(err) {
        console.log('Transaction rolled back.',err)
        return {status:500, data:err}
    } 
}