const crypto = require('crypto');

// Step 1: Generate RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048, // Length of the key in bits
  publicKeyEncoding: {
    type: 'spki',  // Subject Public Key Info (SPKI) format
    format: 'pem', // PEM format (we will work with it in string form)
  },
  privateKeyEncoding: {
    type: 'pkcs8', // PKCS#8 format for private key
    format: 'pem', // PEM format
  },
});

console.log('Public Key:');
console.log(publicKey);
console.log('Private Key:');
console.log(privateKey);

// Step 2: Encrypt data with the public key
const data = 'This is a secret message';
const encryptedData = crypto.publicEncrypt(publicKey, Buffer.from(data));

console.log('Encrypted Data:', encryptedData.toString('base64')); // Output encrypted data in base64 format

// Step 3: Decrypt data with the private key
const decryptedData = crypto.privateDecrypt(privateKey, encryptedData);

console.log('Decrypted Data:', decryptedData.toString()); // Output decrypted data
