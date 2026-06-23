document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([39.8283, -98.5795], 4);
    const reportModal = document.getElementById('report-modal');
    const addReportBtn = document.getElementById('add-report-btn');
    const locateBtn = document.getElementById('locate-btn');
    const closeBtn = document.querySelector('.close-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const reportForm = document.getElementById('report-form');
    const latInput = document.getElementById('latitude');
    const lonInput = document.getElementById('longitude');
    const languageSelect = document.getElementById('language-select');
    const iconSelect = document.getElementById('icon-select');

    let translations = {};
    let currentLang = 'en';
    let tempMarker = null;
    let locCircle = null;

    const reportCategories = {
        'en': [
            { id: 'sighting', label: 'Sighting' },
            { id: 'tracks', label: 'Tracks / Evidence' },
            { id: 'damaged_fence', label: 'Damaged Fence' },
            { id: 'unusual_activity', label: 'Unusual Activity' },
            { id: 'equipment', label: 'Abandoned Equipment' },
            { id: 'other', label: 'Other' },
        ],
        'es': [
            { id: 'sighting', label: 'Avistamiento' },
            { id: 'tracks', label: 'Rastros / Evidencia' },
            { id: 'damaged_fence', label: 'Valla Dañada' },
            { id: 'unusual_activity', label: 'Actividad Inusual' },
            { id: 'equipment', label: 'Equipo Abandonado' },
            { id: 'other', label: 'Otro' },
        ],
    };

    function notify(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    function init() {
        initMap();
        initI18n();
        loadIcons();
        loadInitialReports();
        setupWebSocket();
        setupEventListeners();
    }

    function initMap() {
        const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
        });
        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri',
            maxZoom: 19,
        });
        const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data: &copy; OpenStreetMap contributors | &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
            maxZoom: 17,
        });
        const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19,
        });

        street.addTo(map);
        L.control.layers(
            { 'Street': street, 'Satellite': satellite, 'Topographic': topo, 'Dark': dark },
            null,
            { position: 'topright' }
        ).addTo(map);

        map.on('click', (e) => {
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

            const langSelector = document.getElementById('language-select');
            langSelector.innerHTML = '';
            for (const [code, name] of Object.entries(data.languageNames)) {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = name;
                langSelector.appendChild(option);
            }

            currentLang = localStorage.getItem('pigmap-lang') || 'en';
            langSelector.value = currentLang;
            updateUIText();
            populateCategorySelector();
        } catch (error) {
            console.error('Could not load translations:', error);
        }
    }

    async function loadIcons() {
        try {
            const response = await fetch('/api/icons');
            if (!response.ok) return;
            const icons = await response.json();
            iconSelect.innerHTML = '';
            icons.forEach(icon => {
                const option = document.createElement('option');
                option.value = icon;
                const label = icon.replace(/_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48\.png$/, '').replace(/_/g, ' ');
                option.textContent = label.charAt(0).toUpperCase() + label.slice(1);
                iconSelect.appendChild(option);
            });
        } catch (err) {
            console.error('Could not load icons:', err);
        }
    }

    function setupEventListeners() {
        addReportBtn.addEventListener('click', () => openReportModal(map.getCenter()));
        closeBtn.addEventListener('click', closeReportModal);
        closeBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeReportModal(); }
        });
        cancelBtn.addEventListener('click', closeReportModal);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && reportModal.style.display === 'flex') closeReportModal();
        });
        reportForm.addEventListener('submit', handleReportSubmit);
        languageSelect.addEventListener('change', (e) => {
            currentLang = e.target.value;
            localStorage.setItem('pigmap-lang', currentLang);
            updateUIText();
            populateCategorySelector();
        });

        if (locateBtn) {
            locateBtn.addEventListener('click', () => map.locate({ setView: true, maxZoom: 14 }));
        }

        map.on('locationfound', (e) => {
            if (locCircle) { map.removeLayer(locCircle); }
            locCircle = L.circle(e.latlng, { radius: e.accuracy / 2, color: '#3388ff', fillOpacity: 0.15 }).addTo(map);
        });
        map.on('locationerror', () => notify('Could not determine your location.', 'warning'));
    }

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

    function makeIcon(iconName) {
        if (!iconName) return undefined;
        return L.icon({
            iconUrl: `/icons/${iconName}`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -34],
        });
    }

    const seenReportIds = new Set();

    function addReportMarker(report) {
        if (!report.id || seenReportIds.has(report.id)) return;
        seenReportIds.add(report.id);
        const icon = makeIcon(report.icon);
        const marker = icon
            ? L.marker([report.latitude, report.longitude], { icon }).addTo(map)
            : L.marker([report.latitude, report.longitude]).addTo(map);

        const typeLabel = (reportCategories[currentLang] || reportCategories['en']).find(c => c.id === report.type)?.label || report.type;
        const timeStr = new Date(report.timestamp).toLocaleString();
        const count = report.count && report.count > 1 ? ` &bull; Count: ${report.count}` : '';
        const commentHtml = report.comment ? `<p style="margin:6px 0 0">${escapeHtml(report.comment)}</p>` : '';
        const mediaHtml = report.mediaUrl ? `<img src="${escapeHtml(report.mediaUrl)}" alt="Media" style="max-width:200px;margin-top:6px;border-radius:4px">` : '';

        marker.bindPopup(`
            <div style="font-family:system-ui,sans-serif;min-width:150px">
                <b style="color:#2e7d32">${escapeHtml(typeLabel)}</b>
                <div style="font-size:0.8em;color:#666;margin-top:2px">${timeStr}${count}</div>
                ${commentHtml}
                ${mediaHtml}
            </div>
        `);
        return marker;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function updateReportLocation(latlng) {
        latInput.value = latlng.lat;
        lonInput.value = latlng.lng;
        if (tempMarker) map.removeLayer(tempMarker);
        tempMarker = L.marker(latlng).addTo(map).bindPopup('New report location').openPopup();
    }

    function openReportModal(latlng) {
        updateReportLocation(latlng);
        reportModal.style.display = 'flex';
    }

    function closeReportModal() {
        if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
        reportForm.reset();
        reportModal.style.display = 'none';
    }

    async function handleReportSubmit(e) {
        e.preventDefault();
        const formData = new FormData();
        const reportData = {
            type: document.getElementById('type').value,
            comment: document.getElementById('description').value,
            count: parseInt(document.getElementById('count').value || '1', 10),
            icon: iconSelect.value || 'local_police_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
            latitude: parseFloat(latInput.value),
            longitude: parseFloat(lonInput.value),
        };

        if (!Number.isFinite(reportData.latitude) || !Number.isFinite(reportData.longitude)) {
            notify('Please click the map to set a location first.', 'warning');
            return;
        }

        formData.append('report', JSON.stringify(reportData));
        const mediaFile = document.getElementById('media').files[0];
        if (mediaFile) formData.append('media', mediaFile);

        try {
            const response = await fetch('/api/reports', { method: 'POST', body: formData });
            if (!response.ok) {
                const err = await response.text();
                throw new Error('Failed to submit report: ' + err);
            }
            const result = await response.json();
            if (result.success) {
                if (result.editToken) {
                    const stored = JSON.parse(localStorage.getItem('pigmap-edit-tokens') || '{}');
                    stored[result.id] = result.editToken;
                    localStorage.setItem('pigmap-edit-tokens', JSON.stringify(stored));
                }
                closeReportModal();
                notify('Report submitted! Your edit token has been saved in this browser.', 'success');
            } else {
                notify('Error: ' + (result.error || 'Failed to submit report'), 'error');
            }
        } catch (error) {
            console.error('Error submitting report:', error);
            notify('An error occurred while submitting the report.', 'error');
        }
    }

    function setupWebSocket() {
        let attempt = 0;

        function connect() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const socket = new WebSocket(`${protocol}//${window.location.host}/api/live`);

            socket.onopen = () => { attempt = 0; };

            socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'new_report') addReportMarker(message.payload);
                } catch (err) {
                    console.error('WebSocket message error:', err);
                }
            };

            // Exponential backoff: 1s, 2s, 4s, … capped at 30s
            socket.onclose = () => {
                const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
                attempt++;
                setTimeout(connect, delay);
            };

            socket.onerror = () => socket.close();
        }

        connect();
    }

    function updateUIText() {
        const set = translations[currentLang] || translations['en'];
        if (!set) return;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (set[key]) el.textContent = set[key];
        });
        document.title = set['app_title'] || 'PigMap';
    }

    function populateCategorySelector() {
        const sel = document.getElementById('type');
        const cats = reportCategories[currentLang] || reportCategories['en'];
        sel.innerHTML = '';
        cats.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.label;
            sel.appendChild(opt);
        });
    }

    init();
});
