// Global State --------------------------------------------------
const statuses = [
  "Readiness Received",
  "Cargo Details Requested",
  "Quote Requested",
  "Quote Received",
  "Awarded",
  "Collection Scheduled",
  "Collected",
  "In Transit",
  "Delivered",
];

const documentTypes = [
  "Commercial Invoice",
  "Packing List",
  "Chamber Attested Certificate of Origin",
  "Export License",
  "Air Waybill (AWB) / Bill of Lading (B/L)",
  "Booking Confirmation",
  "Customs Declaration",
  "Cargo Readiness Notice",
];

let shipments = [];
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
    tracking_updates: [
      { date: "2025-11-19", location: "Port of Shanghai", status: "Departed" },
      { date: "2025-11-26", location: "Singapore Port", status: "In Transit" },
    ],
    documents: {},
  },
  {
    shipment_id: "SHIP-2025-10-002",
    mode: "Air Freight",
    incoterm: "EXW",
    status: "Collected",
    readiness_date: "2025-11-08",
    shipper_name: "TechSupply Inc.",
    shipper_country: "Germany",
    cargo_description: "Electronic Components",
    weight_kg: 450,
    volume_cbm: 3.5,
    freight_forwarder: "AirCargo Express",
    collection_date: "2025-11-05",
    flight_number: "LH8952",
    airline: "Lufthansa Cargo",
    departure_date: "2025-11-06",
    eta: "2025-11-07",
    documents: {},
  },
  {
    shipment_id: "SHIP-2025-10-003",
    mode: "Sea Freight",
    incoterm: "EXW",
    status: "Cargo Details Requested",
    readiness_date: "2025-11-25",
    shipper_name: "Euro Metals Ltd.",
    shipper_country: "Italy",
    cargo_description: "Steel Components",
    weight_kg: 5000,
    freight_forwarder: "OceanWide Shipping",
    documents: {},
  },
  {
    shipment_id: "SHIP-2025-10-004",
    mode: "Air Freight",
    incoterm: "EXW",
    status: "Quote Requested",
    readiness_date: "2025-11-18",
    shipper_name: "Precision Tools GmbH",
    shipper_country: "Germany",
    cargo_description: "Precision Machinery Tools",
    weight_kg: 800,
    volume_cbm: 5,
    documents: {},
  },
  {
    shipment_id: "SHIP-2025-10-005",
    mode: "Sea Freight",
    incoterm: "EXW",
    status: "Collection Scheduled",
    readiness_date: "2025-11-20",
    shipper_name: "Asian Textiles Co.",
    shipper_country: "Vietnam",
    cargo_description: "Textile Materials",
    weight_kg: 3200,
    volume_cbm: 18,
    freight_forwarder: "SeaTrans Logistics",
    collection_date: "2025-11-19",
    container_number: "HLCU9876543",
    documents: {},
  },
];

// DOM Helpers ------------------------------------------------------
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// Navigation -------------------------------------------------------
qsa(".nav-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const target = link.dataset.target;
    showView(target);
    qsa(".nav-link").forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
  });
});

function showView(id) {
  qsa(".view-section").forEach((sec) => sec.classList.add("hidden"));
  qs(`#${id}`).classList.remove("hidden");
  if (id === "dashboard-view") loadDashboard();
  if (id === "list-view") renderShipmentsTable();
  if (id === "documents-view") renderDocumentsTable();
  if (id === "calendar-view") renderCalendar();
}

// Dashboard --------------------------------------------------------
function loadDashboard() {
  const summary = {
    total: shipments.length,
    pending_collection: shipments.filter((s) => s.status === "Collection Scheduled").length,
    in_transit: shipments.filter((s) => s.status === "In Transit").length,
    need_tracking: shipments.filter(
      (s) => s.mode === "Sea Freight" && s.status === "In Transit"
    ).length,
    upcoming_readiness: shipments.filter((s) => daysUntil(s.readiness_date) <= 14).length,
  };

  const cardCfg = [
    { label: "Total Active Shipments", key: "total", color: "var(--color-bg-3)" },
    { label: "Pending Collection", key: "pending_collection", color: "var(--color-bg-4)" },
    { label: "In Transit", key: "in_transit", color: "var(--color-bg-7)" },
    { label: "Need 7-Day Tracking", key: "need_tracking", color: "var(--color-bg-6)" },
    { label: "Upcoming Readiness", key: "upcoming_readiness", color: "var(--color-bg-1)" },
  ];

  const cardsEl = qs("#summary-cards");
  cardsEl.innerHTML = "";
  cardCfg.forEach(({ label, key, color }) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<div class="card__body" style="background:${color}">
      <h4>${label}</h4>
      <h2>${summary[key]}</h2>
    </div>`;
    cardsEl.appendChild(card);
  });

  // Upcoming tasks (next 14 days) ---------------------------------
  const tbody = qs("#upcoming-table tbody");
  tbody.innerHTML = "";
  shipments.forEach((s) => {
    const dueDate = new Date(s.readiness_date);
    dueDate.setDate(dueDate.getDate() - 14);
    if (daysUntil(dueDate) >= 0 && daysUntil(dueDate) <= 14) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${s.shipment_id}</td><td>Request Cargo Details</td><td>${formatDate(dueDate)}</td>`;
      tbody.appendChild(tr);
    }
  });

  // Charts ---------------------------------------------------------
  renderCharts();
}

function renderCharts() {
  // Status Distribution Pie
  const ctxStatus = qs("#statusChart");
  if (ctxStatus._chart) ctxStatus._chart.destroy();
  const statusCount = statuses.map((st) => shipments.filter((s) => s.status === st).length);
  ctxStatus._chart = new Chart(ctxStatus, {
    type: "pie",
    data: {
      labels: statuses,
      datasets: [
        {
          data: statusCount,
          backgroundColor: [
            "#1FB8CD",
            "#FFC185",
            "#B4413C",
            "#ECEBD5",
            "#5D878F",
            "#DB4545",
            "#D2BA4C",
            "#964325",
            "#13343B",
          ],
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });

  // Monthly Volume Bar --------------------------------------------
  const ctxVol = qs("#volumeChart");
  if (ctxVol._chart) ctxVol._chart.destroy();
  const monthMap = {};
  shipments.forEach((s) => {
    const m = s.readiness_date.slice(0, 7); // YYYY-MM
    monthMap[m] = (monthMap[m] || 0) + 1;
  });
  const months = Object.keys(monthMap).sort();
  const counts = months.map((m) => monthMap[m]);

  ctxVol._chart = new Chart(ctxVol, {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        {
          label: "Shipments",
          data: counts,
          backgroundColor: "var(--color-primary)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, precision: 0 } },
    },
  });
}

// Shipments Table --------------------------------------------------
function renderShipmentsTable() {
  // Populate filter dropdown statuses
  const statusFilter = qs("#filter-status");
  if (!statusFilter._populated) {
    statuses.forEach((st) => {
      const opt = document.createElement("option");
      opt.value = st;
      opt.textContent = st;
      statusFilter.appendChild(opt);
    });
    statusFilter._populated = true;
  }

  const tbody = qs("#shipments-table tbody");
  tbody.innerHTML = "";

  // Apply filters
  const modeVal = qs("#filter-mode").value;
  const statusVal = statusFilter.value;
  const searchVal = qs("#search-input").value.toLowerCase();

  shipments
    .filter((s) => (modeVal ? s.mode === modeVal : true))
    .filter((s) => (statusVal ? s.status === statusVal : true))
    .filter((s) => s.shipment_id.toLowerCase().includes(searchVal))
    .forEach((s, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.shipment_id}</td>
        <td>${s.mode}</td>
        <td><span class="status-badge status-${s.status.replace(/ /g, "\\ ")}">${s.status}</span></td>
        <td>${safeDate(s.readiness_date)}</td>
        <td>${safeDate(s.collection_date)}</td>
        <td>${safeDate(s.eta)}</td>
        <td>
          <button class="btn btn--sm btn--secondary" data-action="view" data-idx="${idx}">View</button>
          <button class="btn btn--sm btn--outline" data-action="delete" data-idx="${idx}">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });

  // Event delegation for actions -----------------------------------
  tbody.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      const action = btn.dataset.action;
      if (action === "view") {
        showShipmentDetail(idx);
      } else if (action === "delete") {
        if (confirm("Delete this shipment?")) {
          shipments.splice(idx, 1);
          renderShipmentsTable();
          showToast("Shipment deleted.");
        }
      }
    });
  });
}

qs("#filter-mode").addEventListener("change", renderShipmentsTable);
qs("#filter-status").addEventListener("change", renderShipmentsTable);
qs("#search-input").addEventListener("input", renderShipmentsTable);

// Shipment Detail --------------------------------------------------
function showShipmentDetail(idx) {
  const s = shipments[idx];
  const detail = qs("#detail-view");
  detail.innerHTML = `<button class="btn btn--secondary mb-8" id="back-btn">← Back</button>
  <h2 class="mb-8">Shipment ${s.shipment_id}</h2>
  <div class="card mb-8"><div class="card__body"><h3>Basic Info</h3>
    <p><strong>Mode:</strong> ${s.mode}</p>
    <p><strong>Status:</strong> ${s.status}</p>
    <p><strong>Shipper:</strong> ${s.shipper_name} (${s.shipper_country})</p>
    <p><strong>Cargo:</strong> ${s.cargo_description}</p>
  </div></div>
  <div class="card mb-8"><div class="card__body"><h3>Timeline</h3>
    ${buildTimeline(s)}
  </div></div>`;

  qs("#back-btn").addEventListener("click", () => showView("list-view"));
  showView("detail-view");
}

function buildTimeline(s) {
  const items = [];
  items.push({ label: "Readiness Date", date: s.readiness_date });
  if (s.collection_date) items.push({ label: "Collection", date: s.collection_date });
  if (s.sailing_date) items.push({ label: "Sailing", date: s.sailing_date });
  if (s.departure_date) items.push({ label: "Flight Departure", date: s.departure_date });
  if (s.eta) items.push({ label: "ETA", date: s.eta });
  return (
    '<ul>' +
    items
      .map(
        (i) =>
          `<li><strong>${i.label}:</strong> ${safeDate(i.date)} (${daysUntil(i.date)} days)</li>`
      )
      .join("") +
    '</ul>'
  );
}

// Add Shipment (Multi-Step) ---------------------------------------
const formSteps = [
  {
    title: "Basic Shipment Information",
    fields: [
      { label: "Shipment Mode", id: "mode", type: "select", options: ["Air Freight", "Sea Freight"] },
      { label: "Readiness Date", id: "readiness_date", type: "date" },
      { label: "Status", id: "status", type: "select", options: statuses },
    ],
  },
  {
    title: "Shipper Details",
    fields: [
      { label: "Shipper Name", id: "shipper_name" },
      { label: "Shipper Address", id: "shipper_address" },
      { label: "Shipper Contact", id: "shipper_contact" },
      { label: "Shipper Country", id: "shipper_country" },
    ],
  },
  {
    title: "Cargo Details",
    fields: [
      { label: "Cargo Description", id: "cargo_description" },
      { label: "HS Code", id: "hs_code" },
      { label: "Gross Weight (Kg)", id: "weight_kg", type: "number" },
      { label: "Volume (CBM)", id: "volume_cbm", type: "number" },
      { label: "Number of Packages", id: "packages", type: "number" },
      { label: "Special Handling", id: "special_handling" },
    ],
  },
];

let currentStep = 0;
const addForm = qs("#add-shipment-form");
const stepsEl = qs("#form-steps");
qs("#next-step").addEventListener("click", nextStep);
qs("#prev-step").addEventListener("click", prevStep);

function renderCurrentStep() {
  const step = formSteps[currentStep];
  stepsEl.innerHTML = `<h3 class="mb-8">${step.title}</h3>`;
  step.fields.forEach((f) => {
    const div = document.createElement("div");
    div.className = "form-group";
    div.innerHTML = `<label class="form-label" for="${f.id}">${f.label}</label>`;
    if (f.type === "select") {
      const sel = document.createElement("select");
      sel.id = f.id;
      sel.className = "form-control";
      f.options.forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt;
        o.textContent = opt;
        sel.appendChild(o);
      });
      div.appendChild(sel);
    } else {
      const inp = document.createElement("input");
      inp.type = f.type || "text";
      inp.id = f.id;
      inp.className = "form-control";
      div.appendChild(inp);
    }
    stepsEl.appendChild(div);
  });
  qs("#prev-step").disabled = currentStep === 0;
  qs("#next-step").textContent = currentStep === formSteps.length - 1 ? "Save" : "Next";
}

function nextStep() {
  if (currentStep < formSteps.length - 1) {
    currentStep++;
    renderCurrentStep();
  } else {
    saveShipment();
  }
}

function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    renderCurrentStep();
  }
}

function saveShipment() {
  // Simple validation: ensure readiness_date exists
  const readiness = qs("#readiness_date").value;
  if (!readiness) {
    alert("Readiness date required");
    return;
  }
  const shipment = {
    shipment_id: generateShipmentID(),
    incoterm: "EXW",
  };
  formSteps.forEach((step) => {
    step.fields.forEach((f) => {
      shipment[f.id] = qs(`#${f.id}`).value;
    });
  });
  shipment.status = shipment.status || "Readiness Received";
  shipments.push(shipment);
  showToast("Shipment added.");
  currentStep = 0;
  renderCurrentStep();
  showView("dashboard-view");
}

function generateShipmentID() {
  const dt = new Date();
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const seq = String(shipments.length + 1).padStart(3, "0");
  return `SHIP-${yyyy}-${mm}-${seq}`;
}

// Calendar ---------------------------------------------------------
function renderCalendar() {
  const cal = qs("#calendar");
  cal.innerHTML = "";
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const startDay = first.getDay();

  // Blank days before 1st
  for (let i = 0; i < startDay; i++) cal.appendChild(blankDay());
  // Days of month
  for (let d = 1; d <= last.getDate(); d++) {
    const date = new Date(today.getFullYear(), today.getMonth(), d);
    cal.appendChild(calendarDay(date));
  }
}

function blankDay() {
  const div = document.createElement("div");
  div.className = "calendar-day";
  return div;
}

function calendarDay(date) {
  const div = document.createElement("div");
  div.className = "calendar-day";
  div.innerHTML = `<div class="calendar-day-number">${date.getDate()}</div>`;
  // Events
  shipments.forEach((s) => {
    const events = [
      { type: "readiness", date: s.readiness_date },
      { type: "collection", date: s.collection_date },
      { type: "sailing", date: s.sailing_date },
      { type: "arrival", date: s.eta },
    ];
    events.forEach((ev) => {
      if (ev.date && isSameDay(ev.date, date)) {
        const span = document.createElement("div");
        span.className = `calendar-event event-${ev.type}`;
        span.textContent = `${s.shipment_id} – ${ev.type}`;
        div.appendChild(span);
      }
    });
  });
  return div;
}

// Documents --------------------------------------------------------
function renderDocumentsTable() {
  const tbody = qs("#documents-table tbody");
  tbody.innerHTML = "";
  shipments.forEach((s) => {
    documentTypes.forEach((doc) => {
      const tr = document.createElement("tr");
      const isReceived = s.documents?.[doc];
      tr.innerHTML = `<td>${s.shipment_id}</td><td>${doc}</td><td>
          <input type="checkbox" data-ship="${s.shipment_id}" data-doc="${doc}" ${
        isReceived ? "checked" : ""
      }></td>`;
      tbody.appendChild(tr);
    });
  });
  // Handle checkbox updates
  tbody.querySelectorAll("input[type='checkbox']").forEach((cb) => {
    cb.addEventListener("change", () => {
      const ship = shipments.find((s) => s.shipment_id === cb.dataset.ship);
      if (!ship.documents) ship.documents = {};
      ship.documents[cb.dataset.doc] = cb.checked;
    });
  });
}

// Helpers ----------------------------------------------------------
function daysUntil(dateStr) {
  if (!dateStr) return "–";
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(d) {
  return new Date(d).toISOString().split("T")[0];
}

function safeDate(d) {
  return d ? formatDate(d) : "–";
}

function isSameDay(dateStr, dateObj) {
  const d = new Date(dateStr);
  return d.getFullYear() === dateObj.getFullYear() && d.getMonth() === dateObj.getMonth() && d.getDate() === dateObj.getDate();
}

function showToast(msg) {
  const toast = qs("#toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3000);
}

// Init -------------------------------------------------------------
renderCurrentStep();
showView("dashboard-view");
