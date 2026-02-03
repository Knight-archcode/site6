// Global variables
let hotelData = {
    floors: {}
};
let currentFloor = null;
let editMode = null;
let tempMarkerPosition = null;
let selectedIcon = '🛏️';
let connectionStart = null;
let connectionStartMarker = null;
let dataVersion = 1;

// ========== MARKER POSITIONING FUNCTIONS ==========

// Handle floor plan click for adding markers
function handleFloorPlanClick(e) {
    if (!editMode || !currentFloor || editMode !== 'add') return;
    
    const container = document.getElementById('floorPlanContainer');
    
    // Get the container's bounding rectangle
    const containerRect = container.getBoundingClientRect();
    
    // Calculate scroll offsets (if user has scrolled)
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;
    
    // Calculate click position as percentage of container (0-100%)
    const x = ((e.clientX - containerRect.left + scrollLeft) / containerRect.width) * 100;
    const y = ((e.clientY - containerRect.top + scrollTop) / containerRect.height) * 100;
    
    console.log('Click position:', { x, y, clientX: e.clientX, clientY: e.clientY, 
        containerLeft: containerRect.left, containerTop: containerRect.top,
        scrollLeft, scrollTop, containerWidth: containerRect.width, containerHeight: containerRect.height });
    
    // Store position (0-100%)
    tempMarkerPosition = { x, y };
    
    // Show the modal
    document.getElementById('markerModal').classList.remove('hidden');
}

// Create marker
function createMarker() {
    const name = document.getElementById('markerName').value.trim();
    if (!name) {
        showNotification('Please enter a marker name', 'error');
        return;
    }
    
    if (!currentFloor) {
        showNotification('Please select a floor first', 'error');
        return;
    }
    
    if (!tempMarkerPosition) {
        showNotification('No position selected', 'error');
        return;
    }
    
    const marker = {
        id: Date.now().toString(),
        x: tempMarkerPosition.x,
        y: tempMarkerPosition.y,
        name: name,
        icon: selectedIcon
    };
    
    hotelData.floors[currentFloor].markers.push(marker);
    closeMarkerModal();
    loadFloorPlan();
    saveData();
    showNotification(`Marker "${name}" created successfully!`, 'success');
}

// Select icon in modal
function selectIcon(icon) {
    selectedIcon = icon;
    document.querySelectorAll('.icon-btn').forEach(btn => {
        btn.style.background = 'rgba(255, 255, 255, 0.1)';
    });
    event.target.style.background = 'rgba(79, 70, 229, 0.5)';
}

// Close marker modal
function closeMarkerModal(e) {
    if (!e || e.target === e.currentTarget) {
        document.getElementById('markerModal').classList.add('hidden');
        document.getElementById('markerName').value = '';
        selectedIcon = '🛏️';
        document.querySelectorAll('.icon-btn').forEach(btn => {
            btn.style.background = 'rgba(255, 255, 255, 0.1)';
        });
    }
}

// Delete marker
function deleteMarker(markerId) {
    if (!currentFloor) {
        showNotification('Please select a floor first', 'error');
        return;
    }
    
    const floor = hotelData.floors[currentFloor];
    const marker = floor.markers.find(m => m.id === markerId);
    
    if (!marker) {
        showNotification('Marker not found', 'error');
        return;
    }
    
    if (confirm(`Delete marker "${marker.name}"?`)) {
        floor.markers = floor.markers.filter(m => m.id !== markerId);
        floor.connections = floor.connections.filter(c => !c.includes(markerId));
        loadFloorPlan();
        saveData();
        showNotification(`Marker "${marker.name}" deleted`, 'success');
    }
}

// Handle marker click
function handleMarkerClick(markerId, e) {
    e.stopPropagation();
    
    if (!currentFloor) {
        showNotification('Please select a floor first', 'error');
        return;
    }
    
    if (editMode === 'delete') {
        deleteMarker(markerId);
    } else if (editMode === 'connect' || editMode === 'disconnect') {
        const floor = hotelData.floors[currentFloor];
        const marker = floor.markers.find(m => m.id === markerId);
        
        if (!marker) {
            showNotification('Marker not found', 'error');
            return;
        }
        
        if (!connectionStart) {
            // First marker selection
            connectionStart = markerId;
            connectionStartMarker = marker;
            
            // Highlight selected marker
            const markers = document.querySelectorAll('.marker');
            markers.forEach(m => {
                m.classList.remove('selected');
                m.classList.remove('selected-marker');
            });
            e.target.classList.add('selected');
            e.target.classList.add('selected-marker');
            
            document.getElementById('selectedMarkerName').textContent = `${marker.icon} ${marker.name}`;
            document.getElementById('connectionHint').textContent = editMode === 'connect' 
                ? `Selected: ${marker.name}. Now click second marker to connect.`
                : `Selected: ${marker.name}. Now click second marker to disconnect.`;
            
        } else {
            // Second marker selection - complete connection
            if (markerId === connectionStart) {
                showNotification('Cannot connect a marker to itself', 'error');
                return;
            }
            
            if (editMode === 'connect') {
                connectMarkers(connectionStart, markerId);
            } else {
                disconnectMarkers(connectionStart, markerId);
            }
            
            // Reset connection state
            connectionStart = null;
            connectionStartMarker = null;
            document.getElementById('selectedMarkerName').textContent = 'None';
            document.getElementById('connectionHint').textContent = '';
            
            // Clear selected styling
            const markers = document.querySelectorAll('.marker');
            markers.forEach(m => {
                m.classList.remove('selected');
                m.classList.remove('selected-marker');
            });
        }
    }
}

// Connect markers
function connectMarkers(id1, id2) {
    if (!currentFloor) {
        showNotification('Please select a floor first', 'error');
        return;
    }
    
    const floor = hotelData.floors[currentFloor];
    const exists = floor.connections.some(c => 
        (c[0] === id1 && c[1] === id2) || (c[0] === id2 && c[1] === id1)
    );
    
    if (exists) {
        showNotification('Markers are already connected', 'info');
        return;
    }
    
    floor.connections.push([id1, id2]);
    loadFloorPlan();
    saveData();
    
    const marker1 = floor.markers.find(m => m.id === id1);
    const marker2 = floor.markers.find(m => m.id === id2);
    showNotification(`Connected ${marker1.name} to ${marker2.name}`, 'success');
}

// Disconnect markers
function disconnectMarkers(id1, id2) {
    if (!currentFloor) {
        showNotification('Please select a floor first', 'error');
        return;
    }
    
    const floor = hotelData.floors[currentFloor];
    const initialLength = floor.connections.length;
    
    floor.connections = floor.connections.filter(c => 
        !((c[0] === id1 && c[1] === id2) || (c[0] === id2 && c[1] === id1))
    );
    
    if (floor.connections.length < initialLength) {
        loadFloorPlan();
        saveData();
        
        const marker1 = floor.markers.find(m => m.id === id1);
        const marker2 = floor.markers.find(m => m.id === id2);
        showNotification(`Disconnected ${marker1.name} from ${marker2.name}`, 'success');
    } else {
        showNotification('These markers are not connected', 'error');
    }
}

// Cancel connection
function cancelConnection() {
    connectionStart = null;
    connectionStartMarker = null;
    
    // Clear selected styling
    const markers = document.querySelectorAll('.marker');
    markers.forEach(m => {
        m.classList.remove('selected');
        m.classList.remove('selected-marker');
    });
    
    document.getElementById('selectedMarkerName').textContent = 'None';
    document.getElementById('connectionHint').textContent = '';
    setMode(editMode); // Reset mode
}

// Render markers on floor plan
function renderMarkers() {
    const container = document.getElementById('floorPlanContainer');
    const img = container.querySelector('img');
    if (!img) return;
    
    if (!currentFloor || !hotelData.floors[currentFloor]) return;
    
    const floor = hotelData.floors[currentFloor];
    
    // Clear existing markers
    const existingMarkers = container.querySelectorAll('.marker');
    existingMarkers.forEach(marker => marker.remove());
    
    console.log(`Rendering ${floor.markers.length} markers for floor ${currentFloor}`);
    
    floor.markers.forEach(marker => {
        const markerEl = document.createElement('div');
        markerEl.className = 'marker';
        
        // Position marker using percentages (0-100%)
        markerEl.style.left = `${marker.x}%`;
        markerEl.style.top = `${marker.y}%`;
        
        markerEl.innerHTML = marker.icon;
        markerEl.title = marker.name;
        markerEl.onclick = (e) => handleMarkerClick(marker.id, e);
        container.appendChild(markerEl);
        
        console.log(`Marker "${marker.name}" at ${marker.x}%, ${marker.y}%`);
    });
}

// Render connections
function renderConnections() {
    const container = document.getElementById('floorPlanContainer');
    const img = container.querySelector('img');
    if (!img) return;
    
    if (!currentFloor || !hotelData.floors[currentFloor]) return;
    
    const floor = hotelData.floors[currentFloor];
    
    // Clear existing connections
    const existingLines = container.querySelectorAll('.connection-line:not(.temp)');
    existingLines.forEach(line => line.remove());
    
    console.log(`Rendering ${floor.connections.length} connections for floor ${currentFloor}`);
    
    floor.connections.forEach(([id1, id2]) => {
        const marker1 = floor.markers.find(m => m.id === id1);
        const marker2 = floor.markers.find(m => m.id === id2);
        
        if (marker1 && marker2) {
            drawLine(container, marker1, marker2);
        }
    });
}

// Draw connection line
function drawLine(container, marker1, marker2, isTemp = false) {
    const line = document.createElement('div');
    line.className = 'connection-line';
    if (isTemp) line.classList.add('temp');
    
    // Calculate positions in container percentage
    const x1 = marker1.x;
    const y1 = marker1.y;
    const x2 = marker2.x;
    const y2 = marker2.y;
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    // Calculate distance between points (in percentage of container)
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate angle (in degrees)
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Position line at center of marker1
    line.style.position = 'absolute';
    line.style.left = `${x1}%`;
    line.style.top = `${y1}%`;
    line.style.width = `${distance}%`;
    line.style.transform = `rotate(${angle}deg)`;
    line.style.transformOrigin = '0 0';
    
    // Make sure line is visible
    line.style.zIndex = '5';
    line.style.opacity = '1';
    
    container.appendChild(line);
}

// ========== UTILITY FUNCTIONS ==========

// Update markers list
function updateMarkersList() {
    const list = document.getElementById('markersList');
    
    if (!currentFloor || !hotelData.floors[currentFloor]) {
        list.innerHTML = '<p class="text-gray-400 text-sm">No floor selected</p>';
        return;
    }
    
    const floor = hotelData.floors[currentFloor];
    
    if (!floor.markers.length) {
        list.innerHTML = '<p class="text-gray-400 text-sm">No markers yet</p>';
        return;
    }
    
    list.innerHTML = '';
    floor.markers.forEach(marker => {
        const item = document.createElement('div');
        item.className = 'sidebar-item p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer';
        item.onclick = () => {
            // Center view on marker
            const container = document.getElementById('floorPlanContainer');
            const img = container.querySelector('img');
            if (img) {
                const scrollLeft = (marker.x / 100 * img.offsetWidth) - (container.offsetWidth / 2);
                const scrollTop = (marker.y / 100 * img.offsetHeight) - (container.offsetHeight / 2);
                container.scrollTo({
                    left: Math.max(0, scrollLeft),
                    top: Math.max(0, scrollTop),
                    behavior: 'smooth'
                });
            }
        };
        item.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-2xl">${marker.icon}</span>
                <div class="flex-1">
                    <span class="text-white text-sm block">${marker.name}</span>
                    <span class="text-gray-400 text-xs">Position: ${marker.x.toFixed(1)}%, ${marker.y.toFixed(1)}%</span>
                </div>
            </div>
        `;
        list.appendChild(item);
    });
}

// Export data
function exportData() {
    try {
        const dataStr = JSON.stringify(hotelData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `hotel-hopper-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showNotification('Data exported successfully!', 'success');
    } catch (e) {
        console.log('Error exporting data:', e.message);
        showNotification('Error exporting data', 'error');
    }
}

// Import data
function importData() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Please select a file to import', 'error');
        return;
    }
    
    // Check file size (max 10MB for import)
    if (file.size > 10 * 1024 * 1024) {
        showNotification('File too large (max 10MB)', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validate the imported data structure
            if (!importedData.floors || typeof importedData.floors !== 'object') {
                showNotification('Invalid data format', 'error');
                return;
            }
            
            if (confirm('This will replace all current data. Are you sure?')) {
                hotelData = importedData;
                await saveData();
                updateFloorSelector();
                // Clear current floor selection
                currentFloor = null;
                document.getElementById('floorSelector').value = '';
                clearFloorPlan();
                showNotification('Data imported successfully!', 'success');
                fileInput.value = '';
            }
        } catch (e) {
            console.log('Error importing data:', e.message);
            showNotification('Error importing data. Invalid JSON format.', 'error');
        }
    };
    reader.onerror = function() {
        showNotification('Error reading file', 'error');
    };
    reader.readAsText(file);
}

// Copy data to clipboard
function copyDataToClipboard() {
    try {
        const dataStr = JSON.stringify(hotelData, null, 2);
        navigator.clipboard.writeText(dataStr).then(() => {
            showNotification('Data copied to clipboard!', 'success');
        }).catch(err => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = dataStr;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('Data copied to clipboard!', 'success');
        });
    } catch (e) {
        console.log('Error copying data:', e.message);
        showNotification('Error copying data', 'error');
    }
}

// Broadcast data update
function broadcastDataUpdate(data) {
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            const channel = new BroadcastChannel('hotel-hopper-data');
            channel.postMessage({
                type: 'data-update',
                data: data,
                version: dataVersion,
                timestamp: Date.now()
            });
        } catch (e) {
            console.log('BroadcastChannel error:', e.message);
        }
    }
}

// ========== FLOOR MANAGEMENT ==========

// Add new floor
function addFloor() {
    const name = document.getElementById('newFloorName').value.trim();
    if (!name) {
        showNotification('Please enter a floor name', 'error');
        return;
    }
    
    // Find the next available floor number
    let floorNum = 1;
    while (hotelData.floors[floorNum]) {
        floorNum++;
    }
    
    // Create new floor with proper structure
    hotelData.floors[floorNum] = {
        name: name,
        floorNumber: floorNum.toString(),
        floorPlanUrl: null,
        markers: [],
        connections: []
    };
    
    console.log(`Added floor ${floorNum}:`, name);
    
    document.getElementById('newFloorName').value = '';
    updateFloorSelector();
    saveData();
    showNotification(`Floor "${name}" added successfully!`, 'success');
    
    // Auto-select the new floor
    document.getElementById('floorSelector').value = floorNum;
    switchFloor();
}

// Delete current floor
function deleteCurrentFloor() {
    if (!currentFloor) {
        showNotification('Please select a floor to delete', 'error');
        return;
    }
    
    const floorName = hotelData.floors[currentFloor].name;
    if (confirm(`Delete "${floorName}" and all its markers/connections?`)) {
        delete hotelData.floors[currentFloor];
        currentFloor = null;
        updateFloorSelector();
        clearFloorPlan();
        saveData();
        showNotification(`Floor "${floorName}" deleted`, 'success');
    }
}

// Rename current floor
function renameCurrentFloor() {
    if (!currentFloor) {
        showNotification('Please select a floor to rename', 'error');
        return;
    }
    
    const oldName = hotelData.floors[currentFloor].name;
    const newName = prompt('Enter new floor name:', oldName);
    if (newName && newName.trim()) {
        hotelData.floors[currentFloor].name = newName.trim();
        updateFloorSelector();
        updateFloorIndicator();
        saveData();
        showNotification(`Floor renamed to "${newName}"`, 'success');
    }
}

// Update floor selector dropdown
function updateFloorSelector() {
    const selector = document.getElementById('floorSelector');
    const currentValue = selector.value;
    selector.innerHTML = '<option value="">Select Floor</option>';
    
    // Sort floors by floor number
    const floorNumbers = Object.keys(hotelData.floors).sort((a, b) => parseInt(a) - parseInt(b));
    
    floorNumbers.forEach(floorNum => {
        const floor = hotelData.floors[floorNum];
        const option = document.createElement('option');
        option.value = floorNum;
        option.textContent = `${floor.name} (Floor ${floorNum})`;
        selector.appendChild(option);
    });
    
    // Restore selection if possible
    if (currentFloor && hotelData.floors[currentFloor]) {
        selector.value = currentFloor;
    } else if (currentValue && hotelData.floors[currentValue]) {
        selector.value = currentValue;
    }
}

// Switch to selected floor
function switchFloor() {
    const selector = document.getElementById('floorSelector');
    currentFloor = selector.value;
    
    console.log('Switching to floor:', currentFloor);
    
    if (currentFloor && hotelData.floors[currentFloor]) {
        loadFloorPlan();
        updateFloorIndicator();
        updateStats();
        setMode(null);
    } else {
        clearFloorPlan();
        updateStats();
    }
}

function updateFloorIndicator() {
    const indicator = document.getElementById('floorIndicator');
    if (currentFloor && hotelData.floors[currentFloor]) {
        indicator.textContent = `Current: ${hotelData.floors[currentFloor].name}`;
    } else {
        indicator.textContent = '';
    }
}

// ========== FLOOR PLAN MANAGEMENT ==========

// Floor plan upload with compression
async function uploadFloorPlan() {
    if (!currentFloor) {
        showNotification('Please select a floor first', 'error');
        return;
    }
    
    const file = document.getElementById('floorPlanInput').files[0];
    if (!file) return;
    
    // Check file size (max 5MB for upload)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('File size too large (max 5MB). Please compress the image first.', 'error');
        return;
    }
    
    showNotification('Uploading and compressing image...', 'info');
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            // Store image directly
            hotelData.floors[currentFloor].floorPlanUrl = e.target.result;
            
            loadFloorPlan();
            await saveData();
            showNotification('Floor plan uploaded successfully!', 'success');
            
            // Clear file input
            document.getElementById('floorPlanInput').value = '';
        } catch (error) {
            console.log('Error processing image:', error.message);
            showNotification('Error processing image', 'error');
        }
    };
    reader.onerror = function() {
        showNotification('Error reading file', 'error');
    };
    reader.readAsDataURL(file);
}

function loadFloorPlan() {
    const container = document.getElementById('floorPlanContainer');
    container.innerHTML = '';
    
    if (!currentFloor || !hotelData.floors[currentFloor]) {
        container.innerHTML = '<p class="text-gray-500 text-center"><span class="text-4xl block mb-2">🗺️</span>Select a floor first</p>';
        return;
    }
    
    const floor = hotelData.floors[currentFloor];
    
    if (!floor.floorPlanUrl) {
        container.innerHTML = '<p class="text-gray-500 text-center"><span class="text-4xl block mb-2">🗺️</span>Upload a floor plan for this floor</p>';
        return;
    }
    
    const img = document.createElement('img');
    img.src = floor.floorPlanUrl;
    img.style.width = '100%'; // Make image fill container width
    img.style.height = 'auto';
    img.style.display = 'block';
    img.onclick = handleFloorPlanClick;
    
    // Render markers immediately
    container.appendChild(img);
    renderMarkers();
    renderConnections();
    updateMarkersList();
}

function clearFloorPlan() {
    const container = document.getElementById('floorPlanContainer');
    container.innerHTML = '<p class="text-gray-500 text-center"><span class="text-4xl block mb-2">🗺️</span>Select a floor and upload a floor plan</p>';
    document.getElementById('markersList').innerHTML = '<p class="text-gray-400 text-sm">No markers yet</p>';
    document.getElementById('connectionInfo').classList.add('hidden');
}

function clearCurrentMap() {
    if (!currentFloor) {
        showNotification('Please select a floor first', 'error');
        return;
    }
    
    if (confirm('Clear all markers and connections from this floor?')) {
        hotelData.floors[currentFloor].markers = [];
        hotelData.floors[currentFloor].connections = [];
        loadFloorPlan();
        saveData();
        showNotification('Map cleared successfully', 'success');
    }
}

// ========== EDIT MODE ==========

function setMode(mode) {
    editMode = mode;
    connectionStart = null;
    connectionStartMarker = null;
    
    // Clear any temporary lines
    const tempLines = document.querySelectorAll('.connection-line.temp');
    tempLines.forEach(line => line.remove());
    
    // Clear selected marker styling
    const markers = document.querySelectorAll('.marker.selected');
    markers.forEach(marker => {
        marker.classList.remove('selected');
        marker.classList.remove('selected-marker');
    });
    
    // Update button states
    document.querySelectorAll('.mode-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const modeText = {
        'add': 'Click on floor plan to add marker',
        'delete': 'Click on marker to delete it',
        'connect': 'Click first marker to connect, then click second marker',
        'disconnect': 'Click first marker to disconnect, then click second marker',
        null: 'No active mode - select a mode above'
    };
    
    const hintText = {
        'connect': 'First marker selected. Now click second marker to create connection.',
        'disconnect': 'First marker selected. Now click second marker to remove connection.'
    };
    
    document.getElementById('currentModeText').textContent = modeText[mode] || 'Select a mode';
    document.getElementById('connectionHint').textContent = hintText[mode] || '';
    
    // Show/hide connection info
    const connectionInfo = document.getElementById('connectionInfo');
    if (mode === 'connect' || mode === 'disconnect') {
        connectionInfo.classList.remove('hidden');
        document.getElementById('selectedMarkerName').textContent = 'None';
    } else {
        connectionInfo.classList.add('hidden');
    }
    
    if (mode) {
        document.getElementById('mode' + mode.charAt(0).toUpperCase() + mode.slice(1)).classList.add('active');
    } else {
        document.getElementById('modeNone').classList.add('active');
    }
}

// ========== STATISTICS & NOTIFICATIONS ==========

// Update statistics
function updateStats() {
    if (currentFloor && hotelData.floors[currentFloor]) {
        const floor = hotelData.floors[currentFloor];
        const markerCount = floor.markers.length;
        const connectionCount = floor.connections.length;
        
        document.getElementById('currentFloorStats').textContent = floor.name;
        document.getElementById('markerStats').textContent = `${markerCount} markers, ${connectionCount} connections`;
    } else {
        document.getElementById('currentFloorStats').textContent = 'No floor selected';
        document.getElementById('markerStats').textContent = '0 markers, 0 connections';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="flex items-center gap-3">
            <span class="text-xl">${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span class="text-gray-800 font-medium">${message}</span>
        </div>
    `;
    
    container.appendChild(notification);
    
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
    }, 5000);
}

// ========== AUTHENTICATION ==========

// Login functionality
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username === 'admin' && password === '1234') {
        sessionStorage.setItem('adminLoggedIn', 'true');
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        loadData();
        showNotification('Admin login successful!', 'success');
    } else {
        const errorDiv = document.getElementById('loginError');
        errorDiv.textContent = 'Invalid credentials';
        errorDiv.classList.remove('hidden');
        showNotification('Invalid login credentials', 'error');
    }
}

function logout() {
    sessionStorage.removeItem('adminLoggedIn');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
    document.getElementById('username').value = 'admin';
    document.getElementById('password').value = '1234';
    showNotification('Logged out successfully', 'info');
}

// Toggle export/import section
function toggleExportImport() {
    const container = document.getElementById('exportImportContainer');
    container.classList.toggle('open');
}

// ========== STORAGE MANAGEMENT ==========

// Load data from localStorage
async function loadData() {
    console.log('Loading hotel data...');
    const saved = localStorage.getItem('hotelHopperData');
    if (saved) {
        try {
            hotelData = JSON.parse(saved);
            console.log('Loaded data:', Object.keys(hotelData.floors).length, 'floors');
            
            updateStats();
        } catch (e) {
            console.log('Error loading data:', e.message);
            showNotification('Error loading saved data', 'error');
        }
    } else {
        console.log('No saved data found');
    }
    updateFloorSelector();
}

// Save data
async function saveData() {
    try {
        const dataString = JSON.stringify(hotelData);
        
        // Save to localStorage
        localStorage.setItem('hotelHopperData', dataString);
        
        // Also save to sessionStorage for redundancy
        try {
            sessionStorage.setItem('hotelHopperData', dataString);
        } catch (e) {
            console.log('Could not save to sessionStorage');
        }
        
        // Broadcast update
        broadcastDataUpdate(hotelData);
        
        showNotification('✅ Changes saved successfully!', 'success');
        updateStats();
        dataVersion++;
        
    } catch (e) {
        console.log('Error saving data:', e.message);
        if (e.name === 'QuotaExceededError') {
            showNotification('Storage full! Try optimizing images or clearing cache.', 'error');
        } else {
            showNotification('Error saving data', 'error');
        }
    }
}

// Optimize storage by compressing images
async function optimizeStorage() {
    showNotification('Optimizing storage...', 'info');
    showNotification('Storage optimization feature is not implemented in this version', 'warning');
}

// Clear image cache
async function clearImageCache() {
    if (confirm('Clear all floor plan images? This will keep markers and connections but remove images.')) {
        for (const floorNum in hotelData.floors) {
            hotelData.floors[floorNum].floorPlanUrl = null;
        }
        await saveData();
        showNotification('Image cache cleared', 'success');
        if (currentFloor) {
            loadFloorPlan();
        }
    }
}

// ========== INITIALIZATION ==========

// Initialize
window.onload = async function() {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        await loadData();
    }
    
    // Listen for BroadcastChannel messages
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            const channel = new BroadcastChannel('hotel-hopper-data');
            channel.onmessage = function(event) {
                if (event.data.type === 'data-update') {
                    hotelData = event.data.data;
                    if (currentFloor) {
                        loadFloorPlan();
                    }
                    updateFloorSelector();
                    updateStats();
                    showNotification('Data updated from another tab', 'info');
                }
            };
        } catch (e) {
            console.log('BroadcastChannel not available');
        }
    }
};
