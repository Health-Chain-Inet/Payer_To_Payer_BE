const fs = require('fs');
const directory_model = require('../models/directory.model');
const forge = require('node-forge');
const { validate } = require('uuid');
const projectRoot = process.cwd();

// Load the CA's private key and certificate
const caCertPath = projectRoot + '\\certs\\ca-cert.pem';
const caPrivateKeyPath =  projectRoot + '\\certs\\ca-private-key.pem';

// Load intermediate certificates (if any)
const intermediateCertPath = projectRoot + '\\certs\\intermediate-ca-cert.pem'; // Adjust this path as necessary

let caCert = fs.readFileSync(caCertPath, 'utf8');
let caPrivateKey = fs.readFileSync(caPrivateKeyPath, 'utf8');
let intermediateCert = fs.readFileSync(intermediateCertPath, 'utf8'); // Reading intermediate certificate

function returndata(status, msg, data){
    return {
        status:status,
        message: msg,
        data: data
    }
     
}



exports.createClientCertificate = async(req, res, next) => {
    const { private_key, csr, payer_id, email } = req.body;

    if (!private_key || !csr || !payer_id) {
        return returndata(400,'Private Key and CSR  are required.','Bad Request')
    } else {
        try {
            //Convert private key and CSR from PEM to forge format
            const privateKeyForge = forge.pki.privateKeyFromPem(private_key);
            const csrForge = forge.pki.certificationRequestFromPem(csr);
            // Check if the CSR is valid
            if (!csrForge.verify()) {
                return returndata(400,'CSR is invalid.','Bad Request')
            }
            // Load the CA certificate, intermediate certificate, and private key into forge format
            const caCertForge = forge.pki.certificateFromPem(caCert);
            const caPrivateKeyForge = forge.pki.privateKeyFromPem(caPrivateKey);
            const intermediateCertForge = forge.pki.certificateFromPem(intermediateCert);


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
              validFrom = new Date()
              clientCert.validFrom = validFrom;
              let validTo = new Date();
              validTo.setFullYear(validTo.getFullYear() + 1);
              clientCert.validTo = validTo.toISOString();
              // Sign the certificate with CA's private key
              clientCert.sign(caPrivateKeyForge);
              
              // Convert the signed certificate to PEM format
              const clientCertPem = forge.pki.certificateToPem(clientCert);
              console.log(clientCertPem)

              !fs.existsSync(projectRoot + '\\uploads\\' + payer_id) && fs.mkdirSync(projectRoot + '\\uploads\\' + payer_id);
              const clientCertfilePath = projectRoot + '\\uploads\\'+payer_id+'\\client-cert-'+payer_id+'.pem';
              const clientKeyfilePath = projectRoot + '\\uploads\\'+payer_id+'\\client-private-key-'+payer_id+'.pem';
              console.log('CertfilePath=', clientCertfilePath)
              console.log('KeyfilePath=', clientKeyfilePath)
      
              // Save the server certificate and private key to disk
              fs.writeFileSync(clientCertfilePath,clientCertPem);
              fs.writeFileSync(clientKeyfilePath, private_key);

              try {
                let payerdet = await directory_model.getPayerByEmail(email)
                if(payerdet.status == 200)    {          
                      await directory_model.certificateSubmission(payerdet.msg, validFrom, validTo, 'client','','' )
                      res.json(returndata(200,'success',{ client_certificate_pen:  clientCertPem }));
                } else {
                    res.json(returndata(500,'failed',{ client_certificate_pen:  '' }));
                }
              } catch(err) {
                res.json(returndata(500,'failed',{ client_certificate_pen:  '' }));
              }



         } catch(error) {
            console.log(error)
            res.json(returndata(500, 'Error', (error.message)?error.message:error));
         }
    }
  

    
  


    
}
  

exports.createServerCertificate = async(req, res, next) => {
    const { private_key, csr, payer_id } = req.body;

    if (!private_key || !csr || !payer_id) {
        return returndata(400,'Private Key and CSR  are required.','Bad Request')
    } else {
        try {
            // Convert private key and CSR from PEM to forge format
            const privateKeyForge = forge.pki.privateKeyFromPem(private_key);
            const csrForge = forge.pki.certificationRequestFromPem(csr);
            // Check if the CSR is valid
            if (!csrForge.verify()) {
                return returndata(400,'CSR is invalid.','Bad Request')

            }
            // Load the CA certificate, intermediate certificate, and private key into forge format
            const caCertForge = forge.pki.certificateFromPem(caCert);
            const caPrivateKeyForge = forge.pki.privateKeyFromPem(caPrivateKey);
            const intermediateCertForge = forge.pki.certificateFromPem(intermediateCert);


            // Create the client certificate
            const serverCert = forge.pki.createCertificate();
            serverCert.serialNumber = Math.floor(Math.random() * 1e6).toString(); // Random serial number
            serverCert.publicKey = csrForge.publicKey;
            serverCert.setSubject(csrForge.subject.attributes);
            serverCert.setIssuer(caCertForge.subject.attributes);
            serverCert.setExtensions([
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
              serverCert.validFrom = new Date();
              let validTo = new Date();
              validTo.setFullYear(validTo.getFullYear() + 1);
              serverCert.validTo = validTo.toISOString();
              // Sign the certificate with CA's private key
              serverCert.sign(caPrivateKeyForge);
              
              // Convert the signed certificate to PEM format
              const serverCertPem = forge.pki.certificateToPem(serverCert);
              console.log(serverCertPem)

              !fs.existsSync(projectRoot + '\\uploads\\' + payer_id) && fs.mkdirSync(projectRoot + '\\uploads\\' + payer_id);
              const serverCertfilePath = projectRoot + '\\uploads\\'+payer_id+'\\server-cert-'+payer_id+'.pem';
              const serverKeyfilePath = projectRoot + '\\uploads\\'+payer_id+'\\server-private-key-'+payer_id+'.pem';
              console.log('CertfilePath=', serverCertfilePath)
              console.log('KeyfilePath=', serverKeyfilePath)
      
              // Save the server certificate and private key to disk
              fs.writeFileSync(serverCertfilePath,serverCertPem);
              fs.writeFileSync(serverKeyfilePath, private_key);

              res.json(returndata(200,'success',{ server_certificate_pen:  serverCertPem }));
        } catch(error) {
            res.json(returndata(500, 'Error', (error.message)?error.message:error));
        }
    }
    
}

exports.downloadIntermediate = async(req, res, next) => {
  try {
    res.sendFile(intermediateCertPath)
  }
  catch(err) {
    res.sendFile(err.message)
  }
    
}

  