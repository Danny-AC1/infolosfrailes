
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * REEMPLAZA LOS VALORES ABAJO CON TU CONFIGURACIÓN DE FIREBASE:
 * 1. Ve a la Consola de Firebase -> Configuración del proyecto.
 * 2. En 'Tus aplicaciones', busca el objeto 'firebaseConfig'.
 * 3. Copia y pega los valores aquí.
 */
const firebaseConfig = {
  apiKey: "AIzaSyDAXt0hAv2iPrd5eIN7vCufFZJNS-p1KkQ",
  authDomain: "losfrailesoficial.firebaseapp.com",
  projectId: "losfrailesoficial",
  storageBucket: "losfrailesoficial.firebasestorage.app",
  messagingSenderId: "794450761302",
  appId: "1:794450761302:web:e0e493d4aab10ea4e94df7"
};

// Mantenemos esta línea para asegurar que Gemini siga funcionando con la API KEY del sistema
const finalConfig = {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey === "TU_API_KEY" ? (process.env.FIREBASE_API_KEY || process.env.API_KEY) : firebaseConfig.apiKey
};

const app = initializeApp(finalConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Persistencia offline para que la guía funcione sin internet
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firebase: Múltiples pestañas abiertas, persistencia deshabilitada.');
    } else if (err.code === 'unimplemented') {
      console.warn('Firebase: El navegador no soporta persistencia.');
    }
  });
}

export { db, storage };
