document.addEventListener('DOMContentLoaded', () => {
    // === HTML Selectors ===
    const mapContainer = document.querySelector('.map-container');
    const mapImage = document.getElementById('minecraft-map');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const resetViewBtn = document.getElementById('reset-view');
    const coordinatesInfo = document.querySelector('.coordinates-info');
    const zoomInfo = document.querySelector('.zoom-info');
    const showYourPointsBtn = document.getElementById('show-your-points');
    const showSharedPointsBtn = document.getElementById('show-shared-points');
    const sessionCodeDisplay = document.getElementById('session-code-text');
    
    // Add point form
    const addPointForm = document.getElementById('add-point-form');
    const resourceSelect = document.getElementById('resource-select');
    const customNameGroup = document.getElementById('custom-name-group');
    const nameInput = document.getElementById('name-input');
    const descriptionInput = document.getElementById('description-input');
    const xInput = document.getElementById('x-input');
    const zInput = document.getElementById('z-input');
    const addPointBtn = document.getElementById('add-point-button');

    // Modals
    const pointDetailsModal = document.getElementById('point-details-modal');
    const adminLoginModal = document.getElementById('admin-login-modal');
    const adminPanelModal = document.getElementById('admin-panel-modal');
    const ownerPanelModal = document.getElementById('owner-panel-modal');

    // Admin/Owner Buttons
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const ownerLoginBtn = document.getElementById('owner-login-btn');

    // Other Elements
    const yourPointsList = document.getElementById('your-points-list');
    const sharedPointsList = document.getElementById('shared-points-list');

    // === Configuration and global variables ===
    const MAP_WIDTH_PX = 8004;
    const MAP_HEIGHT_PX = 4500;
    const ORIGIN_OFFSET_X = -4002;
    const ORIGIN_OFFSET_Z = -2250;
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 3.0;
    const ZOOM_STEP = 0.1;

    let scale = 1.0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let currentMapX = 0;
    let currentMapY = 0;
    let isUserAdmin = false;
    let isUserOwner = false;
    let sessionCode = localStorage.getItem('sessionCode') || crypto.randomUUID();
    
    let isShowingPrivate = true; 
    let isShowingPublic = true;  

    // Resource colors (can be extended)
    const MINECRAFT_RESOURCES = {
        diamond_ore: { name: 'Ruda Diamentu', color: '#00FFFF' },
        iron_ore: { name: 'Ruda Żelaza', color: '#C0C0C0' },
        gold_ore: { name: 'Ruda Złota', color: '#FFD700' },
        coal_ore: { name: 'Ruda Węgla', color: '#2C2C2C' },
        copper_ore: { name: 'Ruda Miedzi', color: '#B87333' },
        redstone_ore: { name: 'Ruda Redstone', color: '#FF0000' },
        lapis_ore: { name: 'Ruda Lapis Lazuli', color: '#007FFF' },
        emerald_ore: { name: 'Ruda Szmaragdu', color: '#00C957' },
        netherite: { name: 'Starożytny Gruz', color: '#554441' },
        village: { name: 'Wioska', color: '#FFDAB9' },
        stronghold: { name: 'Twierdza', color: '#8A2BE2' },
        nether_fortress: { name: 'Twierdza Netheru', color: '#8B0000' },
        end_city: { name: 'Miasto Kresu', color: '#9932CC' },
        ocean_monument: { name: 'Monument Oceaniczny', color: '#4169E1' },
        woodland_mansion: { name: 'Leśna Rezydencja', color: '#556B2F' },
        desert_temple: { name: 'Pustynna Świątynia', color: '#F0E68C' },
        jungle_temple: { name: 'Dżunglowa Świątynia', color: '#228B22' },
        igloo: { name: 'Igloo', color: '#FFFFFF' },
        shipwreck: { name: 'Wrak Statku', color: '#CD853F' },
        mushroom_biome: { name: 'Grzybowa Wyspa', color: '#9400D3' },
        mesa: { name: 'Góry Skalne (Badlands)', color: '#CD5C5C' },
        ice_spikes: { name: 'Lodowe Kolce', color: '#ADD8E6' },
        flower_forest: { name: 'Kwiatowy Las', color: '#FFB6C1' },
        spawn: { name: 'Punkt Spawnu', color: '#FFA500' },
        base: { name: 'Baza', color: '#008080' },
        farm: { name: 'Farma', color: '#7FFF00' },
        portal: { name: 'Portal Netheru', color: '#9370DB' },
        treasure: { name: 'Skarb', color: '#FFD700' },
        custom: { name: 'Własne', color: '#888888' }
    };

    // === Helper Functions ===

    function showSuccess(message) {
        alert('Success: ' + message);
    }

    function showError(message) {
        alert('Error: ' + message);
    }

    function mcToPx(x, z) {
        const px = (x - ORIGIN_OFFSET_X);
        const pz = (z - ORIGIN_OFFSET_Z);
        return { x: px, z: pz };
    }

    function pxToMc(px, pz) {
        const x = px + ORIGIN_OFFSET_X;
        const z = pz + ORIGIN_OFFSET_Z;
        return { x, z };
    }

    function updateMapTransform() {
        const mapWrapper = document.querySelector('.map-wrapper');
        const containerRect = mapWrapper.getBoundingClientRect();

        const maxTranslateX = (MAP_WIDTH_PX * scale - containerRect.width) / 2;
        const maxTranslateY = (MAP_HEIGHT_PX * scale - containerRect.height) / 2;
        
        const clampedX = Math.max(-maxTranslateX, Math.min(maxTranslateX, currentMapX));
        const clampedY = Math.max(-maxTranslateY, Math.min(maxTranslateY, currentMapY));
        
        currentMapX = clampedX;
        currentMapY = clampedY;

        mapContainer.style.transform = `translate(${currentMapX}px, ${currentMapY}px) scale(${scale})`;
        updatePointScaling();
    }
    
    function updatePointScaling() {
        const points = document.querySelectorAll('.point');
        points.forEach(point => {
            const size = 10 / scale;
            point.style.width = `${size}px`;
            point.style.height = `${size}px`;
        });
    }

    function updateCoordinatesInfo(event) {
        const rect = mapContainer.getBoundingClientRect();
        const mapOriginX = rect.left + rect.width / 2;
        const mapOriginY = rect.top + rect.height / 2;

        const containerRect = mapContainer.parentElement.getBoundingClientRect();
        const mouseX = event.clientX - containerRect.left;
        const mouseY = event.clientY - containerRect.top;

        const mapX = (mouseX - containerRect.width / 2) / scale - currentMapX / scale;
        const mapZ = (mouseY - containerRect.height / 2) / scale - currentMapY / scale;

        const mcCoords = pxToMc(mapX, mapZ);
        coordinatesInfo.textContent = `X: ${Math.round(mcCoords.x)}, Z: ${Math.round(mcCoords.z)}`;
    }

    function updateZoomInfo() {
        zoomInfo.textContent = `Zoom: ${Math.round(scale * 100)}%`;
    }

    function zoom(direction) {
        const newScale = scale + direction * ZOOM_STEP;
        if (newScale >= MIN_ZOOM && newScale <= MAX_ZOOM) {
            scale = newScale;
            updateMapTransform();
            updateZoomInfo();
        }
    }

    function resetView() {
        scale = 1.0;
        currentMapX = 0;
        currentMapY = 0;
        updateMapTransform();
        updateZoomInfo();
    }

    function zoomToPoint(x, z) {
        const pxCoords = mcToPx(x, z);
        
        const mapWrapper = document.querySelector('.map-wrapper');
        const containerRect = mapWrapper.getBoundingClientRect();
        const mapCenterPointX = containerRect.width / 2;
        const mapCenterPointY = containerRect.height / 2;

        scale = 1.0;
        updateZoomInfo();
        
        currentMapX = mapCenterPointX - pxCoords.x;
        currentMapY = mapCenterPointY - pxCoords.z;
        
        updateMapTransform();
    }

    // === Data Fetching & Rendering ===
    async function fetchPoints() {
        try {
            const response = await fetch('/api/points', {
                headers: { 'X-Session-Code': sessionCode }
            });

            if (response.ok) {
                const { privatePoints, publicPoints } = await response.json();
                renderPoints(publicPoints, privatePoints);
                renderPointList(privatePoints, yourPointsList);
                renderPointList(publicPoints, sharedPointsList);
            } else {
                throw new Error('Failed to fetch points from server.');
            }
        } catch (err) {
            console.error('Error fetching points:', err);
            showError('Could not load points from the server.');
        }
    }

    function renderPoints(publicPoints, privatePoints) {
        document.querySelectorAll('.point-wrapper').forEach(p => p.remove());

        const allPoints = [...publicPoints, ...privatePoints];
        
        allPoints.forEach(point => {
            const pxCoords = mcToPx(point.x, point.z);
            
            const pointWrapper = document.createElement('div');
            pointWrapper.className = 'point-wrapper';
            pointWrapper.style.left = `${(pxCoords.x / MAP_WIDTH_PX) * 100}%`;
            pointWrapper.style.top = `${(pxCoords.z / MAP_HEIGHT_PX) * 100}%`;
            pointWrapper.dataset.id = point._id;
            pointWrapper.dataset.x = point.x;
            pointWrapper.dataset.z = point.z;
            pointWrapper.dataset.status = point.status;
            pointWrapper.dataset.resourceType = point.resourceType;

            const pointElement = document.createElement('div');
            pointElement.className = 'point';
            pointElement.style.backgroundColor = MINECRAFT_RESOURCES[point.resourceType]?.color || '#888';
            pointElement.style.boxShadow = `0 0 10px ${MINECRAFT_RESOURCES[point.resourceType]?.color || '#888'}`;
            
            const pointName = document.createElement('span');
            pointName.className = 'point-name';
            pointName.textContent = point.name;
            
            pointWrapper.appendChild(pointElement);
            pointWrapper.appendChild(pointName);
            
            pointWrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                displayPointDetails(point);
            });

            mapContainer.appendChild(pointWrapper);
        });

        updatePointScaling();
    }

    function renderPointList(points, listElement) {
        listElement.innerHTML = '';
        
        const isListVisible = (listElement.id === 'your-points-list' && isShowingPrivate) || 
                              (listElement.id === 'shared-points-list' && isShowingPublic);

        if (!isListVisible) {
            listElement.closest('.panel-section').style.display = 'none';
            return;
        }

        listElement.closest('.panel-section').style.display = 'block';

        if (points.length === 0) {
            listElement.innerHTML = '<li class="no-points">Brak punktów.</li>';
            return;
        }

        points.forEach(point => {
            const listItem = document.createElement('li');
            listItem.classList.add('point-list-item');
            listItem.dataset.id = point._id;

            listItem.innerHTML = `
                <div class="point-list-item-info">
                    <strong>${point.name}</strong>
                    <small>X: ${point.x}, Z: ${point.z}</small>
                </div>
                <div class="point-list-item-actions">
                    <button class="view-on-map-btn" data-x="${point.x}" data-z="${point.z}">Pokaż na mapie</button>
                </div>
            `;
            
            const viewBtn = listItem.querySelector('.view-on-map-btn');
            viewBtn.addEventListener('click', () => {
                hideModals();
                zoomToPoint(point.x, point.z);
            });

            if (point.ownerSessionCode === sessionCode || isUserAdmin) {
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Edytuj';
                editBtn.addEventListener('click', () => {
                    editPoint(point);
                });
                listItem.querySelector('.point-list-item-actions').appendChild(editBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Usuń';
                deleteBtn.addEventListener('click', () => {
                    if (confirm('Jesteś pewien, że chcesz usunąć ten punkt?')) {
                        deletePoint(point._id);
                    }
                });
                listItem.querySelector('.point-list-item-actions').appendChild(deleteBtn);
            }

            listElement.appendChild(listItem);
        });
    }

    function hideModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.style.display = 'none');
    }

    function displayPointDetails(point) {
        const title = point.name || (MINECRAFT_RESOURCES[point.resourceType]?.name || 'Punkt');
        document.getElementById('point-details-title').textContent = title;
        document.getElementById('point-coords').textContent = `X: ${point.x}, Z: ${point.z}`;
        document.getElementById('point-description').textContent = point.description || 'Brak opisu.';
        document.getElementById('point-type').textContent = MINECRAFT_RESOURCES[point.resourceType]?.name || 'Niestandardowy';

        document.getElementById('share-point').style.display = 'none';
        document.getElementById('edit-point').style.display = 'none';
        document.getElementById('delete-point').style.display = 'none';

        if (point.ownerSessionCode === sessionCode) {
            document.getElementById('edit-point').style.display = 'inline-block';
            document.getElementById('delete-point').style.display = 'inline-block';

            if (point.status === 'private') {
                document.getElementById('share-point').style.display = 'inline-block';
                document.getElementById('share-point').textContent = 'Udostępnij Punkt';
            }
        }
        
        pointDetailsModal.style.display = 'flex';
    }

    function editPoint(point) {
        addPointForm.dataset.mode = 'edit';
        addPointForm.dataset.pointId = point._id;
        
        if (MINECRAFT_RESOURCES[point.resourceType]) {
            resourceSelect.value = point.resourceType;
            customNameGroup.style.display = 'none';
            nameInput.value = point.name;
        } else {
            resourceSelect.value = 'custom';
            customNameGroup.style.display = 'block';
            nameInput.value = point.name;
        }
        
        descriptionInput.value = point.description;
        xInput.value = point.x;
        zInput.value = point.z;
        addPointBtn.textContent = 'Zapisz zmiany';

        const addSection = document.getElementById('add-point-form');
        addSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    async function deletePoint(id) {
        try {
            const response = await fetch(`/api/points/${id}`, {
                method: 'DELETE',
                headers: { 'X-Session-Code': sessionCode }
            });

            if (response.ok) {
                showSuccess('Point deleted successfully.');
                fetchPoints();
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Failed to delete point.');
            }
        } catch (err) {
            console.error('Error deleting point:', err);
            showError('Server connection error.');
        }
    }

    function clearInputs() {
        resourceSelect.value = 'diamond_ore';
        customNameGroup.style.display = 'none';
        nameInput.value = '';
        descriptionInput.value = '';
        xInput.value = '';
        zInput.value = '';
        addPointBtn.textContent = 'Dodaj Punkt';
        addPointForm.dataset.mode = 'add';
        addPointForm.dataset.pointId = '';
    }

    // === Owner/Admin Panel Functions ===
    const OWNER_SESSION_CODES = [
        '270ea844-8ab8-4ea1-a34c-18ea2e6a920a',
        '301263ee-49a9-4575-8c3d-f784bae7b27d'
    ];

    async function checkUserPermissions() {
        isUserOwner = OWNER_SESSION_CODES.includes(sessionCode);
        if (isUserOwner) {
            ownerLoginBtn.style.display = 'block';
        }

        try {
            const adminRes = await fetch('/api/admin/pending', {
                headers: { 'X-Session-Code': sessionCode }
            });
            if (adminRes.status === 200) {
                isUserAdmin = true;
                adminLoginBtn.style.display = 'block';
            }
        } catch (err) {
            console.log('User has no admin permissions.');
        }
    }

    async function fetchPendingPoints() {
        const pendingPointsList = document.getElementById('pending-points-list');
        pendingPointsList.innerHTML = '<li class="loading">Ładowanie...</li>';
        try {
            const response = await fetch('/api/admin/pending', {
                headers: { 'X-Session-Code': sessionCode }
            });
            const points = await response.json();

            pendingPointsList.innerHTML = '';
            if (points.length === 0) {
                pendingPointsList.innerHTML = '<li class="no-points">Brak oczekujących punktów.</li>';
                return;
            }

            points.forEach(point => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div>
                        <strong>${point.name}</strong> (${point.x}, ${point.z})<br>
                        <small>Opis: ${point.description || 'Brak'}</small>
                    </div>
                    <div>
                        <button class="approve-btn button button-primary" data-id="${point._id}">Zatwierdź</button>
                        <button class="deny-btn button button-delete" data-id="${point._id}">Odrzuć</button>
                    </div>
                `;
                pendingPointsList.appendChild(li);
            });
        } catch (err) {
            showError('Failed to load pending points.');
            console.error('Error fetching pending points:', err);
        }
    }

    async function approvePoint(id) {
        try {
            const response = await fetch(`/api/admin/approve/${id}`, {
                method: 'PUT',
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                showSuccess('Point approved!');
                fetchPendingPoints();
                fetchPoints();
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Failed to approve point.');
            }
        } catch (err) {
            showError('Server connection error.');
            console.error('Error approving point:', err);
        }
    }

    async function denyPoint(id) {
        try {
            const response = await fetch(`/api/admin/deny/${id}`, {
                method: 'DELETE',
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                showSuccess('Point denied and removed.');
                fetchPendingPoints();
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Failed to deny point.');
            }
        } catch (err) {
            showError('Server connection error.');
            console.error('Error denying point:', err);
        }
    }

    async function fetchAllowedSessions() {
        const allowedSessionsList = document.getElementById('allowed-sessions-list');
        allowedSessionsList.innerHTML = '<li class="loading">Ładowanie...</li>';
        try {
            const response = await fetch('/api/owner/sessions', {
                headers: { 'X-Session-Code': sessionCode }
            });
            const sessions = await response.json();

            allowedSessionsList.innerHTML = '';
            if (sessions.length === 0) {
                allowedSessionsList.innerHTML = '<li class="no-sessions">Brak dozwolonych sesji.</li>';
                return;
            }

            sessions.forEach(s => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${s.sessionCode}</span>
                    <button class="delete-session button button-delete" data-code="${s.sessionCode}">Usuń</button>
                `;
                li.querySelector('.delete-session').addEventListener('click', () => {
                    if (confirm(`Jesteś pewien, że chcesz usunąć sesję "${s.sessionCode}"?`)) {
                        deleteAllowedSession(s.sessionCode);
                    }
                });
                allowedSessionsList.appendChild(li);
            });
        } catch (err) {
            showError('Failed to load allowed sessions.');
            console.error('Error fetching allowed sessions:', err);
        }
    }

    async function deleteAllowedSession(code) {
        try {
            const response = await fetch(`/api/owner/sessions/${code}`, {
                method: 'DELETE',
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                showSuccess('Session deleted successfully.');
                fetchAllowedSessions();
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Failed to delete session.');
            }
        } catch (err) {
            showError('Server connection error.');
            console.error('Error deleting session:', err);
        }
    }

    // === Event Listeners ===
    mapContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        mapContainer.style.cursor = 'grabbing';
    });

    mapContainer.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;
        currentMapX += deltaX;
        currentMapY += deltaY;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        updateMapTransform();
        updateCoordinatesInfo(e);
    });
    
    mapContainer.addEventListener('mouseup', () => {
        isDragging = false;
        mapContainer.style.cursor = 'grab';
    });
    
    mapContainer.addEventListener('mouseleave', () => {
        isDragging = false;
        mapContainer.style.cursor = 'grab';
    });

    mapContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const direction = e.deltaY > 0 ? -1 : 1;
        zoom(direction);
    });

    zoomInBtn.addEventListener('click', () => zoom(1));
    zoomOutBtn.addEventListener('click', () => zoom(-1));
    resetViewBtn.addEventListener('click', resetView);

    showYourPointsBtn.addEventListener('click', () => {
        isShowingPrivate = !isShowingPrivate;
        showYourPointsBtn.classList.toggle('active', isShowingPrivate);
        fetchPoints(); 
    });

    showSharedPointsBtn.addEventListener('click', () => {
        isShowingPublic = !isShowingPublic;
        showSharedPointsBtn.classList.toggle('active', isShowingPublic);
        fetchPoints(); 
    });

    addPointForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const mode = addPointForm.dataset.mode || 'add';
        const pointId = addPointForm.dataset.pointId;

        const pointData = {
            name: nameInput.value,
            description: descriptionInput.value,
            x: xInput.value,
            z: zInput.value,
            resourceType: resourceSelect.value,
            status: 'private'
        };
        
        if (resourceSelect.value === 'custom') {
            pointData.name = nameInput.value;
        } else {
            pointData.name = MINECRAFT_RESOURCES[resourceSelect.value]?.name;
        }

        try {
            addPointBtn.disabled = true;
            let response;
            if (mode === 'edit') {
                response = await fetch(`/api/points/${pointId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Session-Code': sessionCode
                    },
                    body: JSON.stringify(pointData)
                });
            } else {
                response = await fetch('/api/points', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Session-Code': sessionCode
                    },
                    body: JSON.stringify(pointData)
                });
            }

            if (response.ok) {
                clearInputs();
                fetchPoints();
                showSuccess(mode === 'edit' ? 'Point updated!' : 'Point added!');
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Error occurred while saving point.');
            }
        } catch (err) {
            console.error('Error saving point:', err);
            showError('Server connection error.');
        } finally {
            addPointBtn.disabled = false;
        }
    });

    resourceSelect.addEventListener('change', () => {
        if (resourceSelect.value === 'custom') {
            customNameGroup.style.display = 'block';
            nameInput.required = true;
        } else {
            customNameGroup.style.display = 'none';
            nameInput.required = false;
        }
    });

    document.querySelectorAll('.modal .close-button').forEach(btn => {
        btn.addEventListener('click', hideModals);
    });

    pointDetailsModal.addEventListener('click', (e) => {
        if (e.target === pointDetailsModal) {
            hideModals();
        }
    });
    
    adminLoginModal.addEventListener('click', (e) => {
        if (e.target === adminLoginModal) {
            hideModals();
        }
    });

    adminPanelModal.addEventListener('click', (e) => {
        if (e.target === adminPanelModal) {
            hideModals();
        }
    });
    
    ownerPanelModal.addEventListener('click', (e) => {
        if (e.target === ownerPanelModal) {
            hideModals();
        }
    });
    
    adminLoginBtn.addEventListener('click', () => {
        hideModals();
        adminLoginModal.style.display = 'flex';
    });

    document.getElementById('login-as-admin').addEventListener('click', async () => {
        const code = document.getElementById('admin-login-input').value;
        try {
            const response = await fetch('/api/admin/pending', {
                method: 'GET',
                headers: { 'X-Session-Code': code }
            });
            if (response.ok) {
                localStorage.setItem('sessionCode', code);
                sessionCode = code;
                isUserAdmin = true;
                hideModals();
                adminPanelModal.style.display = 'flex';
                fetchPendingPoints();
                showSuccess('Admin login successful!');
            } else {
                const data = await response.json();
                showError(data.message || 'Invalid admin code.');
            }
        } catch (err) {
            showError('Server connection error.');
        }
    });

    ownerLoginBtn.addEventListener('click', () => {
        hideModals();
        if (isUserOwner) {
            ownerPanelModal.style.display = 'flex';
            fetchAllowedSessions();
        } else {
            showError('You do not have owner permissions.');
        }
    });

    document.getElementById('promote-user').addEventListener('click', async () => {
        const code = document.getElementById('promote-session-code').value;
        if (!code) {
            return showError('Please enter a session code.');
        }
        try {
            const response = await fetch('/api/owner/promote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Code': sessionCode
                },
                body: JSON.stringify({ sessionCode: code })
            });
            const data = await response.json();
            if (response.ok) {
                showSuccess(data.message);
                document.getElementById('promote-session-code').value = '';
            } else {
                showError(data.message || 'Failed to promote user.');
            }
        } catch (err) {
            showError('Server connection error.');
        }
    });
    
    document.getElementById('add-session-btn').addEventListener('click', async () => {
        const newSessionCode = document.getElementById('new-session-code').value;
        if (!newSessionCode) {
            return showError('Please enter a new session code.');
        }
        try {
            const response = await fetch('/api/owner/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Code': sessionCode
                },
                body: JSON.stringify({ sessionCode: newSessionCode })
            });
            const data = await response.json();
            if (response.ok) {
                showSuccess(data.message);
                document.getElementById('new-session-code').value = '';
                fetchAllowedSessions();
            } else {
                showError(data.message || 'Failed to add session.');
            }
        } catch (err) {
            showError('Server connection error.');
        }
    });

    adminPanelModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('approve-btn')) {
            const id = e.target.dataset.id;
            approvePoint(id);
        }
        if (e.target.classList.contains('deny-btn')) {
            const id = e.target.dataset.id;
            denyPoint(id);
        }
        if (e.target.id === 'refresh-pending') {
            fetchPendingPoints();
        }
    });

    // Initial setup
    localStorage.setItem('sessionCode', sessionCode);
    sessionCodeDisplay.textContent = `Session: ${sessionCode}`;
    fetchPoints();
    checkUserPermissions();
});
