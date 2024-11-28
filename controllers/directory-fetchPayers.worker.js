const { workerData, parentPort }  = require('node:worker_threads') 
  
  
// parentPort.postMessage(async(workerData) => {
//     console.log('Technical Articles on '+ workerData); 


// }); 

parentPort.on('message',async()=>{
    let result = await axios.get('https://jsonplaceholder.typicode.com/todos/'); 
    parentPort.postMessage({success:200, inmessage:workerData,  outmessage:result});
});

parentPort.on('error',async()=>{
    parentPort.postMessage({success:500, inmessage:workerData,  outmessage:'Internal error'});
})