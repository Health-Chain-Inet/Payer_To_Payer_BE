import nodemailer from 'nodemailer';

// Create a transporter using your email provider's SMTP settings
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your SMTP provider (like Outlook, Yahoo, etc.)
  auth: {
    user: 'sanchitjobs13@gmail.com', // Your email
    pass: 'bgho ashf fgen rvtd'  // Your email password or app password
  }
});

// Define the email content
const mailOptions = {
  from: 'sanchitjobs13@gmail.com', // Sender address
  to: 'sanchit.astekar@inetframe.com',  // Recipient address
  subject: 'Test Email from Node.js using Nodemailer', // Subject
  text: 'Hello, this is a test email sent using Nodemailer.', // Plain text body
  html: '<h1>Hello</h1><p>This is a test email sent using Nodemailer.</p>' // HTML body (optional)
};

// Send the email
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.log('Error occurred:', error);
  }
  console.log('Email sent:', info.response);
});
