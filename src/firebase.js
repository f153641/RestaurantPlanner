// 1. 引入我們需要的部門：App 初始化與 Firestore 資料庫
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // 👈 換成資料庫部門

// 2. 這是妳最棒的專屬鑰匙卡（完全不用改）
const firebaseConfig = {
  apiKey: "AIzaSyBUHeWEb_pm2evbSoj_Caliv5mMbQuUQVk",
  authDomain: "restaurantplanner-957e8.firebaseapp.com",
  projectId: "restaurantplanner-957e8",
  storageBucket: "restaurantplanner-957e8.firebasestorage.app",
  messagingSenderId: "292601750958",
  appId: "1:292601750958:web:a7d4ff484a3b08ccee943f",
  measurementId: "G-KDLHNEPV18"
};

// 3. 啟動 Firebase 引擎
const app = initializeApp(firebaseConfig);

// 4. ⚡ 建立並導出資料庫連線（讓 RestaurantView.vue 可以順利抓到 db）
export const db = getFirestore(app);