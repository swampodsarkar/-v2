const admin = require('firebase-admin');
const path = require('path');

let credential;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
} else {
  credential = admin.credential.cert(path.join(__dirname, 'voltefootball-firebase-adminsdk-fbsvc-21fc0b460f.json'));
}

admin.initializeApp({
  credential,
  databaseURL: 'https://voltefootball-default-rtdb.asia-southeast1.firebasedatabase.app',
});

const db = admin.database();

module.exports = { db, admin };
