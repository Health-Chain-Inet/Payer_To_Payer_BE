require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const login = require('./models/login.model.js')
const bcrypt = require('bcrypt');

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

// main.use(session({
//     secret: 'your-secret-key',        // Secret key for signing the session ID cookie
//     resave: false,                    // Don't save session if not modified
//     saveUninitialized: true,          // Save a new session even if it hasn't been modified
//     cookie: {
//         secure: true,                // Set to true if using HTTPS
//         httpOnly: true,               // Helps prevent XSS attacks
//         maxAge: 24 * 60    // Session expiration (1 day)
//     }
// }));

// Middleware to check if user info exists in the session
// const checkUserSession = (req, res, next) => {
//     if (req.session && req.session.userName) {
//         // If user session exists, continue to the next middleware or route
//         return next();
//     } else {
//         // If no user session, send a response or redirect
//         return res.status(401).send('User not logged in');
//     }
// };

main.use('/directory', directoryRoutes);

main.use('/enroll', enrollmentRoutes);

main.use('/verify', activateRoutes);
// app.use('/discovery', discoveryRoutes);

main.post('/validatelogin', async (req, res) => {
    let username = req.body.username;
    let enteredPassword = req.body.password;
    console.log("body", req.body)

    let storedHashedPassword = await login.getUser(username);
    console.log('storedHashedPassword=',storedHashedPassword)
    if(storedHashedPassword.status != 200 ) {
      return res.status(500).json({status:500, message: 'Error checking password. Try again'})
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

// main.get('/*', (req, res) => {
//     res.send({
//       status_code: "404",
//       message: 'API Unavailable'
//     })
//     console.log("API Unavailable")
// })

// main.post('/*', (req, res) => {
//     res.send({
//         status_code: "404",
//         message: 'API Unavailable'
//     })
//     console.log("API Unavailable")
// })

// refreshCoverageRulesCache(); // refresh for the first time
// scheduleCronJob('0 */12 * * *', refreshCoverageRulesCache) // This will refresh cache every 12 hours


main.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
