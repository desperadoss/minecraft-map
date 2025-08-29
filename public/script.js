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
    
    // Buttons and fields in modals
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
    const ownerPanelButton = document.getElementById('owner-panel-button');
    const adminPanelButton = document.getElementById('admin-panel-button');
    
    // Owner panel elements
    const newSessionCodeInput = document.getElementById('new-session-code');
    const addSessionBtn = document.getElementById('add-session-btn');
    const allowedSessionsList = document.getElementById('allowed-sessions-list');
    const refreshSessionsBtn = document.getElementById('refresh-sessions');
    
    // NEW: Admin login password input
    const adminPasswordInput = document.getElementById('admin-login-password-input');

    // === MINECRAFT RESOURCE DEFINITIONS ===
    const MINECRAFT_RESOURCES = {
    // Ores
    'diamond_ore': { name: 'Diamond Ore', color: '#5DADE2', category: 'ore' },
    'iron_ore':    { name: 'Iron Ore',    color: '#B7950B', category: 'ore' },
    'gold_ore':    { name: 'Gold Ore',    color: '#F1C40F', category: 'ore' },
    'coal_ore':    { name: 'Coal Ore',    color: '#2C3E50', category: 'ore' },
    'copper_ore':  { name: 'Copper Ore',  color: '#E67E22', category: 'ore' },
    'redstone_ore':{ name: 'Redstone Ore',color: '#E74C3C', category: 'ore' },
    'lapis_ore':   { name: 'Lapis Lazuli Ore', color: '#3498DB', category: 'ore' },
    'emerald_ore': { name: 'Emerald Ore', color: '#2ECC71', category: 'ore' },
    'netherite':   { name: 'Ancient Debris',  color: '#8B4513', category: 'ore' },
    
    // Structures → podmienione na "civilization style"
    'village':     { name: 'Village',      color: '#D2691E', category: 'structure' },
    'city':        { name: 'City',         color: '#2E86C1', category: 'structure' },
    'town':        { name: 'Town',         color: '#5DADE2', category: 'structure' },
    'capital_city':{ name: 'Capital City', color: '#1F618D', category: 'structure' },
    'fortress':    { name: 'Fortress',     color: '#7B241C', category: 'structure' },
    'castle':      { name: 'Castle',       color: '#884EA0', category: 'structure' },
    'harbor':      { name: 'Harbor',       color: '#1ABC9C', category: 'structure' },
    'market':      { name: 'Marketplace',  color: '#F39C12', category: 'structure' },
    'academy':     { name: 'Academy',      color: '#117A65', category: 'structure' },
    'monument':    { name: 'Monument',     color: '#E67E22', category: 'structure' },

    // Biomes (zostawione)
'wastelands':         { name: 'Wastelands',          color: '#A67C52', category: 'biome' },
'sandlands':          { name: 'Sandlands',           color: '#E0B95C', category: 'biome' },
'savannah_plateau':   { name: 'Savannah Plateau',    color: '#D4C45C', category: 'biome' },
'alpine':             { name: 'Alpine',              color: '#A9A9A9', category: 'biome' },
'snowy_forest_tundra':{ name: 'Snowy Forest/Tundra', color: '#DCDCDC', category: 'biome' },
'sea_ice':            { name: 'Sea Ice',             color: '#B0E0E6', category: 'biome' },
'water':              { name: 'Water',               color: '#1F618D', category: 'biome' },
'woodlands_plains':   { name: 'Woodlands/Plains',    color: '#58D68D', category: 'biome' },
'jungle_tropical':    { name: 'Jungle/Tropical',     color: '#229954', category: 'biome' },
'giant_forest':       { name: 'Giant Forest',        color: '#145A32', category: 'biome' },
'taiga_highlands':    { name: 'Taiga Highlands',     color: '#1E8449', category: 'biome' },
'cherry_forest_mtn':  { name: 'Cherry Forest Mountain', color: '#E6B0AA', category: 'biome' },
    
    // Other (zostawione)
    'spawn':   { name: 'Spawn Point', color: '#32CD32', category: 'other' },
    'base':    { name: 'Base',        color: '#4169E1', category: 'other' },
    'farm':    { name: 'Farm',        color: '#9ACD32', category: 'other' },
    'portal':  { name: 'Nether Portal', color: '#8A2BE2', category: 'other' },
    'treasure':{ name: 'Treasure',    color: '#FFD700', category: 'other' }
    };
    
    // === Configuration and global variables ===
    const MAP_WIDTH_PX = 10000;
    const MAP_HEIGHT_PX = 6000;
    const MAP_X_RANGE = 5000;
    const MAP_Z_RANGE = 3250;
    
    let currentScale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let startX, startY;
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    let isShowingPrivate = true;
    let isShowingPublic = true;
    let isThrottling = false;
    let mouseMoveThrottle = null;

    let sessionCode = localStorage.getItem('sessionCode');
    if (!sessionCode) {
        sessionCode = uuid.v4();
        localStorage.setItem('sessionCode', sessionCode);
    }
    sessionCodeDisplay.textContent = `Session Code: ${sessionCode}`;

    let isUserAdmin = false;
    let isUserOwner = false;

    // === NEW: Resource Select Handler ===
    resourceSelect.addEventListener('change', () => {
        if (resourceSelect.value === 'custom') {
            customNameGroup.style.display = 'flex';
            nameInput.required = true;
        } else {
            customNameGroup.style.display = 'none';
            nameInput.required = false;
            nameInput.value = MINECRAFT_RESOURCES[resourceSelect.value].name;
        }
    });

    // Initialize the form
    resourceSelect.dispatchEvent(new Event('change'));

    // === Check if user is owner and admin ===
    async function checkUserPermissions() {
        // Check if owner
        try {
            const ownerRes = await fetch('/api/owner/check', {
                headers: { 'X-Session-Code': sessionCode }
            });
            if (ownerRes.ok) {
                const ownerData = await ownerRes.json();
                if (ownerData.isOwner) {
                    isUserOwner = true;
                    isUserAdmin = true;
                    console.log('User is owner');
                    ownerPanelButton.style.display = 'block';
                    adminPanelButton.style.display = 'block';
                    adminLoginBtn.style.display = 'none';
                    return;
                }
            }
        } catch (err) {
            console.error('Error checking owner permissions:', err);
        }

        // If not owner, check if admin
        try {
            const adminRes = await fetch('/api/admin/pending', {
                headers: { 'X-Session-Code': sessionCode }
            });
            if (adminRes.ok) {
                isUserAdmin = true;
                console.log('User is admin');
                adminPanelButton.style.display = 'block';
                adminLoginBtn.style.display = 'none';
            }
        } catch (err) {
            console.error('Error checking admin permissions:', err);
        }
    }

    // === Notification system ===
    function createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 350px;
        `;
        document.body.appendChild(container);
        return container;
    }

    function showNotification(message, type = 'info') {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = createNotificationContainer();
        }

        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
            color: white;
            padding: 12px 16px;
            margin-bottom: 10px;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-size: 14px;
            line-height: 1.4;
            animation: slideIn 0.3s ease-out;
            cursor: pointer;
            word-wrap: break-word;
        `;

        // Add animation styles if they don't exist yet
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

        notification.textContent = message;
        container.appendChild(notification);

        // Click to close
        notification.addEventListener('click', () => {
            removeNotification(notification);
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                removeNotification(notification);
            }
        }, 5000);
    }

    function removeNotification(notification) {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // === Helper functions ===
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

    // === Function for point scaling ===
    function updatePointScaling() {
        const points = document.querySelectorAll('.point-wrapper');
        const pointScale = 1.0 / currentScale;
        
        points.forEach(point => {
            point.style.transform = `translate3d(-50%, -50%, 0) scale(${pointScale.toFixed(3)})`;
        });
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

        mapContainer.style.transform = `translate3d(-50%, -50%, 0) translate3d(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px, 0) scale(${currentScale.toFixed(3)})`;
        zoomInfo.textContent = `Zoom: ${Math.round((currentScale - 0.18) * 100 / 0.82)}%`;
        
        updatePointScaling();
        updateCoordinatesFromMouse(lastMouseX, lastMouseY);
        
        isThrottling = true;
        requestAnimationFrame(() => {
            isThrottling = false;
        });
    }

    function updateCoordinatesFromMouse(clientX, clientY) {
        const containerRect = mapContainer.parentElement.getBoundingClientRect();
        
        const mouseX = clientX - containerRect.left;
        const mouseY = clientY - containerY.top;
        
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
        document.querySelectorAll('.modal input').forEach(input => {
            if (input.type === 'text' || input.type === 'password') {
                setTimeout(() => {
                    input.value = '';
                    input.blur();
                }, 100);
            }
        });
    }

    function showError(message) {
        console.error(message);
        showNotification(message, 'error');
    }

    function showSuccess(message) {
        console.log(message);
        showNotification(message, 'success');
    }

    function clearInputs() {
        try {
            resourceSelect.value = 'custom';
            resourceSelect.dispatchEvent(new Event('change'));
            nameInput.value = '';
            descriptionInput.value = '';
            xInput.value = '';
            zInput.value = '';
            [nameInput, descriptionInput, xInput, zInput].forEach(input => {
                input.blur();
                input.removeAttribute('readonly');
            });
            addPointBtn.textContent = 'Add Point';
            addPointBtn.dataset.mode = 'add';
            addPointBtn.dataset.pointId = '';
        } catch (err) {
            console.error('Error clearing inputs:', err);
        }
    }

    // === Map and point logic ===
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
            console.error('Error fetching points:', err);
            showError('Error fetching points from server.');
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

            // NEW: Apply resource-specific styling
            if (point.resourceType && point.resourceType !== 'custom') {
                const resource = MINECRAFT_RESOURCES[point.resourceType];
                if (resource) {
                    pointElement.style.setProperty('--resource-color', resource.color);
                    pointElement.classList.add('resource-point');
                    pointElement.classList.add(`resource-${point.resourceType}`);
                }
            } else {
                // Keep original status-based coloring for custom points
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
        updatePointScaling();
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

    // === UI event handling ===
    mapContainer.addEventListener('mousedown', (e) => {
        if (e.target.closest('.point-wrapper')) {
            return;
        }
        isDragging = true;
        mapContainer.style.cursor = 'grabbing';
        startX = e.clientX - offsetX;
        startY = e.clientY - offsetY;
    });

    mapContainer.addEventListener('mouseup', () => {
        isDragging = false;
        mapContainer.style.cursor = 'grab';
    });

    mapContainer.addEventListener('mouseleave', () => {
        isDragging = false;
        mapContainer.style.cursor = 'grab';
    });

    mapContainer.addEventListener('mousemove', (e) => {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        if (isDragging) {
            offsetX = e.clientX - startX;
            offsetY = e.clientY - startY;
            updateMapPosition();
        } else {
            if (!mouseMoveThrottle) {
                mouseMoveThrottle = setTimeout(() => {
                    updateCoordinatesFromMouse(e.clientX, e.clientY);
                    mouseMoveThrottle = null;
                }, 100);
            }
        }
    });

    mapContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScale = Math.min(Math.max(0.1, currentScale + zoomDelta), 5.0);
        
        const rect = mapContainer.parentElement.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const mcX = ((mouseX - (rect.width / 2) - offsetX) / currentScale + MAP_WIDTH_PX / 2);
        const mcY = ((mouseY - (rect.height / 2) - offsetY) / currentScale + MAP_HEIGHT_PX / 2);

        currentScale = newScale;

        const newPxX = (mcX - MAP_WIDTH_PX / 2) * currentScale;
        const newPxY = (mcY - MAP_HEIGHT_PX / 2) * currentScale;

        const newOffsetX = mouseX - rect.width / 2 - newPxX;
        const newOffsetY = mouseY - rect.height / 2 - newPxY;
        
        offsetX = newOffsetX;
        offsetY = newOffsetY;

        updateMapPosition();
    });

    zoomInBtn.addEventListener('click', () => {
        const newScale = Math.min(5.0, currentScale + 0.2);
        const zoomFactor = newScale / currentScale;
        offsetX = offsetX * zoomFactor;
        offsetY = offsetY * zoomFactor;
        currentScale = newScale;
        updateMapPosition();
    });

    zoomOutBtn.addEventListener('click', () => {
        const newScale = Math.max(0.1, currentScale - 0.2);
        const zoomFactor = newScale / currentScale;
        offsetX = offsetX * zoomFactor;
        offsetY = offsetY * zoomFactor;
        currentScale = newScale;
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

    // === Point details modal logic ===
    function displayPointDetails(point) {
        hideModals();
        pointDetailsModal.style.display = 'block';
        document.getElementById('details-name').textContent = point.name;
        document.getElementById('details-coords').textContent = `X: ${point.x}, Z: ${point.z}`;
        document.getElementById('details-desc').textContent = point.description || 'No description.';
        
        sharePointBtn.style.display = 'block';
        if (point.ownerSessionCode !== sessionCode) {
            editPointBtn.style.display = 'none';
            deletePointBtn.style.display = 'none';
        } else {
            editPointBtn.style.display = 'block';
            deletePointBtn.style.display = 'block';
        }

        editPointBtn.onclick = () => {
            editPoint(point);
            hideModals();
        };

        deletePointBtn.onclick = () => {
            if (confirm('Are you sure you want to delete this point?')) {
                deletePoint(point._id);
                hideModals();
            }
        };

        sharePointBtn.onclick = () => {
            sharePoint(point);
        };

        // NEW: Share button logic
        if (point.status === 'public') {
            sharePointBtn.textContent = 'Unshare Point';
            sharePointBtn.dataset.action = 'unshare';
        } else {
            sharePointBtn.textContent = 'Share Point';
            sharePointBtn.dataset.action = 'share';
        }

        sharePointBtn.onclick = () => {
            if (sharePointBtn.dataset.action === 'share') {
                sharePoint(point._id);
            } else {
                unsharePoint(point._id);
            }
        };
    }

    async function sharePoint(pointId) {
        try {
            const response = await fetch(`/api/points/share/${pointId}`, {
                method: 'PATCH',
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                showSuccess('Point shared successfully!');
                fetchPoints();
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Failed to share point.');
            }
        } catch (err) {
            showError('Server connection error.');
        } finally {
            hideModals();
        }
    }

    async function unsharePoint(pointId) {
        try {
            const response = await fetch(`/api/points/unshare/${pointId}`, {
                method: 'PATCH',
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                showSuccess('Point unshared successfully!');
                fetchPoints();
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Failed to unshare point.');
            }
        } catch (err) {
            showError('Server connection error.');
        } finally {
            hideModals();
        }
    }

    function editPoint(point) {
        addPointForm.style.display = 'block';
        hideModals();
        
        resourceSelect.value = point.resourceType || 'custom';
        resourceSelect.dispatchEvent(new Event('change'));

        nameInput.value = point.name;
        descriptionInput.value = point.description || '';
        xInput.value = point.x;
        zInput.value = point.z;

        addPointBtn.textContent = 'Save Changes';
        addPointBtn.dataset.mode = 'edit';
        addPointBtn.dataset.pointId = point._id;

        // NEW: make coord inputs read-only during edit
        xInput.readOnly = true;
        zInput.readOnly = true;
    }

    async function deletePoint(pointId) {
        try {
            const response = await fetch(`/api/points/${pointId}`, {
                method: 'DELETE',
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                showSuccess('Point deleted!');
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

    // === Form submission logic ===
    addPointForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const mode = addPointBtn.dataset.mode || 'add';
        const pointId = addPointBtn.dataset.pointId;

        const pointData = {
            name: nameInput.value,
            description: descriptionInput.value,
            x: parseFloat(xInput.value),
            z: parseFloat(zInput.value),
            resourceType: resourceSelect.value !== 'custom' ? resourceSelect.value : null
        };
        
        addPointBtn.disabled = true;

        try {
            let response;
            if (mode === 'edit' && pointId) {
                response = await fetch(`/api/points/${pointId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Session-Code': sessionCode
                    },
                    body: JSON.stringify(pointData)
                });

                addPointBtn.textContent = 'Add Point';
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
            if (mode === 'edit') {
                addPointBtn.textContent = 'Save Changes';
            } else {
                addPointBtn.textContent = 'Add Point';
            }
        }
    });

    // === Modal handling ===
    document.getElementById('admin-login-btn').addEventListener('click', () => {
        hideModals();
        adminLoginModal.style.display = 'block';
    });

    document.getElementById('admin-panel-button').addEventListener('click', () => {
        hideModals();
        adminPanelModal.style.display = 'block';
        fetchPendingPoints();
    });

    document.getElementById('owner-panel-button').addEventListener('click', () => {
        hideModals();
        ownerPanelModal.style.display = 'block';
        fetchAllowedSessions();
    });

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            hideModals();
        });
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModals();
        }
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideModals();
        }
    });

    // Admin login logic - MODIFIED to use a password
    document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const enteredPassword = adminLoginInput.value;
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: enteredPassword, sessionCode: sessionCode })
            });

            const data = await response.json();
            if (response.ok) {
                checkUserPermissions();
                showSuccess(data.message);
                hideModals();
            } else {
                showError(data.message || 'Login failed.');
            }
        } catch (err) {
            showError('Server connection error.');
        }
    });

    // === Admin Panel Logic ===
    async function fetchPendingPoints() {
        try {
            const response = await fetch('/api/admin/pending', {
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                const pendingPoints = await response.json();
                renderPendingPoints(pendingPoints);
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Error fetching pending points.');
            }
        } catch (err) {
            showError('Server connection error.');
            console.error('Error fetching pending points:', err);
        }
    }
    
    function renderPendingPoints(points) {
        pendingPointsList.innerHTML = '';
        if (points.length === 0) {
            pendingPointsList.innerHTML = '<p>No pending points.</p>';
            return;
        }

        points.forEach(point => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span><strong>${point.name}</strong> (${point.x}, ${point.z})</span>
                <div class="pending-actions">
                    <button class="approve-point button" data-id="${point._id}">Approve</button>
                    <button class="reject-point button" data-id="${point._id}">Reject</button>
                </div>
            `;
            pendingPointsList.appendChild(li);
        });
    }

    pendingPointsList.addEventListener('click', async (e) => {
        const pointId = e.target.dataset.id;
        if (!pointId) return;

        if (e.target.classList.contains('approve-point')) {
            await updatePointStatus(pointId, 'public');
        } else if (e.target.classList.contains('reject-point')) {
            if (confirm('Are you sure you want to reject and delete this point?')) {
                await updatePointStatus(pointId, 'rejected');
            }
        }
    });

    async function updatePointStatus(pointId, status) {
        try {
            const response = await fetch(`/api/admin/points/${pointId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Code': sessionCode
                },
                body: JSON.stringify({ status: status })
            });

            const data = await response.json();
            if (response.ok) {
                showSuccess(data.message);
                fetchPendingPoints();
            } else {
                showError(data.message || `Failed to update point status to ${status}.`);
            }
        } catch (err) {
            showError('Server connection error.');
            console.error('Error updating point status:', err);
        }
    }
    
    // Promote User Logic
    promoteUserBtn.addEventListener('click', async () => {
        const code = promoteSessionCodeInput.value;
        if (!code) {
            showError('Please enter a session code to promote.');
            return;
        }

        try {
            const response = await fetch('/api/admin/promote', {
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
                promoteSessionCodeInput.value = '';
            } else {
                showError(data.message || 'Failed to promote user.');
            }
        } catch (err) {
            showError('Server connection error.');
            console.error('Error promoting user:', err);
        }
    });

    refreshPendingBtn.addEventListener('click', fetchPendingPoints);

    // === Owner Panel Logic ===
    addSessionBtn.addEventListener('click', async () => {
        const code = newSessionCodeInput.value;
        if (!code) {
            showError('Please enter a session code to add.');
            return;
        }

        try {
            const response = await fetch('/api/owner/sessions', {
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
                newSessionCodeInput.value = '';
                fetchAllowedSessions(); // Refresh the list after adding a session
            } else {
                showError(data.message || 'Failed to add session.');
            }
        } catch (err) {
            showError('Server connection error.');
            console.error('Error adding session:', err);
        }
    });

    async function fetchAllowedSessions() {
        try {
            const list = allowedSessionsList;
            list.innerHTML = '<li>Loading...</li>';
            const response = await fetch('/api/owner/sessions', {
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                const sessions = await response.json();
                list.innerHTML = '';
                if (sessions.length === 0) {
                    list.innerHTML = '<li>No allowed sessions found.</li>';
                    return;
                }
                sessions.forEach(s => {
                    const li = document.createElement('li');
                    li.classList.add('session-item');
                    li.innerHTML = `
                        <span class="session-code">${s.sessionCode}</span>
                        <span class="session-date">${new Date(s.createdAt).toLocaleString()}</span>
                        <button class="delete-session button" data-code="${s.sessionCode}">Delete</button>
                    `;
                    li.querySelector('.delete-session').addEventListener('click', () => {
                        deleteAllowedSession(s.sessionCode);
                    });
                    list.appendChild(li);
                });
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Error fetching allowed sessions.');
            }
        } catch (err) {
            console.error('Error fetching sessions:', err);
            showError('Server connection error.');
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
                showError(errorData.message || 'Error deleting session.');
            }
        } catch (err) {
            console.error('Error deleting session:', err);
            showError('Server connection error.');
        }
    }

    // Dodanie logiki dla przycisku "Refresh List"
    refreshSessionsBtn.addEventListener('click', () => {
        fetchAllowedSessions();
    });

    // Dodanie nasłuchiwania dla dynamicznych przycisków "Delete"
    allowedSessionsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-session')) {
            const sessionCodeToDelete = e.target.dataset.code;
            if (confirm(`Are you sure you want to remove session ${sessionCodeToDelete}?`)) {
                deleteAllowedSession(sessionCodeToDelete);
            }
        }
    });

    // Uruchomienie początkowego pobierania listy sesji
    fetchAllowedSessions();

    // Call checkUserPermissions on load
    checkUserPermissions();

    // Initial setup
    fetchPoints();
    updateMapPosition();
});
