const dbClient = require('../config/dbClient')
const { Worker } = require('worker_threads') 



exports.activate = async(actId, key) => {
    return new Promise((resolve, reject)=>{
        fetchActivationDetails({actId,key}).then(async(checkActivation)=>{
            if(checkActivation.status == 200) {
                let activate = await activatePayer(actId, key)
                if(activate == 1) {
                    resolve(1)
                } else {
                    reject(0)
                }
            } else {
                reject(0);
            }
        }).catch((error)=>{
            console.log('err=', error)
           reject(0)
        })
    });
}


 async function fetchActivationDetails(workerData) { 
    ///console.log('inside getPayersService');
    console.log('wd=', workerData)
    return new Promise((resolve, reject) => { 
      const worker = new Worker('/p2p/P2P-BE/workers/activation.worker.js', { workerData: workerData });
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
          reject({status:500, data: new Error(`Worker error: ${error.message}`)});
      });
  
      // Handle worker exit
      worker.on('exit', (code) => {
          if (code !== 0) {
              reject({status:500, data: new Error(`Worker stopped with exit code ${code}`)});
          }
      });
      //worker.postMessage(workerData); // Send data to the worker
  
    }) 
} 


async function activatePayer(actId, key) {
    const client  = await dbClient.getDbClient()
    try {
        const query = 'UPDATE administrators SET active = $1 WHERE adm_id = $2 and activate_key = $3'
        const values = [true, actId, key]
        client.connect()
        const result = await client.query(query, values);
        // Check if rows were affected
        if (result.rowCount > 0) {
            return 1
        } else {
            return 0
        }
    } catch(err) {
        console.log('errac=', err)
        return 0
    }
}

