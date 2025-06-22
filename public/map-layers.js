/**
 * Map Layers Manager for PigMap
 * Provides additional map tile layers and overlays
 */

class MapLayersManager {
  constructor(map) {
    this.map = map;
    this.baseLayers = {};
    this.overlays = {};
    this.currentBaseLayer = null;
    
    // Initialize base layers
    this.initBaseLayers();
    
    // Initialize overlays
    this.initOverlays();
  }
  
  /**
   * Initialize base map tile layers
   */
  initBaseLayers() {
    // Default OSM layer
    this.baseLayers['OpenStreetMap'] = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    });
    
    // Satellite view
    this.baseLayers['Satellite'] = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 19
    });
    
    // Topographic view
    this.baseLayers['Topographic'] = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
      maxZoom: 17
    });
    
    // Dark mode - CartoDB
    this.baseLayers['Dark Mode'] = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    });
    
    // Set default base layer
    this.currentBaseLayer = 'OpenStreetMap';
    this.baseLayers[this.currentBaseLayer].addTo(this.map);
  }
  
  /**
   * Initialize overlay layers
   */
  initOverlays() {
    // US Agriculture overlay
    this.overlays['USDA Agriculture'] = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Specialty/Soil_Survey_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'USDA Natural Resources Conservation Service',
      maxZoom: 15,
      opacity: 0.6
    });
    
    // Terrain overlay
    this.overlays['Terrain'] = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain-background/{z}/{x}/{y}{r}.{ext}', {
      attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: 'abcd',
      minZoom: 0,
      maxZoom: 18,
      ext: 'png',
      opacity: 0.5
    });
    
    // Precipitation (demo - would need a real weather API)
    this.overlays['Precipitation'] = L.tileLayer('https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=YOUR_API_KEY', {
      attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>',
      maxZoom: 19,
      opacity: 0.5
    });
  }
  
  /**
   * Switch to a different base layer
   * @param {string} layerName - Name of the base layer to switch to
   */
  switchBaseLayer(layerName) {
    if (this.baseLayers[layerName]) {
      // Remove current base layer
      if (this.currentBaseLayer && this.baseLayers[this.currentBaseLayer]) {
        this.map.removeLayer(this.baseLayers[this.currentBaseLayer]);
      }
      
      // Add new base layer
      this.map.addLayer(this.baseLayers[layerName]);
      this.currentBaseLayer = layerName;
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Toggle an overlay layer on/off
   * @param {string} layerName - Name of the overlay to toggle
   * @param {boolean} show - Whether to show or hide the overlay
   */
  toggleOverlay(layerName, show) {
    if (this.overlays[layerName]) {
      if (show) {
        this.map.addLayer(this.overlays[layerName]);
      } else {
        this.map.removeLayer(this.overlays[layerName]);
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Get names of all available base layers
   * @returns {string[]} Array of base layer names
   */
  getBaseLayerNames() {
    return Object.keys(this.baseLayers);
  }
  
  /**
   * Get names of all available overlays
   * @returns {string[]} Array of overlay names
   */
  getOverlayNames() {
    return Object.keys(this.overlays);
  }
  
  /**
   * Get current base layer name
   * @returns {string} Name of current base layer
   */
  getCurrentBaseLayer() {
    return this.currentBaseLayer;
  }
  
  /**
   * Check if an overlay is currently active
   * @param {string} layerName - Name of the overlay to check
   * @returns {boolean} Whether the overlay is active
   */
  isOverlayActive(layerName) {
    return this.map.hasLayer(this.overlays[layerName]);
  }
  
  /**
   * Create a layer control UI
   * @returns {HTMLElement} The layer control element
   */
  createLayerControl() {
    const container = document.createElement('div');
    container.className = 'custom-layer-control';
    
    // Create base layer section
    const baseLayerSection = document.createElement('div');
    baseLayerSection.className = 'layer-section';
    baseLayerSection.innerHTML = '<h4>Base Maps</h4>';
    
    const baseLayerList = document.createElement('div');
    baseLayerList.className = 'layer-list';
    
    // Add base layer options
    this.getBaseLayerNames().forEach(name => {
      const item = document.createElement('div');
      item.className = 'layer-item';
      
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'base-layer';
      radio.id = `base-${name}`;
      radio.value = name;
      radio.checked = (name === this.currentBaseLayer);
      
      radio.addEventListener('change', () => {
        this.switchBaseLayer(name);
      });
      
      const label = document.createElement('label');
      label.htmlFor = `base-${name}`;
      label.textContent = name;
      
      item.appendChild(radio);
      item.appendChild(label);
      baseLayerList.appendChild(item);
    });
    
    baseLayerSection.appendChild(baseLayerList);
    container.appendChild(baseLayerSection);
    
    // Create overlay section
    const overlaySection = document.createElement('div');
    overlaySection.className = 'layer-section';
    overlaySection.innerHTML = '<h4>Overlays</h4>';
    
    const overlayList = document.createElement('div');
    overlayList.className = 'layer-list';
    
    // Add overlay options
    this.getOverlayNames().forEach(name => {
      const item = document.createElement('div');
      item.className = 'layer-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `overlay-${name}`;
      checkbox.value = name;
      checkbox.checked = this.isOverlayActive(name);
      
      checkbox.addEventListener('change', (e) => {
        this.toggleOverlay(name, e.target.checked);
      });
      
      const label = document.createElement('label');
      label.htmlFor = `overlay-${name}`;
      label.textContent = name;
      
      item.appendChild(checkbox);
      item.appendChild(label);
      overlayList.appendChild(item);
    });
    
    overlaySection.appendChild(overlayList);
    container.appendChild(overlaySection);
    
    return container;
  }
}

// Export for use in other scripts
window.MapLayersManager = MapLayersManager;
