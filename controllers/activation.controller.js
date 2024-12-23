const activate = require('../models/activate.model.js')


exports.activation = async(req, res,next) => {
    let key = req.query.key
    let actId = req.query.actId
    let activation = await activate.activate(actId,key)
    console.log('activation=',activation)
    if(activation == 1) {
        return res.status(200).json({
            success: true,
            message: "Payers activated",
            data: "Payer Activated",
          });
    } else {
        return res.status(403).json({
            success: true,
            message: "Payers is not activated",
            data: "Payer is not ctivated",
        });
   
    }



}