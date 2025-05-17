import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { globalStyles, colors } from '../../styles/globalStyles';

export default function Welcome({ navigation }) {
  return (
    <SafeAreaView style={[globalStyles.container, styles.container]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={globalStyles.largeLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.welcomeTextContainer}>
          <Text style={styles.title}>¡Bienvenido!</Text>
          <Text style={styles.subtitle}>Captura y gestiona tu inventario de manera eficiente</Text>
        </View>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={[globalStyles.secondaryButton, styles.button]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={globalStyles.secondaryButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[globalStyles.primaryButton, styles.button]}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={globalStyles.primaryButtonText}>Crear Cuenta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTextContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.8,
  },
  buttonsContainer: {
    gap: 15,
  },
  button: {
    marginVertical: 5,
  },
}); 