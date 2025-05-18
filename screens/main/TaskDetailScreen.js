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
  Platform
} from 'react-native';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../config/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../styles/globalStyles';
import * as ImagePicker from 'expo-image-picker';

export default function TaskDetailScreen({ route, navigation }) {
  const { solicitudId, tiendaId } = route.params;
  const [solicitud, setSolicitud] = useState(null);
  const [planograma, setPlanograma] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNivel, setSelectedNivel] = useState(null);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [fotoUrl, setFotoUrl] = useState(null);

  useEffect(() => {
    loadSolicitudYPlanograma();
  }, []);

  const loadSolicitudYPlanograma = async () => {
    try {
      setLoading(true);
      // Cargar solicitud
      const solicitudRef = doc(db, 'tiendas', tiendaId, 'solicitudes', solicitudId);
      const solicitudDoc = await getDoc(solicitudRef);
      
      if (!solicitudDoc.exists()) {
        Alert.alert('Error', 'No se encontró la solicitud');
        return;
      }

      const solicitudData = { id: solicitudDoc.id, ...solicitudDoc.data() };
      setSolicitud(solicitudData);

      // Si la solicitud está completada, cargar la URL de la foto
      if (solicitudData.completada && solicitudData.fotoUrl) {
        try {
          const storageRef = ref(storage, solicitudData.fotoUrl);
          const url = await getDownloadURL(storageRef);
          setFotoUrl(url);
        } catch (error) {
          console.error('Error cargando URL de foto:', error);
          setFotoUrl(null);
        }
      }

      // Cargar planograma
      if (solicitudData.planogramaId) {
        const planogramaRef = doc(db, 'tiendas', tiendaId, 'planogramas', solicitudData.planogramaId);
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
              return numA - numB;
            });

          setPlanograma({
            id: planogramaDoc.id,
            ...planogramaDoc.data(),
            niveles: niveles
          });
        }
      }
    } catch (error) {
      console.error('Error cargando detalles:', error);
      Alert.alert('Error', 'No se pudieron cargar los detalles');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (imageUri) => {
    try {
      setLoading(true);
      
      // Verificar autenticación
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      // Crear nombre de archivo único
      const timestamp = Date.now();
      const fileName = `evidencias/${tiendaId}/foto_${timestamp}.jpg`;
      
      // Subir imagen a Storage
      const storageRef = ref(storage, fileName);
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // Actualizar la solicitud
      const solicitudRef = doc(db, 'tiendas', tiendaId, 'solicitudes', solicitudId);
      await updateDoc(solicitudRef, {
        completada: true,
        fechaCompletado: new Date().toISOString(),
        fotoUrl: fileName,
        ultimaActualizacion: new Date().toISOString()
      });

      // Actualizar el estado local
      setFotoUrl(downloadURL);
      setSolicitud(prev => ({
        ...prev,
        completada: true,
        fechaCompletado: new Date().toISOString(),
        fotoUrl: fileName
      }));
      
      Alert.alert('Éxito', 'La solicitud ha sido completada exitosamente');
      
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo completar la solicitud');
    } finally {
      setLoading(false);
      setShowImageOptions(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
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
        await handleImageUpload(result.assets[0].uri);
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
        await handleImageUpload(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
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
        <ScrollView style={styles.planogramaScroll}>
          {planograma.niveles.map((nivel) => {
            const nivelNum = parseInt(nivel.id.split('_')[1]);
            const totalNiveles = planograma.niveles.length;
            const charolaNum = totalNiveles - nivelNum;
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

  const renderEvidencia = () => {
    if (!solicitud?.completada) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Foto</Text>
        <View style={styles.evidenciaContainer}>
          {fotoUrl ? (
            <Image 
              source={{ uri: fotoUrl }} 
              style={styles.evidenciaImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.evidenciaPlaceholder}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.evidenciaPlaceholderText}>
                Cargando foto...
              </Text>
            </View>
          )}
          <Text style={styles.completadoText}>
            Completado el {new Date(solicitud.fechaCompletado).toLocaleString()}
          </Text>
        </View>
      </View>
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
        <Text style={styles.headerTitle}>Detalles de la Solicitud</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{solicitud?.titulo}</Text>
          <View style={[styles.statusBadge, { backgroundColor: solicitud?.completada ? colors.success : colors.warning }]}>
            <Text style={styles.statusText}>
              {solicitud?.completada ? 'COMPLETADO' : 'PENDIENTE'}
            </Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Icon name="event" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Fecha límite: {new Date(solicitud?.fechaLimite).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="person" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Creada por: {solicitud?.creadaPor}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.description}>{solicitud?.descripcion}</Text>
        </View>

        {solicitud?.completada ? renderEvidencia() : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Planograma</Text>
            {renderPlanogramaVisual()}
          </View>
        )}
      </ScrollView>

      {!solicitud?.completada && (
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowImageOptions(true)}
          >
            <Text style={styles.actionButtonText}>Completar Solicitud</Text>
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
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
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
  evidenciaContainer: {
    backgroundColor: colors.white,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  evidenciaImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
  },
  evidenciaPlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  evidenciaPlaceholderText: {
    marginTop: 10,
    color: colors.textLight,
    fontSize: 14,
  },
  completadoText: {
    padding: 10,
    color: colors.textLight,
    fontSize: 14,
    textAlign: 'center',
  },
  actionContainer: {
    padding: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
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
}); 