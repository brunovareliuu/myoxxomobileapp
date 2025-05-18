import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl
} from 'react-native';
import { doc, getDoc, collection, getDocs, updateDoc, query, orderBy, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../config/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../styles/globalStyles';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Camera } from 'expo-camera';

export default function TaskDetailScreen({ route, navigation }) {
  const { taskId, tiendaId } = route.params;
  const [task, setTask] = useState(null);
  const [planograma, setPlanograma] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNivel, setSelectedNivel] = useState(null);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTaskAndPlanograma();
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadTaskAndPlanograma().finally(() => setRefreshing(false));
  }, []);

  const loadTaskAndPlanograma = async () => {
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

      // Cargar planograma
      const planogramaRef = doc(db, 'tiendas', tiendaId, 'planogramas', tareaData.planogramaId);
      const planogramaDoc = await getDoc(planogramaRef);
      
      if (planogramaDoc.exists()) {
        // Obtener niveles del planograma
        const nivelesRef = collection(planogramaDoc.ref, 'niveles');
        const nivelesSnapshot = await getDocs(nivelesRef);
        const niveles = nivelesSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            productos: doc.data().productos || {}
          }))
          .sort((a, b) => {
            const numA = parseInt(a.id.split('_')[1]);
            const numB = parseInt(b.id.split('_')[1]);
            return numB - numA; // Ordenar de mayor a menor
          });

        setPlanograma({
          id: planogramaDoc.id,
          ...planogramaDoc.data(),
          niveles: niveles
        });
      }
    } catch (error) {
      console.error('Error cargando detalles:', error);
      Alert.alert('Error', 'No se pudieron cargar los detalles');
    } finally {
      setLoading(false);
    }
  };

  const renderProductoDetalle = (producto) => (
    <View style={styles.productoDetalleContainer}>
      <View style={styles.productoDetalleHeader}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setProductoSeleccionado(null)}
        >
          <Icon name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.productoDetalleContentHorizontal}>
        <View style={styles.productoDetalleImageContainer}>
          {producto.imagenUrl ? (
            <Image 
              source={{ uri: producto.imagenUrl }} 
              style={styles.productoDetalleImagen}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.productoDetallePlaceholder}>
              <Icon name="image" size={48} color={colors.textLight} />
            </View>
          )}
        </View>
        <View style={styles.productoDetalleInfo}>
          <Text style={styles.productoDetalleTitulo}>{producto.nombre}</Text>
          <View style={styles.productoDetalleData}>
            <Text style={styles.productoDetalleLabel}>Planograma: </Text>
            <Text style={styles.productoDetalleTexto}>{planograma.nombre}</Text>
          </View>
          <View style={styles.productoDetalleData}>
            <Text style={styles.productoDetalleLabel}>Charola: </Text>
            <Text style={styles.productoDetalleTexto}>#{selectedNivel ? parseInt(selectedNivel.id.split('_')[1]) + 1 : ''}</Text>
          </View>
          <View style={styles.productoDetalleData}>
            <Text style={styles.productoDetalleLabel}>Ubicación:</Text>
            <Text style={styles.productoDetalleTexto}>{producto.gridPosition || 'No especificada'}</Text>
          </View>
          <View style={styles.productoDetalleData}>
            <Text style={styles.productoDetalleLabel}>ID:</Text>
            <Text style={styles.productoDetalleTexto}>{producto.id}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPlanogramaVisual = () => {
    if (!planograma) return null;

    return (
      <View style={styles.planogramaVisualContainer}>
        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbText}>Planogramas</Text>
          <Icon name="chevron-right" size={20} color={colors.textLight} />
          <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>
            {planograma.nombre}
          </Text>
        </View>

        <View style={styles.recommendationBox}>
          <Icon name="info" size={24} color={colors.primary} />
          <Text style={styles.recommendationText}>
            Este planograma muestra la disposición ideal de los productos. 
            Asegúrate de que la ubicación de cada producto coincida con esta disposición.
          </Text>
        </View>
        
        <ScrollView style={styles.planogramaScroll}>
          {planograma.niveles.map((nivel) => {
            const nivelNum = parseInt(nivel.id.split('_')[1]) + 1;
            return (
              <View key={nivel.id} style={styles.nivelRow}>
                <View style={styles.nivelHeader}>
                  <Text style={styles.nivelLabel}>Charola {nivelNum}</Text>
                </View>
                <ScrollView horizontal style={styles.productosRow}>
                  {Object.entries(nivel.productos || {}).map(([index, producto]) => {
                    const posicion = parseInt(index) + 1;
                    return (
                      <TouchableOpacity 
                        key={`${producto.id}-${index}`}
                        style={styles.productoVisual}
                        onPress={() => {
                          setSelectedNivel(nivel);
                          setProductoSeleccionado({...producto, gridPosition: posicion.toString()});
                        }}
                      >
                        {producto.imagenUrl ? (
                          <Image 
                            source={{ uri: producto.imagenUrl }} 
                            style={styles.productoImagen}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.productoPlaceholder}>
                            <Icon name="image" size={24} color={colors.textLight} />
                          </View>
                        )}
                        <Text style={styles.productoNombre} numberOfLines={2}>
                          {producto.nombre}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>

        {productoSeleccionado && (
          <View style={styles.modalOverlay}>
            {renderProductoDetalle(productoSeleccionado)}
          </View>
        )}
      </View>
    );
  };

  const handleImageUpload = async (imageUri, type = 'photo') => {
    try {
      setLoading(true);
      
      // Verificar autenticación
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }
      console.log('Usuario autenticado:', currentUser.uid);

      // Verificar que tenemos los IDs necesarios
      if (!tiendaId || !taskId) {
        console.error('IDs faltantes:', { tiendaId, taskId });
        throw new Error('IDs de tienda o tarea no disponibles');
      }
      console.log('IDs verificados:', { tiendaId, taskId });

      // Obtener información del archivo
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      console.log('Información del archivo:', fileInfo);

      if (!fileInfo.exists) {
        throw new Error('No se puede acceder al archivo de imagen');
      }

      // Verificar tamaño
      if (fileInfo.size > 5 * 1024 * 1024) {
        throw new Error('La imagen es demasiado grande. El tamaño máximo es 5MB.');
      }

      // Leer el archivo como base64
      const base64Data = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Crear una referencia única para la imagen
      const timestamp = Date.now();
      const fileName = `evidencias/${tiendaId}/${taskId}/${timestamp}.jpg`;
      console.log('Nombre del archivo:', fileName);
      
      try {
        // Crear referencia al storage
        const storageRef = ref(storage, fileName);
        console.log('Referencia de storage creada');

        // Convertir base64 a blob
        const response = await fetch(`data:image/jpeg;base64,${base64Data}`);
        const blob = await response.blob();

        // Configurar metadata
        const metadata = {
          contentType: 'image/jpeg',
          customMetadata: {
            userId: currentUser.uid,
            tiendaId: tiendaId,
            taskId: taskId,
            uploadTimestamp: timestamp.toString(),
            deviceType: Platform.OS
          }
        };

        // Subir a Firebase Storage
        console.log('Iniciando subida con metadata:', metadata);
        const uploadTask = await uploadBytes(storageRef, blob, metadata);
        console.log('Subida completada:', uploadTask);

        // Obtener URL de descarga
        console.log('Obteniendo URL...');
        const downloadURL = await getDownloadURL(uploadTask.ref);
        console.log('URL obtenida:', downloadURL);

        // Crear nueva entrada en la colección de evidencias
        const evidenciasRef = collection(db, 'tiendas', tiendaId, 'tareas', taskId, 'evidencias');
        const currentDate = new Date();
        
        const evidenciaData = {
          imagenUrl: downloadURL,
          tipo: type,
          fechaCreacion: currentDate.toISOString(),
          estado: 'pendiente_revision',
          userId: currentUser.uid,
          metadata: {
            nombreArchivo: fileName,
            tipoArchivo: 'image/jpeg',
            tamanioArchivo: fileInfo.size,
            timestamp: timestamp,
            dispositivo: Platform.OS,
            resolucion: type === 'photo' ? 'original' : 'N/A'
          }
        };

        console.log('Guardando en Firestore:', evidenciaData);
        await addDoc(evidenciasRef, evidenciaData);

        // Actualizar el estado de la tarea
        const tareaRef = doc(db, 'tiendas', tiendaId, 'tareas', taskId);
        await updateDoc(tareaRef, {
          ultimaActualizacion: currentDate.toISOString(),
          tieneEvidencias: true,
          completada: true,
          fechaCompletado: currentDate.toISOString()
        });

        console.log('Proceso completado exitosamente');
        Alert.alert('Éxito', 'La evidencia se ha subido correctamente y la tarea ha sido marcada como completada');
        navigation.goBack();
      } catch (storageError) {
        console.error('Error detallado de Storage:', {
          code: storageError.code,
          message: storageError.message,
          serverResponse: storageError.serverResponse,
          name: storageError.name,
          stack: storageError.stack
        });
        throw storageError;
      }
    } catch (error) {
      console.error('Error completo:', error);
      let errorMessage = 'No se pudo subir la evidencia.';
      
      if (error.message.includes('demasiado grande')) {
        errorMessage = error.message;
      } else if (error.code === 'storage/unauthorized') {
        errorMessage = 'No tienes permisos para subir archivos.';
      } else if (error.code === 'storage/canceled') {
        errorMessage = 'La subida fue cancelada.';
      } else if (error.code === 'storage/unknown') {
        errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Se necesita permiso para acceder a la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setShowImageOptions(false);
        await handleImageUpload(result.assets[0].uri, 'photo');
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Se necesita permiso para acceder a la galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setShowImageOptions(false);
        await handleImageUpload(result.assets[0].uri, 'gallery');
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

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
        <Text style={styles.headerTitle}>Detalles de la Tarea</Text>
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
              Fecha límite: {new Date(task?.fechaLimite).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="schedule" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Turno: {task?.turno}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="access-time" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Tiempo límite: {task?.tiempoLimite}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.description}>{task?.descripcion}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Planograma: {planograma?.nombre}</Text>
          {renderPlanogramaVisual()}
        </View>
      </ScrollView>

      {!task?.completada && (
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowImageOptions(true)}
          >
            <Text style={styles.actionButtonText}>Iniciar Tarea</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showImageOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Evidencia</Text>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={takePhoto}
            >
              <Icon name="camera-alt" size={24} color={colors.primary} />
              <Text style={styles.modalOptionText}>Tomar Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption}
              onPress={pickImage}
            >
              <Icon name="photo-library" size={24} color={colors.primary} />
              <Text style={styles.modalOptionText}>Seleccionar de Galería</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalOption, styles.cancelOption]}
              onPress={() => setShowImageOptions(false)}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  recommendationBox: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    marginHorizontal: 10,
  },
  recommendationText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 15,
  },
  cancelOption: {
    justifyContent: 'center',
    marginTop: 10,
  },
  cancelText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionContainer: {
    padding: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    backgroundColor: colors.primary,
    padding: 20,
    margin: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  breadcrumbText: {
    fontSize: 14,
    color: colors.primary,
    marginHorizontal: 5,
  },
  breadcrumbActive: {
    color: colors.text,
    fontWeight: 'bold',
  },
  visualTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    padding: 15,
    backgroundColor: colors.white,
  },
  planogramaVisualContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
  },
  planogramaScroll: {
    maxHeight: 400,
  },
  nivelRow: {
    marginBottom: 15,
    backgroundColor: colors.white,
    borderRadius: 10,
    margin: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  nivelHeader: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  nivelLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  productosRow: {
    padding: 10,
  },
  productoVisual: {
    width: 100,
    marginRight: 10,
    alignItems: 'center',
  },
  productoImagen: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  productoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productoNombre: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    marginTop: 5,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productoDetalleContainer: {
    backgroundColor: colors.white,
    borderRadius: 15,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  productoDetalleHeader: {
    alignItems: 'flex-end',
    padding: 10,
  },
  closeButton: {
    padding: 5,
  },
  productoDetalleContentHorizontal: {
    flexDirection: 'row',
    padding: 15,
    paddingTop: 0,
    justifyContent: 'center',
  },
  productoDetalleImageContainer: {
    width: '40%',
    aspectRatio: 1,
    marginRight: 15,
  },
  productoDetalleImagen: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  productoDetallePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productoDetalleInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productoDetalleTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  productoDetalleData: {
    marginBottom: 5,
  },
  productoDetalleLabel: {
    fontSize: 10,
    color: colors.primary,
    marginBottom: 2,
  },
  productoDetalleTexto: {
    fontSize: 18,
    color: colors.text,
  },
}); 