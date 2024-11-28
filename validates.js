const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 9443;

// Function to load certificates dynamically
function loadCertificates() {
    const certDir = path.join(__dirname, 'certs'); // Directory where certificates are stored

    return {
        key: fs.readFileSync(path.join(certDir, 'server-key.pem')),
        cert: fs.readFileSync(path.join(certDir, 'server-crt.pem')),
        ca: fs.readFileSync(path.join(certDir, 'ca-crt.pem')),
    };
}

// Middleware to check client certificate
const clientAuthMiddleware = (req, res, next) => {
    if (!req.client.authorized) {
        return res.status(401).send('Invalid client certificate authentication.');
    }
    next();
};

// Middleware to parse JSON requests and enable CORS
app.use(express.json());
app.use(cors());

// Serve static HTML page for client interaction
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dynamic mTLS Example</title>
        </head>
        <body>
            <h1>Mutual TLS Communication</h1>
            <button onclick="getMessage()">Get Message from Server</button>
            <p id="message"></p>
            <script>
                async function getMessage() {
                    try {
                        const response = await fetch('/api/message', {
                            method: 'GET',
                            credentials: 'include',
                            headers: {
                                'Accept': 'application/json'
                            }
                        });
                        const data = await response.json();
                        document.getElementById('message').innerText = data.message;
                    } catch (error) {
                        console.error('Error fetching message:', error);
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// API endpoint to respond with a message
app.get('/api/message', clientAuthMiddleware, (req, res) => {
    res.json({ message: 'Hello! This message is from the server.' });
});

// Load certificates for mTLS
const options = loadCertificates();

// Start HTTPS server with mTLS configuration
https.createServer(options, app).listen(port, () => {
    console.log(`Server running at https://localhost:${port}`);
});