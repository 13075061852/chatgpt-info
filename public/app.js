const sources = ["全部", "抖音", "快手", "小红书", "QQ", "微信"];
const packages = ["全部", "ChatGpt月卡", "ChatGpt年卡", "Cursor pro月卡", "Cursor pro月卡年卡", "ClaudeCode pro"];
const types = ["全部", "代充", "成品号"];

const state = {
  records: [],
  filters: {
    source: "全部",
    packageName: "全部",
    recordType: "全部",
    query: ""
  },
  pagination: {
    page: 1,
    pageSize: 20
  },
  activeFilter: null
};

const loginView = document.querySelector("#loginView");
const appView = document.querySelector("#appView");
const sidebar = document.querySelector(".sidebar");
const menuButton = document.querySelector(".menu-button");
const recordsBody = document.querySelector("#recordsBody");
const emptyState = document.querySelector("#emptyState");
const drawer = document.querySelector("#drawer");
const recordForm = document.querySelector("#recordForm");
const recordSubmitButton = document.querySelector("#recordSubmitButton");
const copyToast = document.querySelector("#copyToast");
const filterPopup = document.querySelector("#filterPopup");

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "include",
    ...options
  });

  if (response.status === 401) {
    showLogin();
    throw new Error("未登录");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "请求失败");
  }
  return data;
};

const money = (value, minimumFractionDigits = 2) => {
  const number = Number(value || 0);
  return `￥${number.toLocaleString("zh-CN", { minimumFractionDigits, maximumFractionDigits: 2 })}`;
};

const signedNumber = (value, minimumFractionDigits = 0) => {
  const number = Number(value || 0);
  const sign = number > 0 ? "+" : number < 0 ? "-" : "+";
  return `${sign}${Math.abs(number).toLocaleString("zh-CN", { minimumFractionDigits, maximumFractionDigits: 2 })}`;
};

const dateKey = (date) => {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};

const recordDateKey = (record) => {
  const value = record.purchaseTime || record.createdAt;
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : dateKey(value);
};

const setDeltaClass = (element, value) => {
  element.classList.toggle("up", value > 0);
  element.classList.toggle("down", value < 0);
};

const closeSidebar = () => {
  appView.classList.remove("sidebar-open");
  menuButton.setAttribute("aria-expanded", "false");
};

const toggleSidebar = () => {
  const isOpen = appView.classList.toggle("sidebar-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
};

const showLogin = () => {
  closeSidebar();
  loginView.hidden = false;
  appView.hidden = true;
};

const showApp = () => {
  loginView.hidden = true;
  appView.hidden = false;
};

const fillFormSelect = (select, values) => {
  select.innerHTML = values.slice(1).map((item) => `<option value="${item}">${item}</option>`).join("");
};

const icon = (name, className = "ui-icon") => `<svg class="${className}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;

const filterConfigs = {
  source: {
    label: "来源",
    stateKey: "source",
    values: sources
  },
  packageName: {
    label: "套餐",
    stateKey: "packageName",
    values: packages
  },
  recordType: {
    label: "类型",
    stateKey: "recordType",
    values: types
  }
};

const sourceLogo = (source) =>
  ({
    抖音: "DY",
    快手: "KS",
    小红书: "RED",
    QQ: "QQ",
    微信: "WX"
  })[source] || source;

const resetToFirstPage = () => {
  state.pagination.page = 1;
};

const setupFilters = () => {
  fillFormSelect(recordForm.elements.source, sources);
  fillFormSelect(recordForm.elements.packageName, packages);
  fillFormSelect(recordForm.elements.recordType, types);
  renderFilterTriggers();
};

const renderFilterTriggers = () => {
  document.querySelectorAll("[data-filter-trigger]").forEach((button) => {
    const config = filterConfigs[button.dataset.filterTrigger];
    const value = state.filters[config.stateKey];
    const selected = value === "全部" ? config.label : value;
    button.classList.toggle("active", value !== "全部");
    button.innerHTML = `<span class="th-filter-value">${escapeHtml(selected)}</span>${icon("filter")}`;
  });
};

const closeFilterPopup = () => {
  state.activeFilter = null;
  filterPopup.hidden = true;
  filterPopup.innerHTML = "";
};

const openFilterPopup = (filterKey, anchor) => {
  const config = filterConfigs[filterKey];
  if (!config) return;

  if (!filterPopup.hidden && state.activeFilter === filterKey) {
    closeFilterPopup();
    return;
  }

  const currentValue = state.filters[config.stateKey];
  filterPopup.innerHTML = config.values
    .map((value) => {
      const label = value === "全部" ? `全部${config.label}` : value;
      const active = value === currentValue ? "active" : "";
      return `<button class="${active}" type="button" data-filter-key="${filterKey}" data-filter-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
    })
    .join("");

  const rect = anchor.getBoundingClientRect();
  const width = 190;
  const left = Math.min(rect.left, window.innerWidth - width - 8);
  filterPopup.style.left = `${Math.max(8, left)}px`;
  filterPopup.style.top = `${rect.bottom + 6}px`;
  filterPopup.hidden = false;
  state.activeFilter = filterKey;
};

const applyHeaderFilter = (filterKey, value) => {
  const config = filterConfigs[filterKey];
  if (!config) return;
  state.filters[config.stateKey] = value;
  resetToFirstPage();
  renderFilterTriggers();
  render();
  closeFilterPopup();
};

const filteredRecords = () => {
  const query = state.filters.query.trim().toLowerCase();
  return state.records.filter((record) => {
    const matchesSource = state.filters.source === "全部" || record.source === state.filters.source;
    const matchesPackage = state.filters.packageName === "全部" || record.packageName === state.filters.packageName;
    const matchesType = state.filters.recordType === "全部" || record.recordType === state.filters.recordType;
    const haystack = [record.userName, record.wechat, record.account, record.password, record.packageName, record.purchaseTime, record.remark].join(" ").toLowerCase();
    return matchesSource && matchesPackage && matchesType && (!query || haystack.includes(query));
  });
};

const getPagination = (records) => {
  const total = records.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pagination.pageSize));
  state.pagination.page = Math.min(Math.max(1, state.pagination.page), totalPages);
  const start = (state.pagination.page - 1) * state.pagination.pageSize;
  return {
    total,
    totalPages,
    start,
    pageRecords: records.slice(start, start + state.pagination.pageSize)
  };
};

const renderMetrics = () => {
  const total = state.records.length;
  const proxyCount = state.records.filter((item) => item.recordType === "代充").length;
  const finished = state.records.filter((item) => item.recordType === "成品号").length;
  const price = state.records.reduce((sum, item) => sum + Number(item.salePrice ?? item.price ?? 0), 0);
  const profit = state.records.reduce(
    (sum, item) => sum + Number(item.salePrice ?? item.price ?? 0) - Number(item.costPrice ?? item.price ?? 0),
    0
  );
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayKey = dateKey(today);
  const yesterdayKey = dateKey(yesterday);
  const todayRecords = state.records.filter((item) => recordDateKey(item) === todayKey);
  const yesterdayRecords = state.records.filter((item) => recordDateKey(item) === yesterdayKey);
  const todayPrice = todayRecords.reduce((sum, item) => sum + Number(item.salePrice ?? item.price ?? 0), 0);
  const yesterdayPrice = yesterdayRecords.reduce((sum, item) => sum + Number(item.salePrice ?? item.price ?? 0), 0);
  const todayProfit = todayRecords.reduce(
    (sum, item) => sum + Number(item.salePrice ?? item.price ?? 0) - Number(item.costPrice ?? item.price ?? 0),
    0
  );
  const yesterdayProfit = yesterdayRecords.reduce(
    (sum, item) => sum + Number(item.salePrice ?? item.price ?? 0) - Number(item.costPrice ?? item.price ?? 0),
    0
  );
  const priceDelta = todayPrice - yesterdayPrice;
  const profitDelta = todayProfit - yesterdayProfit;
  const proxyRate = total ? (proxyCount / total) * 100 : 0;
  const finishedRate = total ? (finished / total) * 100 : 0;
  const priceDeltaMetric = document.querySelector("#priceDeltaMetric");
  const profitDeltaMetric = document.querySelector("#profitDeltaMetric");

  document.querySelector("#proxyMetric").textContent = proxyCount.toLocaleString("zh-CN");
  document.querySelector("#finishedMetric").textContent = finished.toLocaleString("zh-CN");
  document.querySelector("#priceMetric").textContent = money(price);
  document.querySelector("#profitMetric").textContent = money(profit);
  document.querySelector("#proxyRateMetric").textContent = `占比 ${proxyRate.toFixed(2)}%`;
  document.querySelector("#finishedRateMetric").textContent = `占比 ${finishedRate.toFixed(2)}%`;
  priceDeltaMetric.textContent = `较昨日 ${signedNumber(priceDelta, 2)}`;
  profitDeltaMetric.textContent = `较昨日 ${signedNumber(profitDelta, 2)}`;
  setDeltaClass(priceDeltaMetric, priceDelta);
  setDeltaClass(profitDeltaMetric, profitDelta);
};

const typeClass = (type) => (type === "成品号" ? "type-tag finished" : "type-tag proxy");
const packageClass = (name) => (name.includes("ChatGpt") ? "package-tag chatgpt" : name.includes("Cursor") ? "package-tag cursor" : "package-tag claude");
const sourceClass = (source) => `source-tag source-${source}`;

const formatPurchaseTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const toDateValue = (value) => {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const pad = (number) => String(number).padStart(2, "0");
  return `${safeDate.getFullYear()}-${pad(safeDate.getMonth() + 1)}-${pad(safeDate.getDate())}`;
};

const renderPagination = (totalPages) => {
  const container = document.querySelector("#paginationButtons");
  const page = state.pagination.page;
  const buttons = [];
  const pushButton = (label, targetPage, options = {}) => {
    const disabled = options.disabled ? "disabled" : "";
    const active = options.active ? "active" : "";
    buttons.push(`<button class="${active}" type="button" data-page="${targetPage}" ${disabled}>${label}</button>`);
  };

  pushButton(icon("first"), 1, { disabled: page === 1 });
  pushButton(icon("prev"), page - 1, { disabled: page === 1 });

  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  if (page <= 3) {
    pages.add(2);
    pages.add(3);
  }
  if (page >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }

  const orderedPages = [...pages].filter((item) => item >= 1 && item <= totalPages).sort((a, b) => a - b);
  let previous = 0;
  for (const item of orderedPages) {
    if (item - previous > 1) {
      buttons.push(`<button type="button" disabled>...</button>`);
    }
    pushButton(item, item, { active: item === page });
    previous = item;
  }

  pushButton(icon("next"), page + 1, { disabled: page === totalPages });
  pushButton(icon("last"), totalPages, { disabled: page === totalPages });
  container.innerHTML = buttons.join("");
};

const renderTable = () => {
  const records = filteredRecords();
  const pagination = getPagination(records);
  document.querySelector("#resultCount").textContent = `共 ${pagination.total.toLocaleString("zh-CN")} 条记录`;
  emptyState.hidden = pagination.total > 0;
  recordsBody.innerHTML = pagination.pageRecords
    .map((record, index) => {
      const displayId = String(pagination.start + index + 1).padStart(3, "0");
      return `
        <tr>
          <td>${displayId}</td>
          <td>${escapeHtml(record.userName)}</td>
          <td>${escapeHtml(record.wechat)}</td>
          <td><span class="${sourceClass(record.source)}"><b class="source-mark">${sourceLogo(record.source)}</b>${escapeHtml(record.source)}</span></td>
          <td><button class="copy-cell" type="button" data-copy="${escapeHtml(record.account)}" title="点击复制账号">${escapeHtml(record.account)}</button></td>
          <td><button class="copy-cell" type="button" data-copy="${escapeHtml(record.password)}" title="点击复制密码">${escapeHtml(record.password)}</button></td>
          <td><span class="${packageClass(record.packageName)}">${escapeHtml(record.packageName)}</span></td>
          <td><span class="${typeClass(record.recordType)}">${escapeHtml(record.recordType)}</span></td>
          <td>${money(record.costPrice ?? record.price)}</td>
          <td>${money(record.salePrice ?? record.price)}</td>
          <td>${escapeHtml(formatPurchaseTime(record.purchaseTime))}</td>
          <td>${escapeHtml(record.remark || "-")}</td>
          <td>
            <div class="row-actions">
              <button class="edit" type="button" data-edit="${record.id}" aria-label="编辑">${icon("edit")}</button>
              <button class="delete" type="button" data-delete="${record.id}" aria-label="删除">${icon("trash")}</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
  renderPagination(pagination.totalPages);
};

const render = () => {
  renderMetrics();
  renderFilterTriggers();
  renderTable();
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const openDrawer = (record = null) => {
  recordForm.reset();
  document.querySelector("#drawerTitle").textContent = record ? "编辑记录" : "新增记录";
  recordSubmitButton.textContent = record ? "更新" : "保存";
  recordForm.elements.id.value = record?.id || "";
  recordForm.elements.userName.value = record?.userName || "";
  recordForm.elements.wechat.value = record?.wechat || "";
  recordForm.elements.source.value = record?.source || "抖音";
  recordForm.elements.account.value = record?.account || "";
  recordForm.elements.password.value = record?.password || "";
  recordForm.elements.packageName.value = record?.packageName || "ChatGpt月卡";
  recordForm.elements.recordType.value = record?.recordType || "代充";
  recordForm.elements.costPrice.value = record?.costPrice ?? record?.price ?? "";
  recordForm.elements.salePrice.value = record?.salePrice ?? record?.price ?? "";
  recordForm.elements.purchaseTime.value = toDateValue(record?.purchaseTime);
  recordForm.elements.remark.value = record?.remark || "";
  drawer.setAttribute("aria-hidden", "false");
};

const closeDrawer = () => {
  drawer.setAttribute("aria-hidden", "true");
};

const showCopyToast = (message) => {
  copyToast.textContent = message;
  copyToast.hidden = false;
  window.clearTimeout(showCopyToast.timer);
  showCopyToast.timer = window.setTimeout(() => {
    copyToast.hidden = true;
  }, 1400);
};

const copyText = async (value) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
};

const loadRecords = async () => {
  const data = await api("/api/records");
  state.records = data.records;
  render();
};

const initSession = async () => {
  try {
    await api("/api/me");
    showApp();
    await loadRecords();
  } catch {
    showLogin();
  }
};

document.querySelector("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  document.querySelector("#loginError").textContent = "";

  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password")
      })
    });
    showApp();
    await loadRecords();
  } catch (error) {
    document.querySelector("#loginError").textContent = error.message;
  }
});

document.querySelector("#logoutButton").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" }).catch(() => {});
  showLogin();
});

menuButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleSidebar();
});

sidebar.addEventListener("click", (event) => {
  if (event.target.closest(".nav-item")) closeSidebar();
});

document.querySelector("#searchInput").addEventListener("input", (event) => {
  state.filters.query = event.target.value;
  resetToFirstPage();
  render();
});

document.addEventListener("click", (event) => {
  const filterTrigger = event.target.closest("[data-filter-trigger]");
  const filterOption = event.target.closest("[data-filter-key]");

  if (appView.classList.contains("sidebar-open") && !event.target.closest(".sidebar") && !event.target.closest(".menu-button")) {
    closeSidebar();
  }

  if (filterTrigger) {
    openFilterPopup(filterTrigger.dataset.filterTrigger, filterTrigger);
    return;
  }

  if (filterOption) {
    applyHeaderFilter(filterOption.dataset.filterKey, filterOption.dataset.filterValue);
    return;
  }

  if (!event.target.closest("#filterPopup")) {
    closeFilterPopup();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeFilterPopup();
    closeSidebar();
  }
});

document.querySelector("#pageSizeSelect").addEventListener("change", (event) => {
  state.pagination.pageSize = Number.parseInt(event.target.value, 10);
  resetToFirstPage();
  render();
});

document.querySelector("#paginationButtons").addEventListener("click", (event) => {
  const button = event.target.closest("[data-page]");
  if (!button || button.disabled) return;
  state.pagination.page = Number.parseInt(button.dataset.page, 10);
  render();
});

document.querySelector("#addButton").addEventListener("click", () => openDrawer());
document.querySelector("#closeDrawer").addEventListener("click", closeDrawer);
document.querySelector("#cancelEdit").addEventListener("click", closeDrawer);

recordsBody.addEventListener("click", async (event) => {
  const copyButton = event.target.closest("[data-copy]");
  const editId = event.target.closest("[data-edit]")?.dataset.edit;
  const deleteId = event.target.closest("[data-delete]")?.dataset.delete;

  if (copyButton) {
    await copyText(copyButton.dataset.copy);
    showCopyToast("已复制");
    return;
  }

  if (editId) {
    openDrawer(state.records.find((record) => record.id === editId));
  }

  if (deleteId && confirm("确定删除这条记录吗？")) {
    await api(`/api/records/${deleteId}`, { method: "DELETE" });
    await loadRecords();
  }
});

recordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(recordForm);
  const payload = Object.fromEntries(form.entries());
  const id = payload.id;
  delete payload.id;

  await api(id ? `/api/records/${id}` : "/api/records", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(payload)
  });

  await loadRecords();
  closeDrawer();
});

setupFilters();
initSession();
