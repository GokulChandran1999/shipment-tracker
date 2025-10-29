// EXW Shipment Tracking System - FIXED VERSION
// This version properly handles form submissions and saves data

// Global State
const statuses = [
  "Readiness Received",
  "Cargo Details Requested", 
  "Quote Requested",
  "Quote Received",
  "Awarded",
  "Collection Scheduled",
  "Collected",
  "In Transit",
  "Delivered"
];

const documentTypes = [
  "Commercial Invoice",
  "Packing List",
  "Chamber Attested Certificate of Origin",
  "Export License",
  "Air Waybill (AWB) / Bill of Lading (B/L)",
  "Booking Confirmation",
  "Customs Declaration",
  "Cargo Readiness Notice"
];

// Initialize shipments from localStorage or use sample data
let shipments = loadShipmentsFromStorage();

function loadShipmentsFromStorage() {
  const stored = localStorage.getItem('exw_shipments');
  if (stored) {
    return JSON.parse(stored);
  }
  // Return sample data ONLY if nothing in storage
  return [
    {
      shipment_id: "SHIP-2025-10-001",
      mode: "Sea Freight",
      incoterm: "EXW",
      status: "In Transit",
      readiness_date: "2025-11-15",
      shipper_name: "Global Manufacturing Co.",
      shipper_country: "China",
      cargo_description: "Industrial Equipment Parts",
      weight_kg: 2500,
      volume_cbm: 12,
      freight_forwarder: "FastShip Logistics",
      collection_date: "2025-11-10",
      container_number: "MSCU1234567",
      vessel_name: "MSC Aurora",
      sailing_date: "2025-11-12",
      eta: "2025-12-05",
      tracking_updates: [],
      documents: {}
    }
  ];
}

function saveShipmentsToStorage() {
  localStorage.setItem('exw_shipments', JSON.stringify(shipments));
  console.log('Shipments saved to storage:', shipments.length);
}

// DOM Helpers
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('App initialized');
  initializeApp();
});

function initializeApp() {
  setupNavigation();
  setupFormHandlers();
  loadDashboard();
}

// Navigation
function setupNavigation() {
  qsa(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.dataset.target;
      showView(target);
      qsa(".nav-link").forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });
}

function showView(id) {
  qsa(".view-section").forEach((sec) => sec.classList.add("hidden"));
  const targetView = qs(`#${id}`);
  if (targetView) {
    targetView.classList.remove("hidden");
  }

  if (id === "dashboard-view") loadDashboard();
  if (id === "list-view") renderShipmentsTable();
  if (id === "add-view") setupAddShipmentForm();
  if (id === "documents-view") renderDocumentsTable();
  if (id === "calendar-view") renderCalendar();
}

// Setup Add Shipment Form
function setupAddShipmentForm() {
  const form = qs('#add-shipment-form');
  if (!form) return;

  // Remove existing listener
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);

  // Add submit handler
  newForm.addEventListener('submit', handleFormSubmit);

  // Setup mode-specific fields toggle
  const modeSelect = qs('#mode', newForm);
  if (modeSelect) {
    modeSelect.addEventListener('change', toggleModeFields);
  }
}

function handleFormSubmit(e) {
  e.preventDefault();
  console.log('Form submitted');

  const formData = new FormData(e.target);

  // Generate new shipment ID
  const shipmentId = generateShipmentId();

  // Create shipment object
  const newShipment = {
    shipment_id: shipmentId,
    mode: formData.get('mode') || 'Air Freight',
    incoterm: 'EXW',
    status: formData.get('status') || 'Readiness Received',
    readiness_date: formData.get('readiness_date'),
    shipper_name: formData.get('shipper_name'),
    shipper_address: formData.get('shipper_address'),
    shipper_contact: formData.get('shipper_contact'),
    shipper_country: formData.get('shipper_country'),
    cargo_description: formData.get('cargo_description'),
    hs_code: formData.get('hs_code'),
    weight_kg: parseFloat(formData.get('weight_kg')) || 0,
    volume_cbm: parseFloat(formData.get('volume_cbm')) || 0,
    packages: parseInt(formData.get('packages')) || 0,
    freight_forwarder: formData.get('freight_forwarder'),
    quote_amount: parseFloat(formData.get('quote_amount')) || 0,
    collection_date: formData.get('collection_date'),
    tracking_updates: [],
    documents: {}
  };

  // Add mode-specific fields
  const mode = formData.get('mode');
  if (mode === 'Air Freight') {
    newShipment.flight_number = formData.get('flight_number');
    newShipment.airline = formData.get('airline');
    newShipment.departure_date = formData.get('departure_date');
  } else {
    newShipment.container_number = formData.get('container_number');
    newShipment.vessel_name = formData.get('vessel_name');
    newShipment.sailing_date = formData.get('sailing_date');
  }

  newShipment.eta = formData.get('eta');

  // Add to shipments array
  shipments.push(newShipment);

  // Save to storage
  saveShipmentsToStorage();

  console.log('New shipment added:', newShipment);

  // Reset form
  e.target.reset();

  // Show success message
  alert(`Shipment ${shipmentId} added successfully!`);

  // Refresh dashboard
  showView('dashboard-view');
  qs('[data-target="dashboard-view"]').click();
}

function generateShipmentId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const count = String(shipments.length + 1).padStart(3, '0');
  return `SHIP-${year}-${month}-${count}`;
}

function toggleModeFields() {
  const mode = qs('#mode').value;
  const airFields = qs('#air-freight-fields');
  const seaFields = qs('#sea-freight-fields');

  if (airFields && seaFields) {
    if (mode === 'Air Freight') {
      airFields.style.display = 'block';
      seaFields.style.display = 'none';
    } else {
      airFields.style.display = 'none';
      seaFields.style.display = 'block';
    }
  }
}

// Dashboard
function loadDashboard() {
  const summary = {
    total: shipments.length,
    pending_collection: shipments.filter(s => s.status === "Collection Scheduled").length,
    in_transit: shipments.filter(s => s.status === "In Transit").length,
    need_tracking: shipments.filter(s => s.mode === "Sea Freight" && s.status === "In Transit").length,
    upcoming_readiness: shipments.filter(s => daysUntil(s.readiness_date) <= 14).length
  };

  const cardCfg = [
    { label: "Total Active Shipments", key: "total" },
    { label: "Pending Collection", key: "pending_collection" },
    { label: "In Transit", key: "in_transit" },
    { label: "Need 7-Day Tracking", key: "need_tracking" },
    { label: "Upcoming Readiness", key: "upcoming_readiness" }
  ];

  const cardsEl = qs("#summary-cards");
  if (cardsEl) {
    cardsEl.innerHTML = "";
    cardCfg.forEach(({ label, key }) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `<h3>${summary[key]}</h3><p>${label}</p>`;
      cardsEl.appendChild(card);
    });
  }

  renderRecentShipments();
  renderAlerts();
}

function renderRecentShipments() {
  const container = qs("#recent-shipments");
  if (!container) return;

  const recent = shipments.slice(-5).reverse();

  container.innerHTML = recent.map(s => `
    <div class="shipment-card">
      <h4>${s.shipment_id}</h4>
      <p><strong>Mode:</strong> ${s.mode}</p>
      <p><strong>Status:</strong> <span class="status-badge">${s.status}</span></p>
      <p><strong>Shipper:</strong> ${s.shipper_name}</p>
      <p><strong>ETA:</strong> ${formatDate(s.eta)}</p>
    </div>
  `).join('');
}

function renderAlerts() {
  const container = qs("#alerts-container");
  if (!container) return;

  const alerts = [];

  // Check for upcoming cargo details requests
  shipments.forEach(s => {
    const daysTo = daysUntil(s.readiness_date);
    if (daysTo === 14) {
      alerts.push({
        type: 'warning',
        message: `Cargo details request due for ${s.shipment_id} (Readiness: ${formatDate(s.readiness_date)})`
      });
    }
  });

  if (alerts.length === 0) {
    container.innerHTML = '<p class="no-alerts">No alerts at this time</p>';
  } else {
    container.innerHTML = alerts.map(a => `
      <div class="alert alert-${a.type}">${a.message}</div>
    `).join('');
  }
}

// Shipments Table
function renderShipmentsTable() {
  const container = qs("#shipments-table-container");
  if (!container) return;

  if (shipments.length === 0) {
    container.innerHTML = '<p>No shipments yet. Click "Add Shipment" to create your first one.</p>';
    return;
  }

  const html = `
    <table class="shipments-table">
      <thead>
        <tr>
          <th>Shipment ID</th>
          <th>Mode</th>
          <th>Status</th>
          <th>Shipper</th>
          <th>Readiness</th>
          <th>Collection</th>
          <th>ETA</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${shipments.map(s => `
          <tr>
            <td>${s.shipment_id}</td>
            <td>${s.mode}</td>
            <td><span class="status-badge">${s.status}</span></td>
            <td>${s.shipper_name}</td>
            <td>${formatDate(s.readiness_date)}</td>
            <td>${formatDate(s.collection_date)}</td>
            <td>${formatDate(s.eta)}</td>
            <td>
              <button onclick="viewShipmentDetails('${s.shipment_id}')" class="btn-small">View</button>
              <button onclick="deleteShipment('${s.shipment_id}')" class="btn-small btn-danger">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

function viewShipmentDetails(id) {
  const shipment = shipments.find(s => s.shipment_id === id);
  if (!shipment) return;

  let details = `
SHIPMENT DETAILS
================

ID: ${shipment.shipment_id}
Mode: ${shipment.mode}
Status: ${shipment.status}
Incoterm: ${shipment.incoterm}

SHIPPER INFORMATION
==================
Name: ${shipment.shipper_name}
Country: ${shipment.shipper_country}
Address: ${shipment.shipper_address || 'N/A'}
Contact: ${shipment.shipper_contact || 'N/A'}

CARGO DETAILS
=============
Description: ${shipment.cargo_description}
HS Code: ${shipment.hs_code || 'N/A'}
Weight: ${shipment.weight_kg} kg
Volume: ${shipment.volume_cbm} CBM
Packages: ${shipment.packages || 'N/A'}

DATES
=====
Readiness: ${formatDate(shipment.readiness_date)}
Collection: ${formatDate(shipment.collection_date)}
ETA: ${formatDate(shipment.eta)}

FREIGHT DETAILS
===============
Forwarder: ${shipment.freight_forwarder || 'N/A'}
`;

  if (shipment.mode === 'Air Freight') {
    details += `Flight: ${shipment.flight_number || 'N/A'}
Airline: ${shipment.airline || 'N/A'}
Departure: ${formatDate(shipment.departure_date)}`;
  } else {
    details += `Container: ${shipment.container_number || 'N/A'}
Vessel: ${shipment.vessel_name || 'N/A'}
Sailing: ${formatDate(shipment.sailing_date)}`;
  }

  alert(details);
}

function deleteShipment(id) {
  if (!confirm(`Are you sure you want to delete shipment ${id}?`)) return;

  const index = shipments.findIndex(s => s.shipment_id === id);
  if (index > -1) {
    shipments.splice(index, 1);
    saveShipmentsToStorage();
    renderShipmentsTable();
    loadDashboard();
    alert('Shipment deleted successfully');
  }
}

// Documents Table
function renderDocumentsTable() {
  const container = qs("#documents-table-container");
  if (!container) return;

  const html = `
    <table class="documents-table">
      <thead>
        <tr>
          <th>Shipment ID</th>
          <th>Shipper</th>
          ${documentTypes.map(dt => `<th>${dt}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${shipments.map(s => `
          <tr>
            <td>${s.shipment_id}</td>
            <td>${s.shipper_name}</td>
            ${documentTypes.map(dt => {
              const hasDoc = s.documents && s.documents[dt];
              return `<td>${hasDoc ? '✅' : '❌'}</td>`;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

// Calendar
function renderCalendar() {
  const container = qs("#calendar-container");
  if (!container) return;

  container.innerHTML = '<div class="calendar-placeholder"><h3>Calendar View</h3><p>Upcoming events and deadlines will be displayed here.</p></div>';
}

// Utility Functions
function daysUntil(dateStr) {
  if (!dateStr) return 999;
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = target - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Export function
function exportToCSV() {
  const csv = [
    ['Shipment ID', 'Mode', 'Status', 'Shipper', 'Country', 'Cargo', 'Weight (kg)', 'Volume (CBM)', 'Readiness Date', 'Collection Date', 'ETA'],
    ...shipments.map(s => [
      s.shipment_id,
      s.mode,
      s.status,
      s.shipper_name,
      s.shipper_country,
      s.cargo_description,
      s.weight_kg,
      s.volume_cbm,
      s.readiness_date,
      s.collection_date,
      s.eta
    ])
  ].map(row => row.join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shipments_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

// Clear sample data function
function clearAllData() {
  if (!confirm('Are you sure you want to clear ALL shipment data? This cannot be undone!')) return;

  shipments = [];
  saveShipmentsToStorage();
  loadDashboard();
  renderShipmentsTable();
  alert('All data cleared successfully');
}

console.log('EXW Shipment Tracker loaded successfully');
