import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyADr1-p8l2kJfMGQiAjwYomxFoi4Ab_drI",
    authDomain: "kokoro-worksheet.firebaseapp.com",
    projectId: "kokoro-worksheet",
    storageBucket: "kokoro-worksheet.firebasestorage.app",
    messagingSenderId: "81421732991",
    appId: "1:81421732991:web:95193c6de9ad1f437e834a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
