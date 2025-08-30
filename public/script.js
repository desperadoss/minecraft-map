document.addEventListener('DOMContentLoaded', () => {
    // === Configuration ===
const MAP_CONFIG = {
    width: 7990,
    height: 4684,
    minX: -3995,
    maxX: 3995,
    minZ: -2342,
    maxZ: 2342,
    gridSize: 50,
    minZoom: 0.1,
    maxZoom: 3.0,
    zoomStep: 0.1
};

    // Resource types with colors
const RESOURCE_TYPES = {
    diamond_ore: { name: 'Diamond Ore', color: '#00FFFF' },
    iron_ore: { name: 'Iron Ore', color: '#C0C0C0' },
    gold_ore: { name: 'Gold Ore', color: '#FFD700' },
    coal_ore: { name: 'Coal Ore', color: '#2C2C2C' },
    copper_ore: { name: 'Copper Ore', color: '#B87333' },
    redstone_ore: { name: 'Redstone Ore', color: '#FF0000' },
    lapis_ore: { name: 'Lapis Lazuli Ore', color: '#007FFF' },
    emerald_ore: { name: 'Emerald Ore', color: '#00C957' },
    netherite: { name: 'Ancient Debris', color: '#554441' },
    village: { name: 'Village', color: '#FFDAB9' },
    stronghold: { name: 'Stronghold', color: '#8A2BE2' },
    nether_fortress: { name: 'Nether Fortress', color: '#8B0000' },
    end_city: { name: 'End City', color: '#9932CC' },
    ocean_monument: { name: 'Ocean Monument', color: '#4169E1' },
    woodland_mansion: { name: 'Woodland Mansion', color: '#556B2F' },
    desert_temple: { name: 'Desert Temple', color: '#F0E68C' },
    jungle_temple: { name: 'Jungle Temple', color: '#228B22' },
    igloo: { name: 'Igloo', color: '#FFFFFF' },
    shipwreck: { name: 'Shipwreck', color: '#CD853F' },
    mushroom_biome: { name: 'Mushroom Island', color: '#9400D3' },
    mesa: { name: 'Badlands', color: '#CD5C5C' },
    ice_spikes: { name: 'Ice Spikes', color: '#ADD8E6' },
    flower_forest: { name: 'Flower Forest', color: '#FFB6C1' },
    spawn: { name: 'Spawn Point', color: '#FFA500' },
    base: { name: 'Base', color: '#008080' },
    farm: { name: 'Farm', color: '#7FFF00' },
    portal: { name: 'Nether Portal', color: '#9370DB' },
    treasure: { name: 'Treasure', color: '#FFD700' },
    custom: { name: 'Custom', color: '#888888' }
};

    // Owner session codes
    const OWNER_SESSION_CODES = [
        '270ea844-8ab8-4ea1-a34c-18ea2e6a920a',
        '301263ee-49a9-4575-8c3d-f784bae7b27d'
    ];

    // === Global State ===
    let sessionCode = localStorage.getItem('sessionCode') || crypto.randomUUID();
    let currentZoom = 1.0;
    let currentPanX = 0;
    let currentPanY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let isUserAdmin = false;
    let isUserOwner = false;
    let showPrivatePoints = true;
    let showPublicPoints = true;
    let allPoints = [];

    // === DOM Elements ===
    const mapViewport = document.getElementById('map-viewport');
    const mapCanvas = document.getElementById('map-canvas');
    const mapImage = document.getElementById('minecraft-map');
    const mapGrid = document.getElementById('map-grid');
    const sessionDisplay = document.getElementById('session-display');
    const coordinatesDisplay = document.getElementById('coordinates-display');
    const zoomDisplay = document.getElementById('zoom-display');
    
    // Buttons and controls
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');
    const filterPrivateBtn = document.getElementById('filter-private');
    const filterPublicBtn = document.getElementById('filter-public');
    const addPointBtn = document.getElementById('add-point-btn');
    const loginBtn = document.getElementById('login-btn');
    
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const adminNav = document.getElementById('admin-nav');
    const ownerNav = document.getElementById('owner-nav');

    // Modals
    const addPointModal = document.getElementById('add-point-modal');
    const pointDetailsModal = document.getElementById('point-details-modal');
    const loginModal = document.getElementById('login-modal');
    const pointsListModal = document.getElementById('points-list-modal');
    const adminPanelModal = document.getElementById('admin-panel-modal');
    const ownerPanelModal = document.getElementById('owner-panel-modal');

    // Forms
    const addPointForm = document.getElementById('add-point-form');
    const resourceSelect = document.getElementById('resource-select');
    const customNameGroup = document.getElementById('custom-name-group');
    const nameInput = document.getElementById('name-input');
    const descriptionInput = document.getElementById('description-input');
    const xInput = document.getElementById('x-input');
    const zInput = document.getElementById('z-input');

    // === Helper Functions ===
    function showNotification(message, type = 'success') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
        
        // Add CSS animations if not already present
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

function mcToPixel(x, z) {
    // Convert Minecraft coordinates to pixel coordinates
    // Mapujemy zakres Minecraft (-4002 do 4002, -2250 do 2250) na piksele (0 do width, 0 do height)
    const pixelX = ((x - MAP_CONFIG.minX) / (MAP_CONFIG.maxX - MAP_CONFIG.minX)) * MAP_CONFIG.width;
    const pixelZ = ((z - MAP_CONFIG.minZ) / (MAP_CONFIG.maxZ - MAP_CONFIG.minZ)) * MAP_CONFIG.height;
    return { x: pixelX, z: pixelZ };
}

    function pixelToMc(pixelX, pixelZ) {
        // Convert pixel coordinates to Minecraft coordinates
        const x = MAP_CONFIG.minX + (pixelX / MAP_CONFIG.width) * (MAP_CONFIG.maxX - MAP_CONFIG.minX);
        const z = MAP_CONFIG.minZ + (pixelZ / MAP_CONFIG.height) * (MAP_CONFIG.maxZ - MAP_CONFIG.minZ);
        return { x, z };
    }

function updateMapTransform() {
    mapCanvas.style.transform = `translate(${currentPanX}px, ${currentPanY}px) scale(${currentZoom})`;
    updateZoomDisplay();
    updatePointSizes();
}

    function updateZoomDisplay() {
        zoomDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
    }

    function updatePointSizes() {
        const points = document.querySelectorAll('.point-marker');
        points.forEach(point => {
            const size = 12 / currentZoom;
            point.style.width = `${size}px`;
            point.style.height = `${size}px`;
        });
    }

    function updateCoordinates(event) {
        const rect = mapViewport.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Convert mouse position to map pixel coordinates accounting for pan and zoom
        const mapPixelX = (mouseX - currentPanX) / currentZoom;
        const mapPixelZ = (mouseY - currentPanY) / currentZoom;
        
        // Convert to Minecraft coordinates
        const mcCoords = pixelToMc(mapPixelX, mapPixelZ);
        coordinatesDisplay.textContent = `X: ${Math.round(mcCoords.x)}, Z: ${Math.round(mcCoords.z)}`;
    }

    function createGrid() {
        mapGrid.innerHTML = '';
        const gridSpacing = MAP_CONFIG.gridSize; // 50 blocks = 50 pixels on map
        
        // Create vertical lines
        for (let x = 0; x <= MAP_CONFIG.width; x += gridSpacing) {
            const line = document.createElement('div');
            line.className = 'grid-line vertical';
            line.style.left = `${x}px`;
            mapGrid.appendChild(line);
        }
        
        // Create horizontal lines
        for (let z = 0; z <= MAP_CONFIG.height; z += gridSpacing) {
            const line = document.createElement('div');
            line.className = 'grid-line horizontal';
            line.style.top = `${z}px`;
            mapGrid.appendChild(line);
        }
    }

    function centerMapAt(x, z) {
        const pixelCoords = mcToPixel(x, z);
        
        // Calculate pan to center the point with 50px offset upward
        const viewportCenterX = mapViewport.clientWidth / 2;
        const viewportCenterY = mapViewport.clientHeight / 2;
        
        currentPanX = viewportCenterX - pixelCoords.x * currentZoom;
        currentPanY = viewportCenterY - pixelCoords.z * currentZoom - 50; // 50px offset w górę
        
        updateMapTransform();
    }

    function resetView() {
        currentZoom = 1.0;
        // Reset do pozycji 0,0 z offsetem
        setTimeout(() => {
            centerMapAt(0, 0);
        }, 10);
    }

function centerMapOnViewport() {
    // Calculate the offset needed to center the map in the viewport
    const viewportWidth = mapViewport.clientWidth;
    const viewportHeight = mapViewport.clientHeight;
    const mapWidth = MAP_CONFIG.width * currentZoom;
    const mapHeight = MAP_CONFIG.height * currentZoom;
    
    // Center the map by calculating the offset from viewport center to map center
    currentPanX = (viewportWidth - mapWidth) / 2;
    currentPanY = (viewportHeight - mapHeight) / 2;
    
    updateMapTransform();
}

    function zoom(direction) {
        const newZoom = currentZoom + direction * MAP_CONFIG.zoomStep;
        if (newZoom >= MAP_CONFIG.minZoom && newZoom <= MAP_CONFIG.maxZoom) {
            currentZoom = newZoom;
            updateMapTransform();
        }
    }

    // === Point Management ===
    async function fetchPoints() {
        try {
            const response = await fetch('/api/points', {
                headers: { 'X-Session-Code': sessionCode }
            });

            if (response.ok) {
                const { privatePoints, publicPoints } = await response.json();
                allPoints = [...privatePoints, ...publicPoints];
                renderPoints();
            } else {
                showNotification('Błąd przy pobieraniu punktów', 'error');
            }
        } catch (error) {
            console.error('Error fetching points:', error);
            showNotification('Błąd połączenia z serwerem', 'error');
        }
    }

    function renderPoints() {
        // Clear existing points
        document.querySelectorAll('.point-marker').forEach(point => point.remove());
        
        allPoints.forEach(point => {
            // Filter points based on visibility settings
            const isPrivate = point.ownerSessionCode === sessionCode;
            const isPublic = point.status === 'public';
            
            if ((!showPrivatePoints && isPrivate) || (!showPublicPoints && isPublic)) {
                return;
            }
            
            const pixelCoords = mcToPixel(point.x, point.z);
            const pointElement = document.createElement('div');
            pointElement.className = 'point-marker';
            pointElement.style.left = `${pixelCoords.x}px`;
            pointElement.style.top = `${pixelCoords.z}px`;
            pointElement.style.backgroundColor = RESOURCE_TYPES[point.resourceType]?.color || '#888888';
            
            const label = document.createElement('div');
            label.className = 'point-label';
            label.textContent = point.name;
            pointElement.appendChild(label);
            
            pointElement.addEventListener('click', (e) => {
                e.stopPropagation();
                showPointDetails(point);
            });
            
            mapCanvas.appendChild(pointElement);
        });
        
        updatePointSizes();
    }

    function showPointDetails(point) {
        document.getElementById('point-details-title').textContent = point.name;
        document.getElementById('point-coords-display').textContent = `X: ${point.x}, Z: ${point.z}`;
        document.getElementById('point-type-display').textContent = RESOURCE_TYPES[point.resourceType]?.name || 'Niestandardowy';
        document.getElementById('point-description-display').textContent = point.description || 'Brak opisu';
        
        // Show/hide action buttons based on ownership
        const shareBtn = document.getElementById('share-point');
        const editBtn = document.getElementById('edit-point');
        const deleteBtn = document.getElementById('delete-point');
        
        const isOwner = point.ownerSessionCode === sessionCode;
        const canEdit = isOwner || isUserAdmin;
        
        shareBtn.style.display = (isOwner && point.status === 'private') ? 'block' : 'none';
        editBtn.style.display = canEdit ? 'block' : 'none';
        deleteBtn.style.display = canEdit ? 'block' : 'none';
        
        // Store current point for actions
        pointDetailsModal.currentPoint = point;
        showModal(pointDetailsModal);
    }

    async function addOrUpdatePoint(pointData, isUpdate = false, pointId = null) {
        try {
            const url = isUpdate ? `/api/points/${pointId}` : '/api/points';
            const method = isUpdate ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Code': sessionCode
                },
                body: JSON.stringify(pointData)
            });

            if (response.ok) {
                showNotification(isUpdate ? 'Punkt zaktualizowany' : 'Punkt dodany');
                hideAllModals();
                clearForm();
                fetchPoints();
            } else {
                const error = await response.json();
                showNotification(error.message || 'Błąd przy zapisywaniu punktu', 'error');
            }
        } catch (error) {
            console.error('Error saving point:', error);
            showNotification('Błąd połączenia z serwerem', 'error');
        }
    }

    async function deletePoint(pointId) {
        if (!confirm('Czy na pewno chcesz usunąć ten punkt?')) return;
        
        try {
            const response = await fetch(`/api/points/${pointId}`, {
                method: 'DELETE',
                headers: { 'X-Session-Code': sessionCode }
            });

            if (response.ok) {
                showNotification('Punkt usunięty');
                hideAllModals();
                fetchPoints();
            } else {
                const error = await response.json();
                showNotification(error.message || 'Błąd przy usuwaniu punktu', 'error');
            }
        } catch (error) {
            console.error('Error deleting point:', error);
            showNotification('Błąd połączenia z serwerem', 'error');
        }
    }

    // === Modal Management ===
    function showModal(modal) {
        hideAllModals();
        modal.style.display = 'flex';
    }

    function hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    function clearForm() {
        resourceSelect.value = 'diamond_ore';
        nameInput.value = '';
        descriptionInput.value = '';
        xInput.value = '';
        zInput.value = '';
        customNameGroup.style.display = 'none';
        addPointForm.dataset.mode = 'add';
        addPointForm.dataset.pointId = '';
    }

    // === User Authentication ===
    async function checkUserPermissions() {
        // Check if user is owner
        isUserOwner = OWNER_SESSION_CODES.includes(sessionCode);
        if (isUserOwner) {
            ownerNav.style.display = 'block';
        }

        // Check if user is admin
        try {
            const response = await fetch('/api/admin/pending', {
                headers: { 'X-Session-Code': sessionCode }
            });
            
            if (response.ok) {
                isUserAdmin = true;
                adminNav.style.display = 'block';
            }
        } catch (error) {
            console.log('User is not admin');
        }
    }

    // === Event Listeners ===
    
    // Map interaction
    mapViewport.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        mapViewport.style.cursor = 'grabbing';
    });

    mapViewport.addEventListener('mousemove', (e) => {
        updateCoordinates(e);
        
        if (!isDragging) return;
        
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;
        
        currentPanX += deltaX;
        currentPanY += deltaY;
        
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        
        updateMapTransform();
    });

    mapViewport.addEventListener('mouseup', () => {
        isDragging = false;
        mapViewport.style.cursor = 'grab';
    });

    mapViewport.addEventListener('mouseleave', () => {
        isDragging = false;
        mapViewport.style.cursor = 'grab';
    });

    mapViewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const direction = e.deltaY > 0 ? -1 : 1;
        zoom(direction);
    });

    // Zoom controls
    zoomInBtn.addEventListener('click', () => zoom(1));
    zoomOutBtn.addEventListener('click', () => zoom(-1));
    zoomResetBtn.addEventListener('click', resetView);

    // Filter controls
    filterPrivateBtn.addEventListener('click', () => {
        showPrivatePoints = !showPrivatePoints;
        filterPrivateBtn.classList.toggle('active', showPrivatePoints);
        renderPoints();
    });

    filterPublicBtn.addEventListener('click', () => {
        showPublicPoints = !showPublicPoints;
        filterPublicBtn.classList.toggle('active', showPublicPoints);
        renderPoints();
    });

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Handle navigation
            switch (view) {
                case 'map':
                    // Already on map view
                    break;
                case 'points':
                    showPointsList('private');
                    break;
                case 'shared':
                    showPointsList('public');
                    break;
                case 'admin':
                    if (isUserAdmin) showAdminPanel();
                    break;
                case 'owner':
                    if (isUserOwner) showOwnerPanel();
                    break;
            }
        });
    });

    function showPointsList(type) {
        const title = type === 'private' ? 'Twoje punkty' : 'Udostępnione punkty';
        const points = allPoints.filter(point => {
            if (type === 'private') return point.ownerSessionCode === sessionCode;
            return point.status === 'public';
        });
        
        document.getElementById('points-list-title').textContent = title;
        const listContainer = document.getElementById('points-list-content');
        
        listContainer.innerHTML = '';
        
        if (points.length === 0) {
            listContainer.innerHTML = '<div class="no-points">Brak punktów do wyświetlenia</div>';
        } else {
            points.forEach(point => {
                const item = document.createElement('div');
                item.className = 'point-item';
                item.innerHTML = `
                    <div class="point-info">
                        <div class="point-name">${point.name}</div>
                        <div class="point-coords">X: ${point.x}, Z: ${point.z}</div>
                    </div>
                    <div class="point-actions">
                        <button class="btn btn-small btn-secondary view-point-btn">Zobacz</button>
                    </div>
                `;
                
                item.querySelector('.view-point-btn').addEventListener('click', () => {
                    hideAllModals();
                    centerMapAt(point.x, point.z);
                });
                
                listContainer.appendChild(item);
            });
        }
        
        showModal(pointsListModal);
    }

    // Add point modal
    addPointBtn.addEventListener('click', () => {
        clearForm();
        showModal(addPointModal);
    });

    // Login modal
    loginBtn.addEventListener('click', () => {
        showModal(loginModal);
    });

    // Resource select change
    resourceSelect.addEventListener('change', () => {
        if (resourceSelect.value === 'custom') {
            customNameGroup.style.display = 'block';
            nameInput.required = true;
        } else {
            customNameGroup.style.display = 'none';
            nameInput.required = false;
        }
    });

    // Form submission
    addPointForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const mode = addPointForm.dataset.mode || 'add';
        const pointId = addPointForm.dataset.pointId;
        
        const pointData = {
            name: resourceSelect.value === 'custom' ? nameInput.value : RESOURCE_TYPES[resourceSelect.value]?.name,
            description: descriptionInput.value,
            x: parseInt(xInput.value),
            z: parseInt(zInput.value),
            resourceType: resourceSelect.value,
            status: 'private'
        };
        
        addOrUpdatePoint(pointData, mode === 'edit', pointId);
    });

    // Modal close handlers
    document.querySelectorAll('.modal-close, #cancel-add, #cancel-login').forEach(btn => {
        btn.addEventListener('click', hideAllModals);
    });

    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideAllModals();
        });
    });

    // Point details actions
    document.getElementById('delete-point').addEventListener('click', () => {
        if (pointDetailsModal.currentPoint) {
            deletePoint(pointDetailsModal.currentPoint._id);
        }
    });

    document.getElementById('edit-point').addEventListener('click', () => {
        if (pointDetailsModal.currentPoint) {
            const point = pointDetailsModal.currentPoint;
            
            // Fill form with point data
            resourceSelect.value = point.resourceType;
            if (point.resourceType === 'custom') {
                customNameGroup.style.display = 'block';
                nameInput.value = point.name;
            }
            descriptionInput.value = point.description || '';
            xInput.value = point.x;
            zInput.value = point.z;
            
            addPointForm.dataset.mode = 'edit';
            addPointForm.dataset.pointId = point._id;
            
            hideAllModals();
            showModal(addPointModal);
        }
    });

    // Login submission
    document.getElementById('submit-login').addEventListener('click', async () => {
        const code = document.getElementById('login-code').value;
        if (!code) return;
        
        try {
            // Try admin login first
            const adminResponse = await fetch('/api/admin/pending', {
                headers: { 'X-Session-Code': code }
            });
            
            if (adminResponse.ok) {
                sessionCode = code;
                localStorage.setItem('sessionCode', sessionCode);
                sessionDisplay.textContent = sessionCode;
                isUserAdmin = true;
                adminNav.style.display = 'block';
                showNotification('Zalogowano jako admin');
                hideAllModals();
                return;
            }
            
            // Check if it's an owner code
            if (OWNER_SESSION_CODES.includes(code)) {
                sessionCode = code;
                localStorage.setItem('sessionCode', sessionCode);
                sessionDisplay.textContent = sessionCode;
                isUserOwner = true;
                ownerNav.style.display = 'block';
                showNotification('Zalogowano jako właściciel');
                hideAllModals();
                return;
            }
            
            showNotification('Nieprawidłowy kod dostępu', 'error');
        } catch (error) {
            showNotification('Błąd przy logowaniu', 'error');
        }
    });

    // Admin and Owner panel functions would go here...
    // (Similar to your original implementation but adapted to new UI)

    // === Initialization ===
function init() {
    // Set session code
    localStorage.setItem('sessionCode', sessionCode);
    sessionDisplay.textContent = sessionCode;
    
    // Create grid
    createGrid();

    
    // Wait for the viewport to be ready, then center on 0,0 with offset
    setTimeout(() => {
        centerMapAt(0, 0); // Teraz będzie dokładnie na środku z 50px offsetem w górę
    }, 100);
    
    // Check user permissions
    checkUserPermissions();
    
    // Fetch initial points
    fetchPoints();
}

    async function showAdminPanel() {
        try {
            const response = await fetch('/api/admin/pending', {
                headers: { 'X-Session-Code': sessionCode }
            });
            
            if (response.ok) {
                const pendingPoints = await response.json();
                const listContainer = document.getElementById('pending-points-list');
                
                listContainer.innerHTML = '';
                
                if (pendingPoints.length === 0) {
                    listContainer.innerHTML = '<div class="no-points">Brak oczekujących punktów</div>';
                } else {
                    pendingPoints.forEach(point => {
                        const item = document.createElement('div');
                        item.className = 'point-item';
                        item.innerHTML = `
                            <div class="point-info">
                                <div class="point-name">${point.name}</div>
                                <div class="point-coords">X: ${point.x}, Z: ${point.z}</div>
                                <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">
                                    ${point.description || 'Brak opisu'}
                                </div>
                            </div>
                            <div class="point-actions">
                                <button class="btn btn-small btn-primary approve-btn" data-id="${point._id}">Zatwierdź</button>
                                <button class="btn btn-small btn-secondary deny-btn" data-id="${point._id}">Odrzuć</button>
                            </div>
                        `;
                        listContainer.appendChild(item);
                    });
                }
                
                showModal(adminPanelModal);
            }
        } catch (error) {
            showNotification('Błąd przy pobieraniu oczekujących punktów', 'error');
        }
    }

    async function showOwnerPanel() {
        try {
            const response = await fetch('/api/owner/sessions', {
                headers: { 'X-Session-Code': sessionCode }
            });
            
            if (response.ok) {
                const sessions = await response.json();
                const listContainer = document.getElementById('allowed-sessions-list');
                
                listContainer.innerHTML = '';
                
                if (sessions.length === 0) {
                    listContainer.innerHTML = '<div class="no-points">Brak dozwolonych sesji</div>';
                } else {
                    sessions.forEach(session => {
                        const item = document.createElement('div');
                        item.className = 'point-item';
                        item.innerHTML = `
                            <div class="point-info">
                                <div class="point-name" style="font-family: monospace;">${session.sessionCode}</div>
                            </div>
                            <div class="point-actions">
                                <button class="btn btn-small btn-secondary delete-session-btn" data-code="${session.sessionCode}">Usuń</button>
                            </div>
                        `;
                        listContainer.appendChild(item);
                    });
                }
                
                showModal(ownerPanelModal);
            }
        } catch (error) {
            showNotification('Błąd przy pobieraniu sesji', 'error');
        }
    }

    // Admin panel event handlers
    document.getElementById('pending-points-list').addEventListener('click', async (e) => {
        if (e.target.classList.contains('approve-btn')) {
            const pointId = e.target.dataset.id;
            try {
                const response = await fetch(`/api/admin/approve/${pointId}`, {
                    method: 'PUT',
                    headers: { 'X-Session-Code': sessionCode }
                });
                
                if (response.ok) {
                    showNotification('Punkt zatwierdzony');
                    showAdminPanel(); // Refresh the list
                    fetchPoints(); // Refresh map points
                } else {
                    showNotification('Błąd przy zatwierdzaniu punktu', 'error');
                }
            } catch (error) {
                showNotification('Błąd połączenia z serwerem', 'error');
            }
        } else if (e.target.classList.contains('deny-btn')) {
            const pointId = e.target.dataset.id;
            if (confirm('Czy na pewno chcesz odrzucić ten punkt?')) {
                try {
                    const response = await fetch(`/api/admin/deny/${pointId}`, {
                        method: 'DELETE',
                        headers: { 'X-Session-Code': sessionCode }
                    });
                    
                    if (response.ok) {
                        showNotification('Punkt odrzucony');
                        showAdminPanel(); // Refresh the list
                    } else {
                        showNotification('Błąd przy odrzucaniu punktu', 'error');
                    }
                } catch (error) {
                    showNotification('Błąd połączenia z serwerem', 'error');
                }
            }
        }
    });

    document.getElementById('refresh-pending').addEventListener('click', showAdminPanel);

    // Owner panel event handlers
    document.getElementById('add-session-btn').addEventListener('click', async () => {
        const sessionCode = document.getElementById('new-session-code').value.trim();
        if (!sessionCode) {
            showNotification('Wprowadź kod sesji', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/owner/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Code': sessionCode
                },
                body: JSON.stringify({ sessionCode })
            });
            
            if (response.ok) {
                showNotification('Sesja dodana');
                document.getElementById('new-session-code').value = '';
                showOwnerPanel(); // Refresh the list
            } else {
                const error = await response.json();
                showNotification(error.message || 'Błąd przy dodawaniu sesji', 'error');
            }
        } catch (error) {
            showNotification('Błąd połączenia z serwerem', 'error');
        }
    });

    document.getElementById('promote-user').addEventListener('click', async () => {
        const sessionCode = document.getElementById('promote-session-code').value.trim();
        if (!sessionCode) {
            showNotification('Wprowadź kod sesji', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/owner/promote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Code': sessionCode
                },
                body: JSON.stringify({ sessionCode })
            });
            
            if (response.ok) {
                showNotification('Użytkownik awansowany na admina');
                document.getElementById('promote-session-code').value = '';
            } else {
                const error = await response.json();
                showNotification(error.message || 'Błąd przy awansowaniu użytkownika', 'error');
            }
        } catch (error) {
            showNotification('Błąd połączenia z serwerem', 'error');
        }
    });

    document.getElementById('allowed-sessions-list').addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-session-btn')) {
            const sessionCode = e.target.dataset.code;
            if (confirm(`Czy na pewno chcesz usunąć sesję "${sessionCode}"?`)) {
                try {
                    const response = await fetch(`/api/owner/sessions/${sessionCode}`, {
                        method: 'DELETE',
                        headers: { 'X-Session-Code': sessionCode }
                    });
                    
                    if (response.ok) {
                        showNotification('Sesja usunięta');
                        showOwnerPanel(); // Refresh the list
                    } else {
                        showNotification('Błąd przy usuwaniu sesji', 'error');
                    }
                } catch (error) {
                    showNotification('Błąd połączenia z serwerem', 'error');
                }
            }
        }
    });

    // Share point functionality
    document.getElementById('share-point').addEventListener('click', async () => {
        if (pointDetailsModal.currentPoint) {
            const point = pointDetailsModal.currentPoint;
            try {
                const response = await fetch(`/api/points/${point._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Session-Code': sessionCode
                    },
                    body: JSON.stringify({ ...point, status: 'public' })
                });
                
                if (response.ok) {
                    showNotification('Punkt udostępniony publicznie');
                    hideAllModals();
                    fetchPoints();
                } else {
                    showNotification('Błąd przy udostępnianiu punktu', 'error');
                }
            } catch (error) {
                showNotification('Błąd połączenia z serwerem', 'error');
            }
        }
    });

    // Initialize the application
    init();
});

