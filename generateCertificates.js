const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to run a shell command synchronously and capture the output
function runCommand(command) {
    console.log(`Running command: ${command}`);
    return execSync(command).toString();
}

// Paths to store the generated certificates and keys
const outputDir = path.join(__dirname, 'certs');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Create Root CA Certificate (ca.crt) and Key (ca.key)
function createRootCA() {
    console.log('Creating Root Certificate Authority (CA)...');

    // Generate private key for Root CA
    runCommand('openssl genpkey -algorithm RSA -out ' + path.join(outputDir, 'ca.key') + ' -aes256');

    // Generate Root CA certificate (self-signed)
    runCommand('openssl req -key ' + path.join(outputDir, 'ca.key') + ' -new -x509 -out ' + path.join(outputDir, 'ca.crt') + ' -days 3650 -subj "/CN=Root CA/O=MyOrganization/C=US"');
}

// Create Server Certificate (server.crt) and Key (server.key)
function createServerCert() {
    console.log('Creating Server Certificate...');

    // Generate private key for the server
    runCommand('openssl genpkey -algorithm RSA -out ' + path.join(outputDir, 'server.key'));

    // Generate Certificate Signing Request (CSR) for the server
    runCommand('openssl req -key ' + path.join(outputDir, 'server.key') + ' -new -out ' + path.join(outputDir, 'server.csr') + ' -subj "/CN=www.myserver.com/O=MyOrganization/C=US"');

    // Sign the server CSR with the Root CA
    runCommand('openssl x509 -req -in ' + path.join(outputDir, 'server.csr') + ' -CA ' + path.join(outputDir, 'ca.crt') + ' -CAkey ' + path.join(outputDir, 'ca.key') + ' -CAcreateserial -out ' + path.join(outputDir, 'server.crt') + ' -days 365');
}

// Create Client Certificate (client.crt) and Key (client.key)
function createClientCert() {
    console.log('Creating Client Certificate...');

    // Generate private key for the client
    runCommand('openssl genpkey -algorithm RSA -out ' + path.join(outputDir, 'client.key'));

    // Generate Certificate Signing Request (CSR) for the client
    runCommand('openssl req -key ' + path.join(outputDir, 'client.key') + ' -new -out ' + path.join(outputDir, 'client.csr') + ' -subj "/CN=Client/O=MyOrganization/C=US"');

    // Sign the client CSR with the Root CA
    runCommand('openssl x509 -req -in ' + path.join(outputDir, 'client.csr') + ' -CA ' + path.join(outputDir, 'ca.crt') + ' -CAkey ' + path.join(outputDir, 'ca.key') + ' -CAcreateserial -out ' + path.join(outputDir, 'client.crt') + ' -days 365');
}

// Run the functions to generate the certificates
createRootCA();
createServerCert();
createClientCert();

console.log('Certificates generated successfully!');

// List generated files
console.log('Generated files:');
fs.readdirSync(outputDir).forEach(file => {
    console.log(file);
});
