const moment = require('moment-timezone');
const forge = require('node-forge');
const fs = require('fs');
const { validate } = require('uuid');
const projectRoot = process.cwd();

const caCertfilePath = projectRoot + '\\certs\\ca-cert.pem';
const caKeyfilePath = projectRoot + '\\certs\\ca-private-key.pem';

console.log('caCertfilePath=', caCertfilePath);
console.log('caKeyfilePath=', caKeyfilePath)

const caCertPem = fs.readFileSync(caCertfilePath, 'utf8');
const caPrivateKeyPem = fs.readFileSync(caKeyfilePath, 'utf8');
const cert = forge.pki.certificateFromPem(caCertPem.toString());
console.log(cert);

let validity_notbefore = cert.validity.notBefore;
let validity_notafter = cert.validity.notAfter;
console.log(validity_notafter)
let dtfrom = moment(validity_notbefore).tz('America/Los_Angeles').format();
let dtto = moment(validity_notafter).tz('America/Los_Angeles').format();
let current_dt = moment().tz('America/Los_Angeles').format();
console.log(dtfrom)
console.log(dtto)
console.log(current_dt)
if(current_dt >= dtfrom && current_dt <= dtto) {
    console.log('Certificate is valid')
} else {
    console.log('Certificate expired')
}

// const dateString = 'Thursday, March 7, 2024 at 5:30:00 AM';

// // Create a new Date object from the string (JavaScript can parse most date formats)
// const date = new Date(dateString);
// console.log('date=', date)

// // Function to format date as YYYY-MM-dd
// function formatDate(date) {
//     const year = date.getFullYear();
//     const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
//     const day = String(date.getDate()).padStart(2, '0');
//     return `${year}-${month}-${day}`;
// }

// const formattedDate = formatDate(date);


// console.log(formattedDate)

// let dt1 = moment('2023-11-11').tz('America/Los_Angeles').format();
// let dt2 = moment().tz('America/Los_Angeles').format();


// if(dt1 < dt2) {
//     console.log('dt1')
// } else {
//     console.log('dt2')
// }
