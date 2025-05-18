import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  StatusBar,
  FlatList,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { auth, db } from '../../config/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../styles/globalStyles';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [tareasCompletadas, setTareasCompletadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (userId) {
        // Obtener datos del usuario
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUserData(userDoc.data());

          // Obtener tareas completadas
          const tiendasRef = collection(db, 'tiendas');
          const tiendaQuery = query(tiendasRef, where('codigoTienda', '==', userDoc.data().codigoTienda));
          const tiendaSnapshot = await getDocs(tiendaQuery);

          if (!tiendaSnapshot.empty) {
            const tiendaDoc = tiendaSnapshot.docs[0];
            const tareasRef = collection(db, 'tiendas', tiendaDoc.id, 'tareas');
            const tareasQuery = query(
              tareasRef,
              where('completada', '==', true)
            );
            const tareasSnapshot = await getDocs(tareasQuery);
            
            const tareasData = tareasSnapshot.docs
              .map(doc => ({
                id: doc.id,
                tiendaId: tiendaDoc.id,
                ...doc.data()
              }))
              .sort((a, b) => new Date(b.fechaCompletado) - new Date(a.fechaCompletado));
            
            setTareasCompletadas(tareasData);
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigation.replace('Welcome');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const renderTareaItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.tareaCard}
      onPress={() => navigation.navigate('ResultsInformation', {
        taskId: item.id,
        tiendaId: item.tiendaId
      })}
    >
      <View style={styles.tareaHeader}>
        <Text style={styles.tareaTitulo}>{item.titulo}</Text>
        <Text style={styles.tareaFecha}>
          {new Date(item.fechaCompletado).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.tareaDescripcion} numberOfLines={2}>
        {item.descripcion}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>

      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <Icon name="account-circle" size={100} color={colors.primary} />
              </View>
              <Text style={styles.userName}>{userData?.nombre || 'Usuario'}</Text>
              <Text style={styles.userEmail}>{userData?.email || ''}</Text>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Icon name="store" size={24} color={colors.primary} />
                <Text style={styles.infoText}>Tienda: {userData?.codigoTienda || ''}</Text>
              </View>
              <View style={styles.infoItem}>
                <Icon name="badge" size={24} color={colors.primary} />
                <Text style={styles.infoText}>Rol: {userData?.rol || ''}</Text>
              </View>
              <View style={styles.infoItem}>
                <Icon name="assignment-turned-in" size={24} color={colors.primary} />
                <Text style={styles.infoText}>Tareas completadas: {tareasCompletadas.length}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Historial de Tareas</Text>
          </>
        }
        data={tareasCompletadas}
        renderItem={renderTareaItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay tareas completadas</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={24} color={colors.white} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={styles.flatListContent}
      />
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
    backgroundColor: colors.primary,
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  flatListContent: {
    flexGrow: 1,
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    marginBottom: 15,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: colors.textLight,
  },
  infoSection: {
    padding: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    padding: 20,
    paddingBottom: 10,
  },
  tareaCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tareaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tareaTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  tareaFecha: {
    fontSize: 12,
    color: colors.textLight,
  },
  tareaDescripcion: {
    fontSize: 14,
    color: colors.textLight,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textLight,
  },
  logoutButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    margin: 20,
    borderRadius: 10,
  },
  logoutText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
}); 