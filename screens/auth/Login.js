import React, { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView, Image, StyleSheet } from 'react-native';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { globalStyles } from '../../styles/globalStyles';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      navigation.replace('Home');
    } catch (error) {
      Alert.alert('Error', 'Error al iniciar sesión: ' + error.message);
    }
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={globalStyles.content}>
        <View style={globalStyles.compactLogoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={globalStyles.compactLogo}
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