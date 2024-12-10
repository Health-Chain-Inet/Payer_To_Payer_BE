const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const cf = require('../config/config.json')
const axios = require('axios');
const directory_model = require('../models/directory.model');



// Get the root of the current working directory (project root)
const projectRoot = process.cwd();

// Generate a private key for the server certificate
const keys = forge.pki.rsa.generateKeyPair(2048);

// Generate a private key for the CA certificate
const caKeys = forge.pki.rsa.generateKeyPair(2048);

// Create a self-signed root CA certificate
const caCert = forge.pki.createCertificate();

exports.generateCert = async(msg) => {
    let caCertPem = await getCACert();
    const certca = forge.pki.certificateFromPem(caCertPem.toString());
    const clientCert = await generateClientCert(msg, certca);
    if(clientCert.status == 200) {
        const serverCert = await generateServerCert(msg, certca);
        if(serverCert.status == 200) {
            return {
                status: 200, 
                msg : {
                    caCert: certca, 
                    serverCert: serverCert,  
                    clientCert: clientCert
                }
            }
        } else {
            return {
                status: 500, 
                msg : 'Error generating server certificate'
            }      
        }

    } else {
        return {
            status: 500, 
            msg : 'Error generating client certificate'
        }   
    }
}



exports.validateCertificate = async(certPem, caCertPem) =>  {
    const cert = forge.pki.certificateFromPem(certPem);
    const caCert = forge.pki.certificateFromPem(caCertPem);
  
    // Simulate certificate validation against a CA's trusted root certificate
    const verified = cert.verify(caCert);
    
    if (verified) {
      console.log('Certificate is valid and trusted by the CA.');
      return 'Certificate is Valid'
    } else {
      console.log('Certificate validation failed. It is not trusted by the CA.');
      return 'Certificate is not Valid'
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

async function generateCA(caCertfilePath,caKeyfilePath) {
    caCert.publicKey = caKeys.publicKey;
    caCert.serialNumber = '01';

    caCert.validFrom = new Date().toISOString();
    //caCert.validTo = new Date();
    let validTo = new Date();
    validTo.setFullYear(validTo.getFullYear() + 1);
    caCert.validTo = validTo.toISOString();
    console.log(caCert.validTo)
    caCert.validity.notBefore = new Date();
    caCert.validity.notAfter = new Date(validTo.toString())
    //caCert.validTo.setFullYear(caCert.validTo.getFullYear() + 1);  // CA validity (1 years)

    // Set the CA certificate subject
    caCert.setSubject([
        { name: 'commonName', value: 'P2P Trusted Framework' },
        { name: 'countryName', value: 'US' },
        { name: 'organizationName', value: 'Health Chain' },
        { name: 'postalCode', value: '75024' },
        { name: 'emailAddress', value: 'info@health-chain.io' }
    ]);

    // Set the issuer of the CA certificate (self-signed)
    caCert.setIssuer(caCert.subject.attributes);

    // Sign the CA certificate with its private key
    caCert.sign(caKeys.privateKey);
    // PEM encoding of the CA private key and certificate
    const caPrivateKeyPem = forge.pki.privateKeyToPem(caKeys.privateKey);
    const caCertPem = forge.pki.certificateToPem(caCert);
    // !fs.existsSync(caCertfilePath) && fs.writeFileSync(caCertfilePath, caCertPem);
    // !fs.existsSync(caKeyfilePath) && fs.writeFileSync(caKeyfilePath, caPrivateKeyPem);
    fs.writeFileSync(caCertfilePath, caCertPem);
    fs.writeFileSync(caKeyfilePath, caPrivateKeyPem);
    return caCert;
}


async function getCACert() {
    const caCertfilePath = projectRoot + '\\certs\\ca-cert.pem';
    const caKeyfilePath = projectRoot + '\\certs\\ca-private-key.pem';
    console.log('caCertfilePath=', caCertfilePath)
    console.log('caKeyfilePath=', caKeyfilePath)


    //let caCert =  await generateCA(caCertfilePath,caKeyfilePath);
    if(!fs.existsSync(caCertfilePath)) {
      let caCert =  await generateCA(caCertfilePath,caKeyfilePath);
      console.log('a')
      return caCert;
    } else {
        // Certificate content
        const caCertPem = fs.readFileSync(caCertfilePath, 'utf8');
        const caPrivateKeyPem = fs.readFileSync(caKeyfilePath, 'utf8');
        const cert = forge.pki.certificateFromPem(caCertPem);
        let current_dt = moment().tz('America/Los_Angeles').format();
        let validity_notbefore = cert.validity.notBefore;
        let validity_notafter = cert.validity.notAfter;
        let dtfrom = moment(validity_notbefore).tz('America/Los_Angeles').format();
        let dtto = moment(validity_notafter).tz('America/Los_Angeles').format();
        console.log(dtfrom)
        console.log(dtto)
        console.log(current_dt)
        if(current_dt >= dtfrom && current_dt <= dtto) {
          console.log('b')
          return caCertPem;
        } else {
          let caCert =  await generateCA(caCertfilePath,caKeyfilePath);
          console.log('c')
          return caCert;
        }

    }

}

async function generateServerCert(msg, certca) {
    try {
        // Create the server certificate to be signed by the CA
        const serverCert = forge.pki.createCertificate();
        serverCert.publicKey = keys.publicKey;
        serverCert.serialNumber = '02';
        serverCert.validFrom = new Date().toISOString();
        serverCert.validTo = new Date();
        serverCert.validTo.setFullYear(serverCert.validTo.getFullYear() + 1);  // 1 year validity

        let validTo = new Date();
        validTo.setFullYear(validTo.getFullYear() + 1);
        serverCert.validity.notBefore = new Date();
        serverCert.validity.notAfter = new Date(validTo.toString())

        // Set certificate subject
        serverCert.setSubject([
            { name: 'commonName', value: 'server-'+msg.payer_id },
            { name: 'countryName', value: 'US' },
            { name: 'organizationName', value: msg.payer_name }
        ]);

        // Define custom Subject Alternative Name extension with DNS names
        const sanExtension = {
            name: 'subjectAltName',
            altNames: [
                { type: 2, value: `payerId.${msg.payer_id}` },
                { type: 2, value: `payerName.${msg.payer_name}` },
                { type: 2, value: `fhirEndpoint.${msg.payer_base_url}` },
                { type: 2, value: `registrationStatus.${msg.active}` }
            ]
        };

        // Add the SAN extension to the certificate
        serverCert.setExtensions([sanExtension]);

        // Set the issuer of the server certificate to the CA certificate's subject
        serverCert.setIssuer(certca.subject.attributes);  // This ensures the issuer matches the CA's subject

        // Sign the certificate with the CA's private key
        serverCert.sign(caKeys.privateKey);

        // PEM encoding of the private key and certificate
        const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
        const certPem = forge.pki.certificateToPem(serverCert);

        !fs.existsSync(projectRoot + '\\uploads\\' + msg.payer_id) && fs.mkdirSync(projectRoot + '\\uploads\\' + msg.payer_id);
        const serverCertfilePath = projectRoot + '\\uploads\\'+msg.payer_id+'\\server-cert-'+msg.payer_id+'.pem';
        const serverKeyfilePath = projectRoot + '\\uploads\\'+msg.payer_id+'\\server-private-key-'+msg.payer_id+'.pem';
        console.log('serverCertfilePath=', serverCertfilePath)
        console.log('serverKeyfilePath=', serverKeyfilePath)

        // Save the server certificate and private key to disk
        fs.writeFileSync(serverCertfilePath, privateKeyPem);
        fs.writeFileSync(serverKeyfilePath, certPem);
        const cert = forge.pki.certificateFromPem(certPem.toString());
        //console.log('servercert', cert);
        msg.certPem = certPem;
        msg.endpoint = 'https://localhost:3001/directory/payer/?pid='+msg.payer_id
        //console.log('nsg',msg.certPem);
        const org = await organizationCreator(msg);
        console.log('org=', org)
        if(org.status==200){
            const endp = await endpointCreator(msg);
            if(endp.status == 200) {
                const tblCertificate = {
                    payer_id : msg.payer_id,
                    adm_id : msg.adm_id,
                    adm_email: msg.adm_email,
                    validity_notbefore : cert.validity.notBefore,
                    validity_notafter : cert.validity.notAfter, 
                    cert_type: 'server',
                    org_id : 'organization-'+msg.payer_id, 
                    endpoint_id : 'endpoint-'+msg.payer_id
                }
              
                let dbUpdate = await directory_model.certificateSubmission(tblCertificate);
                return {
                    status: 200, 
                    msg : {
                        key : privateKeyPem, 
                        certPem: certPem, 
                        cert : cert, 
                        organization: org, 
                        endpoint: endp
                    }
                }
            } else {
                console.log('error in creating endpoint resource in fhir server')
                return {
                    status:500, 
                    msg: 'Error creating Server certificate in FHIR Endpoint resource'
                }
            }
        } else {
            console.log('error in creating Org resource in fhir server')
            return {
                status:500, 
                msg: 'Error creating Server certificate in FHIR Organization resource '
            }
        }

   
    }
    catch(error) {
        console.log('servercerterror=', error);
        return {
            status:500, 
            msg: 'Error creating Server certificate: ' + error
        }
    }
}

async function generateClientCert(msg, certca) {
    try {
        // Create the server certificate to be signed by the CA
        const clientCert = forge.pki.createCertificate();
        clientCert.publicKey = keys.publicKey;
        clientCert.serialNumber = '02';
        clientCert.validFrom = new Date().toISOString();
        clientCert.validTo = new Date();
        clientCert.validTo.setFullYear(clientCert.validTo.getFullYear() + 1);  // 1 year validity

        let validTo = new Date();
        validTo.setFullYear(validTo.getFullYear() + 1);
        //clientCert.validTo = validTo.toISOString();
        //console.log(clientCert.validTo)
        clientCert.validity.notBefore = new Date();
        clientCert.validity.notAfter = new Date(validTo.toString())

        // Set certificate subject
        clientCert.setSubject([
            { name: 'commonName', value: 'client-'+msg.payer_id },
            { name: 'countryName', value: 'US' },
            { name: 'organizationName', value: msg.payer_name }
        ]);

        // Define custom Subject Alternative Name extension with DNS names
        const sanExtension = {
            name: 'subjectAltName',
            altNames: [
                { type: 2, value: `payerId.${msg.payer_id}` },
                { type: 2, value: `payerName.${msg.payer_name}` },
                { type: 2, value: `fhirEndpoint.${msg.payer_base_url}` },
                { type: 2, value: `registrationStatus.${msg.active}` }
            ]
        };

        // Add the SAN extension to the certificate
        clientCert.setExtensions([sanExtension]);

        // Set the issuer of the server certificate to the CA certificate's subject
        clientCert.setIssuer(certca.subject.attributes);  // This ensures the issuer matches the CA's subject

        // Sign the certificate with the CA's private key
        clientCert.sign(caKeys.privateKey);

        // PEM encoding of the private key and certificate
        const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
        const certPem = forge.pki.certificateToPem(clientCert);

        !fs.existsSync(projectRoot + '\\uploads\\' + msg.payer_id) && fs.mkdirSync(projectRoot + '\\uploads\\' + msg.payer_id);
        const clientCertfilePath = projectRoot + '\\uploads\\'+msg.payer_id+'\\client-cert-'+msg.payer_id+'.pem';
        const clientKeyfilePath = projectRoot + '\\uploads\\'+msg.payer_id+'\\client-private-key-'+msg.payer_id+'.pem';
        console.log('CertfilePath=', clientCertfilePath)
        console.log('KeyfilePath=', clientKeyfilePath)

        // Save the server certificate and private key to disk
        fs.writeFileSync(clientCertfilePath, privateKeyPem);
        fs.writeFileSync(clientKeyfilePath, certPem);

        const cert = forge.pki.certificateFromPem(certPem.toString());

        //console.log('msggg=', msg)
        const tblCertificate = {
            payer_id : msg.payer_id,
            adm_id : msg.adm_id,
            adm_email: msg.adm_email,
            validity_notbefore : cert.validity.notBefore,
            validity_notafter : cert.validity.notAfter, 
            cert_type: 'client'
        }
      
        let dbUpdate = await directory_model.certificateSubmission(tblCertificate);

        return {
            status: 200, 
            msg : {
                key : privateKeyPem, 
                certPem: certPem, 
                cert: cert
            }
        }
    }
    catch(error) {
        console.log('client certificate error=', error);
        return {
            status:500, 
            msg: 'Error creating Client certificate: ' + error
        }
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
    console.log('orgr=', org)
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
  
async function endpointCreator(msg) {
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
    endp.resource.extension[3].extension[0].valueBase64Binary  = msg.certPem;
    endp.resource.name = "Payer-Payer Exchange";
    endp.resource.status = "active";
    endp.resource.managingOrganization =  {};
    endp.resource.managingOrganization.identifier = {};
    endp.resource.managingOrganization.identifier.value =   "Organization/organization-"+endpId;
    endp.resource.address = msg.endpoint;
    const headers =  {
        'Content-Type': 'application/fhir+json' // Ensure correct content type for FHIR
    }
    let fhirdata = await axios.put(cf.fhirbaseurl + 'Endpoint/endpoint-'+endpId, endp.resource, {headers:headers})
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

  