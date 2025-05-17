import React from 'react';
import { Text, View, Image, TouchableOpacity, SafeAreaView, StyleSheet } from 'react-native';
import { globalStyles, colors } from '../../styles/globalStyles';

export default function Welcome({ navigation }) {
  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={globalStyles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={globalStyles.title}>Empieza tu Optimización</Text>
          <Text style={globalStyles.subtitle}>Entra a una tienda o inicia sesión</Text>
        </View>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={globalStyles.primaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={globalStyles.primaryButtonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={globalStyles.secondaryButton}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={globalStyles.secondaryButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 325,
    height: 325,
    marginBottom: 20,
    transform: 'rotate(-10deg)',
  },
  buttonsContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
}); 