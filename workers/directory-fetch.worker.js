const { workerData, parentPort }  = require('worker_threads') 
const axios = require('axios')



async function fetchData(url) {
    try {
        const response = await axios.get(url);
        return response.data; // Return the data from the response
    } catch (error) {
        throw new Error(`Error fetching data: ${error.message}`);
    }
}

if (parentPort) {
    const url = workerData; // URL passed from the main thread
    fetchData(url)
        .then(data => {
            parentPort.postMessage({ status: 'success', data }); // Send data back to the main thread
        })
        .catch(error => {
            parentPort.postMessage({ status: 'error', error: error.message }); // Send error back to the main thread
        });
}


