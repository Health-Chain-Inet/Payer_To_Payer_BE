const verifier = require('email-verifier');

// Create an instance of the verifier
const emailVerifier = new verifier.EmailVerifier();

function checkIfEmailExists(email) {
    emailVerifier.verify(email, function(error, info) {
        if (error) {
            console.log('Error during verification:', error);
        } else {
            console.log('Verification info:', info);
            if (info.success) {
                console.log(`The email address ${email} exists.`);
            } else {
                console.log(`The email address ${email} does not exist or is invalid.`);
            }
        }
    });
}

const email = 'example@example.com';
checkIfEmailExists(email);
