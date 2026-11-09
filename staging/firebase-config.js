// 測試站的 Firebase 設定：deploy-staging.sh 會用這個檔案取代 js/cloud.js 裡的 FIREBASE_CFG
// null＝測試站不連雲端（單機模式）。建好測試用 Firebase 專案後，把 Console「專案設定 → 你的應用程式 → SDK 設定」的 firebaseConfig 貼進來
// 不可以貼正式專案的設定（deploy-staging.sh 偵測到正式專案 ID 會停止）
const FIREBASE_CFG = null;
