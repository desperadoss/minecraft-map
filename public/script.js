// Minecraft resources configuration
const MINECRAFT_RESOURCES = {
    // Ores and Minerals
    'diamond': { name: 'Diamond', color: '#5DADE2', category: 'ore' },
    'emerald': { name: 'Emerald', color: '#58D68D', category: 'ore' },
    'gold': { name: 'Gold', color: '#F1C40F', category: 'ore' },
    'iron': { name: 'Iron', color: '#BDC3C7', category: 'ore' },
    'coal': { name: 'Coal', color: '#2C3E50', category: 'ore' },
    'copper': { name: 'Copper', color: '#D68910', category: 'ore' },
    'redstone': { name: 'Redstone', color: '#E74C3C', category: 'ore' },
    'lapis': { name: 'Lapis Lazuli', color: '#3498DB', category: 'ore' },
    
    // Structures
    'stronghold': { name: 'Stronghold', color: '#8E44AD', category: 'structure' },
    'village': { name: 'Village', color: '#A0522D', category: 'structure' },
    'temple': { name: 'Desert Temple', color: '#F39C12', category: 'structure' },
    'mineshaft': { name: 'Abandoned Mineshaft', color: '#85929E', category: 'structure' },
    'fortress': { name: 'Nether Fortress', color: '#C0392B', category: 'structure' },
    'bastion': { name: 'Bastion Remnant', color: '#884EA0', category: 'structure' },
    'end_city': { name: 'End City', color: '#D2B4DE', category: 'structure' },
    
    // Biomes
    'mushroom': { name: 'Mushroom Island', color: '#C39BD3', category: 'biome' },
    'mesa': { name: 'Badlands', color: '#E67E22', category: 'biome' },
    'ice_spikes': { name: 'Ice Spikes', color: '#AED6F1', category: 'biome' },
    'jungle': { name: 'Jungle', color: '#27AE60', category: 'biome' },
    'flower_forest': { name: 'Flower Forest', color: '#F8C471', category: 'biome' },
    
    // Resources
    'slime': { name: 'Slime Chunk', color: '#58D68D', category: 'resource' },
    'spawner': { name: 'Mob Spawner', color: '#34495E', category: 'resource' },
    'portal': { name: 'Nether Portal', color: '#9B59B6', category: 'resource' },
    'farm': { name: 'Farm', color: '#82E0AA', category: 'resource' },
    
    // Personal
    'base': { name: 'Base', color: '#1ABC9C', category: 'personal' },
    'home': { name: 'Home', color: '#E8DAEF', category: 'personal' },
    'waypoint': { name: 'Waypoint', color: '#F7DC6F', category: 'personal' },
    'custom': { name: 'Custom', color: '#95A5A6', category: 'personal' }
};

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
    
    // Add point form - UPDATED
    const resourceSelect = document.getElementById('resource-select');
    const nameInput = document.getElementById('name-input');
    const xInput = document.getElementById('x-input');
    const zInput = document.getElementById('z-input');
    const addPointBtn = document.getElementById('add-point-button');
    const customNameGroup = document.querySelector('.custom-name-group');
    
    // Resource filter
    const resourceFilter = document.getElementById('resource-filter');

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
    
    // === Configuration and global variables ===
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
    let currentResourceFilter = '';
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

    // === Initialize resource dropdowns ===
    function initializeResourceDropdowns() {
        // Clear existing options (except first one)
        resourceSelect.innerHTML = '<option value="">Select Resource</option>';
        resourceFilter.innerHTML = '<option value="">All Resources</option>';
        
        // Group resources by category
        const categories = {};
        Object.entries(MINECRAFT_RESOURCES).forEach(([key, resource]) => {
            if (!categories[resource.category]) {
                categories[resource.category] = [];
            }
            categories[resource.category].push({ key, ...resource });
        });

        // Add options grouped by category
        Object.entries(categories).forEach(([categoryName, resources]) => {
            // Create optgroup for resource select
            const optgroup1 = document.createElement('optgroup');
            optgroup1.label = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
            
            const optgroup2 = document.createElement('optgroup');
            optgroup2.label = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);

            resources.forEach(resource => {
                const option1 = document.createElement('option');
                option1.value = resource.key;
                option1.textContent = resource.name;
                optgroup1.appendChild(option1);

                const option2 = document.createElement('option');
                option2.value = resource.key;
                option2.textContent = resource.name;
                optgroup2.appendChild(option2);
            });

            resourceSelect.appendChild(optgroup1);
            resourceFilter.appendChild(optgroup2);
        });
    }

    // === Resource select handler ===
    resourceSelect.addEventListener('change', () => {
        const selectedResource = resourceSelect.value;
        if (selectedResource === 'custom' || selectedResource === '') {
            customNameGroup.style.display = 'block';
            nameInput.required = true;
        } else {
            customNameGroup.style.display = 'none';
            nameInput.required = false;
            nameInput.value = MINECRAFT_RESOURCES[selectedResource]?.name || '';
        }
    });

    // === Resource filter handler ===
    resourceFilter.addEventListener('change', () => {
        currentResourceFilter = resourceFilter.value;
        filterPoints();
    });

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
                isUserAdmin = true;
                console.log('User is owner');
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
                }
            } catch (err) {
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

        notification.addEventListener('click', () => {
            removeNotification(notification);
        });

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

    function getResourceColor(resourceType) {
        return MINECRAFT_RESOURCES[resourceType]?.color || '#95A5A6';
    }

    function getResourceName(resourceType) {
        return MINECRAFT_RESOURCES[resourceType]?.name || 'Custom';
    }

    function getStatusLabel(status) {
        switch(status) {
            case 'private': return 'Private';
            case 'pending': return 'Pending Approval';
            case 'public': return 'Public (Shared)';
            default: return 'Unknown';
        }
    }

    // === Function for point scaling ===
    function updatePointScaling() {
        const points = document.querySelectorAll('.point-wrapper');
        const pointScale = Math.max(0.5, 1.0 / currentScale);
        
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
            resourceSelect.value = '';
            nameInput.value = '';
            xInput.value = '';
            zInput.value = '';
            customNameGroup.style.display = 'none';
            
            [resourceSelect, nameInput, xInput, zInput].forEach(input => {
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
            pointElement.classList.add('modern-marker');
            
            // Set color based on resource type
            const resourceColor = getResourceColor(point.resourceType);
            pointElement.style.setProperty('--marker-color', resourceColor);
            
            const pointNameElement = document.createElement('div');
            pointNameElement.classList.add('point-name');
            pointNameElement.innerHTML = `
                <span class="point-title">${point.name}</span>
                <span class="point-status">${getStatusLabel(point.status)}</span>
                <span class="point-resource">${getResourceName(point.resourceType)}</span>
            `;

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
            const resourceType = point.dataset.resourceType;
            let isVisible = false;

            // Check status filter
            if (status === 'public' && isShowingPublic) {
                isVisible = true;
            } else if ((status === 'private' || status === 'pending') && isShowingPrivate) {
                isVisible = true;
            }
            
            // Check resource filter
            if (isVisible && currentResourceFilter && resourceType !== currentResourceFilter) {
                isVisible = false;
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
            if (!mouseMoveThrottle) {
                mouseMoveThrottle = setTimeout(() => {
                    updateCoordinatesFromMouse(e.clientX, e.clientY);
                    mouseMoveThrottle = null;
                }, 16);
            }
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

    // === Form and modal logic ===
    addPointBtn.addEventListener('click', async () => {
        const resourceType = resourceSelect.value;
        const name = nameInput.value.trim() || (resourceType ? getResourceName(resourceType) : '');
        const x = parseInt(xInput.value);
        const z = parseInt(zInput.value);
        const mode = addPointBtn.dataset.mode;
        const pointId = addPointBtn.dataset.pointId;

        if (!resourceType) {
            showError('Please select a resource type!');
            return;
        }

        if (!name) {
            showError('Please provide a name for the point!');
            return;
        }

        if (isNaN(x) || isNaN(z)) {
            showError('Please fill all coordinate fields correctly!');
            return;
        }

        addPointBtn.disabled = true;
        addPointBtn.textContent = 'Saving...';

        try {
            let response;
            const pointData = { name, x, z, resourceType };

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

    closeButtons.forEach(btn => {
        btn.addEventListener('click', hideModals);
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModals();
        }
    });

    function displayPointDetails(point) {
        document.getElementById('point-name').textContent = point.name;
        document.getElementById('point-resource').textContent = getResourceName(point.resourceType);
        document.getElementById('point-x').textContent = point.x;
        document.getElementById('point-z').textContent = point.z;
        document.getElementById('point-status').textContent = getStatusLabel(point.status);

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
                showSuccess('Point sent for admin approval.');
                fetchPoints();
                hideModals();
            } else {
                const errorData = await res.json();
                showError(errorData.message || 'Error sharing point.');
            }
        } catch (err) {
            console.error('Error sharing:', err);
            showError('Server connection error.');
        }
    });

    editPointBtn.addEventListener('click', () => {
        const pointId = pointDetailsModal.dataset.pointId;
        const pointWrapper = document.querySelector('.point-wrapper[data-point-id="' + pointId + '"]');
        const pointName = document.getElementById('point-name').textContent;
        const pointX = document.getElementById('point-x').textContent;
        const pointZ = document.getElementById('point-z').textContent;
        const resourceType = pointWrapper.dataset.resourceType;

        resourceSelect.value = resourceType;
        if (resourceType === 'custom' || !resourceType) {
            customNameGroup.style.display = 'block';
            nameInput.value = pointName;
        } else {
            customNameGroup.style.display = 'none';
            nameInput.value = getResourceName(resourceType);
        }
        xInput.value = pointX;
        zInput.value = pointZ;
        
        addPointBtn.textContent = 'Save Changes';
        addPointBtn.dataset.mode = 'edit';
        addPointBtn.dataset.pointId = pointId;
        hideModals();
    });
    
    deletePointBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this point?')) {
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
                showSuccess('Point deleted.');
                fetchPoints();
                hideModals();
            } else {
                const errorData = await res.json();
                showError(errorData.message || 'Error deleting point.');
            }
        } catch (err) {
            console.error('Error deleting:', err);
            showError('Server connection error.');
        }
    });

    // === Owner menu ===
    function showOwnerMenu() {
        hideModals();
        
        const menuModal = document.createElement('div');
        menuModal.className = 'modal';
        menuModal.style.display = 'block';
        menuModal.innerHTML = `
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h2 class="modal-title">Management Panel</h2>
                <p>Choose what you want to do:</p>
                <div class="modal-buttons">
                    <button class="button" id="open-admin-panel">Admin Panel</button>
                    <button class="button" id="open-owner-panel">Owner Panel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(menuModal);
        
        menuModal.querySelector('.close-button').addEventListener('click', () => {
            document.body.removeChild(menuModal);
        });
        
        menuModal.querySelector('#open-admin-panel').addEventListener('click', () => {
            document.body.removeChild(menuModal);
            adminPanelModal.style.display = 'block';
            fetchPendingPoints();
        });
        
        menuModal.querySelector('#open-owner-panel').addEventListener('click', () => {
            document.body.removeChild(menuModal);
            ownerPanelModal.style.display = 'block';
            fetchAllowedSessions();
        });
        
        menuModal.addEventListener('click', (e) => {
            if (e.target === menuModal) {
                document.body.removeChild(menuModal);
            }
        });
    }

    // === Admin and owner panels ===
    sessionCodeDisplay.addEventListener('click', () => {
        if (isUserOwner) {
            showOwnerMenu();
        } else if (isUserAdmin) {
            hideModals();
            adminPanelModal.style.display = 'block';
            fetchPendingPoints();
        } else {
            hideModals();
            adminLoginModal.style.display = 'block';
        }
    });

    adminLoginBtn.addEventListener('click', async () => {
        const code = adminLoginInput.value.trim();
        if (!code) {
            showError('Enter admin code.');
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
                showSuccess('Successfully logged in as admin.');
            } else {
                showError(data.message || 'Invalid admin code.');
            }
        } catch (err) {
            console.error('Admin login error:', err);
            showError('Server connection error.');
        }
    });

    refreshPendingBtn.addEventListener('click', fetchPendingPoints);

    async function fetchPendingPoints() {
        try {
            const res = await fetch('/api/admin/pending', {
                headers: { 'X-Session-Code': sessionCode }
            });
            
            if (res.status === 403) {
                showError('Admin permissions required.');
                return;
            }
            
            if (!res.ok) {
                throw new Error(`HTTP Error: ${res.status}`);
            }
            
            const pendingPoints = await res.json();
            renderPendingPoints(pendingPoints);
        } catch (err) {
            console.error('Error fetching pending points:', err);
            pendingPointsList.innerHTML = '<li>Server connection error</li>';
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
                <span>${point.name} (${getResourceName(point.resourceType)}) - X: ${point.x}, Z: ${point.z}</span>
                <div>
                    <button class="button accept-btn" data-id="${point._id}">Accept</button>
                    <button class="button reject-btn" data-id="${point._id}">Reject</button>
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
                        showSuccess('Point accepted.');
                    } else {
                        const errorData = await res.json();
                        showError(errorData.message || 'Error accepting point.');
                    }
                } catch (err) {
                    console.error('Error accepting:', err);
                    showError('Server connection error.');
                }
            });
        });

        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!confirm('Are you sure you want to reject this point? It will be returned as private.')) {
                    return;
                }
                
                const id = e.target.dataset.id;
                try {
                    const res = await fetch(`/api/admin/reject/${id}`, { 
                        method: 'PUT', 
                        headers: { 'X-Session-Code': sessionCode } 
                    });
                    if (res.ok) {
                        fetchPendingPoints();
                        fetchPoints();
                        showSuccess('Point rejected - returned as private.');
                    } else {
                        const errorData = await res.json();
                        showError(errorData.message || 'Error rejecting point.');
                    }
                } catch (err) {
                    console.error('Error rejecting:', err);
                    showError('Server connection error.');
                }
            });
        });
    }

    // === Owner panel functions ===
    async function fetchAllowedSessions() {
        try {
            const res = await fetch('/api/owner/allowed-sessions', {
                headers: { 'X-Session-Code': sessionCode }
            });
            
            if (!res.ok) {
                throw new Error(`HTTP Error: ${res.status}`);
            }
            
            const allowedSessions = await res.json();
            renderAllowedSessions(allowedSessions);
        } catch (err) {
            console.error('Error fetching allowed sessions:', err);
            allowedSessionsList.innerHTML = '<li>Server connection error</li>';
        }
    }

    function renderAllowedSessions(sessions) {
        allowedSessionsList.innerHTML = '';
        if (sessions.length === 0) {
            allowedSessionsList.innerHTML = '<li>No allowed sessions.</li>';
            return;
        }

        sessions.forEach(session => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="session-item">
                    <span class="session-code">${session.sessionCode}</span>
                    <small class="session-date">Added: ${new Date(session.createdAt).toLocaleString()}</small>
                    <button class="button remove-session-btn" data-session="${session.sessionCode}">Remove</button>
                </div>
            `;
            allowedSessionsList.appendChild(li);
        });

        document.querySelectorAll('.remove-session-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const sessionToRemove = e.target.dataset.session;
                
                if (!confirm(`Are you sure you want to remove session ${sessionToRemove} from the allowed list?`)) {
                    return;
                }
                
                try {
                    const res = await fetch('/api/owner/remove-session', {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Session-Code': sessionCode
                        },
                        body: JSON.stringify({ sessionCode: sessionToRemove })
                    });
                    
                    if (res.ok) {
                        fetchAllowedSessions();
                        showSuccess('Session code removed from allowed list.');
                    } else {
                        const errorData = await res.json();
                        showError(errorData.message || 'Error removing session code.');
                    }
                } catch (err) {
                    console.error('Error removing session:', err);
                    showError('Server connection error.');
                }
            });
        });
    }

    addSessionBtn.addEventListener('click', async () => {
        const newSession = newSessionCodeInput.value.trim();
        if (!newSession) {
            showError('Enter session code.');
            return;
        }

        try {
            const res = await fetch('/api/owner/allow-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Code': sessionCode
                },
                body: JSON.stringify({ sessionCode: newSession })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                newSessionCodeInput.value = '';
                fetchAllowedSessions();
                showSuccess(data.message);
            } else {
                showError(data.message || 'Error adding session code.');
            }
        } catch (err) {
            console.error('Error adding session:', err);
            showError('Server connection error.');
        }
    });

    refreshSessionsBtn.addEventListener('click', fetchAllowedSessions);

    promoteUserBtn.addEventListener('click', async () => {
        const code = promoteSessionCodeInput.value.trim();
        if (!code) {
            showError('Enter session code of user to promote.');
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
                showError(result.message || 'Error promoting user.');
            }
        } catch (err) {
            console.error('Error promoting user:', err);
            showError('Server connection error.');
        }
    });

    // Handle Enter key in input fields
    adminLoginInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            adminLoginBtn.click();
        }
    });

    newSessionCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addSessionBtn.click();
        }
    });

    promoteSessionCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            promoteUserBtn.click();
        }
    });

    [resourceSelect, nameInput, xInput, zInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addPointBtn.click();
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideModals();
        }
    });

    // === INITIALIZATION ===
    async function init() {
        initializeResourceDropdowns();
        await checkUserPermissions();
        updateMapPosition();
        fetchPoints();
    }

    init();
});
