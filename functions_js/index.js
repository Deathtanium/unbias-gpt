/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onCall} = require("firebase-functions/v2/https");
const monerojs = require("monero-javascript");
const admin = require("firebase-admin");
const functions = require("firebase-functions");
admin.initializeApp();
const db = admin.firestore();


exports.get_stealth_key = onCall({maxInstances:10,region:'europe-west1'}, async (request) => {
  const wallet = await monerojs.connectToWalletRpc('http://130.61.138.150:18083', 'monero', 'serban01')
  const subaddress = await wallet.createSubaddress()
  console.log(subaddress.state.address);
  
  let doc = db.collection('pending_payments').doc(request.auth.token.email)
  
  if (doc.exists) {
    doc.update({
      subaddress: subaddress.state.address,
    });
  }
  else {
    doc.set({
      subaddress: subaddress.state.address,
    });
  }
  return {result: subaddress.state.address};
});
