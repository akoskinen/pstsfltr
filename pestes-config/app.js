const STORAGE_KEY = "pestes-config:v1";
const PREFS_KEY = "pestes-config:prefs:v1";

// Defaults: prefill with the current live published CSV URLs (can be changed in UI)
const DEFAULT_IMPORT_URLS = {
  services:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZ5pDU4abVMjkQ4IweQ6bJGCkXslgfDLFv0rdfyhaFHt3DhFxOKZVymMjVL9I8ZeAHTq_Oyjy7ROBJ/pub?gid=0&single=true&output=csv",
  categories:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZ5pDU4abVMjkQ4IweQ6bJGCkXslgfDLFv0rdfyhaFHt3DhFxOKZVymMjVL9I8ZeAHTq_Oyjy7ROBJ/pub?gid=1089844985&single=true&output=csv",
};

function slugifyId(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function toInt(raw, fallback = 0) {
  const n = Number(String(raw ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

function escapeCsv(value) {
  const s = String(value ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// RFC4180-ish CSV parser (handles quoted fields with commas/newlines)
function parseCSV(csvText) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\r") continue;

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  rows.push(row);

  while (rows.length > 0 && rows[rows.length - 1].every((c) => String(c ?? "").trim() === "")) {
    rows.pop();
  }

  return rows;
}

function parseCSVToObjects(csvText) {
  const rows = parseCSV(csvText);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => String(h ?? "").trim());
  return rows
    .slice(1)
    .filter((r) => r.some((c) => String(c ?? "").trim() !== ""))
    .map((values) => {
      const obj = {};
      headers.forEach((h, idx) => {
        if (!h) return;
        obj[h] = values[idx] !== undefined ? String(values[idx]).trim() : "";
      });
      return obj;
    });
}

function downloadText(filename, text, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function getDefaultState() {
  return {
    primaries: [
      { id: "yksityinen", label: "Yksityinen", order: 1 },
      { id: "taloyhtio", label: "Taloyhtiö", order: 2 },
      { id: "yritys", label: "Yritys", order: 3 },
    ],
    secondariesByPrimary: {
      yksityinen: [
        { id: "mokki", label: "Mökki", order: 1 },
        { id: "kerrostalo", label: "Kerrostalo", order: 2 },
        { id: "omakotitalo", label: "Omakotitalo", order: 3 },
      ],
      taloyhtio: [
        { id: "kerrostalo", label: "Kerrostalo", order: 1 },
        { id: "rivitalo", label: "Rivitalo", order: 2 },
      ],
      yritys: [
        { id: "toimisto", label: "Toimisto", order: 1 },
        { id: "teollisuus", label: "Teollisuus", order: 2 },
        { id: "varasto", label: "Varasto", order: 3 },
      ],
    },
    services: [],
    draft: {
      editingServiceId: null,
      service: null,
    },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch {
    return getDefaultState();
  }
}

function normalizeState(s) {
  const state = getDefaultState();
  if (!s || typeof s !== "object") return state;

  state.primaries = Array.isArray(s.primaries) ? s.primaries : state.primaries;
  state.secondariesByPrimary =
    s.secondariesByPrimary && typeof s.secondariesByPrimary === "object"
      ? s.secondariesByPrimary
      : state.secondariesByPrimary;
  state.services = Array.isArray(s.services) ? s.services : [];
  state.draft = s.draft && typeof s.draft === "object" ? s.draft : state.draft;

  // normalize shapes
  state.primaries = state.primaries
    .map((p) => ({ id: slugifyId(p.id), label: String(p.label ?? "").trim(), order: toInt(p.order, 0) }))
    .filter((p) => p.id && p.label);

  const sbp = {};
  Object.entries(state.secondariesByPrimary || {}).forEach(([primaryId, list]) => {
    const pid = slugifyId(primaryId);
    if (!Array.isArray(list)) return;
    sbp[pid] = list
      .map((c) => ({ id: slugifyId(c.id), label: String(c.label ?? "").trim(), order: toInt(c.order, 0) }))
      .filter((c) => c.id && c.label);
  });
  state.secondariesByPrimary = sbp;

  state.services = state.services
    .map((svc) => ({
      service_id: String(svc.service_id ?? "").trim(),
      service_name: String(svc.service_name ?? "").trim(),
      description: String(svc.description ?? "").trim(),
      price: String(svc.price ?? "").trim(),
      image_url: String(svc.image_url ?? "").trim(),
      cta_text: String(svc.cta_text ?? "").trim(),
      cta_url: String(svc.cta_url ?? "").trim(),
      // mapping: { [primaryId]: { enabled: bool, tags: string[] } }
      mapping: svc.mapping && typeof svc.mapping === "object" ? svc.mapping : {},
    }))
    .filter((svc) => svc.service_id && svc.service_name);

  return state;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  setStatus("Tallennettu");
}

function setStatus(text) {
  const el = document.getElementById("status");
  el.textContent = text;
  clearTimeout(setStatus._t);
  setStatus._t = setTimeout(() => (el.textContent = ""), 1400);
}

let state = loadState();

// ---- DOM refs ----
const els = {
  primaryId: document.getElementById("primaryId"),
  primaryLabel: document.getElementById("primaryLabel"),
  primaryOrder: document.getElementById("primaryOrder"),
  addPrimaryBtn: document.getElementById("addPrimaryBtn"),
  primariesTbody: document.getElementById("primariesTbody"),

  secondaryPrimarySelect: document.getElementById("secondaryPrimarySelect"),
  secondaryId: document.getElementById("secondaryId"),
  secondaryLabel: document.getElementById("secondaryLabel"),
  secondaryOrder: document.getElementById("secondaryOrder"),
  addSecondaryBtn: document.getElementById("addSecondaryBtn"),
  secondariesTbody: document.getElementById("secondariesTbody"),

  serviceId: document.getElementById("serviceId"),
  serviceName: document.getElementById("serviceName"),
  servicePrice: document.getElementById("servicePrice"),
  serviceDesc: document.getElementById("serviceDesc"),
  serviceImage: document.getElementById("serviceImage"),
  serviceCtaText: document.getElementById("serviceCtaText"),
  serviceCtaUrl: document.getElementById("serviceCtaUrl"),
  serviceTagMatrix: document.getElementById("serviceTagMatrix"),
  servicePreview: document.getElementById("servicePreview"),
  clearServiceFormBtn: document.getElementById("clearServiceFormBtn"),
  saveServiceBtn: document.getElementById("saveServiceBtn"),
  servicesTbody: document.getElementById("servicesTbody"),
  serviceCount: document.getElementById("serviceCount"),

  downloadServicesCsvBtn: document.getElementById("downloadServicesCsvBtn"),
  downloadCategoriesCsvBtn: document.getElementById("downloadCategoriesCsvBtn"),
  downloadJsonBtn: document.getElementById("downloadJsonBtn"),
  importJsonInput: document.getElementById("importJsonInput"),
  exportBtn: document.getElementById("exportBtn"),
  resetBtn: document.getElementById("resetBtn"),

  importServicesUrl: document.getElementById("importServicesUrl"),
  importCategoriesUrl: document.getElementById("importCategoriesUrl"),
  importFromSheetsBtn: document.getElementById("importFromSheetsBtn"),
};

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_IMPORT_URLS };
    const p = JSON.parse(raw);
    return {
      services: String(p.services || DEFAULT_IMPORT_URLS.services),
      categories: String(p.categories || DEFAULT_IMPORT_URLS.categories),
    };
  } catch {
    return { ...DEFAULT_IMPORT_URLS };
  }
}

function savePrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function setImportInputsFromPrefs() {
  const prefs = loadPrefs();
  els.importServicesUrl.value = prefs.services;
  els.importCategoriesUrl.value = prefs.categories;
}

async function importFromGoogleSheetsCSV() {
  if (window.location.protocol === "file:") {
    setStatus("Avaa local serverin kautta (ei file://)");
    return;
  }

  const servicesURL = String(els.importServicesUrl.value || "").trim();
  const categoriesURL = String(els.importCategoriesUrl.value || "").trim();
  if (!servicesURL || !categoriesURL) {
    setStatus("Syötä molemmat CSV-URL:t");
    return;
  }

  if (!confirm("Tämä korvaa nykyisen konfiguraation tässä työkalussa. Jatketaanko?")) return;

  savePrefs({ services: servicesURL, categories: categoriesURL });
  setStatus("Haetaan...");

  let servicesCSV = "";
  let categoriesCSV = "";
  try {
    const [sr, cr] = await Promise.all([
      fetch(servicesURL, { cache: "no-store" }),
      fetch(categoriesURL, { cache: "no-store" }),
    ]);
    if (!sr.ok) throw new Error(`Services: ${sr.status}`);
    if (!cr.ok) throw new Error(`Categories: ${cr.status}`);
    [servicesCSV, categoriesCSV] = await Promise.all([sr.text(), cr.text()]);
  } catch (e) {
    console.error(e);
    setStatus("Haku epäonnistui (Publish to web? CORS?)");
    return;
  }

  const categoriesRows = parseCSVToObjects(categoriesCSV);
  const servicesRows = parseCSVToObjects(servicesCSV);

  // Build categories
  const primaries = categoriesRows
    .filter((r) => String(r.category_type).trim() === "primary")
    .map((r) => ({
      id: slugifyId(r.category_id),
      label: String(r.checkbox_label || "").trim(),
      order: toInt(r.display_order, 0),
    }))
    .filter((p) => p.id && p.label)
    .sort(sortByOrder);

  const secondariesByPrimary = {};
  categoriesRows
    .filter((r) => String(r.category_type).trim() === "secondary")
    .forEach((r) => {
      const primary = slugifyId(r.primary_category);
      if (!primary) return;
      if (!secondariesByPrimary[primary]) secondariesByPrimary[primary] = [];
      secondariesByPrimary[primary].push({
        id: slugifyId(r.category_id),
        label: String(r.checkbox_label || "").trim(),
        order: toInt(r.display_order, 0),
      });
    });
  Object.keys(secondariesByPrimary).forEach((k) => {
    secondariesByPrimary[k] = secondariesByPrimary[k].filter((c) => c.id && c.label).sort(sortByOrder);
  });

  // Ensure buckets exist for every primary
  primaries.forEach((p) => {
    if (!secondariesByPrimary[p.id]) secondariesByPrimary[p.id] = [];
  });

  // Services -> internal mapping
  const primaryIds = primaries.map((p) => p.id);
  const services = servicesRows
    .filter((r) => String(r.service_id || "").trim())
    .map((r) => {
      const primaryCats = String(r.primary_categories || "")
        .split(",")
        .map((c) => slugifyId(c))
        .filter(Boolean);

      const mapping = {};
      primaryIds.forEach((pid) => {
        const enabled = primaryCats.includes(pid);
        const tagsColumn = `${pid}_tags`;
        const rawTags = String(r[tagsColumn] || "").trim();
        const tags =
          rawTags && rawTags !== "-"
            ? rawTags
                .split(",")
                .map((t) => slugifyId(t))
                .filter(Boolean)
            : [];
        mapping[pid] = { enabled, tags };
      });

      return {
        service_id: String(r.service_id || "").trim(),
        service_name: String(r.service_name || "").trim(),
        description: String(r.description || "").trim(),
        price: String(r.price || "").trim(),
        image_url: String(r.image_url || "").trim(),
        cta_text: String(r.cta_text || "").trim(),
        cta_url: String(r.cta_url || "").trim(),
        mapping,
      };
    })
    .filter((s) => s.service_id && s.service_name);

  state = normalizeState({
    primaries,
    secondariesByPrimary,
    services,
    draft: { editingServiceId: null, service: null },
  });

  saveState();
  renderAll();
  clearServiceForm();
  setStatus("Tuotu");
}

// ---- Rendering ----
function sortByOrder(a, b) {
  return (a.order || 0) - (b.order || 0) || a.label.localeCompare(b.label);
}

function getPrimariesSorted() {
  return [...state.primaries].sort(sortByOrder);
}

function ensureSecondariesBucket(primaryId) {
  if (!state.secondariesByPrimary[primaryId]) state.secondariesByPrimary[primaryId] = [];
}

function renderPrimaries() {
  const primaries = getPrimariesSorted();
  els.primariesTbody.innerHTML = primaries
    .map(
      (p) => `
      <tr>
        <td>${escapeHtml(p.order)}</td>
        <td><code>${escapeHtml(p.id)}</code></td>
        <td>${escapeHtml(p.label)}</td>
        <td>
          <button class="btn btn--ghost" data-action="del-primary" data-id="${escapeAttr(p.id)}" type="button">Poista</button>
        </td>
      </tr>
    `
    )
    .join("");

  // Update secondary primary selector
  els.secondaryPrimarySelect.innerHTML = primaries
    .map((p) => `<option value="${escapeAttr(p.id)}">${escapeHtml(p.label)} (${escapeHtml(p.id)})</option>`)
    .join("");

  // Keep selection stable if possible
  const current = els.secondaryPrimarySelect.dataset.current;
  if (current && primaries.some((p) => p.id === current)) {
    els.secondaryPrimarySelect.value = current;
  }

  els.secondaryPrimarySelect.dataset.current = els.secondaryPrimarySelect.value || "";

  // Re-render dependent parts
  renderSecondaries();
  renderServiceTagMatrix();
}

function renderSecondaries() {
  const primaryId = els.secondaryPrimarySelect.value;
  if (!primaryId) {
    els.secondariesTbody.innerHTML = "";
    return;
  }
  ensureSecondariesBucket(primaryId);
  const list = [...state.secondariesByPrimary[primaryId]].sort(sortByOrder);
  els.secondariesTbody.innerHTML = list
    .map(
      (c) => `
      <tr>
        <td>${escapeHtml(c.order)}</td>
        <td><code>${escapeHtml(c.id)}</code></td>
        <td>${escapeHtml(c.label)}</td>
        <td>
          <button class="btn btn--ghost" data-action="del-secondary" data-primary="${escapeAttr(
            primaryId
          )}" data-id="${escapeAttr(c.id)}" type="button">Poista</button>
        </td>
      </tr>
    `
    )
    .join("");

  renderServiceTagMatrix();
}

function getDraftService() {
  const svc = {
    service_id: String(els.serviceId.value || "").trim(),
    service_name: String(els.serviceName.value || "").trim(),
    description: String(els.serviceDesc.value || "").trim(),
    price: String(els.servicePrice.value || "").trim(),
    image_url: String(els.serviceImage.value || "").trim(),
    cta_text: String(els.serviceCtaText.value || "").trim(),
    cta_url: String(els.serviceCtaUrl.value || "").trim(),
    mapping: {},
  };

  // mapping from UI
  const primaries = getPrimariesSorted();
  primaries.forEach((p) => {
    const enabled = !!document.getElementById(`svc-primary-${p.id}`)?.checked;
    const tags = [...document.querySelectorAll(`[data-svc-tag="${p.id}"]:checked`)].map((i) => i.value);
    svc.mapping[p.id] = { enabled, tags };
  });

  return svc;
}

function computePrimaryCategories(service) {
  return getPrimariesSorted()
    .filter((p) => service.mapping?.[p.id]?.enabled)
    .map((p) => p.id)
    .join(",");
}

function renderServiceTagMatrix() {
  const primaries = getPrimariesSorted();
  if (primaries.length === 0) {
    els.serviceTagMatrix.innerHTML =
      '<div class="note"><div class="note__title">Lisää ensin pääkategoriat</div><div class="note__body">Tarvitset vähintään yhden pääkategorian ennen kuin voit määrittää palveluiden tagit.</div></div>';
    return;
  }

  // Ensure secondaries buckets exist
  primaries.forEach((p) => ensureSecondariesBucket(p.id));

  // Use current form values for preview (without re-rendering on every keystroke)
  const draft = getDraftService();
  updateServicePreview(draft);

  els.serviceTagMatrix.innerHTML = primaries
    .map((p) => {
      const secondaries = [...(state.secondariesByPrimary[p.id] || [])].sort(sortByOrder);
      const enabledChecked = draft.mapping?.[p.id]?.enabled ? "checked" : "";
      const disabled = secondaries.length === 0 ? "disabled" : "";

      return `
        <div class="tagGroup">
          <div class="tagGroup__header">
            <div class="tagGroup__title">${escapeHtml(p.label)} <span class="muted">(${escapeHtml(p.id)})</span></div>
            <label class="pill">
              <input id="svc-primary-${escapeAttr(p.id)}" type="checkbox" ${enabledChecked} />
              Näytä tässä tabissa
            </label>
          </div>
          <div class="tagList" ${disabled ? 'aria-disabled="true"' : ""}>
            ${
              secondaries.length === 0
                ? `<div class="muted">Ei alakategorioita. Lisää alakategorioita yllä.</div>`
                : secondaries
                    .map((c) => {
                      const checked = draft.mapping?.[p.id]?.tags?.includes(c.id) ? "checked" : "";
                      return `
                        <label class="chip">
                          <input type="checkbox" value="${escapeAttr(c.id)}" data-svc-tag="${escapeAttr(
                        p.id
                      )}" ${checked} />
                          <b>${escapeHtml(c.label)}</b>
                          <span class="muted">${escapeHtml(c.id)}</span>
                        </label>
                      `;
                    })
                    .join("")
            }
          </div>
        </div>
      `;
    })
    .join("");

  // Wire up live preview
  els.serviceTagMatrix.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      updateServicePreview(getDraftService());
    });
  });
}

function updateServicePreview(draftService) {
  const svc = draftService || getDraftService();
  const primaryCats = computePrimaryCategories(svc);
  els.servicePreview.textContent = primaryCats
    ? `Pääkategoriat: ${primaryCats}`
    : "Pääkategoriat: (ei valittuja)";
}

function renderServicesList() {
  const rows = [...state.services].sort((a, b) => toInt(a.service_id, 0) - toInt(b.service_id, 0));
  els.servicesTbody.innerHTML = rows
    .map((s) => {
      const primaryCats = computePrimaryCategories(s);
      return `
        <tr>
          <td><code>${escapeHtml(s.service_id)}</code></td>
          <td>${escapeHtml(s.service_name)}</td>
          <td>${primaryCats ? `<span class="pill">${escapeHtml(primaryCats)}</span>` : '<span class="muted">-</span>'}</td>
          <td>
            <button class="btn btn--ghost" data-action="edit-service" data-id="${escapeAttr(
              s.service_id
            )}" type="button">Muokkaa</button>
            <button class="btn btn--ghost" data-action="del-service" data-id="${escapeAttr(
              s.service_id
            )}" type="button">Poista</button>
          </td>
        </tr>
      `;
    })
    .join("");
  els.serviceCount.textContent = `${rows.length} kpl`;
}

function renderAll() {
  renderPrimaries();
  renderServicesList();
}

// ---- Actions ----
function addPrimary() {
  const id = slugifyId(els.primaryId.value);
  const label = String(els.primaryLabel.value || "").trim();
  const order = toInt(els.primaryOrder.value, 1);

  if (!id || !label) {
    setStatus("Täytä ID + nimi");
    return;
  }
  if (state.primaries.some((p) => p.id === id)) {
    setStatus("ID on jo käytössä");
    return;
  }
  state.primaries.push({ id, label, order });
  ensureSecondariesBucket(id);
  saveState();
  els.primaryId.value = "";
  els.primaryLabel.value = "";
  els.primaryOrder.value = String(Math.max(1, order + 1));
  renderAll();
}

function deletePrimary(id) {
  state.primaries = state.primaries.filter((p) => p.id !== id);
  delete state.secondariesByPrimary[id];

  // Remove mappings for that primary from services
  state.services = state.services.map((s) => {
    const mapping = { ...(s.mapping || {}) };
    delete mapping[id];
    return { ...s, mapping };
  });

  saveState();
  renderAll();
}

function addSecondary() {
  const primaryId = els.secondaryPrimarySelect.value;
  if (!primaryId) {
    setStatus("Lisää ensin pääkategoria");
    return;
  }
  const id = slugifyId(els.secondaryId.value);
  const label = String(els.secondaryLabel.value || "").trim();
  const order = toInt(els.secondaryOrder.value, 1);

  if (!id || !label) {
    setStatus("Täytä ID + nimi");
    return;
  }

  ensureSecondariesBucket(primaryId);
  if (state.secondariesByPrimary[primaryId].some((c) => c.id === id)) {
    setStatus("Alakategorian ID on jo käytössä");
    return;
  }

  state.secondariesByPrimary[primaryId].push({ id, label, order });
  saveState();
  els.secondaryId.value = "";
  els.secondaryLabel.value = "";
  els.secondaryOrder.value = String(Math.max(1, order + 1));
  renderSecondaries();
  renderServiceTagMatrix();
}

function deleteSecondary(primaryId, id) {
  ensureSecondariesBucket(primaryId);
  state.secondariesByPrimary[primaryId] = state.secondariesByPrimary[primaryId].filter((c) => c.id !== id);

  // Remove from service mappings
  state.services = state.services.map((s) => {
    const mapping = { ...(s.mapping || {}) };
    const m = mapping[primaryId];
    if (m && Array.isArray(m.tags)) {
      mapping[primaryId] = { ...m, tags: m.tags.filter((t) => t !== id) };
    }
    return { ...s, mapping };
  });

  saveState();
  renderSecondaries();
  renderServiceTagMatrix();
  renderServicesList();
}

function clearServiceForm() {
  els.serviceId.value = "";
  els.serviceName.value = "";
  els.serviceDesc.value = "";
  els.servicePrice.value = "";
  els.serviceImage.value = "";
  els.serviceCtaText.value = "";
  els.serviceCtaUrl.value = "";
  state.draft.editingServiceId = null;
  saveState();
  renderServiceTagMatrix();
  updateServicePreview(getDraftService());
  setStatus("Lomake tyhjennetty");
}

function saveService() {
  const svc = getDraftService();

  if (!svc.service_id || !svc.service_name) {
    setStatus("Palvelu: service_id + otsikko vaaditaan");
    return;
  }

  // Validate unique ID
  const existing = state.services.find((s) => s.service_id === svc.service_id);
  if (existing && state.draft.editingServiceId !== svc.service_id) {
    setStatus("service_id on jo käytössä");
    return;
  }

  // If editing, remove old
  if (state.draft.editingServiceId && state.draft.editingServiceId !== svc.service_id) {
    state.services = state.services.filter((s) => s.service_id !== state.draft.editingServiceId);
  }

  // Upsert
  state.services = state.services.filter((s) => s.service_id !== svc.service_id).concat([svc]);
  state.draft.editingServiceId = svc.service_id;
  saveState();
  renderServicesList();
  setStatus("Palvelu tallennettu");
}

function editService(serviceId) {
  const svc = state.services.find((s) => s.service_id === serviceId);
  if (!svc) return;

  state.draft.editingServiceId = svc.service_id;
  els.serviceId.value = svc.service_id;
  els.serviceName.value = svc.service_name;
  els.serviceDesc.value = svc.description;
  els.servicePrice.value = svc.price;
  els.serviceImage.value = svc.image_url;
  els.serviceCtaText.value = svc.cta_text;
  els.serviceCtaUrl.value = svc.cta_url;

  // render tag matrix with checked states from svc
  // temporarily set form inputs via draft logic: we will render based on getDraftService(), so we need to render and then set checkboxes.
  renderServiceTagMatrix();

  const primaries = getPrimariesSorted();
  primaries.forEach((p) => {
    const m = svc.mapping?.[p.id];
    const primaryCheckbox = document.getElementById(`svc-primary-${p.id}`);
    if (primaryCheckbox) primaryCheckbox.checked = !!m?.enabled;
    (m?.tags || []).forEach((tagId) => {
      const input = document.querySelector(`[data-svc-tag="${p.id}"][value="${CSS.escape(tagId)}"]`);
      if (input) input.checked = true;
    });
  });

  // refresh preview
  updateServicePreview(getDraftService());

  setStatus("Muokkaustila");
}

function deleteService(serviceId) {
  state.services = state.services.filter((s) => s.service_id !== serviceId);
  if (state.draft.editingServiceId === serviceId) state.draft.editingServiceId = null;
  saveState();
  renderServicesList();
  setStatus("Poistettu");
}

// ---- Export ----
function buildCategoriesCsv() {
  const header = ["category_type", "primary_category", "category_id", "checkbox_label", "display_order"];
  const rows = [header];

  const primaries = getPrimariesSorted();
  primaries.forEach((p) => {
    rows.push(["primary", "-", p.id, p.label, String(p.order || 0)]);
  });

  primaries.forEach((p) => {
    const secondaries = [...(state.secondariesByPrimary[p.id] || [])].sort(sortByOrder);
    secondaries.forEach((c) => {
      rows.push(["secondary", p.id, c.id, c.label, String(c.order || 0)]);
    });
  });

  return rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
}

function buildServicesCsv() {
  const primaries = getPrimariesSorted();
  const tagColumns = primaries.map((p) => `${p.id}_tags`);

  const header = [
    "service_id",
    "service_name",
    "description",
    "price",
    "primary_categories",
    ...tagColumns,
    "image_url",
    "cta_text",
    "cta_url",
  ];

  const rows = [header];
  const services = [...state.services].sort((a, b) => toInt(a.service_id, 0) - toInt(b.service_id, 0));

  services.forEach((s) => {
    const primary_categories = computePrimaryCategories(s);
    const tagValues = primaries.map((p) => {
      const m = s.mapping?.[p.id];
      if (!m?.enabled) return "-";
      const tags = (m.tags || []).filter(Boolean);
      return tags.length ? tags.join(",") : "-";
    });

    rows.push([
      s.service_id,
      s.service_name,
      s.description,
      s.price,
      primary_categories,
      ...tagValues,
      s.image_url,
      s.cta_text,
      s.cta_url,
    ]);
  });

  return rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
}

function exportAllCsv() {
  downloadText("Services.csv", buildServicesCsv(), "text/csv;charset=utf-8");
  downloadText("Categories.csv", buildCategoriesCsv(), "text/csv;charset=utf-8");
  setStatus("CSV ladattu");
}

function exportJson() {
  downloadText("pestes-config.json", JSON.stringify(state, null, 2), "application/json;charset=utf-8");
  setStatus("JSON ladattu");
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      state = normalizeState(parsed);
      saveState();
      renderAll();
      clearServiceForm();
      setStatus("JSON tuotu");
    } catch {
      setStatus("JSON virhe");
    }
  };
  reader.readAsText(file);
}

function resetAll() {
  if (!confirm("Tyhjennetäänkö kaikki? Tätä ei voi perua.")) return;
  state = getDefaultState();
  saveState();
  renderAll();
  clearServiceForm();
}

// ---- small helpers ----
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(s) {
  // safe for attribute context
  return escapeHtml(s).replace(/"/g, "&quot;");
}

// ---- wiring ----
els.addPrimaryBtn.addEventListener("click", addPrimary);
els.addSecondaryBtn.addEventListener("click", addSecondary);
els.secondaryPrimarySelect.addEventListener("change", () => {
  els.secondaryPrimarySelect.dataset.current = els.secondaryPrimarySelect.value || "";
  renderSecondaries();
});

// Only update preview on typing — don't re-render tag matrix (would reset checkbox selections)
[els.serviceId, els.serviceName, els.serviceDesc, els.servicePrice, els.serviceImage, els.serviceCtaText, els.serviceCtaUrl].forEach(
  (el) => el.addEventListener("input", () => updateServicePreview(getDraftService()))
);

els.clearServiceFormBtn.addEventListener("click", clearServiceForm);
els.saveServiceBtn.addEventListener("click", saveService);

els.downloadServicesCsvBtn.addEventListener("click", () => downloadText("Services.csv", buildServicesCsv(), "text/csv;charset=utf-8"));
els.downloadCategoriesCsvBtn.addEventListener("click", () => downloadText("Categories.csv", buildCategoriesCsv(), "text/csv;charset=utf-8"));
els.downloadJsonBtn.addEventListener("click", exportJson);
els.importJsonInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) importJson(file);
  e.target.value = "";
});
els.exportBtn.addEventListener("click", exportAllCsv);
els.resetBtn.addEventListener("click", resetAll);
els.importFromSheetsBtn.addEventListener("click", importFromGoogleSheetsCSV);

document.addEventListener("click", (e) => {
  const btn = e.target?.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === "del-primary") return deletePrimary(btn.dataset.id);
  if (action === "del-secondary") return deleteSecondary(btn.dataset.primary, btn.dataset.id);
  if (action === "edit-service") return editService(btn.dataset.id);
  if (action === "del-service") return deleteService(btn.dataset.id);
});

renderAll();
renderServiceTagMatrix();
renderServicesList();
updateServicePreview(getDraftService());

setImportInputsFromPrefs();


