document.addEventListener('DOMContentLoaded', () => {
    // === HTML Selectors ===
    const mapContainer = document.getElementById('map-container');
    const mapImage = document.getElementById('minecraft-map');
    const coordinatesInfo = document.getElementById('coordinates-info');
    const zoomInfo = document.getElementById('zoom-info');
    const sessionCodeDisplay = document.getElementById('session-code-display');
    
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    
    // Form elements
    const addPointForm = document.getElementById('add-point-form');
    const resourceSelect = document.getElementById('resource-select');
    const customNameGroup = document.getElementById('custom-name-group');
    const nameInput = document.getElementById('name-input');
    const descriptionInput = document.getElementById('description-input');
    const xInput = document.getElementById('x-input');
    const zInput = document.getElementById('z-input');
    const addPointBtn = document.getElementById('add-point-button');

    // Lists
    const yourPointsList = document.getElementById('your-points-list');
    const sharedPointsList = document.getElementById('shared-points-list');
    const pendingPointsList = document.getElementById('pending-points-list');
    const allowedSessionsList = document.getElementById('allowed-sessions-list');

    // Controls
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const resetViewBtn = document.getElementById('reset-view');
    const showYourPointsToggle = document.getElementById('show-your-points');
    const showSharedPointsToggle = document.getElementById('show-shared-points');

    // Modal
    const pointDetailsModal = document.getElementById('point-details-modal');

    // Admin/Owner elements
    const adminNav = document.getElementById('admin-nav');
    const ownerNav = document.getElementById('owner-nav');
    const adminLoginCard = document.getElementById('admin-login-card');
    const ownerLoginCard = document.getElementById('owner-login-card');

    // === Map Configuration ===
    const MAP_WIDTH_PX = 8004;
    const MAP_HEIGHT_PX = 4500;
    const WORLD_SIZE_X = 8000;  // -4000 to +4000
    const WORLD_SIZE_Z = 4500;  // -2250 to +2250
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 3.0;
    const ZOOM_STEP = 0.1;

    // === Global Variables ===
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

    // Resource colors
    const MINECRAFT_RESOURCES = {
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
        mesa: { name: 'Mesa/Badlands', color: '#CD5C5C' },
        ice_spikes: { name: 'Ice Spikes', color: '#ADD8E6' },
        flower_forest: { name: 'Flower Forest', color: '#FFB6C1' },
        spawn: { name: 'Spawn Point', color: '#FFA500' },
        base: { name: 'Base', color: '#008080' },
        farm: { name: 'Farm', color: '#7FFF00' },
        portal: { name: 'Nether Portal', color: '#9370DB' },
        treasure: { name: 'Treasure', color: '#FFD700' },
        custom: { name: 'Custom', color: '#888888' }
    };

    // === Helper Functions ===
    function showSuccess(message) {
        alert('Success: ' + message);
    }

    function showError(message) {
        alert('Error: ' + message);
    }

    // Convert Minecraft coordinates to pixel coordinates
    function mcToPx(x, z) {
        // Convert minecraft coords to map pixel coords
        const pxX = ((x + 4000) / WORLD_SIZE_X) * MAP_WIDTH_PX;
        const pxZ = ((z + 2250) / WORLD_SIZE_Z) * MAP_HEIGHT_PX;
        return { x: pxX, z: pxZ };
    }

    // Convert pixel coordinates to Minecraft coordinates
    function pxToMc(pxX, pxZ) {
        const x = Math.round((pxX / MAP_WIDTH_PX) * WORLD_SIZE_X - 4000);
        const z = Math.round((pxZ / MAP_HEIGHT_PX) * WORLD_SIZE_Z - 2250);
        return { x, z };
    }

    function updateMapTransform() {
        const mapWrapper = document.querySelector('.map-wrapper');
        const containerRect = mapWrapper.getBoundingClientRect();

        // Calculate maximum translation limits
        const maxTranslateX = Math.max(0, (MAP_WIDTH_PX * scale - containerRect.width) / 2);
        const maxTranslateY = Math.max(0, (MAP_HEIGHT_PX * scale - containerRect.height) / 2);
        
        // Clamp translation values
        currentMapX = Math.max(-maxTranslateX, Math.min(maxTranslateX, currentMapX));
        currentMapY = Math.max(-maxTranslateY, Math.min(maxTranslateY, currentMapY));

        mapContainer.style.transform = `translate(${currentMapX}px, ${currentMapY}px) scale(${scale})`;
        updatePointScaling();
    }
    
    function updatePointScaling() {
        const points = document.querySelectorAll('.point');
        points.forEach(point => {
            const size = Math.max(6, 10 / scale);
            point.style.width = `${size}px`;
            point.style.height = `${size}px`;
        });
    }

    function updateCoordinatesInfo(event) {
        const mapWrapper = document.querySelector('.map-wrapper');
        const rect = mapWrapper.getBoundingClientRect();
        
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Calculate position relative to map center
        const mapCenterX = rect.width / 2;
        const mapCenterY = rect.height / 2;
        
        // Get pixel position on the map
        const mapPixelX = (mouseX - mapCenterX - currentMapX) / scale + MAP_WIDTH_PX / 2;
        const mapPixelZ = (mouseY - mapCenterY - currentMapY) / scale + MAP_HEIGHT_PX / 2;

        const mcCoords = pxToMc(mapPixelX, mapPixelZ);
        coordinatesInfo.textContent = `X: ${mcCoords.x}, Z: ${mcCoords.z}`;
    }

    function updateZoomInfo() {
        zoomInfo.textContent = `Zoom: ${Math.round(scale * 100)}%`;
    }

    function updateTime() {
        const now = new Date();
        const utcTime = now.toISOString().substring(11, 16);
        document.querySelector('.timestamp').textContent = `UTC ${utcTime}`;
    }

    function zoom(direction, centerX = null, centerY = null) {
        const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale + direction * ZOOM_STEP));
        
        if (newScale !== scale) {
            const mapWrapper = document.querySelector('.map-wrapper');
            const rect = mapWrapper.getBoundingClientRect();
            
            // Use center of viewport if no specific center provided
            const zoomCenterX = centerX !== null ? centerX : rect.width / 2;
            const zoomCenterY = centerY !== null ? centerY : rect.height / 2;
            
            // Calculate zoom adjustment
            const scaleFactor = newScale / scale;
            
            // Adjust translation to zoom toward the center point
            currentMapX = (currentMapX - zoomCenterX) * scaleFactor + zoomCenterX;
            currentMapY = (currentMapY - zoomCenterY) * scaleFactor + zoomCenterY;
            
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
        const rect = mapWrapper.getBoundingClientRect();
        
        // Set optimal zoom
        scale = 1.5;
        
        // Center the point
        currentMapX = rect.width / 2 - (pxCoords.x * scale - MAP_WIDTH_PX * scale / 2);
        currentMapY = rect.height / 2 - (pxCoords.z * scale - MAP_HEIGHT_PX * scale / 2);
        
        updateMapTransform();
        updateZoomInfo();
    }

    // === Navigation ===
    function switchSection(targetSection) {
        navItems.forEach(item => item.classList.remove('active'));
        contentSections.forEach(section => section.classList.remove('active'));
        
        const targetNav = document.querySelector(`[data-section="${targetSection}"]`);
        const targetContent = document.getElementById(`${targetSection}-section`);
        
        if (targetNav && targetContent) {
            targetNav.classList.add('active');
            targetContent.classList.add('active');
        }
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
                renderPointList(privatePoints, yourPointsList, true);
                renderPointList(publicPoints, sharedPointsList, false);
            } else {
                throw new Error('Failed to fetch points from server.');
            }
        } catch (err) {
            console.error('Error fetching points:', err);
            showError('Could not load points from the server.');
        }
    }

    function renderPoints(publicPoints, privatePoints) {
        // Remove existing points
        document.querySelectorAll('.point-wrapper').forEach(p => p.remove());

        const points = [];
        
        if (isShowingPrivate) {
            points.push(...privatePoints.map(p => ({...p, isPrivate: true})));
        }
        
        if (isShowingPublic) {
            points.push(...publicPoints.map(p => ({...p, isPrivate: false})));
        }
        
        points.forEach(point => {
            const pxCoords = mcToPx(point.x, point.z);
            
            const pointWrapper = document.createElement('div');
            pointWrapper.className = 'point-wrapper';
            pointWrapper.style.left = `${pxCoords.x}px`;
            pointWrapper.style.top = `${pxCoords.z}px`;
            pointWrapper.dataset.id = point._id;
            pointWrapper.dataset.x = point.x;
            pointWrapper.dataset.z = point.z;
            pointWrapper.dataset.status = point.status;
            pointWrapper.dataset.resourceType = point.resourceType;

            const pointElement = document.createElement('div');
            pointElement.className = 'point';
            pointElement.style.backgroundColor = MINECRAFT_RESOURCES[point.resourceType]?.color || '#888';
            pointElement.style.boxShadow = `0 0 6px ${MINECRAFT_RESOURCES[point.resourceType]?.color || '#888'}`;
            
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

    function renderPointList(points, listElement, isPrivate) {
        listElement.innerHTML = '';
        
        if (points.length === 0) {
            listElement.innerHTML = '<div class="no-points">No points to display</div>';
            return;
        }

        points.forEach(point => {
            const pointItem = document.createElement('div');
            pointItem.className = 'point-item';
            pointItem.dataset.id = point._id;

            const pointInfo = document.createElement('div');
            pointInfo.className = 'point-info';
            pointInfo.innerHTML = `
                <h4>${point.name}</h4>
                <small>X: ${point.x}, Z: ${point.z}</small>
            `;

            const pointActions = document.createElement('div');
            pointActions.className = 'point-actions';
            
            const viewBtn = document.createElement('button');
            viewBtn.textContent = 'View';
            viewBtn.className = 'btn btn-secondary';
            viewBtn.addEventListener('click', () => {
                switchSection('map-view');
                setTimeout(() => zoomToPoint(point.x, point.z), 100);
            });
            pointActions.appendChild(viewBtn);

            if (point.ownerSessionCode === sessionCode || isUserAdmin) {
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Edit';
                editBtn.className = 'btn btn-secondary';
                editBtn.addEventListener('click', () => editPoint(point));
                pointActions.appendChild(editBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'btn btn-danger';
                deleteBtn.addEventListener('click', () => {
                    if (confirm('Are you sure you want to delete this point?')) {
                        deletePoint(point._id);
                    }
                });
                pointActions.appendChild(deleteBtn);
            }

            pointItem.appendChild(pointInfo);
            pointItem.appendChild(pointActions);
            listElement.appendChild(pointItem);
        });
    }

    function displayPointDetails(point) {
        const title = point.name || (MINECRAFT_RESOURCES[point.resourceType]?.name || 'Point');
        document.getElementById('point-details-title').textContent = title;
        document.getElementById('point-coords').textContent = `X: ${point.x}, Z: ${point.z}`;
        document.getElementById('point-description').textContent = point.description || 'No description.';
        document.getElementById('point-type').textContent = MINECRAFT_RESOURCES[point.resourceType]?.name || 'Custom';

        // Hide all action buttons first
        document.getElementById('share-point').style.display = 'none';
        document.getElementById('edit-point').style.display = 'none';
        document.getElementById('delete-point').style.display = 'none';

        if (point.ownerSessionCode === sessionCode) {
            document.getElementById('edit-point').style.display = 'inline-flex';
            document.getElementById('delete-point').style.display = 'inline-flex';

            if (point.status === 'private') {
                document.getElementById('share-point').style.display = 'inline-flex';
            }
        }
        
        pointDetailsModal.style.display = 'flex';

        // Add event listeners
        document.getElementById('edit-point').onclick = () => {
            pointDetailsModal.style.display = 'none';
            editPoint(point);
        };

        document.getElementById('delete-point').onclick = () => {
            if (confirm('Are you sure you want to delete this point?')) {
                pointDetailsModal.style.display = 'none';
                deletePoint(point._id);
            }
        };
    }

    function editPoint(point) {
        switchSection('add-point');
        
        addPointForm.dataset.mode = 'edit';
        addPointForm.dataset.pointId = point._id;
        
        resourceSelect.value = point.resourceType;
        
        if (point.resourceType === 'custom') {
            customNameGroup.style.display = 'block';
            nameInput.required = true;
        } else {
            customNameGroup.style.display = 'none';
            nameInput.required = false;
        }
        
        nameInput.value = point.name || '';
        descriptionInput.value = point.description || '';
        xInput.value = point.x;
        zInput.value = point.z;
        addPointBtn.textContent = 'Save Changes';
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

    function clearForm() {
        resourceSelect.value = 'diamond_ore';
        customNameGroup.style.display = 'none';
        nameInput.value = '';
        nameInput.required = false;
        descriptionInput.value = '';
        xInput.value = '';
        zInput.value = '';
        addPointBtn.textContent = 'Add Point';
        addPointForm.dataset.mode = 'add';
        delete addPointForm.dataset.pointId;
    }

    // === Owner/Admin Functions ===
    const OWNER_SESSION_CODES = [
        '270ea844-8ab8-4ea1-a34c-18ea2e6a920a',
        '301263ee-49a9-4575-8c3d-f784bae7b27d'
    ];

    async function checkUserPermissions() {
        isUserOwner = OWNER_SESSION_CODES.includes(sessionCode);
        if (isUserOwner) {
            ownerNav.style.display = 'block';
            ownerLoginCard.style.display = 'block';
        }

        try {
            const adminRes = await fetch('/api/admin/pending', {
                headers: { 'X-Session-Code': sessionCode }
            });
            if (adminRes.status === 200) {
                isUserAdmin = true;
                adminNav.style.display = 'block';
                adminLoginCard.style.display = 'block';
            }
        } catch (err) {
            console.log('User has no admin permissions.');
        }
    }

    async function fetchPendingPoints() {
        try {
            const response = await fetch('/api/admin/pending', {
                headers: { 'X-Session-Code': sessionCode }
            });
            const points = await response.json();

            pendingPointsList.innerHTML = '';
            if (points.length === 0) {
                pendingPointsList.innerHTML = '<div class="no-points">No pending points.</div>';
                return;
            }

            points.forEach(point => {
                const pointItem = document.createElement('div');
                pointItem.className = 'point-item';
                pointItem.innerHTML = `
                    <div class="point-info">
                        <h4>${point.name}</h4>
                        <small>X: ${point.x}, Z: ${point.z}<br>Description: ${point.description || 'None'}</small>
                    </div>
                    <div class="point-actions">
                        <button class="btn btn-primary approve-btn" data-id="${point._id}">Approve</button>
                        <button class="btn btn-danger deny-btn" data-id="${point._id}">Deny</button>
                    </div>
                `;
                pendingPointsList.appendChild(pointItem);
            });
        } catch (err) {
            showError('Failed to load pending points.');
        }
    }

    // === Event Listeners ===
    
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            switchSection(section);
        });
    });

    // Map dragging
    mapContainer.addEventListener('mousedown', (e) => {
        if (e.target === mapImage) {
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            mapContainer.style.cursor = 'grabbing';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - dragStartX;
            const deltaY = e.clientY - dragStartY;
            currentMapX += deltaX;
            currentMapY += deltaY;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            updateMapTransform();
        }
        
        // Update coordinates if mouse is over map
        const mapWrapper = document.querySelector('.map-wrapper');
        const rect = mapWrapper.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && 
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
            updateCoordinatesInfo(e);
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
        mapContainer.style.cursor = 'grab';
    });

    // Map zoom
    document.querySelector('.map-wrapper').addEventListener('wheel', (e) => {
        e.preventDefault();
        const direction = e.deltaY > 0 ? -1 : 1;
        zoom(direction, e.offsetX, e.offsetY);
    });

    // Controls
    zoomInBtn.addEventListener('click', () => zoom(1));
    zoomOutBtn.addEventListener('click', () => zoom(-1));
    resetViewBtn.addEventListener('click', resetView);

    // Filters
    showYourPointsToggle.addEventListener('change', () => {
        isShowingPrivate = showYourPointsToggle.checked;
        fetchPoints();
    });

    showSharedPointsToggle.addEventListener('change', () => {
        isShowingPublic = showSharedPointsToggle.checked;
        fetchPoints();
    });

    // Form submission
    addPointForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const mode = addPointForm.dataset.mode || 'add';
        const pointId = addPointForm.dataset.pointId;

        const pointData = {
            name: resourceSelect.value ===
