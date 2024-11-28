const express = require("express")



const router = express.Router()

const enrollmentController = require("../controllers/enrollment.controller")

router.post('/enroll', enrollmentController.enrollPayer)
router.post('/login', enrollmentController.validateLogin)

module.exports = router