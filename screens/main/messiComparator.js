import axios from 'axios';

/**
 * Procesa una imagen para detectar productos, extraer códigos de barras y
 * comparar con un planograma para identificar discrepancias
 * 
 * @param {string} imageData - Imagen en formato base64 (sin el prefijo data:image) o URL si useUrl=true
 * @param {Array<Array<string>>} planograma - Array bidimensional con los IDs/códigos según plan
 * @param {Object} options - Opciones adicionales (API key, umbral, etc)
 * @returns {Object} - Resultado con el array de códigos y discrepancias
 */
export async function processImageAndCompare(imageData, planograma, options = {}) {
  try {
    // Opciones por defecto
    const defaultOptions = {
      apiKey: 'SUipMLdm8BvqFBvdN1ZX',
      emptyThresholdMultiplier: 1.5,
      shelfThreshold: 100000,
      useUrl: false
    };
    
    const config = { ...defaultOptions, ...options };
    
    // Paso 1: Enviar imagen a Roboflow API
    let roboflowResponse;
    
    if (config.useUrl) {
      // Usar URL en lugar de base64
      roboflowResponse = await axios({
        method: 'POST',
        url: 'https://detect.roboflow.com/estante-productos-oxxo/6',
        params: {
          api_key: config.apiKey,
          image: imageData
        }
      });
    } else {
      // Usar base64 como antes
      roboflowResponse = await axios({
        method: 'POST',
        url: 'https://detect.roboflow.com/estante-productos-oxxo/6',
        params: {
          api_key: config.apiKey
        },
        data: imageData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
    }
    
    // Obtener predicciones
    const { predictions, image } = roboflowResponse.data;
    
    if (!predictions || predictions.length === 0) {
      return {
        barcodesArray: [],
        comparacion: { discrepancias: [], movimientos: [] },
        error: 'No se detectaron productos en la imagen'
      };
    }
    
    // Dimensiones de la imagen
    const imageSize = {
      width: image.width,
      height: image.height
    };
    
    // Paso 2: Procesar predicciones para obtener coordenadas en píxeles
    const enhancedPredictions = predictions.map(pred => {
      const pixelX = Math.round(pred.x * imageSize.width);
      const pixelY = Math.round(pred.y * imageSize.height);
      const pixelWidth = Math.round(pred.width * imageSize.width);
      const pixelHeight = Math.round(pred.height * imageSize.height);
      
      const x1 = pixelX - pixelWidth / 2;
      const y1 = pixelY - pixelHeight / 2;
      const x2 = pixelX + pixelWidth / 2;
      const y2 = pixelY + pixelHeight / 2;
      
      // Calcular los puntos de las esquinas inferiores
      const bottomLeft = { x: x1, y: y2 };
      const bottomRight = { x: x2, y: y2 };
      const bottomCenter = { x: pixelX, y: y2 };
      
      return {
        ...pred,
        pixelX,
        pixelY,
        pixelWidth,
        pixelHeight,
        x1,
        y1,
        x2,
        y2,
        bottomLeft,
        bottomRight,
        bottomCenter
      };
    });
    
    // Paso 3: Organizar productos por estantes y generar arrays necesarios
    const result = organizeProductsByShelf(enhancedPredictions, config);
    
    // Paso 4: Comparar con el planograma
    const comparacion = messiComparations(planograma, result.barcodesArray);
    
    return {
      barcodesArray: result.barcodesArray,
      namesArray: result.namesArray,
      positionsArray: result.positionsArray,
      nestedArray: result.nestedArray,
      comparacion,
      imageSize
    };
    
  } catch (error) {
    console.error('Error procesando la imagen:', error);
    return {
      barcodesArray: [],
      namesArray: [],
      positionsArray: [],
      nestedArray: [],
      comparacion: { discrepancias: [], movimientos: [] },
      error: error.message || 'Error desconocido al procesar la imagen'
    };
  }
}

/**
 * Extrae el nombre del producto de la clase completa (sin la parte del código)
 * 
 * @param {string} className - Nombre completo de la clase/producto
 * @returns {string} - Nombre del producto extraído
 */
function extractProductName(className) {
  if (!className) return '';
  
  // Si tiene un guion, extraer la parte después del guion
  const dashIndex = className.indexOf('-');
  if (dashIndex > -1) {
    return className.substring(dashIndex + 1).trim();
  }
  
  return className;
}

/**
 * Extrae el código de barras (parte numérica antes del guion)
 * 
 * @param {string} className - Nombre completo de la clase/producto
 * @returns {string} - Código de barras extraído
 */
function extractBarcode(className) {
  if (!className) return '';
  
  // Si tiene un guion, extraer la parte antes del guion
  const dashIndex = className.indexOf('-');
  if (dashIndex > -1) {
    return className.substring(0, dashIndex).trim();
  }
  
  // Si no tiene guion, devolver el nombre original
  return className;
}

/**
 * Calcula la distancia entre dos productos
 * 
 * @param {Object} prod1 - Primer producto
 * @param {Object} prod2 - Segundo producto
 * @returns {Object} - Distancias calculadas
 */
function calculateDistance(prod1, prod2) {
  // Usar esquinas inferiores izquierdas en lugar de centros
  const x1 = prod1.bottomLeft.x;
  const y1 = prod1.bottomLeft.y;
  const x2 = prod2.bottomLeft.x;
  const y2 = prod2.bottomLeft.y;
  
  // Calcular distancia euclidiana
  const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  
  // Calcular distancia horizontal
  const horizontalDistance = Math.abs(x2 - x1);
  
  // Calcular distancia vertical
  const verticalDistance = Math.abs(y2 - y1);
  
  return {
    euclidean: Math.round(distance),
    horizontal: Math.round(horizontalDistance),
    vertical: Math.round(verticalDistance)
  };
}

/**
 * Organiza los productos por estantes y genera arrays necesarios
 * 
 * @param {Array} predictions - Predicciones con coordenadas mejoradas
 * @param {Object} config - Configuración y umbrales
 * @returns {Object} - Objeto con los diferentes arrays generados
 */
function organizeProductsByShelf(predictions, config) {
  if (!predictions || predictions.length === 0) {
    return {
      barcodesArray: [],
      namesArray: [],
      positionsArray: [],
      nestedArray: []
    };
  }
  
  // Paso 1: Ordenar productos por coordenada Y del borde inferior (de arriba hacia abajo)
  const sortedByY = [...predictions].sort((a, b) => a.bottomLeft.y - b.bottomLeft.y);
  
  // Paso 2: Agrupar en estantes usando el umbral configurado
  const shelves = [];
  let currentShelf = [sortedByY[0]];
  let baselineY = sortedByY[0].bottomLeft.y;
  
  // Agrupar en estantes
  for (let i = 1; i < sortedByY.length; i++) {
    const item = sortedByY[i];
    const bottomY = item.bottomLeft.y;
    
    // Si la diferencia supera el umbral, es un nuevo estante
    if (Math.abs(baselineY - bottomY) > config.shelfThreshold) {
      shelves.push(currentShelf);
      currentShelf = [item];
      baselineY = bottomY;
    } else {
      currentShelf.push(item);
      // Actualizar la línea base como el promedio de productos actuales
      baselineY = currentShelf.reduce((sum, prod) => sum + prod.bottomLeft.y, 0) / currentShelf.length;
    }
  }
  
  // Añadir el último estante
  shelves.push(currentShelf);
  
  // Paso 3: Ordenar estantes de abajo hacia arriba (mayor Y a menor Y)
  const shelvesSortedBottomToTop = [...shelves].sort((a, b) => {
    const avgYA = a.reduce((sum, prod) => sum + prod.bottomLeft.y, 0) / a.length;
    const avgYB = b.reduce((sum, prod) => sum + prod.bottomLeft.y, 0) / b.length;
    return avgYB - avgYA; // Orden descendente (de abajo hacia arriba)
  });
  
  // Paso 4: Para cada estante, ordenar productos de izquierda a derecha
  const organizedShelves = shelvesSortedBottomToTop.map(shelf => {
    return shelf.sort((a, b) => a.bottomLeft.x - b.bottomLeft.x);
  });
  
  // Paso 5: Añadir índices de estante y producto a cada producto
  const shelvesWithIndices = organizedShelves.map((shelf, shelfIndex) => {
    return shelf.map((product, productIndex) => {
      return {
        ...product,
        shelfIndex,
        productIndex
      };
    });
  });
  
  // GENERAR LOS ARRAYS ANIDADOS
  
  // 1. Array de nombres de productos (sin espacios vacíos)
  const namesArray = shelvesWithIndices.map(shelf => {
    return shelf.map(product => extractProductName(product.class));
  });
  
  // 2. Arrays para códigos de barras y posiciones (con detección de espacios vacíos)
  const barcodesArray = [];
  const positionsArray = [];
  
  // Procesar cada estante
  shelvesWithIndices.forEach((shelf, shelfIndex) => {
    // Inicializar arrays para este estante
    barcodesArray[shelfIndex] = [];
    positionsArray[shelfIndex] = [];
    
    // Si solo hay un producto en el estante, procesarlo directamente
    if (shelf.length <= 1) {
      const product = shelf[0];
      barcodesArray[shelfIndex].push(extractBarcode(product.class));
      positionsArray[shelfIndex].push({
        name: extractProductName(product.class),
        barcode: extractBarcode(product.class),
        position: {
          x: product.bottomLeft.x,
          y: product.bottomLeft.y
        }
      });
      return;
    }
    
    // Ordenar productos por coordenada X
    const sortedByX = [...shelf].sort((a, b) => a.bottomLeft.x - b.bottomLeft.x);
    
    // Calcular distancias entre productos adyacentes
    const distances = [];
    for (let i = 0; i < sortedByX.length - 1; i++) {
      const dist = sortedByX[i+1].bottomLeft.x - (sortedByX[i].bottomLeft.x + sortedByX[i].pixelWidth);
      distances.push(dist);
    }
    
    // Calcular promedio y desviación estándar
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length || 0;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length || 0;
    const stdDev = Math.sqrt(variance);
    
    // Umbral para considerar un espacio vacío
    const emptyThreshold = avgDistance + config.emptyThresholdMultiplier * stdDev;
    
    // Procesar el primer producto
    const firstProduct = sortedByX[0];
    barcodesArray[shelfIndex].push(extractBarcode(firstProduct.class));
    positionsArray[shelfIndex].push({
      name: extractProductName(firstProduct.class),
      barcode: extractBarcode(firstProduct.class),
      position: {
        x: firstProduct.bottomLeft.x,
        y: firstProduct.bottomLeft.y
      }
    });
    
    // Procesar el resto de productos y detectar espacios vacíos
    for (let i = 0; i < sortedByX.length - 1; i++) {
      const prod1 = sortedByX[i];
      const prod2 = sortedByX[i+1];
      const dist = prod2.bottomLeft.x - (prod1.bottomLeft.x + prod1.pixelWidth);
      
      // Si la distancia supera el umbral, agregar espacios vacíos
      if (dist > emptyThreshold) {
        // Calcular cuántos EMPTYs agregar
        const numEmptySpaces = Math.round(dist / avgDistance) - 1;
        const emptyTags = Math.min(numEmptySpaces, 2);
        
        for (let j = 0; j < emptyTags; j++) {
          // Posición estimada del espacio vacío
          const emptyX = (prod1.bottomLeft.x + prod1.pixelWidth) + (j + 1) * (dist / (emptyTags + 1));
          
          // Agregar EMPTY a los arrays
          barcodesArray[shelfIndex].push("EMPTY");
          positionsArray[shelfIndex].push({
            name: "EMPTY",
            barcode: "EMPTY",
            position: {
              x: emptyX,
              y: (prod1.bottomLeft.y + prod2.bottomLeft.y) / 2
            }
          });
        }
      }
      
      // Agregar el siguiente producto
      barcodesArray[shelfIndex].push(extractBarcode(prod2.class));
      positionsArray[shelfIndex].push({
        name: extractProductName(prod2.class),
        barcode: extractBarcode(prod2.class),
        position: {
          x: prod2.bottomLeft.x,
          y: prod2.bottomLeft.y
        }
      });
    }
  });
  
  // 3. Array anidado simplificado (con nombres y EMPTYs)
  const nestedArray = positionsArray.map(shelf => 
    shelf.map(item => item.name)
  );
  
  // Calcular distancias entre productos vecinos
  const shelvesWithDistances = shelvesWithIndices.map(shelf => {
    // Si solo hay un producto en el estante, no hay distancias que calcular
    if (shelf.length <= 1) return shelf;
    
    // Calcular distancias entre productos vecinos
    return shelf.map((product, index) => {
      if (index === 0) {
        // Primer producto, solo calcular distancia al siguiente
        const distanceToNext = calculateDistance(product, shelf[1]);
        return {
          ...product,
          distanceToNext
        };
      } else if (index === shelf.length - 1) {
        // Último producto, solo calcular distancia al anterior
        const distanceToPrevious = calculateDistance(product, shelf[index - 1]);
        return {
          ...product,
          distanceToPrevious
        };
      } else {
        // Producto intermedio, calcular distancia a ambos vecinos
        const distanceToPrevious = calculateDistance(product, shelf[index - 1]);
        const distanceToNext = calculateDistance(product, shelf[index + 1]);
        return {
          ...product,
          distanceToPrevious,
          distanceToNext
        };
      }
    });
  });
  
  return {
    barcodesArray,
    namesArray,
    positionsArray,
    nestedArray,
    shelvesWithDistances
  };
}

/**
 * Compara un planograma con un realograma para encontrar discrepancias
 * @param {Array<Array<string>>} planograma - Array bidimensional con los IDs de productos según el plan
 * @param {Array<Array<string>>} realograma - Array bidimensional con los IDs de productos en la realidad
 * @returns {Array<{fila: number, columna: number, esperado: string, encontrado: string}>} - Lista de discrepancias
 */
function messiComparations(planograma, realograma) {
  const discrepancias = [];
  
  // Verificar que ambos arrays tengan dimensiones
  if (!planograma || !planograma.length || !realograma || !realograma.length) {
    return { discrepancias: [], movimientos: [] };
  }
  
  // Iterar por cada fila y columna para comparar
  for (let i = 0; i < planograma.length; i++) {
    const filaPlano = planograma[i];
    const filaReal = realograma[i] || [];
    
    for (let j = 0; j < filaPlano.length; j++) {
      const productoPlano = filaPlano[j];
      const productoReal = filaReal[j];
      
      // Si hay diferencia, registrar la discrepancia
      if (productoPlano !== productoReal) {
        discrepancias.push({
          fila: i,
          columna: j,
          esperado: productoPlano,
          encontrado: productoReal || 'vacío'
        });
      }
    }
    
    // Verificar si el realograma tiene elementos extra en esta fila
    if (filaReal.length > filaPlano.length) {
      for (let j = filaPlano.length; j < filaReal.length; j++) {
        discrepancias.push({
          fila: i,
          columna: j,
          esperado: 'vacío',
          encontrado: filaReal[j]
        });
      }
    }
  }
  
  // Verificar si el realograma tiene filas extra
  if (realograma.length > planograma.length) {
    for (let i = planograma.length; i < realograma.length; i++) {
      const filaReal = realograma[i];
      
      for (let j = 0; j < filaReal.length; j++) {
        discrepancias.push({
          fila: i,
          columna: j,
          esperado: 'vacío',
          encontrado: filaReal[j]
        });
      }
    }
  }
  
  // Calcular los movimientos necesarios para corregir las discrepancias
  const movimientos = messiMovimientos(planograma, realograma, discrepancias);
  
  return {
    discrepancias,
    movimientos
  };
}

/**
 * Calcula los movimientos necesarios para corregir las discrepancias entre planograma y realograma
 * @param {Array<Array<string>>} planograma - Array bidimensional con los IDs de productos según el plan
 * @param {Array<Array<string>>} realograma - Array bidimensional con los IDs de productos en la realidad
 * @param {Array<{fila: number, columna: number, esperado: string, encontrado: string}>} discrepancias - Lista de discrepancias encontradas
 * @returns {Array<{tipo: string, producto: string, origen: {fila: number, columna: number}, destino: {fila: number, columna: number}}>} - Lista de movimientos a realizar
 */
function messiMovimientos(planograma, realograma, discrepancias) {
  const movimientos = [];
  
  // Mapear productos existentes en el realograma para encontrar posibles reubicaciones
  const productosEnRealograma = new Map();
  const productosEnPlanograma = new Map();
  
  // Llenar el mapa de productos en el realograma
  for (let i = 0; i < realograma.length; i++) {
    for (let j = 0; j < realograma[i].length; j++) {
      const producto = realograma[i][j];
      if (producto && producto !== 'vacío' && producto !== 'EMPTY') {
        if (!productosEnRealograma.has(producto)) {
          productosEnRealograma.set(producto, []);
        }
        productosEnRealograma.get(producto).push({ fila: i, columna: j });
      }
    }
  }
  
  // Llenar el mapa de productos en el planograma
  for (let i = 0; i < planograma.length; i++) {
    for (let j = 0; j < planograma[i].length; j++) {
      const producto = planograma[i][j];
      if (producto && producto !== 'vacío' && producto !== 'EMPTY') {
        if (!productosEnPlanograma.has(producto)) {
          productosEnPlanograma.set(producto, []);
        }
        productosEnPlanograma.get(producto).push({ fila: i, columna: j });
      }
    }
  }
  
  // Procesar cada discrepancia
  for (const discrepancia of discrepancias) {
    const { fila, columna, esperado, encontrado } = discrepancia;
    
    // Caso 1: Hay un producto incorrecto en la posición
    if (encontrado !== 'vacío' && esperado !== 'vacío') {
      // Si el producto encontrado debe estar en otro lugar según el planograma
      if (productosEnPlanograma.has(encontrado)) {
        // Buscar dónde debería estar este producto según el planograma
        const posicionesCorrectas = productosEnPlanograma.get(encontrado);
        let tieneUbicacionCorrecta = false;
        
        for (const posicionCorrecta of posicionesCorrectas) {
          const posibleDiscrepancia = discrepancias.find(
            d => d.fila === posicionCorrecta.fila && 
                 d.columna === posicionCorrecta.columna && 
                 d.esperado === encontrado
          );
          
          if (posibleDiscrepancia) {
            // El producto debe moverse a su ubicación correcta
            movimientos.push({
              tipo: 'mover',
              producto: encontrado,
              origen: { fila, columna },
              destino: { fila: posicionCorrecta.fila, columna: posicionCorrecta.columna }
            });
            tieneUbicacionCorrecta = true;
            break;
          }
        }
        
        if (!tieneUbicacionCorrecta) {
          // El producto está de más, se debe remover
          movimientos.push({
            tipo: 'remover',
            producto: encontrado,
            origen: { fila, columna },
            destino: null
          });
        }
      } else {
        // Producto no pertenece al planograma, remover
        movimientos.push({
          tipo: 'remover',
          producto: encontrado,
          origen: { fila, columna },
          destino: null
        });
      }
      
      // Verificar si el producto esperado está en otro lugar
      if (productosEnRealograma.has(esperado)) {
        const posicionesActuales = productosEnRealograma.get(esperado);
        let encontradoPosicion = null;
        
        // Buscar una posición donde el producto esperado esté incorrectamente ubicado
        for (const posActual of posicionesActuales) {
          // Verificar si esa posición es incorrecta según el planograma
          const deberiaTenerOtroProducto = planograma[posActual.fila]?.[posActual.columna] !== esperado;
          
          if (deberiaTenerOtroProducto) {
            encontradoPosicion = posActual;
            break;
          }
        }
        
        if (encontradoPosicion) {
          // Si el producto esperado está en otra ubicación incorrecta, moverlo
          movimientos.push({
            tipo: 'mover',
            producto: esperado,
            origen: encontradoPosicion,
            destino: { fila, columna }
          });
        } else {
          // El producto esperado no está disponible, se debe añadir
          movimientos.push({
            tipo: 'añadir',
            producto: esperado,
            origen: null,
            destino: { fila, columna }
          });
        }
      } else {
        // El producto esperado no está en el realograma, se debe añadir
        movimientos.push({
          tipo: 'añadir',
          producto: esperado,
          origen: null,
          destino: { fila, columna }
        });
      }
    } 
    // Caso 2: Falta un producto (hay un espacio vacío donde debería haber producto)
    else if (encontrado === 'vacío' && esperado !== 'vacío') {
      // Verificar si el producto esperado está en otra ubicación
      if (productosEnRealograma.has(esperado)) {
        const posicionesActuales = productosEnRealograma.get(esperado);
        let encontradoPosicion = null;
        
        // Buscar una posición donde el producto esté incorrectamente ubicado
        for (const posActual of posicionesActuales) {
          const posicionIncorrecta = planograma[posActual.fila]?.[posActual.columna] !== esperado;
          
          if (posicionIncorrecta) {
            encontradoPosicion = posActual;
            break;
          }
        }
        
        if (encontradoPosicion) {
          // Mover el producto a su ubicación correcta
          movimientos.push({
            tipo: 'mover',
            producto: esperado,
            origen: encontradoPosicion,
            destino: { fila, columna }
          });
        } else {
          // El producto no está disponible para mover, se debe añadir
          movimientos.push({
            tipo: 'añadir',
            producto: esperado,
            origen: null,
            destino: { fila, columna }
          });
        }
      } else {
        // El producto esperado no está en ningún lugar del realograma
        movimientos.push({
          tipo: 'añadir',
          producto: esperado,
          origen: null,
          destino: { fila, columna }
        });
      }
    } 
    // Caso 3: Hay un producto que no debería estar (debería estar vacío)
    else if (encontrado !== 'vacío' && esperado === 'vacío') {
      // Verificar si este producto debería estar en otra ubicación según el planograma
      if (productosEnPlanograma.has(encontrado)) {
        const posicionesCorrectas = productosEnPlanograma.get(encontrado);
        let destinoEncontrado = false;
        
        for (const posicionCorrecta of posicionesCorrectas) {
          const posibleDiscrepancia = discrepancias.find(
            d => d.fila === posicionCorrecta.fila && 
                 d.columna === posicionCorrecta.columna && 
                 d.esperado === encontrado && 
                 d.encontrado !== encontrado
          );
          
          if (posibleDiscrepancia) {
            // El producto debe moverse a su ubicación correcta
            movimientos.push({
              tipo: 'mover',
              producto: encontrado,
              origen: { fila, columna },
              destino: { fila: posicionCorrecta.fila, columna: posicionCorrecta.columna }
            });
            destinoEncontrado = true;
            break;
          }
        }
        
        if (!destinoEncontrado) {
          // El producto no tiene destino válido, remover
          movimientos.push({
            tipo: 'remover',
            producto: encontrado,
            origen: { fila, columna },
            destino: null
          });
        }
      } else {
        // El producto no pertenece al planograma, debe removerse
        movimientos.push({
          tipo: 'remover',
          producto: encontrado,
          origen: { fila, columna },
          destino: null
        });
      }
    }
  }
  
  // Optimizar los movimientos para eliminar redundancias
  return optimizarMovimientos(movimientos);
}

/**
 * Optimiza los movimientos eliminando operaciones redundantes
 * @param {Array<Object>} movimientos - Lista de movimientos iniciales
 * @returns {Array<Object>} - Lista optimizada de movimientos
 */
function optimizarMovimientos(movimientos) {
  const movimientosOptimizados = [];
  const movimientosProcesados = new Set();
  
  // Eliminar movimientos redundantes (como mover un producto y después removerlo)
  for (let i = 0; i < movimientos.length; i++) {
    if (movimientosProcesados.has(i)) continue;
    
    const mov = movimientos[i];
    
    // Buscar si hay otro movimiento que anule a este
    let redundante = false;
    
    for (let j = i + 1; j < movimientos.length; j++) {
      const otroMov = movimientos[j];
      
      // Si un producto se mueve y luego se remueve, eliminar ambos y añadir solo remover del origen
      if (mov.tipo === 'mover' && otroMov.tipo === 'remover' && 
          mov.producto === otroMov.producto &&
          JSON.stringify(mov.destino) === JSON.stringify(otroMov.origen)) {
        movimientosOptimizados.push({
          tipo: 'remover',
          producto: mov.producto,
          origen: mov.origen,
          destino: null
        });
        
        movimientosProcesados.add(i);
        movimientosProcesados.add(j);
        redundante = true;
        break;
      }
      
      // Si se añade un producto y luego se mueve, combinar en un solo movimiento de adición directa
      if (mov.tipo === 'añadir' && otroMov.tipo === 'mover' &&
          mov.producto === otroMov.producto &&
          JSON.stringify(mov.destino) === JSON.stringify(otroMov.origen)) {
        movimientosOptimizados.push({
          tipo: 'añadir',
          producto: mov.producto,
          origen: null,
          destino: otroMov.destino
        });
        
        movimientosProcesados.add(i);
        movimientosProcesados.add(j);
        redundante = true;
        break;
      }
    }
    
    if (!redundante && !movimientosProcesados.has(i)) {
      movimientosOptimizados.push(mov);
      movimientosProcesados.add(i);
    }
  }
  
  return movimientosOptimizados;
}

// Ejemplo de uso
// const planogramaEjemplo = [
//   ["4678379", "111989", "111989"],
//   ["111989", "111989", "4678374", "111989"],
//   ["121989", "113989", "111989", "111984"]
// ];
// 
// processImageAndCompare(imageBase64, planogramaEjemplo)
//   .then(resultado => console.log(JSON.stringify(resultado, null, 2)))
//   .catch(error => console.error(error)); 