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
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [activeTab]);

  const loadTasks = async () => {
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
          const tareasRef = collection(db, 'tiendas', tiendaDoc.id, 'tareas');
          
          // Obtener todas las tareas y filtrar en el cliente
          const tareasSnapshot = await getDocs(tareasRef);
          const todasLasTareas = tareasSnapshot.docs.map(doc => ({
            id: doc.id,
            tiendaId: tiendaDoc.id,
            ...doc.data()
          }));

          // Filtrar y ordenar en el cliente según la pestaña activa
          const tareasData = todasLasTareas
            .filter(tarea => activeTab === 'completadas' ? tarea.completada : !tarea.completada)
            .sort((a, b) => {
              if (activeTab === 'completadas') {
                return new Date(b.fechaCompletado || 0) - new Date(a.fechaCompletado || 0);
              }
              return new Date(a.fechaLimite) - new Date(b.fechaLimite);
            });
          
          console.log(`Tareas ${activeTab}:`, tareasData.length);
          setTasks(tareasData);
        }
      }
    } catch (error) {
      console.error('Error al cargar tareas:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTaskItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.taskCard}
      onPress={() => navigation.navigate(activeTab === 'completadas' ? 'ResultsInformation' : 'TaskDetail', { 
        taskId: item.id,
        tiendaId: item.tiendaId 
      })}
    >
      <View style={styles.taskHeader}>
        <View style={styles.taskHeaderLeft}>
          <Text style={styles.taskTitle}>{item.titulo}</Text>
          <Text style={styles.taskDescription} numberOfLines={2}>
            {item.descripcion}
          </Text>
        </View>
        <View style={[styles.taskPriority, { backgroundColor: getPriorityColor(item.prioridad) }]}>
          <Text style={styles.taskPriorityText}>{item.prioridad}</Text>
        </View>
      </View>

      <View style={styles.taskInfo}>
        <View style={styles.taskInfoRow}>
          <Icon name="event" size={16} color={colors.textLight} />
          <Text style={styles.taskInfoText}>
            {activeTab === 'completadas' ? 'Completada: ' + new Date(item.fechaCompletado).toLocaleDateString() : 
             'Límite: ' + new Date(item.fechaLimite).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.taskInfoRow}>
          <Icon name="store" size={16} color={colors.textLight} />
          <Text style={styles.taskInfoText}>
            Planograma: {item.planogramaNombre}
          </Text>
        </View>
        <View style={styles.taskInfoRow}>
          <Icon name="schedule" size={16} color={colors.textLight} />
          <Text style={styles.taskInfoText}>
            Turno: {item.turno}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'alta':
        return '#FF4444';
      case 'media':
        return '#FFBB33';
      case 'baja':
        return '#00C851';
      default:
        return colors.primary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestor de Tareas</Text>
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
          data={tasks}
          renderItem={renderTaskItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.tasksList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon 
                name={activeTab === 'activas' ? "assignment" : "assignment-turned-in"} 
                size={64} 
                color={colors.textLight} 
              />
              <Text style={styles.emptyText}>
                No hay tareas {activeTab === 'activas' ? 'pendientes' : 'completadas'}
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
  tasksList: {
    padding: 15,
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
  taskCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
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
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  taskHeaderLeft: {
    flex: 1,
    marginRight: 10,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  taskDescription: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 10,
  },
  taskPriority: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  taskPriorityText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  taskInfo: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  taskInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  taskInfoText: {
    fontSize: 14,
    color: colors.textLight,
    marginLeft: 8,
  },
}); 