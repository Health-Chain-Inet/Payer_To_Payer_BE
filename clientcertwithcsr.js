const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const forge = require('node-forge'); // For easier manipulation of certificates

const app = express();
const port = 3000;

// Middleware to parse JSON body
app.use(bodyParser.json());

// Load the CA's private key and certificate
const caCertPath = path.join(__dirname, 'ca-cert.pem');
const caPrivateKeyPath = path.join(__dirname, 'ca-private-key.pem');

let caCert = fs.readFileSync(caCertPath, 'utf8');
let caPrivateKey = fs.readFileSync(caPrivateKeyPath, 'utf8');

// Endpoint to generate client certificate
app.post('/generate-client-cert', (req, res) => {
  const { privateKey, csr } = req.body;

  if (!privateKey || !csr) {
    return res.status(400).send('Private Key and CSR are required.');
  }

  try {
    // Convert private key and CSR from PEM to forge format
    const privateKeyForge = forge.pki.privateKeyFromPem(privateKey);
    const csrForge = forge.pki.certificationRequestFromPem(csr);

    // Check if the CSR is valid
    if (!csrForge.verify()) {
      return res.status(400).send('CSR is invalid.');
    }

    // Load the CA certificate and private key into forge format
    const caCertForge = forge.pki.certificateFromPem(caCert);
    const caPrivateKeyForge = forge.pki.privateKeyFromPem(caPrivateKey);

    // Create the client certificate
    const clientCert = forge.pki.createCertificate();
    clientCert.serialNumber = Math.floor(Math.random() * 1e6).toString(); // Random serial number
    clientCert.publicKey = csrForge.publicKey;
    clientCert.setSubject(csrForge.subject.attributes);
    clientCert.setIssuer(caCertForge.subject.attributes);
    clientCert.setExtensions([
      {
        name: 'basicConstraints',
        cA: false
      },
      {
        name: 'keyUsage',
        keyCertSign: false,
        digitalSignature: true
      },
    ]);
    clientCert.validFrom = new Date();
    clientCert.validTo = new Date();
    clientCert.validTo.setFullYear(clientCert.validFrom.getFullYear() + 1); // 1 year validity

    // Sign the certificate with CA's private key
    clientCert.sign(caPrivateKeyForge);

    // Convert the signed certificate to PEM format
    const clientCertPem = forge.pki.certToPem(clientCert);

    // Send the client certificate back to the client
    res.json({
      clientCertificate: clientCertPem
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating client certificate');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
