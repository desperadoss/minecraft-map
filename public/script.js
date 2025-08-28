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
    'mushroom_biome':     { name: 'Mushroom Island',   color: '#8A2BE2', category: 'biome' },
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
            const ownerRes = await fetch('/api/owner/check', { headers: { 'X-Session-Code': sessionCode } });
            const ownerData = await ownerRes.json();
            if (ownerData.isOwner) {
                isUserOwner = true;
                isUserAdmin = true; // Owner always has admin permissions
                console.log('User is owner');
                return;
            }

            // If not owner, check if admin
            try {
                const adminRes = await fetch('/api/admin/pending', { headers: { 'X-Session-Code': sessionCode } });
                if (adminRes.status === 200) {
                    isUserAdmin = true;
                    console.log('User is admin');
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
            background-color: #333;
            color: #fff;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 5px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            opacity: 0;
            transform: translateX(100%);
            transition: opacity 0.4s ease-out, transform 0.4s ease-out;
        `;

        // Type-based styling
        if (type === 'success') {
            notification.style.backgroundColor = '#27ae60';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#c0392b';
        }

        notification.textContent = message;
        container.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Animate out and remove
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            notification.addEventListener('transitionend', () => notification.remove());
        }, 5000);
    }
    
    function showSuccess(message) {
        showNotification(message, 'success');
    }
    
    function showError(message) {
        showNotification(message, 'error');
    }

    // === Point management functions ===
    async function fetchPoints() {
        try {
            const publicPointsRes = await fetch('/api/points');
            const publicPoints = await publicPointsRes.json();
            
            const privatePointsRes = await fetch('/api/points/private', {
                headers: {
                    'X-Session-Code': sessionCode
                }
            });
            const privatePoints = await privatePointsRes.json();
            
            const allPoints = [...publicPoints, ...privatePoints];
            displayPoints(allPoints);

        } catch (err) {
            console.error('Error fetching points:', err);
            showError('Could not fetch points from the server.');
        }
    }

    function displayPoints(points) {
        // Clear existing points
        document.querySelectorAll('.point-wrapper').forEach(p => p.remove());
        
        // Clear list
        const yourPointsList = document.getElementById('your-points-list');
        yourPointsList.innerHTML = '';
        
        points.forEach(point => {
            // Add to map
            const pointElement = createPointElement(point);
            mapContainer.appendChild(pointElement);
            
            // Add to list
            if (point.ownerSessionCode === sessionCode) {
                const listItem = createPointListItem(point);
                yourPointsList.appendChild(listItem);
            }
        });
        
        // Update visibility based on filter settings
        updatePointVisibility();
    }
    
    function createPointElement(point) {
        const pointWrapper = document.createElement('div');
        pointWrapper.classList.add('point-wrapper');
        pointWrapper.dataset.id = point._id;
        pointWrapper.dataset.status = point.status;
        pointWrapper.dataset.owner = point.ownerSessionCode;
        
        const resourceInfo = MINECRAFT_RESOURCES[point.resourceType] || { name: 'Custom Point', color: '#888', category: 'custom' };
        
        const pointElement = document.createElement('div');
        pointElement.classList.add('point');
        pointElement.classList.add(resourceInfo.category);
        pointElement.style.setProperty('--resource-color', resourceInfo.color);
        
        const nameElement = document.createElement('div');
        nameElement.classList.add('point-name');
        nameElement.textContent = point.name;
        
        pointWrapper.appendChild(pointElement);
        pointWrapper.appendChild(nameElement);

        pointElement.addEventListener('click', (e) => {
            e.stopPropagation();
            showPointDetailsModal(point);
        });

        updatePointPosition(pointWrapper, point.x, point.z);
        return pointWrapper;
    }
    
    function updatePointPosition(pointElement, x, z) {
        const xPercent = (x - -MAP_X_RANGE) / (2 * MAP_X_RANGE) * 100;
        const zPercent = (z - -MAP_Z_RANGE) / (2 * MAP_Z_RANGE) * 100;
        
        pointElement.style.left = `${xPercent}%`;
        pointElement.style.top = `${zPercent}%`;
    }

    function createPointListItem(point) {
        const listItem = document.createElement('li');
        listItem.classList.add('point-list-item');
        listItem.dataset.id = point._id;
        
        const resourceInfo = MINECRAFT_RESOURCES[point.resourceType] || { name: 'Custom Point', color: '#888', category: 'custom' };

        listItem.innerHTML = `
            <span class="point-list-name">${point.name}</span>
            <span class="point-list-coords">(X: ${point.x}, Z: ${point.z})</span>
            <span class="point-list-type">${resourceInfo.name}</span>
            <span class="point-list-status ${point.status}">${point.status}</span>
        `;
        
        listItem.addEventListener('click', () => {
            showPointDetailsModal(point);
        });

        return listItem;
    }

    function showPointDetailsModal(point) {
        document.getElementById('point-details-name').textContent = point.name;
        document.getElementById('point-details-x').textContent = point.x;
        document.getElementById('point-details-z').textContent = point.z;

        // Set type and description
        const resourceInfo = MINECRAFT_RESOURCES[point.resourceType] || { name: 'Custom Point', color: '#888', category: 'custom' };
        document.getElementById('point-details-type').textContent = resourceInfo.name;
        document.getElementById('point-details-description').textContent = point.description || 'No description provided.';
        
        // Toggle visibility of description if it's not provided
        const descGroup = document.querySelector('.point-details-description-group');
        if (point.description) {
            descGroup.style.display = 'block';
        } else {
            descGroup.style.display = 'none';
        }
        
        pointDetailsModal.style.display = 'flex';
        
        // Show/hide buttons based on ownership and status
        const isOwner = point.ownerSessionCode === sessionCode;
        editPointBtn.style.display = isOwner ? 'block' : 'none';
        deletePointBtn.style.display = isOwner ? 'block' : 'none';
        sharePointBtn.style.display = (isOwner && point.status === 'private') ? 'block' : 'none';

        // Add event listeners for this specific point
        editPointBtn.onclick = () => {
            pointDetailsModal.style.display = 'none';
            setupEditMode(point);
        };
        deletePointBtn.onclick = () => {
            if (confirm('Are you sure you want to delete this point?')) {
                deletePoint(point._id);
            }
        };
        sharePointBtn.onclick = () => {
            sharePoint(point._id);
        };
    }

    function setupEditMode(point) {
        addPointBtn.textContent = 'Save Changes';
        addPointBtn.dataset.mode = 'edit';
        addPointBtn.dataset.pointId = point._id;
        
        // Populate the form with point data
        resourceSelect.value = point.resourceType;
        // Trigger change event to show/hide custom name group
        resourceSelect.dispatchEvent(new Event('change'));
        
        if (point.resourceType === 'custom') {
            nameInput.value = point.name;
        } else {
            nameInput.value = MINECRAFT_RESOURCES[point.resourceType].name;
        }
        
        descriptionInput.value = point.description || '';
        xInput.value = point.x;
        zInput.value = point.z;
    }
    
    function clearInputs() {
        resourceSelect.value = 'custom';
        resourceSelect.dispatchEvent(new Event('change')); // Reset name input
        nameInput.value = '';
        descriptionInput.value = '';
        xInput.value = '';
        zInput.value = '';
    }

    async function deletePoint(id) {
        try {
            const response = await fetch(`/api/points/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-Session-Code': sessionCode
                }
            });
            
            if (response.ok) {
                showSuccess('Point deleted successfully!');
                fetchPoints();
                pointDetailsModal.style.display = 'none';
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Error deleting point.');
            }
        } catch (err) {
            console.error('Error deleting point:', err);
            showError('Server connection error.');
        }
    }
    
    async function sharePoint(id) {
        try {
            const response = await fetch(`/api/points/share/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Code': sessionCode
                }
            });
            
            if (response.ok) {
                showSuccess('Point submitted for admin approval!');
                fetchPoints();
                pointDetailsModal.style.display = 'none';
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
    
    // Add/Edit Point Form Submission
    addPointForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        addPointBtn.disabled = true;
        const mode = addPointBtn.dataset.mode;
        
        const resourceType = resourceSelect.value;
        const name = resourceType === 'custom' ? nameInput.value.trim() : MINECRAFT_RESOURCES[resourceType].name;
        const description = descriptionInput.value.trim();
        const x = xInput.value;
        const z = zInput.value;
        
        const pointData = { name, description, x, z, resourceType };
        let response;
        
        try {
            if (mode === 'edit') {
                const pointId = addPointBtn.dataset.pointId;
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

    // Map Interaction
    mapContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        mapContainer.style.cursor = 'grabbing';
    });
    
    mapContainer.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        // Throttle mouse movement for performance
        if (isThrottling) return;
        isThrottling = true;
        
        clearTimeout(mouseMoveThrottle);
        mouseMoveThrottle = setTimeout(() => {
            isThrottling = false;
        }, 16); // ~60 FPS

        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        
        offsetX += dx;
        offsetY += dy;
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        mapImage.style.transform = `scale(${currentScale}) translate(${offsetX / currentScale}px, ${offsetY / currentScale}px)`;
        
        // Update point positions
        document.querySelectorAll('.point-wrapper').forEach(pointElement => {
            pointElement.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${1 / currentScale})`;
            pointElement.style.willChange = 'transform';
        });

        updateCoordinatesInfo(e);
        updateZoomInfo();
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
        if (!isDragging) {
            updateCoordinatesInfo(e);
        }
    });

    mapContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        const newScale = Math.max(0.05, Math.min(1, currentScale + delta));
        
        // Get mouse position relative to map container
        const rect = mapContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate a new offset to zoom to the cursor
        const oldImageLeft = (MAP_WIDTH_PX / 2) * currentScale + offsetX;
        const oldImageTop = (MAP_HEIGHT_PX / 2) * currentScale + offsetY;

        const newImageLeft = (MAP_WIDTH_PX / 2) * newScale;
        const newImageTop = (MAP_HEIGHT_PX / 2) * newScale;
        
        const newOffsetX = offsetX - (mouseX - oldImageLeft) * (newScale / currentScale - 1);
        const newOffsetY = offsetY - (mouseY - oldImageTop) * (newScale / currentScale - 1);
        
        currentScale = newScale;
        offsetX = newOffsetX;
        offsetY = newOffsetY;

        mapImage.style.transform = `scale(${currentScale}) translate(${offsetX / currentScale}px, ${offsetY / currentScale}px)`;

        document.querySelectorAll('.point-wrapper').forEach(pointElement => {
            pointElement.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${1 / currentScale})`;
            pointElement.style.will-change = 'transform';
        });

        updateCoordinatesInfo(e);
        updateZoomInfo();
    });
    
    zoomInBtn.addEventListener('click', () => {
        const newScale = Math.min(1, currentScale + 0.1);
        currentScale = newScale;
        mapImage.style.transform = `scale(${currentScale}) translate(${offsetX / currentScale}px, ${offsetY / currentScale}px)`;
        document.querySelectorAll('.point-wrapper').forEach(pointElement => {
            pointElement.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${1 / currentScale})`;
        });
        updateZoomInfo();
    });
    
    zoomOutBtn.addEventListener('click', () => {
        const newScale = Math.max(0.05, currentScale - 0.1);
        currentScale = newScale;
        mapImage.style.transform = `scale(${currentScale}) translate(${offsetX / currentScale}px, ${offsetY / currentScale}px)`;
        document.querySelectorAll('.point-wrapper').forEach(pointElement => {
            pointElement.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${1 / currentScale})`;
        });
        updateZoomInfo();
    });
    
    resetViewBtn.addEventListener('click', () => {
        currentScale = 0.18;
        offsetX = 0;
        offsetY = 0;
        mapImage.style.transition = 'transform 0.5s ease-out';
        mapImage.style.transform = `scale(${currentScale}) translate(${offsetX / currentScale}px, ${offsetY / currentScale}px)`;
        document.querySelectorAll('.point-wrapper').forEach(pointElement => {
            pointElement.style.transition = 'transform 0.5s ease-out';
            pointElement.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${1 / currentScale})`;
        });
        // Remove transitions after they're done
        setTimeout(() => {
            mapImage.style.transition = '';
            document.querySelectorAll('.point-wrapper').forEach(pointElement => {
                pointElement.style.transition = '';
            });
        }, 500);
        updateZoomInfo();
    });
    
    // Filter buttons
    showYourPointsBtn.addEventListener('click', () => {
        showYourPointsBtn.classList.toggle('active');
        isShowingPrivate = !isShowingPrivate;
        updatePointVisibility();
    });
    
    showSharedPointsBtn.addEventListener('click', () => {
        showSharedPointsBtn.classList.toggle('active');
        isShowingPublic = !isShowingPublic;
        updatePointVisibility();
    });

    function updatePointVisibility() {
        document.querySelectorAll('.point-wrapper').forEach(pointElement => {
            const status = pointElement.dataset.status;
            const owner = pointElement.dataset.owner;
            
            const isPrivate = (status === 'private' || status === 'pending') && owner === sessionCode;
            const isPublic = (status === 'public');
            
            let isVisible = false;
            if (isPrivate && isShowingPrivate) {
                isVisible = true;
            }
            if (isPublic && isShowingPublic) {
                isVisible = true;
            }
            
            pointElement.style.display = isVisible ? 'block' : 'none';
        });
    }

    // Coordinates and Zoom Info
    function updateCoordinatesInfo(e) {
        const mapRect = mapImage.getBoundingClientRect();
        const containerRect = mapContainer.getBoundingClientRect();

        const mapX = (e.clientX - containerRect.left) - mapRect.left;
        const mapZ = (e.clientY - containerRect.top) - mapRect.top;

        const xCoord = Math.round((mapX / currentScale) - MAP_WIDTH_PX / 2);
        const zCoord = Math.round((mapZ / currentScale) - MAP_HEIGHT_PX / 2);

        coordinatesInfo.textContent = `X: ${xCoord}, Z: ${zCoord}`;
    }
    
    function updateZoomInfo() {
        const zoomPercentage = Math.round(currentScale / 0.18 * 100);
        zoomInfo.textContent = `${zoomPercentage}%`;
    }

    // Modal logic
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.modal').style.display = 'none';
        });
    });
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Admin login
    adminLoginBtn.addEventListener('click', () => {
        adminLoginModal.style.display = 'flex';
    });
    
    const adminLoginSubmitBtn = document.getElementById('admin-login-submit');
    adminLoginSubmitBtn.addEventListener('click', async () => {
        const adminCode = adminLoginInput.value;
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionCode: adminCode })
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('sessionCode', data.sessionCode);
                sessionCode = data.sessionCode; // Update global sessionCode
                sessionCodeDisplay.textContent = `Session Code: ${sessionCode} (Admin)`;
                isUserAdmin = true;
                showSuccess('Admin login successful!');
                adminLoginModal.style.display = 'none';
                checkUserPermissions();
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Admin login failed.');
            }
        } catch (err) {
            console.error('Admin login error:', err);
            showError('Server connection error during login.');
        }
    });

    const ownerPanelBtn = document.getElementById('owner-panel-btn');
    ownerPanelBtn.addEventListener('click', async () => {
        if (isUserOwner) {
            ownerPanelModal.style.display = 'flex';
            await fetchAllowedSessions();
        } else {
            showError('You do not have owner permissions.');
        }
    });
    
    async function fetchAllowedSessions() {
        try {
            const response = await fetch('/api/owner/sessions', {
                headers: { 'X-Session-Code': sessionCode }
            });
            if (response.ok) {
                const sessions = await response.json();
                const list = document.getElementById('allowed-sessions-list');
                list.innerHTML = '';
                sessions.forEach(s => {
                    const li = document.createElement('li');
                    li.classList.add('session-item');
                    li.innerHTML = `
                        <span class="session-code">${s.sessionCode}</span>
                        <span class="session-date">${new Date(s.createdAt).toLocaleDateString()}</span>
                        <button class="button delete-session" data-code="${s.sessionCode}">Delete</button>
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

    // Call checkUserPermissions on load
    checkUserPermissions();

    // Initial setup
    fetchPoints();
    updateZoomInfo();
});
