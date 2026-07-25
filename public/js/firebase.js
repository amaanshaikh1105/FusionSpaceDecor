// Firebase project connection — shared by every page that needs data.
// These values are safe to be public: the Firebase web config identifies the project,
// it does not grant access. Access control lives in firestore.rules / storage.rules.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAn3GArgo1CcIsTlOK-jUkDbpwsHJa-hsQ",
  authDomain: "fusion-space-decor.firebaseapp.com",
  projectId: "fusion-space-decor",
  storageBucket: "fusion-space-decor.firebasestorage.app",
  messagingSenderId: "406742739386",
  appId: "1:406742739386:web:2184c78b20cd5e23209583"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
