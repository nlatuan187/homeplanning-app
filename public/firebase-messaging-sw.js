// Import và cấu hình Firebase
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

// Dán lại firebaseConfig của bạn ở đây
const firebaseConfig = {
    apiKey: "AIzaSyD9RPlBqM0pblAIYxGfsv8tjb4fsfdeCSA",
    authDomain: "home-planning-app.firebaseapp.com",
    projectId: "home-planning-app",
    storageBucket: "home-planning-app.firebasestorage.app",
    messagingSenderId: "335227918815",
    appId: "1:335227918815:web:5a890241d4c367b3768c6a",
    measurementId: "G-CHR9VY7039"
  };

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();
