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
    const nameInput = document.getElementById('name-input');
    const xInput = document.getElementById('x-input');
    const zInput = document.getElementById('z-input');
    const addPointBtn = document.getElementById('add-point-button');

    // Modali
    const pointDetailsModal = document.getElementById('point-details-modal');
    const adminLoginModal = document.getElementById('admin-login-modal');
    const adminPanelModal = document.getElementById('admin-panel-modal');
    const ownerLoginModal = document.getElementById('owner-login-modal');
    const ownerPanelModal = document.getElementById('owner-panel-modal');
    
    // Przyciski i pola w modalach
    const closeButtons = document.querySelectorAll('.close-button');
    const sharePointBtn = document.getElementById('share-point');
    const editPointBtn = document.getElementById('edit-point');
    const deletePointBtn = document.getElementById('delete-point');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminLoginInput = document.getElementById('admin-login-input');
    const ownerLoginBtn = document.getElementById('owner-login-btn');
    const ownerLoginInput = document.getElementById('owner-login-input');
    const refreshPendingBtn = document.getElementById('refresh-pending');
    const promoteUserBtn = document.getElementById('promote-user');
    const promoteSessionCodeInput = document.getElementById('promote-session-code');
    const pendingPointsList = document.getElementById('pending-points-list');
    
    // === Konfiguracja i zmienne globalne ===
    const MAP_WIDTH_PX = 10000;
    const MAP_HEIGHT_PX = 5500;
    const MAP_X_RANGE = 4200;
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
            pointWrapper.style.left = `${x}px`;
            pointWrapper.style.top = `${z}px`;

            const pointElement = document.createElement('div');
            pointElement.classList.add('point');
            pointElement.classList.add(point.status);
            
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
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        mapContainer.style.cursor = 'grabbing';
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

    // === Logika formularza i modali ===
    addPointBtn.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        const x = parseInt(xInput.value);
        const z = parseInt(zInput.value);
        const mode = addPointBtn.dataset.mode;
        const pointId = addPointBtn.dataset.pointId;

        if (!name || isNaN(x) || isNaN(z)) {
            showError('Wypełnij wszystkie pola poprawnie!');
            return;
        }

        try {
            let response;
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
                    body: JSON.stringify({ name, x, z })
                });

                addPointBtn.textContent = 'Dodaj punkt';
                addPointBtn.dataset.mode = 'add';
                addPointBtn.dataset.pointId = '';
                
            } else { // add mode
                response = await fetch('/api/points', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Session-Code': sessionCode
                    },
                    body: JSON.stringify({ name, x, z })
                });
            }

            if (response.ok) {
                nameInput.value = '';
                xInput.value = '';
                zInput.value = '';
                fetchPoints();
                showSuccess(mode === 'edit' ? 'Punkt zaktualizowany!' : 'Punkt dodany!');
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Wystąpił błąd przy zapisywaniu punktu.');
            }
        } catch (err) {
            console.error('Błąd zapisu punktu:', err);
            showError('Błąd połączenia z serwerem.');
        }
    });

    closeButtons.forEach(btn => {
        btn.addEventListener('click', hideModals);
    });

    // Zamknij modal kliknięciem poza nim
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModals();
        }
    });

    function displayPointDetails(point) {
        document.getElementById('point-name').textContent = point.name;
        document.getElementById('point-x').textContent = point.x;
        document.getElementById('point-z').textContent = point.z;

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

        nameInput.value = pointName;
        xInput.value = pointX;
        zInput.value = pointZ;
        
        addPointBtn.textContent = 'Zapisz zmiany';
        addPointBtn.dataset.mode = 'edit';
        addPointBtn.dataset.pointId = pointId;
        hideModals();
    });
    
    deletePointBtn.addEventListener('click', async () => {
        if (!confirm('Czy na pewno chcesz usunąć ten punkt?')) {
            return;
        }

        const pointId = pointDetailsModal.dataset.pointId;
        const point = document.querySelector('.point-wrapper[data-point-id="' + pointId + '"]');
        const isPublic = point.dataset.status === 'public';
        const url = isPublic ? `/api/admin/delete/${pointId}` : `/api/points/${pointId}`;

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

    // === Panele admina i ownera ===
    sessionCodeDisplay.addEventListener('click', () => {
        hideModals();
        if (isUserOwner) {
            ownerPanelModal.style.display = 'block';
        } else if (isUserAdmin) {
            adminPanelModal.style.display = 'block';
            fetchPendingPoints();
        } else {
            adminLoginModal.style.display = 'block';
        }
    });

    adminLoginBtn.addEventListener('click', async () => {
        const code = adminLoginInput.value.trim();
        if (!code) {
            showError('Wprowadź kod admina.');
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
            
            if (data.success) {
                isUserAdmin = true;
                adminLoginInput.value = '';
                hideModals();
                adminPanelModal.style.display = 'block';
                fetchPendingPoints();
                showSuccess('Pomyślnie zalogowano jako admin.');
            } else {
                showError(data.message || 'Niepoprawny kod admina.');
            }
        } catch (err) {
            console.error('Błąd logowania admina:', err);
            showError('Błąd połączenia z serwerem.');
        }
    });

    ownerLoginBtn.addEventListener('click', async () => {
        const code = ownerLoginInput.value.trim();
        if (!code) {
            showError('Wprowadź kod ownera.');
            return;
        }

        try {
            const res = await fetch('/api/owner/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Code': sessionCode
                },
                body: JSON.stringify({ ownerCode: code })
            });
            
            const data = await res.json();
            
            if (data.success) {
                isUserOwner = true;
                isUserAdmin = true;
                ownerLoginInput.value = '';
                hideModals();
                ownerPanelModal.style.display = 'block';
                showSuccess('Pomyślnie zalogowano jako owner.');
            } else {
                showError(data.message || 'Niepoprawny kod ownera.');
            }
        } catch (err) {
            console.error('Błąd logowania ownera:', err);
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
                    <button class="button reject-btn" data-id="${point._id}">Usuń</button>
                </div>
            `;
            pendingPointsList.appendChild(li);
        });

        document.querySelectorAll('.accept-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                try {
                    const res = await fetch(`/api/admin/accept/${id}`, { 
                        method: 'PUT', 
                        headers: { 'X-Session-Code': sessionCode } 
                    });
                    if (res.ok) {
                        fetchPendingPoints();
                        fetchPoints();
                        showSuccess('Punkt zaakceptowany.');
                    } else {
                        const errorData = await res.json();
                        showError(errorData.message || 'Błąd akceptacji punktu.');
                    }
                } catch (err) {
                    console.error('Błąd akceptacji:', err);
                    showError('Błąd połączenia z serwerem.');
                }
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!confirm('Czy na pewno chcesz usunąć ten punkt?')) {
                    return;
                }
                
                const id = e.target.dataset.id;
                try {
                    const res = await fetch(`/api/admin/delete/${id}`, { 
                        method: 'DELETE', 
                        headers: { 'X-Session-Code': sessionCode } 
                    });
                    if (res.ok) {
                        fetchPendingPoints();
                        fetchPoints();
                        showSuccess('Punkt usunięty.');
                    } else {
                        const errorData = await res.json();
                        showError(errorData.message || 'Błąd usuwania punktu.');
                    }
                } catch (err) {
                    console.error('Błąd usuwania:', err);
                    showError('Błąd połączenia z serwerem.');
                }
            });
        });
    }

    promoteUserBtn.addEventListener('click', async () => {
        const code = promoteSessionCodeInput.value.trim();
        if (!code) {
            showError('Wpisz kod sesji użytkownika do awansowania.');
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
            if (res.ok) {
                promoteSessionCodeInput.value = '';
                showSuccess(result.message);
            } else {
                showError(result.message || 'Błąd awansowania użytkownika.');
            }
        } catch (err) {
            console.error('Błąd awansowania użytkownika:', err);
            showError('Błąd połączenia z serwerem.');
        }
    });

    // Obsługa Enter w polach input
    [adminLoginInput, ownerLoginInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (input === adminLoginInput) {
                    adminLoginBtn.click();
                } else if (input === ownerLoginInput) {
                    ownerLoginBtn.click();
                }
            }
        });
    });

    promoteSessionCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            promoteUserBtn.click();
        }
    });

    [nameInput, xInput, zInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addPointBtn.click();
            }
        });
    });

    // Inicjalizacja
    updateMapPosition();
    fetchPoints();
});

