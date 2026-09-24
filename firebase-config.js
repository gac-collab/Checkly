// 1. Go to https://console.firebase.google.com -> Add project (free "Spark" plan)
// 2. In the project, click the </> (web app) icon to register a web app
// 3. Copy the firebaseConfig object it gives you and paste it below, replacing this one
// 4. In the left menu go to Build > Firestore Database > Create database (start in test mode is fine for a trial)
// 5. See README.md in this folder for the security rules to paste in afterwards

const firebaseConfig = {
  apiKey: "AIzaSyBtMoJdLt0yv81oJnYenUjnKbZNilUOoKQ",
  authDomain: "gac-fleet-checklist.firebaseapp.com",
  projectId: "gac-fleet-checklist",
  storageBucket: "gac-fleet-checklist.firebasestorage.app",
  messagingSenderId: "722819244243",
  appId: "1:722819244243:web:f4deb94dcac22f82013426"
};


firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
