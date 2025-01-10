const express = require("express")

const directoryController = require("../controllers/directory.controller")
//const authMiddleware = require("../middleware/authMiddleware")
const certificateController = require("../controllers/certificate.controller")

const router = express.Router()

// Middleware to verify registration access token
const verifyRegistrationToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Registration access token required'
      });
    }
    // Implement your token verification logic here
    next();
  };

//router.get('/', directoryController.startPage)  // Login and registration
router.get('/fetchPayers', directoryController.fetchPayers)
router.get('/fetchAllPayers', directoryController.fetchAllPayers)
router.post('/uploadCertificate',   directoryController.uploadCertificate)
router.post('/fetchPayerByEmail',   directoryController.fetchSinglePayerByEmail)
router.post('/fetchcertificatedetails', directoryController.fetchCertificateDetails)
router.post('/generatecertificate', directoryController.createCertificate)
router.post('/downloadcertificate', directoryController.downloadCertificate)
router.get('/validateclient', directoryController.validateClientCertificate)
router.get('/validateserver', directoryController.validateServerCertificate)


router.post('/clientCertificate', certificateController.createClientCertificate);
router.post('/serverCertificate', certificateController.createServerCertificate);
router.get('/downloadIntermediate', certificateController.downloadIntermediate);
router.get('/downloadClientCert', certificateController.downloadClientCertificate);
router.get('/downloadServerCert', certificateController.downloadClientCertificate);
router.get('/register:clientId', verifyRegistrationToken, certificateController.register);



// router.post('/upload', directoryController.uploadCertificate)
// router.post('/create', directoryController.createCertificate)


module.exports = router