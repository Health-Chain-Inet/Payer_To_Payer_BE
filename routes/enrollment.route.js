const express = require("express")



const router = express.Router()

const enrollmentController = require("../controllers/enrollment.controller")

router.post('/enroll', enrollmentController.enrollPayer)
router.post('/login', enrollmentController.validateLogin)
router.post('/payerendpoints', enrollmentController.payerEndpoints)
router.get('/allpayers', enrollmentController.allPayers)
router.get('/alladmins', enrollmentController.allAdmins)


module.exports = router