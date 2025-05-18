import React, { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView, Image, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, query, collection, where, getDocs, getDoc, writeBatch } from 'firebase/firestore';
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
      // Limpiar y normalizar el código de tienda
      const codigoTiendaLimpio = codigoTienda.trim().toUpperCase();

      // Buscar la tienda por el código
      const tiendasRef = collection(db, 'tiendas');
      const q = query(tiendasRef, where('codigoTienda', '==', codigoTiendaLimpio));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert('Error', `El código de tienda "${codigoTiendaLimpio}" no existe`);
        return;
      }

      // Obtener datos de la tienda
      const tiendaDoc = querySnapshot.docs[0];
      const tiendaData = tiendaDoc.data();
      const tiendaId = tiendaDoc.id;

      // Crear usuario en Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Datos del usuario
      const userData = {
        email,
        nombre,
        codigoTienda: codigoTiendaLimpio,
        tiendaNombre: tiendaData.nombre,
        rol: 'empleado',
        uid,
        activo: true,
        permisos: {
          lectura: true,
          escritura: true,
          acceso_tienda: true
        },
        createdAt: new Date().toISOString()
      };

      // Crear documentos en Firestore
      const batch = writeBatch(db);

      // Documento en users
      const userRef = doc(db, 'users', uid);
      batch.set(userRef, userData);

      // Documento en empleados
      const empleadoRef = doc(db, 'empleados', uid);
      batch.set(empleadoRef, {
        ...userData,
        tiendaId,
        status: 'activo'
      });

      // Documentos en la tienda
      const tiendaUserRef = doc(db, 'tiendas', tiendaId, 'users', uid);
      batch.set(tiendaUserRef, userData);

      const tiendaEmpleadoRef = doc(db, 'tiendas', tiendaId, 'empleados', uid);
      batch.set(tiendaEmpleadoRef, {
        ...userData,
        tiendaId,
        permisos: {
          ...userData.permisos,
          acceso_inventario: true,
          acceso_tareas: true
        }
      });

      // Ejecutar todas las escrituras en una transacción
      await batch.commit();

      // Navegar a MainApp
      navigation.replace('MainApp');
    } catch (error) {
      console.error('Error de registro:', error);
      let mensajeError = 'No se pudo registrar el usuario';
      
      if (error.code === 'auth/email-already-in-use') {
        mensajeError = 'Este correo electrónico ya está registrado';
      } else if (error.code === 'auth/invalid-email') {
        mensajeError = 'El correo electrónico no es válido';
      } else if (error.code === 'auth/weak-password') {
        mensajeError = 'La contraseña es demasiado débil';
      } else if (error.code === 'permission-denied') {
        mensajeError = 'No tienes permisos para realizar esta acción';
      }
      
      Alert.alert('Error', mensajeError);

      // Si falló después de crear el usuario en Auth, intentar limpiarlo
      if (auth.currentUser) {
        try {
          await auth.currentUser.delete();
        } catch (deleteError) {
          console.error('Error al limpiar usuario:', deleteError);
        }
      }
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
                style={globalStyles.compactLogo}
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