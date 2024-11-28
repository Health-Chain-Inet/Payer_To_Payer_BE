const enroll = require('../models/enroll.model.js')
const cf = require('../config/config.json');
const nodemailer = require('nodemailer');

const login = require('../models/login.model.js')
const bcrypt = require('bcrypt');
const session = require('express-session');



exports.validateLogin = async(req,res,next) => {
  let username = req.body.username; 
  let enteredPassword = req.body.password; 
  console.log("body", req.body)

  let storedHashedPassword = await login.getUser(username);
  console.log('storedHashedPassword=',storedHashedPassword)
  if(storedHashedPassword.status != 200 ) {
    return res.status(500).json({status:500, message: 'Error checking password. Try again'})
  }
  // Compare the entered password with the stored hash
  bcrypt.compare(enteredPassword, storedHashedPassword.msg, (err, result) => {
    if (err) {
        console.error('Error comparing password', err);
        return res.status(401).json({status:401, message: 'UnAuthorized'})
    }

    if (result) {
        // Password matches
        // req.session.userName = username
        // req.session.isAuthenticated = true
        return res.status(200).json({status:200, message: storedHashedPassword})
    } else {
        // Password does not match
        return res.status(401).json({status:401, message: 'Invalid User/Password'})
    }
  });
}


exports.enrollPayer = async(req, res,next) => {
  let payer = req.body
  let validationResult = payerValidation(payer)
  let foundStatus = await payerExists(payer)
  
  if(foundStatus != 200) {
    return res.status(400).json({
      success: false,
      message: "Payer already exists",
      data: "Payer Already exists",
    });
  }


  if(validationResult.success) {
    let enrollResponse = await enroll.enroll(payer)
    if(enrollResponse.status == 200) {
      let enrollAdminData = enrollResponse.data.adminResponse.rows[0]
      await sendEnrollerEmail(enrollAdminData)

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

function payerValidation(payer) {
  let msg = ''; 
  msg += (payer.orgName == '')? 'organization name is required and should be valid':''
  msg += (payer.orgBaseurl == '')? 'organization baseurl is required and should be valid':''
  msg += (payer.admName == '')? 'administrator name is required and should be valid':''
  msg += (payer.admPhone == '')? 'administrator phone is required and should be valid':''
  msg += (payer.admEmail == '')? 'administrator email is required and should be valid':''
  msg += (payer.admPassword == '')? 'administrator password is required and should be valid':''



  if(msg == '') {
    return {
      'success':true, 
      'data': 'Payer Validated Successfully'
    }
  } else {
    return {
      'success':false, 
      'data': msg
    }
  }
}


async function payerExists(payer) {
  let email  = payer.adm_email
  let storedHashedPassword = await login.getUser(email);
  console.log('storedHashedPassword=',storedHashedPassword)
  if(storedHashedPassword.status != 200 ) {
    return res.status(500).json({status:500, message: 'Error checking password. Try again'})
  } else {
    return res.status(200).json({status:200, message: 'Administrator Exists'})
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
    msg += 'Dear Sir/Madam,<br/>'
    msg += 'Your Account User ' + enrollAdminData.adm_email + ' needs activation.<br/>'
    msg += 'To activate your account, please click on the link below <br/>' 
    msg += '<a target="_blank" rel="noopener noreferrer" href="http://localhost:3001/verify/verify?key="'+enrollAdminData.activate_key+'"&actId="'+enrollAdminData.adm_id+'">'
    msg += 'http://localhost:3001/verify/verify?key='+enrollAdminData.activate_key+'&actId='+enrollAdminData.adm_id+'</a><br/><br/><br/>'
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
    console.log('EmailErr= ',emailErr)
  }

}