import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  StatusBar,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../styles/globalStyles';

export default function ResultsInformation({ route, navigation }) {
  const { taskId, tiendaId } = route.params;
  const [task, setTask] = useState(null);
  const [evidencias, setEvidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTaskAndEvidencias = async () => {
    try {
      setLoading(true);
      // Cargar tarea
      const tareaDoc = await getDoc(doc(db, 'tiendas', tiendaId, 'tareas', taskId));
      if (!tareaDoc.exists()) {
        Alert.alert('Error', 'No se encontró la tarea');
        return;
      }

      const tareaData = { id: tareaDoc.id, ...tareaDoc.data() };
      setTask(tareaData);

      // Cargar evidencias
      const evidenciasRef = collection(db, 'tiendas', tiendaId, 'tareas', taskId, 'evidencias');
      const evidenciasSnapshot = await getDocs(evidenciasRef);
      const evidenciasData = evidenciasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvidencias(evidenciasData);
    } catch (error) {
      console.error('Error cargando detalles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTaskAndEvidencias();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadTaskAndEvidencias();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resultados de la Tarea</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{task?.titulo}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task?.prioridad) }]}>
            <Text style={styles.priorityText}>{task?.prioridad}</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Icon name="event" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Completada: {new Date(task?.fechaCompletado).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="schedule" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Turno: {task?.turno}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.description}>{task?.descripcion}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evidencias</Text>
          {evidencias.map((evidencia, index) => (
            <View key={evidencia.id} style={styles.evidenciaCard}>
              <Image 
                source={{ uri: evidencia.imagenUrl }} 
                style={styles.evidenciaImage}
                resizeMode="contain"
              />
              <View style={styles.evidenciaInfo}>
                <Text style={styles.evidenciaText}>
                  Fecha: {new Date(evidencia.fechaCreacion).toLocaleDateString()}
                </Text>
                <Text style={styles.evidenciaText}>
                  Tipo: {evidencia.tipo === 'photo' ? 'Foto' : 'Galería'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  priorityText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  infoSection: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  evidenciaCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  evidenciaImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  evidenciaInfo: {
    marginTop: 10,
  },
  evidenciaText: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 5,
  },
}); 