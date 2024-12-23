
const { random } = require('node-forge');
const { Client } = require('pg');
const { v5: uuidv5 } = require('uuid');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const dbClient = require('../config/dbClient')


const MY_NAMESPACE = uuidv5.URL; // You can choose any standard namespace or generate a custom UUID

function generateActivationToken() {
  return crypto.randomBytes(20).toString('hex');
}

function generateUUIDWithLength(orgName, length) {
  if (length <= 0) {
    throw new Error("Length must be greater than 0");
  }

  // Generate a UUID
  const uuid = uuidv5(orgName, MY_NAMESPACE);

  // Trim the UUID to the desired length (exclude hyphens first)
  const cleanUuid = uuid.replace(/-/g, '');

  // Return a substring of the cleaned UUID
  return cleanUuid.substring(0, length);
}

function hashing(pass) {
  return new Promise((resolve, reject)=>{
    const saltRounds = 10;
    bcrypt.hash(pass, saltRounds, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing password:', err);
        reject({status:400, message:err})
      } else {
        resolve({status:200, message:hashedPassword});
      }

    });
  });
}

async function fetchPayerTableQuery(payer) {
  let orgName = (typeof payer.payer_name != 'undefined')?payer.organization_name:'' 
  let payer_id = "P"+generateUUIDWithLength(orgName, 5);
  //let payer_id =  generatedUUID
  console.log('id=',payer_id)
  let orgBaseurl = (typeof payer.payer_base_url != 'undefined')? payer.payer_base_url: ''
  let orgType = (typeof payer.payer_type != 'undefined')?payer.payer_type:''
  let orgAddr1 = (typeof payer.payer_addr_line1 != 'undefined')?payer.payer_addr_line1:''
  let orgAddr2 = (typeof payer.payer_addr_line2 != 'undefined')?payer.payer_addr_line2:''
  let orgCity = (typeof payer.payer_city != 'undefined')?payer.payer_city:''
  let orgState = (typeof payer.payer_state != 'undefined')?payer.payer_state:''
  let orgCountry = (typeof payer.payer_country != 'undefined')?payer.payer_country: '' 
  let orgZipCode = (typeof payer.payer_zip != 'undefined')?payer.payer_zip:''
  let createdDate = Date.now().toString();

  let query = ""
  query += "INSERT INTO payer_details("
  query += "payer_id, payer_name, payer_base_url, payer_type, payer_addr1, payer_addr2, "
  query += " payer_city, payer_state, payer_country, payer_zip,created_date)"
  query += " values('"+payer_id+"','"+orgName+"','" + orgBaseurl + "','"+orgType+"','"+orgAddr1+"','"+orgAddr2+"','"+orgCity+"',"
  query += "'"+orgState+ "', '"+orgCountry+"', '"+orgZipCode+"','"+createdDate+"') RETURNING *"
  return query; 
}

async function fetchAdminTableQuery(payer, payer_id) {
  let admName = payer.admin_name 
  let admId = "A"+generateUUIDWithLength(admName, 5)
  let admPhone = payer.admin_phone
  let admEmail = payer.admin_email
  let admpassCheck = await hashing(payer.password);
  let admPassword = (admpassCheck.status==200)?admpassCheck.message:''
  let orgEIN =  '' //payer.org_ein
  let orgWebsite =  '' //payer.org_website
  let orgTerms =  '' //payer.org_terms
  let orgPrivacypolicyLink = '' //payer.privacy_policy  
  let active = false
  let certificateUploaded = false
  let certificateVerified = false
  let createdDate = Date.now().toString()
  let activationToken = generateActivationToken()

  
    let query = ""
    query += "INSERT INTO administrators("
    query += "adm_id, payer_id, adm_name, adm_phone, adm_email, adm_password,"
    query += "  org_ein, org_website,org_terms, org_privacy_policy, created_date, active,"
    query += " certificate_uploaded, certificate_verified, activate_key )"
    query += " values('" + admId + "','"+payer_id+"','"+admName+"','"+admPhone+"','"+admEmail+"','"+admPassword+"',"
    query += "'"+orgEIN+ "', '"+orgWebsite+"', '"+orgTerms+"','"+orgPrivacypolicyLink+"','"+createdDate+"',", 
    query += "" + active + "," + certificateUploaded + "," + certificateVerified + ",'"+activationToken+"') RETURNING *"
    return query; 
  }

  
exports.enroll = async(payer) => {
   const client  = await dbClient.getDbClient()
    try {
        client.connect()
        // Begin the transaction
        await client.query('BEGIN')
        console.log('Transaction started.')
        const payerQuery = await fetchPayerTableQuery(payer)
        console.log(payerQuery)
        const payerResponse = await client.query(payerQuery)
        const payerId = payerResponse.rows[0].payer_id
        console.log('User created with ID:', payerId)
        const adminQuery = await fetchAdminTableQuery(payer, payerId)
        console.log(adminQuery)
        const adminResponse = await client.query(adminQuery)
        await client.query('COMMIT');
        console.log('Transaction committed successfully.');
        //return adminResponse
        client.end();
         return {'status':200, 'data':{'payerResponse':payerResponse , 'adminResponse':adminResponse}} 
        
    } catch(err) {
        // If any error occurs, rollback the transaction
        console.error('Error occurred during transaction:', err.message)
        // if(client) {
        //     await client.query('ROLLBACK')
        // }
        console.log('Transaction rolled back.')
        return {status:500, data:err}
     } finally {
        // End the client connection
        // if(client) {
        //     await client.end()
        // }
    }
}

