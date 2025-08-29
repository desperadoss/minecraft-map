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
    const ownerLoginBtn = document.getElementById('owner-login-btn');
    const adminLoginInput = document.getElementById('admin-login-input');
    const refreshPendingBtn = document.getElementById('refresh-pending');
    
    // Owner panel elements
    const newOwnerCodeInput = document.getElementById('new-owner-code');
    const addOwnerBtn = document.getElementById('add-owner-btn');
    const promoteUserBtn = document.getElementById('promote-user');
    const promoteSessionCodeInput = document.getElementById('promote-session-code');
    const newSessionCodeInput = document.getElementById('new-session-code');
    const addSessionBtn = document.getElementById('add-session-btn');
    const allowedSessionsList = document.getElementById('allowed-sessions-list');
    const refreshSessionsBtn = document.getElementById('refresh-sessions');
    
    const pendingPointsList = document.getElementById('pending-points-list');
    
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
    
    // Structures
    'village':     { name: 'Village',      color: '#D2691E', category: 'structure' },
    'stronghold':  { name: 'Stronghold',   color: '#A9A9A9', category: 'structure' },
    'nether_fortress': { name: 'Nether Fortress', color: '#B22222', category: 'structure' },
    'end_city':    { name: 'End City',     color: '#4B0082', category: 'structure' },
    'ocean_monument': { name: 'Ocean Monument', color: '#00BFFF', category: 'structure' },
    'woodland_mansion': { name: 'Woodland Mansion', color: '#663300', category: 'structure' },
    'desert_temple': { name: 'Desert Temple', color: '#F4A460', category: 'structure' },
    'jungle_temple': { name: 'Jungle Temple', color: '#228B22', category: 'structure' },
    'igloo':       { name: 'Igloo',        color: '#F5F5F5', category: 'structure' },
    'shipwreck':   { name: 'Shipwreck',    color: '#8B4513', category: 'structure' },
    
    // Biomes
    'mushroom_biome':{ name: 'Mushroom Island', color: '#FF69B4', category: 'biome' },
    'mesa':        { name: 'Badlands',     color: '#CD6600', category: 'biome' },
    'ice_spikes':  { name: 'Ice Spikes',   color: '#ADD8E6', category: 'biome' },
    'flower_forest':{ name: 'Flower Forest', color: '#4CAF50', category: 'biome' },
    
    // Other
    'spawn':   { name: 'Spawn Point', color: '#32CD32', category: 'other' },
    'base':    { name: 'Base',        color: '#4169E1', category: 'other' },
    'farm':    { name: 'Farm',        color: '#9ACD32', category: 'other' },
    'portal':  { name: 'Nether Portal', color: '#8A2BE2', category: 'other' },
    'treasure':{ name: 'Treasure',    color: '#FFD700', category: 'other' }
    };
    
    // === Configuration and global variables ===
    const MAP_WIDTH_PX = 8000;
    const MAP_HEIGHT_PX = 4500;
    const MAP_X_RANGE = 4000;
    const MAP_Z_RANGE = 2250;
    
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
                ownerLoginBtn.style.display = 'block';
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
                    adminLoginBtn.style.display = 'block';
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

        // Calculate max allowed offset to prevent showing empty space
        const maxOffsetX = (scaledWidth > containerRect.width) ? (scaledWidth - containerRect.width) / 2 : 0;
        const maxOffsetY = (scaledHeight > containerRect.height) ? (scaledHeight - containerRect.height) / 2 : 0;

        // Clamp the offsets to prevent panning beyond the map edges
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
            console.error("Error clearing inputs:", err);
        }
    }

    function addPointToMap(point) {
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
        updatePointScaling();
    }

    function displayPointDetails(point) {
        document.getElementById('point-details-title').textContent = point.name;
        document.getElementById('point-coords').textContent = `X: ${point.x}, Z: ${point.z}`;
        document.getElementById('point-description').textContent = point.description || 'N/A';
        document.getElementById('point-type').textContent = MINECRAFT_RESOURCES[point.resourceType]?.name || point.resourceType;
        
        pointDetailsModal.style.display = 'block';

        const isOwnerOfPoint = point.ownerSessionCode === sessionCode;
        sharePointBtn.style.display = (isOwnerOfPoint && point.status === 'private') ? 'block' : 'none';
        editPointBtn.style.display = isOwnerOfPoint ? 'block' : 'none';
        deletePointBtn.style.display = isOwnerOfPoint ? 'block' : 'none';

        sharePointBtn.onclick = () => sharePoint(point._id);
        editPointBtn.onclick = () => editPoint(point);
        deletePointBtn.onclick = () => deletePoint(point._id);
    }
    
    // === API Calls ===
    async function fetchPoints() {
        try {
            const publicPointsRes = await fetch('/api/points');
            const privatePointsRes = await fetch('/api/points/private', {
                headers: { 'X-Session-Code': sessionCode }
            });

            if (!publicPointsRes.ok || !privatePointsRes.ok) {
                throw new Error('Failed to fetch points');
            }

            const publicPoints = await publicPointsRes.json();
            const privatePoints = await privatePointsRes.json();
            
            renderPoints(publicPoints, privatePoints);
            renderPointList('your-points-list', privatePoints, true);
            renderPointList('shared-points-list', publicPoints, false);
            
        } catch (err) {
            console.error('Error fetching points:', err);
            showError('Could not load points from the server.');
        }
    }

    function renderPoints(publicPoints, privatePoints) {
        document.querySelectorAll('.point-wrapper').forEach(p => p.remove());

        if (isShowingPublic) {
            publicPoints.forEach(addPointToMap);
        }
        if (isShowingPrivate) {
            privatePoints.forEach(addPointToMap);
        }
    }
    
    function renderPointList(listId, points, isEditable) {
        const list = document.getElementById(listId);
        list.innerHTML = '';
        if (points.length === 0) {
            list.innerHTML = `<p>${listId === 'your-points-list' ? 'You have no points yet.' : 'No public points available.'}</p>`;
            return;
        }
        points.forEach(point => {
            const li = document.createElement('li');
            li.className = 'point-list-item';
            li.dataset.id = point._id;
            
            const pointInfo = document.createElement('span');
            pointInfo.textContent = `${point.name} (X: ${point.x}, Z: ${point.z})`;

            const actions = document.createElement('div');
            actions.className = 'point-actions';
            
            if (isEditable) {
                const editBtn = document.createElement('button');
                editBtn.className = 'button edit-list-button';
                editBtn.textContent = 'Edit';
                editBtn.addEventListener('click', () => {
                    hideModals();
                    editPoint(point);
                });
                actions.appendChild(editBtn);

                const shareBtn = document.createElement('button');
                shareBtn.className = 'button share-list-button';
                shareBtn.textContent = 'Share';
                shareBtn.addEventListener('click', () => sharePoint(point._id));
                
                if (point.status !== 'private') {
                    shareBtn.disabled = true;
                }
                actions.appendChild(shareBtn);
            }

            const viewBtn = document.createElement('button');
            viewBtn.className = 'button view-list-button';
            viewBtn.textContent = 'View';
            viewBtn.addEventListener('click', () => {
                hideModals();
                displayPointDetails(point);
            });
            actions.appendChild(viewBtn);

            li.appendChild(pointInfo);
            li.appendChild(actions);
            list.appendChild(li);
        });
    }

    async function addOrUpdatePoint(pointData, mode, pointId = null) {
        addPointBtn.disabled = true;
        try {
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
    }
    
    function editPoint(point) {
        hideModals();
        resourceSelect.value = point.resourceType;
        resourceSelect.dispatchEvent(new Event('change'));
        nameInput.value = point.name;
        descriptionInput.value = point.description;
        xInput.value = point.x;
        zInput.value = point.z;

        addPointBtn.textContent = 'Save Changes';
        addPointBtn.dataset.mode = 'edit';
        addPointBtn.dataset.pointId = point._id;

        // Scroll to form and focus name input
        addPointForm.scrollIntoView({ behavior: 'smooth' });
        nameInput.focus();
    }
    
    async function deletePoint(pointId) {
        if (!confirm('Are you sure you want to delete this point?')) {
            return;
        }
        try {
            const response = await fetch(`/api/points/${pointId}`, {
                method: 'DELETE',
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                hideModals();
                fetchPoints();
                showSuccess('Point deleted successfully.');
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Error deleting point.');
            }
        } catch (err) {
            console.error('Error deleting point:', err);
            showError('Server connection error.');
        }
    }
    
    async function sharePoint(pointId) {
        try {
            const response = await fetch(`/api/points/share/${pointId}`, {
                method: 'PUT',
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                hideModals();
                fetchPoints();
                showSuccess('Point submitted for admin approval.');
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Error sharing point.');
            }
        } catch (err) {
            console.error('Error sharing point:', err);
            showError('Server connection error.');
        }
    }

    // === Event Listeners ===
    mapContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - offsetX;
        startY = e.clientY - offsetY;
        mapContainer.style.cursor = 'grabbing';
    });

    mapContainer.addEventListener('mouseleave', () => {
        isDragging = false;
        mapContainer.style.cursor = 'grab';
    });

    mapContainer.addEventListener('mouseup', () => {
        isDragging = false;
        mapContainer.style.cursor = 'grab';
    });

    mapContainer.addEventListener('mousemove', (e) => {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        if (!isDragging) {
            updateCoordinatesFromMouse(e.clientX, e.clientY);
            return;
        }
        offsetX = e.clientX - startX;
        offsetY = e.clientY - startY;
        updateMapPosition();
    });

    mapContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const oldScale = currentScale;
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        currentScale = Math.max(1, Math.min(3, currentScale * scaleFactor));

        if (currentScale !== oldScale) {
            const containerRect = mapContainer.parentElement.getBoundingClientRect();
            const mouseX = e.clientX - containerRect.left;
            const mouseY = e.clientY - containerRect.top;
            
            offsetX = (offsetX * currentScale / oldScale) - (mouseX - (mouseX * currentScale / oldScale));
            offsetY = (offsetY * currentScale / oldScale) - (mouseY - (mouseY * currentScale / oldScale));
            updateMapPosition();
        }
    });

    zoomInBtn.addEventListener('click', () => {
        currentScale = Math.min(3, currentScale * 1.1);
        updateMapPosition();
    });

    zoomOutBtn.addEventListener('click', () => {
        currentScale = Math.max(1, currentScale * 0.9);
        updateMapPosition();
    });

    resetViewBtn.addEventListener('click', () => {
        currentScale = 1;
        offsetX = 0;
        offsetY = 0;
        updateMapPosition();
    });
    
    addPointBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const mode = addPointBtn.dataset.mode;
        const pointId = addPointBtn.dataset.pointId;
        const name = nameInput.value;
        const description = descriptionInput.value;
        const x = xInput.value;
        const z = zInput.value;
        const resourceType = resourceSelect.value;
        
        if (!name || name.trim() === '' || !x || !z) {
            showError('Please fill in all required fields.');
            return;
        }

        const pointData = { name, description, x, z, resourceType };
        await addOrUpdatePoint(pointData, mode, pointId);
    });

    showYourPointsBtn.addEventListener('click', () => {
        isShowingPrivate = !isShowingPrivate;
        showYourPointsBtn.classList.toggle('active', isShowingPrivate);
        document.querySelector('.your-points-section').style.display = isShowingPrivate ? 'block' : 'none';
        fetchPoints(); // Re-render points
    });

    showSharedPointsBtn.addEventListener('click', () => {
        isShowingPublic = !isShowingPublic;
        showSharedPointsBtn.classList.toggle('active', isShowingPublic);
        document.querySelector('.shared-points-section').style.display = isShowingPublic ? 'block' : 'none';
        fetchPoints(); // Re-render points
    });
    
    // Admin Panel Logic
    adminLoginBtn.addEventListener('click', () => {
        hideModals();
        adminLoginModal.style.display = 'block';
    });

    document.getElementById('login-as-admin').addEventListener('click', async () => {
        const code = adminLoginInput.value;
        try {
            const response = await fetch('/api/admin/pending', {
                method: 'GET',
                headers: {
                    'X-Session-Code': code
                }
            });
            if (response.ok) {
                localStorage.setItem('sessionCode', code);
                sessionCode = code;
                isUserAdmin = true;
                hideModals();
                adminPanelModal.style.display = 'block';
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

    refreshPendingBtn.addEventListener('click', fetchPendingPoints);

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
            console.error('Error fetching pending points:', err);
            showError('Server connection error.');
        }
    }

    function renderPendingPoints(points) {
        pendingPointsList.innerHTML = '';
        if (points.length === 0) {
            pendingPointsList.innerHTML = '<li>No pending points.</li>';
            return;
        }
        points.forEach(point => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${point.name} (X: ${point.x}, Z: ${point.z})</span>
                <div class="modal-buttons">
                    <button class="button approve-button" data-id="${point._id}">Approve</button>
                    <button class="button reject-button" data-id="${point._id}">Reject</button>
                </div>
            `;
            li.querySelector('.approve-button').addEventListener('click', () => approvePoint(point._id));
            li.querySelector('.reject-button').addEventListener('click', () => rejectPoint(point._id));
            pendingPointsList.appendChild(li);
        });
    }

    async function approvePoint(pointId) {
        try {
            const response = await fetch(`/api/admin/approve/${pointId}`, {
                method: 'POST',
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                showSuccess('Point approved.');
                fetchPendingPoints();
                fetchPoints();
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Error approving point.');
            }
        } catch (err) {
            showError('Server connection error.');
        }
    }

    async function rejectPoint(pointId) {
        try {
            const response = await fetch(`/api/admin/reject/${pointId}`, {
                method: 'POST',
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                showSuccess('Point rejected and deleted.');
                fetchPendingPoints();
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Error rejecting point.');
            }
        } catch (err) {
            showError('Server connection error.');
        }
    }

    // Owner Panel Logic
    ownerLoginBtn.addEventListener('click', () => {
        hideModals();
        adminLoginModal.style.display = 'block';
    });

    document.getElementById('login-as-admin').addEventListener('click', async () => {
        const code = adminLoginInput.value;
        try {
            const response = await fetch('/api/owner/check', {
                method: 'GET',
                headers: { 'X-Session-Code': code }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.isOwner) {
                    localStorage.setItem('sessionCode', code);
                    sessionCode = code;
                    isUserOwner = true;
                    isUserAdmin = true;
                    hideModals();
                    ownerPanelModal.style.display = 'block';
                    fetchAllowedSessions();
                    showSuccess('Owner login successful!');
                } else {
                    showError('Invalid owner code. Not an owner.');
                }
            } else {
                const data = await response.json();
                showError(data.message || 'Failed to check owner status.');
            }
        } catch (err) {
            showError('Server connection error.');
        }
    });

    if (promoteUserBtn) {
        promoteUserBtn.addEventListener('click', async () => {
            const code = promoteSessionCodeInput.value;
            if (!code) {
                showError('Please enter a session code to promote.');
                return;
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
                    promoteSessionCodeInput.value = '';
                } else {
                    showError(data.message || 'Failed to promote user.');
                }
            } catch (err) {
                showError('Server connection error.');
                console.error('Error promoting user:', err);
            }
        });
    }

    // NEW: Owner Panel Logic - Add New Owner
    if (addOwnerBtn) {
        addOwnerBtn.addEventListener('click', async () => {
            const code = newOwnerCodeInput.value;
            if (!code) {
                showError('Please enter a session code to add as an owner.');
                return;
            }

            try {
                const response = await fetch('/api/owner/owners', {
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
                    newOwnerCodeInput.value = '';
                } else {
                    showError(data.message || 'Failed to add owner.');
                }
            } catch (err) {
                showError('Server connection error.');
                console.error('Error adding owner:', err);
            }
        });
    }

    if (addSessionBtn) {
        addSessionBtn.addEventListener('click', async () => {
            const code = newSessionCodeInput.value;
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
    }

    if (refreshSessionsBtn) {
        refreshSessionsBtn.addEventListener('click', () => {
            fetchAllowedSessions();
        });
    }

    if (allowedSessionsList) {
        allowedSessionsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-session')) {
                const sessionCodeToDelete = e.target.dataset.code;
                if (confirm(`Are you sure you want to remove session ${sessionCodeToDelete}?`)) {
                    deleteAllowedSession(sessionCodeToDelete);
                }
            }
        });
    }

    async function fetchAllowedSessions() {
        try {
            const response = await fetch('/api/owner/sessions', {
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                const sessions = await response.json();
                renderAllowedSessions(sessions);
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Error fetching allowed sessions.');
            }
        } catch (err) {
            console.error('Error fetching sessions:', err);
            showError('Server connection error.');
        }
    }

    function renderAllowedSessions(sessions) {
        allowedSessionsList.innerHTML = '';
        if (sessions.length === 0) {
            allowedSessionsList.innerHTML = '<li>No allowed sessions.</li>';
            return;
        }
        sessions.forEach(s => {
            const li = document.createElement('li');
            li.className = 'session-item';
            const date = new Date(s.createdAt).toLocaleDateString();
            li.innerHTML = `
                <div class="session-info">
                    <span class="session-code">${s.sessionCode}</span>
                    <span class="session-date">(Added on: ${date})</span>
                </div>
                <button class="button delete-session" data-code="${s.sessionCode}">Delete</button>
            `;
            li.querySelector('.delete-session').addEventListener('click', () => {
                deleteAllowedSession(s.sessionCode);
            });
            allowedSessionsList.appendChild(li);
        });
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

    // Modal close buttons
    closeButtons.forEach(button => {
        button.addEventListener('click', hideModals);
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            hideModals();
        }
    });

    // Call checkUserPermissions on load
    checkUserPermissions();

    // Initial setup
    fetchPoints();
    updateMapPosition();
});
