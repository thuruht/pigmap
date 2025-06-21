import Map from 'ol/Map.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import {fromLonLat, toLonLat} from 'ol/proj.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import {Circle, Fill, Stroke, Style, Text, Icon} from 'ol/style.js';
import Overlay from 'ol/Overlay.js';
import Geolocation from 'ol/Geolocation.js';
// Use local UUIDv4 function
const uuidv4 = () => {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
};
import XYZ from 'ol/source/XYZ.js';
import Select from 'ol/interaction/Select.js';
import {pointerMove} from 'ol/events/condition.js';
// Import GSAP for animations
import { gsap } from '/lib/gsap/gsap-core.js';

// GSAP Animation Utilities
// These functions will be used throughout the application for smooth animations
const animations = {
  // Fade in animation for elements
  fadeIn: (element, duration = 0.5, delay = 0) => {
    return gsap.fromTo(element, 
      { opacity: 0 }, 
      { opacity: 1, duration, delay, ease: "power2.out" }
    );
  },
  
  // Fade out animation for elements
  fadeOut: (element, duration = 0.3, delay = 0) => {
    return gsap.to(element, { opacity: 0, duration, delay, ease: "power2.in" });
  },
  
  // Slide in from right animation (for panels, forms, etc.)
  slideInRight: (element, duration = 0.5, delay = 0) => {
    return gsap.fromTo(element, 
      { x: '100%', opacity: 0 }, 
      { x: '0%', opacity: 1, duration, delay, ease: "power2.out" }
    );
  },
  
  // Slide out to right animation
  slideOutRight: (element, duration = 0.4, delay = 0) => {
    return gsap.to(element, { x: '100%', opacity: 0, duration, delay, ease: "power2.in" });
  },
  
  // Popup entrance animation
  popupShow: (element, duration = 0.4) => {
    return gsap.fromTo(element, 
      { scale: 0.8, opacity: 0 }, 
      { scale: 1, opacity: 1, duration, ease: "back.out(1.7)" }
    );
  },
  
  // Popup exit animation
  popupHide: (element, duration = 0.3) => {
    return gsap.to(element, { scale: 0.8, opacity: 0, duration, ease: "power2.in" });
  },
  
  // Button pulse animation (for attention)
  buttonPulse: (element) => {
    return gsap.fromTo(element, 
      { scale: 1 }, 
      { 
        scale: 1.05, 
        duration: 0.4, 
        ease: "power2.inOut",
        repeat: 1, 
        yoyo: true 
      }
    );
  },
  
  // Map marker entrance animation
  markerAdd: (element, duration = 0.5) => {
    return gsap.fromTo(element, 
      { scale: 0, opacity: 0 }, 
      { scale: 1, opacity: 1, duration, ease: "elastic.out(1, 0.5)" }
    );
  },
  
  // Notification entrance animation
  notificationShow: (element, duration = 0.5, delay = 0) => {
    return gsap.fromTo(element, 
      { y: -50, opacity: 0 }, 
      { y: 0, opacity: 1, duration, delay, ease: "power3.out" }
    );
  },
  
  // Notification exit animation
  notificationHide: (element, duration = 0.4) => {
    return gsap.to(element, { y: -50, opacity: 0, duration, ease: "power3.in" });
  }
};

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
    const icon = feature.get('icon') || 'local_police_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png';
    
    // Age-based rendering - fresher sightings are more opaque
    const ageInHours = (Date.now() - timestamp) / (1000 * 60 * 60);
    const opacity = Math.max(0.3, Math.min(1, 1 - (ageInHours / 48))); // Fade over 48 hours
    
    // Icon scale based on count
    const scale = Math.min(1.5, 0.8 + (count * 0.1));
    
    // Use the custom icon image if available, otherwise fall back to the emoji style
    if (icon) {
      const iconStyle = new Style({
        image: new Icon({
          src: `/icons/${icon}`,
          scale: 0.3 * scale,  // Adjust scale to make icons appropriate size
          opacity: opacity
        })
      });
      return iconStyle;
    }
    
    // Fallback to previous emoji style if no icon is available
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
popupContainer.style.opacity = '0'; // Start hidden for animation
const closeBtn = document.createElement('button');
closeBtn.className = 'popup-close-btn';
closeBtn.innerHTML = '×';
closeBtn.setAttribute('aria-label', 'Close popup');
closeBtn.setAttribute('title', 'Close');
popupContainer.appendChild(closeBtn);

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

// Function to show popup with animation
function showPopup(position) {
  popup.setPosition(position);
  // Run animation only if the popup is newly showing
  if (popupContainer.style.opacity === '0' || popupContainer.style.opacity === '') {
    animations.popupShow(popupContainer);
  }
}

// Function to hide popup with animation
function hidePopup() {
  animations.popupHide(popupContainer).then(() => {
    popup.setPosition(undefined);
  });
}

// Add close button event listener
closeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  hidePopup();
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
    const icon = feature.get('icon') || 'local_police_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png';
    
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
      <div class="popup-header">
        <img src="/icons/${icon}" alt="${translatedType} icon" class="popup-icon">
        <h3>${count} ${translatedType}${count > 1 ? 's' : ''} ${spottedText}</h3>
      </div>
      <p>${comment}</p>
      <p><small>${reportedText}: ${formattedDate}</small></p>
    `;
    
    if (imageUrl) {
      content += `<img src="${imageUrl}" alt="${translatedType} sighting" class="popup-image">`;
    }
    
    popupContainer.innerHTML = content + closeBtn.outerHTML;
    showPopup(coordinates);
  } else {
    hidePopup();
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
    // Get the currently selected icon
    const selectedIcon = document.getElementById('selected-icon').value;
    
    tempFeature = new Feature({
      geometry: new Point(map.getView().getCenter())
    });
    
    // Use the selected icon for the temp feature
    tempFeature.setStyle(new Style({
      image: new Icon({
        src: `/icons/${selectedIcon}`,
        scale: 0.3,
        opacity: 0.8
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
  const selectedIcon = document.getElementById('selected-icon').value;
  
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
    timestamp: Date.now(),
    icon: selectedIcon
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
    
    const result = await response.json();
    
    if (response.ok) {
      // Add to map immediately (optimistic UI)
      const newFeature = new Feature({
        geometry: new Point(fromLonLat([reportData.longitude, reportData.latitude])),
        id: result.id,
        type: reportData.type,
        count: reportData.count,
        comment: reportData.comment,
        timestamp: reportData.timestamp,
        icon: reportData.icon
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
      
      // Show the edit token in a modal
      if (result.editToken) {
        showTokenModal(result.editToken);
      }
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
          imageUrl: report.imageUrl,
          icon: report.icon || 'local_police_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png'
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
  
  // Store comments by report ID
  window.commentsByReport = {};
  
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
            id: report.id,
            type: report.type,
            count: report.count || 1,
            comment: report.comment || '',
            timestamp: report.timestamp,
            imageUrl: report.imageUrl
          });
          vectorSource.addFeature(feature);
        }
        
        // Store initial comments
        if (data.comments) {
          window.commentsByReport = data.comments;
        }
      } else if (data.type === 'new' || data.type === 'update') {
        const report = data.report;
        
        if (data.type === 'update') {
          // Find and update existing feature
          const features = vectorSource.getFeatures();
          const existingFeature = features.find(f => f.get('id') === report.id);
          
          if (existingFeature) {
            existingFeature.set('type', report.type);
            existingFeature.set('count', report.count || 1);
            existingFeature.set('comment', report.comment || '');
            
            // If the popup is currently showing this report, update it
            if (popup.getPosition() && popup.getElement().dataset.reportId === report.id) {
              showReportPopup(existingFeature);
            }
            
            return;
          }
        }
        
        // Add new report
        const feature = new Feature({
          geometry: new Point(fromLonLat([report.longitude, report.latitude])),
          id: report.id,
          type: report.type,
          count: report.count || 1,
          comment: report.comment || '',
          timestamp: report.timestamp,
          imageUrl: report.imageUrl
        });
        vectorSource.addFeature(feature);
      } else if (data.type === 'comment') {
        // Add new comment to the local storage
        const reportId = data.reportId;
        if (!window.commentsByReport[reportId]) {
          window.commentsByReport[reportId] = [];
        }
        
        window.commentsByReport[reportId].unshift(data.comment);
        
        // If the comments panel is open for this report, update it
        const commentsPanel = document.getElementById('comments-panel');
        if (commentsPanel && commentsPanel.style.display !== 'none' && commentsPanel.dataset.reportId === reportId) {
          displayComments(reportId);
        }
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
    const icon = feature.get('icon') || 'local_police_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png';
    
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
      <div class="popup-header">
        <img src="/icons/${icon}" alt="${translatedType} icon" class="popup-icon">
        <h3>${count} ${translatedType}${count > 1 ? 's' : ''} ${spottedText}</h3>
      </div>
      <p>${comment}</p>
      <p><small>${reportedText}: ${formattedDate}</small></p>
    `;
    
    if (imageUrl) {
      content += `<img src="${imageUrl}" alt="${translatedType} sighting" class="popup-image">`;
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
  loadIconSelector(); // Load the icon selector
  
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
const hoverInteraction = new Select({
  condition: pointerMove,
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

// Add HTML elements for edit form and comments panel to the page
function addUIElements() {
  // Create edit form
  const editFormHTML = `
    <div id="edit-form" class="form-container hidden">
      <h2 data-i18n="editForm.title">Edit Livestock Sighting</h2>
      <form id="edit-sighting-form">
        <div class="form-group">
          <label for="edit-token" data-i18n="editForm.enterToken">Enter Edit Token</label>
          <input type="text" id="edit-token" data-i18n-placeholder="editForm.tokenPlaceholder" placeholder="Paste your edit token here" required>
        </div>
        <div class="form-group">
          <label for="edit-type" data-i18n="reportForm.livestockType">Select Livestock Type</label>
          <select id="edit-type" required>
            <option value="pig" data-i18n="reportForm.animalTypes.pig">Pig/Hog</option>
            <option value="cow" data-i18n="reportForm.animalTypes.cow">Cow</option>
            <option value="sheep" data-i18n="reportForm.animalTypes.sheep">Sheep</option>
            <option value="goat" data-i18n="reportForm.animalTypes.goat">Goat</option>
            <option value="horse" data-i18n="reportForm.animalTypes.horse">Horse</option>
            <option value="other" data-i18n="reportForm.animalTypes.other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label for="edit-count">Count</label>
          <input type="number" id="edit-count" min="1" value="1" required>
        </div>
        <div class="form-group">
          <label for="edit-comment" data-i18n="reportForm.description">Description</label>
          <textarea id="edit-comment" rows="3"></textarea>
        </div>
        <div class="form-buttons">
          <button type="submit" class="btn btn-primary" data-i18n="editForm.save">Save Changes</button>
          <button type="button" id="cancel-edit" class="btn btn-secondary" data-i18n="editForm.cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;
  
  // Create comments panel
  const commentsPanelHTML = `
    <div id="comments-panel" class="panel hidden">
      <div class="panel-header">
        <h2 data-i18n="comments.title">Comments</h2>
        <button class="close-btn" id="close-comments">&times;</button>
      </div>
      <div id="comments-list" class="comments-list">
        <!-- Comments will be loaded here -->
      </div>
      <div class="comment-form">
        <h3 data-i18n="popup.addComment">Add Comment</h3>
        <form id="comment-form">
          <div class="form-group">
            <textarea id="comment-content" data-i18n-placeholder="comments.writeComment" placeholder="Write a comment..." required></textarea>
          </div>
          <div class="form-group">
            <label for="comment-media" class="file-label" data-i18n="comments.uploadMedia">Upload Photo/Video</label>
            <input type="file" id="comment-media" accept="image/*,video/*">
          </div>
          <div class="form-buttons">
            <button type="submit" class="btn btn-primary" data-i18n="comments.submit">Post Comment</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Create token display modal
  const tokenModalHTML = `
    <div id="token-modal" class="modal hidden">
      <div class="modal-content">
        <div class="modal-header">
          <h2 data-i18n="editToken.title">Edit Token</h2>
          <button class="close-btn" id="close-token-modal">&times;</button>
        </div>
        <div class="modal-body">
          <p data-i18n="editToken.description">Keep this token to edit your report later. This is the only time you'll see it!</p>
          <div class="token-display">
            <code id="token-value"></code>
          </div>
          <button id="copy-token" class="btn btn-primary" data-i18n="editToken.copyToken">Copy Token</button>
        </div>
      </div>
    </div>
  `;
  
  // Append to body
  document.body.insertAdjacentHTML('beforeend', editFormHTML);
  document.body.insertAdjacentHTML('beforeend', commentsPanelHTML);
  document.body.insertAdjacentHTML('beforeend', tokenModalHTML);
  
  // Add event listeners
  document.getElementById('edit-sighting-form').addEventListener('submit', handleEditSubmit);
  document.getElementById('cancel-edit').addEventListener('click', () => {
    document.getElementById('edit-form').classList.add('hidden');
  });
  
  document.getElementById('comment-form').addEventListener('submit', handleCommentSubmit);
  document.getElementById('close-comments').addEventListener('click', closeCommentPanel);
  
  document.getElementById('close-token-modal').addEventListener('click', () => {
    document.getElementById('token-modal').classList.add('hidden');
  });
  
  document.getElementById('copy-token').addEventListener('click', () => {
    const tokenElement = document.getElementById('token-value');
    const token = tokenElement.textContent;
    
    navigator.clipboard.writeText(token).then(() => {
      showNotification(getTranslatedText('editToken.tokenCopied') || 'Token copied to clipboard!');
    });
  });
}

// Call this function during initialization
addUIElements();

// Handle map clicks - modified to support edit and comments
map.on('click', (event) => {
  // Temporarily disable click handling if in report mode
  if (reportForm.classList.contains('active')) {
    return;
  }
  
  // Feature click detection
  const feature = map.forEachFeatureAtPixel(event.pixel, (feature) => feature);
  
  if (feature && feature !== positionFeature && feature !== accuracyFeature) {
    showReportPopup(feature);
  } else {
    popup.setPosition(undefined);
    closeCommentPanel();
  }
});

// Function to show report popup with comments and edit options
function showReportPopup(feature) {
  const coordinates = feature.getGeometry().getCoordinates();
  const type = feature.get('type') || 'pig';
  const count = feature.get('count') || 1;
  const comment = feature.get('comment') || '';
  const timestamp = feature.get('timestamp') || Date.now();
  const imageUrl = feature.get('imageUrl');
  const reportId = feature.get('id');
  const icon = feature.get('icon') || 'local_police_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png';
  
  const date = new Date(timestamp);
  const formattedDate = date.toLocaleString(currentLanguage.replace('_', '-'));
  
  // Get translated terms
  const spottedText = getTranslatedText('popup.spotted') || 'spotted';
  const reportedText = getTranslatedText('popup.reported') || 'Reported';
  const editReportText = getTranslatedText('popup.editReport') || 'Edit Report';
  const viewCommentsText = getTranslatedText('popup.viewComments') || 'View Comments';
  
  // Get translated animal type if available
  const translatedType = getTranslatedText(`reportForm.animalTypes.${type}`) || type;
  
  // Build popup content
  let content = `
    <div class="popup-content">
      <div class="popup-header">
        <img src="/icons/${icon}" alt="${translatedType} icon" class="popup-icon">
        <h3>${count} ${translatedType}${count > 1 ? 's' : ''} ${spottedText}</h3>
      </div>
      <p>${comment}</p>
      <p><small>${reportedText}: ${formattedDate}</small></p>
  `;
  
  if (imageUrl) {
    content += `<img src="${imageUrl}" alt="${translatedType} sighting" class="popup-image">`;
  }
  
  // Add buttons for edit and comments
  content += `
      <div class="popup-actions">
        <button id="edit-report-btn" class="btn btn-secondary">${editReportText}</button>
        <button id="view-comments-btn" class="btn btn-primary">${viewCommentsText}</button>
      </div>
    </div>
  `;
  
  popupContainer.innerHTML = content;
  popupContainer.dataset.reportId = reportId;
  popup.setPosition(coordinates);
  
  // Add event listeners to the buttons
  document.getElementById('edit-report-btn').addEventListener('click', () => {
    showEditForm(reportId, type, count, comment);
  });
  
  document.getElementById('view-comments-btn').addEventListener('click', () => {
    showCommentsPanel(reportId);
  });
}

// Show edit form
function showEditForm(reportId, type, count, comment) {
  const editForm = document.getElementById('edit-form');
  
  // Populate form fields
  document.getElementById('edit-type').value = type;
  document.getElementById('edit-count').value = count;
  document.getElementById('edit-comment').value = comment;
  
  // Store report ID in the form
  editForm.dataset.reportId = reportId;
  
  // Show the form
  editForm.classList.remove('hidden');
  document.getElementById('edit-token').focus();
}

// Handle edit form submission
async function handleEditSubmit(event) {
  event.preventDefault();
  
  const editForm = document.getElementById('edit-form');
  const reportId = editForm.dataset.reportId;
  const editToken = document.getElementById('edit-token').value.trim();
  const type = document.getElementById('edit-type').value;
  const count = parseInt(document.getElementById('edit-count').value);
  const comment = document.getElementById('edit-comment').value.trim();
  
  if (!editToken) {
    showNotification(getTranslatedText('editForm.tokenRequired') || 'Edit token is required', 'error');
    return;
  }
  
  try {
    const response = await fetch(`/api/reports/${reportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        editToken,
        report: {
          type,
          count,
          comment
        }
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      // Hide form
      editForm.classList.add('hidden');
      
      // Show success message
      const successMessage = getTranslatedText('notifications.editSuccess') || 'Report updated successfully!';
      showNotification(successMessage);
      
      // Note: The map will update automatically via WebSocket
    } else {
      const errorMessage = result.error || getTranslatedText('notifications.editError') || 'Error updating report. Please try again.';
      showNotification(errorMessage, 'error');
    }
  } catch (error) {
    console.error('Error updating report:', error);
    const errorMessage = getTranslatedText('notifications.editError') || 'Error updating report. Please try again.';
    showNotification(errorMessage, 'error');
  }
}

// Show comments panel and load comments
async function showCommentsPanel(reportId) {
  const commentsPanel = document.getElementById('comments-panel');
  commentsPanel.dataset.reportId = reportId;
  commentsPanel.classList.remove('hidden');
  
  // Load and display comments
  await displayComments(reportId);
  
  // Focus on comment input
  document.getElementById('comment-content').focus();
}

// Close comments panel
function closeCommentPanel() {
  const commentsPanel = document.getElementById('comments-panel');
  commentsPanel.classList.add('hidden');
}

// Display comments for a report
async function displayComments(reportId) {
  const commentsList = document.getElementById('comments-list');
  let comments = [];
  
  // Try to get comments from the WebSocket cache first
  if (window.commentsByReport && window.commentsByReport[reportId]) {
    comments = window.commentsByReport[reportId];
  } else {
    // Fetch comments from API
    try {
      const response = await fetch(`/api/reports/${reportId}/comments`);
      if (response.ok) {
        comments = await response.json();
        // Cache the comments
        if (!window.commentsByReport) {
          window.commentsByReport = {};
        }
        window.commentsByReport[reportId] = comments;
      } else {
        showNotification('Error loading comments', 'error');
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      showNotification('Error loading comments', 'error');
    }
  }
  
  // Display comments
  if (comments.length === 0) {
    commentsList.innerHTML = `<p class="empty-comments" data-i18n="comments.empty">No comments yet. Be the first to comment!</p>`;
  } else {
    commentsList.innerHTML = comments.map(comment => {
      const date = new Date(comment.timestamp);
      const formattedDate = date.toLocaleString(currentLanguage.replace('_', '-'));
      
      let html = `
        <div class="comment">
          <div class="comment-content">${comment.content}</div>
          <div class="comment-date">${formattedDate}</div>
      `;
      
      if (comment.mediaUrl) {
        const isVideo = comment.mediaUrl.match(/\.(mp4|webm|ogg)$/i);
        if (isVideo) {
          html += `
            <video controls class="comment-media">
              <source src="${comment.mediaUrl}" type="${comment.mediaType || 'video/mp4'}">
              Your browser does not support the video tag.
            </video>
          `;
        } else {
          html += `<img src="${comment.mediaUrl}" alt="Comment media" class="comment-media">`;
        }
      }
      
      html += `</div>`;
      return html;
    }).join('');
  }
  
  // Update translations
  translateUI();
}

// Handle comment form submission
async function handleCommentSubmit(event) {
  event.preventDefault();
  
  const commentsPanel = document.getElementById('comments-panel');
  const reportId = commentsPanel.dataset.reportId;
  const content = document.getElementById('comment-content').value.trim();
  const mediaInput = document.getElementById('comment-media');
  
  if (!content) {
    return;
  }
  
  // Create form data
  const formData = new FormData();
  formData.append('comment', JSON.stringify({ content }));
  
  // Add media if selected
  if (mediaInput.files.length > 0) {
    formData.append('media', mediaInput.files[0]);
  }
  
  try {
    const response = await fetch(`/api/reports/${reportId}/comments`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      // Clear form
      document.getElementById('comment-content').value = '';
      document.getElementById('comment-media').value = '';
      
      // Show success message
      const successMessage = getTranslatedText('notifications.commentSuccess') || 'Comment added successfully!';
      showNotification(successMessage);
      
      // Note: The comments panel will update automatically via WebSocket
    } else {
      const errorMessage = result.error || getTranslatedText('notifications.commentError') || 'Error posting comment. Please try again.';
      showNotification(errorMessage, 'error');
    }
  } catch (error) {
    console.error('Error posting comment:', error);
    const errorMessage = getTranslatedText('notifications.commentError') || 'Error posting comment. Please try again.';
    showNotification(errorMessage, 'error');
  }
}

// Show token modal after successful report submission
function showTokenModal(token) {
  const tokenModal = document.getElementById('token-modal');
  const tokenValue = document.getElementById('token-value');
  
  tokenValue.textContent = token;
  tokenModal.classList.remove('hidden');
}

// Load icons from the icons directory and create the icon selector
async function loadIconSelector() {
  const iconGrid = document.getElementById('icon-grid');
  if (!iconGrid) return;
  
  try {
    // Fetch the list of icons from the server
    const response = await fetch('/api/icons');
    
    if (response.ok) {
      const icons = await response.json();
      
      // Clear any existing icons
      iconGrid.innerHTML = '';
      
      // Add each icon to the grid
      icons.forEach(icon => {
        const iconElement = document.createElement('div');
        iconElement.className = 'icon-option';
        iconElement.setAttribute('role', 'radio');
        iconElement.setAttribute('aria-checked', 'false');
        iconElement.setAttribute('tabindex', '0');
        iconElement.dataset.icon = icon;
        
        const img = document.createElement('img');
        img.src = `/icons/${icon}`;
        img.alt = icon.replace(/_128dp.*\.png$/g, '').replace(/_/g, ' ');
        img.loading = 'lazy';
        
        iconElement.appendChild(img);
        iconGrid.appendChild(iconElement);
        
        // Set the default selected icon
        if (icon === 'local_police_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png') {
          iconElement.classList.add('selected');
          iconElement.setAttribute('aria-checked', 'true');
        }
        
        // Add click handler
        iconElement.addEventListener('click', () => {
          // Remove selected class from all icons
          document.querySelectorAll('.icon-option').forEach(el => {
            el.classList.remove('selected');
            el.setAttribute('aria-checked', 'false');
          });
          
          // Add selected class to this icon
          iconElement.classList.add('selected');
          iconElement.setAttribute('aria-checked', 'true');
          
          // Update the hidden input
          document.getElementById('selected-icon').value = icon;
          
          // Update temporary marker style if it exists
          if (tempFeature) {
            tempFeature.setStyle(new Style({
              image: new Icon({
                src: `/icons/${icon}`,
                scale: 0.3,
                opacity: 0.8
              })
            }));
          }
        });
        
        // Add keyboard support
        iconElement.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            iconElement.click();
          }
        });
      });
    } else {
      console.error('Failed to load icons');
      // Fall back to using the default icon
    }
  } catch (error) {
    console.error('Error loading icons:', error);
    // Fall back to using the default icon
  }
}

// Call loadIconSelector during initialization
loadIconSelector();
