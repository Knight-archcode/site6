let isLoggedIn = false;

document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('loginSection');
    const adminPanel = document.getElementById('adminPanel');
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginError = document.getElementById('loginError');

    // Floor controls
    const floorSelect = document.getElementById('floorSelect');
    const addFloorBtn = document.getElementById('addFloorBtn');
    const removeFloorBtn = document.getElementById('removeFloorBtn');
    const renameFloorBtn = document.getElementById('renameFloorBtn');
    const renameFloorSection = document.getElementById('renameFloorSection');
    const floorNameInput = document.getElementById('floorNameInput');
    const confirmRenameBtn = document.getElementById('confirmRenameBtn');
    const cancelRenameBtn = document.getElementById('cancelRenameBtn');
    const floorWarning = document.getElementById('floorWarning');

    const mapContainer = document.getElementById('mapContainer');
    const floorPlanImg = document.getElementById('floorPlanImg');
    const floorPlanUpload = document.getElementById('floorPlanUpload');
    const clearMapBtn = document.getElementById('clearMapBtn');
    const addModeBtn = document.getElementById('addModeBtn');
    const deleteModeBtn = document.getElementById('deleteModeBtn');
    const connectModeBtn = document.getElementById('connectModeBtn');
    const disconnectModeBtn = document.getElementById('disconnectModeBtn');
    const addMarkerForm = document.getElementById('addMarkerForm');
    const markerNameInput = document.getElementById('markerName');
    const iconPicker = document.getElementById('iconPicker');
    const confirmAddMarker = document.getElementById('confirmAddMarker');
    const markersList = document.getElementById('markersList');
    const saveDataBtn = document.getElementById('saveDataBtn');

    let currentMode = null;
    let pendingMarker = null;
    let selectedIcon = '🛏️';
    let firstSelectedMarker = null;

    // ✅ FIXED: PROPER DATA INITIALIZATION
    let hotelData = JSON.parse(localStorage.getItem('hotelData') || '{}');
    
    // Debug: Check what's in localStorage
    console.log('Initial hotelData:', hotelData);
    
    if (!hotelData.floors) {
        hotelData.floors = {};
        console.log('Created empty floors object');
    }

    // Ensure at least Floor 1 exists with proper structure
    if (Object.keys(hotelData.floors).length === 0) {
        console.log('Creating default floor 1');
        hotelData.floors['1'] = { 
            markers: [], 
            connections: [], 
            floorPlanUrl: '',
            name: 'Floor 1',
            floorNumber: '1'
        };
        saveData(); // Save immediately
    } else {
        // Verify each floor has the right structure
        Object.keys(hotelData.floors).forEach(floorNum => {
            if (!hotelData.floors[floorNum].markers) hotelData.floors[floorNum].markers = [];
            if (!hotelData.floors[floorNum].connections) hotelData.floors[floorNum].connections = [];
            if (!hotelData.floors[floorNum].name) hotelData.floors[floorNum].name = `Floor ${floorNum}`;
            if (!hotelData.floors[floorNum].floorNumber) hotelData.floors[floorNum].floorNumber = floorNum;
        });
    }

    let currentFloor = Object.keys(hotelData.floors)[0] || '1';
    console.log('Current floor:', currentFloor, 'Available floors:', Object.keys(hotelData.floors));

    // ✅ HELPER: Get or create floor data
    function getFloorData(floorNum) {
        if (!hotelData.floors[floorNum]) {
            console.log('Creating new floor:', floorNum);
            hotelData.floors[floorNum] = { 
                markers: [], 
                connections: [], 
                floorPlanUrl: '',
                name: `Floor ${floorNum}`,
                floorNumber: floorNum
            };
        }
        return hotelData.floors[floorNum];
    }

    // ✅ SAVE ALL DATA
    function saveData() {
        console.log('Saving data for floors:', Object.keys(hotelData.floors));
        localStorage.setItem('hotelData', JSON.stringify(hotelData));
    }

    // ✅ UPDATE FLOOR SELECTOR
    function updateFloorSelect() {
        console.log('Updating floor select');
        floorSelect.innerHTML = '';
        const floorNums = Object.keys(hotelData.floors).sort((a, b) => parseInt(a) - parseInt(b));
        console.log('Floor numbers:', floorNums);
        
        floorNums.forEach(floorNum => {
            const floorData = getFloorData(floorNum);
            const displayName = floorData.name || `Floor ${floorNum}`;
            const opt = document.createElement('option');
            opt.value = floorNum;
            opt.textContent = displayName;
            floorSelect.appendChild(opt);
        });
        floorSelect.value = currentFloor;
        removeFloorBtn.disabled = (floorNums.length <= 1);
        floorWarning.classList.toggle('hidden', floorNums.length > 1);
    }

    // ✅ FIXED: LOAD FLOOR - SEPARATE IMAGES FOR EACH FLOOR
    function loadFloor(floorNum) {
        console.log('Loading floor:', floorNum);
        currentFloor = floorNum;
        const floorData = getFloorData(currentFloor);
        
        console.log('Floor data for', floorNum, ':', {
            hasImage: !!floorData.floorPlanUrl,
            imageLength: floorData.floorPlanUrl ? floorData.floorPlanUrl.length : 0,
            imagePrefix: floorData.floorPlanUrl ? floorData.floorPlanUrl.substring(0, 50) + '...' : 'none'
        });

        // ✅ CRITICAL FIX: Clear and reload image properly
        floorPlanImg.src = '';
        floorPlanImg.style.display = 'none';
        
        // ✅ FIXED: Check for ANY valid image data
        if (floorData.floorPlanUrl && floorData.floorPlanUrl.length > 100) { // Basic check for valid data
            console.log('Setting image source for floor', floorNum);
            
            // Force a fresh load by adding cache-busting parameter
            const separator = floorData.floorPlanUrl.includes('?') ? '&' : '?';
            const timestamp = Date.now();
            const imageUrl = floorData.floorPlanUrl + separator + 't=' + timestamp;
            
            floorPlanImg.src = imageUrl;
            floorPlanImg.style.display = 'block';
            
            // Handle image loading
            floorPlanImg.onload = function() {
                console.log('Image loaded successfully for floor', floorNum);
                this.style.display = 'block';
            };
            
            floorPlanImg.onerror = function() {
                console.error('Failed to load image for floor', floorNum);
                this.style.display = 'none';
                this.src = '';
                // Try without cache busting
                if (floorData.floorPlanUrl) {
                    this.src = floorData.floorPlanUrl;
                }
            };
        } else {
            console.log('No valid image for floor', floorNum);
            floorPlanImg.style.display = 'none';
            floorPlanImg.src = '';
        }

        renderAll();
        updateMarkersList();
        updateFloorSelect();
    }

    updateFloorSelect();
    loadFloor(currentFloor);

    // Initialize icons
    const HOTEL_ICONS = ['🛏️', '🚪', '🍽️', '🏊', '💪', '🧼', '🛗', '🚻', '🧳', '☕', '🛎️', '🔒'];
    HOTEL_ICONS.forEach(icon => {
        const btn = document.createElement('button');
        btn.type = 'button'; // Prevent form submission
        btn.textContent = icon;
        btn.addEventListener('click', () => {
            selectedIcon = icon;
            iconPicker.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
        iconPicker.appendChild(btn);
    });
    iconPicker.querySelector('button')?.classList.add('selected');

    // === LOGIN ===
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('username').value.trim();
            const pass = document.getElementById('password').value.trim();

            if (user.toLowerCase() === 'admin' && pass === '1234') {
                isLoggedIn = true;
                loginSection.classList.add('hidden');
                adminPanel.classList.remove('hidden');
                loginError.classList.add('hidden');
                
                // Load saved data
                loadFloor(currentFloor);
            } else {
                loginError.classList.remove('hidden');
                loginSection.style.animation = 'shake 0.5s';
                setTimeout(() => loginSection.style.animation = '', 500);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            isLoggedIn = false;
            adminPanel.classList.add('hidden');
            loginSection.classList.remove('hidden');
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            loginError.classList.add('hidden');
        });
    }

    // === FLOOR MANAGEMENT ===
    floorSelect.addEventListener('change', () => {
        loadFloor(floorSelect.value);
    });

    addFloorBtn.addEventListener('click', () => {
        const floorNums = Object.keys(hotelData.floors).map(Number);
        const newFloor = (Math.max(...floorNums, 0) + 1).toString();
        console.log('Adding new floor:', newFloor);
        getFloorData(newFloor); // Initialize
        updateFloorSelect();
        loadFloor(newFloor);
        saveData();
    });

    removeFloorBtn.addEventListener('click', () => {
        if (Object.keys(hotelData.floors).length <= 1) return;
        if (confirm(`Delete Floor ${currentFloor}? This cannot be undone.`)) {
            console.log('Deleting floor:', currentFloor);
            delete hotelData.floors[currentFloor];
            const remainingFloors = Object.keys(hotelData.floors);
            currentFloor = remainingFloors.length > 0 ? remainingFloors[0] : '1';
            if (!hotelData.floors[currentFloor]) {
                hotelData.floors[currentFloor] = { 
                    markers: [], 
                    connections: [], 
                    floorPlanUrl: '', 
                    name: `Floor ${currentFloor}`,
                    floorNumber: currentFloor
                };
            }
            saveData();
            loadFloor(currentFloor);
        }
    });

    renameFloorBtn.addEventListener('click', () => {
        const floorData = getFloorData(currentFloor);
        floorNameInput.value = floorData.name || `Floor ${currentFloor}`;
        renameFloorSection.classList.remove('hidden');
    });

    cancelRenameBtn.addEventListener('click', () => {
        renameFloorSection.classList.add('hidden');
    });

    confirmRenameBtn.addEventListener('click', () => {
        const newName = floorNameInput.value.trim();
        if (newName) {
            getFloorData(currentFloor).name = newName;
            saveData();
            updateFloorSelect();
            renameFloorSection.classList.add('hidden');
        }
    });

    // === FILE UPLOAD - CRITICAL FIX ===
    floorPlanUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => {
                console.log('Uploading image for floor', currentFloor);
                // ✅ Save to CURRENT FLOOR only - each floor gets its own image
                const floorData = getFloorData(currentFloor);
                floorData.floorPlanUrl = reader.result;
                console.log('Image saved for floor', currentFloor, 'size:', reader.result.length);
                
                saveData();
                
                // Force reload of the floor
                loadFloor(currentFloor);
                
                // Clear the file input
                e.target.value = '';
            };
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                alert('Error reading image file');
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please select a valid image file (JPEG, PNG, etc.)');
        }
    });

    // === CLEAR MAP ===
    clearMapBtn.addEventListener('click', () => {
        if (confirm(`Clear entire map for ${getFloorData(currentFloor).name}? This cannot be undone.`)) {
            const floorData = getFloorData(currentFloor);
            floorData.floorPlanUrl = '';
            floorData.markers = [];
            floorData.connections = [];
            saveData();
            loadFloor(currentFloor);
        }
    });

    // === MODE BUTTONS ===
    function setActiveMode(mode) {
        currentMode = mode;
        
        // Reset all buttons
        addModeBtn.classList.remove('active');
        deleteModeBtn.classList.remove('active');
        connectModeBtn.classList.remove('active');
        disconnectModeBtn.classList.remove('active');
        
        // Highlight the active mode button
        switch(mode) {
            case 'add':
                addModeBtn.classList.add('active');
                break;
            case 'delete':
                deleteModeBtn.classList.add('active');
                break;
            case 'connect':
                connectModeBtn.classList.add('active');
                break;
            case 'disconnect':
                disconnectModeBtn.classList.add('active');
                break;
        }
        
        addMarkerForm.classList.toggle('hidden', mode !== 'add');
        clearSelection();
    }

    addModeBtn.addEventListener('click', () => setActiveMode('add'));
    deleteModeBtn.addEventListener('click', () => setActiveMode('delete'));
    connectModeBtn.addEventListener('click', () => setActiveMode('connect'));
    disconnectModeBtn.addEventListener('click', () => setActiveMode('disconnect'));

    // === MARKER HANDLING ===
    confirmAddMarker.addEventListener('click', () => {
        const name = markerNameInput.value.trim();
        if (name && pendingMarker) {
            const newId = Date.now().toString();
            getFloorData(currentFloor).markers.push({ 
                id: newId, 
                x: pendingMarker.x, 
                y: pendingMarker.y, 
                name, 
                icon: selectedIcon 
            });
            saveData();
            loadFloor(currentFloor);
            addMarkerForm.classList.add('hidden');
            markerNameInput.value = '';
            pendingMarker = null;
        }
    });

    saveDataBtn.addEventListener('click', () => {
        saveData();
        // Show notification instead of alert
        showNotification('✅ Floor data saved successfully!', 'success');
    });

    // Create notification function
    function showNotification(message, type = 'info') {
        // Create notification container if it doesn't exist
        let notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notificationContainer';
            document.body.appendChild(notificationContainer);
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-xl">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="text-gray-800 font-medium">${message}</span>
            </div>
        `;
        
        notificationContainer.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }

    mapContainer.addEventListener('click', handleMapClick);

    // === CLICK HANDLER ===
    function handleMapClick(e) {
        if (!floorPlanImg.src || floorPlanImg.style.display === 'none') {
            console.log('No image loaded, cannot place markers');
            return;
        }
        
        const rect = mapContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const floorData = getFloorData(currentFloor);
        let closest = null;
        let minDist = 30;
        for (const m of floorData.markers) {
            const dist = Math.hypot(m.x - x, m.y - y);
            if (dist < minDist) {
                minDist = dist;
                closest = m;
            }
        }

        if (currentMode === 'add') {
            console.log('Adding marker at position:', x, y);
            pendingMarker = { x, y };
            addMarkerForm.classList.remove('hidden');
        } else if (currentMode === 'delete' && closest) {
            const idToRemove = closest.id;
            floorData.markers = floorData.markers.filter(m => m.id !== idToRemove);
            floorData.connections = floorData.connections.filter(([a, b]) => a !== idToRemove && b !== idToRemove);
            saveData();
            loadFloor(currentFloor);
        } else if ((currentMode === 'connect' || currentMode === 'disconnect') && closest) {
            if (!firstSelectedMarker) {
                firstSelectedMarker = closest;
                highlightMarker(closest.id, true);
            } else {
                if (firstSelectedMarker.id === closest.id) {
                    highlightMarker(firstSelectedMarker.id, false);
                    firstSelectedMarker = null;
                    return;
                }

                const connIndex = floorData.connections.findIndex(([a, b]) =>
                    (a === firstSelectedMarker.id && b === closest.id) ||
                    (a === closest.id && b === firstSelectedMarker.id)
                );

                if (currentMode === 'connect' && connIndex === -1) {
                    floorData.connections.push([firstSelectedMarker.id, closest.id]);
                } else if (currentMode === 'disconnect' && connIndex !== -1) {
                    floorData.connections.splice(connIndex, 1);
                }

                highlightMarker(firstSelectedMarker.id, false);
                firstSelectedMarker = null;
                saveData();
                loadFloor(currentFloor);
            }
        }
    }

    function clearSelection() {
        if (firstSelectedMarker) {
            highlightMarker(firstSelectedMarker.id, false);
            firstSelectedMarker = null;
        }
    }

    function highlightMarker(id, highlight) {
        const el = document.querySelector(`.marker[data-id="${id}"]`);
        if (el) el.classList.toggle('selected', highlight);
    }

    // === RENDERING ===
    function renderAll() {
        console.log('Rendering floor', currentFloor);
        document.querySelectorAll('.marker, .connection').forEach(el => el.remove());
        const floorData = getFloorData(currentFloor);

        console.log('Markers to render:', floorData.markers.length);
        
        floorData.markers.forEach(marker => {
            const el = document.createElement('div');
            el.className = 'marker';
            el.dataset.id = marker.id;
            el.textContent = marker.icon;
            el.title = marker.name;
            el.style.left = `${marker.x}px`;
            el.style.top = `${marker.y}px`;
            mapContainer.appendChild(el);
            
            // Add click handler for markers
            el.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent map click event
                handleMarkerClick(marker.id, e);
            });
        });

        floorData.connections.forEach(([id1, id2]) => {
            const m1 = floorData.markers.find(m => m.id === id1);
            const m2 = floorData.markers.find(m => m.id === id2);
            if (m1 && m2) {
                const length = Math.sqrt((m2.x - m1.x) ** 2 + (m2.y - m1.y) ** 2);
                const angle = Math.atan2(m2.y - m1.y, m2.x - m1.x) * 180 / Math.PI;
                const div = document.createElement('div');
                div.className = 'connection-line'; // Changed from 'connection' to 'connection-line'
                div.style.width = `${length}px`;
                div.style.height = '4px';
                div.style.left = `${m1.x}px`;
                div.style.top = `${m1.y}px`;
                div.style.transform = `rotate(${angle}deg)`;
                div.style.transformOrigin = '0 0';
                div.style.position = 'absolute';
                div.style.zIndex = '5';
                mapContainer.appendChild(div);
            }
        });
    }

    // Handle marker click directly
    function handleMarkerClick(markerId, e) {
        const floorData = getFloorData(currentFloor);
        const marker = floorData.markers.find(m => m.id === markerId);
        
        if (!marker) return;
        
        if (currentMode === 'delete') {
            const idToRemove = marker.id;
            floorData.markers = floorData.markers.filter(m => m.id !== idToRemove);
            floorData.connections = floorData.connections.filter(([a, b]) => a !== idToRemove && b !== idToRemove);
            saveData();
            loadFloor(currentFloor);
        } else if ((currentMode === 'connect' || currentMode === 'disconnect')) {
            if (!firstSelectedMarker) {
                firstSelectedMarker = marker;
                highlightMarker(marker.id, true);
            } else {
                if (firstSelectedMarker.id === marker.id) {
                    highlightMarker(firstSelectedMarker.id, false);
                    firstSelectedMarker = null;
                    return;
                }

                const connIndex = floorData.connections.findIndex(([a, b]) =>
                    (a === firstSelectedMarker.id && b === marker.id) ||
                    (a === marker.id && b === firstSelectedMarker.id)
                );

                if (currentMode === 'connect' && connIndex === -1) {
                    floorData.connections.push([firstSelectedMarker.id, marker.id]);
                } else if (currentMode === 'disconnect' && connIndex !== -1) {
                    floorData.connections.splice(connIndex, 1);
                }

                highlightMarker(firstSelectedMarker.id, false);
                firstSelectedMarker = null;
                saveData();
                loadFloor(currentFloor);
            }
        }
    }

    function updateMarkersList() {
        markersList.innerHTML = '';
        const floorData = getFloorData(currentFloor);
        floorData.markers.forEach((m, i) => {
            const item = document.createElement('li');
            item.className = 'location-item';
            item.innerHTML = `
                <span class="flex items-center gap-2">
                    <span class="text-lg">${m.icon}</span>
                    <span>${m.name}</span>
                    <span class="text-xs text-gray-500">(${Math.round(m.x)}, ${Math.round(m.y)})</span>
                </span>
                <button data-index="${i}" class="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">Remove</button>`;
            markersList.appendChild(item);
        });
        markersList.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                const idToRemove = getFloorData(currentFloor).markers[idx].id;
                getFloorData(currentFloor).markers.splice(idx, 1);
                getFloorData(currentFloor).connections = getFloorData(currentFloor).connections.filter(([a, b]) => a !== idToRemove && b !== idToRemove);
                saveData();
                loadFloor(currentFloor);
            });
        });
    }

    // Check if user is already logged in
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        isLoggedIn = true;
        loginSection.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        loginError.classList.add('hidden');
        loadFloor(currentFloor);
    }
});
