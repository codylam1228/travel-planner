// Global variables
let map;
let geocoder;
let markers = [];
let markerLayer; // Layer group for markers
let currentDayId = null;
let selectedDayId = null; // Track which day is currently selected for map display
let editingItemId = null; // Track which item is being edited
let editingMode = false; // Track if we're in edit mode
let mapEditMode = false; // Track if we're in map edit mode (for dragging markers)
let travelPlan = {
    title: 'My Travel Plan',
    startDate: '',
    endDate: '',
    days: []
};

// LocationIQ API configuration
// API key is loaded from config.js file
let LOCATIONIQ_API_KEY = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for config.js to load if it exists, then initialize
    setTimeout(function() {
        // Initialize API key from config when available
        if (window.CONFIG && window.CONFIG.LOCATIONIQ_API_KEY) {
            LOCATIONIQ_API_KEY = window.CONFIG.LOCATIONIQ_API_KEY;
            console.log('LocationIQ API key loaded from config');

            // Check if the key is still the placeholder
            if (LOCATIONIQ_API_KEY === 'YOUR_LOCATIONIQ_API_KEY_HERE') {
                console.warn('Please replace the placeholder API key in config.js with your actual LocationIQ API key');
                LOCATIONIQ_API_KEY = null;
            }
        } else {
            // Silently fall back to OpenStreetMap geocoding when no API key is available
            // This is normal for GitHub Pages deployment where config.js is not included
            console.log('No LocationIQ API key configured. Using OpenStreetMap geocoding.');
        }
        
        initializeApp();
        initMap(); // Initialize map directly
        loadTravelPlan();
    }, 100); // Small delay to allow config.js to load
});

// Initialize Leaflet Map with OpenStreetMap
function initMap() {
    // Default location (New York City)
    const defaultLocation = [40.7128, -74.0060];
    
    // Initialize map with OpenStreetMap tiles
    map = L.map('map', {
        center: defaultLocation,
        zoom: 13,
        zoomControl: true,
        attributionControl: true
    });

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // Initialize marker layer group
    markerLayer = L.layerGroup().addTo(map);

    // Initialize geocoder (using Nominatim)
    geocoder = L.Control.Geocoder.nominatim();

    // Try to get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const userLocation = [position.coords.latitude, position.coords.longitude];
            map.setView(userLocation, 15);
        });
    }
    
    // Map controls
    document.getElementById('centerMapBtn').addEventListener('click', function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const userLocation = [position.coords.latitude, position.coords.longitude];
                map.setView(userLocation, 15);
            });
        }
    });

    // Traffic layer functionality (simplified for OpenStreetMap)
    let trafficVisible = false;
    document.getElementById('toggleTrafficBtn').addEventListener('click', function() {
        if (trafficVisible) {
            // Remove traffic overlay (if any custom implementation)
            trafficVisible = false;
            this.style.backgroundColor = 'white';
            this.style.color = '#667eea';
        } else {
            // Add traffic overlay (OpenStreetMap doesn't have built-in traffic, but we keep the UI)
            trafficVisible = true;
            this.style.backgroundColor = '#667eea';
            this.style.color = 'white';
            // Note: For real traffic data, you could integrate with other services
        }
    });

    // Edit mode toggle functionality
    document.getElementById('toggleEditModeBtn').addEventListener('click', function() {
        mapEditMode = !mapEditMode;

        if (mapEditMode) {
            // Enable edit mode
            this.style.backgroundColor = '#f59e0b';
            this.style.color = 'white';
            this.querySelector('i').className = 'fas fa-edit';
            this.title = 'Exit Edit Mode';

            // Show edit mode notification
            showEditModeNotification(true);

            // Update markers to be draggable
            updateMapMarkers();
        } else {
            // Disable edit mode
            this.style.backgroundColor = 'white';
            this.style.color = '#667eea';
            this.querySelector('i').className = 'fas fa-eye';
            this.title = 'Toggle Edit Mode';

            // Hide edit mode notification
            showEditModeNotification(false);

            // Update markers to be non-draggable
            updateMapMarkers();
        }
    });

    // Sidebar toggle functionality
    let sidebarVisible = true;
    document.getElementById('toggleSidebarBtn').addEventListener('click', function() {
        const sidebar = document.querySelector('.sidebar');
        const container = document.querySelector('.container');
        
        if (sidebarVisible) {
            sidebar.style.display = 'none';
            container.classList.add('sidebar-hidden');
            this.style.backgroundColor = '#667eea';
            this.style.color = 'white';
            this.querySelector('i').className = 'fas fa-times';
            this.title = 'Show Travel Plan';
            
            // Trigger map resize after sidebar is hidden
            setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                }
            }, 300);
        } else {
            sidebar.style.display = 'flex';
            container.classList.remove('sidebar-hidden');
            this.style.backgroundColor = 'white';
            this.style.color = '#667eea';
            this.querySelector('i').className = 'fas fa-bars';
            this.title = 'Toggle Travel Plan';
            
            // Trigger map resize after sidebar is shown
            setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                }
            }, 300);
        }
        
        sidebarVisible = !sidebarVisible;
    });

    console.log('Google Maps initialized successfully');
    
    // Prevent unwanted touch behaviors on mobile
    setupMobileTouchHandling();
}

// Setup mobile touch handling to prevent page zoom/scroll
function setupMobileTouchHandling() {
    // Prevent default touch behaviors on the body
    document.body.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault(); // Prevent pinch zoom
        }
    }, { passive: false });

    document.body.addEventListener('touchend', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault(); // Prevent pinch zoom
        }
    }, { passive: false });

    document.body.addEventListener('touchmove', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault(); // Prevent pinch zoom
        }
        // Allow single touch only on map and sidebar
        const target = e.target.closest('#map, .sidebar');
        if (!target) {
            e.preventDefault();
        }
    }, { passive: false });

    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            const target = event.target.closest('#map');
            if (!target) {
                event.preventDefault();
            }
        }
        lastTouchEnd = now;
    }, false);

    // Prevent pull-to-refresh on Safari
    let startY;
    document.addEventListener('touchstart', function(e) {
        startY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
        if (!e.target.closest('.sidebar')) {
            const y = e.touches[0].clientY;
            if (startY <= 10 && y > startY) {
                e.preventDefault();
            }
        }
    }, { passive: false });
}

// Initialize app event listeners
function initializeApp() {
    // Header buttons
    document.getElementById('newTripBtn').addEventListener('click', createNewTrip);
    
    // Sidebar buttons (addDayBtn removed - days now auto-generate from date range)
    const addDayBtn = document.getElementById('addDayBtn');
    if (addDayBtn) {
        addDayBtn.addEventListener('click', addNewDay);
    }
    document.getElementById('importBtn').addEventListener('click', openImportDialog);
    document.getElementById('exportBtn').addEventListener('click', exportTravelPlan);
    document.getElementById('clearBtn').addEventListener('click', clearAllData);
    
    // File input for importing
    document.getElementById('importFileInput').addEventListener('change', handleImportFile);
    
    // Date inputs with picker-only functionality
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    // Prevent manual typing but allow date picker
    [startDateInput, endDateInput].forEach(input => {
        // Prevent keyboard input except for Tab and arrow keys (for accessibility)
        input.addEventListener('keydown', function(e) {
            // Allow Tab, Shift+Tab, and arrow keys for navigation
            const allowedKeys = ['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape'];
            if (!allowedKeys.includes(e.key)) {
                e.preventDefault();
                return false;
            }
        });

        // Prevent text input but allow date picker interaction
        input.addEventListener('keypress', function(e) {
            e.preventDefault();
            return false;
        });

        // Prevent paste
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            return false;
        });

        // Open date picker on click
        input.addEventListener('click', function() {
            try {
                if (this.showPicker) {
                    this.showPicker();
                }
            } catch (e) {
                // Fallback for browsers that don't support showPicker()
                this.focus();
            }
        });

        // Handle date picker changes
        input.addEventListener('change', function() {
            // Set minimum date for end date to prevent selecting earlier dates
            if (this.id === 'startDate' && this.value) {
                endDateInput.min = this.value;
            }
            debouncedUpdateTravelDates();
        });
    });
    
    // Location modal events
    const locationModal = document.getElementById('locationModal');
    const locationCloseBtn = locationModal.querySelector('.close');
    const locationCancelBtn = document.getElementById('cancelLocationBtn');
    const locationForm = document.getElementById('locationForm');
    
    locationCloseBtn.addEventListener('click', () => locationModal.style.display = 'none');
    locationCancelBtn.addEventListener('click', () => locationModal.style.display = 'none');
    locationForm.addEventListener('submit', handleLocationSubmit);
    
    // Search location button
    document.getElementById('searchLocationBtn').addEventListener('click', searchLocationWithLocationIQ);
    
    // Auto-geocode when Google address field changes
    const googleAddressField = document.getElementById('googleAddress');
    if (googleAddressField) {
        googleAddressField.addEventListener('input', debounceGeocodeAddress);
        console.log('✅ Auto-geocoding listener attached to googleAddress field');
    } else {
        console.error('❌ Could not find googleAddress field');
    }
    
    // Clear coordinates button
    const clearCoordsBtn = document.getElementById('clearCoordinatesBtn');
    if (clearCoordsBtn) {
        clearCoordsBtn.addEventListener('click', clearCoordinates);
        console.log('✅ Clear coordinates listener attached');
    } else {
        console.error('❌ Could not find clearCoordinatesBtn');
    }
    
    // Manual update coordinates button
    const updateCoordsBtn = document.getElementById('updateCoordinatesBtn');
    if (updateCoordsBtn) {
        updateCoordsBtn.addEventListener('click', function() {
            const googleAddress = document.getElementById('googleAddress').value.trim();
            if (googleAddress) {
                console.log('🔴 Manual geocoding triggered for:', googleAddress);
                geocodeAddressQuietly(googleAddress);
            } else {
                alert('Please enter a Google Maps address first.');
            }
        });
        console.log('✅ Manual update coordinates listener attached');
    } else {
        console.error('❌ Could not find updateCoordinatesBtn');
    }
    
    // Note modal events
    const noteModal = document.getElementById('noteModal');
    const noteCloseBtn = noteModal.querySelector('.close');
    const noteCancelBtn = document.getElementById('cancelNoteBtn');
    const noteForm = document.getElementById('noteForm');
    
    noteCloseBtn.addEventListener('click', () => noteModal.style.display = 'none');
    noteCancelBtn.addEventListener('click', () => noteModal.style.display = 'none');
    noteForm.addEventListener('submit', handleNoteSubmit);
    
    // Travel modal events
    const travelModal = document.getElementById('travelModal');
    const travelCloseBtn = travelModal.querySelector('.close');
    const travelCancelBtn = document.getElementById('cancelTravelBtn');
    const travelForm = document.getElementById('travelForm');
    
    travelCloseBtn.addEventListener('click', () => travelModal.style.display = 'none');
    travelCancelBtn.addEventListener('click', () => travelModal.style.display = 'none');
    travelForm.addEventListener('submit', handleTravelSubmit);
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === locationModal) {
            locationModal.style.display = 'none';
        }
        if (event.target === noteModal) {
            noteModal.style.display = 'none';
        }
        if (event.target === travelModal) {
            travelModal.style.display = 'none';
        }
    });
}

// Create a new trip
function createNewTrip() {
    if (confirm('This will clear your current travel plan. Continue?')) {
        clearAllData();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('startDate').value = today;
        document.getElementById('endDate').value = today;
        autoGenerateDays(); // Auto-generate days based on the date range
    }
}

// Auto-generate days based on date range (no manual "Add Day" button)
function autoGenerateDays() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        // Clear days if dates are not set
        travelPlan.days = [];
        renderDays();
        return;
    }

    // Convert to ISO format for calculation
    const startDateISO = convertToISODate(startDate);
    const endDateISO = convertToISODate(endDate);

    if (!startDateISO || !endDateISO) {
        return;
    }

    const startDateObj = new Date(startDateISO);
    const endDateObj = new Date(endDateISO);

    if (endDateObj < startDateObj) {
        return; // Invalid date range
    }

    // Calculate number of days
    const maxDays = Math.floor((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

    // Preserve existing items and just update the structure
    const existingDaysMap = {};
    travelPlan.days.forEach(day => {
        existingDaysMap[day.number] = day;
    });

    // Generate new days array
    const newDays = [];
    for (let i = 0; i < maxDays; i++) {
        const dayDate = new Date(startDateISO);
        dayDate.setDate(dayDate.getDate() + i);
        const newDayDateStr = dayDate.toISOString().split('T')[0];
        const dayNumber = i + 1;

        // Preserve existing day if it exists
        if (existingDaysMap[dayNumber]) {
            existingDaysMap[dayNumber].date = newDayDateStr;
            newDays.push(existingDaysMap[dayNumber]);
        } else {
            const newDay = {
                id: 'day_' + Date.now() + '_' + i,
                number: dayNumber,
                date: newDayDateStr,
                items: []
            };
            newDays.push(newDay);
        }
    }

    travelPlan.days = newDays;
    renderDays();
    saveTravelPlan();
}

// Add a new day to the travel plan (kept for backward compatibility but no longer used)
function addNewDay() {
    // This function is no longer needed as days are auto-generated
    console.log('Days are now auto-generated based on date range');
}

// Render all days
function renderDays() {
    const daysList = document.getElementById('daysList');
    daysList.innerHTML = '';

    // Ensure days don't exceed date range before rendering
    cleanupExcessDays();

    travelPlan.days.forEach(day => {
        const dayCard = createDayCard(day);
        daysList.appendChild(dayCard);
    });

    // Add drag and drop event listeners
    setupDragAndDrop();

    // Update Add Day button state
    updateAddDayButtonState();

    updateMapMarkers();
}

// Get combined items (locations and notes) in their display order
function getCombinedItems(day) {
    if (!day.items) {
        // Migrate old data structure to new combined structure
        const items = [];
        
        // Add existing locations with type
        if (day.locations) {
            day.locations.forEach(location => {
                items.push({ ...location, type: 'location' });
            });
        }
        
        // Add existing notes with type
        if (day.notes) {
            day.notes.forEach(note => {
                items.push({ ...note, type: 'note' });
            });
        }
        
        // Store the combined items and remove old arrays
        day.items = items;
        delete day.locations;
        delete day.notes;
    }
    
    return day.items || [];
}

// Create a day card element
function createDayCard(day) {
    const isSelected = selectedDayId === day.id;
    const dayCard = document.createElement('div');
    dayCard.className = `day-card ${isSelected ? 'selected' : ''}`;
    dayCard.innerHTML = `
        <div class="day-header">
            <div>
                <div class="day-title">Day ${day.number}</div>
                <div class="day-date">${formatDate(day.date)}</div>
            </div>
            <div class="day-actions">
                <button class="control-btn day-view-btn ${isSelected ? 'active' : ''}" onclick="toggleDayView('${day.id}')" title="${isSelected ? 'Show All Days' : 'Show Only This Day'}">
                    <i class="fas ${isSelected ? 'fa-filter' : 'fa-layer-group'}"></i>
                </button>
                <button class="delete-location" onclick="deleteDay('${day.id}')" title="Delete Day">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="locations-list" id="locations_${day.id}">
            ${(() => {
                let itemsHtml = '';
                const items = getCombinedItems(day);
                const locationItems = items.filter(i => i.type === 'location');
                
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    
                    if (item.type === 'location') {
                        itemsHtml += createLocationHTML(item, day.id);
                        
                        // Add transport container AFTER each location (except the last one)
                        const currentLocIndex = locationItems.findIndex(l => l.id === item.id);
                        if (currentLocIndex < locationItems.length - 1) {
                            const travelId = 'travel_' + currentLocIndex;
                            const prevLocationId = locationItems[currentLocIndex]?.id;
                            const nextLocationId = locationItems[currentLocIndex + 1]?.id;
                            itemsHtml += createTransportContainer(day.id, travelId, currentLocIndex, prevLocationId, nextLocationId);
                        }
                    } else if (item.type === 'note') {
                        itemsHtml += createNoteHTML(item, day.id);
                    }
                }
                return itemsHtml;
            })()}
        </div>
        <div class="day-controls">
            <div class="add-location-btn" onclick="openLocationModal('${day.id}')">
                <i class="fas fa-map-marker-alt"></i> Add Location
            </div>
            <div class="add-note-btn" onclick="openNoteModal('${day.id}')">
                <i class="fas fa-sticky-note"></i> Add Note
            </div>
        </div>
    `;
    
    return dayCard;
}

// Generate smart Google Maps URL with fallback mechanism
function generateGoogleMapsUrl(item) {
    // Smart fallback logic for better Google Maps recognition
    let query;

    if (item.googleAddress && item.googleAddress.trim() && item.googleAddress.length > 10) {
        // Use specific address if available and detailed enough
        query = encodeURIComponent(item.googleAddress.trim());
        console.log(`🗺️ Using address for ${item.name}: ${item.googleAddress}`);
    } else if (item.name && isLikelyLandmark(item.name)) {
        // Use name if it looks like a landmark or well-known place
        query = encodeURIComponent(item.name.trim());
        console.log(`🏛️ Using landmark name for ${item.name}`);
    } else {
        // Fallback to coordinates for generic names or missing addresses
        query = `${item.lat},${item.lng}`;
        console.log(`📍 Using coordinates for ${item.name}: ${item.lat},${item.lng}`);
    }

    return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

// Check if a location name is likely a landmark or well-known place
function isLikelyLandmark(name) {
    if (!name || name.length < 3) return false;

    const landmarkKeywords = [
        'tower', 'temple', 'shrine', 'castle', 'palace', 'cathedral', 'church', 'mosque',
        'museum', 'gallery', 'park', 'garden', 'bridge', 'station', 'airport', 'port',
        'university', 'college', 'hospital', 'hotel', 'restaurant', 'cafe', 'mall',
        'center', 'centre', 'building', 'plaza', 'square', 'market', 'beach', 'mountain',
        'lake', 'river', 'island', 'zoo', 'aquarium', 'theater', 'theatre', 'stadium',
        'arena', 'library', 'embassy', 'consulate', 'monument', 'memorial'
    ];

    const nameLower = name.toLowerCase();

    // Check for landmark keywords
    const hasLandmarkKeyword = landmarkKeywords.some(keyword => nameLower.includes(keyword));

    // Check for proper nouns (capitalized words) - likely place names
    const words = name.split(' ');
    const hasProperNouns = words.some(word => word.length > 2 && word[0] === word[0].toUpperCase());

    // Check if it's not too generic
    const genericTerms = ['location', 'place', 'spot', 'area', 'point', 'here', 'there'];
    const isNotGeneric = !genericTerms.some(term => nameLower.includes(term));

    return (hasLandmarkKeyword || hasProperNouns) && isNotGeneric;
}

function timeToMinutes(hhmm) {
    if (!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return null;
    const [h, m] = hhmm.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
}

function minutesToTimeString(totalMinutes) {
    if (totalMinutes == null || Number.isNaN(totalMinutes)) return '';
    const mins = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMinutesToTimeString(hhmm, minutesToAdd) {
    const base = timeToMinutes(hhmm);
    const add = Number(minutesToAdd);
    if (base == null || Number.isNaN(add)) return '';
    return minutesToTimeString(base + add);
}

// Create location HTML with click functionality
function createLocationHTML(item, dayId) {
    const googleMapsUrl = generateGoogleMapsUrl(item);
    
    // Calculate duration within this activity (startTime to endTime)
    const startTime = item.startTime || item.time || '';
    const endTime = item.endTime || '';
    
    let activityDurationHtml = '';
    if (startTime && endTime) {
        const activityDuration = calculateDuration(startTime, endTime);
        activityDurationHtml = `<div class="activity-duration"><i class="fas fa-hourglass-end"></i> Duration: ${activityDuration}</div>`;
    }
    
    // NOTE: Per-activity transport has been removed (transport is now only between activities).
    
    // Build money display
    let moneyHtml = '';
    if (item.money && item.money > 0) {
        moneyHtml = `<div class="activity-money"><i class="fas fa-dollar-sign"></i> ${item.money} ${item.currency || 'USD'}</div>`;
    }

    const timeHtml = (startTime || endTime)
        ? `<div class="location-time"><i class="fas fa-clock"></i> ${startTime || '--:--'}${endTime ? ` - ${endTime}` : ''}</div>`
        : '';

    return `
        <div class="location-item clickable draggable"
             data-item-id="${item.id}"
             data-day-id="${dayId}"
             data-item-type="location"
             draggable="true">
            <div class="drag-handle" title="Drag to reorder">
                <i class="fas fa-grip-vertical"></i>
            </div>
            <div class="item-actions">
                <button class="edit-item" onclick="event.stopPropagation(); editLocation('${dayId}', '${item.id}')" title="Edit Location">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-location" onclick="event.stopPropagation(); deleteItem('${dayId}', '${item.id}')" title="Delete Location">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="location-content" onclick="event.stopPropagation(); focusLocationOnMap('${item.id}', ${item.lat}, ${item.lng})">
                <div class="location-name">${item.name}</div>
                ${item.googleAddress ? `<div class="location-address"><i class="fas fa-map-marker-alt"></i> ${item.googleAddress}</div>` : ''}
                ${timeHtml}
                ${activityDurationHtml}
                ${moneyHtml}
                ${item.notes ? `<div class="location-notes">${item.notes}</div>` : ''}
                ${item.googleAddress ? `
                    <div class="location-maps">
                        <a href="${googleMapsUrl}"
                           target="_blank"
                           onclick="event.stopPropagation()"
                           class="maps-link">
                            <i class="fas fa-directions"></i> Open in Google Maps
                        </a>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Create transport container with method and time selectors
function createTransportContainer(dayId, travelId, travelIndex, prevLocationId, nextLocationId) {
    const day = travelPlan.days.find(d => d.id === dayId);
    if (!day) return '';
    
    // Try to find existing travel data
    const existingTravel = day.items && day.items.find(item => item.type === 'travel' && item.id === travelId);
    const transport = existingTravel ? existingTravel.transport || '' : '';
    const mode = existingTravel?.mode || (existingTravel?.durationMinutes ? 'duration' : 'auto');
    const durationMinutes = existingTravel?.durationMinutes ?? '';

    // Auto travel time: previous activity endTime -> next activity startTime
    const prevLoc = prevLocationId ? getCombinedItems(day).find(i => i.type === 'location' && i.id === prevLocationId) : null;
    const nextLoc = nextLocationId ? getCombinedItems(day).find(i => i.type === 'location' && i.id === nextLocationId) : null;
    const prevEnd = prevLoc?.endTime || prevLoc?.time || '';
    const nextStart = nextLoc?.startTime || nextLoc?.time || '';
    const autoDiff = (prevEnd && nextStart) ? calculateDuration(prevEnd, nextStart) : '';
    const autoTimeHHMM = (prevEnd && nextStart) ? minutesToTimeString(timeToMinutes(prevEnd) == null || timeToMinutes(nextStart) == null ? null : (() => {
        // Use calculateDurationMinutes semantics (handles next-day)
        let startTotalMin = timeToMinutes(prevEnd);
        let endTotalMin = timeToMinutes(nextStart);
        if (startTotalMin == null || endTotalMin == null) return null;
        if (endTotalMin < startTotalMin) endTotalMin += 24 * 60;
        return endTotalMin - startTotalMin;
    })()) : '';
    
    const transportMap = {
        'walking': '🚶',
        'car': '🚗',
        'bus': '🚌',
        'train': '🚂',
        'subway': '🚇',
        'bicycle': '🚴',
        'airplane': '✈️',
        'ferry': '⛴️',
        'tram': '🚊',
        'coffee break': '☕'
    };
    
    const emoji = transport && transportMap[transport.toLowerCase()] ? transportMap[transport.toLowerCase()] : '➡️';
    
    return `
        <div class="transport-selector" data-travel-id="${travelId}" data-day-id="${dayId}">
            <div class="transport-row">
                <div class="transport-method-group">
                    <select class="transport-method" onchange="updateTransportMethod('${dayId}', '${travelId}', this.value)">
                        <option value="">Select method</option>
                        <option value="walking" ${transport === 'walking' ? 'selected' : ''}>🚶 Walking</option>
                        <option value="car" ${transport === 'car' ? 'selected' : ''}>🚗 Private Car</option>
                        <option value="bus" ${transport === 'bus' ? 'selected' : ''}>🚌 Bus</option>
                        <option value="train" ${transport === 'train' ? 'selected' : ''}>🚂 Train</option>
                        <option value="subway" ${transport === 'subway' ? 'selected' : ''}>🚇 Subway/Metro</option>
                        <option value="bicycle" ${transport === 'bicycle' ? 'selected' : ''}>🚴 Bicycle</option>
                        <option value="airplane" ${transport === 'airplane' ? 'selected' : ''}>✈️ Airplane</option>
                        <option value="ferry" ${transport === 'ferry' ? 'selected' : ''}>⛴️ Ferry</option>
                        <option value="tram" ${transport === 'tram' ? 'selected' : ''}>🚊 Tram</option>
                        <option value="coffee break" ${transport === 'coffee break' ? 'selected' : ''}>☕ Coffee Break</option>
                    </select>
                </div>
                <div class="travel-time-group">
                    <select class="travel-time-mode" onchange="updateTravelMode('${dayId}', '${travelId}', this.value)">
                        <option value="auto" ${mode === 'auto' ? 'selected' : ''}>Auto</option>
                        <option value="duration" ${mode === 'duration' ? 'selected' : ''}>Duration</option>
                    </select>
                    ${
                        mode === 'duration'
                            ? `<input type="number" class="travel-duration-input" min="0" step="1" placeholder="min" value="${durationMinutes}" onchange="updateTravelDurationMinutes('${dayId}', '${travelId}', this.value, '${prevLocationId}', '${nextLocationId}')">`
                            : `<input type="time" class="travel-time-input" value="${autoTimeHHMM}" disabled title="${autoDiff ? `Auto: ${autoDiff}` : 'Auto time requires prev end + next start'}">`
                    }
                </div>
                <div class="transport-delete">
                    <button class="delete-transport-btn" onclick="deleteTransport('${dayId}', '${travelId}')" title="Clear">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}


function createNoteHTML(item, dayId) {
    return `
        <div class="note-item draggable" 
             data-item-id="${item.id}"
             data-day-id="${dayId}"
             data-item-type="note"
             draggable="true">
            <div class="drag-handle" title="Drag to reorder">
                <i class="fas fa-grip-vertical"></i>
            </div>
            <div class="item-actions">
                <button class="edit-item" onclick="event.stopPropagation(); editNote('${dayId}', '${item.id}')" title="Edit Note">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-location" onclick="event.stopPropagation(); deleteItem('${dayId}', '${item.id}')" title="Delete Note">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="note-content">${item.content}</div>
            <div class="note-timestamp">${formatTimestamp(item.timestamp)}</div>
        </div>
    `;
}

// Create travel HTML
function createTravelHTML(item, dayId) {
    const transportMap = {
        'walking': '🚶',
        'car': '🚗',
        'bus': '🚌',
        'train': '🚂',
        'subway': '🚇',
        'bicycle': '🚴',
        'airplane': '✈️',
        'ferry': '⛴️',
        'tram': '🚊',
        'coffee break': '☕'
    };
    const emoji = item.transport && transportMap[item.transport.toLowerCase()] ? transportMap[item.transport.toLowerCase()] : '➡️';
    
    return `
        <div class="travel-item" 
             data-item-id="${item.id}"
             data-day-id="${dayId}"
             data-item-type="travel">
            <div class="item-actions">
                <button class="edit-item" onclick="event.stopPropagation(); editTravel('${dayId}', '${item.id}')" title="Edit Travel">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-location" onclick="event.stopPropagation(); deleteItem('${dayId}', '${item.id}')" title="Delete Travel">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="travel-content" onclick="event.stopPropagation(); editTravel('${dayId}', '${item.id}')">
                <div class="travel-connector">
                    <span class="travel-emoji">${emoji}</span>
                    ${item.time ? `<span class="travel-time"><i class="fas fa-clock"></i> ${item.time}</span>` : '<span class="travel-placeholder">Click to set travel details</span>'}
                </div>
            </div>
        </div>
    `;
}

// Open location modal
function openLocationModal(dayId) {
    console.log('Opening location modal for day:', dayId);
    currentDayId = dayId;
    editingMode = false;
    editingItemId = null;
    const modal = document.getElementById('locationModal');
    if (modal) {
        // Update modal title for create mode
        modal.querySelector('h3').textContent = 'Add Location';
        modal.querySelector('button[type="submit"]').textContent = 'Add Location';
        modal.style.display = 'block';
        document.getElementById('locationForm').reset();
        document.getElementById('locationStartTime').value = '';
        document.getElementById('locationEndTime').value = '';
        
        // Reset money and currency fields
        document.getElementById('locationMoney').value = '';
        document.getElementById('locationCurrency').value = 'USD';
        
        // Hide coordinates section for new locations
        document.querySelector('.coordinates-group').style.display = 'none';
        document.getElementById('locationLat').value = '';
        document.getElementById('locationLng').value = '';
    } else {
        console.error('Location modal not found!');
        alert('Error: Location modal not found. Please refresh the page.');
    }
}

// Edit location function
function editLocation(dayId, itemId) {
    console.log('Editing location:', dayId, itemId);
    const day = travelPlan.days.find(d => d.id === dayId);
    if (!day) return;
    
    const item = getCombinedItems(day).find(item => item.id === itemId && item.type === 'location');
    if (!item) return;
    
    // Set edit mode
    currentDayId = dayId;
    editingMode = true;
    editingItemId = itemId;
    
    const modal = document.getElementById('locationModal');
    if (modal) {
        // Update modal title for edit mode
        modal.querySelector('h3').textContent = 'Edit Location';
        modal.querySelector('button[type="submit"]').textContent = 'Save Changes';
        
        // Populate form with existing data
        document.getElementById('locationName').value = item.name || '';
        document.getElementById('googleAddress').value = item.googleAddress || '';
        document.getElementById('locationStartTime').value = item.startTime || item.time || '';
        document.getElementById('locationEndTime').value = item.endTime || '';
        document.getElementById('locationNotes').value = item.notes || '';
        document.getElementById('locationMoney').value = item.money || '';
        document.getElementById('locationCurrency').value = item.currency || 'USD';
        
        // Show coordinates if available
        if (item.lat && item.lng) {
            document.getElementById('locationLat').value = item.lat;
            document.getElementById('locationLng').value = item.lng;
            document.querySelector('.coordinates-group').style.display = 'block';
        }
        
        modal.style.display = 'block';
    }
}

// Handle location form submission
function handleLocationSubmit(e) {
    e.preventDefault();
    console.log('Location form submitted');
    
    const name = document.getElementById('locationName').value;
    const googleAddress = document.getElementById('googleAddress').value;
    const startTime = document.getElementById('locationStartTime').value;
    const endTime = document.getElementById('locationEndTime').value;
    const notes = document.getElementById('locationNotes').value;
    const money = parseFloat(document.getElementById('locationMoney').value) || 0;
    const currency = document.getElementById('locationCurrency').value;
        
    console.log('Form data:', { name, googleAddress, startTime, endTime, notes, money, currency, currentDayId, editingMode });
    
    // Validate required fields
    if (!name) {
        alert('Please fill in the location name.');
        return;
    }
    
    // Check if geocoder is available
    if (!geocoder) {
        alert('Map is still loading. Please wait a moment and try again.');
        return;
    }
    
    if (editingMode && editingItemId) {
        // Edit existing location
        const day = travelPlan.days.find(d => d.id === currentDayId);
        if (day) {
            const item = getCombinedItems(day).find(item => item.id === editingItemId);
            if (item) {
                // Check if we have coordinates from Google search
                const lat = parseFloat(document.getElementById('locationLat').value);
                const lng = parseFloat(document.getElementById('locationLng').value);
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    // Use Google coordinates
                    item.name = name;
                    item.googleAddress = googleAddress;
                    item.startTime = startTime;
                    item.endTime = endTime;
                    delete item.time;
                    item.notes = notes;
                    item.money = money > 0 ? money : 0;
                    item.currency = currency;
                    item.lat = lat;
                    item.lng = lng;
                    
                    renderDays();
                    saveTravelPlan();
                    document.getElementById('locationModal').style.display = 'none';
                    editingMode = false;
                    editingItemId = null;
                } else if (item.name !== name) {
                    // Fall back to OpenStreetMap geocoding if name changed
                    geocoder.geocode(name, function(results) {
                        if (results && results.length > 0) {
                            item.name = name;
                            item.googleAddress = googleAddress;
                            item.startTime = startTime;
                            item.endTime = endTime;
                            delete item.time;
                            item.notes = notes;
                            item.money = money > 0 ? money : 0;
                            item.currency = currency;
                            item.lat = results[0].center.lat;
                            item.lng = results[0].center.lng;
                            
                            renderDays();
                            saveTravelPlan();
                            document.getElementById('locationModal').style.display = 'none';
                            editingMode = false;
                            editingItemId = null;
                        } else {
                            alert('Could not find the location. Please try using the search button for better results.');
                        }
                    });
                } else {
                    // Name unchanged, just update other fields
                    item.name = name;
                    item.googleAddress = googleAddress;
                    item.startTime = startTime;
                    item.endTime = endTime;
                    delete item.time;
                    item.notes = notes;
                    item.money = money > 0 ? money : 0;
                    item.currency = currency;
                    
                    renderDays();
                    saveTravelPlan();
                    document.getElementById('locationModal').style.display = 'none';
                    editingMode = false;
                    editingItemId = null;
                }
            }
        }
    } else {
        // Create new location
        const lat = parseFloat(document.getElementById('locationLat').value);
        const lng = parseFloat(document.getElementById('locationLng').value);
        
        if (!isNaN(lat) && !isNaN(lng)) {
            // Use Google coordinates
            const location = {
                id: 'loc_' + Date.now(),
                name: name,
                googleAddress: googleAddress,
                startTime: startTime,
                endTime: endTime,
                notes: notes,
                money: money > 0 ? money : 0,
                currency: currency,
                lat: lat,
                lng: lng
            };
            
            console.log('Adding location with Google coordinates:', location);
            addLocationToDay(currentDayId, location);
            document.getElementById('locationModal').style.display = 'none';
        } else {
            // Fall back to OpenStreetMap geocoding
            geocoder.geocode(name, function(results) {
                console.log('Geocoding result:', results);
                if (results && results.length > 0) {
                    const location = {
                        id: 'loc_' + Date.now(),
                        name: name,
                        googleAddress: googleAddress,
                        startTime: startTime,
                        endTime: endTime,
                        notes: notes,
                        money: money > 0 ? money : 0,
                        currency: currency,
                        lat: results[0].center.lat,
                        lng: results[0].center.lng
                    };
                    
                    console.log('Adding location:', location);
                    addLocationToDay(currentDayId, location);
                    document.getElementById('locationModal').style.display = 'none';
                } else {
                    alert('Could not find the location. Please try using the search button for better results.');
                }
            });
        }
    }
}

// Add location to a specific day
function addLocationToDay(dayId, location) {
    console.log('Adding location to day:', dayId, location);
    const day = travelPlan.days.find(d => d.id === dayId);
    if (day) {
        // Ensure day has items array
        if (!day.items) {
            day.items = [];
        }
        
        // Check if need to insert travel before new location
        if (day.items.length > 0 && day.items[day.items.length - 1].type === 'location') {
            const travelItem = {
                id: generateId(),
                type: 'travel',
                transport: '',
                time: ''
            };
            day.items.push(travelItem);
        }
        
        // Add type to location
        const locationWithType = { ...location, type: 'location' };
        day.items.push(locationWithType);
        
        console.log('Location added successfully. Day now has', day.items.length, 'items');
        renderDays();
        saveTravelPlan();
    } else {
        console.error('Day not found:', dayId);
        alert('Error: Could not find the day to add location to.');
    }
}

// Focus on a specific location on the map
function focusLocationOnMap(locationId, lat, lng) {
    const position = [lat, lng];
    map.setView(position, 16);
    
    // Find and trigger the marker's popup
    const marker = markers.find(m => m.locationId === locationId);
    if (marker && marker.getPopup()) {
        marker.openPopup();
    }
}

// Toggle day view (show only selected day or all days)
function toggleDayView(dayId) {
    if (selectedDayId === dayId) {
        selectedDayId = null; // Show all days
    } else {
        selectedDayId = dayId; // Show only this day
    }
    renderDays();
    updateMapMarkers();
}

// Open note modal
function openNoteModal(dayId) {
    currentDayId = dayId;
    editingMode = false;
    editingItemId = null;
    const modal = document.getElementById('noteModal');
    if (modal) {
        // Update modal title for create mode
        modal.querySelector('h3').textContent = 'Add Note';
        modal.querySelector('button[type="submit"]').textContent = 'Add Note';
        modal.style.display = 'block';
        document.getElementById('noteForm').reset();
    }
}

// Edit note function
function editNote(dayId, itemId) {
    console.log('Editing note:', dayId, itemId);
    const day = travelPlan.days.find(d => d.id === dayId);
    if (!day) return;
    
    const item = getCombinedItems(day).find(item => item.id === itemId && item.type === 'note');
    if (!item) return;
    
    // Set edit mode
    currentDayId = dayId;
    editingMode = true;
    editingItemId = itemId;
    
    const modal = document.getElementById('noteModal');
    if (modal) {
        // Update modal title for edit mode
        modal.querySelector('h3').textContent = 'Edit Note';
        modal.querySelector('button[type="submit"]').textContent = 'Save Changes';
        
        // Populate form with existing data
        document.getElementById('noteContent').value = item.content || '';
        
        modal.style.display = 'block';
    }
}

// Handle note form submission
function handleNoteSubmit(e) {
    e.preventDefault();
    
    const content = document.getElementById('noteContent').value;
    
    if (!content.trim()) {
        alert('Please enter some content for the note.');
        return;
    }
    
    if (editingMode && editingItemId) {
        // Edit existing note
        const day = travelPlan.days.find(d => d.id === currentDayId);
        if (day) {
            const item = getCombinedItems(day).find(item => item.id === editingItemId);
            if (item) {
                item.content = content;
                // Keep original timestamp, but could add an "edited" timestamp if desired
                
                renderDays();
                saveTravelPlan();
                document.getElementById('noteModal').style.display = 'none';
                editingMode = false;
                editingItemId = null;
            }
        }
    } else {
        // Create new note
        const note = {
            id: 'note_' + Date.now(),
            content: content,
            timestamp: new Date().toISOString()
        };
        
        addNoteToDay(currentDayId, note);
        document.getElementById('noteModal').style.display = 'none';
    }
}

// Edit travel function
function editTravel(dayId, itemId) {
    console.log('Editing travel:', dayId, itemId);
    const day = travelPlan.days.find(d => d.id === dayId);
    if (!day) return;
    
    const item = getCombinedItems(day).find(item => item.id === itemId && item.type === 'travel');
    if (!item) return;
    
    // Set edit mode
    currentDayId = dayId;
    editingMode = true;
    editingItemId = itemId;
    
    const modal = document.getElementById('travelModal');
    if (modal) {
        // Update modal title for edit mode
        modal.querySelector('h3').textContent = 'Edit Travel';
        modal.querySelector('button[type="submit"]').textContent = 'Save Changes';
        
        // Populate form with existing data
        document.getElementById('travelTransport').value = item.transport || '';
        document.getElementById('travelTime').value = item.time || '';
        
        modal.style.display = 'block';
    }
}

// Handle travel form submission
function handleTravelSubmit(e) {
    e.preventDefault();
    
    const transport = document.getElementById('travelTransport').value;
    const time = document.getElementById('travelTime').value;
    
    if (editingMode && editingItemId) {
        // Edit existing travel
        const day = travelPlan.days.find(d => d.id === currentDayId);
        if (day) {
            const item = getCombinedItems(day).find(item => item.id === editingItemId);
            if (item) {
                item.transport = transport;
                item.time = time;
                
                renderDays();
                saveTravelPlan();
                document.getElementById('travelModal').style.display = 'none';
                editingMode = false;
                editingItemId = null;
            }
        }
    }
}

// Add note to a specific day
function addNoteToDay(dayId, note) {
    const day = travelPlan.days.find(d => d.id === dayId);
    if (day) {
        // Ensure day has items array
        if (!day.items) {
            day.items = [];
        }
        
        // Add type to note
        const noteWithType = { ...note, type: 'note' };
        day.items.push(noteWithType);
        
        renderDays();
        saveTravelPlan();
    }
}

// Unified delete function for both locations and notes
function deleteItem(dayId, itemId) {
    const day = travelPlan.days.find(d => d.id === dayId);
    if (day) {
        // Handle new structure
        if (day.items) {
            day.items = day.items.filter(item => item.id !== itemId);
        } else {
            // Handle old structure for backward compatibility
            if (day.locations) {
                day.locations = day.locations.filter(loc => loc.id !== itemId);
            }
            if (day.notes) {
                day.notes = day.notes.filter(note => note.id !== itemId);
            }
        }
        renderDays();
        saveTravelPlan();
    }
}

// Keep old functions for backward compatibility
function deleteNote(dayId, noteId) {
    deleteItem(dayId, noteId);
}

function deleteLocation(dayId, locationId) {
    deleteItem(dayId, locationId);
}

// Delete a day
function deleteDay(dayId) {
    if (confirm('Delete this day and all its locations?')) {
        travelPlan.days = travelPlan.days.filter(d => d.id !== dayId);
        // Renumber days
        travelPlan.days.forEach((day, index) => {
            day.number = index + 1;
        });
        renderDays();
        saveTravelPlan();

        // Update Add Day button state after deletion
        updateAddDayButtonState();
    }
}

// Update map markers with day filtering
function updateMapMarkers() {
    // Clear existing markers
    markerLayer.clearLayers();
    markers = [];
    
    const bounds = [];
    let hasLocations = false;
    let globalActivityNumber = 0; // Counter for all activities across all days
    
    // Filter days based on selection
    const daysToShow = selectedDayId ? 
        travelPlan.days.filter(day => day.id === selectedDayId) : 
        travelPlan.days;
    
    // Add markers for each location
    daysToShow.forEach((day, dayIndexInView) => {
        const originalDayIndex = travelPlan.days.findIndex(d => d.id === day.id);
        const items = getCombinedItems(day);
        const locations = items.filter(item => item.type === 'location');
        
        locations.forEach((location, locationIndex) => {
            // Calculate global activity number
            let activityNum = globalActivityNumber + locationIndex + 1;
            
            // Update global counter after processing all items in day
            if (locationIndex === locations.length - 1) {
                globalActivityNumber += locations.length;
            }
            
            // Create custom marker icon with activity number
            const dayColor = getColorForDay(originalDayIndex);
            const markerHtml = `
                <div style="
                    background-color: ${dayColor};
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 3px solid white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 14px;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                ">${activityNum}</div>
            `;
            
            const customIcon = L.divIcon({
                html: markerHtml,
                className: 'custom-marker',
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -20]
            });
            
            const marker = L.marker([location.lat, location.lng], {
                icon: customIcon,
                title: location.name,
                draggable: mapEditMode // Make draggable only in edit mode
            });

            // Store location ID for reference
            marker.locationId = location.id;

            // Add drag event handlers for edit mode
            if (mapEditMode) {
                marker.on('dragend', function(e) {
                    const newLatLng = e.target.getLatLng();
                    updateLocationCoordinates(location.id, newLatLng.lat, newLatLng.lng);
                });

                // Change cursor to indicate draggable
                marker.on('mouseover', function() {
                    map.getContainer().style.cursor = 'move';
                });

                marker.on('mouseout', function() {
                    map.getContainer().style.cursor = '';
                });
            }

            // Popup content with navigation
            // Use smart Google Maps navigation with fallback mechanism
            const navigationUrl = generateGoogleMapsUrl(location);
            const popupContent = `
                <div style="max-width: 200px;">
                    <h4 style="margin: 0 0 5px 0; color: #333;">Activity ${activityNum}: ${location.name}</h4>
                    ${location.googleAddress ?
                        `<p style="margin: 0 0 5px 0; color: #667eea; font-size: 0.8em;"><i class="fas fa-map-marker-alt"></i> Address: ${location.googleAddress}</p>` :
                        ''
                    }
                    ${(location.startTime || location.endTime || location.time) ? `<p style="margin: 0 0 5px 0; color: #667eea; font-size: 0.85em;"><i class="fas fa-clock"></i> ${(location.startTime || location.time || '--:--')}${location.endTime ? ` - ${location.endTime}` : ''}</p>` : ''}
                    ${location.notes ? `<p style="margin: 0 0 8px 0; color: #666; font-size: 0.85em; font-style: italic;">${location.notes}</p>` : ''}
                    <div style="text-align: center; margin-top: 8px;">
                        <a href="${navigationUrl}" target="_blank" style="
                            background: #4285f4;
                            color: white;
                            padding: 6px 12px;
                            border-radius: 4px;
                            text-decoration: none;
                            font-size: 0.8em;
                            display: inline-block;
                            font-weight: 500;
                        ">
                            <i class="fas fa-directions"></i> Open in Google Maps
                        </a>
                    </div>
                </div>
            `;
            
            marker.bindPopup(popupContent);
            marker.addTo(markerLayer);
            markers.push(marker);
            bounds.push([location.lat, location.lng]);
            hasLocations = true;
        });
    });
    
    // Fit map to show all markers
    if (hasLocations) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds(), { padding: [20, 20] });
        if (map.getZoom() > 15) {
            map.setZoom(15);
        }
    }
    
    // Note: Route drawing has been removed to reduce map clutter
    // drawDailyRoutes();
}

// Calculate duration between two times (HH:MM format)
function calculateDuration(startTime, endTime) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let startTotalMin = startHour * 60 + startMin;
    let endTotalMin = endHour * 60 + endMin;
    
    // If end time is earlier, assume it's the next day
    if (endTotalMin < startTotalMin) {
        endTotalMin += 24 * 60;
    }
    
    const diffMin = endTotalMin - startTotalMin;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    
    // Format: "0hrs, 45mins" or "2hrs, 30mins"
    if (hours === 0) {
        return `${mins}mins`;
    } else if (mins === 0) {
        return `${hours}hrs`;
    } else {
        return `${hours}hrs, ${mins}mins`;
    }
}

// Get color for day markers
function getColorForDay(dayIndex) {
    const colors = ['#667eea', '#764ba2', '#ff6b6b', '#ffd93d', '#43a047', '#00bcd4', '#ff9800', '#9c27b0', '#e91e63', '#3f51b5'];
    return colors[dayIndex % colors.length];
}


// Convert date to ISO format (HTML date inputs use YYYY-MM-DD internally)
function convertToISODate(dateStr) {
    if (!dateStr) return '';

    // HTML date inputs already provide YYYY-MM-DD format
    const yyyymmddPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (yyyymmddPattern.test(dateStr)) {
        return dateStr;
    }

    // Handle DD-MM-YYYY or DD/MM/YYYY format (for backward compatibility)
    const ddmmyyyyPattern = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/;
    const match = dateStr.match(ddmmyyyyPattern);

    if (match) {
        const [, day, month, year] = match;
        // Pad day and month with leading zeros if needed
        const paddedDay = day.padStart(2, '0');
        const paddedMonth = month.padStart(2, '0');
        return `${year}-${paddedMonth}-${paddedDay}`;
    }

    return ''; // Invalid format
}

// Convert YYYY-MM-DD to DD/MM/YYYY format for display (when needed)
function convertToDisplayDate(isoDateStr) {
    if (!isoDateStr) return '';

    const yyyymmddPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = isoDateStr.match(yyyymmddPattern);

    if (match) {
        const [, year, month, day] = match;
        // Remove leading zeros and format as DD/MM/YYYY
        const displayDay = parseInt(day, 10);
        const displayMonth = parseInt(month, 10);
        return `${displayDay}/${displayMonth}/${year}`;
    }

    return isoDateStr; // Return as is if not in expected format
}

// Check if a date string is valid and complete
function isValidDateString(dateStr) {
    if (!dateStr) return false;

    // Convert to ISO format for validation
    const isoDate = convertToISODate(dateStr);
    if (!isoDate) return false;

    // Validate the converted date
    const date = new Date(isoDate);
    return date instanceof Date && !isNaN(date) && isoDate === date.toISOString().split('T')[0];
}

// Debounced version of updateTravelDates to avoid premature validation
let dateUpdateTimer = null;
function debouncedUpdateTravelDates() {
    // Clear previous timer
    if (dateUpdateTimer) {
        clearTimeout(dateUpdateTimer);
    }

    // Set new timer - wait 500ms after user stops typing
    dateUpdateTimer = setTimeout(() => {
        updateTravelDates();
    }, 500);
}

// Update travel dates
function updateTravelDates() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    // Convert dates to ISO format for processing
    const startDateISO = convertToISODate(startDate);
    const endDateISO = convertToISODate(endDate);

    // Only validate if both dates are complete and valid
    if (startDate && endDate && isValidDateString(startDate) && isValidDateString(endDate)) {
        const startDateObj = new Date(startDateISO);
        const endDateObj = new Date(endDateISO);

        if (endDateObj < startDateObj) {
            // Show error message
            alert('End date cannot be earlier than start date. Please select a valid end date.');

            // Reset the end date to match start date
            endDateInput.value = startDate;
            travelPlan.endDate = startDateISO;

            // Add visual feedback
            endDateInput.style.borderColor = '#ef4444';
            endDateInput.style.backgroundColor = '#fef2f2';

            // Reset visual feedback after 3 seconds
            setTimeout(() => {
                endDateInput.style.borderColor = '';
                endDateInput.style.backgroundColor = '';
            }, 3000);

            return; // Exit early to prevent further processing
        }
    }

    // Store dates in ISO format internally
    if (!startDate || isValidDateString(startDate)) {
        travelPlan.startDate = startDateISO;
    }
    if (!endDate || isValidDateString(endDate)) {
        travelPlan.endDate = endDateISO;
    }

    // Auto-generate days based on new date range
    autoGenerateDays();
    saveTravelPlan();
}

// Clean up days that exceed the date range
function cleanupExcessDays() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    // Only cleanup if both dates are set and valid
    if (!startDate || !endDate || !isValidDateString(startDate) || !isValidDateString(endDate)) {
        return;
    }

    const startDateISO = convertToISODate(startDate);
    const endDateISO = convertToISODate(endDate);
    const startDateObj = new Date(startDateISO);
    const endDateObj = new Date(endDateISO);

    // Calculate maximum allowed days
    const maxDays = Math.floor((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

    // Remove excess days
    if (travelPlan.days.length > maxDays) {
        const removedDays = travelPlan.days.length - maxDays;
        travelPlan.days = travelPlan.days.slice(0, maxDays);

        console.log(`Removed ${removedDays} excess day(s) that exceeded the date range`);

        // Show user notification if days were removed
        if (removedDays > 0) {
            setTimeout(() => {
                alert(`Removed ${removedDays} day(s) that exceeded your trip dates. Your trip is ${maxDays} day${maxDays > 1 ? 's' : ''} long from ${convertToDisplayDate(startDateISO)} to ${convertToDisplayDate(endDateISO)}.`);
            }, 100);
        }
    }

    // Renumber remaining days
    travelPlan.days.forEach((day, index) => {
        day.number = index + 1;
    });
}

// Update the Add Day button state based on date constraints
function updateAddDayButtonState() {
    const addDayBtn = document.getElementById('addDayBtn');
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!addDayBtn) return;

    // If no dates are set, enable the button
    if (!startDate || !endDate) {
        addDayBtn.disabled = false;
        addDayBtn.title = 'Add Day';
        addDayBtn.style.opacity = '';
        return;
    }

    // Convert to ISO format for calculation
    const startDateISO = convertToISODate(startDate);
    const endDateISO = convertToISODate(endDate);

    if (!startDateISO || !endDateISO) {
        // Invalid dates, enable button but show warning
        addDayBtn.disabled = false;
        addDayBtn.title = 'Add Day (please enter valid dates)';
        addDayBtn.style.opacity = '';
        return;
    }

    // Calculate if we can add more days
    const startDateObj = new Date(startDateISO);
    const endDateObj = new Date(endDateISO);
    const maxDays = Math.floor((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;
    const currentDays = travelPlan.days.length;

    if (currentDays >= maxDays) {
        // Disable button if we've reached the limit
        addDayBtn.disabled = true;
        addDayBtn.title = `Cannot add more days. Trip is ${maxDays} day${maxDays > 1 ? 's' : ''} long (${convertToDisplayDate(startDateISO)} to ${convertToDisplayDate(endDateISO)})`;
        addDayBtn.style.opacity = '0.5';
    } else {
        // Enable button if we can add more days
        addDayBtn.disabled = false;
        addDayBtn.title = `Add Day (${currentDays}/${maxDays} days used)`;
        addDayBtn.style.opacity = '';
    }
}

// Show/hide edit mode notification
function showEditModeNotification(show) {
    let notification = document.getElementById('editModeNotification');

    if (show) {
        if (!notification) {
            // Create notification element
            notification = document.createElement('div');
            notification.id = 'editModeNotification';
            notification.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #f59e0b;
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 1000;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <i class="fas fa-edit"></i>
                    Edit Mode: Drag markers to adjust locations
                </div>
            `;
            document.body.appendChild(notification);
        }
        notification.style.display = 'block';
    } else {
        if (notification) {
            notification.style.display = 'none';
        }
    }
}

// Update location coordinates when marker is dragged
function updateLocationCoordinates(locationId, newLat, newLng) {
    // Find the location in the travel plan
    let locationFound = false;

    for (let day of travelPlan.days) {
        const items = getCombinedItems(day);
        const location = items.find(item => item.type === 'location' && item.id === locationId);

        if (location) {
            // Update coordinates
            location.lat = parseFloat(newLat.toFixed(6));
            location.lng = parseFloat(newLng.toFixed(6));
            locationFound = true;

            // Show success feedback
            showLocationUpdateFeedback(location.name, newLat, newLng);
            break;
        }
    }

    if (locationFound) {
        // Save the updated travel plan
        saveTravelPlan();

        // Re-render the days to update any displayed coordinates
        renderDays();
    }
}

// Show feedback when location is updated
function showLocationUpdateFeedback(locationName, lat, lng) {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 80px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            font-weight: 500;
            max-width: 300px;
        ">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <i class="fas fa-check-circle"></i>
                Location Updated
            </div>
            <div style="font-size: 0.9em; opacity: 0.9;">
                ${locationName}<br>
                <small>${lat.toFixed(6)}, ${lng.toFixed(6)}</small>
            </div>
        </div>
    `;

    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Fallback to OpenStreetMap geocoding for auto-geocoding
async function fallbackToOpenStreetMapGeocoding(address, addressField, coordsGroup) {
    try {
        // Show loading state
        console.log('🔍 Using OpenStreetMap geocoding for:', address);
        addressField.style.borderColor = '#f59e0b';
        addressField.style.backgroundColor = '#fef3c7';

        // Use Nominatim API directly
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`;
        console.log('🌐 Making request to:', url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 API Response:', data);

        if (Array.isArray(data) && data.length > 0) {
            const result = data[0];

            // Update coordinates
            document.getElementById('locationLat').value = parseFloat(result.lat);
            document.getElementById('locationLng').value = parseFloat(result.lon);
            coordsGroup.style.display = 'block';

            // Success visual feedback
            addressField.style.borderColor = '#10b981';
            addressField.style.backgroundColor = '#f0fdf4';
            coordsGroup.style.border = '2px solid #10b981';
            coordsGroup.style.backgroundColor = '#f0fdf4';

            // Reset after delay
            setTimeout(() => {
                addressField.style.borderColor = '#eee';
                addressField.style.backgroundColor = 'white';
                coordsGroup.style.border = '1px solid #e0e6ff';
                coordsGroup.style.backgroundColor = '#f8f9ff';
            }, 3000);

            console.log('✅ OpenStreetMap geocoding successful!');
            console.log('📍 Address:', result.display_name);
            console.log('🌍 Coordinates:', result.lat, result.lon);

        } else {
            // Error visual feedback
            addressField.style.borderColor = '#ef4444';
            addressField.style.backgroundColor = '#fef2f2';

            setTimeout(() => {
                addressField.style.borderColor = '#eee';
                addressField.style.backgroundColor = 'white';
            }, 3000);

            console.log('❌ OpenStreetMap geocoding failed for:', address);
        }
    } catch (error) {
        // Error visual feedback
        addressField.style.borderColor = '#ef4444';
        addressField.style.backgroundColor = '#fef2f2';

        setTimeout(() => {
            addressField.style.borderColor = '#eee';
            addressField.style.backgroundColor = 'white';
        }, 3000);

        console.error('💥 OpenStreetMap geocoding error:', error);
    }
}

// Fallback to OpenStreetMap geocoding for manual search
async function fallbackToOpenStreetMapSearch(locationName, searchBtn) {
    try {
        // Use Nominatim API directly
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1&addressdetails=1`;
        console.log('Making request to:', url);

        const response = await fetch(url);
        const data = await response.json();

        console.log('API Response:', data);

        if (Array.isArray(data) && data.length > 0) {
            const result = data[0];

            // Show coordinates in the form
            document.getElementById('locationLat').value = parseFloat(result.lat);
            document.getElementById('locationLng').value = parseFloat(result.lon);
            document.querySelector('.coordinates-group').style.display = 'block';

            // Auto-fill address if not already filled
            if (!document.getElementById('googleAddress').value) {
                document.getElementById('googleAddress').value = result.display_name;
            }

            // Show success message
            const coordsGroup = document.querySelector('.coordinates-group');
            coordsGroup.style.border = '2px solid #10b981';
            coordsGroup.style.backgroundColor = '#f0fdf4';

            // Show success notification
            console.log('✅ OpenStreetMap geocoding successful!');
            alert(`✅ Found location: ${result.display_name}\nCoordinates: ${result.lat}, ${result.lon}`);

            setTimeout(() => {
                coordsGroup.style.border = '1px solid #e0e6ff';
                coordsGroup.style.backgroundColor = '#f8f9ff';
            }, 3000);

        } else {
            alert('Could not find location. Please try a different search term or enter coordinates manually.');
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        alert('Error searching for location. Please try again or enter coordinates manually.');
    } finally {
        // Re-enable button
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-search"></i>';
    }
}

// Export travel plan
function exportTravelPlan() {
    const dataStr = JSON.stringify(travelPlan, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'travel-plan.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Open import dialog
function openImportDialog() {
    document.getElementById('importFileInput').click();
}

// Handle import file selection
function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        alert('Please select a valid JSON file.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            importTravelPlan(importedData);
        } catch (error) {
            alert('Error reading file: Invalid JSON format.');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
    
    // Reset the file input
    event.target.value = '';
}

// Import travel plan from JSON data
function importTravelPlan(importedData) {
    // Validate the imported data structure
    if (!validateTravelPlanData(importedData)) {
        alert('Invalid travel plan format. Please check your file.');
        return;
    }
    
    if (travelPlan.days.length > 0) {
        if (!confirm('This will replace your current travel plan. Continue?')) {
            return;
        }
    }
    
    // Import the data
    travelPlan = {
        title: importedData.title || 'My Travel Plan',
        startDate: importedData.startDate || '',
        endDate: importedData.endDate || '',
        days: importedData.days || []
    };
    
    // Ensure all days are migrated to the new structure
    travelPlan.days.forEach(day => {
        getCombinedItems(day); // This will migrate old structure to new if needed
    });
    
    // Update the UI - HTML date inputs expect YYYY-MM-DD format
    document.getElementById('startDate').value = travelPlan.startDate;
    document.getElementById('endDate').value = travelPlan.endDate;
    
    // Reset selected day view
    selectedDayId = null;
    
    // Render the imported plan
    renderDays();
    saveTravelPlan();
    
    alert('Travel plan imported successfully!');
}

// Validate travel plan data structure
function validateTravelPlanData(data) {
    // Check if data is an object
    if (!data || typeof data !== 'object') {
        return false;
    }
    
    // Check for required properties
    if (!data.hasOwnProperty('days') || !Array.isArray(data.days)) {
        return false;
    }
    
    // Validate each day
    for (const day of data.days) {
        if (!day || typeof day !== 'object') {
            return false;
        }
        
        // Check required day properties
        if (!day.hasOwnProperty('id') || !day.hasOwnProperty('number') || 
            !day.hasOwnProperty('date')) {
            return false;
        }
        
        // Handle both old and new data structures
        const hasOldStructure = day.hasOwnProperty('locations');
        const hasNewStructure = day.hasOwnProperty('items');
        
        if (!hasOldStructure && !hasNewStructure) {
            return false;
        }
        
        // Validate old structure (separate locations and notes arrays)
        if (hasOldStructure) {
            // Validate locations array
            if (!Array.isArray(day.locations)) {
                return false;
            }
            
            // Validate each location
            for (const location of day.locations) {
                if (!validateLocationItem(location)) {
                    return false;
                }
            }
            
            // Validate notes array if it exists
            if (day.hasOwnProperty('notes')) {
                if (!Array.isArray(day.notes)) {
                    return false;
                }
                
                // Validate each note
                for (const note of day.notes) {
                    if (!validateNoteItem(note)) {
                        return false;
                    }
                }
            }
        }
        
        // Validate new structure (unified items array)
        if (hasNewStructure) {
            if (!Array.isArray(day.items)) {
                return false;
            }
            
            // Validate each item
            for (const item of day.items) {
                if (!item || typeof item !== 'object') {
                    return false;
                }
                
                if (!item.hasOwnProperty('type') || !item.hasOwnProperty('id')) {
                    return false;
                }
                
                if (item.type === 'location') {
                    if (!validateLocationItem(item)) {
                        return false;
                    }
                } else if (item.type === 'note') {
                    if (!validateNoteItem(item)) {
                        return false;
                    }
                } else if (item.type === 'travel') {
                    if (!validateTravelItem(item)) {
                        return false;
                    }
                } else {
                    return false; // Unknown item type
                }
            }
        }
    }
    
    return true;
}

// Helper function to validate location items
function validateLocationItem(location) {
    if (!location || typeof location !== 'object') {
        return false;
    }
    
    // Check required location properties
    if (!location.hasOwnProperty('id') || !location.hasOwnProperty('name') || 
        !location.hasOwnProperty('lat') || !location.hasOwnProperty('lng')) {
        return false;
    }
    
    // Validate coordinates are numbers
    if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        return false;
    }
    
    return true;
}

// Helper function to validate note items
function validateNoteItem(note) {
    if (!note || typeof note !== 'object') {
        return false;
    }
    
    // Check required note properties
    if (!note.hasOwnProperty('id') || !note.hasOwnProperty('content') || 
        !note.hasOwnProperty('timestamp')) {
        return false;
    }
    
    return true;
}

// Helper function to validate travel items
function validateTravelItem(travel) {
    if (!travel || typeof travel !== 'object') {
        return false;
    }
    
    // Check required travel properties (support legacy + new structure)
    if (!travel.hasOwnProperty('id') || !travel.hasOwnProperty('transport')) {
        return false;
    }
    
    return true;
}

// Clear all data
function clearAllData() {
    if (confirm('This will delete all your travel plans. Are you sure?')) {
        travelPlan = {
            title: 'My Travel Plan',
            startDate: '',
            endDate: '',
            days: []
        };
        
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        
        renderDays();
        saveTravelPlan();
    }
}

// Update transport method between activities
function updateTransportMethod(dayId, travelId, method) {
    const day = travelPlan.days.find(d => d.id === dayId);
    if (!day) return;
    
    // Ensure items array exists
    if (!day.items) day.items = [];
    
    // Find or create travel item
    let travel = day.items.find(item => item.type === 'travel' && item.id === travelId);
    if (!travel) {
        travel = {
            id: travelId,
            type: 'travel',
            transport: method,
            travelTime: ''
        };
        day.items.push(travel);
    } else {
        travel.transport = method;
    }
    
    renderDays();
    saveTravelPlan();
}

// Update travel time between activities
function updateTravelTime(dayId, travelId, time) {
    const day = travelPlan.days.find(d => d.id === dayId);
    if (!day) return;
    
    // Ensure items array exists
    if (!day.items) day.items = [];
    
    // Find or create travel item
    let travel = day.items.find(item => item.type === 'travel' && item.id === travelId);
    if (!travel) {
        travel = {
            id: travelId,
            type: 'travel',
            transport: '',
            // Legacy field: older UI stored a free-form string here
            travelTime: time
        };
        day.items.push(travel);
    } else {
        travel.travelTime = time;
    }
    
    renderDays();
    saveTravelPlan();
}

function updateTravelMode(dayId, travelId, mode) {
    const day = travelPlan.days.find(d => d.id === dayId);
    if (!day) return;
    if (!day.items) day.items = [];

    let travel = day.items.find(item => item.type === 'travel' && item.id === travelId);
    if (!travel) {
        travel = { id: travelId, type: 'travel', transport: '', mode: mode, durationMinutes: '' };
        day.items.push(travel);
    } else {
        travel.mode = mode;
        // If switching back to auto, don't force-clear duration—just stop applying it.
    }

    renderDays();
    saveTravelPlan();
}

function updateTravelDurationMinutes(dayId, travelId, minutes, prevLocationId, nextLocationId) {
    const day = travelPlan.days.find(d => d.id === dayId);
    if (!day) return;
    if (!day.items) day.items = [];

    const mins = minutes === '' ? '' : Math.max(0, parseInt(minutes, 10));

    let travel = day.items.find(item => item.type === 'travel' && item.id === travelId);
    if (!travel) {
        travel = { id: travelId, type: 'travel', transport: '', mode: 'duration', durationMinutes: mins };
        day.items.push(travel);
    } else {
        travel.mode = 'duration';
        travel.durationMinutes = mins;
    }

    // Apply rule (2): duration + prev end time -> set next activity start time
    if (mins !== '' && prevLocationId && nextLocationId) {
        const items = getCombinedItems(day);
        const prevLoc = items.find(i => i.type === 'location' && i.id === prevLocationId);
        const nextLoc = items.find(i => i.type === 'location' && i.id === nextLocationId);
        const prevEnd = prevLoc?.endTime || prevLoc?.time;

        if (prevEnd && nextLoc) {
            nextLoc.startTime = addMinutesToTimeString(prevEnd, mins);
            // Keep backward compatibility: if an old `time` field exists, remove it
            if (nextLoc.time) delete nextLoc.time;
        }
    }

    renderDays();
    saveTravelPlan();
}

// Delete transport details
function deleteTransport(dayId, travelId) {
    const day = travelPlan.days.find(d => d.id === dayId);
    if (!day || !day.items) return;
    
    // Remove travel item
    day.items = day.items.filter(item => !(item.type === 'travel' && item.id === travelId));
    
    renderDays();
    saveTravelPlan();
}

// Save travel plan to localStorage
function saveTravelPlan() {
    localStorage.setItem('travelPlan', JSON.stringify(travelPlan));
}

// Load travel plan from localStorage
function loadTravelPlan() {
    const saved = localStorage.getItem('travelPlan');
    if (saved) {
        try {
            travelPlan = JSON.parse(saved);
            // HTML date inputs expect YYYY-MM-DD format
            document.getElementById('startDate').value = travelPlan.startDate || '';
            document.getElementById('endDate').value = travelPlan.endDate || '';
            renderDays();
        } catch (e) {
            console.error('Error loading travel plan:', e);
        }
    }
}

// Format date for display
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Format timestamp for display
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

// Debounce timer for address input
let addressInputTimer = null;

// Debounced geocoding for address input
function debounceGeocodeAddress() {
    console.log('🔄 Address input detected, starting debounce...');
    
    // Clear previous timer
    if (addressInputTimer) {
        clearTimeout(addressInputTimer);
        console.log('⏰ Cleared previous timer');
    }
    
    // Set new timer
    addressInputTimer = setTimeout(() => {
        const googleAddress = document.getElementById('googleAddress').value.trim();
        console.log('📍 Debounce timer fired. Address:', googleAddress);
        
        if (googleAddress && googleAddress.length > 3) {
            console.log('✅ Address length sufficient, starting geocoding...');
            geocodeAddressQuietly(googleAddress);
        } else {
            console.log('❌ Address too short or empty, skipping geocoding');
        }
    }, 1000); // Reduced to 1 second for faster response
}

// Quiet geocoding without alerts/notifications (for auto-updates)
async function geocodeAddressQuietly(address) {
    const coordsGroup = document.querySelector('.coordinates-group');
    const addressField = document.getElementById('googleAddress');

    try {
        // Show loading state
        console.log('🔍 Starting auto-geocoding for:', address);
        addressField.style.borderColor = '#f59e0b';
        addressField.style.backgroundColor = '#fef3c7';

        // Check if API key is available, if not, fall back to OpenStreetMap
        if (!LOCATIONIQ_API_KEY || LOCATIONIQ_API_KEY.trim() === '') {
            console.log('No LocationIQ API key available, using OpenStreetMap geocoding');
            fallbackToOpenStreetMapGeocoding(address, addressField, coordsGroup);
            return;
        }

        const url = `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=1`;
        console.log('🌐 Making request to:', url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 API Response:', data);

        if (Array.isArray(data) && data.length > 0) {
            const result = data[0];

            // Update coordinates
            document.getElementById('locationLat').value = parseFloat(result.lat);
            document.getElementById('locationLng').value = parseFloat(result.lon);
            coordsGroup.style.display = 'block';

            // Success visual feedback
            addressField.style.borderColor = '#10b981';
            addressField.style.backgroundColor = '#f0fdf4';
            coordsGroup.style.border = '2px solid #10b981';
            coordsGroup.style.backgroundColor = '#f0fdf4';

            // Reset after delay
            setTimeout(() => {
                addressField.style.borderColor = '#eee';
                addressField.style.backgroundColor = 'white';
                coordsGroup.style.border = '1px solid #e0e6ff';
                coordsGroup.style.backgroundColor = '#f8f9ff';
            }, 3000);

            console.log('✅ Auto-geocoding successful!');
            console.log('📍 Address:', result.display_name);
            console.log('🌍 Coordinates:', result.lat, result.lon);

        } else {
            // Error visual feedback
            addressField.style.borderColor = '#ef4444';
            addressField.style.backgroundColor = '#fef2f2';

            setTimeout(() => {
                addressField.style.borderColor = '#eee';
                addressField.style.backgroundColor = 'white';
            }, 3000);

            console.log('❌ Auto-geocoding failed for:', address);
            console.log('📄 Full response:', data);
        }
    } catch (error) {
        // Error visual feedback
        addressField.style.borderColor = '#ef4444';
        addressField.style.backgroundColor = '#fef2f2';

        setTimeout(() => {
            addressField.style.borderColor = '#eee';
            addressField.style.backgroundColor = 'white';
        }, 3000);

        console.error('💥 Auto-geocoding error:', error);
        console.error('🔧 Check your internet connection and API key');
    }
}

// Clear coordinates function
function clearCoordinates() {
    document.getElementById('locationLat').value = '';
    document.getElementById('locationLng').value = '';
    document.querySelector('.coordinates-group').style.display = 'none';
    console.log('Coordinates cleared');
}

// LocationIQ Geocoding function
async function searchLocationWithLocationIQ() {
    const locationName = document.getElementById('locationName').value.trim();
    const searchBtn = document.getElementById('searchLocationBtn');

    if (!locationName) {
        alert('Please enter a location name first.');
        return;
    }

    // Check if API key is available, if not, fall back to OpenStreetMap
    if (!LOCATIONIQ_API_KEY || LOCATIONIQ_API_KEY.trim() === '') {
        console.log('No LocationIQ API key available, using OpenStreetMap geocoding');
        fallbackToOpenStreetMapSearch(locationName, searchBtn);
        return;
    }

    // Disable button and show loading state
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const url = `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(locationName)}&format=json&addressdetails=1&limit=1`;
        console.log('Making request to:', url);
        console.log('Using API key:', LOCATIONIQ_API_KEY ? 'Key is set' : 'No API key found');

        const response = await fetch(url);
        const data = await response.json();

        console.log('API Response:', data);

        if (Array.isArray(data) && data.length > 0) {
            const result = data[0];

            // Show coordinates in the form
            document.getElementById('locationLat').value = parseFloat(result.lat);
            document.getElementById('locationLng').value = parseFloat(result.lon);
            document.querySelector('.coordinates-group').style.display = 'block';

            // Auto-fill address if not already filled
            if (!document.getElementById('googleAddress').value) {
                document.getElementById('googleAddress').value = result.display_name;
            }

            // Show success message
            const coordsGroup = document.querySelector('.coordinates-group');
            coordsGroup.style.border = '2px solid #10b981';
            coordsGroup.style.backgroundColor = '#f0fdf4';

            // Show success notification
            console.log('✅ LocationIQ geocoding successful!');
            alert(`✅ Found location: ${result.display_name}\nCoordinates: ${result.lat}, ${result.lon}`);

            setTimeout(() => {
                coordsGroup.style.border = '1px solid #e0e6ff';
                coordsGroup.style.backgroundColor = '#f8f9ff';
            }, 3000);

        } else {
            let errorMessage = 'Could not find location: ';
            if (response.status === 401) {
                errorMessage += 'API key issue. Please check your LocationIQ API key.';
            } else if (response.status === 429) {
                errorMessage += 'Rate limit exceeded. Please try again later.';
            } else if (Array.isArray(data) && data.length === 0) {
                errorMessage += 'No results found for this location.';
            } else {
                errorMessage += 'Unknown error occurred.';
            }
            alert(errorMessage);
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        alert('Error searching for location. Please try again.');
    } finally {
        // Re-enable button
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-search"></i>';
    }
}

// OpenStreetMap doesn't require API key authentication

// Drag and Drop Variables
let draggedElement = null;
let draggedData = null;
let placeholder = null;

// Setup drag and drop event listeners
function setupDragAndDrop() {
    console.log('Setting up drag and drop...');
    const draggableItems = document.querySelectorAll('.draggable');
    console.log('Found draggable items:', draggableItems.length);
    
    draggableItems.forEach((item, index) => {
        console.log(`Setting up item ${index}:`, item);
        console.log(`Item classes:`, item.className);
        console.log(`Item datasets:`, item.dataset);
        
        // Check if this is a note or location
        const isNote = item.classList.contains('note-item');
        const isLocation = item.classList.contains('location-item');
        console.log(`Is note: ${isNote}, Is location: ${isLocation}`);
        
        // Ensure item is draggable
        item.setAttribute('draggable', 'true');
        
        // Remove any existing listeners to avoid duplicates
        item.removeEventListener('dragstart', handleDragStart);
        item.removeEventListener('dragend', handleDragEnd);
        
        // Add fresh listeners
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        
        console.log(`Listeners added to item ${index}`);
        
        // Prevent default drag behavior on buttons
        const buttons = item.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.setAttribute('draggable', 'false');
            btn.addEventListener('dragstart', (e) => e.preventDefault());
        });
    });
    
    // Add drop zone listeners to all location lists
    const locationLists = document.querySelectorAll('.locations-list');
    console.log('Found location lists:', locationLists.length);
    
    locationLists.forEach((list, index) => {
        console.log(`Setting up drop zone ${index}:`, list);
        list.addEventListener('dragover', handleDragOver);
        list.addEventListener('drop', handleDrop);
    });
    
    console.log('Drag and drop setup complete');
}

// Handle drag start
function handleDragStart(e) {
    console.log('Drag start event triggered');
    console.log('Event target:', e.target);
    console.log('Current element:', this);
    
    // For now, allow dragging from anywhere to test basic functionality
    // We'll add handle restriction back once basic dragging works
    
    draggedElement = this;
    draggedData = {
        itemType: this.dataset.itemType,
        itemId: this.dataset.itemId,
        dayId: this.dataset.dayId
    };
    
    console.log('Element datasets:', {
        itemType: this.dataset.itemType,
        itemId: this.dataset.itemId,
        dayId: this.dataset.dayId
    });
    
    console.log('Drag data set:', draggedData);
    
    // Add visual feedback
    this.classList.add('dragging');
    this.style.opacity = '0.5';
    
    // Create placeholder
    placeholder = document.createElement('div');
    placeholder.className = 'drag-placeholder';
    placeholder.style.height = this.offsetHeight + 'px';
    placeholder.style.background = 'rgba(102, 126, 234, 0.1)';
    placeholder.style.border = '2px dashed #667eea';
    placeholder.style.borderRadius = '8px';
    placeholder.style.margin = '8px 0';
    
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
    
    console.log('Drag started successfully:', draggedData);
}

// Handle drag end
function handleDragEnd(e) {
    // Clean up visual effects
    this.classList.remove('dragging');
    this.style.opacity = '';
    
    // Remove placeholder
    if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    
    // Clean up
    draggedElement = null;
    draggedData = null;
    placeholder = null;
    
    console.log('Drag ended');
}

// Handle drag over - simplified and more reliable
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedElement || !draggedData) return;
    
    // Get the closest draggable item to the mouse position
    const afterElement = getDragAfterElement(this, e.clientY);
    
    // Remove existing placeholder
    if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    
    // Insert placeholder at the correct position
    if (afterElement) {
        this.insertBefore(placeholder, afterElement);
    } else {
        this.appendChild(placeholder);
    }
}

// Handle drop
function handleDrop(e) {
    e.preventDefault();
    
    if (!draggedElement || !draggedData) return;
    
    // Get target day ID
    const targetDayId = this.id.replace('locations_', '');
    
    // Find the position where placeholder is
    let targetIndex = 0;
    const items = [...this.children];
    const placeholderIndex = items.indexOf(placeholder);
    
    if (placeholderIndex !== -1) {
        // Count only draggable items before the placeholder
        targetIndex = items.slice(0, placeholderIndex).filter(item => 
            item.classList.contains('draggable')).length;
    } else {
        targetIndex = items.filter(item => item.classList.contains('draggable')).length;
    }
    
    // Perform the reorder
    reorderItem(draggedData.dayId, targetDayId, draggedData.itemType, draggedData.itemId, targetIndex);
    
    console.log('Drop completed');
}

// Get the element after which to insert the dragged item
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Reorder item within the data structure - unified approach
function reorderItem(sourceDayId, targetDayId, itemType, itemId, targetIndex) {
    console.log('Reordering:', { sourceDayId, targetDayId, itemType, itemId, targetIndex });
    
    const sourceDay = travelPlan.days.find(d => d.id === sourceDayId);
    const targetDay = travelPlan.days.find(d => d.id === targetDayId);
    
    if (!sourceDay || !targetDay) {
        console.error('Source or target day not found');
        return;
    }
    
    // Ensure both days have items arrays
    getCombinedItems(sourceDay);
    getCombinedItems(targetDay);
    
    // Find the item in source day
    const item = sourceDay.items.find(item => item.id === itemId);
    if (!item) {
        console.error('Item not found:', itemId);
        return;
    }
    
    // Remove from source
    const sourceIndex = sourceDay.items.indexOf(item);
    sourceDay.items.splice(sourceIndex, 1);
    
    // Adjust target index if moving within the same day and after the original position
    if (sourceDayId === targetDayId && targetIndex > sourceIndex) {
        targetIndex--;
    }
    
    // Insert at target position
    targetDay.items.splice(targetIndex, 0, item);
    
    console.log('Item reordered successfully');
    
    // Re-render and save
    renderDays();
    saveTravelPlan();
}

// Global functions (needed for onclick handlers)
window.openLocationModal = openLocationModal;
window.editLocation = editLocation;
window.editNote = editNote;
window.editTravel = editTravel;
window.deleteLocation = deleteLocation;
window.deleteNote = deleteNote;
window.deleteItem = deleteItem;
window.deleteDay = deleteDay;
window.focusLocationOnMap = focusLocationOnMap;
window.toggleDayView = toggleDayView;
window.openNoteModal = openNoteModal;
window.openImportDialog = openImportDialog;
window.updateTransportMethod = updateTransportMethod;
window.updateTravelTime = updateTravelTime;
window.deleteTransport = deleteTransport; 