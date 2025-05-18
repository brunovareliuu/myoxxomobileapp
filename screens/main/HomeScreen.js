import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  StatusBar,
  FlatList 
} from 'react-native';
import { doc, getDoc, query, collection, where, getDocs, orderBy, addDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { globalStyles, colors } from '../../styles/globalStyles';

export default function HomeScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [tiendaData, setTiendaData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
            setTiendaData(tiendaDoc.data());

            // Obtener todas las tareas y filtrar en el cliente
            const tareasRef = collection(db, 'tiendas', tiendaDoc.id, 'tareas');
            const tareasSnapshot = await getDocs(tareasRef);
            
            const tareasData = tareasSnapshot.docs
              .map(doc => ({
                id: doc.id,
                tiendaId: tiendaDoc.id,
                ...doc.data()
              }))
              .filter(tarea => tarea.activa) // Filtrar tareas activas en el cliente
              .sort((a, b) => new Date(a.fechaLimite) - new Date(b.fechaLimite)); // Ordenar por fecha
            
            setTasks(tareasData);
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

    fetchData();
  }, [navigation]);

  const renderTaskItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.taskCard}
      onPress={() => navigation.navigate('TaskDetail', { 
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
            Límite: {new Date(item.fechaLimite).toLocaleDateString()}
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

      <View style={styles.tasksContainer}>
        <Text style={styles.sectionTitle}>Tareas Pendientes</Text>
        <FlatList
          data={tasks}
          renderItem={renderTaskItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.tasksList}
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
  tasksContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 15,
  },
  tasksList: {
    paddingBottom: 20,
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