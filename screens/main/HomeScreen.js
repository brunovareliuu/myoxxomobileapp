import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  StyleSheet, 
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  FlatList
} from 'react-native';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../styles/globalStyles';

export default function HomeScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error('No hay usuario autenticado');
        navigation.replace('Login');
        return;
      }

      // Obtener datos del usuario
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setUserData(userData);

        // Buscar la tienda usando el código de tienda del usuario
        const tiendasRef = collection(db, 'tiendas');
        const q = query(tiendasRef, where('codigoTienda', '==', userData.codigoTienda));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const tiendaDoc = querySnapshot.docs[0];
          
          // Obtener solicitudes activas
          const solicitudesRef = collection(db, 'tiendas', tiendaDoc.id, 'solicitudes');
          const solicitudesSnapshot = await getDocs(solicitudesRef);
          
          const solicitudesActivas = solicitudesSnapshot.docs
            .map(doc => ({
              id: doc.id,
              tiendaId: tiendaDoc.id,
              ...doc.data()
            }))
            .filter(solicitud => !solicitud.completada)
            .sort((a, b) => new Date(a.fechaLimite) - new Date(b.fechaLimite));
          
          setSolicitudes(solicitudesActivas);
        }
      } else {
        console.error('No se encontraron datos del usuario');
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderSolicitudItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.solicitudCard}
      onPress={() => navigation.navigate('TaskDetail', { 
        solicitudId: item.id,
        tiendaId: item.tiendaId 
      })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.titulo}>{item.titulo}</Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.warning }]}>
          <Text style={styles.statusText}>PENDIENTE</Text>
        </View>
      </View>

      <Text style={styles.descripcion} numberOfLines={2}>
        {item.descripcion}
      </Text>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Icon name="event" size={16} color={colors.textLight} />
          <Text style={styles.infoText}>
            Límite: {new Date(item.fechaLimite).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="store" size={16} color={colors.textLight} />
          <Text style={styles.infoText}>
            Planograma: {item.planogramaNombre}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="person" size={16} color={colors.textLight} />
          <Text style={styles.infoText}>
            Creada por: {item.creadaPor}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor={colors.primary} barStyle="light-content" translucent={false} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" translucent={false} />
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bienvenido,</Text>
          <Text style={styles.userName}>{userData?.nombre || 'Usuario'}</Text>
          <Text style={styles.storeName}>{userData?.tiendaNombre || 'Tienda'}</Text>
        </View>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Solicitudes Pendientes</Text>
        <FlatList
          data={solicitudes}
          renderItem={renderSolicitudItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.solicitudesList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="assignment" size={64} color={colors.textLight} />
              <Text style={styles.emptyText}>No hay solicitudes pendientes</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  greeting: {
    fontSize: 24,
    color: colors.white,
  },
  userName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 5,
  },
  storeName: {
    fontSize: 18,
    color: colors.secondary,
    fontWeight: '800',
  },
  logo: {
    width: 120,
    height: 120,
    transform: [{ rotate: '10deg' }],
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 15,
  },
  solicitudesList: {
    paddingBottom: 20,
  },
  solicitudCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  descripcion: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 10,
  },
  infoContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: colors.textLight,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textLight,
    marginTop: 10,
  },
});