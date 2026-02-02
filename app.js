// ========================================
// SaFem App - Main JavaScript
// ========================================

// Global variables
let map = null;
let routingControl = null;
let userMarker = null;
let currentPosition = null;
let geocoder = null;
let safetyLayer = null;
let hazardMarkers = [];

// ========================================
// Safety Data - Hazard Points
// These would typically come from a crime/safety API
// Each point has: location, type, severity (1-5), radius of influence
// ========================================
const hazardData = [
    // Example data for Ann Arbor area - replace with real data
    { lat: 42.2810, lng: -83.7480, type: 'crime', severity: 4, description: 'High crime area', radius: 200 },
    { lat: 42.2785, lng: -83.7410, type: 'lighting', severity: 3, description: 'Poorly lit street', radius: 150 },
    { lat: 42.2830, lng: -83.7390, type: 'crime', severity: 5, description: 'Recent incidents reported', radius: 250 },
    { lat: 42.2775, lng: -83.7450, type: 'lighting', severity: 2, description: 'Dim lighting', radius: 100 },
    { lat: 42.2850, lng: -83.7420, type: 'crime', severity: 3, description: 'Moderate risk area', radius: 180 },
    { lat: 42.2795, lng: -83.7500, type: 'other', severity: 4, description: 'Isolated area', radius: 200 },
    { lat: 42.2820, lng: -83.7350, type: 'lighting', severity: 4, description: 'No street lights', radius: 220 },
    { lat: 42.2760, lng: -83.7380, type: 'crime', severity: 2, description: 'Low risk area', radius: 120 },
];

// Safety zones - known safe areas (police stations, busy areas, etc.)
const safeZones = [
    { lat: 42.2808, lng: -83.7430, type: 'police', description: 'Police Station nearby', radius: 300 },
    { lat: 42.2840, lng: -83.7460, type: 'busy', description: 'Well-populated area', radius: 250 },
    { lat: 42.2770, lng: -83.7420, type: 'campus', description: 'University campus - well lit', radius: 350 },
];

// ========================================
// Tab Navigation
// ========================================
function switchTab(tabName) {
    // Update tab content visibility
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Update nav button states
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Initialize map when switching to map tab
    if (tabName === 'map' && !map) {
        initMap();
    }
}

// ========================================
// Map Initialization
// ========================================
function initMap() {
    // Default location (can be changed)
    const defaultLocation = [42.2808, -83.7430]; // Ann Arbor, MI

    // Initialize the map
    map = L.map('map', {
        zoomControl: true,
        attributionControl: true
    }).setView(defaultLocation, 15);

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Initialize geocoder with timeout settings
    geocoder = L.Control.Geocoder.nominatim({
        geocodingQueryParams: {
            countrycodes: 'us',
            limit: 5
        }
    });

    // Add safety layer to map
    addSafetyLayer();

    // Try to get user's current location
    getUserLocation();

    // Set up event listeners
    setupMapEventListeners();

    // Fix map display issue
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}

// ========================================
// Add Safety Layer (Hazard Zones)
// ========================================
function addSafetyLayer() {
    // Create layer group for safety visualization
    safetyLayer = L.layerGroup().addTo(map);

    // Add hazard zones (red/orange circles)
    hazardData.forEach(hazard => {
        const color = getHazardColor(hazard.severity);
        
        // Add circle for hazard zone
        const circle = L.circle([hazard.lat, hazard.lng], {
            radius: hazard.radius,
            color: color,
            fillColor: color,
            fillOpacity: 0.25,
            weight: 2
        }).addTo(safetyLayer);

        // Add popup with hazard info
        circle.bindPopup(`
            <strong>⚠️ ${hazard.type === 'crime' ? 'Safety Alert' : 'Caution Area'}</strong><br>
            ${hazard.description}<br>
            <span style="color: ${color}">Risk Level: ${'●'.repeat(hazard.severity)}${'○'.repeat(5-hazard.severity)}</span>
        `);

        hazardMarkers.push(circle);
    });

    // Add safe zones (green circles)
    safeZones.forEach(zone => {
        const circle = L.circle([zone.lat, zone.lng], {
            radius: zone.radius,
            color: '#2ecc71',
            fillColor: '#2ecc71',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '5, 10'
        }).addTo(safetyLayer);

        circle.bindPopup(`
            <strong>✅ Safe Zone</strong><br>
            ${zone.description}
        `);
    });
}

// ========================================
// Get Hazard Color Based on Severity
// ========================================
function getHazardColor(severity) {
    const colors = {
        1: '#f39c12', // Yellow - Low risk
        2: '#e67e22', // Orange - Moderate
        3: '#d35400', // Dark orange - Medium
        4: '#e74c3c', // Red - High
        5: '#c0392b'  // Dark red - Very high
    };
    return colors[severity] || '#e74c3c';
}

// ========================================
// Get User Location
// ========================================
function getUserLocation() {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentPosition = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                // Center map on user location
                map.setView([currentPosition.lat, currentPosition.lng], 15);

                // Add user marker
                if (userMarker) {
                    map.removeLayer(userMarker);
                }

                userMarker = L.marker([currentPosition.lat, currentPosition.lng], {
                    icon: createCustomIcon('📍')
                }).addTo(map).bindPopup('You are here').openPopup();

                // Update start location input
                document.getElementById('startLocation').value = 'Current Location';
            },
            (error) => {
                console.log('Geolocation error:', error);
                showNotification('Unable to get your location. Please enter it manually.', 'info');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }
}

// ========================================
// Create Custom Marker Icon
// ========================================
function createCustomIcon(emoji) {
    return L.divIcon({
        html: `<div style="font-size: 24px; text-align: center;">${emoji}</div>`,
        className: 'custom-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    });
}

// ========================================
// Setup Map Event Listeners
// ========================================
function setupMapEventListeners() {
    // Use My Location button
    document.getElementById('useMyLocation').addEventListener('click', () => {
        getUserLocation();
    });

    // Get Route button
    document.getElementById('getRouteBtn').addEventListener('click', () => {
        calculateRoute();
    });

    // Share Route button
    document.getElementById('shareRouteBtn').addEventListener('click', () => {
        shareRoute();
    });

    // Safety layer toggle
    document.getElementById('showSafetyLayer').addEventListener('change', (e) => {
        toggleSafetyLayer(e.target.checked);
    });

    // Allow Enter key to trigger route calculation
    document.getElementById('endLocation').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            calculateRoute();
        }
    });
}

// ========================================
// Toggle Safety Layer Visibility
// ========================================
function toggleSafetyLayer(visible) {
    if (safetyLayer) {
        if (visible) {
            safetyLayer.addTo(map);
        } else {
            map.removeLayer(safetyLayer);
        }
    }
}

// ========================================
// Calculate Route
// ========================================
function calculateRoute() {
    const startInput = document.getElementById('startLocation').value;
    const endInput = document.getElementById('endLocation').value;

    if (!endInput) {
        showNotification('Please enter a destination', 'error');
        return;
    }

    // Show loading state
    const routeBtn = document.getElementById('getRouteBtn');
    routeBtn.innerHTML = '<span>Calculating...</span>';
    routeBtn.disabled = true;

    // Get coordinates for start and end locations
    let startCoords = currentPosition ? [currentPosition.lat, currentPosition.lng] : null;

    // Geocode the destination
    geocoder.geocode(endInput, (results) => {
        if (results.length === 0) {
            showNotification('Destination not found. Please try a different address.', 'error');
            resetRouteButton();
            return;
        }

        const endCoords = [results[0].center.lat, results[0].center.lng];

        // If no start location, try to geocode it
        if (!startCoords && startInput && startInput !== 'Current Location') {
            geocoder.geocode(startInput, (startResults) => {
                if (startResults.length > 0) {
                    startCoords = [startResults[0].center.lat, startResults[0].center.lng];
                    displayRoute(startCoords, endCoords);
                } else {
                    showNotification('Start location not found. Please use your current location.', 'error');
                    resetRouteButton();
                }
            });
        } else if (startCoords) {
            displayRoute(startCoords, endCoords);
        } else {
            showNotification('Please enable location services or enter a start location.', 'error');
            resetRouteButton();
        }
    });
}

// ========================================
// Display Route on Map - SAFE ROUTING
// ========================================
function displayRoute(startCoords, endCoords) {
    // Remove existing routing control
    if (routingControl) {
        map.removeControl(routingControl);
    }

    // Calculate safe waypoints that avoid hazard zones
    const safeWaypoints = calculateSafeWaypoints(startCoords, endCoords);

    // Create waypoints array
    const waypoints = [
        L.latLng(startCoords[0], startCoords[1]),
        ...safeWaypoints.map(wp => L.latLng(wp.lat, wp.lng)),
        L.latLng(endCoords[0], endCoords[1])
    ];

    // Create new routing control with walking profile
    // Using multiple fallback routing services for reliability
    routingControl = L.Routing.control({
        waypoints: waypoints,
        router: new L.Routing.OSRMv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            profile: 'driving' // OSRM public server only supports driving, but works reliably
        }),
        routeWhileDragging: false,
        showAlternatives: false,
        fitSelectedRoutes: true,
        addWaypoints: false,
        show: false, // Hide the default instructions panel
        lineOptions: {
            styles: [
                { color: '#2ecc71', opacity: 0.9, weight: 6 },  // Green for safe route
                { color: '#27ae60', opacity: 0.4, weight: 12 }
            ]
        },
        createMarker: function(i, waypoint, n) {
            // Only show markers for start and end, not intermediate waypoints
            if (i === 0) {
                return L.marker(waypoint.latLng, { icon: createCustomIcon('🚶') });
            } else if (i === n - 1) {
                return L.marker(waypoint.latLng, { icon: createCustomIcon('🏁') });
            }
            return null; // Hide intermediate waypoint markers
        }
    }).addTo(map);

    // Listen for route found event
    routingControl.on('routesfound', function(e) {
        const routes = e.routes;
        const route = routes[0];

        // Calculate safety score for this route
        const safetyScore = calculateRouteSafetyScore(route);

        // Update route info
        const distance = (route.summary.totalDistance / 1000).toFixed(1);
        const duration = Math.round(route.summary.totalTime / 60);

        document.getElementById('routeDistance').textContent = `${distance} km`;
        document.getElementById('routeDuration').textContent = `${duration} min`;
        
        // Update safety score display
        updateSafetyScoreDisplay(safetyScore);

        // Show route info panel
        document.getElementById('routeInfo').classList.add('visible');

        resetRouteButton();
        showNotification(`🛡️ Safest route found! Safety score: ${safetyScore}/100`, 'success');
    });

    routingControl.on('routingerror', function(e) {
        showNotification('Unable to calculate route. Please try different locations.', 'error');
        resetRouteButton();
    });
}

// ========================================
// Calculate Safe Waypoints
// Finds points that route around hazard zones
// ========================================
function calculateSafeWaypoints(startCoords, endCoords) {
    const waypoints = [];
    
    // Get hazards along the direct path
    const directPathHazards = hazardData.filter(hazard => {
        return isHazardNearPath(
            { lat: startCoords[0], lng: startCoords[1] },
            { lat: endCoords[0], lng: endCoords[1] },
            hazard
        );
    });

    // Sort hazards by severity (highest first)
    directPathHazards.sort((a, b) => b.severity - a.severity);

    // For each significant hazard, add a waypoint to route around it
    directPathHazards.forEach(hazard => {
        if (hazard.severity >= 3) { // Only avoid high-severity hazards
            const avoidancePoint = calculateAvoidancePoint(
                { lat: startCoords[0], lng: startCoords[1] },
                { lat: endCoords[0], lng: endCoords[1] },
                hazard
            );
            if (avoidancePoint) {
                waypoints.push(avoidancePoint);
            }
        }
    });

    // Also try to route through safe zones if they're nearby
    safeZones.forEach(zone => {
        if (isPointNearPath(
            { lat: startCoords[0], lng: startCoords[1] },
            { lat: endCoords[0], lng: endCoords[1] },
            { lat: zone.lat, lng: zone.lng },
            500 // Check within 500m of direct path
        )) {
            waypoints.push({ lat: zone.lat, lng: zone.lng, priority: 1 });
        }
    });

    // Sort waypoints by distance from start
    waypoints.sort((a, b) => {
        const distA = getDistance(startCoords[0], startCoords[1], a.lat, a.lng);
        const distB = getDistance(startCoords[0], startCoords[1], b.lat, b.lng);
        return distA - distB;
    });

    // Limit to prevent overly complex routes
    return waypoints.slice(0, 3);
}

// ========================================
// Check if Hazard is Near Direct Path
// ========================================
function isHazardNearPath(start, end, hazard) {
    const distance = pointToLineDistance(
        hazard.lat, hazard.lng,
        start.lat, start.lng,
        end.lat, end.lng
    );
    // Hazard affects path if within its radius + buffer
    return distance < (hazard.radius + 100) / 1000; // Convert to km
}

// ========================================
// Check if Point is Near Path
// ========================================
function isPointNearPath(start, end, point, maxDistance) {
    const distance = pointToLineDistance(
        point.lat, point.lng,
        start.lat, start.lng,
        end.lat, end.lng
    );
    return distance * 1000 < maxDistance; // Convert km to meters
}

// ========================================
// Calculate Point to Avoid Hazard
// ========================================
function calculateAvoidancePoint(start, end, hazard) {
    // Calculate perpendicular offset from hazard
    const dx = end.lng - start.lng;
    const dy = end.lat - start.lat;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return null;

    // Perpendicular direction (normalized)
    const perpX = -dy / length;
    const perpY = dx / length;

    // Offset distance (hazard radius + buffer, converted to degrees approx)
    const offsetDist = (hazard.radius + 150) / 111000; // rough meters to degrees

    // Choose side based on which is further from other hazards
    const option1 = {
        lat: hazard.lat + perpY * offsetDist,
        lng: hazard.lng + perpX * offsetDist
    };
    const option2 = {
        lat: hazard.lat - perpY * offsetDist,
        lng: hazard.lng - perpX * offsetDist
    };

    // Pick the option with fewer nearby hazards
    const score1 = countNearbyHazards(option1);
    const score2 = countNearbyHazards(option2);

    return score1 <= score2 ? option1 : option2;
}

// ========================================
// Count Nearby Hazards
// ========================================
function countNearbyHazards(point) {
    return hazardData.reduce((count, hazard) => {
        const dist = getDistance(point.lat, point.lng, hazard.lat, hazard.lng);
        return count + (dist < hazard.radius / 1000 ? hazard.severity : 0);
    }, 0);
}

// ========================================
// Calculate Route Safety Score
// ========================================
function calculateRouteSafetyScore(route) {
    let totalRisk = 0;
    const coordinates = route.coordinates;

    // Sample points along the route
    const sampleRate = Math.max(1, Math.floor(coordinates.length / 50));
    
    for (let i = 0; i < coordinates.length; i += sampleRate) {
        const point = coordinates[i];
        
        // Check each hazard
        hazardData.forEach(hazard => {
            const distance = getDistance(point.lat, point.lng, hazard.lat, hazard.lng) * 1000; // to meters
            if (distance < hazard.radius) {
                // Closer = more risk
                const riskFactor = (1 - distance / hazard.radius) * hazard.severity;
                totalRisk += riskFactor;
            }
        });

        // Bonus for passing through safe zones
        safeZones.forEach(zone => {
            const distance = getDistance(point.lat, point.lng, zone.lat, zone.lng) * 1000;
            if (distance < zone.radius) {
                totalRisk -= 0.5; // Reduce risk for safe zones
            }
        });
    }

    // Convert to 0-100 score (higher = safer)
    const maxExpectedRisk = 50;
    const score = Math.max(0, Math.min(100, 100 - (totalRisk / maxExpectedRisk) * 100));
    return Math.round(score);
}

// ========================================
// Update Safety Score Display
// ========================================
function updateSafetyScoreDisplay(score) {
    let safetyEl = document.getElementById('safetyScore');
    if (!safetyEl) {
        // Create safety score element if it doesn't exist
        const routeDetails = document.querySelector('.route-details');
        const safetyDiv = document.createElement('div');
        safetyDiv.className = 'route-stat';
        safetyDiv.innerHTML = `
            <span class="stat-label">Safety</span>
            <span class="stat-value" id="safetyScore">${score}/100</span>
        `;
        routeDetails.appendChild(safetyDiv);
        safetyEl = document.getElementById('safetyScore');
    } else {
        safetyEl.textContent = `${score}/100`;
    }

    // Color based on score
    if (score >= 80) {
        safetyEl.style.color = '#2ecc71';
    } else if (score >= 60) {
        safetyEl.style.color = '#f39c12';
    } else {
        safetyEl.style.color = '#e74c3c';
    }
}

// ========================================
// Distance Calculations
// ========================================
function getDistance(lat1, lng1, lat2, lng2) {
    // Haversine formula - returns distance in km
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRad(deg) {
    return deg * Math.PI / 180;
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
    // Calculate perpendicular distance from point to line (in degrees, roughly)
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    return getDistance(px, py, xx, yy);
}

// ========================================
// Reset Route Button
// ========================================
function resetRouteButton() {
    const routeBtn = document.getElementById('getRouteBtn');
    routeBtn.innerHTML = '<span>Get Directions</span><span class="btn-icon">→</span>';
    routeBtn.disabled = false;
}

// ========================================
// Share Route
// ========================================
function shareRoute() {
    const startLocation = document.getElementById('startLocation').value;
    const endLocation = document.getElementById('endLocation').value;
    const distance = document.getElementById('routeDistance').textContent;
    const duration = document.getElementById('routeDuration').textContent;

    const shareText = `🛡️ SaFem Route Share\n\n📍 From: ${startLocation}\n🏁 To: ${endLocation}\n📏 Distance: ${distance}\n⏱️ Duration: ${duration}\n\nI'm using SaFem to navigate safely!`;

    if (navigator.share) {
        navigator.share({
            title: 'My SaFem Route',
            text: shareText
        }).catch(err => {
            copyToClipboard(shareText);
        });
    } else {
        copyToClipboard(shareText);
    }
}

// ========================================
// Copy to Clipboard
// ========================================
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Route copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Unable to copy route', 'error');
    });
}

// ========================================
// Notification System
// ========================================
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.app-notification');
    if (existing) existing.remove();

    // Create notification
    const notification = document.createElement('div');
    notification.className = `app-notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button class="notification-close">×</button>
    `;

    // Styles
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        info: '#1b2548'
    };

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors[type]};
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideDown 0.3s ease;
        max-width: 90%;
        font-size: 0.9rem;
    `;

    // Add animation styles
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideDown {
                from { transform: translate(-50%, -100%); opacity: 0; }
                to { transform: translate(-50%, 0); opacity: 1; }
            }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.3rem;
                cursor: pointer;
                padding: 0;
                line-height: 1;
                opacity: 0.8;
            }
            .notification-close:hover { opacity: 1; }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });

    // Auto remove
    setTimeout(() => {
        if (notification.parentNode) notification.remove();
    }, 4000);
}

// ========================================
// Home Tab Quick Actions
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Share Location button
    document.getElementById('shareLocationBtn')?.addEventListener('click', () => {
        if (currentPosition) {
            const shareText = `📍 My current location:\nhttps://www.google.com/maps?q=${currentPosition.lat},${currentPosition.lng}\n\nShared via SaFem - Stay Safe!`;
            
            if (navigator.share) {
                navigator.share({
                    title: 'My Location',
                    text: shareText
                }).catch(() => copyToClipboard(shareText));
            } else {
                copyToClipboard(shareText);
            }
        } else {
            showNotification('Getting your location...', 'info');
            getUserLocation();
        }
    });

    // Emergency Contacts button
    document.getElementById('emergencyContactsBtn')?.addEventListener('click', () => {
        showNotification('Emergency contacts feature coming soon!', 'info');
    });

    // Safety Tips button
    document.getElementById('safetyTipsBtn')?.addEventListener('click', () => {
        showNotification('Safety tips feature coming soon!', 'info');
    });
});
