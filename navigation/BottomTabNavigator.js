import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../styles/globalStyles';

// Importar las pantallas
import HomeScreen from '../screens/main/HomeScreen';
import ProductCaptureScreen from '../screens/main/ProductCaptureScreen';
import AlertScreen from '../screens/main/AlertScreen';

const Tab = createBottomTabNavigator();

const CameraButton = () => (
  <View style={styles.cameraButton}>
    <Icon name="add-a-photo" size={28} color={colors.white} />
  </View>
);

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.primary,
          borderTopWidth: 0,
          elevation: 10,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={28} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Camera"
        component={ProductCaptureScreen}
        options={{
          tabBarIcon: ({ focused }) => <CameraButton />,
          tabBarLabel: () => null,
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="error-outline" size={28} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  cameraButton: {
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
}); 