const express = require("express")

const directoryController = require("../controllers/directory.controller")
//const authMiddleware = require("../middleware/authMiddleware")


const router = express.Router()

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



// router.post('/upload', directoryController.uploadCertificate)
// router.post('/create', directoryController.createCertificate)


module.exports = router