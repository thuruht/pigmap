import Map from 'ol/Map.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import {fromLonLat, toLonLat} from 'ol/proj.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import {Circle, Fill, Stroke, Style, Text} from 'ol/style.js';
import Overlay from 'ol/Overlay.js';
import Geolocation from 'ol/Geolocation.js';
import {v4 as uuidv4} from 'uuid';
import XYZ from 'ol/source/XYZ.js';

// Internationalization support
let currentLanguage = 'en';
let translations = {};

// Function to load translations
async function loadTranslations(lang) {
  try {
    const response = await fetch(`/api/translations/${lang}`);
    if (response.ok) {
      translations = await response.json();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error loading translations:', error);
    return false;
  }
}

// Function to translate the UI
function translateUI() {
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translatedText = getTranslatedText(key);
    if (translatedText) {
      element.textContent = translatedText;
    }
  });
  
  // Update all elements with data-i18n-placeholder attribute
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    const translatedText = getTranslatedText(key);
    if (translatedText) {
      element.setAttribute('placeholder', translatedText);
    }
  });
  
  // Update all elements with data-i18n-aria-label attribute
  document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
    const key = element.getAttribute('data-i18n-aria-label');
    const translatedText = getTranslatedText(key);
    if (translatedText) {
      element.setAttribute('aria-label', translatedText);
    }
  });
  
  // Update all form labels
  document.querySelectorAll('label').forEach(label => {
    if (label.getAttribute('data-i18n')) {
      const key = label.getAttribute('data-i18n');
      const translatedText = getTranslatedText(key);
      if (translatedText) {
        // If it's a required field, add the required indicator
        if (label.classList.contains('required')) {
          const requiredText = getTranslatedText('accessibility.requiredField');
          label.setAttribute('aria-label', `${translatedText} (${requiredText})`);
        }
      }
    }
  });
  
  // Update the skip link
  const skipLink = document.querySelector('.skip-link');
  if (skipLink) {
    const key = skipLink.getAttribute('data-i18n');
    const translatedText = getTranslatedText(key);
    if (translatedText) {
      skipLink.textContent = translatedText;
    }
  }
  
  // Update the html lang attribute
  document.documentElement.lang = currentLanguage;
  
  // Ensure ARIA landmarks have translated labels
  const mapRegion = document.getElementById('map');
  if (mapRegion) {
    mapRegion.setAttribute('aria-label', getTranslatedText('accessibility.map'));
  }
  
  const controlsRegion = document.querySelector('.controls');
  if (controlsRegion) {
    controlsRegion.setAttribute('aria-label', getTranslatedText('accessibility.mapControls'));
  }
  
  // Update the form dialog aria-label
  const reportForm = document.getElementById('report-form');
  if (reportForm) {
    reportForm.setAttribute('aria-label', getTranslatedText('accessibility.reportDialog'));
  }
}

// Function to get translated text from a key
function getTranslatedText(key) {
  const parts = key.split('.');
  let result = translations;
  
  for (const part of parts) {
    if (result && result[part] !== undefined) {
      result = result[part];
    } else {
      return null;
    }
  }
  
  return result;
}

// Initialize language and accessibility features
function initializeLanguage() {
  // Check localStorage first
  const savedLanguage = localStorage.getItem('pigmap-language');
  
  if (savedLanguage) {
    currentLanguage = savedLanguage;
  } else {
    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    const supportedLanguages = ['en', 'es', 'ht', 'zh', 'vi', 'ar', 'am', 'sw', 'so', 'fa', 'fr', 'ne', 'kar', 'my', 'pt', 'ur', 'ku'];
    if (supportedLanguages.includes(browserLang)) {
      currentLanguage = browserLang;
    }
  }
  
  // Update language selector
  const languageSelector = document.getElementById('language-selector');
  if (languageSelector) {
    languageSelector.value = currentLanguage;
    
    // Add aria-label with language name
    const selectedOption = languageSelector.options[languageSelector.selectedIndex];
    if (selectedOption) {
      languageSelector.setAttribute('aria-label', `Select language - currently ${selectedOption.text}`);
    }
  }
  
  // Set RTL direction for Arabic and Farsi
  setDocumentDirection(currentLanguage);
  
  // Load translations and update UI
  loadTranslations(currentLanguage).then(success => {
    if (success) {
      translateUI();
      
      // Initialize accessibility features after translations are loaded
      setupMapKeyboardAccessibility();
      setupFormAccessibility();
      
      // Announce language change to screen readers
      if (languageSelector) {
        const selectedOption = languageSelector.options[languageSelector.selectedIndex];
        if (selectedOption) {
          const ariaLive = document.createElement('div');
          ariaLive.setAttribute('aria-live', 'polite');
          ariaLive.className = 'sr-only';
          ariaLive.textContent = `Language changed to ${selectedOption.text}`;
          document.body.appendChild(ariaLive);
          
          setTimeout(() => {
            document.body.removeChild(ariaLive);
          }, 3000);
        }
      }
    }
  });
}

// Function to set document direction based on language
function setDocumentDirection(lang) {
  // RTL languages
  const rtlLanguages = ['ar', 'fa', 'ur', 'ku'];
  
  if (rtlLanguages.includes(lang)) {
    document.documentElement.dir = 'rtl';
    document.body.classList.add('rtl');
  } else {
    document.documentElement.dir = 'ltr';
    document.body.classList.remove('rtl');
  }
}

// Custom neutral style map tiles using Stamen Terrain
const tileLayer = new TileLayer({
  source: new XYZ({
    url: 'https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg',
    attributions: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.',
    maxZoom: 18
  })
});

// Initialize the map
const map = new Map({
  target: 'map',
  layers: [tileLayer],
  view: new View({
    center: fromLonLat([-98.5795, 39.8283]), // Center on US
    zoom: 4
  })
});

// Create a vector source and layer for livestock markers
const vectorSource = new VectorSource();
const vectorLayer = new VectorLayer({
  source: vectorSource,
  style: (feature) => {
    const type = feature.get('type') || 'pig';
    const count = feature.get('count') || 1;
    const timestamp = feature.get('timestamp') || Date.now();
    
    // Age-based rendering - fresher sightings are more opaque
    const ageInHours = (Date.now() - timestamp) / (1000 * 60 * 60);
    const opacity = Math.max(0.3, Math.min(1, 1 - (ageInHours / 48))); // Fade over 48 hours
    
    // Icon scale based on count
    const scale = Math.min(1.5, 0.8 + (count * 0.1));
    
    // Get the appropriate emoji based on livestock type
    let emoji = '🐖'; // Default pig
    if (type === 'cow') emoji = '🐄';
    else if (type === 'sheep') emoji = '🐑';
    else if (type === 'goat') emoji = '🐐';
    else if (type === 'horse') emoji = '🐎';
    else if (type === 'other') emoji = '🐾';
    
    return new Style({
      image: new Circle({
        radius: 18 * scale,
        fill: new Fill({
          color: 'rgba(255, 255, 255, ' + opacity + ')'
        }),
        stroke: new Stroke({
          color: `rgba(46, 125, 50, ${opacity})`, // Dark green from our color scheme
          width: 3
        })
      }),
      text: new Text({
        text: emoji,
        scale: 1.2 * scale,
        offsetY: 1,
        fill: new Fill({
          color: 'rgba(0, 0, 0, ' + opacity + ')'
        })
      })
    });
  }
});

map.addLayer(vectorLayer);

// Create popup overlay
const popupContainer = document.createElement('div');
popupContainer.className = 'popup';
const popup = new Overlay({
  element: popupContainer,
  positioning: 'bottom-center',
  stopEvent: false,
  offset: [0, -10],
  autoPan: true,
  autoPanAnimation: {
    duration: 250
  }
});
map.addOverlay(popup);

// Create geolocation service
const geolocation = new Geolocation({
  trackingOptions: {
    enableHighAccuracy: true
  },
  projection: map.getView().getProjection()
});

// Add position marker
const positionFeature = new Feature();
positionFeature.setStyle(new Style({
  image: new Circle({
    radius: 10,
    fill: new Fill({
      color: '#3399CC'
    }),
    stroke: new Stroke({
      color: '#fff',
      width: 2
    })
  })
}));

const accuracyFeature = new Feature();
new VectorLayer({
  source: new VectorSource({
    features: [accuracyFeature, positionFeature]
  })
}).setMap(map);

// Handle geolocation changes
geolocation.on('change:position', () => {
  const coordinates = geolocation.getPosition();
  positionFeature.setGeometry(coordinates ? new Point(coordinates) : null);
  
  // Center the map on user's position
  if (coordinates) {
    map.getView().animate({
      center: coordinates,
      zoom: 14,
      duration: 1000
    });
  }
});

geolocation.on('change:accuracyGeometry', () => {
  accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
});

// Handle "Find Me" button
document.getElementById('find-me').addEventListener('click', () => {
  geolocation.setTracking(true);
});

// Handle clicking on livestock markers
map.on('click', (event) => {
  const feature = map.forEachFeatureAtPixel(event.pixel, (feature) => feature);
  
  if (feature && feature !== positionFeature && feature !== accuracyFeature) {
    const coordinates = feature.getGeometry().getCoordinates();
    const type = feature.get('type') || 'unknown';
    const count = feature.get('count') || 1;
    const comment = feature.get('comment') || '';
    const timestamp = feature.get('timestamp') || Date.now();
    const imageUrl = feature.get('imageUrl');
    
    // Format the timestamp
    const date = new Date(timestamp);
    const formattedDate = date.toLocaleString(currentLanguage.replace('_', '-'));
    
    // Get translated terms
    const spottedText = getTranslatedText('popup.spotted') || 'spotted';
    const reportedText = getTranslatedText('popup.reported') || 'Reported';
    
    // Get translated animal type if available
    const translatedType = getTranslatedText(`reportForm.animalTypes.${type}`) || type;
    
    // Build popup content
    let content = `
      <h3>${count} ${translatedType}${count > 1 ? 's' : ''} ${spottedText}</h3>
      <p>${comment}</p>
      <p><small>${reportedText}: ${formattedDate}</small></p>
    `;
    
    if (imageUrl) {
      content += `<img src="${imageUrl}" alt="${translatedType} sighting">`;
    }
    
    popupContainer.innerHTML = content;
    popup.setPosition(coordinates);
  } else {
    popup.setPosition(undefined);
  }
});

// Variables for report form
let reportMarker = null;
const reportForm = document.getElementById('report-form');
const reportButton = document.getElementById('report-btn');
const cancelButton = document.getElementById('cancel-report');
const sightingForm = document.getElementById('sighting-form');
let tempFeature = null;

// Show report form
reportButton.addEventListener('click', () => {
  reportForm.classList.remove('hidden');
  
  // Create temporary feature for placing on map
  if (!tempFeature) {
    tempFeature = new Feature({
      geometry: new Point(map.getView().getCenter())
    });
    tempFeature.setStyle(new Style({
      image: new Circle({
        radius: 10,
        fill: new Fill({
          color: '#ff0000'
        }),
        stroke: new Stroke({
          color: '#ffffff',
          width: 2
        })
      })
    }));
    vectorSource.addFeature(tempFeature);
  }
  
  // Enable click on map to place marker
  map.on('click', placeMarker);
});

// Hide report form
cancelButton.addEventListener('click', () => {
  reportForm.classList.add('hidden');
  map.un('click', placeMarker);
  
  // Remove temporary feature
  if (tempFeature) {
    vectorSource.removeFeature(tempFeature);
    tempFeature = null;
  }
});

// Place marker on map click
function placeMarker(event) {
  if (tempFeature) {
    tempFeature.setGeometry(new Point(event.coordinate));
  }
}

// Handle form submission
sightingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  // Get form values
  const livestockType = document.getElementById('livestock-type').value;
  const comment = document.getElementById('comment').value;
  const mediaFile = document.getElementById('media-upload').files[0];
  
  // Get coordinates from tempFeature or user's location
  let coordinates;
  if (tempFeature) {
    coordinates = toLonLat(tempFeature.getGeometry().getCoordinates());
  } else if (geolocation.getPosition()) {
    coordinates = toLonLat(geolocation.getPosition());
  } else {
    alert('Please drop a pin on the map or use your location.');
    return;
  }
  
  // Prepare data
  const reportData = {
    id: uuidv4(),
    type: livestockType,
    count: 1, // Default to 1
    comment: comment,
    longitude: coordinates[0],
    latitude: coordinates[1],
    timestamp: Date.now()
  };
  
  // Create FormData for file upload
  const formData = new FormData();
  formData.append('report', JSON.stringify(reportData));
  if (mediaFile) {
    formData.append('media', mediaFile);
  }
  
  try {
    // Submit to our worker
    const response = await fetch('/api/reports', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      // Add to map immediately (optimistic UI)
      const newFeature = new Feature({
        geometry: new Point(fromLonLat([reportData.longitude, reportData.latitude])),
        type: reportData.type,
        count: reportData.count,
        comment: reportData.comment,
        timestamp: reportData.timestamp
      });
      vectorSource.addFeature(newFeature);
      
      // Hide form and clean up
      reportForm.classList.add('hidden');
      map.un('click', placeMarker);
      if (tempFeature) {
        vectorSource.removeFeature(tempFeature);
        tempFeature = null;
      }
      
      // Reset form
      sightingForm.reset();
      
      // Show success message
      const successMessage = getTranslatedText('notifications.success') || 'Report submitted successfully!';
      showNotification(successMessage);
    } else {
      const errorMessage = getTranslatedText('notifications.error') || 'Error submitting report. Please try again.';
      showNotification(errorMessage, 'error');
    }
  } catch (error) {
    console.error('Error submitting report:', error);
    const errorMessage = getTranslatedText('notifications.error') || 'Error submitting report. Please try again.';
    showNotification(errorMessage, 'error');
  }
});

// Function to fetch reports from the server
async function fetchReports() {
  try {
    const response = await fetch('/api/reports');
    if (response.ok) {
      const reports = await response.json();
      
      // Clear existing features except temp marker
      const features = vectorSource.getFeatures();
      for (const feature of features) {
        if (feature !== tempFeature && feature !== positionFeature && feature !== accuracyFeature) {
          vectorSource.removeFeature(feature);
        }
      }
      
      // Add reports to map
      for (const report of reports) {
        const feature = new Feature({
          geometry: new Point(fromLonLat([report.longitude, report.latitude])),
          type: report.type,
          count: report.count,
          comment: report.comment,
          timestamp: report.timestamp,
          imageUrl: report.imageUrl
        });
        vectorSource.addFeature(feature);
      }
    }
  } catch (error) {
    console.error('Error fetching reports:', error);
  }
}

// Function to fetch region information
async function fetchRegionInfo() {
  try {
    const response = await fetch('/api/region');
    if (response.ok) {
      const regionInfo = await response.json();
      
      // Update map center and zoom based on region
      if (regionInfo.center && regionInfo.zoom) {
        map.getView().setCenter(fromLonLat([regionInfo.center.lon, regionInfo.center.lat]));
        map.getView().setZoom(regionInfo.zoom);
      }
      
      // Set preferred language if not already set by user
      if (!localStorage.getItem('pigmap-language')) {
        // Use the region's default language, or first recommended language, or English
        const preferredLang = regionInfo.defaultLanguage || 
                             (regionInfo.recommendedLanguages && regionInfo.recommendedLanguages.length > 0 ? 
                              regionInfo.recommendedLanguages[0] : 'en');
        changeLanguage(preferredLang);
      }
      
      // Prioritize recommended languages in the language selector if available
      if (regionInfo.recommendedLanguages && regionInfo.recommendedLanguages.length > 0) {
        highlightRecommendedLanguages(regionInfo.recommendedLanguages);
      }
      
      return regionInfo;
    }
  } catch (error) {
    console.error('Error fetching region information:', error);
  }
  
  return null;
}

// Set up WebSocket for real-time updates
function setupWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/api/live`;
  
  const socket = new WebSocket(wsUrl);
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'initial') {
        // Handle initial data load - replace existing features
        const features = vectorSource.getFeatures();
        for (const feature of features) {
          if (feature !== tempFeature && feature !== positionFeature && feature !== accuracyFeature) {
            vectorSource.removeFeature(feature);
          }
        }
        
        // Add all reports
        for (const report of data.reports) {
          const feature = new Feature({
            geometry: new Point(fromLonLat([report.longitude, report.latitude])),
            type: report.type,
            count: report.count || 1,
            comment: report.comment || '',
            timestamp: report.timestamp,
            imageUrl: report.imageUrl
          });
          vectorSource.addFeature(feature);
        }
      } else if (data.type === 'update') {
        // Add single new report
        const report = data.report;
        const feature = new Feature({
          geometry: new Point(fromLonLat([report.longitude, report.latitude])),
          type: report.type,
          count: report.count || 1,
          comment: report.comment || '',
          timestamp: report.timestamp,
          imageUrl: report.imageUrl
        });
        vectorSource.addFeature(feature);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  };
  
  socket.onclose = () => {
    // Reconnect after 5 seconds
    setTimeout(setupWebSocket, 5000);
  };
}

// Function to change the current language
async function changeLanguage(lang) {
  if (lang) {
    currentLanguage = lang;
    // Save language preference
    localStorage.setItem('pigmap-language', currentLanguage);
    
    // Set RTL direction if needed
    setDocumentDirection(currentLanguage);
    
    // Update language selector
    const languageSelector = document.getElementById('language-selector');
    if (languageSelector) {
      languageSelector.value = currentLanguage;
    }
    
    // Load new translations
    const success = await loadTranslations(currentLanguage);
    if (success) {
      translateUI();
    }
  }
}

// Function to highlight recommended languages in the selector
function highlightRecommendedLanguages(recommendedLanguages) {
  const languageSelector = document.getElementById('language-selector');
  if (!languageSelector) return;
  
  // Reset all options first (remove any previous highlighting)
  Array.from(languageSelector.options).forEach(option => {
    const currentText = option.textContent;
    option.textContent = currentText.replace('★ ', '');
    option.classList.remove('recommended-language');
  });
  
  // Add a visual indicator to recommended languages
  Array.from(languageSelector.options).forEach(option => {
    const langCode = option.value;
    if (recommendedLanguages.includes(langCode)) {
      // Add a star to show it's recommended for this region
      const currentText = option.textContent;
      if (!currentText.includes('★')) {
        option.textContent = '★ ' + currentText;
      }
      option.classList.add('recommended-language');
    }
  });
}

// Function to fetch available languages and populate the selector
async function fetchAvailableLanguages() {
  try {
    const response = await fetch('/api/translations');
    if (response.ok) {
      const data = await response.json();
      const languageSelector = document.getElementById('language-selector');
      
      if (languageSelector && data.languages && data.languages.length > 0) {
        // Clear existing options
        languageSelector.innerHTML = '';
        
        // Add options for each available language
        data.languages.forEach(lang => {
          const option = document.createElement('option');
          option.value = lang.code;
          option.textContent = lang.name;
          
          // Mark recommended languages
          if (lang.recommended) {
            option.textContent = '★ ' + lang.name;
            option.classList.add('recommended-language');
          }
          
          languageSelector.appendChild(option);
        });
        
        // Set the current language
        languageSelector.value = currentLanguage;
      }
    }
  } catch (error) {
    console.error('Error fetching available languages:', error);
  }
}

// Enhanced notification function with accessibility support
function showNotification(message, type = 'success') {
  const container = document.getElementById('notification-container');
  container.innerHTML = '';
  container.classList.remove('hidden');
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Ensure screen readers announce this
  notification.setAttribute('role', 'alert');
  
  container.appendChild(notification);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      container.classList.add('hidden');
    }, 300);
  }, 5000);
}

// Function to enhance keyboard accessibility for the map
function setupMapKeyboardAccessibility() {
  const mapElement = document.getElementById('map');
  
  // Make map focusable
  mapElement.setAttribute('tabindex', '0');
  
  // Add keyboard event listeners for map navigation
  mapElement.addEventListener('keydown', (e) => {
    const key = e.key;
    const view = map.getView();
    const center = view.getCenter();
    const zoom = view.getZoom();
    const panAmount = 100; // Amount to pan in pixels
    
    switch (key) {
      case 'ArrowUp':
        e.preventDefault();
        map.pan(0, panAmount);
        break;
      case 'ArrowDown':
        e.preventDefault();
        map.pan(0, -panAmount);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        map.pan(panAmount, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        map.pan(-panAmount, 0);
        break;
      case '+':
      case '=':
        e.preventDefault();
        view.setZoom(zoom + 1);
        break;
      case '-':
        e.preventDefault();
        view.setZoom(zoom - 1);
        break;
      case 'Home':
        e.preventDefault();
        // Reset to initial view
        view.setCenter(fromLonLat([-98.5795, 39.8283]));
        view.setZoom(4);
        break;
    }
  });
  
  // Add a focus/blur indicator
  mapElement.addEventListener('focus', () => {
    mapElement.style.outline = '3px solid #ffbf00';
    
    // Announce to screen readers
    const ariaLive = document.createElement('div');
    ariaLive.setAttribute('aria-live', 'polite');
    ariaLive.className = 'sr-only';
    ariaLive.textContent = getTranslatedText('accessibility.map') + '. ' +
                         getTranslatedText('accessibility.mapKeyboardControls');
    document.body.appendChild(ariaLive);
    
    setTimeout(() => {
      document.body.removeChild(ariaLive);
    }, 3000);
  });
  
  mapElement.addEventListener('blur', () => {
    mapElement.style.outline = 'none';
  });
}

// Function to enhance form accessibility
function setupFormAccessibility() {
  // Make the report form accessible via keyboard
  const reportForm = document.getElementById('report-form');
  const reportButton = document.getElementById('report-btn');
  const cancelButton = document.getElementById('cancel-report');
  
  if (reportButton && reportForm && cancelButton) {
    // Trap focus within the form when it's open
    reportForm.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close the form on Escape key
        reportForm.classList.add('hidden');
        reportButton.focus(); // Return focus to the button that opened it
      } else if (e.key === 'Tab') {
        // Get all focusable elements
        const focusableElements = reportForm.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // If shift+tab on first element, go to last element
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
        // If tab on last element, go to first element
        else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
    
    // When opening the form, focus on the first input
    reportButton.addEventListener('click', () => {
      setTimeout(() => {
        const firstInput = reportForm.querySelector('select, input, textarea');
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
    });
    
    // Announce when form is opened
    reportButton.addEventListener('click', () => {
      const ariaLive = document.createElement('div');
      ariaLive.setAttribute('aria-live', 'assertive');
      ariaLive.className = 'sr-only';
      ariaLive.textContent = getTranslatedText('reportForm.title') + ' ' + 
                           getTranslatedText('accessibility.formOpened');
      document.body.appendChild(ariaLive);
      
      setTimeout(() => {
        document.body.removeChild(ariaLive);
      }, 3000);
    });
  }
  
  // Add additional accessibility enhancements to the form inputs
  const livestockType = document.getElementById('livestock-type');
  const comment = document.getElementById('comment');
  const mediaUpload = document.getElementById('media-upload');
  
  // Enhanced error states with aria-invalid
  if (livestockType) {
    livestockType.addEventListener('change', () => {
      if (livestockType.validity.valid) {
        livestockType.setAttribute('aria-invalid', 'false');
      } else {
        livestockType.setAttribute('aria-invalid', 'true');
      }
    });
  }
  
  if (comment) {
    comment.addEventListener('input', () => {
      if (comment.validity.valid) {
        comment.setAttribute('aria-invalid', 'false');
      } else {
        comment.setAttribute('aria-invalid', 'true');
      }
    });
    
    // Add character count feedback
    comment.addEventListener('input', () => {
      const maxLength = 500; // Set your max length
      const currentLength = comment.value.length;
      const remainingChars = maxLength - currentLength;
      
      let feedbackElement = comment.nextElementSibling;
      if (!feedbackElement || !feedbackElement.classList.contains('char-count')) {
        feedbackElement = document.createElement('div');
        feedbackElement.className = 'char-count sr-only';
        feedbackElement.setAttribute('aria-live', 'polite');
        comment.parentNode.insertBefore(feedbackElement, comment.nextSibling);
      }
      
      feedbackElement.textContent = `${currentLength} characters used, ${remainingChars} remaining`;
    });
  }
}

// Make map features accessible
function addAccessibilityToFeatures() {
  // Add meaningful information to map features for screen readers
  vectorSource.getFeatures().forEach(feature => {
    const type = feature.get('type');
    const count = feature.get('count') || 1;
    const date = new Date(feature.get('timestamp')).toLocaleDateString();
    
    // Translated type
    const typeKey = `reportForm.animalTypes.${type}`;
    let animalType = getTranslatedText(typeKey);
    
    // Fallback if translation not found
    if (!animalType) {
      animalType = type;
    }
    
    // Create accessible description
    const description = `${count} ${animalType} ${getTranslatedText('popup.spotted')} ${getTranslatedText('popup.reported')} ${date}`;
    
    // Set these properties on the feature for use by screen readers
    feature.set('aria-label', description);
    feature.set('role', 'button');
  });
}

// Function to handle feature click with accessibility enhancements
function handleFeatureClick(evt) {
  const feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => feature);
  
  if (feature && feature !== positionFeature && feature !== accuracyFeature) {
    const coordinates = feature.getGeometry().getCoordinates();
    const type = feature.get('type') || 'unknown';
    const count = feature.get('count') || 1;
    const comment = feature.get('comment') || '';
    const timestamp = feature.get('timestamp') || Date.now();
    const imageUrl = feature.get('imageUrl');
    
    // Format the timestamp
    const date = new Date(timestamp);
    const formattedDate = date.toLocaleString(currentLanguage.replace('_', '-'));
    
    // Get translated terms
    const spottedText = getTranslatedText('popup.spotted') || 'spotted';
    const reportedText = getTranslatedText('popup.reported') || 'Reported';
    
    // Get translated animal type if available
    const translatedType = getTranslatedText(`reportForm.animalTypes.${type}`) || type;
    
    // Build popup content
    let content = `
      <h3>${count} ${translatedType}${count > 1 ? 's' : ''} ${spottedText}</h3>
      <p>${comment}</p>
      <p><small>${reportedText}: ${formattedDate}</small></p>
    `;
    
    if (imageUrl) {
      content += `<img src="${imageUrl}" alt="${translatedType} sighting">`;
    }
    
    popupContainer.innerHTML = content;
    popup.setPosition(coordinates);
    
    // Add a notification for screen readers
    const ariaLabel = feature.get('aria-label');
    if (ariaLabel) {
      const ariaLive = document.createElement('div');
      ariaLive.setAttribute('aria-live', 'polite');
      ariaLive.className = 'sr-only';
      ariaLive.textContent = ariaLabel;
      document.body.appendChild(ariaLive);
      
      setTimeout(() => {
        document.body.removeChild(ariaLive);
      }, 3000);
    }
  } else {
    popup.setPosition(undefined);
  }
}

// Setup global keyboard shortcuts
function setupGlobalKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Alt+F - Find my location
    if (e.altKey && e.key === 'f') {
      e.preventDefault();
      document.getElementById('find-me').click();
    }
    
    // Alt+R - Report livestock
    if (e.altKey && e.key === 'r') {
      e.preventDefault();
      document.getElementById('report-btn').click();
    }
    
    // Alt+L - Focus on language selector
    if (e.altKey && e.key === 'l') {
      e.preventDefault();
      const languageSelector = document.getElementById('language-selector');
      if (languageSelector) {
        languageSelector.focus();
      }
    }
  });
}

// Call this function during initialization
document.addEventListener('DOMContentLoaded', () => {
  setupGlobalKeyboardShortcuts();
  
  // Create a keyboard shortcut guide that appears when pressing Alt+?
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === '?') {
      e.preventDefault();
      
      // Create and show keyboard shortcut help
      let helpDialog = document.getElementById('keyboard-help-dialog');
      
      if (!helpDialog) {
        helpDialog = document.createElement('div');
        helpDialog.id = 'keyboard-help-dialog';
        helpDialog.className = 'accessibility-help-dialog';
        helpDialog.setAttribute('role', 'dialog');
        helpDialog.setAttribute('aria-modal', 'true');
        helpDialog.setAttribute('aria-labelledby', 'keyboard-help-title');
        
        const helpContent = document.createElement('div');
        helpContent.className = 'dialog-content';
        
        const title = document.createElement('h2');
        title.id = 'keyboard-help-title';
        title.textContent = 'Keyboard Shortcuts';
        
        const shortcuts = document.createElement('ul');
        shortcuts.innerHTML = `
          <li><kbd>Alt</kbd> + <kbd>F</kbd> - Find my location</li>
          <li><kbd>Alt</kbd> + <kbd>R</kbd> - Report livestock</li>
          <li><kbd>Alt</kbd> + <kbd>L</kbd> - Focus on language selector</li>
          <li><kbd>Alt</kbd> + <kbd>?</kbd> - Show this help dialog</li>
          <li><kbd>Tab</kbd> - Navigate between elements</li>
          <li><kbd>Enter</kbd> or <kbd>Space</kbd> - Activate buttons and controls</li>
          <li><kbd>Escape</kbd> - Close dialogs</li>
        `;
        
        const mapHelp = document.createElement('h3');
        mapHelp.textContent = 'Map Navigation';
        
        const mapShortcuts = document.createElement('ul');
        mapShortcuts.innerHTML = `
          <li>Focus the map with <kbd>Tab</kbd>, then:</li>
          <li><kbd>Arrow keys</kbd> - Pan the map</li>
          <li><kbd>+</kbd> - Zoom in</li>
          <li><kbd>-</kbd> - Zoom out</li>
          <li><kbd>Home</kbd> - Reset view</li>
        `;
        
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', () => {
          helpDialog.style.display = 'none';
        });
        
        helpContent.appendChild(title);
        helpContent.appendChild(shortcuts);
        helpContent.appendChild(mapHelp);
        helpContent.appendChild(mapShortcuts);
        helpContent.appendChild(closeButton);
        helpDialog.appendChild(helpContent);
        
        // Style the dialog
        const style = document.createElement('style');
        style.textContent = `
          .accessibility-help-dialog {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 500px;
            width: 90%;
          }
          .dialog-content {
            display: flex;
            flex-direction: column;
            gap: 15px;
          }
          .accessibility-help-dialog h2 {
            margin-bottom: 10px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
          }
          .accessibility-help-dialog ul {
            list-style: none;
            padding-left: 0;
          }
          .accessibility-help-dialog li {
            margin-bottom: 8px;
          }
          .accessibility-help-dialog kbd {
            background: #f1f1f1;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 2px 5px;
            font-size: 0.9em;
          }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(helpDialog);
      } else {
        helpDialog.style.display = 'block';
      }
      
      // Focus the close button
      const closeButton = helpDialog.querySelector('button');
      if (closeButton) {
        closeButton.focus();
      }
      
      // Trap focus in the dialog
      helpDialog.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          helpDialog.style.display = 'none';
        }
      });
    }
  });
});

// Initial data fetch
fetchReports();
fetchRegionInfo();
fetchAvailableLanguages();

// Set up WebSocket for real-time updates
setupWebSocket();

// Refresh data every 5 minutes
setInterval(fetchReports, 5 * 60 * 1000);

// Add event listener for language selector
document.getElementById('language-selector').addEventListener('change', async (event) => {
  currentLanguage = event.target.value;
  // Save language preference
  localStorage.setItem('pigmap-language', currentLanguage);
  
  // Set RTL direction if needed
  setDocumentDirection(currentLanguage);
  
  // Load new translations
  const success = await loadTranslations(currentLanguage);
  if (success) {
    translateUI();
  }
});

// Initialize language
initializeLanguage();

// Set up keyboard accessibility
setupMapKeyboardAccessibility();

// Add accessibility support for map features
addAccessibilityToFeatures();

// Add hover interaction for markers
const hoverInteraction = new ol.interaction.Select({
  condition: ol.events.condition.pointerMove,
  style: function(feature) {
    const type = feature.get('type') || 'pig';
    const count = feature.get('count') || 1;
    
    // Get the appropriate emoji based on livestock type
    let emoji = '🐖'; // Default pig
    if (type === 'cow') emoji = '🐄';
    else if (type === 'sheep') emoji = '🐑';
    else if (type === 'goat') emoji = '🐐';
    else if (type === 'horse') emoji = '🐎';
    else if (type === 'other') emoji = '🐾';
    
    // Icon scale based on count - make hover slightly larger
    const scale = Math.min(1.7, 1 + (count * 0.1));
    
    return new Style({
      image: new Circle({
        radius: 20 * scale,
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.9)'
        }),
        stroke: new Stroke({
          color: 'rgba(74, 143, 92, 1)',
          width: 4
        })
      }),
      text: new Text({
        text: emoji,
        scale: 1.3 * scale,
        offsetY: 1,
        fill: new Fill({
          color: 'rgba(0, 0, 0, 1)'
        })
      })
    });
  }
});

map.addInteraction(hoverInteraction);
