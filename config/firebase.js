import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA2UPFXjD963tlAlcPB7gZyXAaRqZJWZaI",
  authDomain: "myoxxovision.firebaseapp.com",
  databaseURL: "https://myoxxovision-default-rtdb.firebaseio.com",
  projectId: "myoxxovision",
  storageBucket: "myoxxovision.firebasestorage.app",
  messagingSenderId: "491253915189",
  appId: "1:491253915189:web:45a8f84e556c93880c5b7c"
};

// Inicializar Firebase solo si no existe
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Inicializar Auth con persistencia solo si no existe (React Native)
let auth;
try {
  auth = getAuth(app);
  // Si no hay usuarios, puede lanzar error, por eso el try/catch
} catch (e) {
  auth = undefined;
}
if (!auth || !auth.currentUser) {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (e) {
    // Si ya está inicializado, solo obtenlo
    auth = getAuth(app);
  }
}

// Inicializar Firestore
const db = getFirestore(app);

// Exportar las instancias inicializadas
export { auth, db, app }; 