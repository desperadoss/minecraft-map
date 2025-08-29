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
    
    // Owner panel elements
    const newSessionCodeInput = document.getElementById('new-session-code');
    const addSessionBtn = document.getElementById('add-session-btn');
    const allowedSessionsList = document.getElementById('allowed-sessions-list');
    const refreshSessionsBtn = document.getElementById('refresh-sessions');

    // === Buttons in header ===
    const adminLoginButton = document.getElementById('admin-login-button');
    const ownerPanelButton = document.getElementById('owner-panel-button');

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
            if (MINECRAFT_RESOURCES[resourceSelect.value]) {
                nameInput.value = MINECRAFT_RESOURCES[resourceSelect.value].name;
            }
        }
    });

    // Initialize the form
    resourceSelect.dispatchEvent(new Event('change'));

    // === Check if user is owner and admin ===
    async function checkUserPermissions() {
        try {
            // Check if owner
            const ownerRes = await fetch('/api/owner/check', {
                headers: { 'X-Session-Code': sessionCode }
            });
            const ownerData = await ownerRes.json();
            if (ownerData.isOwner) {
                isUserOwner = true;
                isUserAdmin = true; // Owner always has admin permissions
                console.log('User is owner');
                ownerPanelButton.style.display = 'block';
                return;
            }

            // If not owner, check if admin
            try {
                const adminRes = await fetch('/api/admin/pending', {
                    headers: { 'X-Session-Code': sessionCode }
                });
                if (adminRes.status === 200) {
                    isUserAdmin = true;
                    console.log('User is admin');
                    adminLoginButton.style.display = 'none';
                }
            } catch (err) {
                // Not an admin
                console.log('User has no admin permissions');
            }
        } catch (err) {
            console.error('Error checking permissions:', err);
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
            
            point.style.display = isVisible ? 'block' : 'none';
        });
    }

    function displayPointDetails(point) {
        hideModals();
        pointDetailsModal.style.display = 'block';
        document.getElementById('details-name').textContent = point.name;
        document.getElementById('details-coords').textContent = `X: ${point.x}, Z: ${point.z}`;
        document.getElementById('details-desc').textContent = point.description || 'No description provided.';
        document.getElementById('details-type').textContent = MINECRAFT_RESOURCES[point.resourceType]?.name || 'Custom';
        
        // Check if current user is owner of the point
        const isOwner = point.ownerSessionCode === sessionCode;
        editPointBtn.style.display = isOwner ? 'block' : 'none';
        deletePointBtn.style.display = isOwner ? 'block' : 'none';
        sharePointBtn.style.display = isOwner ? 'block' : 'none';
        
        // Hide share button if point is already public or pending
        if (point.status === 'public' || point.status === 'pending') {
            sharePointBtn.style.display = 'none';
        }

        // Store point ID for edit/delete actions
        editPointBtn.dataset.pointId = point._id;
        deletePointBtn.dataset.pointId = point._id;
        sharePointBtn.dataset.pointId = point._id;
    }

    // === Event Listeners ===
    zoomInBtn.addEventListener('click', () => {
        currentScale = Math.min(2.5, currentScale + 0.2);
        updateMapPosition();
    });

    zoomOutBtn.addEventListener('click', () => {
        currentScale = Math.max(0.1, currentScale - 0.2);
        updateMapPosition();
    });

    resetViewBtn.addEventListener('click', () => {
        currentScale = 1;
        offsetX = 0;
        offsetY = 0;
        updateMapPosition();
    });

    mapImage.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - offsetX;
        startY = e.clientY - offsetY;
        mapContainer.style.cursor = 'grabbing';
    });

    mapImage.addEventListener('mouseup', () => {
        isDragging = false;
        mapContainer.style.cursor = 'grab';
    });
    
    mapImage.addEventListener('mouseleave', () => {
        isDragging = false;
        mapContainer.style.cursor = 'grab';
    });

    mapImage.addEventListener('mousemove', (e) => {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        if (isDragging) {
            offsetX = e.clientX - startX;
            offsetY = e.clientY - startY;
            updateMapPosition();
        } else {
            updateCoordinatesFromMouse(e.clientX, e.clientY);
        }
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

    closeButtons.forEach(btn => {
        btn.addEventListener('click', hideModals);
    });

    // Add Point Form Logic
    addPointForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const mode = addPointBtn.dataset.mode;
        const pointId = addPointBtn.dataset.pointId;
        
        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();
        const x = xInput.value.trim();
        const z = zInput.value.trim();
        const resourceType = resourceSelect.value;
        
        const pointData = { name, description, x, z, resourceType };
        
        let response;
        addPointBtn.disabled = true;

        try {
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
            if (mode === 'edit') {
                addPointBtn.textContent = 'Save Changes';
            } else {
                addPointBtn.textContent = 'Add Point';
            }
        }
    });

    editPointBtn.addEventListener('click', () => {
        const pointId = editPointBtn.dataset.pointId;
        const point = document.querySelector(`.point-wrapper[data-point-id="${pointId}"]`);
        
        hideModals();
        
        // Populate form for editing
        const name = point.dataset.pointName;
        const x = point.dataset.pointX;
        const z = point.dataset.pointZ;
        const resourceType = point.dataset.resourceType;
        
        // Description is not in dataset, so we can't pre-populate it from here.
        // It would require fetching the point details from the server.
        // For now, we'll leave it blank, but a proper implementation would fetch it.
        
        nameInput.value = name;
        xInput.value = x;
        zInput.value = z;
        
        resourceSelect.value = resourceType;
        resourceSelect.dispatchEvent(new Event('change'));

        // Switch button to 'edit' mode
        addPointBtn.textContent = 'Save Changes';
        addPointBtn.dataset.mode = 'edit';
        addPointBtn.dataset.pointId = pointId;

        // Scroll to form
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    deletePointBtn.addEventListener('click', async () => {
        const pointId = deletePointBtn.dataset.pointId;
        if (confirm('Are you sure you want to delete this point?')) {
            try {
                const response = await fetch(`/api/points/${pointId}`, {
                    method: 'DELETE',
                    headers: { 'X-Session-Code': sessionCode }
                });

                if (response.ok) {
                    showSuccess('Point deleted successfully.');
                    hideModals();
                    fetchPoints();
                } else {
                    const errorData = await response.json();
                    showError(errorData.message || 'Error deleting point.');
                }
            } catch (err) {
                console.error('Error deleting point:', err);
                showError('Server connection error.');
            }
        }
    });

    sharePointBtn.addEventListener('click', async () => {
        const pointId = sharePointBtn.dataset.pointId;
        if (confirm('Are you sure you want to share this point for admin approval?')) {
            try {
                const response = await fetch(`/api/points/share/${pointId}`, {
                    method: 'PUT',
                    headers: { 'X-Session-Code': sessionCode }
                });
                if (response.ok) {
                    showSuccess('Point submitted for admin approval!');
                    hideModals();
                    fetchPoints();
                } else {
                    const errorData = await response.json();
                    showError(errorData.message || 'Failed to submit point for approval.');
                }
            } catch (err) {
                console.error('Error sharing point:', err);
                showError('Server connection error.');
            }
        }
    });
    
    // === Owner Panel Logic ===
    async function fetchAllowedSessions() {
        const list = document.getElementById('allowed-sessions-list');
        list.innerHTML = '';
        try {
            const response = await fetch('/api/owner/sessions', {
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                const sessions = await response.json();
                sessions.forEach(s => {
                    const li = document.createElement('li');
                    li.classList.add('session-item');
                    li.innerHTML = `
                        <span class="session-code">${s.sessionCode}</span>
                        <button class="button delete-session-btn" data-code="${s.sessionCode}">Remove</button>
                    `;
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

    // Event listeners for owner panel
    addSessionBtn.addEventListener('click', async () => {
        const code = newSessionCodeInput.value.trim();
        if (!code) {
            showError('Please enter a session code.');
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
                fetchAllowedSessions();
            } else {
                showError(data.message || 'Failed to add session.');
            }
        } catch (err) {
            showError('Server connection error.');
            console.error('Error adding session:', err);
        }
    });
    
    refreshSessionsBtn.addEventListener('click', fetchAllowedSessions);
    
    allowedSessionsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-session-btn')) {
            const sessionCodeToDelete = e.target.dataset.code;
            if (confirm(`Are you sure you want to remove session ${sessionCodeToDelete}?`)) {
                deleteAllowedSession(sessionCodeToDelete);
            }
        }
    });

    // === Admin Panel Logic ===
    async function fetchPendingPoints() {
        const list = document.getElementById('pending-points-list');
        list.innerHTML = '';
        try {
            const response = await fetch('/api/admin/pending', {
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                const points = await response.json();
                points.forEach(point => {
                    const li = document.createElement('li');
                    li.classList.add('pending-point-item');
                    li.innerHTML = `
                        <div class="point-info">
                            <strong>${point.name}</strong>
                            <p>by ${point.ownerSessionCode.substring(0, 8)}... - Coords: X:${point.x}, Z:${point.z}</p>
                            <p class="description-small">${point.description || 'No description'}</p>
                        </div>
                        <div class="pending-point-actions">
                            <button class="button approve-btn" data-point-id="${point._id}">Approve</button>
                            <button class="button decline-btn" data-point-id="${point._id}">Decline</button>
                        </div>
                    `;
                    list.appendChild(li);
                });
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Error fetching pending points.');
                if (response.status === 403) { // No permissions, close modal
                    hideModals();
                }
            }
        } catch (err) {
            console.error('Error fetching pending points:', err);
            showError('Server connection error.');
        }
    }

    async function approvePoint(pointId) {
        try {
            const response = await fetch(`/api/admin/approve/${pointId}`, {
                method: 'PUT',
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                showSuccess('Point approved!');
                fetchPendingPoints();
                fetchPoints(); // Refresh main map
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Failed to approve point.');
            }
        } catch (err) {
            console.error('Error approving point:', err);
            showError('Server connection error.');
        }
    }

    async function declinePoint(pointId) {
        try {
            const response = await fetch(`/api/admin/decline/${pointId}`, {
                method: 'PUT',
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                showSuccess('Point declined.');
                fetchPendingPoints();
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Failed to decline point.');
            }
        } catch (err) {
            console.error('Error declining point:', err);
            showError('Server connection error.');
        }
    }
    
    // Event listeners for admin panel
    refreshPendingBtn.addEventListener('click', fetchPendingPoints);
    
    pendingPointsList.addEventListener('click', (e) => {
        const pointId = e.target.dataset.pointId;
        if (e.target.classList.contains('approve-btn')) {
            approvePoint(pointId);
        } else if (e.target.classList.contains('decline-btn')) {
            declinePoint(pointId);
        }
    });

    // === Main application entry point ===
    checkUserPermissions();
    fetchPoints();
    updateMapPosition();
});
