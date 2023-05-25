// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, onSnapshot, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator,httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyBmZ9uIrumrEgq758nTEjbd2Z9TLBA0fWI",
  authDomain: "unbias-gpt.firebaseapp.com",
  projectId: "unbias-gpt",
  storageBucket: "unbias-gpt.appspot.com",
  messagingSenderId: "1090856642534",
  appId: "1:1090856642534:web:9685e949b29b838f625827",
  measurementId: "G-FHX7F8QB9G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

//connect to local emulator
connectFunctionsEmulator(getFunctions(app, 'europe-west1'), 'localhost', 5001);
const func = getFunctions(app, 'europe-west1');

var subPagesList = ['homeSubPage', 'shopSubPage', 'historySubPage']
var currentPage = 'homeSubPage';

//AUTH STATE HANDLING
import {onAuthStateChanged} from 'firebase/auth'

var updateByLoginStatus = (user) => {
  if (user) {
    document.getElementById('loginPage').classList.add('w3-hide');
    document.getElementById('mainPage').classList.remove('w3-hide');
    currentPage = 'homeSubPage';
    subPagesList.forEach((page) => {
      document.getElementById(page).classList.add('w3-hide');
    });
    document.getElementById('homeSubPage').classList.remove('w3-hide');

    document.getElementById('username').innerHTML = user.email;

    var get_balance = httpsCallable(func, 'get_balance')
    get_balance().then((result) => {
      document.getElementById('currencyCount').innerHTML = result.data + ' credits';
    });
    

  } else {
    document.getElementById('loginPage').classList.remove('w3-hide');
    document.getElementById('mainPage').classList.add('w3-hide');
  }
}

onAuthStateChanged(auth, updateByLoginStatus);

updateByLoginStatus(auth.currentUser);

//LOGIN BUTTON
import {GoogleAuthProvider, signInWithPopup} from 'firebase/auth'

document.getElementById('loginButton').addEventListener('click', () => {
  //sign in with google
  signInWithPopup(auth, new GoogleAuthProvider());
});

//LOGOUT BUTTON
import {signOut} from 'firebase/auth'

document.getElementById('logoutButton').addEventListener('click', () => {
  signOut(auth);
});

//SUBPAGE BUTTONS
subPagesList.forEach((page) => {
  document.getElementById(page.replace('SubPage','') + 'Button').addEventListener('click', () => {
    subPagesList.forEach((page) => {
      document.getElementById(page).classList.add('w3-hide');
    });
    document.getElementById(page).classList.remove('w3-hide');
    currentPage = page;
  });
});

//HOMEPAGE BEHAVIOR
var promptCountTimer;
document.getElementById('homeInput').addEventListener('input', () => {
  document.getElementById('tokenField').innerHTML = 'Typing...';

  clearTimeout(promptCountTimer);
  promptCountTimer = setTimeout(() => {
    var input = document.getElementById('homeInput').value;
    var countTokens = httpsCallable(func, 'count_tokens');
    countTokens({text: input}).then((result) => {
      document.getElementById('tokenField').innerHTML = result.data + ' tokens';
    });
  }, 100);

});


var busy = false;
//submit button behavior
document.getElementById('homeSubmit').addEventListener('click', () => {
  if (busy) {
    return;
  }
  var input = document.getElementById('homeInput').value;
  var generatePrompt = httpsCallable(func, 'eval_text');
  document.getElementById('homeResult').innerHTML = 'Generating...';
  busy = true;
  generatePrompt({text: input}).then((result) => {
    var restext;
    if (result.data == 0) {
      restext = "This looks like a left-leaning prompt."
    } else if (result.data == 1) {
      restext = "This looks like a centrist prompt."
    } else if (result.data == 2) {
      restext = "This looks like a right-leaning prompt."
    } else {
      restext = "Error: " + result.data;
    }
    busy = false;
    document.getElementById('homeResult').innerHTML = restext;
  });

  var get_balance = httpsCallable(func, 'get_balance')
  get_balance().then((result) => {
    document.getElementById('currencyCount').innerHTML = result.data + ' credits';
  });
});


//debugAddTokens
document.getElementById('debugAddTokens').addEventListener('click', () => {
  var addTokens = httpsCallable(func, 'debug_add_tokens');
  addTokens({tokens: 1000}).then((result) => {
    console.log(result.data);
  });

  var get_balance = httpsCallable(func, 'get_balance')
  get_balance().then((result) => {
    document.getElementById('currencyCount').innerHTML = result.data + ' credits';
  });
});

//shop stuff
//call the cloud function to get the stealth address, convert it to a QR code (qrcode npm package) and display it
document.getElementById('shopButton').addEventListener('click', () => {
  console.log('shop button clicked')
  var getStealthKey = httpsCallable(func, 'get_stealth_key');
  getStealthKey().then((result) => {
    var qrcode = require('qrcode');
    console.log(result)
    qrcode.toCanvas(document.getElementById('qrCanvas'), result.data.result, function (error) {
      if (error) console.error(error)
    })
    document.getElementById('moneroAddress').innerHTML = result.data.result;
  });
});


document.getElementById('historyButton').addEventListener('click', () => {
  var historyContainer = document.getElementById('historySubPage');
  historyContainer.innerHTML = '';

  var currentUserID = auth.currentUser.uid;

  const q = query(collection(db, 'userTexts'), where('userID', '==', currentUserID));

  onSnapshot(q, (snapshot) => {
    snapshot.docs.forEach(doc => {
      var data = doc.data();
      var historyEntry = document.createElement('div');
      historyEntry.className = "w3-panel w3-card";
      var userText = document.createElement('p');
      userText.className = "w3-text-teal";
      userText.textContent = 'User: ' + data.text;
      var responseText = document.createElement('p');
      responseText.className = "w3-text-grey";
      responseText.textContent = 'Response: ' + data.response;
      var timestampText = document.createElement('p');
      timestampText.className = "w3-text-grey w3-small";
      var timestampDate = new Date(data.timestamp.toMillis());
      timestampText.textContent = 'Time: ' + timestampDate.toLocaleString();
      historyEntry.appendChild(userText);
      historyEntry.appendChild(responseText);
      historyEntry.appendChild(timestampText);
      historyContainer.appendChild(historyEntry);
    });
  });
});


