const session = require('express-session');




exports.authorize = (req, res,next) => {

    if (!req.session.userName && !req.session.isAuthenticated) {
        return res.json({ status:401, message: 'Unauthorized' });
    } 
    next()
}


