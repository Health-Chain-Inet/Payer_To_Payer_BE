const nodemailer = require('nodemailer');
try {
  // Create a transporter using SMTP transport (you can use other services as well)
  const transporter = nodemailer.createTransport({
    service: 'gmail', // For example, using Gmail
    auth: {
      user: 'sanchitjobs13@gmail.com', // Your email address
      pass: 'bgho ashf fgen rvtd' // Your email password or app-specific password if 2FA is enabled
    },
  });

  let key = "5a528e79246d499daed7e90fd3b1402c41ac984a"
  let admid = "A34f18"
  let admemail = "sanchit.astekar@inetframe.com"

  let msg = ''
  msg += 'Dear Sir/Madam,<br/>'
  msg += 'Your Account User ' + enrollAdminData.adm_email + ' needs activation.<br/>'
  msg += 'To activate your account, please click on the link below <br/>'
  msg += '<a target="_blank" rel="noopener noreferrer" href="http://localhost:5173/activation?key=' + enrollAdminData.activate_key + '&actId=' + enrollAdminData.adm_id + '">'
  //msg += 'http://localhost:3001/verify/verify?key=' + enrollAdminData.activate_key + '&actId=' + enrollAdminData.adm_id + '</a><br/><br/><br/>'
  msg += 'Activate</a><br/><br/><br/>'
  msg += 'Regards, <br/><br/>'
  msg += 'Administrator <br/><br/>'
  msg += 'Health Chain'

  // Set up email data
  const mailOptions = {
    from: 'sanchitjobs13@gmail.com', // Sender address
    to: 'sanchit.astekar@inetframe.com',  // List of recipients
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
