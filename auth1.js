const { ClientCertificateCredential } = require('@azure/identity');
const fs = require('fs');
const path = require('path');

// Azure AD Application (Service Principal) Details
const tenantId = '<YOUR_TENANT_ID>';
const clientId = '<YOUR_CLIENT_ID>';
const certPath = path.join(__dirname, 'certificate.pem');  // Path to your PEM certificate
const privateKeyPath = path.join(__dirname, 'private_key.pem');  // Path to your private key

// Read the certificate and private key files
const certificate = fs.readFileSync(certPath, 'utf8');
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');


// const credential = new ClientSecretCredential(
//     tenantId,
//     clientId,
//     privateKeyPem,
//     { clientAssertion: certPem }
//   );

// Create the credential object using the certificate and private key
const credential = new ClientCertificateCredential(
  tenantId,         // Tenant ID
  clientId,         // Client (Application) ID
  certificate,      // Public certificate (can be a .pem file)
  privateKey,       // Private key (can be a .pem file)
);

// Example: Use the credential to authenticate to Azure SDK services
async function authenticateWithServicePrincipal() {
  try {
    // Now that you're authenticated, you can use this credential to access Azure resources.
    // For example, let's access Azure Key Vault or any other Azure service

    // Let's say you want to list keys in Azure Key Vault:
    const { SecretClient } = require('@azure/keyvault-secrets');
    
    const keyVaultName = '<YOUR_KEYVAULT_NAME>';
    const keyVaultUrl = `https://${keyVaultName}.vault.azure.net/`;

    const secretClient = new SecretClient(keyVaultUrl, credential);

    // List secrets (as an example operation)
    const secrets = secretClient.listPropertiesOfSecrets();
    for await (let secret of secrets) {
      console.log(`Secret Name: ${secret.name}`);
    }

    console.log("Authenticated successfully using certificate!");
  } catch (err) {
    console.error("Error during authentication:", err.message);
  }
}

// Authenticate and perform actions
authenticateWithServicePrincipal();
