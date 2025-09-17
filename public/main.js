document.addEventListener('DOMContentLoaded', () => {
    // --- Global Variables & Constants ---
    const map = L.map('map').setView([39.8283, -98.5795], 4); // Centered on the US
    const reportModal = document.getElementById('report-modal');
    const addReportBtn = document.getElementById('add-report-btn');
    const closeBtn = document.querySelector('.close-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const reportForm = document.getElementById('report-form');
    const latInput = document.getElementById('latitude');
    const lonInput = document.getElementById('longitude');
    const languageSelect = document.getElementById('language-select');

    let translations = {};
    let currentLang = 'en';
    let tempMarker = null;

    // Dual-purpose categories for the disguise
    const reportCategories = {
        'en': [
            { id: 'livestock_sighting', label: 'Livestock Sighting' },
            { id: 'damaged_fence', label: 'Damaged Fence' },
            { id: 'unusual_activity', label: 'Unusual Activity' },
            { id: 'lost_animal', label: 'Lost Animal' },
            { id: 'equipment', label: 'Abandoned Equipment' },
        ],
        'es': [
            { id: 'livestock_sighting', label: 'Avistamiento de Ganado' },
            { id: 'damaged_fence', label: 'Valla Dañada' },
            { id: 'unusual_activity', label: 'Actividad Inusual' },
            { id: 'lost_animal', label: 'Animal Perdido' },
            { id: 'equipment', label: 'Equipo Abandonado' },
        ]
        // Other languages can be added here
    };

    // --- Initialization ---
    function init() {
        initMap();
        initI18n();
        loadInitialReports();
        setupWebSocket();
        setupEventListeners();
    }

    function initMap() {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        map.on('click', (e) => {
            // Only act on map click if the modal is already open, to place the marker
            if (reportModal.style.display === 'flex') {
                updateReportLocation(e.latlng);
            }
        });
    }

    async function initI18n() {
        try {
            const response = await fetch('/api/translations');
            const data = await response.json();
            translations = data.translations;
            
            // Populate language selector
            const langSelector = document.getElementById('language-select');
            langSelector.innerHTML = '';
            for (const [code, name] of Object.entries(data.languageNames)) {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = name;
                langSelector.appendChild(option);
            }
            
            // Set initial language and update UI
            currentLang = localStorage.getItem('pigmap-lang') || 'en';
            langSelector.value = currentLang;
            updateUIText();
            populateCategorySelector();

        } catch (error) {
            console.error("Could not load translations:", error);
        }
    }

    function setupEventListeners() {
        addReportBtn.addEventListener('click', () => {
            // Open the modal and set the initial marker to the center of the map
            openReportModal(map.getCenter());
        });
        closeBtn.addEventListener('click', closeReportModal);
        cancelBtn.addEventListener('click', closeReportModal);
        reportForm.addEventListener('submit', handleReportSubmit);
        languageSelect.addEventListener('change', (e) => {
            currentLang = e.target.value;
            localStorage.setItem('pigmap-lang', currentLang);
            updateUIText();
            populateCategorySelector();
        });
    }

    // --- Map & Report Functions ---
    async function loadInitialReports() {
        try {
            const response = await fetch('/api/reports');
            if (!response.ok) throw new Error('Failed to fetch reports');
            const reports = await response.json();
            reports.forEach(addReportMarker);
        } catch (error) {
            console.error('Error loading initial reports:', error);
        }
    }

    function addReportMarker(report) {
        const marker = L.marker([report.latitude, report.longitude]).addTo(map);
        const categoryLabel = (reportCategories[currentLang] || reportCategories['en']).find(c => c.id === report.type)?.label || report.type;
        marker.bindPopup(`<b>${categoryLabel}</b><br>${report.description || 'No description'}`);
    }
    
    function updateReportLocation(latlng) {
        latInput.value = latlng.lat;
        lonInput.value = latlng.lng;
        if (tempMarker) {
            map.removeLayer(tempMarker);
        }
        // Use a standard leaflet icon for the temporary marker
        tempMarker = L.marker(latlng).addTo(map).bindPopup('New report location').openPopup();
    }

    // --- UI & Modal Functions ---
    function openReportModal(latlng) {
        updateReportLocation(latlng);
        reportModal.style.display = 'flex'; // Use flex to center it
    }

    function closeReportModal() {
        if (tempMarker) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }
        reportForm.reset();
        reportModal.style.display = 'none';
    }

    async function handleReportSubmit(e) {
        e.preventDefault();
        const formData = new FormData();
        const reportData = {
            type: document.getElementById('type').value,
            description: document.getElementById('description').value,
            latitude: parseFloat(latInput.value),
            longitude: parseFloat(lonInput.value),
        };

        formData.append('report', JSON.stringify(reportData));

        const mediaFile = document.getElementById('media').files[0];
        if (mediaFile) {
            formData.append('media', mediaFile);
        }

        try {
            const response = await fetch('/api/reports', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error('Failed to submit report: ' + errorText);
            }

            const result = await response.json();

            if (result.success) {
                // The websocket should add the marker, but we can add it immediately for better UX
                // addReportMarker({ ...reportData, id: result.id });
                closeReportModal();
                alert('Report submitted successfully!');
            } else {
                 alert('Error: ' + (result.error || 'Failed to submit report'));
            }

        } catch (error) {
            console.error('Error submitting report:', error);
            alert('An error occurred while submitting the report.');
        }
    }

    // --- WebSocket Functions ---
    function setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/live`;
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => console.log('WebSocket connection established.');
        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'new_report') {
                    addReportMarker(message.payload);
                }
                // Could handle 'new_comment' or 'update_report' here as well
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };
        socket.onclose = () => {
            console.log('WebSocket closed. Reconnecting in 3 seconds...');
            setTimeout(setupWebSocket, 3000);
        };
        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            socket.close();
        };
    }

    // --- i18n Functions ---
    function updateUIText() {
        const elements = document.querySelectorAll('[data-i18n]');
        const translationSet = translations[currentLang] || translations['en'];

        if (!translationSet) return;

        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translationSet[key]) {
                el.textContent = translationSet[key];
            }
        });
        
        // Also update form labels and placeholders if they exist in the set
        const labels = {
            'type': 'Type:',
            'description': 'Description:',
            'media': 'Photo/Video (optional):',
            'save': 'Save',
            'cancel': 'Cancel'
        };
        
        for (const [key, defaultText] of Object.entries(labels)) {
            const element = document.querySelector(`[data-i18n="${key}"]`);
            if (element) {
                element.textContent = translationSet[key] || defaultText;
            }
        }
        
        document.title = translationSet['app_title'] || 'Livestock Tracker';
    }

    function populateCategorySelector() {
        const categorySelector = document.getElementById('type');
        const categories = reportCategories[currentLang] || reportCategories['en'];
        categorySelector.innerHTML = '';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.label;
            categorySelector.appendChild(option);
        });
    }

    // --- Start the application ---
    init();
});
