const enroll = require('../models/enroll.model.js')
const cf = require('../config/config.json');
const nodemailer = require('nodemailer');

const login = require('../models/login.model.js')
const bcrypt = require('bcrypt');
const session = require('express-session');



exports.validateLogin = async (req, res, next) => {
  let username = req.body.username;
  let enteredPassword = req.body.password;
  console.log("body", req.body)

  let storedHashedPassword = await login.getUser(username);
  console.log('storedHashedPassword=', storedHashedPassword)
  if (storedHashedPassword.status == 200) {
    return res.status(500).json({ status: 403, message: 'Payer Already exists' })
  }
  // Compare the entered password with the stored hash
  bcrypt.compare(enteredPassword, storedHashedPassword.msg.adm_password, (err, result) => {
    if (err) {
      console.error('Error comparing password', err);
      return res.status(401).json({ status: 401, message: 'UnAuthorized' })
    }

    if (result) {
      // Password matches
      // req.session.userName = username
      // req.session.isAuthenticated = true
      return res.status(200).json({ status: 200, message: storedHashedPassword.msg })
    } else {
      // Password does not match
      return res.status(401).json({ status: 401, message: 'Invalid User/Password' })
    }
  });
}


exports.enrollPayer = async (req, res, next) => {
  let payer = req.body
  console.log('enrolpayerdata=',payer)
  let validationResult = payerValidation(payer)
  let foundStatus = await payerExists(payer)
  console.log('foundstatus=', foundStatus)
  if (foundStatus.status == 200) {
    return res.status(400).json({
      success: false,
      message: "Payer already exists",
      data: "Payer Already exists",
    });
  } else {
    if (validationResult.success) {
      let enrollResponse = await enroll.enroll(payer)
      if (enrollResponse.status == 200) {
        let enrollAdminData = enrollResponse.data.adminResponse.rows[0]
        //await sendEnrollerEmail(enrollAdminData)
  
        return res.status(200).json({
          success: true,
          message: "Payers Enrolled",
          data: enrollResponse.data,
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Error in Payer Enrollment",
          data: enrollResponse.data,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Bad Request",
        data: validationResult.data,
      });
    }
  }



}

exports.endpointIngestion = async(req, res, next) => {
  // const {payer_id, payer_name, email, endpoint_name, base_url, auth_scope, 
  // authorize_url, token_url, return_url, auth_type} = req.body;
  console.log('body=', req.body)
  const body = req.body
  console.log('body2=', body)

  
  let endpointValid = payerEndpointValidation(body);

  if(endpointValid.success) {
    try {
      let endpointIngestResponse = await enroll.addPayerEndpoint(body);
      return res.status(200).json({
        status: 200,
        message: "Payer data",
        data: endpointIngestResponse,
      });
    } catch(err) {
      console.log(err);
      return res.status(500).json({
        status: 500,
        message: "Error in Payer Data Ingestion",
        data: err.message,
      });
    }
  } else {
    return res.status(400).json({
      status: 400,
      message: "Validation Error",
      data: endpointValid.data,
    });
  }


}

exports.allPayers = async(req, res, next) => {
  const ps = await enroll.getAllPayers();
  if(ps.status == 200) {
    return res.status(200).json({
      status: 200,
      message: "All Payers",
      data: ps.msg
    });
  } else {
    return res.status(404).json({
      status: 404,
      message: "No Payers",
      data: []
    });
  }
} 

exports.allAdmins = async(req, res, next) => {
  const ads = await enroll.getAllAdmins();
  if(ads.status == 200) {
    return res.status(200).json({
      status: 200,
      message: "All Admins",
      data: ads.msg
    });
  } else {
    return res.status(404).json({
      status: 404,
      message: "No Admins",
      data: []
    });
  }
}

exports.endpoints = async(req, res, next) => {
  try {
    const payerId = req.query.payerId;
    const endps = await enroll.fetchendpoints(payerId);
    return res.status(200).json({
      status: 200,
      message: "success",
      data: endps.msg,
    });
  }
  catch(err) {
    return res.status(400).json({
      status: 400,
      message: " Error",
      data: err.message,
    });
  }
}

function payerEndpointValidation(endp) {
  let msg = '';
  console.log('endp=',endp.payerName)
  msg += (endp.payerId == '' || typeof endp.payerId == 'undefined') ? 'payer id is missing,' : ''
  msg += (endp.payerName == '' || typeof endp.payerName == 'undefined') ? 'payer name is missing,' : ''
  msg += (endp.email == '' || typeof endp.email == 'undefined') ? 'email is missing,' : ''
  msg += (endp.baseUrl == '' || typeof endp.baseUrl == 'undefined') ? 'email is missing,' : ''
  msg += (endp.endpointName == '' || typeof endp.endpointName == 'undefined') ? 'endpoint name is missing,' : ''
  msg += (endp.authScope == '' || typeof endp.authScope == 'undefined') ? 'auth scope is missing,' : ''
  msg += (endp.authorizeUrl == '' || typeof endp.authorizeUrl == 'undefined') ? 'authorize url is missing,' : ''
  msg += (endp.tokenUrl == '' || typeof endp.tokenUrl == 'undefined') ? 'token url is missing,' : ''
  msg += (endp.returnUrl == '' || typeof endp.returnUrl == 'undefined') ? 'return url is missing,' : ''
  msg += (endp.authType == '' || typeof endp.authType == 'undefined') ? 'auth type is missing,' : ''


  if (msg == '') {
    return {
      'success': true,
      'data': 'Payer Validated Successfully'
    }
  } else {
    return {
      'success': false,
      'data': msg
    }
  }


}

function payerValidation(payer) {
  let msg = '';
  msg += (payer.orgName == '') ? 'organization name is required and should be valid' : ''
  msg += (payer.orgBaseurl == '') ? 'organization baseurl is required and should be valid' : ''
  msg += (payer.admName == '') ? 'administrator name is required and should be valid' : ''
  msg += (payer.admPhone == '') ? 'administrator phone is required and should be valid' : ''
  msg += (payer.admEmail == '') ? 'administrator email is required and should be valid' : ''
  msg += (payer.admPassword == '') ? 'administrator password is required and should be valid' : ''



  if (msg == '') {
    return {
      'success': true,
      'data': 'Payer Validated Successfully'
    }
  } else {
    return {
      'success': false,
      'data': msg
    }
  }
}


async function payerExists(payer) {
  let email = payer.adm_email
  let storedHashedPassword = await login.getUser(email);
  console.log('storedHashedPassword1', storedHashedPassword)
  if (storedHashedPassword.status != 200) {
    return { status: 500, message: 'Error checking password. Try again' }
  } else {
    return { status: 200, message: 'Administrator Exists' }
  }

}

async function sendEnrollerEmail(enrollAdminData) {
  try {
    // Create a transporter using SMTP transport (you can use other services as well)
    const transporter = nodemailer.createTransport({
      service: 'gmail', // For example, using Gmail
      auth: {
        user: cf.fromEmailUser, // Your email address
        pass: cf.fromEmailPass  // Your email password or app-specific password if 2FA is enabled
      },
    });

    let msg = ''
    let key = enrollAdminData.activate_key
    let admid = enrollAdminData.adm_id
    let link = 'http://localhost:5173/activation?key=' + key + '&actId=' +admid
    msg += 'Dear Sir/Madam,<br/>'
    msg += 'Your Account User ' + enrollAdminData.adm_email + ' needs activation.<br/>'
    msg += 'To activate your account, please click on the link below <br/>'
    // Here is the form and button that will try to open the link on click
    // msg += '<form action="' + link + '" method="get" target="_blank">';
    // msg += '<button type="submit" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Activate Account</button>';
    // msg += '</form>';
    msg += '<a target="_blank" rel="noopener noreferrer" href="http://localhost:5173/activation?key=' + key + '&actId=' + admid + '">'
    msg += 'Click here to Activate'
    msg += '</a>'
    msg += '<br /> <br />'
    //msg += 'http://localhost:3001/verify/verify?key=' + enrollAdminData.activate_key + '&actId=' + enrollAdminData.adm_id + '</a><br/><br/><br/>'
    //msg += 'http://localhost:5173/activation?key=' + enrollAdminData.activate_key + '&actId=' + enrollAdminData.adm_id + '</a><br/><br/><br/>'
    msg += 'Regards, <br/><br/>'
    msg += 'Administrator <br/><br/>'
    msg += 'Health Chain'

    // Set up email data
    const mailOptions = {
      from: cf.fromEmailUser, // Sender address
      to: enrollAdminData.adm_email,  // List of recipients
      subject: 'Payer To Payer Activation Link', // Subject line
      html: msg, // Plain text body
      // html: '<b>Hello, this is a test email sent from Node.js using nodemailer!</b>', // If you prefer HTML format
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