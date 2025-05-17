import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  StatusBar,
  Alert
} from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../styles/globalStyles';

export default function TaskDetailScreen({ route, navigation }) {
  const { taskId } = route.params;
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const taskDoc = await getDoc(doc(db, 'tasks', taskId));
        if (taskDoc.exists()) {
          setTask({ id: taskDoc.id, ...taskDoc.data() });
        }
      } catch (error) {
        console.error('Error fetching task:', error);
        Alert.alert('Error', 'No se pudo cargar la tarea');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  const handleStartTask = () => {
    navigation.navigate('ProductCapture', {
      taskId: taskId,
      onPhotoComplete: handlePhotoComplete
    });
  };

  const handlePhotoComplete = async (photoUrls) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: 'completed',
        completedAt: new Date().toISOString(),
        photoUrls: photoUrls
      });

      Alert.alert(
        'Éxito',
        'Tarea completada correctamente',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'No se pudo actualizar la tarea');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
        <Text>Cargando...</Text>
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
        <Text style={styles.headerTitle}>Detalles de la Tarea</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{task?.title}</Text>
          <View style={styles.taskMeta}>
            <Text style={styles.taskTurno}>Turno: {task?.turno}</Text>
            <Text style={styles.taskTime}>
              Tiempo estimado: {task?.estimatedTime}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.description}>{task?.description}</Text>
        </View>

        {task?.planogramImage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Planograma</Text>
            <Image
              source={{ uri: task.planogramImage }}
              style={styles.planogram}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instrucciones</Text>
          {task?.instructions?.map((instruction, index) => (
            <View key={index} style={styles.instructionItem}>
              <Icon name="check-circle-outline" size={24} color={colors.primary} />
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.startButton}
        onPress={handleStartTask}
      >
        <Text style={styles.startButtonText}>Iniciar Tarea</Text>
      </TouchableOpacity>
    </View>
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
    marginBottom: 20,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
  },
  taskMeta: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
  },
  taskTurno: {
    color: colors.white,
    fontSize: 16,
    marginBottom: 5,
  },
  taskTime: {
    color: colors.white,
    fontSize: 14,
  },
  section: {
    marginBottom: 25,
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
  planogram: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: colors.gray,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  instructionText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 10,
    flex: 1,
  },
  startButton: {
    backgroundColor: colors.primary,
    padding: 20,
    alignItems: 'center',
    margin: 20,
    borderRadius: 10,
  },
  startButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 