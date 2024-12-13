require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const login = require('./models/login.model.js')
const bcrypt = require('bcrypt');

// const multer = require('multer');
// const fs = require('fs');
// const path = require('path');

//const forge = require('node-forge');


  
const directoryRoutes = require('./routes/directory.route.js');
const discoveryRoutes = require('./routes/discovery.route.js');
const activateRoutes = require('./routes/activation.route.js');
const enrollmentRoutes = require('./routes/enrollment.route.js')
const authMiddleware = require("./middleware/authMiddleware")
//const { scheduleCronJob } = require("./config/cron.job.utility.js")

const main = express();
main.use(cors('*'));
main.use(express.urlencoded({ extended: true }));
main.use(express.json());
main.use(express.text());


const PORT = process.env.PORT || 3001


main.use('/directory', directoryRoutes);
main.use('/certificate', directoryRoutes);
main.use('/enroll', enrollmentRoutes);
main.use('/verify', activateRoutes);
main.use('/discovery', discoveryRoutes);

main.post('/validatelogin', async (req, res) => {
    let username = req.body.username;
    let enteredPassword = req.body.password;
    console.log("body", req.body)

    let storedHashedPassword = await login.getUser(username);
    console.log('storedHashedPassword=',storedHashedPassword)
    if(storedHashedPassword.status != 200 ) {
      return res.status(500).json({status:404, message: 'Incorrect User or password'})
    } else if(storedHashedPassword.msg.active == false) {
      return res.status(500).json({status:500, message: 'account not yet active'})
    }
    // Compare the entered password with the stored hash
    bcrypt.compare(enteredPassword, storedHashedPassword.msg.adm_password, (err, result) => {
        if (err) {
            console.error('Error comparing password', err);
            return res.status(401).json({ status: 401, message: 'UnAuthorized' })
        }

        if (result) {
            // Password matches
            //   req.session.userName = username
            //   req.session.isAuthenticated = true
            return res.status(200).json({ status: 200, message: storedHashedPassword.msg })
        } else {
            // Password does not match
            return res.status(401).json({ status: 401, message: 'Invalid User/Password' })
        }
    });
});


// --- Server availability check ---
main.get('/', (req, res) => {
    res.status(200).send({ statusCode: 200, message: "Server Running" });
});

// --- Error Handling Middleware ---
main.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send({ statusCode: 500, message: 'Internal server error!' });
});




main.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
