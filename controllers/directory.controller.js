
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
    const endpoint = body.endpoint;
    
    const cert = forge.pki.certificateFromPem(certPem);
    console.log(cert);

    let payerdet = await directory_model.getPayerByEmail(email)

    let pdata = {
      email: email, 
      user : user, 
      certPem: certPem, 
      cert:cert, 
      payerdet: payerdet,  
      endpoint: endpoint
    }

    // console.log(pdata);

    // res.json({
    //   status:200,
    //   message: 'File uploaded successfully',
    //   data: pdata // Send the uploaded file's details in the response
    // });

    // return; 



    let bundle = await bundleCreator(pdata);
    // console.log(JSON.stringify(bundle));
    //console.log(pdata)

    // headers = {
    //   'Content-Type': 'application/json'
    // }

    // Send POST request with custom headers
    await axios.post(cf.fhirbaseurl + 'Bundle?_format=json', bundle)
    .then(async(response) => {
      console.log('Data received from server:', response.data);
      const tblCertificate = {
          payer_id : payerdet.msg.payer_id,
          adm_id : payerdet.msg.adm_id,
          bundle_id : response.data.id,
          validity_notbefore : cert.validity.notBefore,
          validity_notafter : cert.validity.notAfter,
      }
      let dbUpdate = await directory_model.certificateSubmission(tblCertificate);
      console.log(dbUpdate);
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

exports.downloadCertificate = async (req,res, next) => {
  let body = req.body;
  const email = body.email; 
  const payerdet = await directory_model.getPayerByEmailWithCertificate(email);
  if(payerdet.status == 200) {
    const bundle_id = payerdet.msg.bundle_id; 
    console.log('bundle_id=', bundle_id);
    await axios.get(cf.fhirbaseurl + 'Bundle/'+bundle_id+'?_format=json')
    .then((response)=> {
      if(response.status == 200) {
        // certificatedata = extensioninner[k]

        // let entries  =response.data.entry; 
        // let certificatedata;
        let certificatedata = response.data
        // for(let i=0; i< entries.length;i++) {
        //   if(entries[i].resource.resourceType == 'Endpoint') {
        //     let extensionouter = entries[i].resource.extension; 
        //      for(let j=0;j<extensionouter.length;j++) {
        //       if('extension' in extensionouter[j]) {
        //         let extensioninner =  extensionouter[j];
        //         for(let k=0;k<extensioninner.length;k++) {
        //           // if(extensionouter[j].extension.url == 'certificate') {
        //           //   certificatedata = certificatedata.extensionouter.extension[j].valueBase64Binary;
        //           // }
        //         }
        //       }

        //     }
        //   }
        // }
        return res.status(200).json({status:200, message: certificatedata})
      } else {
        return res.status(404).json({status:404, message: []})

      }
    })
    .catch((err)=>{
      console.log('error=', err);
      return res.status(404).json({status:500, message: []}) ;
    })
   
  } else {
    return res.status(404).json({status:500, message: 'No data available'}) 
  }
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


exports.fetchAllPayers = async(req, res,next) => {
  try {
    let payers  = await directory_model.getAllPayers();
    if(payers.status == 200) {
      return res.status(200).json({status:200, message: payers.msg})
    } else {
      return res.status(500).json({status:500, message: 'Payers not found'})
    }
  } catch(err) {
    return res.status(500).json({status:500, message: err})
  }
}

exports.fetchSinglePayerByEmail =  async(req, res,next) => {
  const body = req.body
  const email = req.body.email 
  try {
     const payerdata = await directory_model.getPayerByEmailWithCertificate(email)
     if(payerdata.status == 200) {
      return res.status(200).json({status:200, message: payerdata.msg})
     } else {
      return res.status(200).json({status:500, message: 'Error fetching data'})
     }
  }  catch(err) {
     return res.status(500).json({status:500, message: err})
  }

}

exports.fetchCertificateDetails = async(req, res, next) => {
  const body = req.body
  const email = req.body.email 
  try {
    const cdetails = await directory_model.fetchCertificateDetails(email);
    console.log('cdetails=', cdetails);
    if(cdetails.status == 200) {
     return res.status(200).json({status:200, message: cdetails.msg})
    } else {
     return res.status(404).json({status:404, message: []})
    }
 }  catch(err) {
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
  endp.resource.name = "Payer-Payer Exchange";
  endp.resource.status = "active";
  endp.resource.managingOrganization =  {};
  endp.resource.managingOrganization.identifier = {};
  endp.resource.managingOrganization.identifier.value =   "Organization/"+endpId;
  endp.resource.address = pdata.endpoint;
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



