import React from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';
import { globalStyles, colors } from '../../styles/globalStyles';

export default function HomeScreen({ route }) {
  // Recibe el nombre de la tienda por params
  const tiendaNombre = route?.params?.tiendaNombre || 'Tienda';
  const tiendaCiudad = 'Ciudad de Ejemplo'; // Puedes cambiar esto si tienes la ciudad

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={globalStyles.content}>
        <View style={styles.infoContainer}>
          <Text style={styles.welcomeText}>Bienvenido a</Text>
          <Text style={styles.storeName}>OXXO {tiendaNombre}</Text>
          <Text style={styles.locationText}>{tiendaCiudad}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.white,
  },
  welcomeText: {
    color: colors.secondary,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
  storeName: {
    color: colors.white,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  locationText: {
    color: colors.white,
    fontSize: 20,
    textAlign: 'center',
    opacity: 0.9,
  },
}); 