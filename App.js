import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Welcome from './screens/auth/Welcome';
import Login from './screens/auth/Login';
import Signup from './screens/auth/Signup';
import TaskDetailScreen from './screens/main/TaskDetailScreen';
import ProductCaptureScreen from './screens/main/ProductCaptureScreen';
import ResultsInformation from './screens/main/ResultsInformation';
import BottomTabNavigator from './navigation/BottomTabNavigator';
import CustomStatusBar from './components/CustomStatusBar';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <CustomStatusBar />
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Welcome"
          screenOptions={{
            headerShown: false,
            gestureEnabled: false
          }}
        >
          <Stack.Screen name="Welcome" component={Welcome} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Signup" component={Signup} />
          <Stack.Screen name="MainApp" component={BottomTabNavigator} />
          <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
          <Stack.Screen name="ProductCapture" component={ProductCaptureScreen} />
          <Stack.Screen name="ResultsInformation" component={ResultsInformation} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}