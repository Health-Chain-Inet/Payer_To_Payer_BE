const forge = require('node-forge');
const fs = require('fs');

// Example certificate attributes
const payerId = '12345';
const payerName = 'Example Payer';
const fhirEndpoint = 'https://example.com/fhir';
const registrationStatus = 'active';

// Generate a private key
const keys = forge.pki.rsa.generateKeyPair(2048);

// Create a self-signed certificate
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validFrom = new Date().toISOString();
cert.validTo = new Date();
cert.validTo.setFullYear(cert.validTo.getFullYear() + 1);  // 1 year validity

// Set certificate subject
cert.setSubject([
  { name: 'commonName', value: 'example.com' },
  { name: 'countryName', value: 'US' },
  { name: 'organizationName', value: 'ABC HealthCare' }
]);

// Define custom Subject Alternative Name extension with DNS names
const sanExtension = {
  name: 'subjectAltName',
  altNames: [
    { type: 2, value: `payerId.${payerId}` },  // DNS type (type 2) for payerId
    { type: 2, value: `payerName.${payerName}` },  // DNS type (type 2) for payerName
    { type: 2, value: `fhirEndpoint.${fhirEndpoint}` },  // DNS type (type 2) for fhirEndpoint
    { type: 2, value: `registrationStatus.${registrationStatus}` }  // DNS type (type 2) for registrationStatus
  ]
};

// Add the SAN extension to the certificate
cert.setExtensions([sanExtension]);

// Set issuer (self-signed, so the issuer is the same as the subject)
cert.setIssuer(cert.subject.attributes);

// Sign the certificate with the private key
cert.sign(keys.privateKey);

// PEM encoding of the private key and certificate
const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
const certPem = forge.pki.certificateToPem(cert);

// Optionally save these files to disk
fs.writeFileSync('private_key.pem', privateKeyPem);
fs.writeFileSync('certificate.pem', certPem);

console.log('Certificate and private key generated');

// Accessing the SAN extension manually using a key lookup
const sanExtensionFromCert = cert.getExtension('subjectAltName');
if (sanExtensionFromCert) {
  console.log('Subject Alternative Names:', sanExtensionFromCert.altNames);
} else {
  console.log('No Subject Alternative Names extension found.');
}
