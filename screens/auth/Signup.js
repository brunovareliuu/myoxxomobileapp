import React, { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView, Image, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { globalStyles } from '../../styles/globalStyles';

export default function Signup({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [codigoTienda, setCodigoTienda] = useState('');

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword || !nombre || !codigoTienda) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    try {
      // 1. Verificar si la tienda existe
      const tiendaRef = doc(db, 'tiendas', codigoTienda);
      const tiendaSnap = await getDoc(tiendaRef);
      if (!tiendaSnap.exists()) {
        Alert.alert('Error', 'El código de tienda no existe');
        return;
      }
      const tiendaData = tiendaSnap.data();

      // 2. Crear usuario en Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 3. Guardar usuario en la colección global 'users'
      await setDoc(doc(db, 'users', uid), {
        email,
        nombre,
        codigoTienda,
        rol: 'empleado',
        uid,
        createdAt: new Date().toISOString(),
      });

      // 4. Guardar usuario en la subcolección 'users' de la tienda
      await setDoc(doc(db, 'tiendas', codigoTienda, 'users', uid), {
        email,
        nombre,
        codigoTienda,
        rol: 'empleado',
        uid,
        createdAt: new Date().toISOString(),
      });

      // 5. Navegar a HomeScreen y pasar el nombre de la tienda
      navigation.replace('Home', { tiendaNombre: tiendaData.nombre });
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar: ' + error.message);
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

            <Text style={globalStyles.title}>Crear Cuenta</Text>
            
            <TextInput
              style={globalStyles.input}
              placeholder="Nombre Completo"
              placeholderTextColor="#fff"
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="words"
            />

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
              placeholder="Código de Tienda"
              placeholderTextColor="#fff"
              value={codigoTienda}
              onChangeText={setCodigoTienda}
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

            <TextInput
              style={globalStyles.input}
              placeholder="Confirmar Contraseña"
              placeholderTextColor="#fff"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity 
              style={globalStyles.secondaryButton}
              onPress={handleSignup}
            >
              <Text style={globalStyles.secondaryButtonText}>Registrarse</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={globalStyles.linkText}>¿Ya tienes cuenta? Inicia Sesión</Text>
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
    width: 200,
    height: 200,
    transform: [{rotate: '-10deg'}],
  },
}); 