import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, FlatList, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../../config/firebase'; // Usa la instancia global

// Usa la instancia global de app
const storage = getStorage(app);

const ProductCaptureScreen = ({ navigation }) => {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImages, setProcessedImages] = useState([]);
  const cameraRef = useRef(null);

  // Define las regiones de recorte según el diseño de la imagen (C1P1, C1P2, etc.)
  const cropRegions = [
    { originX: 50, originY: 700, width: 300, height: 300, label: 'C1P1' },
    { originX: 350, originY: 700, width: 300, height: 300, label: 'C1P2' },
    { originX: 650, originY: 700, width: 300, height: 300, label: 'C1P3' },
    
    { originX: 50, originY: 400, width: 300, height: 300, label: 'C2P1' },
    { originX: 350, originY: 400, width: 300, height: 300, label: 'C2P2' },
    { originX: 650, originY: 400, width: 300, height: 300, label: 'C2P3' },
    
    { originX: 50, originY: 100, width: 300, height: 300, label: 'C3P1' },
    { originX: 350, originY: 100, width: 300, height: 300, label: 'C3P2' },
    { originX: 650, originY: 100, width: 300, height: 300, label: 'C3P3' },
    
    { originX: 50, originY: -200, width: 300, height: 300, label: 'C4P1' },
    { originX: 350, originY: -200, width: 300, height: 300, label: 'C4P2' },
    { originX: 650, originY: -200, width: 300, height: 300, label: 'C4P3' },
  ];

  // Función para añadir fondo blanco a una imagen
  const addWhiteBackground = async (uri, width, height) => {
    try {
      // Utilizar ImageManipulator para modificar la imagen
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width, height } }
        ],
        {
          format: ImageManipulator.SaveFormat.PNG,
          compress: 1
        }
      );
      
      console.log('Image processed with white background:', manipResult.uri);
      return manipResult.uri;
    } catch (error) {
      console.error('Error adding white background:', error);
      return uri; // Devolver URI original en caso de error
    }
  };

  // Función para preparar la imagen para una API externa
  const prepareImageForApi = async (uri, label) => {
    try {
      // Convertir la imagen a base64 para facilitar el envío a APIs
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Estructura de datos para enviar a la API
      const apiData = {
        image: `data:image/png;base64,${base64}`,
        label: label,
        timestamp: Date.now(),
        metadata: {
          source: 'myoxxomobileapp',
          type: 'product-capture'
        }
      };
      
      // Guardar los datos para su uso posterior
      const apiDataFileName = `api_data_${label}_${Date.now()}.json`;
      const apiDataUri = `${FileSystem.documentDirectory}${apiDataFileName}`;
      
      await FileSystem.writeAsStringAsync(
        apiDataUri,
        JSON.stringify(apiData),
        { encoding: FileSystem.EncodingType.UTF8 }
      );
      
      console.log('API data prepared and saved:', apiDataUri);
      return apiDataUri;
    } catch (error) {
      console.error('Error preparing image for API:', error);
      return null;
    }
  };

  // Función para subir la imagen a Firebase Storage
  const uploadToFirebase = async (uri, fileName) => {
    if (!storage) {
      console.warn("Firebase Storage not initialized. Skipping upload.");
      return uri;
    }

    try {
      // Crear una referencia al archivo en Storage
      const storageRef = ref(storage, `product_images/${fileName}`);
      
      // Convertir la URI a blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Subir el blob a Firebase Storage
      const snapshot = await uploadBytes(storageRef, blob);
      console.log('Uploaded image to Firebase Storage!');
      
      // Obtener la URL de descarga
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('Firebase download URL:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error("Error uploading to Firebase:", error);
      return uri; // Devolver la URI original en caso de error
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        setIsProcessing(true);
        
        // Capture the full resolution photo
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
        });
        
        console.log('Photo captured:', photo.uri);
        
        // Process each crop region
        const processedResults = [];
        
        for (const region of cropRegions) {
          try {
            // Comprobar si las coordenadas son válidas
            if (region.originX < 0 || region.originY < 0) {
              console.log(`Skipping region ${region.label} due to negative coordinates.`);
              continue;
            }
            
            // Crop the image
            const croppedImage = await ImageManipulator.manipulateAsync(
              photo.uri,
              [{ crop: region }],
              { compress: 1, format: ImageManipulator.SaveFormat.PNG }
            );
            
            console.log('Image cropped:', croppedImage.uri);
            
            // Añadir fondo blanco a la imagen recortada
            const imageWithBackground = await addWhiteBackground(
              croppedImage.uri,
              region.width, 
              region.height
            );
            
            // Crear un nombre de archivo único
            const fileName = `product_${Date.now()}_${region.label.replace(/\s+/g, '_').toLowerCase()}.png`;
            
            // Guardar localmente la imagen con fondo blanco
            const localUri = `${FileSystem.documentDirectory}${fileName}`;
            await FileSystem.copyAsync({
              from: imageWithBackground,
              to: localUri
            });
            
            // Preparar datos para API externa
            const apiDataUri = await prepareImageForApi(localUri, region.label);
            
            // Luego subimos a Firebase (si está configurado)
            const firebaseUrl = await uploadToFirebase(localUri, fileName);
            
            // Add to results with all URIs
            processedResults.push({
              localUri: localUri,
              firebaseUri: firebaseUrl,
              apiDataUri: apiDataUri,
              cropRegion: region,
            });
            
            console.log('Image processed and saved:', localUri);
          } catch (cropError) {
            console.error('Error processing crop region:', cropError);
          }
        }
        
        // Update state with the processed images
        setProcessedImages(processedResults);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to capture and process the image');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // If permissions aren't loaded yet
  if (!permission) {
    return <View style={styles.container}><Text style={styles.message}>Requesting camera permission...</Text></View>;
  }

  // If permissions aren't granted yet
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  // Función para enviar datos a una API externa
  const sendToExternalApi = async (apiDataUri) => {
    try {
      // Leer los datos preparados
      const jsonData = await FileSystem.readAsStringAsync(apiDataUri);
      const data = JSON.parse(jsonData);
      
      // En un entorno real, aquí enviarías estos datos a tu API
      // Ejemplo:
      // const response = await fetch('https://tu-api-externa.com/endpoint', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(data)
      // });
      
      console.log('Data ready for external API:', data.label);
      Alert.alert('Éxito', `Datos listos para enviar a API: ${data.label}`);
      
      return true;
    } catch (error) {
      console.error('Error sending to external API:', error);
      Alert.alert('Error', 'No se pudieron enviar los datos a la API externa');
      return false;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {!processedImages.length ? (
        // Camera view with UI elements positioned absolutely
        <View style={styles.cameraContainer}>
          <CameraView 
            ref={cameraRef}
            style={styles.camera} 
            facing={facing}
          />
          
          {/* Overlay positioned absolutely */}
          <Image 
            source={require('../../assets/overlay-frame.png')} 
            style={styles.overlay}
            resizeMode="contain"
          />
          
          {/* Controls positioned absolutely */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={toggleCameraFacing}>
              <Text style={styles.buttonText}>Flip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.captureButton, isProcessing && styles.disabledButton]}
              onPress={takePicture}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Take Photo</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Results view
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Processed Images</Text>
          
          <FlatList
            data={processedImages}
            keyExtractor={(item, index) => `processed_${index}`}
            renderItem={({ item }) => (
              <View style={styles.resultItem}>
                <Image source={{ uri: item.localUri }} style={styles.resultImage} />
                <View style={styles.resultMetadata}>
                  <Text style={styles.resultLabel}>{item.cropRegion.label}</Text>
                  <Text style={styles.resultDetails}>
                    Position: ({item.cropRegion.originX}, {item.cropRegion.originY})
                  </Text>
                  <Text style={styles.resultDetails}>
                    Size: {item.cropRegion.width}×{item.cropRegion.height}
                  </Text>
                  
                  {/* Botón para enviar a la API externa */}
                  {item.apiDataUri && (
                    <TouchableOpacity
                      style={styles.apiButton}
                      onPress={() => sendToExternalApi(item.apiDataUri)}
                    >
                      <Text style={styles.apiButtonText}>Enviar a API</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          />
          
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setProcessedImages([])}
          >
            <Text style={styles.buttonText}>Take Another Photo</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  message: {
    color: '#fff',
    textAlign: 'center',
    paddingBottom: 10,
  },
  permissionButton: {
    backgroundColor: '#FF7F00',
    borderRadius: 5,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 50,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.5, // Reduced opacity for better visibility
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 5,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    backgroundColor: '#FF7F00', // OXXO orange
    borderRadius: 5,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
  },
  disabledButton: {
    backgroundColor: '#888',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Results styles
  resultsContainer: {
    flex: 1,
    backgroundColor: '#222',
    padding: 20,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultItem: {
    backgroundColor: '#333',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  resultImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
  },
  resultMetadata: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  resultLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  resultDetails: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 4,
  },
  backButton: {
    backgroundColor: '#FF7F00',
    borderRadius: 5,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  apiButton: {
    backgroundColor: '#4CAF50', // Verde para distinguirlo
    borderRadius: 5,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  apiButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ProductCaptureScreen; 