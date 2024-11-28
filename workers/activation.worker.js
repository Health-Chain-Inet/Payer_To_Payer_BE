const { workerData, parentPort }  = require('worker_threads') 
const dbClient = require('../config/dbClient')



async function checkActivation(actId, key) {
    const client  = await dbClient.getDbClient()
    try {
      client.connect()
      const query = 'SELECT * FROM administrators WHERE adm_id = $1 and activate_key = $2';
      const values = [actId, key]; // Parameterized value
      const result = await client.query(query, values);
      return result.rows; // Return the data fetched
    } catch(err) {
        throw new Error(`Error fetching data: ${error.message}`);
    }
}

if (parentPort) {
    console.log('actId',workerData)

    const { actId, key } = workerData; // URL passed from the main thread
    checkActivation(actId, key)
        .then(data => {
            if(data.length > 0) {
                parentPort.postMessage({ status: 'success', data }); // Send data back to the main thread
            } else {
                parentPort.postMessage({ status: 'error', data });
            }
        })
        .catch(error => {
            console.log('errw=', error)
            parentPort.postMessage({ status: 'error', error: error.message }); // Send error back to the main thread
        });
}


