const fs = require('fs');
const directory_model = require('../models/directory.model');
const forge = require('node-forge');
const { validate } = require('uuid');
const projectRoot = process.cwd();
const cf = require('../config/config.json')
const axios = require('axios');
const moment = require('moment-timezone');



// Load the CA's private key and certificate
const caCertPath = projectRoot + '\\certs\\root-ca-cert.pem';
const caPrivateKeyPath =  projectRoot + '\\certs\\root-ca-key.pem';

// Load intermediate certificates (if any)
const intermediateCertPath = projectRoot + '\\certs\\intermediate-ca-cert.pem'; // Adjust this path as necessary
const intermediateKeyPath = projectRoot + '\\certs\\intermediate-ca-key.pem'; // Adjust this path as necessary

let caCert = fs.readFileSync(caCertPath, 'utf8');
let caPrivateKey = fs.readFileSync(caPrivateKeyPath, 'utf8');
let intermediateCert = fs.readFileSync(intermediateCertPath, 'utf8'); // Reading intermediate certificate
let intermediateKey = fs.readFileSync(intermediateKeyPath, 'utf8'); // Reading intermediate certificate



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
            console.log('a')
            //Convert private key and CSR from PEM to forge format
            const privateKeyForge = forge.pki.privateKeyFromPem(private_key);
            const csrForge = forge.pki.certificationRequestFromPem(csr);
            console.log('b')
            // Check if the CSR is valid
            if (!csrForge.verify()) {
                return returndata(400,'CSR is invalid.','Bad Request')
            }
            console.log('c')
            // Load the CA certificate, intermediate certificate, and private key into forge format
            const caCertForge = forge.pki.certificateFromPem(caCert);
            console.log('c1')
            const caPrivateKeyForge = forge.pki.privateKeyFromPem(caPrivateKey);
            console.log('d')
            const intermediateCertForge = forge.pki.certificateFromPem(intermediateCert);
            console.log('e')
            const intermediateKeyForge = forge.pki.privateKeyFromPem(intermediateKey);
            console.log('f')
         
            // Create the client certificate
            const clientCert = forge.pki.createCertificate();
            clientCert.serialNumber = Math.floor(Math.random() * 1e6).toString(); // Random serial number
            clientCert.publicKey = csrForge.publicKey;
            clientCert.setSubject(csrForge.subject.attributes);
            console.log(1)
            clientCert.setIssuer(intermediateCertForge.subject.attributes);
            console.log(2)
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
              console.log(3)
              // Sign the certificate with CA's private key
              clientCert.sign(intermediateKeyForge);
              console.log(4)
              // Convert the signed certificate to PEM format
              const clientCertPem = forge.pki.certificateToPem(clientCert);
              console.log(clientCertPem)
              console.log(5)
              !fs.existsSync(projectRoot + '\\uploads\\' + payer_id) && fs.mkdirSync(projectRoot + '\\uploads\\' + payer_id);
              const clientCertfilePath = projectRoot + '\\uploads\\'+payer_id+'\\client-cert-'+payer_id+'.pem';
              const clientKeyfilePath = projectRoot + '\\uploads\\'+payer_id+'\\client-private-key-'+payer_id+'.pem';
              console.log('CertfilePath=', clientCertfilePath)
              console.log('KeyfilePath=', clientKeyfilePath)
              console.log(6)

              //let verified = await validateCertificate(clientCertPem, intermediateCertForge)
              let verified = intermediateCertForge.verify(clientCert);
              console.log('verified=', verified);
              

              if(verified) {
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

              } else {
                res.json(returndata(500,'failed',{ client_certificate_pen:  'client not verified' }));
              }



         } catch(error) {
            console.log(error)
            res.json(returndata(500, 'Error', (error.message)?error.message:error));
         }
    }
  

    
  


    
}
  

exports.createServerCertificate = async(req, res, next) => {
  const { private_key, csr, payer_id, email } = req.body;

    if (!private_key || !csr || !payer_id || !email) {
        return returndata(400,'Private Key and CSR  are required.','Bad Request')
    } else {
        try {
            console.log(1);
            // Convert private key and CSR from PEM to forge format
            const privateKeyForge = forge.pki.privateKeyFromPem(private_key);
            const csrForge = forge.pki.certificationRequestFromPem(csr);
            console.log(2);
            // Check if the CSR is valid
            if (!csrForge.verify()) {
                return returndata(400,'CSR is invalid.','Bad Request');
            }
            console.log(3);
          // Load the CA certificate, intermediate certificate, and private key into forge format
          const caCertForge = forge.pki.certificateFromPem(caCert);
          console.log('c1')
          const caPrivateKeyForge = forge.pki.privateKeyFromPem(caPrivateKey);
          console.log('d')
          const intermediateCertForge = forge.pki.certificateFromPem(intermediateCert);
          console.log('e')
          const intermediateKeyForge = forge.pki.privateKeyFromPem(intermediateKey);
          console.log('4')

            // Create the client certificate
            const serverCert = forge.pki.createCertificate();
            serverCert.serialNumber = Math.floor(Math.random() * 1e6).toString(); // Random serial number
            serverCert.publicKey = csrForge.publicKey;
            serverCert.setSubject(csrForge.subject.attributes);
            console.log(5);
            // Set the issuer to the intermediate certificate instead of the root CA certificate
            serverCert.setIssuer(intermediateCertForge.subject.attributes);
            console.log(6);
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
            console.log(7);
            let validFrom = new Date()
            serverCert.validFrom = validFrom;
            let validTo = new Date();
            validTo.setFullYear(validTo.getFullYear() + 1);
            serverCert.validTo = validTo.toISOString();
            console.log(8);
            // Sign the certificate with intermediate certificate's private key
            serverCert.sign(intermediateKeyForge);
            console.log(9);
            // Convert the signed certificate to PEM format
            const serverCertPem = forge.pki.certificateToPem(serverCert);
            console.log(serverCertPem);
            console.log(10);

            !fs.existsSync(projectRoot + '\\uploads\\' + payer_id) && fs.mkdirSync(projectRoot + '\\uploads\\' + payer_id);
            const serverCertfilePath = projectRoot + '\\uploads\\'+payer_id+'\\server-cert-'+payer_id+'.pem';
            const serverKeyfilePath = projectRoot + '\\uploads\\'+payer_id+'\\server-private-key-'+payer_id+'.pem';
            console.log('CertfilePath=', serverCertfilePath)
            console.log('KeyfilePath=', serverKeyfilePath)
            console.log(11);
            let verified = intermediateCertForge.verify(serverCert);
            console.log('verified=', verified);
            console.log(12);
            if(verified)  {
              console.log('12a');
              console.log('email=',email);
              let payerdet = await directory_model.getPayerByEmail(email);
              console.log(13);
              if(payerdet.status == 200) {
                console.log(14);
                let msg = payerdet.msg; 
                const certBase64 = serverCertPem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\n/g, '');
                msg.certPem = certBase64;
                msg.endpoint = 'https://localhost:3001/directory/payer/?pid='+msg.payer_id
                const org = await organizationCreator(msg);
                console.log(15);
                if(org.status == 200) {
                  console.log(16);
                  const endp = await endpointCreator(msg, certBase64);
                  console.log(17);
                  if(endp.status == 200) {
                    console.log(18);
                    // Save the server certificate and private key to disk
                    fs.writeFileSync(serverCertfilePath,serverCertPem);
                    fs.writeFileSync(serverKeyfilePath, private_key);
                    await directory_model.certificateSubmission(msg, validFrom, validTo, 'server','organization-'+payer_id,'endpoint-'+msg.payer_id )
                    res.json(returndata(200,'success',{ server_certificate_pen:  serverCertPem }));
                  } else {
                    res.json(returndata(500,'failed',{ server_certificate_pen:  'Error creating endpoint resource' }));                
                  }
                } else {
                  res.json(returndata(500,'failed',{ server_certificate_pen:  'Erro creating organization resource' }));                
                }

                
              } else {
                res.json(returndata(500,'failed',{ server_certificate_pen:  'Failed tp fetch payer details' }));                

              }


              res.json(returndata(200,'success',{ server_certificate_pen:  serverCertPem }));                
            } else {
              res.json(returndata(500,'failed',{ server_certificate_pen:  'Server Certificate validation failed' }));                
            }

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


exports.downloadClientCertificate = async(req, res, next) => {
  const payer_id = req.query.payer_id;
  const clientCertfilePath = projectRoot + '\\uploads\\'+payer_id+'\\client-cert-'+payer_id+'.pem';
  console.log('clientCertfilePath=',clientCertfilePath);
  try {
    res.sendFile(clientCertfilePath)
  }
  catch(err) {
    res.sendFile(err.message)
  }


}

async function organizationCreator(msg) {
  let org = {};
  let orgId = msg.payer_id; 
  org.fullUrl = "Organization/"+orgId;
  org.resource = {}
  org.resource.resourceType = "Organization";
  org.resource.id = 'organization-'+orgId;
  org.resource.meta = {}
  org.resource.meta.lastUpdated = moment().tz('America/Los_Angeles').format();
  org.resource.meta.profile = ["http://hl7.org/fhir/us/davinci-pdex/StructureDefinition/mtls-managing-organization"]
  org.resource.identifier = [];
  org.resource.identifier[0] = {}
  org.resource.identifier[0].system = "CMSInterop: Organization_ID";
  org.resource.identifier[0].value = orgId; 
  org.resource.active = true; 
  org.resource.type = {}
  org.resource.type.coding = [];
  org.resource.type.coding[0]= {}
  org.resource.type.coding[0].system = "http://hl7.org/fhir/us/davinci-pdex/CodeSystem/OrgTypeCS";
  org.resource.type.coding[0].code = "Payer";
  org.resource.type.coding[0].display = "Payer";
  org.resource.name = msg.payer_name;
  org.resource.telecom = [];
  org.resource.telecom[0] = {};
  org.resource.telecom[0].system = "phone";
  org.resource.telecom[0].value = msg.adm_phone;
  // org.resource.endpoint = [];
  // org.resource.endpoint[0] = {};
  // org.resource.endpoint[0].reference = "Endpoint/endpoint-"+orgId;
 // console.log('orgr=', org)
  const headers =  {
      'Content-Type': 'application/fhir+json' // Ensure correct content type for FHIR
  }
  let fhirdata = await axios.put(cf.fhirbaseurl + 'Organization/organization-'+orgId, org.resource, {headers:headers})
  .then(async(response) => {
      return {
          status: 200,
          msg : response.data
      }
  }).catch((err) => {
      return {
          status: 500,
          msg : err
      }
  })
  return fhirdata;
}

async function endpointCreator(msg, servercertPem) {
  let endp = { };
  let endpId = msg.payer_id;
  endp.fullUrl = "Endpoint/"+endpId;
  endp.resource = {};
  endp.resource.resourceType = "Endpoint"
  endp.resource.id = 'endpoint-'+endpId;
  endp.resource.meta = {};
  endp.resource.meta.lastUpdated = moment().tz('America/Los_Angeles').format();
  endp.resource.meta.profile = [ "http://hl7.org/fhir/us/davinci-pdex/StructureDefinition/mtls-endpoint"]
  endp.resource.identifier = [];
  endp.resource.identifier[0] = {}
  endp.resource.identifier[0].system = "CMSInterop: Endpoint_ID";
  endp.resource.identifier[0].value = endpId;
  endp.resource.extension = [];
  endp.resource.extension[0] = {};
  endp.resource.extension[1] = {};
  endp.resource.extension[2] = {};
  endp.resource.extension[3] = {};

  endp.resource.extension[0].extension = [];
  endp.resource.extension[1].extension = [];
  endp.resource.extension[2].extension = [];
  endp.resource.extension[3].extension = [];

  endp.resource.extension[0].extension[0] = {};
  endp.resource.extension[1].extension[0] = {};
  endp.resource.extension[2].extension[0] = {};
  endp.resource.extension[3].extension[0] = {};

  endp.resource.extension[0].url = "http://hl7.org/fhir/us/ndh/StructureDefinition/base-ext-endpoint-usecase";
  endp.resource.extension[1].url = "http://hl7.org/fhir/us/ndh/StructureDefinition/base-ext-igsSupported";
  
  endp.resource.extension[0].extension[0].url = "endpointUsecasetype";
  endp.resource.extension[0].extension[0].valueCodeableConcept = {};
  endp.resource.extension[0].extension[0].valueCodeableConcept.coding = [];
  endp.resource.extension[0].extension[0].valueCodeableConcept.coding[0] = {};
  endp.resource.extension[0].extension[0].valueCodeableConcept.coding[0].system = "http://terminology.hl7.org/CodeSystem/v3-ActReason";
  endp.resource.extension[0].extension[0].valueCodeableConcept.coding[0].code = "HOPERAT";
  endp.resource.extension[0].extension[0].valueCodeableConcept.coding[0].display = "healthcare operations";

  endp.resource.extension[1].extension[0].url = "igsSupportedType";
  endp.resource.extension[1].extension[0].valueCodeableConcept = {};
  endp.resource.extension[1].extension[0].valueCodeableConcept.coding = [];
  endp.resource.extension[1].extension[0].valueCodeableConcept.coding[0] = {};
  endp.resource.extension[1].extension[0].valueCodeableConcept.coding[0].system = "http://hl7.org/fhir/us/ndh/CodeSystem/IgTypeCS";
  endp.resource.extension[1].extension[0].valueCodeableConcept.coding[0].code = "FHIR";
  endp.resource.extension[1].extension[0].valueCodeableConcept.coding[0].display = "FHIR";


  endp.resource.extension[2].extension[0].url  = "secureExchangeArtifactsType";
  endp.resource.extension[2].extension[0].valueString  =  "mtls Public Certificate";

  endp.resource.extension[3].extension[0].url  = "certificate";
  endp.resource.extension[3].extension[0].valueBase64Binary  = servercertPem;
  endp.resource.name = "Payer-Payer Exchange";
  endp.resource.status = "active";
  endp.resource.managingOrganization =  {};
  endp.resource.managingOrganization.identifier = {};
  endp.resource.managingOrganization.identifier.value =   "Organization/organization-"+endpId;
  endp.resource.address = msg.endpoint;
  const headers =  {
      'Content-Type': 'application/fhir+json' // Ensure correct content type for FHIR
  }
  let fhirdata = await axios.put(cf.fhirbaseurl + 'Endpoint/endpoint-'+endpId, endp.resource)
  .then(async(response) => {
      return {
          status: 200,
          msg : response.data
      }
  }).catch((err) => {
      return {
          status: 500,
          msg : err
      }
  })
return fhirdata;

}

  