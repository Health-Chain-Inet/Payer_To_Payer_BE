const express = require("express")



const router = express.Router()

const enrollmentController = require("../controllers/enrollment.controller")

router.post('/enroll', enrollmentController.enrollPayer)
router.post('/login', enrollmentController.validateLogin)
router.post('/payerendpoints', enrollmentController.endpointIngestion)
router.get('/allpayers', enrollmentController.allPayers)
router.get('/alladmins', enrollmentController.allAdmins)
router.get('/endpoint', enrollmentController.endpoints)


module.exports = router