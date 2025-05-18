import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  StyleSheet, 
  StatusBar, 
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Platform,
  Dimensions,
  ScrollView
} from 'react-native';
import { collection, query, getDocs, where, getDoc, doc, addDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../styles/globalStyles';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(true);
  const [activeTab, setActiveTab] = useState('buscar');
  const [planogramas, setPlanogramas] = useState([]);
  const [selectedPlanograma, setSelectedPlanograma] = useState(null);
  const [selectedNivel, setSelectedNivel] = useState(null);
  const [productosNivel, setProductosNivel] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  // Cargar planogramas al inicio
  useEffect(() => {
    if (activeTab === 'explorar') {
      loadPlanogramas();
    }
  }, [activeTab]);

  const loadPlanogramas = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Obtener la tienda del usuario
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      const codigoTienda = userData.codigoTienda;

      // Obtener el ID de la tienda
      const tiendasRef = collection(db, 'tiendas');
      const tiendaQuery = query(tiendasRef, where('codigoTienda', '==', codigoTienda));
      const tiendaSnapshot = await getDocs(tiendaQuery);
      
      if (tiendaSnapshot.empty) return;

      const tiendaId = tiendaSnapshot.docs[0].id;
      
      // Obtener planogramas
      const planogramasRef = collection(db, 'tiendas', tiendaId, 'planogramas');
      const planogramasSnapshot = await getDocs(planogramasRef);
      
      const planogramasData = await Promise.all(planogramasSnapshot.docs.map(async (doc) => {
        const nivelesRef = collection(doc.ref, 'niveles');
        const nivelesSnapshot = await getDocs(nivelesRef);
        const niveles = nivelesSnapshot.docs
          .map(nivelDoc => ({
            id: nivelDoc.id,
            ...nivelDoc.data(),
            productos: nivelDoc.data().productos || {}
          }))
          .sort((a, b) => {
            // Extraer el número del ID (asumiendo formato nivel_X)
            const numA = parseInt(a.id.split('_')[1]);
            const numB = parseInt(b.id.split('_')[1]);
            return numA - numB; // Ordenar de menor a mayor para que nivel_0 esté arriba
          });

        return {
          id: doc.id,
          ...doc.data(),
          niveles: niveles || [],
          imagen: doc.data().imagen || null
        };
      }));

      setPlanogramas(planogramasData);
    } catch (error) {
      console.error('Error al cargar planogramas:', error);
    }
  };

  const loadProductosNivel = async (planogramaId, nivelId) => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(db, 'users', userId));
      const codigoTienda = userDoc.data().codigoTienda;

      const tiendaQuery = query(collection(db, 'tiendas'), where('codigoTienda', '==', codigoTienda));
      const tiendaSnapshot = await getDocs(tiendaQuery);
      if (tiendaSnapshot.empty) return;

      const tiendaId = tiendaSnapshot.docs[0].id;
      const nivelDoc = await getDoc(doc(db, 'tiendas', tiendaId, 'planogramas', planogramaId, 'niveles', nivelId));
      
      if (nivelDoc.exists()) {
        const productos = nivelDoc.data().productos || {};
        const productosArray = Object.entries(productos).map(([index, producto]) => ({
          ...producto,
          uniqueKey: `${producto.id}-${planogramaId}-${nivelId}-${index}`
        }));
        setProductosNivel(productosArray);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar historial de búsquedas
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const historyRef = collection(db, 'users', userId, 'historial');
      const historyQuery = query(historyRef, orderBy('timestamp', 'desc'), limit(10));
      const snapshot = await getDocs(historyQuery);
      
      setSearchHistory(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  };

  const saveToHistory = async (searchTerm) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId || !searchTerm.trim()) return;

      const historyRef = collection(db, 'users', userId, 'historial');
      await addDoc(historyRef, {
        term: searchTerm,
        timestamp: new Date().toISOString()
      });

      loadSearchHistory(); // Recargar historial
    } catch (error) {
      console.error('Error al guardar en historial:', error);
    }
  };

  const deleteHistoryItem = async (historyId) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await deleteDoc(doc(db, 'users', userId, 'historial', historyId));
      loadSearchHistory(); // Recargar historial
    } catch (error) {
      console.error('Error al eliminar del historial:', error);
    }
  };

  // Efecto para búsqueda en tiempo real
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim()) {
        searchProducts();
        setShowHistory(false);
      } else {
        setResults([]);
        setShowHistory(true);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const searchProducts = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error('No hay usuario autenticado');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      const codigoTienda = userData.codigoTienda;

      const tiendasRef = collection(db, 'tiendas');
      const tiendaQuery = query(tiendasRef, where('codigoTienda', '==', codigoTienda));
      const tiendaSnapshot = await getDocs(tiendaQuery);
      
      if (tiendaSnapshot.empty) {
        console.error('No se encontró la tienda');
        return;
      }

      const tiendaId = tiendaSnapshot.docs[0].id;
      const foundProducts = [];

      const planogramasRef = collection(db, 'tiendas', tiendaId, 'planogramas');
      const planogramasSnapshot = await getDocs(planogramasRef);

      for (const planogramaDoc of planogramasSnapshot.docs) {
        const planogramaData = planogramaDoc.data();
        const nivelesRef = collection(planogramaDoc.ref, 'niveles');
        const nivelesSnapshot = await getDocs(nivelesRef);
        const totalNiveles = nivelesSnapshot.size;

        for (const nivelDoc of nivelesSnapshot.docs) {
          const nivelData = nivelDoc.data();
          const productos = nivelData.productos || {};
          const nivelNum = parseInt(nivelDoc.id.split('_')[1]);
          const charolaNum = totalNiveles - nivelNum;

          for (const [index, producto] of Object.entries(productos)) {
            if (producto.nombre.toLowerCase().includes(searchQuery.toLowerCase())) {
              const posicion = parseInt(index) + 1;
              foundProducts.push({
                nombre: producto.nombre,
                planograma: planogramaData.nombre,
                nivel: charolaNum,
                id: producto.id,
                imagen: producto.imagenUrl || null,
                gridPosition: posicion.toString(),
                uniqueKey: `${producto.id}-${planogramaData.nombre}-${nivelDoc.id}-${index}`
              });
            }
          }
        }
      }

      setResults(foundProducts);
      if (foundProducts.length > 0) {
        saveToHistory(searchQuery);
      }
    } catch (error) {
      console.error('Error en la búsqueda:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyItem}>
      <TouchableOpacity 
        style={styles.historyTextContainer}
        onPress={() => {
          setSearchQuery(item.term);
          setShowHistory(false);
        }}
      >
        <Icon name="history" size={20} color={colors.textLight} style={styles.historyIcon} />
        <Text style={styles.historyText}>{item.term}</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={() => deleteHistoryItem(item.id)}
        style={styles.deleteHistoryButton}
      >
        <Icon name="close" size={20} color={colors.textLight} />
      </TouchableOpacity>
    </View>
  );

  const renderProductCard = ({ item }) => (
    <View style={styles.card}>
      {item.imagen ? (
        <Image 
          source={{ uri: item.imagen }} 
          style={styles.productImage}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.placeholderImage}>
          <Icon name="image" size={40} color={colors.textLight} />
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.productName}>{item.nombre}</Text>
        <Text style={styles.productInfo}>Planograma: {item.planograma}</Text>
        <Text style={styles.productInfo}>Charola {item.nivel}</Text>
        <Text style={styles.productInfo}>Ubicación: {item.gridPosition}</Text>
        <Text style={styles.productId}>ID: {item.id}</Text>
      </View>
    </View>
  );

  const renderPlanogramaCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.planogramaCard}
      onPress={() => {
        setSelectedPlanograma(item);
        setSelectedNivel(null);
      }}
    >
      <View style={styles.planogramaCardContent}>
        <View style={styles.planogramaImageContainer}>
          {item.imagen ? (
            <Image 
              source={{ uri: item.imagen }} 
              style={styles.planogramaImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.planogramaImagePlaceholder}>
              <Icon name="store" size={40} color={colors.textLight} />
            </View>
          )}
        </View>
        <View style={styles.planogramaInfo}>
          <Text style={styles.planogramaTitle}>{item.nombre}</Text>
          <Text style={styles.planogramaDetails}>
            Charolas: {(item.niveles || []).length}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderProductoDetalle = (producto) => {
    const nivelNum = parseInt(selectedNivel?.id.split('_')[1] || 0);
    const totalNiveles = selectedPlanograma?.niveles?.length || 0;
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
              <Text style={styles.productoDetalleTexto}>{selectedPlanograma.nombre}</Text>
            </View>
            <View style={styles.productoDetalleData}>
              <Text style={styles.productoDetalleLabel}>Charola: </Text>
              <Text style={styles.productoDetalleTexto}>{charolaNum}</Text>
            </View>
            <View style={styles.productoDetalleData}>
              <Text style={styles.productoDetalleLabel}>Ubicación:</Text>
              <Text style={styles.productoDetalleTexto}>{producto.gridPosition}</Text>
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
    if (!selectedPlanograma) return null;

    return (
      <View style={styles.planogramaVisualContainer}>
        <Text style={styles.visualTitle}>Planograma: {selectedPlanograma.nombre}</Text>
        <ScrollView horizontal={false} style={styles.planogramaScroll}>
          {selectedPlanograma.niveles.map((nivel) => {
            const nivelNum = parseInt(nivel.id.split('_')[1]);
            const totalNiveles = selectedPlanograma.niveles.length;
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

  const renderExplorarContent = () => {
    if (selectedNivel && productosNivel.length > 0) {
      return (
        <View style={styles.explorarContainer}>
          <View style={styles.breadcrumb}>
            <TouchableOpacity 
              style={styles.breadcrumbItem}
              onPress={() => {
                setSelectedPlanograma(null);
                setSelectedNivel(null);
              }}
            >
              <Text style={styles.breadcrumbText}>Planogramas</Text>
            </TouchableOpacity>
            <Icon name="chevron-right" size={20} color={colors.textLight} />
            <TouchableOpacity 
              style={styles.breadcrumbItem}
              onPress={() => setSelectedNivel(null)}
            >
              <Text style={styles.breadcrumbText}>{selectedPlanograma.nombre}</Text>
            </TouchableOpacity>
            <Icon name="chevron-right" size={20} color={colors.textLight} />
            <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>
              Charola {selectedNivel.id.split('_')[1]}
            </Text>
          </View>
          <FlatList
            data={productosNivel}
            renderItem={renderProductCard}
            keyExtractor={(item) => item.uniqueKey}
            contentContainerStyle={styles.resultsList}
          />
        </View>
      );
    }

    if (selectedPlanograma) {
      return (
        <View style={styles.explorarContainer}>
          <View style={styles.breadcrumb}>
            <TouchableOpacity 
              style={styles.breadcrumbItem}
              onPress={() => {
                setSelectedPlanograma(null);
                setSelectedNivel(null);
              }}
            >
              <Text style={styles.breadcrumbText}>Planogramas</Text>
            </TouchableOpacity>
            <Icon name="chevron-right" size={20} color={colors.textLight} />
            <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>
              {selectedPlanograma.nombre}
            </Text>
          </View>
          {renderPlanogramaVisual()}
        </View>
      );
    }

    return (
      <View style={styles.explorarContainer}>
        <Text style={styles.sectionTitle}>Planogramas</Text>
        <FlatList
          data={planogramas}
          renderItem={renderPlanogramaCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.planogramasGrid}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        backgroundColor={colors.primary} 
        barStyle="light-content" 
        translucent={false}
      />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Búsqueda de Productos</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'buscar' && styles.activeTab]}
          onPress={() => setActiveTab('buscar')}
        >
          <Text style={[styles.tabText, activeTab === 'buscar' && styles.activeTabText]}>Buscar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'explorar' && styles.activeTab]}
          onPress={() => setActiveTab('explorar')}
        >
          <Text style={[styles.tabText, activeTab === 'explorar' && styles.activeTabText]}>Explorar</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'buscar' ? (
        <>
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Icon name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar producto..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={colors.black}
              />
              {searchQuery ? (
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery('');
                    setShowHistory(true);
                  }}
                  style={styles.clearButton}
                >
                  <Icon name="close" size={20} color={colors.textLight} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : showHistory ? (
            <FlatList
              data={searchHistory}
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.historyList}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No hay historial de búsquedas</Text>
              }
            />
          ) : (
            <FlatList
              data={results}
              renderItem={renderProductCard}
              keyExtractor={(item) => item.uniqueKey}
              contentContainerStyle={styles.resultsList}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No se encontraron resultados' : 'Ingresa un término de búsqueda'}
                </Text>
              }
            />
          )}
        </>
      ) : (
        <View style={styles.explorarContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            renderExplorarContent()
          )}
        </View>
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
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
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
  searchContainer: {
    padding: 15,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    fontSize: 16,
    color: colors.black,
  },
  clearButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    padding: 15,
  },
  card: {
    flexDirection: 'row',
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
  productImage: {
    width: SCREEN_WIDTH * 0.2,
    height: SCREEN_WIDTH * 0.2,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#f5f5f5',
  },
  placeholderImage: {
    width: SCREEN_WIDTH * 0.2,
    height: SCREEN_WIDTH * 0.2,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  productInfo: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 2,
  },
  productId: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 5,
  },
  historyList: {
    padding: 15,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    marginRight: 10,
  },
  historyText: {
    fontSize: 16,
    color: colors.text,
  },
  deleteHistoryButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textLight,
    fontSize: 16,
    marginTop: 20,
  },
  // Nuevos estilos para la sección de explorar
  explorarContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  planogramasGrid: {
    padding: 15,
  },
  planogramaCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  planogramaCardContent: {
    flexDirection: 'row',
    padding: 15,
  },
  planogramaImageContainer: {
    width: 100,
    height: 100,
    marginRight: 15,
  },
  planogramaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  planogramaImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planogramaInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  planogramaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  planogramaDetails: {
    fontSize: 14,
    color: colors.textLight,
  },
  nivelesGrid: {
    padding: 15,
  },
  nivelCard: {
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
    borderColor: '#eee',
  },
  nivelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  nivelInfo: {
    fontSize: 14,
    color: colors.textLight,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    padding: 15,
    backgroundColor: colors.white,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  planogramaVisualContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  visualTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    padding: 15,
    backgroundColor: colors.white,
  },
  planogramaScroll: {
    flex: 1,
  },
  nivelRow: {
    marginBottom: 20,
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
    fontSize: 16,
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