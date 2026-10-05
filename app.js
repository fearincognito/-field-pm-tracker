
const STORAGE_KEY = "fieldPmTracker_v1";

const seed = {
  sites: [
    {
      id: crypto.randomUUID(),
      name: "Demo Nevada Site",
      notes: "Replace this with one of your real job sites.",
      equipment: []
    }
  ]
};

let state = loadState();
let currentSiteId = null;
let currentEquipmentId = null;

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : seed;
  } catch {
    return seed;
  }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}
function siteById(id) { return state.sites.find(s => s.id === id); }
function equipmentById(site, id) { return site?.equipment.find(e => e.id === id); }

function maintState(eq, m) {
  const dueAt = Number(m.lastHours) + Number(m.interval);
  const remaining = dueAt - Number(eq.currentHours || 0);
  if (remaining < 0) return {kind:"overdue", label:`Overdue by ${Math.abs(remaining).toFixed(1)} h`, dueAt, remaining};
  if (remaining <= Number(m.warning || 0)) return {kind:"warn", label:`Due in ${remaining.toFixed(1)} h`, dueAt, remaining};
  return {kind:"ok", label:`Due in ${remaining.toFixed(1)} h`, dueAt, remaining};
}
function equipmentHealth(eq) {
  if (["Archived","Out of Service"].includes(eq.status)) return {kind:"out", label:eq.status};
  const rows = (eq.maintenance || []).map(m => maintState(eq,m));
  if (rows.some(r => r.kind === "overdue")) return {kind:"overdue", label:"Maintenance overdue"};
  if (rows.some(r => r.kind === "warn")) return {kind:"warn", label:"Maintenance due soon"};
  return {kind:"ok", label: rows.length ? "Maintenance current" : "No intervals set"};
}

function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({top:0, behavior:"smooth"});
}
function escapeHtml(v="") {
  return String(v).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch]));
}

function renderDashboard() {
  const activeEquipment = state.sites.flatMap(s => s.equipment || []).filter(e => e.status !== "Archived");
  let dueSoon=0, overdue=0;
  const attention = [];
  state.sites.forEach(site => {
    (site.equipment || []).forEach(eq => {
      const health = equipmentHealth(eq);
      if (health.kind === "warn") dueSoon++;
      if (health.kind === "overdue") overdue++;
      if (["warn","overdue"].includes(health.kind)) attention.push({site,eq,health});
    });
  });

  document.getElementById("siteCount").textContent = state.sites.length;
  document.getElementById("equipmentCount").textContent = activeEquipment.length;
  document.getElementById("dueSoonCount").textContent = dueSoon;
  document.getElementById("overdueCount").textContent = overdue;

  const siteList = document.getElementById("siteList");
  siteList.innerHTML = state.sites.length ? state.sites.map(site => {
    const active = (site.equipment || []).filter(e => e.status !== "Archived").length;
    const attn = (site.equipment || []).filter(e => ["warn","overdue"].includes(equipmentHealth(e).kind)).length;
    return `<div class="card clickable" data-site-id="${site.id}">
      <div>
        <div class="card-title">${escapeHtml(site.name)}</div>
        <div class="card-sub">${active} active equipment${site.notes ? " · " + escapeHtml(site.notes) : ""}</div>
      </div>
      <div>${attn ? `<span class="badge warn">${attn} need attention</span>` : `<span class="badge ok">All clear</span>`}</div>
    </div>`;
  }).join("") : `<div class="empty">No job sites yet. Add your first site.</div>`;

  siteList.querySelectorAll("[data-site-id]").forEach(el => el.addEventListener("click", () => {
    currentSiteId = el.dataset.siteId;
    renderSite();
    showView("siteView");
  }));

  const attentionList = document.getElementById("attentionList");
  attentionList.innerHTML = attention.length ? attention.map(({site,eq,health}) => `
    <div class="card clickable" data-site="${site.id}" data-eq="${eq.id}">
      <div>
        <div class="card-title">${escapeHtml(eq.unitNumber)} · ${escapeHtml(eq.makeModel)}</div>
        <div class="card-sub">${escapeHtml(site.name)} · ${Number(eq.currentHours||0).toFixed(1)} h</div>
      </div>
      <span class="badge ${health.kind}">${health.label}</span>
    </div>`).join("") : `<div class="empty">Nothing is due soon or overdue.</div>`;

  attentionList.querySelectorAll("[data-eq]").forEach(el => el.addEventListener("click", () => {
    currentSiteId = el.dataset.site;
    currentEquipmentId = el.dataset.eq;
    renderEquipment();
    showView("equipmentView");
  }));
}

function renderSite() {
  const site = siteById(currentSiteId);
  if (!site) return;
  document.getElementById("siteTitle").textContent = site.name;
  document.getElementById("siteSubtitle").textContent = site.notes || "Equipment assigned to this site.";
  const list = document.getElementById("equipmentList");
  const equipment = site.equipment || [];
  list.innerHTML = equipment.length ? equipment.map(eq => {
    const health = equipmentHealth(eq);
    return `<div class="card clickable" data-equipment-id="${eq.id}">
      <div>
        <div class="card-title">${escapeHtml(eq.unitNumber)} · ${escapeHtml(eq.makeModel)}</div>
        <div class="card-sub">${Number(eq.currentHours||0).toFixed(1)} engine h · ${escapeHtml(eq.status)}</div>
      </div>
      <span class="badge ${health.kind}">${health.label}</span>
    </div>`;
  }).join("") : `<div class="empty">No equipment at this site yet.</div>`;

  list.querySelectorAll("[data-equipment-id]").forEach(el => el.addEventListener("click", () => {
    currentEquipmentId = el.dataset.equipmentId;
    renderEquipment();
    showView("equipmentView");
  }));
}

function renderEquipment() {
  const site = siteById(currentSiteId);
  const eq = equipmentById(site, currentEquipmentId);
  if (!eq) return;
  const health = equipmentHealth(eq);
  document.getElementById("equipmentTitle").textContent = `${eq.unitNumber} · ${eq.makeModel}`;
  document.getElementById("equipmentSubtitle").textContent = `${site.name} · ${eq.status}`;
  document.getElementById("hoursInput").value = Number(eq.currentHours || 0);
  document.getElementById("equipmentStatusBanner").innerHTML = `<div class="status-banner ${health.kind}">${health.label}</div>`;

  const details = [
    ["Serial number", eq.serialNumber],
    ["Owner / rental", eq.owner],
    ["Engine hours", `${Number(eq.currentHours||0).toFixed(1)} h`],
    ["Oil type", eq.oilType],
    ["Oil capacity", eq.oilCapacity],
    ["Oil filter", eq.oilFilter],
    ["Fuel filter", eq.fuelFilter],
    ["Air filter", eq.airFilter],
    ["Hydraulic filter", eq.hydraulicFilter],
    ["Notes", eq.notes]
  ];
  document.getElementById("equipmentDetails").innerHTML = details.map(([k,v]) =>
    `<div class="detail"><small>${k}</small><strong>${escapeHtml(v || "—")}</strong></div>`
  ).join("");

  const mList = document.getElementById("maintenanceList");
  const maintenance = eq.maintenance || [];
  mList.innerHTML = maintenance.length ? maintenance.map(m => {
    const st = maintState(eq,m);
    return `<div class="maintenance-row">
      <div>
        <strong>${escapeHtml(m.name)}</strong>
        <div class="card-sub">Every ${m.interval} h · Last at ${Number(m.lastHours).toFixed(1)} h · Next at ${st.dueAt.toFixed(1)} h</div>
      </div>
      <span class="badge ${st.kind}">${st.label}</span>
    </div>`;
  }).join("") : `<div class="empty">No maintenance intervals yet.</div>`;

  const history = [...(eq.history || [])].sort((a,b) => new Date(b.date)-new Date(a.date));
  document.getElementById("serviceHistory").innerHTML = history.length ? history.map(h => `
    <div class="history-row">
      <div>
        <strong>${escapeHtml(h.name)}</strong>
        <div class="card-sub">${escapeHtml(h.date)} · ${Number(h.hours).toFixed(1)} h${h.notes ? " · " + escapeHtml(h.notes) : ""}</div>
      </div>
    </div>`).join("") : `<div class="empty">No completed service logged yet.</div>`;
}

function renderAll() {
  renderDashboard();
  if (currentSiteId) renderSite();
  if (currentSiteId && currentEquipmentId) renderEquipment();
}

document.getElementById("addSiteBtn").addEventListener("click", () => {
  document.getElementById("siteForm").reset();
  document.getElementById("siteDialog").showModal();
});
document.getElementById("siteForm").addEventListener("submit", e => {
  e.preventDefault();
  state.sites.push({
    id: crypto.randomUUID(),
    name: document.getElementById("siteName").value.trim(),
    notes: document.getElementById("siteNotes").value.trim(),
    equipment: []
  });
  saveState();
  document.getElementById("siteDialog").close();
});

document.getElementById("addEquipmentBtn").addEventListener("click", () => openEquipmentDialog());
document.getElementById("editEquipmentBtn").addEventListener("click", () => openEquipmentDialog(true));

function openEquipmentDialog(edit=false) {
  const form = document.getElementById("equipmentForm");
  form.reset();
  document.getElementById("equipmentDialogTitle").textContent = edit ? "Edit Equipment" : "Add Equipment";
  let eq = null;
  if (edit) eq = equipmentById(siteById(currentSiteId), currentEquipmentId);
  document.getElementById("equipmentId").value = eq?.id || "";
  const fields = ["unitNumber","makeModel","serialNumber","equipmentStatus","owner","currentHours","oilType","oilCapacity","oilFilter","fuelFilter","airFilter","hydraulicFilter","equipmentNotes"];
  const map = {
    unitNumber:"unitNumber", makeModel:"makeModel", serialNumber:"serialNumber", equipmentStatus:"status",
    owner:"owner", currentHours:"currentHours", oilType:"oilType", oilCapacity:"oilCapacity",
    oilFilter:"oilFilter", fuelFilter:"fuelFilter", airFilter:"airFilter", hydraulicFilter:"hydraulicFilter", equipmentNotes:"notes"
  };
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (eq) el.value = eq[map[id]] ?? (id==="equipmentStatus" ? "Active" : "");
    else if (id==="equipmentStatus") el.value = "Active";
    else if (id==="currentHours") el.value = 0;
  });
  document.getElementById("equipmentDialog").showModal();
}
document.getElementById("equipmentForm").addEventListener("submit", e => {
  e.preventDefault();
  const site = siteById(currentSiteId);
  const id = document.getElementById("equipmentId").value;
  const existing = id ? equipmentById(site,id) : null;
  const obj = {
    id: id || crypto.randomUUID(),
    unitNumber: document.getElementById("unitNumber").value.trim(),
    makeModel: document.getElementById("makeModel").value.trim(),
    serialNumber: document.getElementById("serialNumber").value.trim(),
    status: document.getElementById("equipmentStatus").value,
    owner: document.getElementById("owner").value.trim(),
    currentHours: Number(document.getElementById("currentHours").value || 0),
    oilType: document.getElementById("oilType").value.trim(),
    oilCapacity: document.getElementById("oilCapacity").value.trim(),
    oilFilter: document.getElementById("oilFilter").value.trim(),
    fuelFilter: document.getElementById("fuelFilter").value.trim(),
    airFilter: document.getElementById("airFilter").value.trim(),
    hydraulicFilter: document.getElementById("hydraulicFilter").value.trim(),
    notes: document.getElementById("equipmentNotes").value.trim(),
    maintenance: existing?.maintenance || [],
    history: existing?.history || []
  };
  if (existing) Object.assign(existing,obj); else site.equipment.push(obj);
  currentEquipmentId = obj.id;
  saveState();
  document.getElementById("equipmentDialog").close();
  renderEquipment();
  showView("equipmentView");
});

document.getElementById("hoursForm").addEventListener("submit", e => {
  e.preventDefault();
  const eq = equipmentById(siteById(currentSiteId), currentEquipmentId);
  eq.currentHours = Number(document.getElementById("hoursInput").value || 0);
  saveState();
});

document.getElementById("addMaintenanceBtn").addEventListener("click", () => {
  const eq = equipmentById(siteById(currentSiteId), currentEquipmentId);
  document.getElementById("maintenanceForm").reset();
  document.getElementById("maintenanceInterval").value = 250;
  document.getElementById("maintenanceWarning").value = 50;
  document.getElementById("maintenanceLastHours").value = Number(eq.currentHours || 0);
  document.getElementById("maintenanceDialog").showModal();
});
document.getElementById("maintenanceForm").addEventListener("submit", e => {
  e.preventDefault();
  const eq = equipmentById(siteById(currentSiteId), currentEquipmentId);
  eq.maintenance = eq.maintenance || [];
  eq.maintenance.push({
    id: crypto.randomUUID(),
    name: document.getElementById("maintenanceName").value.trim(),
    interval: Number(document.getElementById("maintenanceInterval").value),
    lastHours: Number(document.getElementById("maintenanceLastHours").value),
    warning: Number(document.getElementById("maintenanceWarning").value || 0)
  });
  saveState();
  document.getElementById("maintenanceDialog").close();
});

document.getElementById("logServiceBtn").addEventListener("click", () => {
  const eq = equipmentById(siteById(currentSiteId), currentEquipmentId);
  const select = document.getElementById("serviceMaintenanceId");
  select.innerHTML = (eq.maintenance || []).map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join("");
  if (!select.options.length) {
    alert("Add a maintenance interval first.");
    return;
  }
  document.getElementById("serviceHours").value = Number(eq.currentHours || 0);
  document.getElementById("serviceDate").value = new Date().toISOString().slice(0,10);
  document.getElementById("serviceNotes").value = "";
  document.getElementById("serviceDialog").showModal();
});
document.getElementById("serviceForm").addEventListener("submit", e => {
  e.preventDefault();
  const eq = equipmentById(siteById(currentSiteId), currentEquipmentId);
  const m = (eq.maintenance || []).find(x => x.id === document.getElementById("serviceMaintenanceId").value);
  const hours = Number(document.getElementById("serviceHours").value);
  const date = document.getElementById("serviceDate").value;
  const notes = document.getElementById("serviceNotes").value.trim();
  if (m) m.lastHours = hours;
  eq.history = eq.history || [];
  eq.history.push({id:crypto.randomUUID(), maintenanceId:m?.id, name:m?.name || "Service", hours, date, notes});
  if (hours > Number(eq.currentHours||0)) eq.currentHours = hours;
  saveState();
  document.getElementById("serviceDialog").close();
});

document.querySelectorAll("[data-back]").forEach(btn => btn.addEventListener("click", () => {
  const target = btn.dataset.back;
  if (target === "siteView") renderSite();
  if (target === "dashboardView") renderDashboard();
  showView(target);
}));

document.getElementById("exportBtn").addEventListener("click", exportBackup);
function exportBackup() {
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `field-pm-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importInput").click());
document.getElementById("importInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.sites)) throw new Error("Invalid backup");
    state = data;
    currentSiteId = null;
    currentEquipmentId = null;
    saveState();
    showView("dashboardView");
  } catch {
    alert("That backup file could not be imported.");
  }
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

renderAll();
