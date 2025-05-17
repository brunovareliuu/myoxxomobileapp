import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { globalStyles, colors } from '../../styles/globalStyles';

export default function HomeScreen() {
  const [tiendaInfo, setTiendaInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTiendaInfo = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          const db = getFirestore();
          // Primero obtenemos el documento del usuario para saber su tienda
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Asumiendo que el usuario tiene un campo con el código de tienda
            const tiendaDoc = await getDoc(doc(db, 'tiendas', userData.codigoTienda));
            
            if (tiendaDoc.exists()) {
              setTiendaInfo(tiendaDoc.data());
            }
          }
        }
      } catch (error) {
        console.error('Error al obtener información de la tienda:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTiendaInfo();
  }, []);

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