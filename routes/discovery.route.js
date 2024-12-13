const express = require("express")

const discoveryController = require("../controllers/discovery.controller")


const router = express.Router()

router.get('/nconnectpayer', discoveryController.payerConnectNewPayer)
router.get('/oconnectpayer', discoveryController.payerConnectOldPayer)
router.get('/pendingapprovals', discoveryController.payerApprovalConns)



module.exports = router