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
  }
};

const loginView = document.querySelector("#loginView");
const appView = document.querySelector("#appView");
const recordsBody = document.querySelector("#recordsBody");
const emptyState = document.querySelector("#emptyState");
const drawer = document.querySelector("#drawer");
const recordForm = document.querySelector("#recordForm");
const copyToast = document.querySelector("#copyToast");
let submitMode = "save";

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

const showLogin = () => {
  loginView.hidden = false;
  appView.hidden = true;
};

const showApp = () => {
  loginView.hidden = true;
  appView.hidden = false;
};

const fillSelect = (select, values) => {
  const allLabels = {
    sourceFilter: "全部来源",
    packageFilter: "全部套餐",
    typeFilter: "全部类型"
  };
  select.innerHTML = values.map((item) => `<option value="${item}">${item === "全部" ? allLabels[select.id] || "全部" : item}</option>`).join("");
};

const fillFormSelect = (select, values) => {
  select.innerHTML = values.slice(1).map((item) => `<option value="${item}">${item}</option>`).join("");
};

const icon = (name, className = "ui-icon") => `<svg class="${className}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;

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
  fillSelect(document.querySelector("#sourceFilter"), sources);
  fillSelect(document.querySelector("#packageFilter"), packages);
  fillSelect(document.querySelector("#typeFilter"), types);
  fillFormSelect(recordForm.elements.source, sources);
  fillFormSelect(recordForm.elements.packageName, packages);
  fillFormSelect(recordForm.elements.recordType, types);
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
  document.querySelector("#totalMetric").textContent = total.toLocaleString("zh-CN");
  document.querySelector("#proxyMetric").textContent = proxyCount.toLocaleString("zh-CN");
  document.querySelector("#finishedMetric").textContent = finished.toLocaleString("zh-CN");
  document.querySelector("#priceMetric").textContent = money(price);
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
  renderTable();
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatDate = (value) => {
  if (!value) return "2024-05-18 14:32:21";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "2024-05-18 14:32:21";
  return date.toLocaleString("zh-CN", { hour12: false }).replaceAll("/", "-");
};

const openDrawer = (record = null) => {
  recordForm.reset();
  document.querySelector("#drawerTitle").textContent = record ? "编辑记录" : "新增记录";
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
  document.querySelector("#createdAtText").textContent = formatDate(record?.createdAt);
  document.querySelector("#updatedAtText").textContent = formatDate(record?.updatedAt);
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
    const data = await api("/api/me");
    document.querySelector("#currentUser").textContent = data.user.username;
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
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password")
      })
    });
    document.querySelector("#currentUser").textContent = data.user.username;
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

document.querySelector("#searchInput").addEventListener("input", (event) => {
  state.filters.query = event.target.value;
  resetToFirstPage();
  render();
});

document.querySelector("#sourceFilter").addEventListener("change", (event) => {
  state.filters.source = event.target.value;
  resetToFirstPage();
  render();
});

document.querySelector("#packageFilter").addEventListener("change", (event) => {
  state.filters.packageName = event.target.value;
  resetToFirstPage();
  render();
});

document.querySelector("#typeFilter").addEventListener("change", (event) => {
  state.filters.recordType = event.target.value;
  resetToFirstPage();
  render();
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

document.querySelector("[data-save-more]").addEventListener("click", () => {
  submitMode = "save-more";
});

recordForm.addEventListener("click", (event) => {
  if (!event.target.matches("[data-save-more]")) submitMode = "save";
});

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
  if (submitMode === "save-more") {
    openDrawer();
  } else {
    closeDrawer();
  }
  submitMode = "save";
});

setupFilters();
initSession();
