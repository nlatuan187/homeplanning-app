import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "AIzaSyD9RPlBqM0pblAIYxGfsv8tjb4fsfdeCSA",
    authDomain: "home-planning-app.firebaseapp.com",
    projectId: "home-planning-app",
    storageBucket: "home-planning-app.firebasestorage.app",
    messagingSenderId: "335227918815",
    appId: "1:335227918815:web:5a890241d4c367b3768c6a",
    measurementId: "G-CHR9VY7039"
  };

// Khởi tạo Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Lấy instance của Messaging, chỉ khi chạy trên trình duyệt
const messaging = async () => {
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
};

export { messaging };
