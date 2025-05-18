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
  RefreshControl,
  FlatList
} from 'react-native';
import { doc, getDoc, collection, getDocs, updateDoc, query, orderBy, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../config/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../styles/globalStyles';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera } from 'expo-camera';
import { processImageAndCompare } from './messiComparator';

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
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [productosInfo, setProductosInfo] = useState({});
  const [showDetectionModal, setShowDetectionModal] = useState(false);
  const [detectionResults, setDetectionResults] = useState(null);

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
            // Invertir el orden: nivel_0 será la charola superior
            const numA = parseInt(a.id.split('_')[1]);
            const numB = parseInt(b.id.split('_')[1]);
            return numA - numB; // Ordenar de menor a mayor para que nivel_0 esté arriba
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

  const renderProductoDetalle = (producto) => {
    const nivelNum = parseInt(selectedNivel?.id.split('_')[1] || 0);
    const totalNiveles = planograma?.niveles?.length || 0;
    const charolaNum = totalNiveles - nivelNum;

    return (
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
              <Text style={styles.productoDetalleTexto}>{charolaNum}</Text>
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
  };

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
            const nivelNum = parseInt(nivel.id.split('_')[1]);
            const totalNiveles = planograma.niveles.length;
            const charolaNum = totalNiveles - nivelNum; // Invertir la numeración
            return (
              <View key={nivel.id} style={styles.nivelRow}>
                <View style={styles.nivelHeader}>
                  <Text style={styles.nivelLabel}>Charola {charolaNum}</Text>
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

      // Leer el archivo como base64 para Firebase
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

        // Procesar imagen con Roboflow API
        console.log('Procesando imagen con Roboflow...');
        let visionResults = null;
        
        if (planograma) {
          // Convertir los datos del planograma al formato necesario para el comparador
          const planogramaData = convertirPlanogramaParaComparador(planograma.niveles);
          console.log('Planograma formateado:', planogramaData);
          
          // Procesar con la API de Roboflow y comparar con el planograma
          // Ahora usamos la URL de Firebase Storage en lugar de la imagen base64
          visionResults = await processImageAndCompare(downloadURL, planogramaData, { useUrl: true });
          console.log('Resultados de Vision API:', visionResults);
          
          if (visionResults && visionResults.barcodesArray) {
            // Guardar resultados de detección para mostrar modal
            setDetectionResults(visionResults.barcodesArray);
            
            // Mostrar modal de detecciones primero
            setShowDetectionModal(true);
            
            // Si hay discrepancias, cargar información de productos 
            // (pero no mostrar el modal todavía, se mostrará después)
            if (visionResults?.comparacion?.movimientos?.length > 0) {
              setAnalysisResults(visionResults.comparacion);
              await cargarInfoProductos(visionResults.comparacion.movimientos);
            }
          }
        } else {
          console.log('No hay planograma disponible para comparar');
        }

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

        // Agregar resultados del análisis de visión si están disponibles
        if (visionResults) {
          evidenciaData.visionResults = {
            barcodesArray: visionResults.barcodesArray,
            discrepancias: visionResults.comparacion.discrepancias,
            movimientos: visionResults.comparacion.movimientos,
            timestamp: new Date().toISOString()
          };
        }

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
      
      if (error.code === 'storage/unauthorized') {
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

  /**
   * Carga la información de los productos mencionados en los movimientos
   * @param {Array} movimientos - Lista de movimientos recomendados
   */
  const cargarInfoProductos = async (movimientos) => {
    try {
      const productosIds = new Set();
      
      // Extraer todos los IDs de productos únicos
      movimientos.forEach(mov => {
        if (mov.producto && mov.producto !== 'EMPTY' && mov.producto !== 'vacío') {
          productosIds.add(mov.producto);
        }
      });
      
      const infoProductos = {};
      
      // Consultar información de cada producto
      for (const id of productosIds) {
        try {
          const productoDoc = await getDoc(doc(db, 'productos', id));
          if (productoDoc.exists()) {
            infoProductos[id] = productoDoc.data();
          } else {
            infoProductos[id] = { nombre: `Producto ${id}`, id: id };
          }
        } catch (err) {
          console.error(`Error al obtener información del producto ${id}:`, err);
          infoProductos[id] = { nombre: `Producto ${id}`, id: id };
        }
      }
      
      setProductosInfo(infoProductos);
    } catch (error) {
      console.error('Error cargando información de productos:', error);
    }
  };
  
  /**
   * Renderiza un mensaje descriptivo para un movimiento recomendado
   * @param {Object} movimiento - El movimiento a describir
   * @returns {String} - Mensaje descriptivo
   */
  const getMovimientoDescripcion = (movimiento) => {
    const { tipo, producto, origen, destino } = movimiento;
    const productoInfo = productosInfo[producto] || { nombre: `Producto ${producto}` };
    
    switch (tipo) {
      case 'mover':
        return `El producto "${productoInfo.nombre}" no va en la posición ${origen.fila + 1}-${origen.columna + 1}. Debe moverse a la posición ${destino.fila + 1}-${destino.columna + 1}.`;
      case 'remover':
        return `El producto "${productoInfo.nombre}" debe ser removido de la posición ${origen.fila + 1}-${origen.columna + 1}, no pertenece al planograma.`;
      case 'añadir':
        return `Falta el producto "${productoInfo.nombre}" en la posición ${destino.fila + 1}-${destino.columna + 1}.`;
      default:
        return `Acción requerida para "${productoInfo.nombre}"`;
    }
  };

  // Renderizar el modal de detecciones por charola
  const renderDetectionModal = () => {
    if (!detectionResults) return null;
    
    return (
      <Modal
        visible={showDetectionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowDetectionModal(false);
          // Si hay discrepancias, mostrar el modal de discrepancias después
          if (analysisResults?.movimientos?.length > 0) {
            setShowResultsModal(true);
          }
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.detectionModalContent}>
            <Text style={styles.detectionModalTitle}>Productos Detectados</Text>
            
            {detectionResults.length === 0 ? (
              <View style={styles.noDetectionsContainer}>
                <Icon name="error-outline" size={48} color={colors.textLight} />
                <Text style={styles.noDetectionsText}>
                  No se detectaron productos en la imagen
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.detectionScrollView}>
                {detectionResults.map((charolaProductos, index) => (
                  <View key={`charola-${index}`} style={styles.charolaContainer}>
                    <View style={styles.charolaHeader}>
                      <Text style={styles.charolaTitle}>
                        Charola {detectionResults.length - index}
                      </Text>
                    </View>
                    
                    <ScrollView horizontal style={styles.productosScroll}>
                      {charolaProductos.map((producto, prodIndex) => (
                        <View key={`producto-${index}-${prodIndex}`} style={styles.productoDetectado}>
                          <View style={styles.productoDetectadoItem}>
                            <Text style={[
                              styles.productoDetectadoText,
                              producto === 'EMPTY' && styles.productoVacio
                            ]}>
                              {producto === 'EMPTY' ? 'Vacío' : producto}
                            </Text>
                          </View>
                          <Text style={styles.productoDetectadoPosicion}>
                            Posición {prodIndex + 1}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                ))}
              </ScrollView>
            )}
            
            <TouchableOpacity 
              style={styles.detectionCloseButton}
              onPress={() => {
                setShowDetectionModal(false);
                // Si hay discrepancias, mostrar el modal de discrepancias después
                if (analysisResults?.movimientos?.length > 0) {
                  setShowResultsModal(true);
                }
              }}
            >
              <Text style={styles.detectionCloseButtonText}>
                {analysisResults?.movimientos?.length > 0 ? 
                  'Ver Recomendaciones' : 'Continuar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Renderizar el modal de resultados
  const renderResultsModal = () => {
    if (!analysisResults || !analysisResults.movimientos) return null;
    
    return (
      <Modal
        visible={showResultsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowResultsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.resultsModalContent}>
            <Text style={styles.resultsModalTitle}>Discrepancias Detectadas</Text>
            
            <Text style={styles.resultsModalSubtitle}>
              {analysisResults.movimientos.length} {analysisResults.movimientos.length === 1 ? 'cambio' : 'cambios'} requerido{analysisResults.movimientos.length !== 1 ? 's' : ''}:
            </Text>
            
            <FlatList
              data={analysisResults.movimientos}
              keyExtractor={(item, index) => `movimiento-${index}`}
              style={styles.resultsList}
              renderItem={({ item, index }) => (
                <View style={styles.resultItem}>
                  <View style={styles.resultItemNumContainer}>
                    <Text style={styles.resultItemNum}>{index + 1}</Text>
                  </View>
                  <View style={styles.resultItemContent}>
                    <Text style={styles.resultItemText}>
                      {getMovimientoDescripcion(item)}
                    </Text>
                  </View>
                </View>
              )}
            />
            
            <TouchableOpacity 
              style={styles.resultsCloseButton}
              onPress={() => setShowResultsModal(false)}
            >
              <Text style={styles.resultsCloseButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
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

      {renderDetectionModal()}
      {renderResultsModal()}

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
  resultsModalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  resultsModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  resultsModalSubtitle: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  resultsList: {
    maxHeight: 400,
  },
  resultItem: {
    flexDirection: 'row',
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
  },
  resultItemNumContainer: {
    backgroundColor: colors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  resultItemNum: {
    color: colors.white,
    fontWeight: 'bold',
  },
  resultItemContent: {
    flex: 1,
  },
  resultItemText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  resultsCloseButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
    alignItems: 'center',
  },
  resultsCloseButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  detectionModalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  detectionModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  detectionScrollView: {
    maxHeight: 450,
  },
  charolaContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  charolaHeader: {
    backgroundColor: colors.primary,
    padding: 10,
  },
  charolaTitle: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  productosScroll: {
    paddingVertical: 10,
    paddingHorizontal: 5,
    minHeight: 100,
  },
  productoDetectado: {
    width: 100,
    margin: 5,
    alignItems: 'center',
  },
  productoDetectadoItem: {
    width: 90,
    height: 90,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  productoDetectadoText: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 13,
  },
  productoVacio: {
    color: colors.textLight,
    fontStyle: 'italic',
  },
  productoDetectadoPosicion: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 5,
  },
  noDetectionsContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDetectionsText: {
    textAlign: 'center',
    color: colors.textLight,
    marginTop: 15,
    fontSize: 16,
  },
  detectionCloseButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
    alignItems: 'center',
  },
  detectionCloseButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

/**
 * Convierte el formato del planograma para que sea compatible con el comparador
 * 
 * @param {Array} niveles - Niveles del planograma
 * @returns {Array<Array<string>>} - Planograma formateado para el comparador
 */
const convertirPlanogramaParaComparador = (niveles) => {
  if (!niveles || !niveles.length) return [];
  
  // Invertimos los niveles porque en el comparador se procesan de abajo hacia arriba
  const nivelesInvertidos = [...niveles].reverse();
  
  return nivelesInvertidos.map(nivel => {
    const productos = nivel.productos || {};
    const productosArray = [];
    
    // Convertir el objeto de productos a un array ordenado
    Object.keys(productos)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach(posicion => {
        const producto = productos[posicion];
        productosArray.push(producto.id || '');
      });
    
    return productosArray;
  });
}; 