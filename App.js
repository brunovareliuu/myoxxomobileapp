import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importar las pantallas
import Welcome from './screens/auth/Welcome';
import Login from './screens/auth/Login';
import Signup from './screens/auth/Signup';
import HomeScreen from './screens/main/HomeScreen';

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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Auth con persistencia
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Inicializar Firestore
const db = getFirestore(app);

const Stack = createNativeStackNavigator();

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  // Manejar cambios en el estado de autenticación
  function onAuthStateChanged(user) {
    setUser(user);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    const subscriber = auth.onAuthStateChanged(onAuthStateChanged);
    return subscriber; // unsubscribe on unmount
  }, []);

  if (initializing) {
    return null; // O un componente de carga si lo prefieres
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={user ? "Home" : "Welcome"}
        screenOptions={{
          headerShown: false,
        }}
      >
        {user ? (
          // Rutas autenticadas
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          // Rutas no autenticadas
          <>
            <Stack.Screen name="Welcome" component={Welcome} />
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Signup" component={Signup} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
