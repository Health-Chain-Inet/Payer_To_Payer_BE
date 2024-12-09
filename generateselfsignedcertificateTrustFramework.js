const forge = require('node-forge');
const fs = require('fs');

// Example certificate attributes
const payerId = '12345';
const payerName = 'Example Payer';
const fhirEndpoint = 'https://example.com/fhir';
const registrationStatus = 'active';

// Generate a private key for the server certificate
const keys = forge.pki.rsa.generateKeyPair(2048);

// Generate a private key for the CA certificate
const caKeys = forge.pki.rsa.generateKeyPair(2048);

// Create a self-signed root CA certificate
const caCert = forge.pki.createCertificate();
caCert.publicKey = caKeys.publicKey;
caCert.serialNumber = '01';
caCert.validFrom = new Date().toISOString();
caCert.validTo = new Date();
caCert.validTo.setFullYear(caCert.validTo.getFullYear() + 1);  // CA validity (1 years)

// Set the CA certificate subject
caCert.setSubject([
  { name: 'commonName', value: 'Example Root CA' },
  { name: 'countryName', value: 'US' },
  { name: 'organizationName', value: 'ABC HealthCare' }
]);

// Set the issuer of the CA certificate (self-signed)
caCert.setIssuer(caCert.subject.attributes);

// Sign the CA certificate with its private key
caCert.sign(caKeys.privateKey);

// PEM encoding of the CA private key and certificate
const caPrivateKeyPem = forge.pki.privateKeyToPem(caKeys.privateKey);
const caCertPem = forge.pki.certificateToPem(caCert);

// Save the CA certificate to disk
fs.writeFileSync('./certs/ca-cert.pem', caCertPem);
fs.writeFileSync('./certs/ca-private-key.pem', caPrivateKeyPem);

console.log('CA certificate and private key generated');

// Create the server certificate to be signed by the CA
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '02';
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
    { type: 2, value: `payerId.${payerId}` },
    { type: 2, value: `payerName.${payerName}` },
    { type: 2, value: `fhirEndpoint.${fhirEndpoint}` },
    { type: 2, value: `registrationStatus.${registrationStatus}` }
  ]
};

// Add the SAN extension to the certificate
cert.setExtensions([sanExtension]);

// Set the issuer of the server certificate to the CA certificate's subject
cert.setIssuer(caCert.subject.attributes);  // This ensures the issuer matches the CA's subject

// Sign the certificate with the CA's private key
cert.sign(caKeys.privateKey);

// PEM encoding of the private key and certificate
const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
const certPem = forge.pki.certificateToPem(cert);

// Save the server certificate and private key to disk
fs.writeFileSync('./certs/server-private-key.pem', privateKeyPem);
fs.writeFileSync('./certs/server-certificate.pem', certPem);

console.log('Server certificate and private key generated');

// Accessing the SAN extension manually using a key lookup
const sanExtensionFromCert = cert.getExtension('subjectAltName');
if (sanExtensionFromCert) {
  console.log('Subject Alternative Names:', sanExtensionFromCert.altNames);
} else {
  console.log('No Subject Alternative Names extension found.');
}

// Mock Trust Framework (CA Validation)
function validateCertificate(certPem, caCertPem) {
  const cert = forge.pki.certificateFromPem(certPem);
  const caCert = forge.pki.certificateFromPem(caCertPem);

  // Simulate certificate validation against a CA's trusted root certificate
  const verified = cert.verify(caCert);
  
  if (verified) {
    console.log('Certificate is valid and trusted by the CA.');
  } else {
    console.log('Certificate validation failed. It is not trusted by the CA.');
  }

  // Check for specific SAN fields as part of a Trust Framework policy
  const sanExtension = cert.getExtension('subjectAltName');
  if (sanExtension) {
    sanExtension.altNames.forEach((altName) => {
      if (altName.value.includes('payerId')) {
        console.log('Custom SAN field "payerId" found:', altName.value);
      }
    });
  } else {
    console.log('No Subject Alternative Name extension found.');
  }
}

// Load CA certificate (this will now be the new CA cert)
const caCertPemLoaded = fs.readFileSync('./certs/ca-cert.pem', 'utf8');

// Validate the server certificate against the CA certificate
validateCertificate(certPem, caCertPemLoaded);
