jsimport { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey:            "AIzaSyCkV_2tbQyLj1KO3R5NGdEHdq1ntDh1f_c",
  authDomain:        "moneynmemo.firebaseapp.com",
  databaseURL:       "https://moneynmemo-default-rtdb.asia-southeast1.firebasedatabase.app
",
  projectId:         "moneynmemo",
  storageBucket:     "moneynmemo.firebasestorage.app",
  messagingSenderId: "320519694272",
  appId:             "1:320519694272:web:6a3f6d0670fd9a2cce8a25",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);