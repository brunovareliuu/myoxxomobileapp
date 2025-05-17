import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Importar las pantallas
import Welcome from './screens/auth/Welcome';
import Login from './screens/auth/Login';
import Signup from './screens/auth/Signup';
import HomeScreen from './screens/main/HomeScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Welcome" component={Welcome} />
        <Stack.Screen name="Login" component={Login} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Signup" component={Signup} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ gestureEnabled: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}