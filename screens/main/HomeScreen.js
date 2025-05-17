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
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
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
          return;
        }

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

            // Obtener tasks para esta tienda
            const tasksRef = collection(db, 'tiendas', tiendaDoc.id, 'tasks');
            const tasksQuery = query(tasksRef, where('status', '==', 'pending'));
            const tasksSnapshot = await getDocs(tasksQuery);
            
            const tasksData = tasksSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setTasks(tasksData);
          }
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const renderTaskItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.taskCard}
      onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
    >
      <View style={styles.taskHeader}>
        <Icon 
          name={item.completed ? "check-circle" : "schedule"} 
          size={24} 
          color={item.completed ? colors.secondary : colors.primary} 
        />
        <Text style={styles.taskTitle}>{item.title}</Text>
      </View>
      <View style={styles.taskInfo}>
        <Text style={styles.taskTurno}>Turno: {item.turno}</Text>
        <Text style={styles.taskTime}>Tiempo estimado: {item.estimatedTime}</Text>
      </View>
      <View style={styles.taskStatus}>
        <Text style={[
          styles.taskStatusText,
          { color: item.completed ? colors.secondary : colors.primary }
        ]}>
          {item.completed ? 'Completada' : 'Pendiente'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bienvenido,</Text>
          <Text style={styles.userName}>{userData?.nombre || 'Usuario'}</Text>
          <Text style={styles.storeName}>{tiendaData?.nombre || 'Tienda'}</Text>
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
    borderWidth: 1,
    borderColor: colors.primary,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 10,
  },
  taskInfo: {
    marginBottom: 10,
  },
  taskTurno: {
    fontSize: 16,
    color: colors.textLight,
    marginBottom: 5,
  },
  taskTime: {
    fontSize: 14,
    color: colors.textLight,
  },
  taskStatus: {
    borderTopWidth: 1,
    borderTopColor: colors.primary,
    paddingTop: 10,
    marginTop: 10,
  },
  taskStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
  },
});