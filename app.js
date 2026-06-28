const STORAGE_KEY = "ekzen-servis-takip-v1";
const CLOUD_STATE_PATH = "servis_takip_v2/state";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyArRO3GilYemYHX8sJdzNqv-uG7V6LsskQ",
  authDomain: "ekzen-teknik.firebaseapp.com",
  databaseURL: "https://ekzen-teknik-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ekzen-teknik",
  storageBucket: "ekzen-teknik.firebasestorage.app",
  messagingSenderId: "199852526862",
  appId: "1:199852526862:web:5b2efb44f0a26ca76f5b5f",
};

const brands = ["Alarko", "Altus", "Arçelik", "Ariston", "Beko", "Bosch", "Demirdöküm", "Lg", "Miele", "Profilo", "Protherm", "Regal", "Samsung", "Seg", "Siemens", "Vaillant", "Vestel"];
const devices = ["Aspiratör", "Bulaşık Makinası", "Buzdolabı", "Çamaşır Makinası", "Davlumbaz", "Derin Dondurucu", "Fırın", "Kazan", "Klima", "Kombi", "Kurutma Makinası", "Mikrodalga", "Ocak", "Su Sebili", "Süpürge", "Şofben", "Televizyon", "Termosifon", "Vrf"];
const statuses = ["Yeni Kayıt", "İşlemde", "Ödeme Bekliyor", "İşlem Tamam", "Geri Dönen İş", "İptal", "Atölyede Tamir Ediliyor", "Atölyeye Aldır (Nakliye Gönder)", "Atölyeye Alındı", "Beklemede", "Cihaz Tamir Edilemiyor", "Cihaz Teslim Edildi", "Farklı Teknisyen Yönlendirildi", "Fiyatta Anlaşılamadı", "Haber Verecek", "Hesap Kapatıldı", "Müşteri Cihazı Atölyeye Getirdi", "Müşteri İptal Etti", "Müşteriye Ulaşılamadı", "Nakliyede", "Parça Bekleniyor", "Parçası Atölyeye Alındı", "Servis Sonlandırıldı", "Teknisyen Yönlendirildi", "Teslimata Hazır (Tamamlandı)", "Ürün Garantili Çıktı", "Yerinde Bakım Yapıldı"];
const sources = ["Korkmaz Teknik", "Sedef Teknik", "Kendi İşim", "Diğer", "İnternet Reklamı", "İsa Tuncay", "Servis Pazarı"];
const cities = ["Ankara", "İstanbul", "Adana", "Antalya", "Bursa", "İzmir", "Kocaeli", "Konya", "Samsun"];
const dashboardCounters = ["Bugün", "Yarın", "Açık Fişler", "Ödeme Bekliyor", "İşlemde", "Yeni Kayıt", "İşlem Tamam", "Geri Dönen İş", "Toplam Servis"];
const defaultSettings = { brands, devices, statuses, sources, cities, dashboardCounters };
const settingsLabels = {
  sources: "Servis Kaynakları",
  statuses: "Servis Durumları",
  dashboardCounters: "Ana Sayfa Sayaçları",
  brands: "Markalar",
  devices: "Cihaz Türleri",
  cities: "İller",
};

const today = new Date();
const isoToday = toIsoDate(today);
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

let state = migrateState(loadState());
let currentView = "dashboard";
let activeDetailId = null;
let activeDashboardStat = "";
let activeDashboardSource = "";
let cloudRef = null;
let cloudReady = false;
let cloudApplyingState = false;
let cloudInitialHandled = false;

const views = {
  dashboard: document.querySelector("#dashboardView"),
  services: document.querySelector("#servicesView"),
  customers: document.querySelector("#customersView"),
  sources: document.querySelector("#sourcesView"),
  cash: document.querySelector("#cashView"),
  settings: document.querySelector("#settingsView"),
};

const filterForm = document.querySelector("#filterForm");
const serviceForm = document.querySelector("#serviceForm");
const serviceDialog = document.querySelector("#serviceDialog");
const detailDialog = document.querySelector("#detailDialog");
const detailBody = document.querySelector("#detailBody");
const cashForm = document.querySelector("#cashForm");
const cashDialog = document.querySelector("#cashDialog");
const statusForm = document.querySelector("#statusForm");
const statusDialog = document.querySelector("#statusDialog");
const noteForm = document.querySelector("#noteForm");
const noteDialog = document.querySelector("#noteDialog");
const sourceForm = document.querySelector("#sourceForm");
const sourceDialog = document.querySelector("#sourceDialog");
const photoForm = document.querySelector("#photoForm");
const photoDialog = document.querySelector("#photoDialog");
const sortSelect = document.querySelector("#sortSelect");
const topSourceFilter = document.querySelector("#topSourceFilter");
const topStatusFilter = document.querySelector("#topStatusFilter");
const cashSourceFilter = document.querySelector("#cashSourceFilter");
const cashStartDate = document.querySelector("#cashStartDate");
const cashEndDate = document.querySelector("#cashEndDate");
const dashboardStartDate = document.querySelector("#dashboardStartDate");
const dashboardEndDate = document.querySelector("#dashboardEndDate");
const backupFileInput = document.querySelector("#backupFileInput");

init();

function init() {
  fillSelects();
  bindEvents();
  setDefaultDates();
  saveLocalState();
  render();
  initCloudSync();
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  return {
    company: {
      companyName: "Ekzen Teknik",
      ownerName: "Doğan Sezai Koçak",
      phone: "",
      email: "",
      address: "Ankara",
    },
    settings: cloneSettings(defaultSettings),
    cash: [
      { id: uid(), date: isoToday, type: "income", title: "Servis tahsilatı", amount: 2500, serviceId: "" },
      { id: uid(), date: isoToday, type: "expense", title: "Parça alımı", amount: 900, serviceId: "" },
    ],
    services: [
      demoService(665160, "Müşteri A", "0500 000 0001", "Çankaya", "Örnek Mahalle 1/4", "Arçelik", "Çamaşır Makinası", "Sigorta attırıyor", "Teknisyen Yönlendirildi", isoToday, 1750),
      demoService(665152, "Müşteri B", "0500 000 0002", "Altındağ", "Örnek Cadde 38/9", "Demirdöküm", "Kombi", "Aden", "Yeni Kayıt", isoToday, 0),
      demoService(664983, "Müşteri C", "0500 000 0003", "Mamak", "Kurucu Sokak 22/13", "Demirdöküm", "Kombi", "F05 veriyor", "Hesap Kapatıldı", toIsoDate(yesterday), 2500),
    ],
  };
}

function migrateState(oldState) {
  const sourceNames = uniqueValues(oldState.settings?.sources || oldState.sources || sources)
    .filter((name) => !["Doğan Sezai Koçak", "İsa Abi"].includes(name));
  const currentCounters = uniqueValues(uniqueValues(oldState.settings?.dashboardCounters || dashboardCounters)
    .map((name) => isStatus(name, "İptal") ? "Toplam Servis" : name));
  const dashboardCountersVersion = Number(oldState.settings?.dashboardCountersVersion) || 0;
  const migrated = {
    company: oldState.company || {},
    settings: {
      brands: uniqueValues(oldState.settings?.brands || brands),
      devices: uniqueValues(oldState.settings?.devices || devices),
      statuses: ensureValues(uniqueValues(oldState.settings?.statuses || statuses), ["Yeni Kayıt", "İşlemde", "Ödeme Bekliyor", "İşlem Tamam", "Geri Dönen İş", "İptal"]),
      dashboardCounters: dashboardCountersVersion < 3 ? ensureValues(currentCounters, ["Açık Fişler", "Toplam Servis"]) : currentCounters,
      dashboardCountersVersion: 3,
      sources: ensureValues(sourceNames.length ? sourceNames : [...sources], ["Korkmaz Teknik", "Sedef Teknik", "Kendi İşim"]),
      cities: uniqueValues(oldState.settings?.cities || cities),
    },
    cash: oldState.cash || [],
    services: oldState.services || [],
  };

  migrated.services = migrated.services.map((service) => ({
    ...service,
    status: service.status || "Yeni Kayıt",
    technician: service.technician || "",
    notes: normalizeNotes(service.notes),
    photos: normalizePhotos(service.photos),
    statusHistory: normalizeStatusHistory(service),
    history: service.history || [],
  }));

  migrated.cash = migrated.cash.map((item) => ({
    ...item,
    id: item.id || uid(),
    serviceId: item.serviceId || "",
    source: item.source || "",
    materialCost: Number(item.materialCost) || 0,
    commission50: Boolean(item.commission50),
    parentCashId: item.parentCashId || "",
    amount: Number(item.amount) || 0,
  }));

  return migrated;
}

function normalizeNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return notes.map((note) => typeof note === "string"
    ? { id: uid(), text: note, createdAt: new Date().toISOString(), updatedAt: "" }
    : { id: note.id || uid(), text: note.text || "", createdAt: note.createdAt || new Date().toISOString(), updatedAt: note.updatedAt || "" });
}

function normalizePhotos(photos) {
  if (!Array.isArray(photos)) return [];
  return photos.map((photo) => ({
    id: photo.id || uid(),
    caption: photo.caption || "",
    dataUrl: photo.dataUrl || photo.url || "",
    createdAt: photo.createdAt || new Date().toISOString(),
  })).filter((photo) => photo.dataUrl);
}

function normalizeStatusHistory(service) {
  if (Array.isArray(service.statusHistory) && service.statusHistory.length) {
    return service.statusHistory.map((item) => ({
      id: item.id || uid(),
      date: item.date || toIsoDate(new Date(item.at || service.createdAt || new Date())),
      status: item.status || service.status || "Yeni Kayıt",
      technician: item.technician || service.technician || "",
      description: item.description || item.text || "",
      createdAt: item.createdAt || item.at || new Date().toISOString(),
    }));
  }

  return [{
    id: uid(),
    date: toIsoDate(new Date(service.createdAt || new Date())),
    status: service.status || "Yeni Kayıt",
    technician: service.technician || "",
    description: "İlk kayıt",
    createdAt: service.createdAt || new Date().toISOString(),
  }];
}

function demoService(id, customerName, phone, district, address, brand, device, fault, status, date, price) {
  return {
    id: String(id),
    createdAt: `${date}T11:53:00`,
    customerName,
    phone,
    city: "Ankara",
    district,
    address,
    brand,
    device,
    model: "",
    fault,
    warrantyEnd: "2027-06-20",
    source: "Ali Korkmaz",
    status,
    technician: status === "Teknisyen Yönlendirildi" ? "Doğan Sezai Koçak" : "",
    visitDate: date,
    availableDate: date,
    availableTime: "08:00 ile 22:00 arası",
    price,
    paymentStatus: status === "Hesap Kapatıldı" ? "Ödendi" : "Bekliyor",
    operatorNote: "",
    notes: [],
    photos: [],
    history: [],
    statusHistory: [{
      id: uid(),
      date,
      status,
      technician: status === "Teknisyen Yönlendirildi" ? "Doğan Sezai Koçak" : "",
      description: "İlk kayıt",
      createdAt: `${date}T11:55:00`,
    }],
  };
}

function saveLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveState() {
  saveLocalState();
  if (!cloudRef || !cloudReady || cloudApplyingState) return;
  cloudRef.set({
    updatedAt: new Date().toISOString(),
    state,
  }).catch(() => {
    console.warn("Firebase kaydı yapılamadı, yerel kayıt korundu.");
  });
}

function initCloudSync() {
  if (!window.firebase?.database) return;
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    cloudRef = firebase.database().ref(CLOUD_STATE_PATH);
    cloudRef.on("value", (snapshot) => {
      const data = snapshot.val();
      cloudReady = true;

      if (data?.state) {
        cloudApplyingState = true;
        state = migrateState(data.state);
        activeDetailId = null;
        activeDashboardStat = "";
        activeDashboardSource = "";
        saveLocalState();
        cloudApplyingState = false;
        render();
      } else if (!cloudInitialHandled) {
        saveState();
      }

      cloudInitialHandled = true;
    }, () => {
      cloudReady = false;
      console.warn("Firebase bağlantısı kurulamadı, yerel kayıtla devam ediliyor.");
    });
  } catch (error) {
    cloudReady = false;
    console.warn("Firebase başlatılamadı, yerel kayıtla devam ediliyor.");
  }
}

function exportBackup() {
  const payload = {
    app: "ekzen-servis-takip",
    version: 1,
    exportedAt: new Date().toISOString(),
    state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ekzen-servis-yedek-${isoToday}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importBackup(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (!confirm("Yedek geri yüklensin mi? Mevcut kayıtlar bu yedekle değiştirilecek.")) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      const backupState = parsed.state || parsed;
      state = migrateState(backupState);
      activeDetailId = null;
      activeDashboardStat = "";
      activeDashboardSource = "";
      saveState();
      render();
      switchView("dashboard");
      alert("Yedek başarıyla yüklendi.");
    } catch (error) {
      alert("Yedek dosyası okunamadı. Lütfen doğru JSON yedek dosyasını seç.");
    }
  });
  reader.readAsText(file);
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    const action = button?.dataset.action;
    const view = event.target.closest("[data-view]")?.dataset.view;
    const jump = event.target.closest("[data-view-jump]")?.dataset.viewJump;
    const serviceRow = event.target.closest("[data-service-id]");

    if (view) switchView(view);
    if (jump) switchView(jump);
    if (serviceRow && !event.target.closest("button") && !event.target.matches("input")) openDetail(serviceRow.dataset.serviceId);
    if (!action) return;

    if (action === "toggle-nav") document.body.classList.toggle("nav-open");
    if (action === "open-service-modal") openServiceForm();
    if (action === "open-related-service") openRelatedServiceForm(button.dataset.serviceId);
    if (action === "close-service-modal") serviceDialog.close();
    if (action === "close-detail-modal") detailDialog.close();
    if (action === "close-cash-modal") cashDialog.close();
    if (action === "close-status-modal") statusDialog.close();
    if (action === "close-note-modal") noteDialog.close();
    if (action === "close-source-modal") sourceDialog.close();
    if (action === "close-photo-modal") photoDialog.close();
    if (action === "delete-service") deleteCurrentService();
    if (action === "print" || action === "print-list") window.print();
    if (action === "print-cash") printCash();
    if (action === "dashboard-stat") applyDashboardStatFilter(button.dataset.stat);
    if (action === "dashboard-source") applyDashboardSourceFilter(button.dataset.source);
    if (action === "clear-selected") clearServiceSelection();
    if (action === "add-cash") openCashForm(button.dataset.serviceId ? { serviceId: button.dataset.serviceId } : {});
    if (action === "edit-cash") openCashForm({ id: button.dataset.cashId });
    if (action === "delete-cash") deleteCash(button.dataset.cashId);
    if (action === "change-status") openStatusForm(button.dataset.serviceId);
    if (action === "add-note") openNoteForm(button.dataset.serviceId);
    if (action === "edit-note") openNoteForm(button.dataset.serviceId, button.dataset.noteId);
    if (action === "delete-note") deleteNote(button.dataset.serviceId, button.dataset.noteId);
    if (action === "add-photo") openPhotoForm(button.dataset.serviceId);
    if (action === "delete-photo") deletePhoto(button.dataset.serviceId, button.dataset.photoId);
    if (action === "edit-photo") editPhoto(button.dataset.serviceId, button.dataset.photoId);
    if (action === "add-source") openSourceForm();
    if (action === "edit-source") openSourceForm(button.dataset.sourceName);
    if (action === "delete-source") deleteSource(button.dataset.sourceName);
    if (action === "add-setting-item") addSettingItem(button.dataset.list);
    if (action === "edit-setting-item") editSettingItem(button.dataset.list, button.dataset.value);
    if (action === "delete-setting-item") deleteSettingItem(button.dataset.list, button.dataset.value);
    if (action === "move-setting-item") moveSettingItem(button.dataset.list, button.dataset.value, button.dataset.direction);
    if (action === "export-backup") exportBackup();
    if (action === "choose-backup") backupFileInput.click();
  });

  filterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    activeDashboardStat = "";
    activeDashboardSource = "";
    renderServices();
  });
  filterForm.elements.query.addEventListener("input", () => {
    activeDashboardStat = "";
    activeDashboardSource = "";
    renderServices();
  });

  sortSelect?.addEventListener("change", renderServices);
  topSourceFilter.addEventListener("change", () => {
    activeDashboardStat = "";
    activeDashboardSource = "";
    renderServices();
  });
  topStatusFilter.addEventListener("change", () => {
    activeDashboardStat = "";
    activeDashboardSource = "";
    renderServices();
  });
  cashSourceFilter.addEventListener("change", renderCash);
  cashStartDate.addEventListener("change", renderCash);
  cashEndDate.addEventListener("change", renderCash);
  dashboardStartDate.addEventListener("change", renderDashboard);
  dashboardEndDate.addEventListener("change", renderDashboard);
  backupFileInput.addEventListener("change", importBackup);

  serviceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveService(new FormData(serviceForm));
  });

  cashForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveCash(new FormData(cashForm));
  });

  statusForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveStatus(new FormData(statusForm));
  });

  noteForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveNote(new FormData(noteForm));
  });

  sourceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveSource(new FormData(sourceForm));
  });

  photoForm.addEventListener("submit", (event) => {
    event.preventDefault();
    savePhoto();
  });

  document.querySelector("#settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.company = Object.fromEntries(new FormData(event.currentTarget));
    saveState();
    render();
    switchView("dashboard");
  });
}

function fillSelects() {
  fillSelect(topSourceFilter, ["Tüm Kaynaklar", ...settingsList("sources")]);
  fillSelect(topStatusFilter, ["Tüm Durumlar", ...settingsList("statuses")]);
  fillSelect(cashSourceFilter, ["Tüm Kaynaklar", ...settingsList("sources")]);
  fillSelect(serviceForm.elements.brand, ["Marka", ...settingsList("brands")]);
  fillSelect(serviceForm.elements.device, ["Cihaz Türü", ...settingsList("devices")]);
  fillSelect(serviceForm.elements.source, settingsList("sources"));
  fillSelect(serviceForm.elements.status, settingsList("statuses"));
  fillSelect(cashForm.elements.source, ["Servis Kaynağı", ...settingsList("sources")]);
  fillSelect(statusForm.elements.status, settingsList("statuses"));
}

function fillSelect(select, options) {
  if (!select) return;
  const previous = select.value;
  select.innerHTML = "";
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = ["Marka", "Cihaz Türü", "Servis Durumu", "Servis Kaynağı", "Tüm İller", "Tüm Kaynaklar", "Tüm Durumlar"].includes(option) ? "" : option;
    item.textContent = option;
    select.append(item);
  });
  if ([...select.options].some((option) => option.value === previous)) select.value = previous;
}

function setDefaultDates() {
  cashStartDate.value = "";
  cashEndDate.value = "";
}

function switchView(view) {
  currentView = view;
  Object.entries(views).forEach(([key, element]) => element.classList.toggle("is-visible", key === view));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === view));
  const subtitles = {
    dashboard: "Servis takip paneli",
    services: "Servis listesi ve kayıt yönetimi",
    customers: "Müşteri kayıtları",
    sources: "Servis kaynağı yönetimi",
    cash: "Kasa hareketleri",
    settings: "Modül ve firma ayarları",
  };
  document.querySelector("#pageSubtitle").textContent = subtitles[view];
  render();
}

function render() {
  document.querySelector("#companyTitle").textContent = state.company.companyName || "Servis Takip";
  fillSelects();
  renderDashboard();
  renderServices();
  renderCustomers();
  renderSources();
  renderCash();
  renderSettings();
  if (detailDialog.open && activeDetailId) renderDetail(activeDetailId);
}

function renderDashboard() {
  const services = filteredDashboardServices();
  const cashItems = filteredDashboardCash();
  document.querySelector("#dashboardTitle").textContent = state.company.companyName;
  renderSourceMetrics(services, cashItems);
  renderDashboardCounters(services);

  const plans = [...services]
    .filter((service) => isActiveDashboardDateStatus(service.status))
    .sort((a, b) => (a.availableDate || "").localeCompare(b.availableDate || ""))
    .slice(0, 5);
  document.querySelector("#planList").innerHTML = plans.length ? plans.map((service) => `
    <button class="compact-row" type="button" data-service-id="${service.id}">
      <span><b>${escapeHtml(service.customerName)}</b><br>${escapeHtml(service.brand)} - ${escapeHtml(service.device)}</span>
      <span class="compact-meta">
        <strong>${formatDate(service.availableDate)}</strong>
        <span class="status-pill ${statusClass(service.status)}">${escapeHtml(service.status)}</span>
      </span>
    </button>
  `).join("") : `<p class="empty">Plan bulunamadı.</p>`;
}

function renderSourceMetrics(services, cashItems) {
  const sourceList = settingsList("sources");
  const sourceCards = sourceList.map((source) => `
    <article class="metric-card is-clickable" data-action="dashboard-source" data-source="${escapeAttr(source)}">
      <span>${escapeHtml(source)}</span>
      <b>${services.filter((service) => service.source === source && isOpenDashboardSourceStatus(service.status)).length}</b>
    </article>
  `).join("");
  const cashCard = `
    <article>
      <span>Kasa Durumu</span>
      <b>${money(customerCashBalance(cashItems))}</b>
      <small>Milat: ${formatDate(isoToday)}</small>
    </article>
  `;
  document.querySelector("#sourceMetrics").innerHTML = `${sourceCards || `<p class="empty">Servis kaynağı bulunamadı.</p>`}${cashCard}`;
}

function renderDashboardCounters(services) {
  const counters = settingsList("dashboardCounters");
  document.querySelector("#dashboardCounters").innerHTML = counters.length ? counters.map((label) => `
    <article class="stat-box is-clickable" data-action="dashboard-stat" data-stat="${escapeAttr(label)}">
      <span>${escapeHtml(label)}</span>
      <b>${dashboardCounterCount(label, services)}</b>
    </article>
  `).join("") : `<p class="empty">Sayaç bulunamadı.</p>`;
}

function dashboardCounterCount(label, services) {
  return services.filter((service) => matchesDashboardCounter(service, label)).length;
}

function renderServices() {
  let services = sortServices(filteredServices());
  document.querySelector("#serviceList").innerHTML = `
    <div class="service-header">
      <span></span><span>Tarih</span><span>Müşteri</span><span>Cihaz</span><span>Durum</span>
    </div>
    ${services.map(serviceRow).join("")}
  `;
  document.querySelector("#resultCount").textContent = `Toplam Sonuç Sayısı : ${services.length}`;
}

function filteredServices() {
  const form = filterForm.elements;
  const query = norm(form.query.value);
  return state.services.filter((service) => {
    const queryText = norm([
      service.id,
      service.createdAt,
      service.customerName,
      service.phone,
      service.city,
      service.district,
      service.address,
      service.brand,
      service.device,
      service.model,
      service.fault,
      service.source,
      service.status,
      service.paymentStatus,
      service.operatorNote,
      service.availableTime,
      service.notes?.map((note) => note.text).join(" "),
    ].join(" "));
    const sourceFilter = topSourceFilter.value;
    const statusFilter = topStatusFilter.value;
    return (!query || query.split(" ").every((word) => queryText.includes(word)))
      && (!statusFilter || service.status === statusFilter)
      && (!sourceFilter || service.source === sourceFilter)
      && (!activeDashboardSource || (service.source === activeDashboardSource && isOpenDashboardSourceStatus(service.status)))
      && matchesDashboardStat(service);
  });
}

function applyDashboardStatFilter(stat) {
  activeDashboardStat = stat || "";
  activeDashboardSource = "";
  filterForm.reset();
  topSourceFilter.value = "";
  topStatusFilter.value = "";
  switchView("services");
  renderServices();
}

function applyDashboardSourceFilter(source) {
  activeDashboardSource = source || "";
  activeDashboardStat = "";
  filterForm.reset();
  topSourceFilter.value = "";
  topStatusFilter.value = "";
  switchView("services");
  renderServices();
}

function clearServiceSelection() {
  activeDashboardStat = "";
  activeDashboardSource = "";
  filterForm.reset();
  topSourceFilter.value = "";
  topStatusFilter.value = "";
  document.querySelectorAll(".service-check").forEach((input) => { input.checked = false; });
  renderServices();
}

function matchesDashboardStat(service) {
  if (!activeDashboardStat) return true;
  return matchesDashboardCounter(service, activeDashboardStat);
}

function matchesDashboardCounter(service, label) {
  if (isStatus(label, "Bugün")) return serviceHasDate(service, isoToday) && isActiveDashboardDateStatus(service.status);
  if (isStatus(label, "Yarın")) return serviceHasDate(service, toIsoDate(tomorrow)) && isActiveDashboardDateStatus(service.status);
  if (isStatus(label, "Açık Fişler")) return !isStatus(service.status, "İşlem Tamam") && !isStatus(service.status, "İptal");
  if (isStatus(label, "Toplam Servis")) return true;
  return isStatus(service.status, label);
}

function isActiveDashboardDateStatus(status) {
  return isStatus(status, "Yeni Kayıt") || isStatus(status, "İşlemde") || isStatus(status, "Geri Dönen İş");
}

function isOpenDashboardSourceStatus(status) {
  return !isStatus(status, "İşlem Tamam") && !isStatus(status, "İptal");
}

function sortServices(services) {
  const sorted = [...services];
  const sort = sortSelect?.value || "dateDesc";
  if (sort === "dateDesc") sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sort === "customerAsc") sorted.sort((a, b) => a.customerName.localeCompare(b.customerName, "tr"));
  if (sort === "brandAsc") sorted.sort((a, b) => a.brand.localeCompare(b.brand, "tr"));
  if (sort === "statusAsc") sorted.sort((a, b) => a.status.localeCompare(b.status, "tr"));
  return sorted;
}

function serviceRow(service) {
  return `
    <article class="service-row" data-service-id="${service.id}">
      <input class="service-check" type="checkbox" aria-label="Servis seç">
      <div><p class="service-no">${service.id}</p><p>${formatDate(service.availableDate)}</p></div>
      <div><p><b>${escapeHtml(service.customerName)}</b></p><p>${escapeHtml(service.phone)}</p><p>${escapeHtml(service.address)}</p></div>
      <div><p><b>${escapeHtml(service.brand)} - ${escapeHtml(service.device)}</b></p><p>${escapeHtml(service.model)}</p><p><i>${escapeHtml(service.fault)}</i></p></div>
      <div><span class="status-pill ${statusClass(service.status)}">${escapeHtml(service.status)}</span><p>Kaynak: ${escapeHtml(service.source || "-")}</p><p>Müsait: ${formatDate(service.availableDate)}</p></div>
    </article>
  `;
}

function renderCustomers() {
  const customers = uniqueCustomers();
  document.querySelector("#customerList").innerHTML = customers.map((customer) => `
    <div class="data-row">
      <strong>${escapeHtml(customer.customerName)}</strong>
      <span>${escapeHtml(customer.phone)}</span>
      <span>${escapeHtml(customer.city)}</span>
      <button class="ghost-button" type="button" data-service-id="${customer.latestServiceId}">Son Servis</button>
    </div>
  `).join("") || `<p class="empty">Müşteri bulunamadı.</p>`;
}

function uniqueCustomers() {
  const map = new Map();
  state.services.forEach((service) => {
    const key = `${norm(service.customerName)}-${norm(service.phone)}`;
    if (!map.has(key)) map.set(key, { ...service, latestServiceId: service.id });
  });
  return [...map.values()];
}

function renderSources() {
  document.querySelector("#sourceList").innerHTML = settingsList("sources").map((source) => `
    <div class="data-row">
      <strong>${escapeHtml(source)}</strong>
      <span>${state.services.filter((service) => service.source === source).length} servis</span>
      <span>${state.cash.filter((item) => cashItemSource(item) === source).length} kasa hareketi</span>
      <div class="row-actions">
        <button class="mini-button" type="button" data-action="edit-source" data-source-name="${escapeAttr(source)}" title="Düzenle">✎</button>
        <button class="mini-button danger" type="button" data-action="delete-source" data-source-name="${escapeAttr(source)}" title="Sil">×</button>
      </div>
    </div>
  `).join("") || `<p class="empty">Servis kaynağı bulunamadı.</p>`;
}

function renderCash() {
  const items = filteredCash();
  const totals = cashTotals(items);
  const breakdown = cashBreakdown(items);
  document.querySelector("#cashIncome").textContent = money(totals.income);
  document.querySelector("#cashExpense").textContent = `-${money(breakdown.manualExpense)}`;
  document.querySelector("#cashCommission").textContent = `-${money(breakdown.commission)}`;
  document.querySelector("#cashMaterial").textContent = `-${money(breakdown.material)}`;
  document.querySelector("#cashBalance").textContent = money(totals.balance);
  document.querySelector("#cashList").innerHTML = renderCashGroups(items) || `<p class="empty">Para hareketi bulunamadı.</p>`;
}

function renderCashGroups(items) {
  const serviceGroups = [];
  const serviceMap = new Map();
  const manualItems = [];

  items.forEach((item) => {
    if (!item.serviceId) {
      manualItems.push(item);
      return;
    }
    if (!serviceMap.has(item.serviceId)) {
      const group = { serviceId: item.serviceId, items: [] };
      serviceMap.set(item.serviceId, group);
      serviceGroups.push(group);
    }
    serviceMap.get(item.serviceId).items.push(item);
  });

  return [
    ...serviceGroups.map(cashServiceGroup),
    manualItems.length ? `
      <section class="cash-group manual-cash-group">
        <header>
          <div>
            <b>Manuel kasa hareketleri</b>
            <span>Servise bağlı olmayan kayıtlar</span>
          </div>
          ${cashGroupSummary(manualItems)}
        </header>
        <div>${manualItems.map(cashRow).join("")}</div>
      </section>
    ` : "",
  ].join("");
}

function cashServiceGroup(group) {
  const service = state.services.find((item) => item.id === group.serviceId);
  const sortedItems = sortCashGroupItems(group.items);
  return `
    <section class="cash-group">
      <header>
        <div>
          <b>Servis ${escapeHtml(group.serviceId)} · ${escapeHtml(service?.customerName || "Servis kaydı")}</b>
          <span>${escapeHtml(service ? `${service.brand} ${service.device}` : "Bağlı servis")} · ${escapeHtml(service?.source || cashItemSource(group.items[0]) || "-")}</span>
        </div>
        ${cashServiceSummary(sortedItems)}
      </header>
      <div>${sortedItems.map(cashRow).join("")}</div>
    </section>
  `;
}

function sortCashGroupItems(items) {
  const order = (item) => {
    if (item.type === "income") return 0;
    if (item.autoMaterialExpense) return 1;
    if (item.autoCommissionExpense) return 2;
    return 3;
  };
  return [...items].sort((a, b) => order(a) - order(b) || (b.date || "").localeCompare(a.date || ""));
}

function cashServiceSummary(items) {
  const income = items.filter((item) => item.type === "income").reduce((total, item) => total + (Number(item.amount) || 0), 0);
  const material = items.filter((item) => item.autoMaterialExpense || norm(item.title).includes("malzeme")).reduce((total, item) => total + (Number(item.amount) || 0), 0);
  const commission = items.filter((item) => item.autoCommissionExpense || norm(item.title).includes("komisyon")).reduce((total, item) => total + (Number(item.amount) || 0), 0);
  return `
    <div class="cash-service-summary">
      <strong>Toplam alınan tutar ${money(income)}</strong>
      <span>Malzeme gideri ${money(material)}</span>
      <span>Komisyon ${money(commission)}</span>
    </div>
  `;
}

function cashGroupSummary(items) {
  const totals = cashTotals(items);
  return `
    <div class="cash-group-summary">
      <span>Gelir ${money(totals.income)}</span>
      <span>Gider ${money(totals.expense)}</span>
      <strong>Bakiye ${money(totals.balance)}</strong>
    </div>
  `;
}

function cashRow(item) {
  const source = cashItemSource(item);
  const badge = item.autoMaterialExpense ? "Malzeme" : item.autoCommissionExpense ? "Komisyon" : item.autoServiceIncome ? "Otomatik" : item.parentCashId ? "Bağlı" : "";
  const title = visibleCashTitle(item);
  return `
    <div class="data-row cash-row ${item.type === "expense" ? "is-expense" : ""}">
      <strong>${escapeHtml(title)}${badge ? `<small>${badge}</small>` : ""}</strong>
      <span>${formatDate(item.date)}</span>
      <span>${item.type === "expense" ? "Gider" : "Tahsilat"}${item.serviceId ? ` · ${escapeHtml(item.serviceId)}` : ""}</span>
      <span>${escapeHtml(source || "-")}</span>
      <strong>${item.type === "expense" ? "-" : "+"}${money(item.amount)}</strong>
      <div class="row-actions">
        <button class="mini-button" type="button" data-action="edit-cash" data-cash-id="${item.id}" title="Düzenle">✎</button>
        <button class="mini-button danger" type="button" data-action="delete-cash" data-cash-id="${item.id}" title="Sil">×</button>
      </div>
    </div>
  `;
}

function filteredCash() {
  const source = cashSourceFilter.value;
  const start = cashStartDate.value;
  const end = cashEndDate.value;
  return state.cash.filter((item) => {
    const date = item.date || "";
    return (!source || cashItemSource(item) === source)
      && (!start || date >= start)
      && (!end || date <= end);
  });
}

function cashTotals(items = state.cash) {
  return items.reduce((totals, item) => {
    if (item.type === "income") totals.income += Number(item.amount) || 0;
    if (item.type === "expense") totals.expense += Number(item.amount) || 0;
    totals.balance = totals.income - totals.expense;
    return totals;
  }, { income: 0, expense: 0, balance: 0 });
}

function filteredDashboardServices() {
  const start = dashboardStartDate.value;
  const end = dashboardEndDate.value;
  return state.services.filter((service) => dateInRange(serviceMainDate(service), start, end));
}

function filteredDashboardCash() {
  const start = dashboardStartDate.value;
  const end = dashboardEndDate.value;
  return state.cash.filter((item) => dateInRange(item.date || "", start, end));
}

function dateInRange(date, start, end) {
  return (!start || date >= start) && (!end || date <= end);
}

function cashBreakdown(items = state.cash) {
  return items.reduce((totals, item) => {
    const amount = Number(item.amount) || 0;
    if (item.type === "income") totals.income += amount;
    else if (item.autoCommissionExpense) totals.commission += amount;
    else if (item.autoMaterialExpense) totals.material += amount;
    else totals.manualExpense += amount;
    totals.balance = totals.income - totals.manualExpense - totals.commission - totals.material;
    return totals;
  }, { income: 0, manualExpense: 0, commission: 0, material: 0, balance: 0 });
}

function customerCashBalance(items = state.cash) {
  const serviceItems = items.filter((item) => item.serviceId);
  const totals = cashBreakdown(serviceItems);
  return totals.income - totals.material - totals.commission;
}

function renderSettings() {
  const form = document.querySelector("#settingsForm");
  Object.entries(state.company).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value || "";
  });
  renderSettingsLists();
}

function renderSettingsLists() {
  const container = document.querySelector("#settingsLists");
  container.innerHTML = Object.entries(settingsLabels).map(([key, label]) => `
    <section class="settings-list">
      <header>
        <h3>${escapeHtml(label)}</h3>
        <button class="mini-button" type="button" data-action="add-setting-item" data-list="${key}" title="Ekle">+</button>
      </header>
      <div>
        ${settingsList(key).map((value) => `
          <div class="setting-chip">
            <span>${escapeHtml(value)}</span>
            <div class="row-actions">
              ${["sources", "statuses", "dashboardCounters"].includes(key) ? `<button class="mini-button" type="button" data-action="move-setting-item" data-list="${key}" data-value="${escapeAttr(value)}" data-direction="up" title="Yukarı">↑</button>
              <button class="mini-button" type="button" data-action="move-setting-item" data-list="${key}" data-value="${escapeAttr(value)}" data-direction="down" title="Aşağı">↓</button>` : ""}
              <button class="mini-button" type="button" data-action="edit-setting-item" data-list="${key}" data-value="${escapeAttr(value)}" title="Düzenle">✎</button>
              <button class="mini-button danger" type="button" data-action="delete-setting-item" data-list="${key}" data-value="${escapeAttr(value)}" title="Sil">×</button>
            </div>
          </div>
        `).join("") || `<p class="empty">Kayıt yok.</p>`}
      </div>
    </section>
  `).join("");
}

function openServiceForm(service) {
  serviceForm.reset();
  serviceForm.elements.id.value = "";
  serviceForm.elements.status.value = "Yeni Kayıt";
  serviceForm.elements.source.value = "Kendi İşim";
  serviceForm.elements.availableDate.value = isoToday;
  serviceForm.elements.warrantyEnd.value = addYear(isoToday);
  document.querySelector("#serviceDialogTitle").textContent = "Yeni Servis";
  serviceDialog.querySelector("[data-action='delete-service']").style.visibility = "hidden";

  if (service) {
    Object.entries(service).forEach(([key, value]) => {
      if (serviceForm.elements[key]) serviceForm.elements[key].value = value || "";
    });
    document.querySelector("#serviceDialogTitle").textContent = `Servisi Güncelle (${service.id})`;
    serviceDialog.querySelector("[data-action='delete-service']").style.visibility = "visible";
  }
  serviceDialog.showModal();
}

function openRelatedServiceForm(serviceId) {
  const original = state.services.find((service) => service.id === serviceId);
  if (!original) return;
  detailDialog.close();
  openServiceForm();
  serviceForm.elements.customerName.value = original.customerName || "";
  serviceForm.elements.phone.value = original.phone || "";
  serviceForm.elements.address.value = original.address || "";
  serviceForm.elements.availableTime.value = original.availableTime || "";
  serviceForm.elements.source.value = original.source || serviceForm.elements.source.value;
  serviceForm.elements.brand.value = "";
  serviceForm.elements.device.value = "";
  serviceForm.elements.model.value = "";
  serviceForm.elements.fault.value = "";
  serviceForm.elements.operatorNote.value = "";
  document.querySelector("#serviceDialogTitle").textContent = `Yeni Servis (${original.customerName || original.phone || "Müşteri"})`;
}

function saveService(formData) {
  const data = Object.fromEntries(formData);
  const isUpdate = Boolean(data.id);
  const previous = state.services.find((service) => service.id === data.id);
  const status = isUpdate ? data.status : "Yeni Kayıt";
  const service = {
    ...(previous || {}),
    ...data,
    id: data.id || nextServiceId(),
    createdAt: previous?.createdAt || new Date().toISOString(),
    status,
    price: previous?.price || 0,
    notes: previous?.notes || [],
    photos: previous?.photos || [],
    statusHistory: previous?.statusHistory || [{
      id: uid(),
      date: toIsoDate(new Date()),
      status: "Yeni Kayıt",
      description: "Yeni servis kaydı alındı",
      createdAt: new Date().toISOString(),
    }],
    history: previous?.history || [],
  };

  if (isUpdate) state.services = state.services.map((item) => item.id === service.id ? service : item);
  else state.services.unshift(service);
  saveState();
  serviceDialog.close();
  render();
  switchView("services");
}

function deleteCurrentService() {
  const id = serviceForm.elements.id.value;
  if (!id) return;
  if (!confirm(`${id} numaralı servis silinsin mi?`)) return;
  state.services = state.services.filter((service) => service.id !== id);
  state.cash = state.cash.filter((item) => item.serviceId !== id);
  saveState();
  serviceDialog.close();
  if (detailDialog.open) detailDialog.close();
  render();
}

function openDetail(id) {
  activeDetailId = id;
  renderDetail(id);
  detailDialog.showModal();
}

function renderDetail(id) {
  const service = state.services.find((item) => item.id === id);
  if (!service) return;
  document.querySelector("#detailTitle").textContent = `Servis Detay (${service.id})`;
  const linkedCash = state.cash.filter((item) => item.serviceId === service.id);
  detailBody.innerHTML = `
    <div class="detail-grid">
      <section class="detail-section">
        <h3>Müşteri Bilgisi <button class="mini-button" type="button" data-edit-service="${service.id}">✎</button></h3>
        <dl>
          <dt>Müşteri Adı</dt><dd>${escapeHtml(service.customerName)}</dd>
          <dt>Telefon</dt><dd><a href="tel:${digits(service.phone)}">${escapeHtml(service.phone)}</a></dd>
          <dt>Adres</dt><dd>${escapeHtml(service.address || "-")}</dd>
          <dt>Müsait Zaman</dt><dd>${formatDate(service.availableDate)} - ${escapeHtml(service.availableTime || "-")}</dd>
          <dt>Operatör Notu</dt><dd>${escapeHtml(service.operatorNote || "-")}</dd>
        </dl>
      </section>
      <section class="detail-section">
        <h3>Cihaz Bilgisi <button class="mini-button" type="button" data-edit-service="${service.id}">✎</button></h3>
        <dl>
          <dt>Cihaz</dt><dd>${escapeHtml(service.brand)} / ${escapeHtml(service.device)}</dd>
          <dt>Model</dt><dd>${escapeHtml(service.model || "-")}</dd>
          <dt>Cihaz Arızası</dt><dd>${escapeHtml(service.fault)}</dd>
          <dt>Garanti Bitiş</dt><dd>${formatDate(service.warrantyEnd)}</dd>
        </dl>
      </section>
      <section class="detail-section wide">
        <h3>Servis Durumu <button class="primary-button" type="button" data-action="change-status" data-service-id="${service.id}">Durum Değiştir</button></h3>
        <dl>
          <dt>Durum</dt><dd><span class="status-pill ${statusClass(service.status)}">${escapeHtml(service.status)}</span></dd>
          <dt>Kaynak</dt><dd>${escapeHtml(service.source)}</dd>
          <dt>Müsait Tarih</dt><dd>${formatDate(service.availableDate)}</dd>
        </dl>
      </section>
      <section class="detail-section wide">
        <h3>Serviste Yapılan İşlemler</h3>
        <div class="history-list">
          ${service.statusHistory.map((item) => `
            <div class="history-item">
              <div><b>${formatDate(item.date)} · ${escapeHtml(item.status)}</b><p>${escapeHtml(item.description || "-")}</p></div>
            </div>
          `).join("")}
        </div>
      </section>
      <section class="detail-section">
        <h3>Para Hareketleri <button class="primary-button" type="button" data-action="add-cash" data-service-id="${service.id}">Para Ekle</button></h3>
        <div class="history-list">
          ${linkedCash.map((item) => `
            <div class="history-item">
              <div><b>${escapeHtml(visibleCashTitle(item))}</b><p>${formatDate(item.date)} · ${item.type === "expense" ? "Gider" : "Tahsilat"} · ${money(item.amount)}</p></div>
              <div class="row-actions">
                <button class="mini-button" type="button" data-action="edit-cash" data-cash-id="${item.id}">✎</button>
                <button class="mini-button danger" type="button" data-action="delete-cash" data-cash-id="${item.id}">×</button>
              </div>
            </div>
          `).join("") || `<p class="empty">Henüz para hareketi yok.</p>`}
        </div>
      </section>
      <section class="detail-section">
        <h3>Servis Notları <button class="primary-button" type="button" data-action="add-note" data-service-id="${service.id}">Not Ekle</button></h3>
        <div class="history-list">
          ${service.notes.map((note) => `
            <div class="history-item">
              <div><b>${formatDateTime(note.createdAt)}</b><p>${escapeHtml(note.text)}</p></div>
              <div class="row-actions">
                <button class="mini-button" type="button" data-action="edit-note" data-service-id="${service.id}" data-note-id="${note.id}">✎</button>
                <button class="mini-button danger" type="button" data-action="delete-note" data-service-id="${service.id}" data-note-id="${note.id}">×</button>
              </div>
            </div>
          `).join("") || `<p class="empty">Not bulunamadı.</p>`}
        </div>
      </section>
      <section class="detail-section wide">
        <h3>Servis Fotoğrafları <button class="primary-button" type="button" data-action="add-photo" data-service-id="${service.id}">Fotoğraf Ekle / Çek</button></h3>
        ${service.photos.length ? `<div class="photo-grid">${service.photos.map((photo) => `
          <article class="photo-card">
            <img src="${photo.dataUrl}" alt="${escapeHtml(photo.caption || "Servis fotoğrafı")}">
            <footer>
              <b>${escapeHtml(photo.caption || "Fotoğraf")}</b>
              <div class="row-actions">
                <button class="mini-button" type="button" data-action="edit-photo" data-service-id="${service.id}" data-photo-id="${photo.id}">✎</button>
                <button class="mini-button danger" type="button" data-action="delete-photo" data-service-id="${service.id}" data-photo-id="${photo.id}">×</button>
              </div>
            </footer>
          </article>
        `).join("")}</div>` : `<p class="empty">Fotoğraf bulunamadı.</p>`}
      </section>
    </div>
    <div class="inline-actions" style="margin-top:12px">
      <button class="primary-button" type="button" data-edit-service="${service.id}">Servisi Güncelle</button>
      <button class="secondary-button" type="button" data-action="open-related-service" data-service-id="${service.id}">Yeni Servis Kaydı Aç</button>
      <button class="secondary-button" type="button" data-print-service>Servis Fişi</button>
    </div>
  `;

  detailBody.querySelectorAll("[data-edit-service]").forEach((button) => {
    button.addEventListener("click", () => {
      detailDialog.close();
      openServiceForm(service);
    }, { once: true });
  });
  detailBody.querySelector("[data-print-service]")?.addEventListener("click", () => window.print(), { once: true });
}

function openStatusForm(serviceId) {
  const service = state.services.find((item) => item.id === serviceId);
  if (!service) return;
  statusForm.reset();
  statusForm.elements.serviceId.value = serviceId;
  statusForm.elements.status.value = service.status;
  statusForm.elements.date.value = service.availableDate || isoToday;
  statusForm.elements.description.value = "";
  statusDialog.showModal();
}

function saveStatus(formData) {
  const data = Object.fromEntries(formData);
  const service = state.services.find((item) => item.id === data.serviceId);
  if (!service) return;
  service.status = data.status;
  service.availableDate = data.date || service.availableDate;
  service.statusHistory.unshift({
    id: uid(),
    date: data.date,
    status: data.status,
    description: data.description,
    createdAt: new Date().toISOString(),
  });
  saveState();
  statusDialog.close();
  render();
}

function openCashForm(options = {}) {
  cashForm.reset();
  cashForm.elements.id.value = "";
  cashForm.elements.date.value = isoToday;
  cashForm.elements.type.value = "income";
  cashForm.elements.serviceId.value = options.serviceId || "";
  cashForm.elements.source.value = serviceSource(options.serviceId) || cashSourceFilter.value || "";
  const deleteButton = cashDialog.querySelector("[data-action='delete-cash']");
  delete deleteButton.dataset.cashId;
  deleteButton.style.visibility = "hidden";
  document.querySelector("#cashDialogTitle").textContent = "Para Hareketi";

  if (options.id) {
    const item = state.cash.find((cashItem) => cashItem.id === options.id);
    if (!item) return;
    Object.entries(item).forEach(([key, value]) => {
      if (key === "commission50") return;
      if (cashForm.elements[key]) cashForm.elements[key].value = value || "";
    });
    cashForm.elements.commission50.value = "yes";
    cashForm.elements.commission50.checked = Boolean(item.commission50);
    deleteButton.dataset.cashId = options.id;
    deleteButton.style.visibility = "visible";
    document.querySelector("#cashDialogTitle").textContent = "Para Hareketini Düzenle";
  }
  cashDialog.showModal();
}

function saveCash(formData) {
  const data = Object.fromEntries(formData);
  const previous = state.cash.find((item) => item.id === data.id);
  const serviceId = data.serviceId.trim();
  const materialCost = Number(data.materialCost) || 0;
  const cashItem = {
    ...(previous || {}),
    id: data.id || uid(),
    date: data.date || isoToday,
    type: data.type === "expense" ? "expense" : "income",
    title: data.title.trim(),
    amount: Number(data.amount) || 0,
    materialCost,
    commission50: Boolean(data.commission50),
    source: data.source || serviceSource(serviceId) || "",
    serviceId,
  };
  if (data.id) state.cash = state.cash.map((item) => item.id === data.id ? cashItem : item);
  else state.cash.unshift(cashItem);
  syncSettlementCash(cashItem);
  saveState();
  cashDialog.close();
  render();
}

function deleteCash(id) {
  const item = state.cash.find((cashItem) => cashItem.id === id);
  if (!item || !confirm(`${visibleCashTitle(item) || "Para hareketi"} silinsin mi?`)) return;
  state.cash = state.cash.filter((cashItem) => cashItem.id !== id && cashItem.parentCashId !== id);
  saveState();
  if (cashDialog.open) cashDialog.close();
  render();
}

function openNoteForm(serviceId, noteId = "") {
  const service = state.services.find((item) => item.id === serviceId);
  if (!service) return;
  const note = service.notes.find((item) => item.id === noteId);
  noteForm.reset();
  noteForm.elements.serviceId.value = serviceId;
  noteForm.elements.noteId.value = noteId;
  noteForm.elements.text.value = note?.text || "";
  noteDialog.querySelector("[data-action='delete-note']").style.visibility = note ? "visible" : "hidden";
  document.querySelector("#noteDialogTitle").textContent = note ? "Notu Düzenle" : "Not Ekle";
  noteDialog.showModal();
}

function saveNote(formData) {
  const data = Object.fromEntries(formData);
  const service = state.services.find((item) => item.id === data.serviceId);
  if (!service) return;
  if (data.noteId) {
    service.notes = service.notes.map((note) => note.id === data.noteId ? { ...note, text: data.text, updatedAt: new Date().toISOString() } : note);
  } else {
    service.notes.unshift({ id: uid(), text: data.text, createdAt: new Date().toISOString(), updatedAt: "" });
  }
  saveState();
  noteDialog.close();
  render();
}

function deleteNote(serviceId, noteId) {
  serviceId = serviceId || noteForm.elements.serviceId.value;
  noteId = noteId || noteForm.elements.noteId.value;
  const service = state.services.find((item) => item.id === serviceId);
  if (!service || !noteId || !confirm("Not silinsin mi?")) return;
  service.notes = service.notes.filter((note) => note.id !== noteId);
  saveState();
  if (noteDialog.open) noteDialog.close();
  render();
}

function openPhotoForm(serviceId) {
  photoForm.reset();
  photoForm.elements.serviceId.value = serviceId;
  photoDialog.showModal();
}

async function savePhoto() {
  const service = state.services.find((item) => item.id === photoForm.elements.serviceId.value);
  if (!service) return;
  const file = photoForm.elements.photo.files[0] || photoForm.elements.camera.files[0];
  if (!file) {
    alert("Fotoğraf seçmeniz gerekiyor.");
    return;
  }
  const dataUrl = await fileToDataUrl(file);
  service.photos.unshift({
    id: uid(),
    caption: photoForm.elements.caption.value,
    dataUrl,
    createdAt: new Date().toISOString(),
  });
  saveState();
  photoDialog.close();
  render();
}

function editPhoto(serviceId, photoId) {
  const service = state.services.find((item) => item.id === serviceId);
  const photo = service?.photos.find((item) => item.id === photoId);
  if (!photo) return;
  const caption = prompt("Fotoğraf açıklaması", photo.caption || "");
  if (caption === null) return;
  photo.caption = caption;
  saveState();
  render();
}

function deletePhoto(serviceId, photoId) {
  const service = state.services.find((item) => item.id === serviceId);
  if (!service || !confirm("Fotoğraf silinsin mi?")) return;
  service.photos = service.photos.filter((photo) => photo.id !== photoId);
  saveState();
  render();
}

function openSourceForm(name = "") {
  sourceForm.reset();
  sourceForm.elements.oldName.value = "";
  sourceDialog.querySelector("[data-action='delete-source']").style.visibility = "hidden";
  document.querySelector("#sourceDialogTitle").textContent = "Kaynak Ekle";
  if (name) {
    sourceForm.elements.oldName.value = name;
    sourceForm.elements.name.value = name;
    sourceDialog.querySelector("[data-action='delete-source']").dataset.sourceName = name;
    sourceDialog.querySelector("[data-action='delete-source']").style.visibility = "visible";
    document.querySelector("#sourceDialogTitle").textContent = "Kaynak Düzenle";
  }
  sourceDialog.showModal();
}

function saveSource(formData) {
  const data = Object.fromEntries(formData);
  const name = data.name.trim();
  if (!name) return;
  if (data.oldName) updateSettingItem("sources", data.oldName, name);
  else addSettingValue("sources", name);
  saveState();
  sourceDialog.close();
  render();
}

function deleteSource(name) {
  const sourceName = name || sourceForm.elements.oldName.value;
  if (!sourceName || !confirm(`${sourceName} silinsin mi?`)) return;
  removeSettingValue("sources", sourceName);
  saveState();
  if (sourceDialog.open) sourceDialog.close();
  render();
}

function addSettingItem(listKey) {
  const label = settingsLabels[listKey] || "Ayar";
  const value = prompt(`${label} için yeni kayıt`);
  if (value === null) return;
  addSettingValue(listKey, value.trim());
  saveState();
  render();
}

function editSettingItem(listKey, oldValue) {
  const value = prompt(`${settingsLabels[listKey] || "Ayar"} düzenle`, oldValue);
  if (value === null) return;
  updateSettingItem(listKey, oldValue, value.trim());
  saveState();
  render();
}

function deleteSettingItem(listKey, value) {
  if (!confirm(`${value} silinsin mi?`)) return;
  removeSettingValue(listKey, value);
  saveState();
  render();
}

function addSettingValue(listKey, value) {
  if (!value) return;
  const list = settingsList(listKey);
  if (!list.includes(value)) state.settings[listKey] = [...list, value];
}

function updateSettingItem(listKey, oldValue, newValue) {
  if (!newValue) return;
  state.settings[listKey] = settingsList(listKey).map((item) => item === oldValue ? newValue : item);
  state.settings[listKey] = uniqueValues(state.settings[listKey]);
  updateExistingRecords(listKey, oldValue, newValue);
}

function removeSettingValue(listKey, value) {
  state.settings[listKey] = settingsList(listKey).filter((item) => item !== value);
  updateExistingRecords(listKey, value, "");
}

function moveSettingItem(listKey, value, direction) {
  const list = settingsList(listKey);
  const index = list.indexOf(value);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  state.settings[listKey] = [...list];
  saveState();
  render();
}

function updateExistingRecords(listKey, oldValue, newValue) {
  const serviceField = { sources: "source", statuses: "status", brands: "brand", devices: "device", cities: "city" }[listKey];
  if (serviceField) {
    state.services.forEach((service) => {
      if (service[serviceField] === oldValue) service[serviceField] = newValue;
      if (listKey === "statuses") {
        service.statusHistory.forEach((item) => {
          if (item.status === oldValue) item.status = newValue;
        });
      }
    });
  }
  if (listKey === "statuses") {
    state.settings.dashboardCounters = settingsList("dashboardCounters")
      .map((item) => item === oldValue ? newValue : item)
      .filter(Boolean);
  }
  if (listKey === "sources") {
    state.cash.forEach((item) => {
      if (item.source === oldValue) item.source = newValue;
    });
  }
}

function printCash() {
  document.body.dataset.printMode = "cash";
  window.print();
  setTimeout(() => delete document.body.dataset.printMode, 300);
}

function shareCashWhatsApp() {
  const items = filteredCash();
  const totals = cashTotals(items);
  const breakdown = cashBreakdown(items);
  const source = cashSourceFilter.value || "Tüm kaynaklar";
  openCashReportWindow(items);
  const lines = [
    `Kasa Özeti - ${source}`,
    `Toplam Gelir: ${money(totals.income)}`,
    `Yapılan Ödeme: ${money(breakdown.manualExpense)}`,
    `Komisyon: ${money(breakdown.commission)}`,
    `Malzeme: ${money(breakdown.material)}`,
    `Kalan Ödeme: ${money(totals.balance)}`,
    "",
    ...items.slice(0, 20).map((item) => `${formatDate(item.date)} | ${item.type === "expense" ? "Gider" : "Tahsilat"} | ${cashItemSource(item) || "-"} | ${visibleCashTitle(item)} | ${money(item.amount)}`),
  ];
  if (items.length > 20) lines.push(`+${items.length - 20} hareket daha`);
  const url = `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
  window.open(url, "_blank", "noopener");
}

function openCashReportWindow(items) {
  const totals = cashTotals(items);
  const breakdown = cashBreakdown(items);
  const report = window.open("", "_blank", "noopener,width=900,height=700");
  if (!report) {
    window.print();
    return;
  }
  report.document.write(`
    <!doctype html>
    <html lang="tr">
    <head>
      <meta charset="utf-8">
      <title>Kasa Raporu</title>
      <style>
        body { font-family: Arial, sans-serif; color: #1e2530; margin: 24px; }
        h1 { margin: 0 0 6px; }
        .meta { color: #667383; margin-bottom: 18px; }
        .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 18px; }
        .summary div { border: 1px solid #d9e0e8; padding: 10px; border-radius: 6px; }
        .summary span { display: block; color: #667383; font-size: 12px; }
        .summary b { display: block; margin-top: 6px; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #d9e0e8; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #f3f7fb; }
        .expense { color: #c7443e; font-weight: 700; }
        @media print { body { margin: 12mm; } }
      </style>
    </head>
    <body>
      <h1>Kasa Raporu</h1>
      <div class="meta">${escapeHtml(formatDate(new Date()))} · ${escapeHtml(cashSourceFilter.value || "Tüm kaynaklar")}</div>
      <section class="summary">
        <div><span>Toplam Gelir</span><b>${money(totals.income)}</b></div>
        <div><span>Yapılan Ödeme</span><b class="expense">-${money(breakdown.manualExpense)}</b></div>
        <div><span>Komisyon</span><b class="expense">-${money(breakdown.commission)}</b></div>
        <div><span>Malzeme</span><b class="expense">-${money(breakdown.material)}</b></div>
        <div><span>Kalan Ödeme</span><b>${money(totals.balance)}</b></div>
      </section>
      <table>
        <thead><tr><th>Tarih</th><th>Tip</th><th>Kaynak</th><th>Açıklama</th><th>Tutar</th></tr></thead>
        <tbody>
          ${items.map((item) => `<tr>
            <td>${escapeHtml(formatDate(item.date))}</td>
            <td>${item.type === "expense" ? "Gider" : "Tahsilat"}</td>
            <td>${escapeHtml(cashItemSource(item) || "-")}</td>
            <td>${escapeHtml(visibleCashTitle(item) || (item.autoMaterialExpense ? "Malzeme" : item.autoCommissionExpense ? "Komisyon" : ""))}</td>
            <td class="${item.type === "expense" ? "expense" : ""}">${item.type === "expense" ? "-" : "+"}${money(item.amount)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <script>window.addEventListener('load', () => setTimeout(() => window.print(), 250));</script>
    </body>
    </html>
  `);
  report.document.close();
}

function syncSettlementCash(cashItem) {
  if (cashItem.parentCashId || cashItem.autoMaterialExpense || cashItem.autoCommissionExpense) return;
  state.cash = state.cash.filter((item) => item.parentCashId !== cashItem.id);
  if (cashItem.type !== "income") return;

  const materialCost = Number(cashItem.materialCost) || 0;
  const receivedAmount = Number(cashItem.amount) || 0;
  const commissionBase = Math.max(receivedAmount - materialCost, 0);
  const relatedItems = [];

  if (materialCost > 0) {
    relatedItems.push({
      id: uid(),
      parentCashId: cashItem.id,
      serviceId: cashItem.serviceId,
      source: cashItem.source,
      autoMaterialExpense: true,
      date: cashItem.date,
      type: "expense",
      title: "",
      amount: materialCost,
      materialCost: 0,
      commission50: false,
    });
  }

  if (cashItem.commission50 && commissionBase > 0) {
    relatedItems.push({
      id: uid(),
      parentCashId: cashItem.id,
      serviceId: cashItem.serviceId,
      source: cashItem.source,
      autoCommissionExpense: true,
      date: cashItem.date,
      type: "expense",
      title: "",
      amount: commissionBase / 2,
      materialCost: 0,
      commission50: false,
    });
  }

  state.cash = [...relatedItems, ...state.cash];
}

function syncServiceCash(service) {
  const existing = state.cash.find((item) => item.serviceId === service.id && (item.autoServiceIncome || item.title === `Servis tahsilatı ${service.id}`));
  const shouldHaveIncome = service.paymentStatus === "Ödendi" && service.price > 0;
  if (!shouldHaveIncome && existing) {
    state.cash = state.cash.filter((item) => item.id !== existing.id);
    return;
  }
  if (shouldHaveIncome && existing) {
    existing.date = toIsoDate(new Date());
    existing.type = "income";
    existing.title = `Servis tahsilatı ${service.id}`;
    existing.amount = service.price;
    existing.source = service.source || "";
    existing.autoServiceIncome = true;
    return;
  }
  if (shouldHaveIncome && !existing) {
    state.cash.unshift({ id: uid(), serviceId: service.id, source: service.source || "", autoServiceIncome: true, date: toIsoDate(new Date()), type: "income", title: `Servis tahsilatı ${service.id}`, amount: service.price });
  }
}

function settingsList(key) {
  if (!state.settings) state.settings = cloneSettings(defaultSettings);
  if (!Array.isArray(state.settings[key])) state.settings[key] = [...defaultSettings[key]];
  return state.settings[key];
}

function cloneSettings(settings) {
  return Object.fromEntries(Object.entries(settings).map(([key, value]) => [key, [...value]]));
}

function uniqueValues(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function isStatus(status, expected) {
  return norm(status) === norm(expected);
}

function serviceHasDate(service, isoDate) {
  return serviceMainDate(service) === isoDate;
}

function serviceMainDate(service) {
  return service.availableDate || (service.createdAt ? toIsoDate(new Date(service.createdAt)) : "");
}

function ensureValues(values, requiredValues) {
  const list = [...values];
  requiredValues.forEach((value) => {
    if (!list.includes(value)) list.push(value);
  });
  return list;
}

function serviceSource(serviceId) {
  const service = state.services.find((item) => item.id === String(serviceId || "").trim());
  return service?.source || "";
}

function cashItemSource(item) {
  return serviceSource(item.serviceId) || item.source || "";
}

function visibleCashTitle(item) {
  const title = item.title || "";
  if (item.autoMaterialExpense && norm(title).startsWith("malzeme gideri")) return "";
  if (item.autoCommissionExpense && norm(title).includes("komisyon")) return "";
  return title;
}

function nextServiceId() {
  const max = state.services.reduce((num, service) => Math.max(num, Number(service.id) || 0), 665000);
  return String(max + 1);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function toIsoDate(date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

function addYear(iso) {
  const date = new Date(iso);
  date.setFullYear(date.getFullYear() + 1);
  return toIsoDate(date);
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function formatDateTimeWithDay(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function money(value) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function norm(value) {
  return String(value || "").toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
}

function digits(value) {
  return String(value || "").replace(/\D+/g, "");
}

function isClosed(status) {
  return ["İşlem Tamam", "Hesap Kapatıldı", "Servis Sonlandırıldı", "Cihaz Teslim Edildi", "Müşteri İptal Etti"].includes(status);
}

function statusClass(status) {
  if (status === "İşlem Tamam") return "complete";
  if (status === "İşlemde" || status === "Yeni Kayıt") return "new";
  if (status === "Ödeme Bekliyor") return "payment";
  return "";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
