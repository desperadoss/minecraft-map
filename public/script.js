document.addEventListener('DOMContentLoaded', () => {
    // === Selektory HTML ===
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
    
    // Formularz dodawania punktu
    const resourceSelect = document.getElementById('resource-select');
    const customNameGroup = document.getElementById('custom-name-group');
    const nameInput = document.getElementById('name-input');
    const xInput = document.getElementById('x-input');
    const zInput = document.getElementById('z-input');
    const addPointBtn = document.getElementById('add-point-button');

    // Modale
    const pointDetailsModal = document.getElementById('point-details-modal');
    const adminLoginModal = document.getElementById('admin-login-modal');
    const adminPanelModal = document.getElementById('admin-panel-modal');
    const ownerPanelModal = document.getElementById('owner-panel-modal');
    
    // Przyciski i pola w modalach
    const closeButtons = document.querySelectorAll('.close-button');
    const sharePointBtn = document.getElementById('share-point');
    const editPointBtn = document.getElementById('edit-point');
    const deletePointBtn = document.getElementById('delete-point');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminLoginInput = document.getElementById('admin-login-input');
    const refreshPendingBtn = document.getElementById('refresh-pending');
    const promoteUserBtn = document.getElementById('promote-user');
    const promoteSessionCodeInput = document.getElementById('promote-session-code');
    const pendingPointsList = document.getElementById('pending-points-list');
    
    // Elementy panelu właściciela
    const newSessionCodeInput = document.getElementById('new-session-code');
    const addSessionBtn = document.getElementById('add-session-btn');
    const allowedSessionsList = document.getElementById('allowed-sessions-list');
    const refreshSessionsBtn = document.getElementById('refresh-sessions');
    
    // === Definicje zasobów Minecraft ===
    const MINECRAFT_RESOURCES = {
        // Rudy
        'diamond_ore': { name: 'Diament', color: '#5DADE2', category: 'ore' },
        'iron_ore':    { name: 'Żelazo', color: '#B7950B', category: 'ore' },
        'gold_ore':    { name: 'Złoto', color: '#F1C40F', category: 'ore' },
        'coal_ore':    { name: 'Węgiel', color: '#2C3E50', category: 'ore' },
        'copper_ore':  { name: 'Miedź', color: '#E67E22', category: 'ore' },
        'redstone_ore':{ name: 'Redstone', color: '#E74C3C', category: 'ore' },
        'lapis_ore':   { name: 'Lapis Lazuli', color: '#3498DB', category: 'ore' },
        'emerald_ore': { name: 'Emerald', color: '#2ECC71', category: 'ore' },
        'netherite':   { name: 'Netherite', color: '#8B4513', category: 'ore' },
        
        // Struktury
        'village':     { name: 'Wioska', color: '#D2691E', category: 'structure' },
        'stronghold':  { name: 'Twierdza', color: '#7D3C98', category: 'structure' },
        'nether_fortress': { name: 'Netherowa forteca', color: '#922B21', category: 'structure' },
        'end_city':    { name: 'Endowe miasto', color: '#F7DC6F', category: 'structure' },
        'ocean_monument': { name: 'Podwodna świątynia', color: '#3498DB', category: 'structure' },
        'woodland_mansion': { name: 'Leśny dwór', color: '#145A32', category: 'structure' },
        'desert_temple': { name: 'Pustynna świątynia', color: '#D68910', category: 'structure' },
        'jungle_temple': { name: 'Dżunglowa świątynia', color: '#239B56', category: 'structure' },
        
        // Inne
        'spawn':   { name: 'Punkt spawnu', color: '#32CD32', category: 'other' },
        'base':    { name: 'Baza', color: '#4169E1', category: 'other' },
        'farm':    { name: 'Farm', color: '#9ACD32', category: 'other' },
        'portal':  { name: 'Portal Netherowy', color: '#8A2BE2', category: 'other' },
        'treasure':{ name: 'Skarb', color: '#FFD700', category: 'other' }
    };
    
    // === Konfiguracja i zmienne globalne ===
    const MAP_WIDTH_PX = 10000;
    const MAP_HEIGHT_PX = 5500;
    const MAP_X_RANGE = 5000;
    const MAP_Z_RANGE = 2750;
    
    let currentScale = 0.18;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let startX, startY;
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    let isShowingPrivate = true;
    let isShowingPublic = true;
    let isThrottling = false;

    let sessionCode = localStorage.getItem('sessionCode');
    if (!sessionCode) {
        sessionCode = uuid.v4();
        localStorage.setItem('sessionCode', sessionCode);
    }
    sessionCodeDisplay.textContent = `Kod sesji: ${sessionCode}`;

    let isUserAdmin = false;
    let isUserOwner = false;

    // === Funkcje pomocnicze ===
    function mcToPx(x, z) {
        const pxX = (x + MAP_X_RANGE) / (MAP_X_RANGE * 2) * MAP_WIDTH_PX;
        const pxZ = (z + MAP_Z_RANGE) / (MAP_Z_RANGE * 2) * MAP_HEIGHT_PX;
        return { x: pxX, z: pxZ };
    }
    
    function pxToMc(pxX, pxZ) {
        const mcX = (pxX / MAP_WIDTH_PX * (MAP_X_RANGE * 2)) - MAP_X_RANGE;
        const mcZ = (pxZ / MAP_HEIGHT_PX * (MAP_Z_RANGE * 2)) - MAP_Z_RANGE;
        return { x: Math.round(mcX), z: Math.round(mcZ) };
    }

    function updateMapPosition() {
        if (isThrottling) return;
        
        const containerRect = mapContainer.parentElement.getBoundingClientRect();
        const scaledWidth = MAP_WIDTH_PX * currentScale;
        const scaledHeight = MAP_HEIGHT_PX * currentScale;

        const maxOffsetX = (scaledWidth > containerRect.width) ? (scaledWidth - containerRect.width) / 2 : 0;
        const maxOffsetY = (scaledHeight > containerRect.height) ? (scaledHeight - containerRect.height) / 2 : 0;
        
        offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX));
        offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY));

        mapContainer.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${currentScale})`;
        zoomInfo.textContent = `Zoom: ${Math.round((currentScale - 0.18) * 100 / 0.82)}%`;
        
        updateCoordinatesFromMouse(lastMouseX, lastMouseY);
        
        isThrottling = true;
        requestAnimationFrame(() => {
            isThrottling = false;
        });
    }

    function updateCoordinatesFromMouse(clientX, clientY) {
        const containerRect = mapContainer.parentElement.getBoundingClientRect();
        
        const mouseX = clientX - containerRect.left;
        const mouseY = clientY - containerRect.top;
        
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;
        
        const cursorX = (mouseX - centerX - offsetX) / currentScale;
        const cursorY = (mouseY - centerY - offsetY) / currentScale;
        
        const mcCoords = pxToMc(cursorX + MAP_WIDTH_PX/2, cursorY + MAP_HEIGHT_PX/2);
        coordinatesInfo.textContent = `X: ${mcCoords.x}, Z: ${mcCoords.z}`;
    }

    function hideModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.style.display = 'none');
    }

    function showError(message) {
        console.error(message);
        alert(message);
    }

    function showSuccess(message) {
        console.log(message);
        alert(message);
    }

    function clearInputs() {
        resourceSelect.value = 'custom';
        resourceSelect.dispatchEvent(new Event('change'));
        nameInput.value = '';
        xInput.value = '';
        zInput.value = '';
        
        addPointBtn.textContent = 'Dodaj punkt';
        addPointBtn.dataset.mode = 'add';
        addPointBtn.dataset.pointId = '';
    }

    // === Logika mapy i punktów ===
    async function fetchPoints() {
        try {
            const publicRes = await fetch('/api/points');
            const publicPoints = await publicRes.json();
            
            const privateRes = await fetch('/api/points/private', {
                headers: { 'X-Session-Code': sessionCode }
            });
            const privatePoints = await privateRes.json();
            
            renderPoints([...publicPoints, ...privatePoints]);
        } catch (err) {
            console.error('Błąd pobierania punktów:', err);
            showError('Błąd pobierania punktów z serwera.');
        }
    }
    
    function renderPoints(points) {
        document.querySelectorAll('.point-wrapper').forEach(p => p.remove());

        points.forEach(point => {
            const { x, z } = mcToPx(point.x, point.z);
            
            const pointWrapper = document.createElement('div');
            pointWrapper.classList.add('point-wrapper');
            pointWrapper.dataset.pointId = point._id;
            pointWrapper.dataset.pointName = point.name;
            pointWrapper.dataset.pointX = point.x;
            pointWrapper.dataset.pointZ = point.z;
            pointWrapper.dataset.ownerSessionCode = point.ownerSessionCode;
            pointWrapper.dataset.status = point.status;
            pointWrapper.dataset.resourceType = point.resourceType || 'custom';
            pointWrapper.style.left = `${x}px`;
            pointWrapper.style.top = `${z}px`;

            const pointElement = document.createElement('div');
            pointElement.classList.add('point');
            
            // Zastosuj stylowanie specyficzne dla zasobu
            if (point.resourceType && point.resourceType !== 'custom') {
                const resource = MINECRAFT_RESOURCES[point.resourceType];
                if (resource) {
                    pointElement.style.setProperty('--resource-color', resource.color);
                    pointElement.classList.add('resource-point');
                    pointElement.classList.add(`resource-${point.resourceType}`);
                }
            } else {
                // Zachowaj oryginalne kolorowanie oparte na statusie dla niestandardowych punktów
                pointElement.classList.add(point.status);
            }
            
            const pointNameElement = document.createElement('div');
            pointNameElement.classList.add('point-name');
            pointNameElement.textContent = point.name;

            pointWrapper.appendChild(pointElement);
            pointWrapper.appendChild(pointNameElement);
            
            pointWrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                displayPointDetails(point);
            });
            
            mapContainer.appendChild(pointWrapper);
        });
        filterPoints();
    }

    function filterPoints() {
        const points = document.querySelectorAll('.point-wrapper');
        points.forEach(point => {
            const status = point.dataset.status;
            let isVisible = false;

            if (status === 'public' && isShowingPublic) {
                isVisible = true;
            } else if ((status === 'private' || status === 'pending') && isShowingPrivate) {
                isVisible = true;
            }
            
            if (isVisible) {
                point.classList.remove('hidden');
            } else {
                point.classList.add('hidden');
            }
        });
    }

    // === Obsługa zdarzeń UI ===
    mapContainer.addEventListener('mousedown', (e) => {
        if (e.target.closest('.point-wrapper')) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        mapContainer.style.cursor = 'grabbing';
        e.preventDefault();
    });
    
    window.addEventListener('mouseup', () => {
        isDragging = false;
        mapContainer.style.cursor = 'grab';
    });
    
    window.addEventListener('mousemove', (e) => {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        
        if (!isDragging) {
            updateCoordinatesFromMouse(e.clientX, e.clientY);
            return;
        }
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        offsetX += dx;
        offsetY += dy;
        startX = e.clientX;
        startY = e.clientY;
        updateMapPosition();
    });
    
    zoomInBtn.addEventListener('click', () => {
        currentScale = Math.min(5, currentScale + 0.2);
        updateMapPosition();
    });
    
    zoomOutBtn.addEventListener('click', () => {
        const containerRect = mapContainer.parentElement.getBoundingClientRect();
        const minScale = Math.max(containerRect.width / MAP_WIDTH_PX, containerRect.height / MAP_HEIGHT_PX);
        currentScale = Math.max(minScale, currentScale - 0.2);
        updateMapPosition();
    });

    resetViewBtn.addEventListener('click', () => {
        currentScale = 1;
        offsetX = 0;
        offsetY = 0;
        updateMapPosition();
    });

    showYourPointsBtn.addEventListener('click', () => {
        isShowingPrivate = !isShowingPrivate;
        showYourPointsBtn.classList.toggle('active', isShowingPrivate);
        filterPoints();
    });

    showSharedPointsBtn.addEventListener('click', () => {
        isShowingPublic = !isShowingPublic;
        showSharedPointsBtn.classList.toggle('active', isShowingPublic);
        filterPoints();
    });

    // === Logika formularza i modalów ===
    addPointBtn.addEventListener('click', async () => {
        const resourceType = resourceSelect.value;
        let name;
        
        if (resourceType === 'custom') {
            name = nameInput.value.trim();
        } else {
            name = MINECRAFT_RESOURCES[resourceType].name;
        }
        
        const x = parseInt(xInput.value);
        const z = parseInt(zInput.value);
        const mode = addPointBtn.dataset.mode;
        const pointId = addPointBtn.dataset.pointId;

        if (!name || isNaN(x) || isNaN(z)) {
            showError('Wypełnij wszystkie pola poprawnie!');
            return;
        }

        addPointBtn.disabled = true;
        addPointBtn.textContent = 'Zapisywanie...';

        try {
            let response;
            const pointData = { 
                name, 
                x, 
                z,
                resourceType: resourceType === 'custom' ? 'custom' : resourceType
            };
            
            if (mode === 'edit') {
                const point = document.querySelector('.point-wrapper[data-point-id="' + pointId + '"]');
                const isPublic = point.dataset.status === 'public';
                const url = isPublic ? `/api/admin/edit/${pointId}` : `/api/points/${pointId}`;
                
                response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Session-Code': sessionCode
                    },
                    body: JSON.stringify(pointData)
                });

                addPointBtn.textContent = 'Dodaj punkt';
                addPointBtn.dataset.mode = 'add';
                addPointBtn.dataset.pointId = '';
                
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
                showSuccess(mode === 'edit' ? 'Punkt zaktualizowany!' : 'Punkt dodany!');
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Wystąpił błąd podczas zapisywania punktu.');
            }
        } catch (err) {
            console.error('Błąd zapisywania punktu:', err);
            showError('Błąd połączenia z serwerem.');
        } finally {
            addPointBtn.disabled = false;
            if (mode === 'edit') {
                addPointBtn.textContent = 'Zapisz zmiany';
            } else {
                addPointBtn.textContent = 'Dodaj punkt';
            }
        }
    });

    closeButtons.forEach(btn => {
        btn.addEventListener('click', hideModals);
    });

    function displayPointDetails(point) {
        document.getElementById('point-name').textContent = point.name;
        document.getElementById('point-x').textContent = point.x;
        document.getElementById('point-z').textContent = point.z;
        
        // Wyświetl typ punktu
        const pointTypeElement = document.getElementById('point-type');
        if (point.resourceType && point.resourceType !== 'custom') {
            pointTypeElement.textContent = MINECRAFT_RESOURCES[point.resourceType].name;
        } else {
            pointTypeElement.textContent = 'Niestandardowy';
        }
        
        // Wyświetl status punktu
        const statusInfo = document.getElementById('point-status-info');
        statusInfo.textContent = point.status === 'private' ? 'Prywatny' : 
                                point.status === 'pending' ? 'Oczekujący' : 'Publiczny';
        statusInfo.className = 'point-status-info status-' + point.status;

        sharePointBtn.style.display = 'none';
        editPointBtn.style.display = 'none';
        deletePointBtn.style.display = 'none';

        if (point.status === 'private') {
            if (point.ownerSessionCode === sessionCode) {
                sharePointBtn.style.display = 'inline-block';
                editPointBtn.style.display = 'inline-block';
                deletePointBtn.style.display = 'inline-block';
            }
        } else if (point.status === 'pending') {
            if (point.ownerSessionCode === sessionCode || isUserAdmin) {
                editPointBtn.style.display = 'inline-block';
                deletePointBtn.style.display = 'inline-block';
            }
        } else if (point.status === 'public') {
            if (isUserAdmin) {
                editPointBtn.style.display = 'inline-block';
                deletePointBtn.style.display = 'inline-block';
            }
        }
        
        pointDetailsModal.dataset.pointId = point._id;
        pointDetailsModal.style.display = 'block';
    }

    sharePointBtn.addEventListener('click', async () => {
        const pointId = pointDetailsModal.dataset.pointId;
        try {
            const res = await fetch(`/api/points/share/${pointId}`, {
                method: 'PUT',
                headers: { 'X-Session-Code': sessionCode }
            });
            if (res.ok) {
                showSuccess('Punkt przesłany do akceptacji admina.');
                fetchPoints();
                hideModals();
            } else {
                const errorData = await res.json();
                showError(errorData.message || 'Błąd udostępniania punktu.');
            }
        } catch (err) {
            console.error('Błąd udostępniania:', err);
            showError('Błąd połączenia z serwerem.');
        }
    });

    editPointBtn.addEventListener('click', () => {
        const pointId = pointDetailsModal.dataset.pointId;
        const pointName = document.getElementById('point-name').textContent;
        const pointX = document.getElementById('point-x').textContent;
        const pointZ = document.getElementById('point-z').textContent;

        // Znajdź odpowiedni zasób na podstawie nazwy
        let resourceType = 'custom';
        for (const [key, value] of Object.entries(MINECRAFT_RESOURCES)) {
            if (value.name === pointName) {
                resourceType = key;
                break;
            }
        }
        
        // Ustaw wartości formularza
        resourceSelect.value = resourceType;
        resourceSelect.dispatchEvent(new Event('change'));
        
        if (resourceType === 'custom') {
            nameInput.value = pointName;
        }
        
        xInput.value = pointX;
        zInput.value = pointZ;
        
        addPointBtn.textContent = 'Zapisz zmiany';
        addPointBtn.dataset.mode = 'edit';
        addPointBtn.dataset.pointId = pointId;
        hideModals();
    });
    
    deletePointBtn.addEventListener('click', async () => {
        const pointId = pointDetailsModal.dataset.pointId;
        const point = document.querySelector('.point-wrapper[data-point-id="' + pointId + '"]');
        const isPublic = point.dataset.status === 'public';
        const url = isPublic ? `/api/admin/delete/${pointId}` : `/api/points/${pointId}`;

        if (!confirm('Czy na pewno chcesz usunąć ten punkt?')) {
            return;
        }

        try {
            const res = await fetch(url, {
                method: 'DELETE',
                headers: { 'X-Session-Code': sessionCode }
            });
            if (res.ok) {
                showSuccess('Punkt usunięty.');
                fetchPoints();
                hideModals();
            } else {
                const errorData = await res.json();
                showError(errorData.message || 'Błąd usuwania punktu.');
            }
        } catch (err) {
            console.error('Błąd usuwania:', err);
            showError('Błąd połączenia z serwerem.');
        }
    });

    // === Panele admina i właściciela ===
    sessionCodeDisplay.addEventListener('click', () => {
        hideModals();
        if (isUserOwner) {
            ownerPanelModal.style.display = 'block';
            fetchAllowedSessions();
        } else if (isUserAdmin) {
            adminPanelModal.style.display = 'block';
            fetchPendingPoints();
        } else {
            adminLoginModal.style.display = 'block';
        }
    });

    adminLoginBtn.addEventListener('click', async () => {
        const code = adminLoginInput.value;
        if (!code) {
            showError('Wpisz kod admina!');
            return;
        }

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Code': sessionCode
                },
                body: JSON.stringify({ adminCode: code })
            });
            
            const data = await res.json();
            
            if (res.ok && data.success) {
                isUserAdmin = true;
                hideModals();
                adminPanelModal.style.display = 'block';
                fetchPendingPoints();
                showSuccess('Pomyślnie zalogowano jako admin.');
            } else {
                showError(data.message || 'Nieprawidłowy kod admina.');
            }
        } catch (err) {
            console.error('Błąd logowania admina:', err);
            showError('Błąd połączenia z serwerem.');
        }
    });

    refreshPendingBtn.addEventListener('click', fetchPendingPoints);

    async function fetchPendingPoints() {
        try {
            const res = await fetch('/api/admin/pending', {
                headers: { 'X-Session-Code': sessionCode }
            });
            
            if (res.status === 403) {
                showError('Brak uprawnień admina.');
                isUserAdmin = false;
                return;
            }
            
            if (!res.ok) {
                throw new Error(`Błąd HTTP: ${res.status}`);
            }
            
            const pendingPoints = await res.json();
            renderPendingPoints(pendingPoints);
        } catch (err) {
            console.error('Błąd pobierania oczekujących punktów:', err);
            pendingPointsList.innerHTML = '<li>Błąd połączenia z serwerem</li>';
        }
    }

    function renderPendingPoints(points) {
        pendingPointsList.innerHTML = '';
        if (points.length === 0) {
            pendingPointsList.innerHTML = '<li>Brak oczekujących punktów.</li>';
            return;
        }

        points.forEach(point => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${point.name} (X: ${point.x}, Z: ${point.z})</span>
                <div>
                    <button class="button accept-btn" data-id="${point._id}">Akceptuj</button>
                    <button class="button reject-btn" data-id="${point._id}">Odrzuć</button>
                    <button class="button delete-btn" data-id="${point._id}">Usuń</button>
                </div>
            `;
            pendingPointsList.appendChild(li);
        });

        document.querySelectorAll('.accept-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                await fetch(`/api/admin/accept/${id}`, { 
                    method: 'PUT', 
                    headers: { 'X-Session-Code': sessionCode } 
                });
                fetchPendingPoints();
                fetchPoints();
            });
        });

        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                await fetch(`/api/admin/reject/${id}`, { 
                    method: 'PUT', 
                    headers: { 'X-Session-Code': sessionCode } 
                });
                fetchPendingPoints();
                fetchPoints();
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                await fetch(`/api/admin/delete/${id}`, { 
                    method: 'DELETE', 
                    headers: { 'X-Session-Code': sessionCode } 
                });
                fetchPendingPoints();
                fetchPoints();
            });
        });
    }

    // Panel właściciela
    addSessionBtn.addEventListener('click', async () => {
        const code = newSessionCodeInput.value;
        if (!code) {
            showError('Wpisz kod sesji!');
            return;
        }

        try {
            const res = await fetch('/api/owner/allow-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Code': sessionCode
                },
                body: JSON.stringify({ sessionCode: code })
            });
            
            if (res.ok) {
                showSuccess('Kod sesji dodany do listy dozwolonych.');
                newSessionCodeInput.value = '';
                fetchAllowedSessions();
            } else {
                const errorData = await res.json();
                showError(errorData.message || 'Błąd dodawania kodu sesji.');
            }
        } catch (err) {
            console.error('Błąd dodawania sesji:', err);
            showError('Błąd połączenia z serwerem.');
        }
    });

    promoteUserBtn.addEventListener('click', async () => {
        const code = promoteSessionCodeInput.value;
        if (!code) {
            showError('Wpisz kod sesji!');
            return;
        }

        try {
            const res = await fetch('/api/owner/promote', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Code': sessionCode
                },
                body: JSON.stringify({ sessionCode: code })
            });
            
            const result = await res.json();
            showSuccess(result.message);
            promoteSessionCodeInput.value = '';
        } catch (err) {
            console.error('Błąd awansowania użytkownika:', err);
            showError('Błąd połączenia z serwerem.');
        }
    });

    refreshSessionsBtn.addEventListener('click', fetchAllowedSessions);

    async function fetchAllowedSessions() {
        try {
            const res = await fetch('/api/owner/allowed-sessions', {
                headers: { 'X-Session-Code': sessionCode }
            });
            
            if (res.status === 403) {
                showError('Brak uprawnień właściciela.');
                isUserOwner = false;
                return;
            }
            
            if (!res.ok) {
                throw new Error(`Błąd HTTP: ${res.status}`);
            }
            
            const allowedSessions = await res.json();
            renderAllowedSessions(allowedSessions);
        } catch (err) {
            console.error('Błąd pobierania dozwolonych sesji:', err);
            allowedSessionsList.innerHTML = '<li>Błąd połączenia z serwerem</li>';
        }
    }

    function renderAllowedSessions(sessions) {
        allowedSessionsList.innerHTML = '';
        if (sessions.length === 0) {
            allowedSessionsList.innerHTML = '<li>Brak dozwolonych sesji.</li>';
            return;
        }

        sessions.forEach(session => {
            const li = document.createElement('li');
            const date = new Date(session.createdAt).toLocaleDateString();
            
            li.innerHTML = `
                <div class="session-item">
                    <span class="session-code">${session.sessionCode}</span>
                    <span class="session-date">${date}</span>
                    <button class="remove-session-btn" data-session="${session.sessionCode}">Usuń</button>
                </div>
            `;
            allowedSessionsList.appendChild(li);
        });

        document.querySelectorAll('.remove-session-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const sessionCodeToRemove = e.target.dataset.session;
                
                try {
                    const res = await fetch('/api/owner/remove-session', {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Session-Code': sessionCode
                        },
                        body: JSON.stringify({ sessionCode: sessionCodeToRemove })
                    });
                    
                    if (res.ok) {
                        showSuccess('Kod sesji usunięty z listy dozwolonych.');
                        fetchAllowedSessions();
                    } else {
                        const errorData = await res.json();
                        showError(errorData.message || 'Błąd usuwania kodu sesji.');
                    }
                } catch (err) {
                    console.error('Błąd usuwania sesji:', err);
                    showError('Błąd połączenia z serwerem.');
                }
            });
        });
    }

    // Sprawdź uprawnienia przy ładowaniu
    async function checkUserPermissions() {
        try {
            // Sprawdź czy właściciel
            const ownerRes = await fetch('/api/owner/check', {
                headers: { 'X-Session-Code': sessionCode }
            });
            
            if (ownerRes.ok) {
                const ownerData = await ownerRes.json();
                if (ownerData.isOwner) {
                    isUserOwner = true;
                    isUserAdmin = true;
                    console.log('Użytkownik jest właścicielem');
                }
            }
            
            // Jeśli nie właściciel, sprawdź czy admin
            if (!isUserOwner) {
                try {
                    const adminRes = await fetch('/api/admin/pending', {
                        headers: { 'X-Session-Code': sessionCode }
                    });
                    
                    if (adminRes.status === 200) {
                        isUserAdmin = true;
                        console.log('Użytkownik jest adminem');
                    }
                } catch (err) {
                    // Nie admin
                    console.log('Użytkownik nie ma uprawnień admina');
                }
            }
        } catch (err) {
            console.error('Błąd sprawdzania uprawnień:', err);
        }
    }

    // Inicjalizacja wyboru zasobów
    function setupResourceSelection() {
        if (!resourceSelect || !customNameGroup || !nameInput) return;
        
        resourceSelect.addEventListener('change', () => {
            if (resourceSelect.value === 'custom') {
                customNameGroup.style.display = 'flex';
                nameInput.required = true;
                nameInput.value = '';
            } else {
                customNameGroup.style.display = 'none';
                nameInput.required = false;
                
                // Ustaw nazwę na podstawie wybranego zasobu
                const resourceName = MINECRAFT_RESOURCES[resourceSelect.value].name;
                nameInput.value = resourceName;
            }
        });
        
        // Inicjalizuj stan początkowy
        resourceSelect.dispatchEvent(new Event('change'));
    }

    // Inicjalizacja
    setupResourceSelection();
    fetchPoints();
    checkUserPermissions();
    
    // Ustaw domyślny widok mapy
    updateMapPosition();
});
