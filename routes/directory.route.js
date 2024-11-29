const express = require("express")

const directoryController = require("../controllers/directory.controller")
//const authMiddleware = require("../middleware/authMiddleware")


const router = express.Router()

//router.get('/', directoryController.startPage)  // Login and registration
router.get('/fetchPayers', directoryController.fetchPayers)
router.get('/fetchAllPayers', directoryController.fetchAllPayers)
router.post('/uploadCertificate',   directoryController.uploadCertificate)
router.post('/fetchPayerByEmail',   directoryController.fetchSinglePayerByEmail)



// router.post('/upload', directoryController.uploadCertificate)
// router.post('/create', directoryController.createCertificate)


module.exports = router