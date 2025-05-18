import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  StyleSheet, 
  StatusBar,
  TouchableOpacity,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../styles/globalStyles';

export default function TaskManagerScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('activas');
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSolicitudes();
  }, [activeTab]);

  const loadSolicitudes = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Obtener la tienda del usuario
      const userDoc = await getDocs(query(
        collection(db, 'users'),
        where('uid', '==', userId)
      ));
      
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        const tiendaQuery = query(
          collection(db, 'tiendas'),
          where('codigoTienda', '==', userData.codigoTienda)
        );
        const tiendaSnapshot = await getDocs(tiendaQuery);

        if (!tiendaSnapshot.empty) {
          const tiendaDoc = tiendaSnapshot.docs[0];
          const solicitudesRef = collection(db, 'tiendas', tiendaDoc.id, 'solicitudes');
          
          // Obtener todas las solicitudes y filtrar en el cliente
          const solicitudesSnapshot = await getDocs(solicitudesRef);
          const todasLasSolicitudes = solicitudesSnapshot.docs.map(doc => ({
            id: doc.id,
            tiendaId: tiendaDoc.id,
            ...doc.data()
          }));

          // Filtrar y ordenar según la pestaña activa
          const solicitudesFiltradas = todasLasSolicitudes
            .filter(solicitud => activeTab === 'completadas' ? solicitud.completada : !solicitud.completada)
            .sort((a, b) => {
              if (activeTab === 'completadas') {
                return new Date(b.fechaCompletado || 0) - new Date(a.fechaCompletado || 0);
              }
              return new Date(a.fechaLimite) - new Date(b.fechaLimite);
            });
          
          setSolicitudes(solicitudesFiltradas);
        }
      }
    } catch (error) {
      console.error('Error al cargar solicitudes:', error);
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
        <View style={[styles.statusBadge, { backgroundColor: item.completada ? colors.success : colors.warning }]}>
          <Text style={styles.statusText}>
            {item.completada ? 'COMPLETADO' : 'PENDIENTE'}
          </Text>
        </View>
      </View>

      <Text style={styles.descripcion} numberOfLines={2}>
        {item.descripcion}
      </Text>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Icon name="event" size={16} color={colors.textLight} />
          <Text style={styles.infoText}>
            {item.completada ? 
              `Completada: ${new Date(item.fechaCompletado).toLocaleDateString()}` : 
              `Límite: ${new Date(item.fechaLimite).toLocaleDateString()}`}
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestor de Solicitudes</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'activas' && styles.activeTab]}
          onPress={() => setActiveTab('activas')}
        >
          <Text style={[styles.tabText, activeTab === 'activas' && styles.activeTabText]}>
            Activas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'completadas' && styles.activeTab]}
          onPress={() => setActiveTab('completadas')}
        >
          <Text style={[styles.tabText, activeTab === 'completadas' && styles.activeTabText]}>
            Completadas
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={solicitudes}
          renderItem={renderSolicitudItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon 
                name={activeTab === 'activas' ? "assignment" : "assignment-turned-in"} 
                size={64} 
                color={colors.textLight} 
              />
              <Text style={styles.emptyText}>
                No hay solicitudes {activeTab === 'activas' ? 'pendientes' : 'completadas'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: colors.textLight,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 15,
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