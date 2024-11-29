
const { Worker } = require('worker_threads') 
const forge = require('node-forge');
const directory_model = require('../models/directory.model');
const moment = require('moment-timezone');
const axios = require('axios');
const cf = require('../config/config.json')


function removeSpecialChars(str) {
  return str.replace(/[^a-zA-Z0-9\s]/g, '');
}

exports.uploadCertificate = async (req, res, next) => {
    console.log('rebody=', req.body)
    const body = JSON.parse(req.body)
    const certPem = body.certcontent.certificate;
    const user = body.user;
    const email = body.email; 
    
    const cert = forge.pki.certificateFromPem(certPem);
    let payerdet = await directory_model.getPayerByEmail(email)

    let pdata = {
      email: email, 
      user : user, 
      certPem: certPem, 
      cert:cert, 
      payerdet: payerdet,  
    }

    let bundle = await bundleCreator(pdata);
    // console.log(JSON.stringify(bundle));
    //console.log(pdata)

    // headers = {
    //   'Content-Type': 'application/json'
    // }

    // Send POST request with custom headers
    await axios.post(cf.fhirbaseurl + 'Bundle?_format=json', bundle)
    .then(response => {
      console.log('Data received from server:', response.data);
      res.json({
        status:200,
        message: 'File uploaded successfully',
        data: response.data // Send the uploaded file's details in the response
      });
    })
    .catch(error => {
      console.log('Request failed:', error);
      res.json({
        status:500,
        message: 'File uploaded successfully',
        data: error // Send the uploaded file's details in the response
      });
    });




    // Step 3: Extract information from the certificate
    // console.log('Subject:', cert.subject.attributes);
    // console.log('Issuer:', cert.issuer.attributes);
    // console.log('Serial Number:', cert.serialNumber);
    // console.log('Not Before:', cert.validity.notBefore);
    // console.log('Not After:', cert.validity.notAfter);
    // console.log('Public Key Algorithm:', cert.publicKey.algorithm);
    // console.log('Public Key:', forge.pki.publicKeyToPem(cert.publicKey));

    // const extensions = cert.extensions;

    // if (extensions && extensions.length > 0) {
    //     extensions.forEach(ext => {
    //       console.log('Extension:', ext);
    //     });
    //   } else {
    //     console.log('No extensions found.');
    //   }

    // // Optionally: You can also verify the certificate using forge (for example, check if it's self-signed)
    // // const isSelfSigned = cert.isSelfSigned();
    // console.log('Is Self-Signed:', cert)



}


exports.fetchPayers = async (req, res,next) => {
  try {
    let url = 'https://jsonplaceholder.typicode.com/todos/'
    let payers = await fetchService(url);
    //console.log('payers=')
    return res.status(200).json({status:200, message: payers.data})
  }
  catch(err) {
    return res.status(500).json({status:500, message: err})
  }

   
}


async function bundleCreator(pdata) {
  let bundle = {};
  let bundleId = removeSpecialChars(pdata.email)
  bundle.resourceType = 'Bundle';
  bundle.id = bundleId;
  bundle.meta = {}
  bundle.meta.lastUpdated = moment().tz('America/Los_Angeles').format();
  bundle.meta.profile = ["http://hl7.org/fhir/us/davinci-pdex/StructureDefinition/mtls-bundle"]
  bundle.type = "collection"
  bundle.timestamp = bundle.meta.lastUpdated;
  bundle.entry= []
  let Org = await organizationCreator(pdata);
  let Endp = await endpointCreator(pdata);
  bundle.entry.push(Org);
  bundle.entry.push(Endp);
  return bundle;
}

async function organizationCreator(pdata) {
  let org = {};
  let orgId = pdata.payerdet.msg.payer_id; 
  org.fullUrl = "Organization/"+orgId;
  org.resource = {}
  org.resource.resourceType = "Organization";
  org.resource.id = orgId;
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
  org.resource.name = pdata.payerdet.msg.payer_name;
  org.resource.telecom = [];
  org.resource.telecom[0] = {};
  org.resource.telecom[0].system = "phone";
  org.resource.telecom[0].value = pdata.payerdet.msg.adm_phone;
  org.resource.endpoint = [];
  org.resource.endpoint[0] = {};
  org.resource.endpoint[0].reference = "Endpoint/"+orgId;
  return org; 
}

async function endpointCreator(pdata) {
  let endp = { };
  let endpId = pdata.payerdet.msg.payer_id;
  endp.fullUrl = "Endpoint/"+endpId;
  endp.resource = {};
  endp.resource.resourceType = "Endpoint"
  endp.resource.id = endpId;
  endp.resource.meta = {};
  endp.resource.meta.lastUpdated = moment().tz('America/Los_Angeles').format();
  endp.resource.meta.profile = [ "http://hl7.org/fhir/us/davinci-pdex/StructureDefinition/mtls-endpoint"]
  endp.resource.identifier = [];
  endp.resource.identifier[0] = {}
  endp.resource.identifier[0].system = "CMSInterop: Endpoint_ID";
  endp.resource.identifier[0].value = endpId;
  endp.resource.extension = [];
  endp.resource.extension[0] = {};
  endp.resource.extension[0].extension = [];
  endp.resource.extension[0].extension[0] = {};
  endp.resource.extension[0].extension[0].url  = "secureExchangeArtifactsType";
  endp.resource.extension[0].extension[0].valueString  =  "mtls Public Certificate";
  endp.resource.extension[0].extension[1] = {};
  endp.resource.extension[0].extension[1].url  = "certificate";
  endp.resource.extension[0].extension[1].valueBase64Binary  = pdata.certPem;

  return endp;


}


async function fetchService(workerData) { 
  ///console.log('inside getPayersService');
  return new Promise((resolve, reject) => { 

    const worker = new Worker('/p2p/P2P-BE/workers/directory-fetch.worker.js', { workerData: workerData });
    worker.on('message', (message) => {
      if (message.status === 'success') {
          resolve({status:200, data:message.data}); // Resolve the promise with the data
      } else if (message.status === 'error') {
          //console.log('error=', message.error)
          reject({status: 500, data: new Error(message.error)}); // Reject the promise with the error
      }
    });

    // Handle worker errors
    worker.on('error', (error) => {
        reject(new Error(`Worker error: ${error.message}`));
    });

    // Handle worker exit
    worker.on('exit', (code) => {
        if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
        }
    });
    //worker.postMessage(workerData); // Send data to the worker

  }) 
} 



