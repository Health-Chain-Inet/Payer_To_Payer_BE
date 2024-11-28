const express = require("express")

const activationController = require("../controllers/activation.controller")



const router = express.Router()

//router.get('/', directoryController.startPage)  // Login and registration
router.get('/verify', activationController.activation)

// router.post('/upload', directoryController.uploadCertificate)
// router.post('/create', directoryController.createCertificate)


module.exports = router