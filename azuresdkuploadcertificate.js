const { ClientSecretCredential } = require('@azure/identity');
const axios = require('axios');

// Azure AD details
const tenantId = '<YOUR_TENANT_ID>';
const clientId = '<YOUR_CLIENT_ID>';
const clientSecret = '<YOUR_CLIENT_SECRET>';

// Certificate content
const certPem = fs.readFileSync('certificate.pem', 'utf8');
const privateKeyPem = fs.readFileSync('private_key.pem', 'utf8');

// Authenticate with Azure AD
const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

// Get an OAuth2 token from Azure AD
async function getAccessToken() {
  const tokenResponse = await credential.getToken('https://graph.microsoft.com/.default');
  return tokenResponse.token;
}

// Upload certificate to Azure AD
async function uploadCertificateToAzureAD() {
  const token = await getAccessToken();

  const certData = {
    "value": certPem,
    "startDateTime": new Date().toISOString(),
    "endDateTime": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
    "type": "AsymmetricX509Cert",
    "usage": "Sign",
    "keyId": "cert-key-id" // A unique key ID, you can generate one or just use a random string
  };

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const apiUrl = `https://graph.microsoft.com/v1.0/applications/${clientId}/certificates`;

  try {
    const response = await axios.post(apiUrl, certData, { headers });
    console.log('Certificate uploaded successfully:', response.data);
  } catch (error) {
    console.error('Error uploading certificate:', error.response ? error.response.data : error.message);
  }
}

uploadCertificateToAzureAD();
