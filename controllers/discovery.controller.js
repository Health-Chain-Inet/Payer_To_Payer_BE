
const discovery_model = require('../models/discovery.model');
const cf = require('../config/config.json')
const projectRoot = process.cwd();
const fs = require('fs');
const axios = require('axios');
const crt = require('../CA/ca')
const nodemailer = require('nodemailer');


function returndata(status, msg, data){
    return {
        status:status,
        message: msg,
        data: data
    }
     
}

async function newPayerSideValidation(npid, opid) {
    let check = await discovery_model.checkIfCertificateVerified(npid,opid)
    if(check.msg == 'Not-Verified') {
        return {
            msg: 'Not-Verified', 
            verified: false
        };
    }
    let clientValidation = await validateClientCertificate(npid);
    let serverValidation = await validateServerCertificate(opid);
    console.log('client side validation=', clientValidation);
    console.log('server side validation=', serverValidation);
    let clientverified = false;
    let serververified = false; 
    let msg = ''
    if(clientValidation.status == 200) {
        if( clientValidation.msg.status == 200 && clientValidation.msg.msg == 'Certificate is valid and trusted by the CA') {
            clientverified = true;
        } else {  msg += 'New Payer Certificate not validated'  }
    }  else { msg += 'New payer certificate validation error' }
    if(serverValidation.status == 200) {
        if(serverValidation.msg.status == 200 && serverValidation.msg.msg == 'Certificate is valid and trusted by the CA') {
            serververified = true;
        } else { msg += 'Old payer Certificate not validated' }
    } else { msg += 'Old Payer Certificate validation error' }
    let verified = (clientverified && serververified)?true:false;
    return {
        msg: msg, 
        verified: verified
    };
}

async function oldPayerSideValidation(npid,opid) {
    let check = await discovery_model.checkIfCertificateVerified(npid,opid)
    if(check.msg == 'Not-Verified') {
        return {
            msg: 'Not-Verified', 
            verified: false
        };
    }
    let clientValidation = await validateClientCertificate(npid);
    let serverValidation = await validateServerCertificate(opid);
    console.log('client side validation=', clientValidation);
    console.log('server side validation=', serverValidation);
    let clientverified = false;
    let serververified = false; 
    let msg = ''
    if(clientValidation.status == 200) {
        if( clientValidation.msg.status == 200 && clientValidation.msg.msg == 'Certificate is valid and trusted by the CA') {
            clientverified = true;
        } else {  msg += 'New Payer Certificate not validated'  }
    }  else { msg += 'New payer certificate validation error' }
    if(serverValidation.status == 200) {
        if(serverValidation.msg.status == 200 && serverValidation.msg.msg == 'Certificate is valid and trusted by the CA') {
            serververified = true;
        } else { msg += 'Old payer Certificate not validated' }
    } else { msg += 'Old Payer Certificate validation error' }
    let verified = (clientverified && serververified)?true:false;
    return {
        msg: msg, 
        verified: verified
    };
}

async function validateClientCertificate(payer_id)  {
const clientfile = projectRoot + '\\uploads\\' + payer_id +'\\client-cert-'+payer_id+'.pem';
const cafile = projectRoot + '\\certs\\ca-cert.pem';
try {
    let caCertPem = fs.readFileSync(cafile, 'utf8');
    let clientCertPem = fs.readFileSync(clientfile, 'utf8');
    const response = await crt.validateCertificate(clientCertPem.toString(), caCertPem.toString())
    return {
    status:200,
    msg: response // Send the uploaded file's details in the response
    };
}
catch(err) {
    return {
    status:500,
    msg: err
    };
}
}

async function validateServerCertificate(payer_id) {

return new Promise((resolve, reject)=> {
    const cafile = projectRoot + '\\certs\\ca-cert.pem';
    const fhirurl = cf.fhirbaseurl + '/Endpoint/endpoint-'+payer_id;
    try {
        let caCertPem = fs.readFileSync(cafile, 'utf8');
        axios.get(fhirurl).then(async(result)=>{
        let extn = result.data.extension;
        let serverCertPem = '';
        // Iterate through each item in the 'data' array
        extn.forEach(item => {
            // Check if the URL is present and certificate information exists in extensions
            if (item.extension) {
                item.extension.forEach(e => {
                    if (e.url === "certificate" && e.valueBase64Binary) {
                        serverCertPem = e.valueBase64Binary;
                    }
                });
            }
        });
        serverCertPem = '-----BEGIN CERTIFICATE-----'+serverCertPem+'-----END CERTIFICATE-----'
        //console.log(serverCertPem)
        const response = await crt.validateCertificate(serverCertPem.toString(), caCertPem.toString())
        console.log(response)
        if(response.status == 200) {
            resolve({status:200, msg: response});
        } else {
            reject({status:500, msg: response });
        }
        }).catch((err)=>{  // axios catch 
            console.log('err=',err);
            reject({status:404,msg: err});
        })
    } catch(err) { // try ccatch
        console.log(err)
        reject({status:500, msg: err })
    }
});
}

async function sendEmailToOldPayer(npid, npname, nemail, opid) {
    try {
      const opid_model_data = await discovery_model.getEmailByPayerId(opid);
      const opid_email = opid_model_data.msg.email; 
      const opid_opname = opid_model_data.msg.payer_name;
      // Create a transporter using SMTP transport (you can use other services as well)
      const transporter = nodemailer.createTransport({
        service: 'gmail', // For example, using Gmail
        auth: {
          user: cf.fromEmailUser, // Your email address
          pass: cf.fromEmailPass  // Your email password or app-specific password if 2FA is enabled
        },
      });
  
      let msg = ''
      msg += 'Dear '+opid_opname+',<br/>'
      msg += 'This is to inform you that payer:  ' + npname + ' with email '+nemail+'.<br/>'
      msg += ' has request to connect with you for payer to payer connection  <br/>'
      msg += 'Request you to login to Payer to Payer Connect and approve the New Payer for connection'
    //   msg += '<a target="_blank" rel="noopener noreferrer" href="http://localhost:5173/activation?key=' + key + '&actId=' + admid + '">'
    //   msg += 'Click here to Activate'
    //   msg += '</a>'
      msg += '<br /> <br />'
      msg += 'Regards, <br/><br/>'
      msg += 'Administrator <br/><br/>'
      msg += 'Health Chain'
  
      // Set up email data
      const mailOptions = {
        from: cf.fromEmailUser, // Sender address
        to: opid_email,  // List of recipients
        subject: 'Request for Payer to Payer Connection for Member data exchange from Payer: '+ npname, // Subject line
        html: msg, // Plain text body
      };
  
      // Send email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log('Error sending email: ', error);
        }
        console.log('Email sent: ' + info.response);
      });
    }
    catch (emailErr) {
      console.log('EmailErr= ', emailErr)
    }
}

async function sendEmailToNewPayer(opid, opname, opemail, npid, encodedCode) {
    try {
      const npid_model_data = await discovery_model.getEmailByPayerId(npid);
      const npid_email = npid_model_data.msg.email; 
      const npid_name = npid_model_data.msg.payer_name;
      // Create a transporter using SMTP transport (you can use other services as well)
      const transporter = nodemailer.createTransport({
        service: 'gmail', // For example, using Gmail
        auth: {
          user: cf.fromEmailUser, // Your email address
          pass: cf.fromEmailPass  // Your email password or app-specific password if 2FA is enabled
        },
      });
  
      let msg = ''
      msg += 'Dear '+npid_name+',<br/>'
      msg += 'This is to inform you that payer:  ' + opname + ' with email '+opemail+'.<br/>'
      msg += ' has has connected with you and approved your request for Payer Connection <br/>'
      msg += 'The secret_key for connected to this payer is: '+ encodedCode
    //   msg += '<a target="_blank" rel="noopener noreferrer" href="http://localhost:5173/activation?key=' + key + '&actId=' + admid + '">'
    //   msg += 'Click here to Activate'
    //   msg += '</a>'
      msg += '<br /> <br />'
      msg += 'Regards, <br/><br/>'
      msg += 'Administrator <br/><br/>'
      msg += 'Health Chain'
  
      // Set up email data
      const mailOptions = {
        from: cf.fromEmailUser, // Sender address
        to: npid_email,  // List of recipients
        subject: 'Payer Connection with '+ opname +' is approved. Key for Payer Connection is sent', // Subject line
        html: msg, // Plain text body
      };
  
      // Send email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log('Error sending email: ', error);
        }
        console.log('Email sent: ' + info.response);
      });
    }
    catch (emailErr) {
      console.log('EmailErr= ', emailErr)
    }
}


exports.payerConnectNewPayer = async(req, res, next) => {
    let nemail  = req.query.ne;   // new Payers email 
    let opid = req.query.opid; // Old Payers id
    let msg = ''

    msg += ((!nemail && !opid)?'New payer email  and  Old Payer id is not received':((!nemail)?'New Payer not received':((!opid)?'Old payer id not received':'')))
    if(msg !== '') {
        res.json(returndata(400, 'Bad Request', msg));
    } else {
        // const decodednemail = Buffer.from(nemail, 'base64').toString('utf-8');
        // const opid = Buffer.from(old_payer_id, 'base64').toString('utf-8'); // old payer id
        const npid_model_data = await discovery_model.getPayerIdByEmail(nemail)
        if(npid_model_data.status == 200) {
            const npid = npid_model_data.msg.payer_id; // new Payer id from db
            const npname = npid_model_data.msg.payer_name;
            let npid_clientsidevalidation = await newPayerSideValidation(npid, opid)
            if(npid_clientsidevalidation.msg == '' && npid_clientsidevalidation.verified) {
                await discovery_model.payerConnect(npid,opid,true, false, 'inprogress', 'Client Side validation Complete')
                //await sendEmailToOldPayer(npid, npname, nemail, opid);
                res.json(returndata(200, 'Client Side validation Complete', 'Client Side Validation Sucessfull'));
            } else {
                //await discovery_model.payerConnect(npid,opid,false, false, 'not-done', 'Client Side validation In-complete')
                res.json(returndata(495, 'Certificate Validation incomplete', npid_clientsidevalidation.msg));
            }
        } else {
            //await discovery_model.payerConnect(npid,opid,false, false, 'not-done', 'Error in client Side validation')
            res.json(returndata(404, 'New Payer Email does not exist', ''));
        }
    }
}

exports.payerConnectOldPayer = async(req, res, next) => {
    let oemail  = req.query.oe;   // old Payers email 
    let npid = req.query.npid; // New Payers id
    console.log('oemail=',oemail)
    console.log('new_payer_id=',npid)
    let msg = '';
    msg += ((!oemail && !npid)?'Old payer email  and  New Payer id is not received':((!oemail)?'Old Payer email not received':((!npid)?'New payer id not received':'')))
    if(msg !== '') {
        res.json(returndata(400, 'Bad Request', msg));
    } else {
        // const decodedoemail = Buffer.from(oemail, 'base64').toString('utf-8');
        // const npid = Buffer.from(new_payer_id, 'base64').toString('utf-8'); // new payer id
        const opid_model_data = await discovery_model.getPayerIdByEmail(oemail)
        if(opid_model_data.status == 200) {
            const opid = opid_model_data.msg.payer_id; // old Payer id from db
            const opname = opid_model_data.msg.payer_name;
            let opid_serversidevalidation = await oldPayerSideValidation(npid, opid);
            if(opid_serversidevalidation.msg == '' && opid_serversidevalidation.verified) {
                let dt = new Date();
                dt.setDate(dt.getDate() + 1);
                let encodedCode = Buffer.from(dt.toDateString()).toString('base64');
                await discovery_model.payerConnectUpdate(npid,opid,true, true, 'done', 'Client Side & Server side validation Complete',encodedCode)
                await sendEmailToNewPayer(opid, opname, oemail, npid, encodedCode);
                res.json(returndata(200, 'Server Side validation Complete', 'Server Side Validation Sucessfull'));
            } else {
                await discovery_model.payerConnectUpdate(npid,opid,true, false, 'not-done', 'Server Side validation In-complete')
                res.json(returndata(495, 'Certificate Validation incomplete', npid_clientsidevalidation.msg));
            }
        }else {
            await discovery_model.payerConnectUpdate(npid,opid,true, false, 'not-done', 'Error in Server Side validation')
            res.json(returndata(404, 'Old Payer Email does not exist', ''));
        }

   
    }

}

exports.payerApprovalConns = async(req, res, next) => {
    let opid = req.query.opid;
    try {
        let pac = await discovery_model.payerApprovalConns(opid);
        if(pac.status == 200) {
            res.json(returndata(200, 'Active Connections', pac.msg));
        } else {
            res.json(returndata(404, 'No Pending connections', pac.msg));
        }
    } catch(err) {
        res.json(returndata(500, 'Error in Connection', err));
    }

}


