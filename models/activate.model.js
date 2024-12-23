const dbClient = require('../config/dbClient')
const { Worker } = require('worker_threads') 



// exports.activate = async(actId, key) => {
//     return new Promise((resolve, reject)=>{
//         fetchActivationDetails({actId,key}).then(async(checkActivation)=>{
//             console.log('checkactivation=', checkActivation)
//             if(checkActivation.status == 200) {
//                 let activate = await activatePayer(actId, key)
//                 if(activate == 1) {
//                     resolve(1)
//                 } else {
//                     reject(0)
//                 }
//             } else {
//                 reject(0);
//             }
//         }).catch((error)=>{
//             console.log('err=', error)
//            reject(0)
//         })
//     });
// }

exports.activate = async(actId, key) => {
  try {
    let result = await activatePayer(actId, key)  
    console.log('result2= ',result)

    if(result ==  1) {
        return 1;
    } else {
        return 0;  
    }
  }
  catch(err) {
    console.log('err=', err);
    return 0;
  }
}

async function activatePayer(actId, key) {
    const client  = await dbClient.getDbClient()
    try {
        // console.log('actId=',actId)
        // console.log('key=',key)
        const query = 'UPDATE administrators SET active = $1 WHERE adm_id = $2 and activate_key = $3'
        const values = [true, actId, key]
        await client.connect()
        const result = await client.query(query, values);
        console.log('result= ',result.rowCount)
        // Check if rows were affected
        if (result.rowCount > 0) {
            return 1
        } else {
            return 0
        }
    } catch(err) {
        console.log('errac=', err)
        return 0
    } finally {
        client.end();
    }
}
    


async function checkActivation(actId, key) {
    const client  = await dbClient.getDbClient()
    try {
      await client.connect()

      const query = 'SELECT * FROM administrators WHERE adm_id = $1 and activate_key = $2';
      const values = [actId, key]; // Parameterized value
      const result = await client.query(query, values);
      return result.rows; // Return the data fetched
    } catch(err) {
        throw new Error(`Error fetching data: ${err.message}`);
    } finally {
        client.close()
    }
}

 async function fetchActivationDetails(workerData) { 
    ///console.log('inside getPayersService');
    console.log('wd=', workerData)
    return new Promise((resolve, reject) => { 
      const worker = new Worker('/githubp2p/Payer_To_Payer_BE/workers/activation.worker.js', { workerData: workerData });
      worker.on('message', (message) => {
        console.log('message=', message)
        if (message.status === 'success') {
            resolve({status:200, data:message.data}); // Resolve the promise with the data
        } else if (message.status === 'error') {
            //console.log('error=', message.error)
            reject({status: 500, data: new Error(message.data)}); // Reject the promise with the error
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




