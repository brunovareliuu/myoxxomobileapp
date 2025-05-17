import React, { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView, Image, StyleSheet } from 'react-native';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { globalStyles } from '../../styles/globalStyles';

export default function Signup({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [codigoTienda, setCodigoTienda] = useState('');

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    try {
      // Verificar si existe la tienda
      const db = getFirestore();
      const tiendaRef = doc(db, 'tiendas', codigoTienda);
      const tiendaDoc = await getDoc(tiendaRef);

      if (!tiendaDoc.exists()) {
        Alert.alert('Error', 'El código de tienda no es válido');
        return;
      }

      // Crear usuario en Authentication
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Guardar información adicional en Firestore
      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, {
        email: email,
        nombre: nombre,
        rol: 'empleado',
        uid: userCredential.user.uid,
        createdAt: new Date().toISOString(),
      });

      Alert.alert('Éxito', 'Usuario registrado correctamente');
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Error', 'Error al registrarse: ' + error.message);
    }
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={globalStyles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={globalStyles.title}>Crear Cuenta</Text>
        
        <TextInput
          style={globalStyles.input}
          placeholder="Nombre Completo"
          placeholderTextColor="#666"
          value={nombre}
          onChangeText={setNombre}
          autoCapitalize="words"
        />

        <TextInput
          style={globalStyles.input}
          placeholder="Correo electrónico"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={globalStyles.input}
          placeholder="Código de Tienda"
          placeholderTextColor="#666"
          value={codigoTienda}
          onChangeText={setCodigoTienda}
          autoCapitalize="none"
        />

        <TextInput
          style={globalStyles.input}
          placeholder="Contraseña"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TextInput
          style={globalStyles.input}
          placeholder="Confirmar Contraseña"
          placeholderTextColor="#666"
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