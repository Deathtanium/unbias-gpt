// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore';
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
const func = getFunctions(app, 'europe-west1');

var subPagesList = ['homeSubPage', 'shopSubPage']
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