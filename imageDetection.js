import React, { useState, useRef } from 'react';
import axios from 'axios';
import './App.css';

// Componente de icono de carga de archivos
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 0h24v24H0z" fill="none"/>
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
  </svg>
);

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [shelfProducts, setShelfProducts] = useState(null);
  const [nestedArray, setNestedArray] = useState(null);
  const [imageSize, setImageSize] = useState(null);
  const [namesArray, setNamesArray] = useState(null);
  const [positionsArray, setPositionsArray] = useState(null);
  const [barcodesArray, setBarcodesArray] = useState(null);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      console.log("Archivo seleccionado:", file.name, "Tipo:", file.type);
      
      // Check if the file is HEIC format by extension
      if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
        setError("Las imágenes en formato HEIC no son compatibles. Por favor, convierte la imagen a JPG o PNG antes de subirla.");
        return;
      }
      
      setSelectedFile(file);
      setError(null);
      setResults(null);
      setResultImage(null);
      setShelfProducts(null);
      setNestedArray(null);
      setImageSize(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result);
        
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          setImageSize({ width: img.width, height: img.height });
          console.log(`Dimensiones de imagen cargadas: ${img.width}x${img.height}`);
        };
        img.onerror = () => {
          console.error("Error al cargar dimensiones de la imagen");
        };
        img.src = reader.result;
      };
      reader.onerror = () => {
        setError("Error al leer el archivo. Intenta con otro formato de imagen.");
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle click on the file container
  const handleContainerClick = () => {
    fileInputRef.current.click();
  };

  // Handle drag events
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setError(null);
      setResults(null);
      setResultImage(null);
      setShelfProducts(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Por favor selecciona una imagen');
      return;
    }
    
    if (!imageSize) {
      setError('Espera a que la imagen termine de cargar');
      return;
    }
    
    // Reset states
    setLoading(true);
    setError(null);
    setResults(null);
    setResultImage(null);
    setShelfProducts(null);
    setNestedArray(null);
    
    try {
      // Convert to base64
      const base64Image = await convertToBase64(selectedFile);
      const base64WithoutPrefix = base64Image.split(',')[1];
      
      console.log('Enviando imagen a Roboflow...');
      console.log(`Usando dimensiones de imagen: ${imageSize.width}x${imageSize.height}`);
      
      // Send to Roboflow API
      const response = await axios({
        method: 'POST',
        url: 'https://detect.roboflow.com/estante-productos-oxxo/6',
        params: {
          api_key: 'SUipMLdm8BvqFBvdN1ZX'
        },
        data: base64WithoutPrefix,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      console.log('Respuesta de Roboflow:', response.data);
      
      // Set results
      setResults(response.data);
      
      // Draw detections on image
      if (response.data.predictions && response.data.predictions.length > 0) {
        // Add absolute pixel coordinates to predictions
        const enhancedPredictions = response.data.predictions.map(pred => {
          const pixelX = Math.round(pred.x * imageSize.width);
          const pixelY = Math.round(pred.y * imageSize.height);
          const pixelWidth = Math.round(pred.width * imageSize.width);
          const pixelHeight = Math.round(pred.height * imageSize.height);
          
          const x1 = pixelX - pixelWidth / 2;
          const y1 = pixelY - pixelHeight / 2;
          const x2 = pixelX + pixelWidth / 2;
          const y2 = pixelY + pixelHeight / 2;
          
          // Calculate bottom corners (valuable for tarima detection)
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
        
        console.log('Predicciones con coordenadas en píxeles:', enhancedPredictions);
        organizeProductsByShelf(enhancedPredictions);
        drawDetections(preview, enhancedPredictions);
      }
      
    } catch (err) {
      console.error('Error al detectar productos:', err);
      setError('Error al detectar productos: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Convert file to base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Calculate distance between two products
  const calculateDistance = (prod1, prod2) => {
    // Use bottom left corners instead of centers
    const x1 = prod1.bottomLeft.x;
    const y1 = prod1.bottomLeft.y;
    const x2 = prod2.bottomLeft.x;
    const y2 = prod2.bottomLeft.y;
    
    // Calculate Euclidean distance
    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    
    // Calculate horizontal distance
    const horizontalDistance = Math.abs(x2 - x1);
    
    // Calculate vertical distance
    const verticalDistance = Math.abs(y2 - y1);
    
    return {
      euclidean: Math.round(distance),
      horizontal: Math.round(horizontalDistance),
      vertical: Math.round(verticalDistance)
    };
  };

  // Extract product name from the full class name (remove code part)
  const extractProductName = (className) => {
    if (!className) return '';
    
    // If the class name has a dash (código-nombre format), remove the code part
    const dashIndex = className.indexOf('-');
    if (dashIndex > -1) {
      return className.substring(dashIndex + 1).trim();
    }
    
    return className;
  };

  // Extract barcode from the full class name (only the code part before the dash)
  const extractBarcode = (className) => {
    if (!className) return '';
    
    // If the class name has a dash (código-nombre format), extract the code part
    const dashIndex = className.indexOf('-');
    if (dashIndex > -1) {
      return className.substring(0, dashIndex).trim();
    }
    
    // If no dash, return the original name
    return className;
  };

  // Detect empty spaces in a shelf and add "EMPTY" tags
  const detectEmptySpaces = (shelfProducts) => {
    if (!shelfProducts || shelfProducts.length <= 1) {
      return shelfProducts.map(p => extractProductName(p.class));
    }
    
    // Sort products by x-coordinate (using bottomLeft instead of bottomCenter)
    const sortedProducts = [...shelfProducts].sort((a, b) => a.bottomLeft.x - b.bottomLeft.x);
    
    // Calculate horizontal distances between adjacent products
    const distances = [];
    for (let i = 0; i < sortedProducts.length - 1; i++) {
      const dist = sortedProducts[i+1].bottomLeft.x - (sortedProducts[i].bottomLeft.x + sortedProducts[i].pixelWidth);
      distances.push(dist);
    }
    
    // Calculate average and standard deviation of distances
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
    const stdDev = Math.sqrt(variance);
    
    // Threshold for "empty" detection: average + 1.5 standard deviations
    const emptyThreshold = avgDistance + 1.5 * stdDev;
    
    console.log(`Distancia promedio entre productos: ${avgDistance.toFixed(1)}px`);
    console.log(`Desviación estándar: ${stdDev.toFixed(1)}px`);
    console.log(`Umbral para espacio vacío: ${emptyThreshold.toFixed(1)}px`);
    
    // Create result array with products and "EMPTY" tags
    const result = [extractProductName(sortedProducts[0].class)];
    
    for (let i = 0; i < sortedProducts.length - 1; i++) {
      const dist = sortedProducts[i+1].bottomLeft.x - (sortedProducts[i].bottomLeft.x + sortedProducts[i].pixelWidth);
      
      // Check if the empty threshold is exceeded
      if (dist > emptyThreshold) {
        // Calculate how many "EMPTY" tags to add
        const numEmptySpaces = Math.round(dist / avgDistance) - 1;
        console.log(`Espacio vacío detectado: ${dist.toFixed(1)}px (${numEmptySpaces} espacios)`);
        
        // Add up to 2 "EMPTY" tags for large gaps
        const emptyTags = Math.min(numEmptySpaces, 2);
        for (let j = 0; j < emptyTags; j++) {
          result.push("EMPTY");
        }
      }
      
      result.push(extractProductName(sortedProducts[i+1].class));
    }
    
    return result;
  };

  // Organize products by shelf based on bottom edges
  const organizeProductsByShelf = (predictions) => {
    if (!predictions || predictions.length === 0) return;
    
    // Step 1: Sort products by y-coordinate of bottom edge (ascending order: smaller y values are higher in the image)
    const sortedByY = [...predictions].sort((a, b) => a.bottomLeft.y - b.bottomLeft.y);
    
    console.log('Productos ordenados por borde inferior (de abajo hacia arriba):', sortedByY);
    
    // Use a fixed threshold value of 100,000 pixels
    const shelfThreshold = 100000;
    console.log(`Umbral fijo para detección de tarimas: ${shelfThreshold}px`);
    
    // Group items into shelves based on bottom edge
    const shelves = [];
    let currentShelf = [sortedByY[0]];
    let baselineY = sortedByY[0].bottomLeft.y;
    
    // Group into shelves
    for (let i = 1; i < sortedByY.length; i++) {
      const item = sortedByY[i];
      const bottomY = item.bottomLeft.y;
      
      // If this item's bottom edge is significantly higher than the baseline, it's on a new shelf
      if (Math.abs(baselineY - bottomY) > shelfThreshold) {
        shelves.push(currentShelf);
        currentShelf = [item];
        baselineY = bottomY;
      } else {
        currentShelf.push(item);
        // Update baseline as the average of current products on the shelf
        baselineY = currentShelf.reduce((sum, prod) => sum + prod.bottomLeft.y, 0) / currentShelf.length;
      }
    }
    
    // Add the last shelf
    shelves.push(currentShelf);
    
    console.log('Tarimas detectadas:', shelves.length);
    shelves.forEach((shelf, i) => {
      console.log(`Tarima ${i+1}: ${shelf.length} productos, altura media: ${Math.round(shelf.reduce((sum, prod) => sum + prod.bottomLeft.y, 0) / shelf.length)}px`);
    });
    
    // Sort shelves from bottom to top (larger y values are at the bottom)
    const shelvesSortedBottomToTop = [...shelves].sort((a, b) => {
      // Calculate average y position for each shelf
      const avgYA = a.reduce((sum, prod) => sum + prod.bottomLeft.y, 0) / a.length;
      const avgYB = b.reduce((sum, prod) => sum + prod.bottomLeft.y, 0) / b.length;
      return avgYB - avgYA; // Descending order (bottom to top)
    });
    
    console.log('Tarimas ordenadas de abajo hacia arriba:', shelvesSortedBottomToTop.map((shelf, i) => 
      `Tarima ${i+1}: altura media: ${Math.round(shelf.reduce((sum, prod) => sum + prod.bottomLeft.y, 0) / shelf.length)}px`
    ));
    
    // For each shelf, sort items from left to right
    const organizedShelves = shelvesSortedBottomToTop.map(shelf => {
      return shelf.sort((a, b) => a.bottomLeft.x - b.bottomLeft.x);
    });
    
    // Add shelf index to each product
    const shelvesWithIndices = organizedShelves.map((shelf, shelfIndex) => {
      return shelf.map((product, productIndex) => {
        return {
          ...product,
          shelfIndex,
          productIndex
        };
      });
    });
    
    // PRIMER ARRAY ANIDADO: Solo nombres de productos
    const namesArrayData = shelvesWithIndices.map(shelf => {
      return shelf.map(product => extractProductName(product.class));
    });
    console.log('Array anidado de nombres:', namesArrayData);
    setNamesArray(namesArrayData);
    
    // NUEVO ARRAY ANIDADO: Solo códigos de barras
    const barcodesArrayData = [];

    // SEGUNDO ARRAY ANIDADO: Posiciones y detecciones de espacios vacíos
    const positionsArrayData = shelvesWithIndices.map((shelf, shelfIndex) => {
      if (shelf.length <= 1) {
        const productData = {
          name: extractProductName(shelf[0].class),
          barcode: extractBarcode(shelf[0].class),
          position: {
            x: shelf[0].bottomLeft.x,
            y: shelf[0].bottomLeft.y
          }
        };
        
        // Initialize the barcode array for this shelf
        if (!barcodesArrayData[shelfIndex]) {
          barcodesArrayData[shelfIndex] = [extractBarcode(shelf[0].class)];
        }
        
        return [productData];
      }
      
      // Initialize the barcode array for this shelf
      barcodesArrayData[shelfIndex] = [];
      
      // Calcular distancias horizontales entre productos adyacentes
      const result = [];
      const sortedByX = [...shelf].sort((a, b) => a.bottomLeft.x - b.bottomLeft.x);
      
      // Calcular distancias entre productos adyacentes
      const distances = [];
      for (let i = 0; i < sortedByX.length - 1; i++) {
        const dist = sortedByX[i+1].bottomLeft.x - (sortedByX[i].bottomLeft.x + sortedByX[i].pixelWidth);
        distances.push(dist);
      }
      
      // Calcular promedio y desviación estándar
      const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
      const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
      const stdDev = Math.sqrt(variance);
      
      // Umbral para considerar un espacio vacío
      const emptyThreshold = avgDistance + 1.5 * stdDev;
      
      console.log(`Tarima ${shelf[0].shelfIndex + 1}: Distancia promedio=${avgDistance.toFixed(1)}px, Umbral=${emptyThreshold.toFixed(1)}px`);
      
      // Añadir el primer producto
      const firstBarcode = extractBarcode(sortedByX[0].class);
      barcodesArrayData[shelfIndex].push(firstBarcode);
      
      result.push({
        name: extractProductName(sortedByX[0].class),
        barcode: firstBarcode,
        position: {
          x: sortedByX[0].bottomLeft.x,
          y: sortedByX[0].bottomLeft.y
        }
      });
      
      // Agregar productos y "EMPTY" cuando sea necesario
      for (let i = 0; i < sortedByX.length - 1; i++) {
        const prod1 = sortedByX[i];
        const prod2 = sortedByX[i+1];
        const dist = prod2.bottomLeft.x - (prod1.bottomLeft.x + prod1.pixelWidth);
        
        // Si la distancia supera el umbral, agregamos "EMPTY"
        if (dist > emptyThreshold) {
          // Calcular cuántos "EMPTY" agregar basado en la distancia
          const numEmptySpaces = Math.round(dist / avgDistance) - 1;
          console.log(`Espacio vacío en tarima ${prod1.shelfIndex + 1}: ${dist.toFixed(1)}px (${numEmptySpaces} espacios)`);
          
          // Agregar hasta 2 "EMPTY" para espacios muy grandes
          const emptyTags = Math.min(numEmptySpaces, 2);
          for (let j = 0; j < emptyTags; j++) {
            // Posición estimada del espacio vacío
            const emptyX = (prod1.bottomLeft.x + prod1.pixelWidth) + (j + 1) * (dist / (emptyTags + 1));
            
            // Add EMPTY to barcode array
            barcodesArrayData[shelfIndex].push("EMPTY");
            
            result.push({
              name: "EMPTY",
              barcode: "EMPTY",
              position: {
                x: emptyX,
                y: (prod1.bottomLeft.y + prod2.bottomLeft.y) / 2
              }
            });
          }
        }
        
        // Add the next product and its barcode
        const nextBarcode = extractBarcode(prod2.class);
        barcodesArrayData[shelfIndex].push(nextBarcode);
        
        // Añadir el siguiente producto
        result.push({
          name: extractProductName(prod2.class),
          barcode: nextBarcode,
          position: {
            x: prod2.bottomLeft.x,
            y: prod2.bottomLeft.y
          }
        });
      }
      
      return result;
    });
    
    // Store the positions array in state
    setPositionsArray(positionsArrayData);
    
    // Set barcode array in state
    setBarcodesArray(barcodesArrayData);
    
    // Crear array anidado simplificado con nombres y espacios vacíos
    const simplifiedNestedArray = positionsArrayData.map(shelf => 
      shelf.map(item => item.name)
    );
    
    console.log('Array anidado de nombres:', namesArrayData);
    console.log('Array anidado de códigos de barras:', barcodesArrayData);
    console.log('Array anidado con espacios vacíos:', simplifiedNestedArray);
    console.log('Array detallado de posiciones:', positionsArrayData);
    
    setNestedArray(simplifiedNestedArray);
    
    // Calculate distances between neighboring products on the same shelf
    const shelvesWithDistances = shelvesWithIndices.map(shelf => {
      // If only one product on the shelf, no distances to calculate
      if (shelf.length <= 1) return shelf;
      
      // Calculate distances between neighboring products
      return shelf.map((product, index) => {
        if (index === 0) {
          // First product, only calculate distance to next
          const distanceToNext = calculateDistance(product, shelf[1]);
          return {
            ...product,
            distanceToNext
          };
        } else if (index === shelf.length - 1) {
          // Last product, only calculate distance to previous
          const distanceToPrevious = calculateDistance(product, shelf[index - 1]);
          return {
            ...product,
            distanceToPrevious
          };
        } else {
          // Middle product, calculate distance to both neighbors
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
    
    console.log('Productos organizados por tarimas con distancias:', shelvesWithDistances);
    setShelfProducts(shelvesWithDistances);
  };

  // Draw bounding boxes on the image
  const drawDetections = (imageSrc, predictions) => {
    if (!imageSrc || !predictions || predictions.length === 0) return;
    
    const image = new Image();
    image.src = imageSrc;
    
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = image.width;
      canvas.height = image.height;
      
      // Draw the original image
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      
      // Group predictions by shelf
      const shelvesPredictions = {};
      predictions.forEach(pred => {
        const shelfIndex = pred.shelfIndex || 0;
        if (!shelvesPredictions[shelfIndex]) {
          shelvesPredictions[shelfIndex] = [];
        }
        shelvesPredictions[shelfIndex].push(pred);
      });
      
      // Draw tarima dividers
      const shelfColors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33'];
      const numShelves = Object.keys(shelvesPredictions).length;
      
      if (numShelves > 1) {
        // Sort shelves by y-coordinate (bottom to top)
        const sortedShelfIndices = Object.keys(shelvesPredictions).sort((a, b) => {
          const avgYA = shelvesPredictions[a].reduce((sum, p) => sum + p.bottomLeft.y, 0) / shelvesPredictions[a].length;
          const avgYB = shelvesPredictions[b].reduce((sum, p) => sum + p.bottomLeft.y, 0) / shelvesPredictions[b].length;
          return avgYB - avgYA; // Descending order (bottom to top)
        });
        
        // Draw dividing lines between tarimas
        for (let i = 0; i < sortedShelfIndices.length - 1; i++) {
          const currentShelf = shelvesPredictions[sortedShelfIndices[i]];
          const nextShelf = shelvesPredictions[sortedShelfIndices[i+1]];
          
          // Calculate average bottom y of current shelf and average top y of next shelf
          const avgBottomY = currentShelf.reduce((sum, p) => sum + p.y1, 0) / currentShelf.length;
          const avgTopY = nextShelf.reduce((sum, p) => sum + p.y2, 0) / nextShelf.length;
          
          // Draw dividing line at midpoint
          const dividerY = Math.round((avgBottomY + avgTopY) / 2);
          
          ctx.beginPath();
          ctx.moveTo(0, dividerY);
          ctx.lineTo(canvas.width, dividerY);
          ctx.strokeStyle = shelfColors[i % shelfColors.length];
          ctx.lineWidth = 3;
          ctx.stroke();
          
          // Add tarima label
          ctx.fillStyle = shelfColors[i % shelfColors.length];
          ctx.font = 'bold 20px Arial';
          ctx.fillText(`Tarima ${parseInt(sortedShelfIndices[i]) + 1}`, 10, dividerY - 10);
        }
        
        // Label for the topmost tarima
        const topIndex = sortedShelfIndices.length - 1;
        const topShelfIndex = sortedShelfIndices[topIndex];
        const topShelf = shelvesPredictions[topShelfIndex];
        const avgTopY = topShelf.reduce((sum, p) => sum + p.y1, 0) / topShelf.length;
        
        ctx.fillStyle = shelfColors[topIndex % shelfColors.length];
        ctx.font = 'bold 20px Arial';
        ctx.fillText(`Tarima ${parseInt(topShelfIndex) + 1}`, 10, avgTopY - 10);
      }
      
      // Draw empty spaces
      Object.keys(shelvesPredictions).forEach(shelfIndex => {
        const shelf = shelvesPredictions[shelfIndex];
        const color = shelfColors[shelfIndex % shelfColors.length];
        
        // Sort products from left to right
        const sortedProducts = [...shelf].sort((a, b) => a.bottomLeft.x - b.bottomLeft.x);
        
        if (sortedProducts.length <= 1) return;
        
        // Calculate distances between adjacent products
        const distances = [];
        for (let i = 0; i < sortedProducts.length - 1; i++) {
          const dist = sortedProducts[i+1].bottomLeft.x - (sortedProducts[i].bottomLeft.x + sortedProducts[i].pixelWidth);
          distances.push(dist);
        }
        
        // Calculate average and standard deviation of distances
        const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
        const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
        const stdDev = Math.sqrt(variance);
        
        // Threshold for "empty" detection
        const emptyThreshold = avgDistance + 1.5 * stdDev;
        
        // Draw empty spaces
        for (let i = 0; i < sortedProducts.length - 1; i++) {
          const prod1 = sortedProducts[i];
          const prod2 = sortedProducts[i+1];
          const dist = prod2.bottomLeft.x - (prod1.bottomLeft.x + prod1.pixelWidth);
          
          if (dist > emptyThreshold) {
            // Draw empty space indicator
            const emptyX = (prod1.bottomLeft.x + prod1.pixelWidth) + dist / 2;
            const emptyY = (prod1.bottomLeft.y + prod2.bottomLeft.y) / 2;
            const emptyHeight = Math.max(prod1.pixelHeight, prod2.pixelHeight);
            
            // Draw vertical dashed line
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.moveTo(emptyX, emptyY - emptyHeight/2);
            ctx.lineTo(emptyX, emptyY + emptyHeight/2);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Draw "EMPTY" text
            ctx.fillStyle = color;
            ctx.font = 'bold 16px Arial';
            ctx.fillText("EMPTY", emptyX - 25, emptyY);
          }
        }
      });
      
      // Draw bounding boxes
      predictions.forEach((pred, index) => {
        const { class: className, confidence, x1, y1, pixelWidth, pixelHeight, shelfIndex, bottomLeft, bottomRight } = pred;
        
        // Generate a color based on shelf index
        const shelfColor = shelfColors[shelfIndex % shelfColors.length];
        
        // Generate a unique color for each product class
        const hue = stringToHue(className);
        const color = `hsl(${hue}, 100%, 50%)`;
        
        // Draw rectangle using absolute coordinates
        ctx.strokeStyle = shelfColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(x1, y1, pixelWidth, pixelHeight);
        
        // Draw product number
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = shelfColor;
        ctx.fillText(`${shelfIndex+1}.${index + 1}`, x1 + 5, y1 + 20);
        
        // Draw product name (only the most relevant part)
        const productName = extractProductName(className);
        
        // Draw label background
        ctx.fillStyle = shelfColor;
        const label = `${productName} ${Math.round(confidence * 100)}%`;
        ctx.font = '14px Arial';
        const textMetrics = ctx.measureText(label);
        const textHeight = 20;
        ctx.fillRect(x1, y1 - textHeight, textMetrics.width + 10, textHeight);
        
        // Draw label text
        ctx.fillStyle = 'white';
        ctx.fillText(label, x1 + 5, y1 - 5);
        
        // Draw bottom corners points
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(bottomLeft.x, bottomLeft.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.arc(bottomRight.x, bottomRight.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Prepare coordinate text
        const coordText = `(${Math.round(bottomLeft.x)}, ${Math.round(bottomLeft.y)})`;
        const coordMetrics = ctx.measureText(coordText);
        
        // Draw coordinate background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(
          bottomLeft.x + 10 - 2, 
          bottomLeft.y - 12, 
          coordMetrics.width + 4, 
          16
        );
        
        // Draw coordinate text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(coordText, bottomLeft.x + 10, bottomLeft.y);
      });
      
      // AHORA DIBUJAMOS LOS PUNTOS POR ENCIMA DE TODO LO DEMÁS
      predictions.forEach(pred => {
        // Dibujar punto en el centro inferior
        ctx.beginPath();
        ctx.arc(pred.bottomLeft.x, pred.bottomLeft.y, 15, 0, 2 * Math.PI);
        ctx.fillStyle = '#FF0000'; // Rojo para mayor visibilidad
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Dibujar punto en la esquina inferior izquierda
        ctx.beginPath();
        ctx.arc(pred.bottomLeft.x, pred.bottomLeft.y, 10, 0, 2 * Math.PI);
        ctx.fillStyle = '#00FF00'; // Verde
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Dibujar punto en la esquina inferior derecha
        ctx.beginPath();
        ctx.arc(pred.bottomRight.x, pred.bottomRight.y, 10, 0, 2 * Math.PI);
        ctx.fillStyle = '#0000FF'; // Azul
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Añadir etiquetas a los puntos
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeText("C", pred.bottomLeft.x - 5, pred.bottomLeft.y + 5);
        ctx.fillText("C", pred.bottomLeft.x - 5, pred.bottomLeft.y + 5);
        ctx.strokeText("L", pred.bottomLeft.x - 5, pred.bottomLeft.y + 5);
        ctx.fillText("L", pred.bottomLeft.x - 5, pred.bottomLeft.y + 5);
        ctx.strokeText("R", pred.bottomRight.x - 5, pred.bottomRight.y + 5);
        ctx.fillText("R", pred.bottomRight.x - 5, pred.bottomRight.y + 5);
        
        // Añadir coordenadas de manera más visible
        const coordText = `(${Math.round(pred.bottomLeft.x)}, ${Math.round(pred.bottomLeft.y)})`;
        ctx.font = 'bold 12px Arial';
        
        // Fondo para el texto de coordenadas
        const coordMetrics = ctx.measureText(coordText);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(
          pred.bottomLeft.x + 20 - 2, 
          pred.bottomLeft.y - 12, 
          coordMetrics.width + 4, 
          16
        );
        
        // Texto de coordenadas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(coordText, pred.bottomLeft.x + 20, pred.bottomLeft.y);
      });
      
      // Set the result image
      setResultImage(canvas.toDataURL('image/jpeg'));
    };
  };
  
  // Helper function to generate a consistent hue from a string
  const stringToHue = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash % 360;
  };

  // Export data as JSON
  const exportData = () => {
    if (!shelfProducts || !nestedArray) return;
    
    const data = {
      imageSize,
      // El array anidado con espacios vacíos
      simplifiedArray: nestedArray,
      // El array anidado solo con nombres de productos
      namesArray: namesArray,
      // El array anidado con códigos de barras
      barcodesArray: barcodesArray,
      // El array con posiciones
      positionsArray: positionsArray,
      // Información detallada de los estantes con coordenadas
      detailedShelves: shelfProducts.map((shelf, shelfIndex) => {
        return {
          shelfIndex,
          products: shelf.map(product => ({
            name: extractProductName(product.class),
            barcode: extractBarcode(product.class),
            fullClass: product.class,
            confidence: product.confidence,
            coordinates: {
              center: { x: product.pixelX, y: product.pixelY },
              bottomLeft: product.bottomLeft,
              width: product.pixelWidth,
              height: product.pixelHeight
            }
          }))
        };
      })
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'productos_detect.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Get nested array as string for display
  const getNestedArrayString = () => {
    if (!nestedArray) return '';
    return JSON.stringify(nestedArray, null, 2);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="App-title">Detector de Productos OXXO</h1>
      </header>
      
      <main className="detection-container">
        <div className="image-upload">
          <form onSubmit={handleSubmit}>
            <div 
              className="file-input-container"
              onClick={handleContainerClick}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <UploadIcon />
              <p>Arrastra una imagen o haz clic para seleccionar</p>
              <input 
                ref={fileInputRef}
                type="file" 
                className="file-input" 
                accept="image/jpeg,image/png,image/gif" 
                onChange={handleFileChange}
              />
              <p>Formatos aceptados: JPG, PNG, GIF</p>
            </div>
            
            {preview && (
              <div className="preview-container">
                <img src={preview} alt="Vista previa" className="selected-image" />
                {imageSize && (
                  <p>Dimensiones: {imageSize.width} x {imageSize.height} px</p>
                )}
              </div>
            )}
            
            <button 
              type="submit" 
              className="btn" 
              disabled={!selectedFile || loading || !imageSize}
            >
              {loading ? 'Procesando...' : 'Detectar Productos'}
            </button>
          </form>
          
          {error && <p className="error">{error}</p>}
          
          {loading && (
            <div className="loading">
              <p>Procesando imagen...</p>
            </div>
          )}
        </div>
        
        {resultImage && (
          <div className="results-container">
            <h3>Imagen con detecciones:</h3>
            <img src={resultImage} alt="Imagen con detecciones" className="detection-image" />
          </div>
        )}
        
        {nestedArray && (
          <div className="results-container">
            <div className="header-with-button">
              <h3>Arrays Anidados:</h3>
              <button type="button" onClick={exportData} className="export-btn">
                Exportar datos JSON
              </button>
            </div>
            <div className="nested-array-container">
              <h4>Array de productos (sin espacios vacíos):</h4>
              <p>Solo muestra los nombres de los productos detectados.</p>
              {namesArray && <pre className="code-display">{JSON.stringify(namesArray, null, 2)}</pre>}
              
              <h4>Array con detección de espacios vacíos:</h4>
              <p>Incluye el tag "EMPTY" donde se ha detectado un espacio vacío entre productos.</p>
              <pre className="code-display">{getNestedArrayString()}</pre>
              
              {barcodesArray && (
                <>
                  <h4>Array de códigos de barras con espacios vacíos:</h4>
                  <p>Incluye el código de barras y el tag "EMPTY" donde hay espacios vacíos.</p>
                  <pre className="code-display">{JSON.stringify(barcodesArray, null, 2)}</pre>
                </>
              )}
              
              {positionsArray && (
                <>
                  <h4>Array con detección de espacios vacíos y posiciones:</h4>
                  <p>Incluye el tag "EMPTY" y la posición x,y de cada producto.</p>
                  <pre className="code-display">{JSON.stringify(positionsArray, null, 2)}</pre>
                </>
              )}
            </div>
          </div>
        )}
        
        {shelfProducts && (
          <div className="results-container">
            <div className="header-with-button">
              <h3>Productos por tarima (de abajo hacia arriba, de izquierda a derecha):</h3>
              <button type="button" onClick={exportData} className="export-btn">
                Exportar datos JSON
              </button>
            </div>
            
            {shelfProducts.map((shelf, shelfIndex) => (
              <div key={shelfIndex} className="shelf-container">
                <h4 className="shelf-title">Tarima {shelfIndex + 1} ({shelf.length} productos)</h4>
                <ul>
                  {shelf.map((product, productIndex) => (
                    <li key={productIndex} className="product-item">
                      <div className="product-info">
                        <span className="product-name">{productIndex + 1}. {extractProductName(product.class)}</span>
                        <span className="product-confidence">{Math.round(product.confidence * 100)}%</span>
                      </div>
                      
                      <div className="product-coords">
                        <strong>Coordenadas (pixels):</strong> 
                        <span>Centro: ({product.pixelX}, {product.pixelY})</span>
                        <span>Ancho: {product.pixelWidth}px, Alto: {product.pixelHeight}px</span>
                        <span>Borde inferior izquierdo: ({Math.round(product.bottomLeft.x)}, {Math.round(product.bottomLeft.y)})</span>
                        <span>Borde inferior derecho: ({Math.round(product.bottomRight.x)}, {Math.round(product.bottomRight.y)})</span>
                      </div>
                      
                      {product.distanceToPrevious && (
                        <div className="product-distance">
                          <strong>Distancia al producto anterior:</strong>
                          <span>Horizontal: {product.distanceToPrevious.horizontal}px</span>
                          {product.distanceToPrevious.horizontal > shelf.reduce((sum, p) => sum + (p.distanceToPrevious?.horizontal || 0), 0) / shelf.filter(p => p.distanceToPrevious).length * 1.5 && (
                            <span className="empty-indicator">⚠️ Posible espacio vacío</span>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        
        {results && !shelfProducts && (
          <div className="results-container">
            <h3>Productos Detectados: {results.predictions ? results.predictions.length : 0}</h3>
            
            {results.predictions && results.predictions.length > 0 ? (
              <ul className="product-list">
                {results.predictions.map((pred, index) => (
                  <li key={index} className="product-item">
                    <div className="product-info">
                      <span className="product-name">{pred.class}</span>
                      <span className="product-confidence">{Math.round(pred.confidence * 100)}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No se detectaron productos en la imagen</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App; 