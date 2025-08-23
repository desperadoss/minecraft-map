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

    // Modale
    const pointDetailsModal = document.getElementById('point-details-modal');
    const adminLoginModal = document.getElementById('admin-login-modal');
    const adminPanelModal = document.getElementById('admin-panel-modal');
    const ownerLoginModal = document.getElementById('owner-login-modal');
    const ownerPanelModal = document.getElementById('owner-panel-modal');
    
    // Przyciski i pola w modalach
    const closeButtons = document.querySelectorAll('.close-button');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const ownerLoginBtn = document.getElementById('owner-login-btn');
    const adminLoginInput = document.getElementById('admin-login-input');
    const ownerLoginInput = document.getElementById('owner-login-input');
    const refreshPendingBtn = document.getElementById('refresh-pending');
    const pendingPointsList = document.getElementById('pending-points-list');
    const promoteSessionCodeInput = document.getElementById('promote-session-code');
    const promoteUserBtn = document.getElementById('promote-user');


    // Zmienne do obsługi mapy
    let isDragging = false;
    let startX, startY;
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    
    
    // === Obsługa powiększenia i przesuwania mapy, oraz śledzenia myszki ===
    function updateTransform() {
        mapImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        zoomInfo.textContent = `Zoom: ${Math.round(scale * 100)}%`;
        fetchPoints();
    }
    
    zoomInBtn.addEventListener('click', () => {
        scale = Math.min(scale + 0.1, 5);
        updateTransform();
    });

    zoomOutBtn.addEventListener('click', () => {
        scale = Math.max(scale - 0.1, 0.5);
        updateTransform();
    });

    resetViewBtn.addEventListener('click', () => {
        scale = 1;
        translateX = 0;
        translateY = 0;
        updateTransform();
    });

    mapContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        mapContainer.style.cursor = 'grabbing';
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
        // Obliczanie koordynatów myszki (NOWY KOD)
        const mapRect = mapImage.getBoundingClientRect();
        if (e.clientX < mapRect.left || e.clientX > mapRect.right ||
            e.clientY < mapRect.top || e.clientY > mapRect.bottom) {
            coordinatesInfo.textContent = '';
        } else {
            const mouseX = e.clientX - mapRect.left;
            const mouseY = e.clientY - mapRect.top;
            const totalMapWidth = mapImage.naturalWidth * scale;
            const totalMapHeight = mapImage.naturalHeight * scale;
            const gameX = Math.round(((mouseX / totalMapWidth) * 10000) - 5000);
            const gameZ = Math.round(((mouseY / totalMapHeight) * 5500) - 2750);
            coordinatesInfo.textContent = `X: ${gameX}, Z: ${gameZ}`;
        }

        // Istniejący kod do przeciągania mapy
        if (!isDragging) return;
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
    });
    
    // === Generowanie i wyświetlanie kodu sesji ===
    let sessionCode = localStorage.getItem('sessionCode');
    if (!sessionCode) {
        sessionCode = generateSessionCode();
        localStorage.setItem('sessionCode', sessionCode);
    }
    sessionCodeDisplay.textContent = `Twój Kod Sesji: ${sessionCode}`;

    function generateSessionCode() {
        return Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);
    }

    // === Fetchowanie i wyświetlanie punktów ===
    const pointsContainer = document.querySelector('.points-container');

    async function fetchPoints() {
        pointsContainer.innerHTML = '';
        const isShowYourPointsActive = showYourPointsBtn.classList.contains('active');
        const isShowSharedPointsActive = showSharedPointsBtn.classList.contains('active');

        let points = [];
        if (isShowYourPointsActive) {
            const privatePoints = await fetchPrivatePoints();
            points = points.concat(privatePoints);
        }
        if (isShowSharedPointsActive) {
            const sharedPoints = await fetchSharedPoints();
            points = points.concat(sharedPoints);
        }

        points.forEach(point => {
            const pointDiv = document.createElement('div');
            pointDiv.className = 'map-point';
            pointDiv.dataset.id = point._id;
            pointDiv.dataset.x = point.x;
            pointDiv.dataset.z = point.z;
            pointDiv.innerHTML = `
                <div class="point-tooltip">
                    <strong>${point.name}</strong><br>
                    X: ${point.x}, Z: ${point.z}
                </div>
            `;
            
            const pointX = (point.x + 5000) / 10000;
            const pointZ = (point.z + 2750) / 5500;

            pointDiv.style.left = `${pointX * 100}%`;
            pointDiv.style.top = `${pointZ * 100}%`;
            
            pointsContainer.appendChild(pointDiv);
        });
    }

    async function fetchPrivatePoints() {
        try {
            const res = await fetch('/api/points/private', {
                headers: { 'X-Session-Code': sessionCode }
            });
            return await res.json();
        } catch (err) {
            console.error('Błąd podczas pobierania prywatnych punktów:', err);
            return [];
        }
    }

    async function fetchSharedPoints() {
        try {
            const res = await fetch('/api/points/public');
            return await res.json();
        } catch (err) {
            console.error('Błąd podczas pobierania publicznych punktów:', err);
            return [];
        }
    }
    
    fetchPoints();

    // === Obsługa przycisków filtrowania ===
    showYourPointsBtn.addEventListener('click', () => {
        showYourPointsBtn.classList.toggle('active');
        fetchPoints();
    });

    showSharedPointsBtn.addEventListener('click', () => {
        showSharedPointsBtn.classList.toggle('active');
        fetchPoints();
    });

    // === Obsługa formularza dodawania punktu ===
    addPointBtn.addEventListener('click', async () => {
        const name = nameInput.value;
        const x = xInput.value;
        const z = zInput.value;

        if (!name || !x || !z) {
            alert('Wypełnij wszystkie pola!');
            return;
        }
        
        const newPoint = {
            name: name,
            x: parseInt(x),
            z: parseInt(z),
            ownerSessionCode: sessionCode,
            status: 'pending' 
        };

        try {
            const res = await fetch('/api/points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPoint)
            });
            const result = await res.json();
            alert(result.message);
            nameInput.value = '';
            xInput.value = '';
            zInput.value = '';
            fetchPoints();
        } catch (err) {
            console.error('Błąd podczas dodawania punktu:', err);
            alert('Wystąpił błąd podczas dodawania punktu.');
        }
    });
    
    // === Obsługa modalów ===
    function hideModals() {
        pointDetailsModal.style.display = 'none';
        adminLoginModal.style.display = 'none';
        adminPanelModal.style.display = 'none';
        ownerLoginModal.style.display = 'none';
        ownerPanelModal.style.display = 'none';
    }

    closeButtons.forEach(btn => {
        btn.addEventListener('click', hideModals);
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModals();
        }
    });
    
    // === Logowanie do panelu admina ===
    adminLoginBtn.addEventListener('click', async () => {
        const code = adminLoginInput.value;
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionCode: code })
            });
            
            const result = await res.json();
            if (res.ok) {
                localStorage.setItem('adminSessionCode', code);
                adminLoginModal.style.display = 'none';
                fetchPendingPoints();
                adminPanelModal.style.display = 'block';
            } else {
                alert(result.message);
            }
        } catch (err) {
            console.error('Błąd logowania admina:', err);
        }
    });

    // === Fetchowanie oczekujących punktów dla admina ===
    async function fetchPendingPoints() {
        const adminSessionCode = localStorage.getItem('adminSessionCode');
        if (!adminSessionCode) {
            return;
        }
        try {
            const res = await fetch('/api/admin/pending', {
                headers: { 'X-Session-Code': adminSessionCode }
            });
            const pendingPoints = await res.json();
            renderPendingPoints(pendingPoints);
        } catch (err) {
            console.error('Błąd pobierania oczekujących punktów:', err);
        }
    }

    function renderPendingPoints(points) {
        pendingPointsList.innerHTML = '';
        if (points.length === 0) {
            pendingPointsList.innerHTML = '<p>Brak oczekujących punktów.</p>';
            return;
        }

        points.forEach(point => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${point.name} (${point.x}, ${point.z})</span>
                <div class="pending-buttons">
                    <button class="button small-button accept-btn" data-id="${point._id}">Akceptuj</button>
                    <button class="button small-button delete-btn" data-id="${point._id}">Usuń</button>
                </div>
            `;
            pendingPointsList.appendChild(li);
        });

        const sessionCode = localStorage.getItem('adminSessionCode');
        document.querySelectorAll('.accept-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                await fetch(`/api/admin/accept/${id}`, { method: 'PUT', headers: { 'X-Session-Code': sessionCode } });
                fetchPendingPoints();
                fetchPoints();
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                await fetch(`/api/admin/delete/${id}`, { method: 'DELETE', headers: { 'X-Session-Code': sessionCode } });
                fetchPendingPoints();
                fetchPoints();
            });
        });
    }

    promoteUserBtn.addEventListener('click', async () => {
        const code = promoteSessionCodeInput.value;
        const ownerSessionCode = localStorage.getItem('ownerSessionCode');

        if (!code) {
            alert('Wpisz kod sesji użytkownika do awansowania.');
            return;
        }

        try {
            const res = await fetch('/api/owner/promote', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Session-Code': ownerSessionCode },
                body: JSON.stringify({ sessionCode: code })
            });
            const result = await res.json();
            alert(result.message);
        } catch (err) {
            console.error('Błąd awansowania użytkownika:', err);
        }
    });

    // === Logowanie do panelu ownera ===
    ownerLoginBtn.addEventListener('click', async () => {
        const code = ownerLoginInput.value;
        try {
            const res = await fetch('/api/owner/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionCode: code })
            });
            const result = await res.json();
            if (res.ok) {
                localStorage.setItem('ownerSessionCode', code);
                ownerLoginModal.style.display = 'none';
                ownerPanelModal.style.display = 'block';
            } else {
                alert(result.message);
            }
        } catch (err) {
            console.error('Błąd logowania ownera:', err);
        }
    });
});
