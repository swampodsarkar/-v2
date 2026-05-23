const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = path.join(__dirname, 'voltefootball-firebase-adminsdk-fbsvc-21fc0b460f.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://voltefootball-default-rtdb.asia-southeast1.firebasedatabase.app',
});

const db = admin.database();

module.exports = { db, admin };
