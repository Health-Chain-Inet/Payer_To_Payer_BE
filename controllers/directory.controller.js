
const { Worker } = require('worker_threads') 

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

