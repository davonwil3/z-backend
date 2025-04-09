const admin = require("firebase-admin");
const serviceAccount = require("../keys/serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;