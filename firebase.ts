
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// PEGA AQUÍ TUS CREDENCIALES DE FIREBASE DESDE TU CONSOLA
const firebaseConfig = {
  apiKey: "AIzaSyDAXt0hAv2iPrd5eIN7vCufFZJNS-p1KkQ",
  authDomain: "losfrailesoficial.firebaseapp.com",
  projectId: "losfrailesoficial",
  storageBucket: "losfrailesoficial.firebasestorage.app",
  messagingSenderId: "794450761302",
  appId: "1:794450761302:web:e0e493d4aab10ea4e94df7"
};

let app;
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (error) {
  console.error("Error inicializando Firebase:", error);
}

const db = getFirestore(app);
const storage = getStorage(app);

if (typeof window !== 'undefined' && db) {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Persistencia falló: múltiples pestañas abiertas.');
    } else if (err.code === 'unimplemented') {
      console.warn('El navegador no soporta persistencia offline.');
    }
  });
}

export { db, storage };
