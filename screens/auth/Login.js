import React, { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView, Image, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { globalStyles } from '../../styles/globalStyles';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      // Intentar iniciar sesión con Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);
      // Si la autenticación es exitosa, navegar a MainApp
      navigation.replace('MainApp');
    } catch (error) {
      console.error('Error de inicio de sesión:', error);
      Alert.alert('Error', 'Credenciales inválidas');
    }
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={globalStyles.content}>
            <View style={globalStyles.compactLogoContainer}>
              <Image
                source={require('../../assets/logo.png')}
                style={globalStyles.largeLogo}
                resizeMode="contain"
              />
            </View>

            <Text style={globalStyles.title}>Iniciar Sesión</Text>
            
            <TextInput
              style={globalStyles.input}
              placeholder="Correo electrónico"
              placeholderTextColor="#fff"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={globalStyles.input}
              placeholder="Contraseña"
              placeholderTextColor="#fff"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity 
              style={globalStyles.secondaryButton}
              onPress={handleLogin}
            >
              <Text style={globalStyles.secondaryButtonText}>Iniciar Sesión</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('Signup')}
            >
              <Text style={globalStyles.linkText}>¿No tienes cuenta? Regístrate</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 400,
    height: 400,
    transform: [{rotate: '-10deg'}],
  },
}); 