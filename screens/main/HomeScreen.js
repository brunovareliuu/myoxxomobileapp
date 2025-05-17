import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet, TouchableOpacity } from 'react-native';
import { globalStyles, colors } from '../../styles/globalStyles';

export default function HomeScreen({ navigation }) {
  // Datos de ejemplo para la tienda
  const [tiendaInfo, setTiendaInfo] = useState({
    nombre: 'DEMO',
    ciudad: 'Ciudad de Ejemplo',
  });
  const [loading, setLoading] = useState(false);

  // Ya no se usa useEffect ni fetchTiendaInfo

  if (loading) {
    return (
      <SafeAreaView style={globalStyles.container}>
        <View style={globalStyles.content}>
          <Text style={globalStyles.title}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={globalStyles.content}>
        <View style={styles.infoContainer}>
          <Text style={styles.welcomeText}>Bienvenido a</Text>
          <Text style={styles.storeName}>OXXO {tiendaInfo?.nombre || 'Tienda'}</Text>
          <Text style={styles.locationText}>{tiendaInfo?.ciudad || 'Ciudad'}</Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={globalStyles.secondaryButton}
            onPress={() => navigation.navigate('ProductCapture')}
          >
            <Text style={globalStyles.secondaryButtonText}>Capturar Productos</Text>
          </TouchableOpacity>
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
    marginBottom: 30,
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
  buttonsContainer: {
    width: '100%',
  },
}); 