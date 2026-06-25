document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([39.8283, -98.5795], 4);
    const reportModal = document.getElementById('report-modal');
    const editModal = document.getElementById('edit-modal');
    const addReportBtn = document.getElementById('add-report-btn');
    const locateBtn = document.getElementById('locate-btn');
    const closeReportBtn = document.getElementById('close-report-btn');
    const closeEditBtn = document.getElementById('close-edit-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const editCancelBtn = document.getElementById('edit-cancel-btn');
    const reportForm = document.getElementById('report-form');
    const editForm = document.getElementById('edit-form');
    const latInput = document.getElementById('latitude');
    const lonInput = document.getElementById('longitude');
    const languageSelect = document.getElementById('language-select');
    const iconSelect = document.getElementById('icon-select');
    const placementHint = document.getElementById('placement-hint');

    let translations = {};
    let currentLang = 'en';
    let tempMarker = null;
    let locCircle = null;
    let placingReport = false;
    let currentEditId = null;
    let currentEditToken = null;
    const reportMarkers = {};
    const seenReportIds = new Set();

    function t(key) {
        const set = translations[currentLang] || translations['en'] || {};
        return set[key] || key;
    }

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
            if (placingReport) {
                exitPlacementMode();
                placeReportAt(e.latlng);
            }
        });
    }

    async function initI18n() {
        try {
            const response = await fetch('/api/translations');
            const data = await response.json();
            translations = data.translations;

            languageSelect.innerHTML = '';
            for (const [code, name] of Object.entries(data.languageNames)) {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = name;
                languageSelect.appendChild(option);
            }

            currentLang = localStorage.getItem('pigmap-lang') || 'en';
            languageSelect.value = currentLang;
            updateUIText();
            populateCategorySelector('type');
            populateCategorySelector('edit-type');
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
                const label = icon
                    .replace(/_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48\.png$/, '')
                    .replace(/_/g, ' ');
                option.textContent = label.charAt(0).toUpperCase() + label.slice(1);
                iconSelect.appendChild(option);
            });
        } catch (err) {
            console.error('Could not load icons:', err);
        }
    }

    // --- Placement mode ---

    function enterPlacementMode() {
        placingReport = true;
        placementHint.hidden = false;
        placementHint.querySelector('span').textContent = t('add_marker_instruction');
        map.getContainer().style.cursor = 'crosshair';
        addReportBtn.setAttribute('aria-pressed', 'true');
    }

    function exitPlacementMode() {
        placingReport = false;
        placementHint.hidden = true;
        map.getContainer().style.cursor = '';
        addReportBtn.setAttribute('aria-pressed', 'false');
    }

    function placeReportAt(latlng) {
        latInput.value = latlng.lat;
        lonInput.value = latlng.lng;
        if (tempMarker) map.removeLayer(tempMarker);
        tempMarker = L.marker(latlng).addTo(map);
        reportModal.style.display = 'flex';
        document.getElementById('type').focus();
    }

    // --- Event listeners ---

    function setupEventListeners() {
        addReportBtn.addEventListener('click', () => {
            if (placingReport) {
                exitPlacementMode();
            } else {
                enterPlacementMode();
            }
        });

        closeReportBtn.addEventListener('click', closeReportModal);
        closeReportBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeReportModal(); }
        });
        cancelBtn.addEventListener('click', closeReportModal);

        closeEditBtn.addEventListener('click', closeEditModal);
        closeEditBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeEditModal(); }
        });
        editCancelBtn.addEventListener('click', closeEditModal);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (reportModal.style.display === 'flex') {
                    closeReportModal();
                } else if (editModal.style.display === 'flex') {
                    closeEditModal();
                } else if (placingReport) {
                    exitPlacementMode();
                }
            }
        });

        reportForm.addEventListener('submit', handleReportSubmit);
        editForm.addEventListener('submit', handleEditSubmit);

        languageSelect.addEventListener('change', (e) => {
            currentLang = e.target.value;
            localStorage.setItem('pigmap-lang', currentLang);
            updateUIText();
            populateCategorySelector('type');
            populateCategorySelector('edit-type');
        });

        if (locateBtn) {
            locateBtn.addEventListener('click', () => map.locate({ setView: true, maxZoom: 14 }));
        }

        map.on('locationfound', (e) => {
            if (locCircle) { map.removeLayer(locCircle); }
            locCircle = L.circle(e.latlng, {
                radius: e.accuracy / 2,
                color: '#3388ff',
                fillOpacity: 0.15,
            }).addTo(map);
        });
        map.on('locationerror', () => notify('Could not determine your location.', 'warning'));
    }

    // --- Reports ---

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

    function makeLeafletIcon(iconName) {
        if (!iconName) return undefined;
        return L.icon({
            iconUrl: `/icons/${iconName}`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -34],
        });
    }

    function buildPopupContent(report) {
        const el = document.createElement('div');
        el.className = 'report-popup';

        const typeLabel = t(`cat_${report.type}`);
        const header = document.createElement('b');
        header.className = 'popup-type';
        header.textContent = typeLabel;
        el.appendChild(header);

        const meta = document.createElement('div');
        meta.className = 'popup-meta';
        const countStr = report.count && report.count > 1 ? ` · ${report.count}` : '';
        meta.textContent = new Date(report.timestamp).toLocaleString() + countStr;
        el.appendChild(meta);

        if (report.comment) {
            const desc = document.createElement('p');
            desc.className = 'popup-desc';
            desc.textContent = report.comment;
            el.appendChild(desc);
        }

        if (report.mediaUrl) {
            const img = document.createElement('img');
            img.src = report.mediaUrl;
            img.alt = '';
            img.className = 'popup-media';
            el.appendChild(img);
        }

        const commentsEl = document.createElement('div');
        commentsEl.className = 'popup-comments';
        commentsEl.innerHTML = '<span class="popup-loading">…</span>';
        el.appendChild(commentsEl);

        const tokens = JSON.parse(localStorage.getItem('pigmap-edit-tokens') || '{}');
        if (tokens[report.id]) {
            const editBtn = document.createElement('button');
            editBtn.className = 'popup-edit-btn';
            editBtn.textContent = t('edit');
            editBtn.addEventListener('click', () => {
                map.closePopup();
                openEditModal(report.id, tokens[report.id], report.type, report.comment || '');
            });
            el.appendChild(editBtn);
        }

        return { el, commentsEl };
    }

    async function loadPopupComments(reportId, container) {
        try {
            const res = await fetch(`/api/reports/${reportId}/comments`);
            if (!res.ok) throw new Error('Failed');
            const comments = await res.json();
            container.innerHTML = '';
            if (comments.length === 0) {
                const none = document.createElement('span');
                none.className = 'popup-no-comments';
                none.textContent = t('comments') + ': 0';
                container.appendChild(none);
                return;
            }
            const heading = document.createElement('div');
            heading.className = 'popup-comments-heading';
            heading.textContent = t('comments');
            container.appendChild(heading);
            comments.slice(0, 5).forEach(c => {
                const item = document.createElement('div');
                item.className = 'popup-comment-item';
                const text = document.createElement('span');
                text.textContent = c.content;
                const time = document.createElement('span');
                time.className = 'popup-comment-time';
                time.textContent = new Date(c.timestamp).toLocaleDateString();
                item.appendChild(text);
                item.appendChild(time);
                container.appendChild(item);
            });
        } catch (_e) {
            container.innerHTML = '';
        }
    }

    function addReportMarker(report) {
        if (!report.id || seenReportIds.has(report.id)) return;
        seenReportIds.add(report.id);

        const leafletIcon = makeLeafletIcon(report.icon);
        const marker = leafletIcon
            ? L.marker([report.latitude, report.longitude], { icon: leafletIcon }).addTo(map)
            : L.marker([report.latitude, report.longitude]).addTo(map);

        marker.bindPopup(() => {
            const { el, commentsEl } = buildPopupContent(report);
            loadPopupComments(report.id, commentsEl);
            return el;
        }, { maxWidth: 280 });

        reportMarkers[report.id] = { marker, report };
        return marker;
    }

    // --- Report modal ---

    function closeReportModal() {
        if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
        reportForm.reset();
        reportModal.style.display = 'none';
    }

    async function handleReportSubmit(e) {
        e.preventDefault();
        const reportData = {
            type: document.getElementById('type').value,
            comment: document.getElementById('description').value,
            count: parseInt(document.getElementById('count').value || '1', 10),
            icon: iconSelect.value || 'local_police_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
            latitude: parseFloat(latInput.value),
            longitude: parseFloat(lonInput.value),
        };

        if (!Number.isFinite(reportData.latitude) || !Number.isFinite(reportData.longitude)) {
            notify(t('add_marker_instruction'), 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('report', JSON.stringify(reportData));
        const mediaFile = document.getElementById('media').files[0];
        if (mediaFile) formData.append('media', mediaFile);

        const submitBtn = reportForm.querySelector('[type="submit"]');
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/reports', { method: 'POST', body: formData });
            if (!response.ok) {
                const err = await response.text();
                throw new Error(err);
            }
            const result = await response.json();
            if (result.success) {
                if (result.editToken) {
                    const stored = JSON.parse(localStorage.getItem('pigmap-edit-tokens') || '{}');
                    stored[result.id] = result.editToken;
                    localStorage.setItem('pigmap-edit-tokens', JSON.stringify(stored));
                }
                closeReportModal();
                notify(t('marker_added'), 'success');
            } else {
                notify(result.error || 'Failed to submit report', 'error');
            }
        } catch (error) {
            console.error('Error submitting report:', error);
            notify(error.message || 'An error occurred.', 'error');
        } finally {
            submitBtn.disabled = false;
        }
    }

    // --- Edit modal ---

    function openEditModal(id, token, type, comment) {
        currentEditId = id;
        currentEditToken = token;
        populateCategorySelector('edit-type');
        document.getElementById('edit-type').value = type;
        document.getElementById('edit-description').value = comment;
        editModal.style.display = 'flex';
        document.getElementById('edit-type').focus();
    }

    function closeEditModal() {
        editModal.style.display = 'none';
        editForm.reset();
        currentEditId = null;
        currentEditToken = null;
    }

    async function handleEditSubmit(e) {
        e.preventDefault();
        if (!currentEditId || !currentEditToken) return;

        const type = document.getElementById('edit-type').value;
        const comment = document.getElementById('edit-description').value;
        const submitBtn = editForm.querySelector('[type="submit"]');
        submitBtn.disabled = true;

        try {
            const response = await fetch(`/api/reports/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ report: { type, comment }, editToken: currentEditToken }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to update');
            }
            const entry = reportMarkers[currentEditId];
            if (entry) {
                entry.report.type = type;
                entry.report.comment = comment;
                entry.marker.closePopup();
            }
            closeEditModal();
            notify(t('marker_updated'), 'success');
        } catch (error) {
            notify(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
        }
    }

    // --- WebSocket ---

    function setupWebSocket() {
        let attempt = 0;

        function connect() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const socket = new WebSocket(`${protocol}//${window.location.host}/api/live`);

            socket.onopen = () => { attempt = 0; };

            socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'new_report') {
                        addReportMarker(message.payload);
                    } else if (message.type === 'update_report') {
                        const entry = reportMarkers[message.payload.id];
                        if (entry) {
                            Object.assign(entry.report, message.payload);
                            entry.marker.closePopup();
                        }
                    }
                } catch (err) {
                    console.error('WebSocket message error:', err);
                }
            };

            socket.onclose = () => {
                const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
                attempt++;
                setTimeout(connect, delay);
            };

            socket.onerror = () => socket.close();
        }

        connect();
    }

    // --- i18n ---

    function updateUIText() {
        const set = translations[currentLang] || translations['en'];
        if (!set) return;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (set[key]) el.textContent = set[key];
        });
        if (placingReport) {
            placementHint.querySelector('span').textContent = set['add_marker_instruction'] || '';
        }
    }

    function getCategoryOptions() {
        return [
            { id: 'sighting',         label: t('cat_sighting') },
            { id: 'tracks',           label: t('cat_tracks') },
            { id: 'damaged_fence',    label: t('cat_damaged_fence') },
            { id: 'unusual_activity', label: t('cat_unusual_activity') },
            { id: 'equipment',        label: t('cat_equipment') },
            { id: 'other',            label: t('cat_other') },
        ];
    }

    function populateCategorySelector(selectId) {
        const sel = document.getElementById(selectId);
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = '';
        getCategoryOptions().forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.label;
            sel.appendChild(opt);
        });
        if (current) sel.value = current;
    }

    init();
});
