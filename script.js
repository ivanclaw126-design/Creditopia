const STORAGE_KEY = "creditopia-credit-cards";
const LEDGER_STORAGE_KEY = "creditopia-ledger-total-debt";

const form = document.querySelector("#card-form");
const bankInput = document.querySelector("#card-bank");
const nameInput = document.querySelector("#card-name");
const last4Input = document.querySelector("#card-last4");
const limitInput = document.querySelector("#card-limit");
const availableInput = document.querySelector("#card-available");
const ledgerInput = document.querySelector("#ledger-total-debt");
const cardsTotalDebtElement = document.querySelector("#cards-total-debt");
const differenceElement = document.querySelector("#debt-difference");
const differenceHintElement = document.querySelector("#difference-hint");
const storageModeElement = document.querySelector("#storage-mode");
const emptyState = document.querySelector("#empty-state");
const cardList = document.querySelector("#card-list");
const cardItemTemplate = document.querySelector("#card-item-template");
const exportDataButton = document.querySelector("#export-data-btn");
const importDataButton = document.querySelector("#import-data-btn");
const importFileInput = document.querySelector("#import-file-input");

let cards = loadCards();

const BANK_CONFIG = {
  icbc: { name: "工商银行", short: "ICBC", logoPath: "./assets/logos/icbc.svg" },
  ccb: { name: "建设银行", short: "CCB", logoPath: "./assets/logos/ccb.ico" },
  abc: { name: "农业银行", short: "ABC", logoPath: "./assets/logos/abc.ico" },
  boc: { name: "中国银行", short: "BOC", logoPath: "./assets/logos/boc.svg" },
  psbc: { name: "邮储银行", short: "PSBC", logoPath: "./assets/logos/psbc.ico" },
  bocom: { name: "交通银行", short: "BOCOM", logoPath: "./assets/logos/bocom.ico" },
  cmb: { name: "招商银行", short: "CMB", logoPath: "./assets/logos/cmb.png" },
  cib: { name: "兴业银行", short: "CIB", logoPath: "./assets/logos/cib.ico" },
  spdb: { name: "浦发银行", short: "SPDB", logoPath: "./assets/logos/spdb.png" },
  gdb: { name: "广发银行", short: "GDB", logoPath: "./assets/logos/gdb.png" },
  citic: { name: "中信银行", short: "CITIC", logoPath: "./assets/logos/citic.png" },
  ceb: { name: "光大银行", short: "CEB", logoPath: "./assets/logos/ceb.ico" },
  cmbc: { name: "民生银行", short: "CMBC", logoPath: "./assets/logos/cmbc.png" },
  pingan: { name: "平安银行", short: "PA", logoPath: "./assets/logos/pingan.svg" },
  hxb: { name: "华夏银行", short: "HXB" },
  bob: { name: "北京银行", short: "BOB", logoPath: "./assets/logos/bob.ico" },
  bos: { name: "上海银行", short: "BOS", logoPath: "./assets/logos/bos.ico" },
  njcb: { name: "南京银行", short: "NJB", logoPath: "./assets/logos/njcb.jpg" },
  nbcb: { name: "宁波银行", short: "NBCB" },
  czb: { name: "浙商银行", short: "CZB" },
  bhb: { name: "渤海银行", short: "BHB" },
  hfb: { name: "恒丰银行", short: "HFB" },
  generic: { name: "其他银行", short: "BANK" },
};

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `card-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadCards() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved
      ? JSON.parse(saved).map((card) => {
          const bank = normalizeBank(card.bank, card.name);
          const bankConfig = BANK_CONFIG[bank] || BANK_CONFIG.generic;
          const rawName = String(card.name || "").trim();

          return {
            ...card,
            bank,
            name: !rawName || rawName === "未命名信用卡" ? bankConfig.name : rawName,
          };
        })
      : [];
  } catch {
    return [];
  }
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function loadLedgerTotal() {
  const savedValue = localStorage.getItem(LEDGER_STORAGE_KEY);
  return savedValue ? Number(savedValue) : 0;
}

function saveLedgerTotal(value) {
  localStorage.setItem(LEDGER_STORAGE_KEY, String(value));
}

function getLedgerTotal() {
  return Math.max(parseAmount(ledgerInput.value), 0);
}

function getStorageModeLabel() {
  if (window.location.protocol === "file:") {
    return "文件模式存储（建议迁移到 localhost）";
  }

  return `本地站点存储：${window.location.origin}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(Number.isFinite(value) ? value : 0);
}

function formatAmount(value) {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function parseAmount(value) {
  const normalized = String(value || "")
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function bindFormattedAmountInput(input, { onCommit } = {}) {
  if (!input) {
    return;
  }

  input.addEventListener("focus", () => {
    const parsed = parseAmount(input.value);
    input.value = parsed ? String(parsed) : "";
    input.select();
  });

  input.addEventListener("blur", () => {
    const parsed = parseAmount(input.value);
    input.value = parsed ? formatAmount(parsed) : "";
    if (typeof onCommit === "function") {
      onCommit(parsed);
    }
  });
}

function normalizeBank(bank, cardName = "") {
  if (bank && BANK_CONFIG[bank]) {
    return bank;
  }

  const source = String(cardName).toLowerCase();

  if (source.includes("招商") || source.includes("cmb")) return "cmb";
  if (source.includes("邮储") || source.includes("邮政储蓄") || source.includes("psbc")) {
    return "psbc";
  }
  if (source.includes("兴业") || source.includes("cib")) return "cib";
  if (source.includes("浦发") || source.includes("spdb")) return "spdb";
  if (source.includes("广发") || source.includes("gdb")) return "gdb";
  if (source.includes("中信") || source.includes("citic")) return "citic";
  if (source.includes("光大") || source.includes("ceb")) return "ceb";
  if (source.includes("民生") || source.includes("cmbc")) return "cmbc";
  if (source.includes("平安")) return "pingan";
  if (source.includes("交通")) return "bocom";
  if (source.includes("华夏") || source.includes("hxb")) return "hxb";
  if (source.includes("北京银行") || source.includes("bob")) return "bob";
  if (source.includes("上海银行") || source.includes("bosc") || source.includes("bos")) {
    return "bos";
  }
  if (source.includes("南京银行") || source.includes("njcb")) return "njcb";
  if (source.includes("宁波银行") || source.includes("nbcb")) return "nbcb";
  if (source.includes("浙商")) return "czb";
  if (source.includes("渤海")) return "bhb";
  if (source.includes("恒丰")) return "hfb";
  if (source.includes("工商") || source.includes("icbc")) return "icbc";
  if (source.includes("建设") || source.includes("ccb")) return "ccb";
  if (source.includes("农业") || source.includes("abc")) return "abc";
  if (source.includes("中国银行") || source.includes("中行") || source.includes("boc")) {
    return "boc";
  }

  return "generic";
}

function sanitizeAvailable(limit, available) {
  if (!Number.isFinite(available) || available < 0) return 0;
  return Math.min(available, limit);
}

function computeDebt(limit, available) {
  return Math.max(limit - sanitizeAvailable(limit, available), 0);
}

function updateSummary() {
  const cardsTotalDebt = cards.reduce(
    (sum, card) => sum + computeDebt(card.limit, card.available),
    0
  );
  const ledgerTotalDebt = getLedgerTotal();
  const difference = cardsTotalDebt - ledgerTotalDebt;

  cardsTotalDebtElement.textContent = formatCurrency(cardsTotalDebt);
  differenceElement.textContent = formatCurrency(difference);

  if (difference === 0) {
    differenceElement.style.color = "var(--success)";
    differenceHintElement.textContent = "两边一致，当前对账没有差额。";
  } else if (difference > 0) {
    differenceElement.style.color = "var(--danger)";
    differenceHintElement.textContent =
      "信用卡汇总欠款更高，记账软件可能少记了这部分。";
  } else {
    differenceElement.style.color = "var(--brand)";
    differenceHintElement.textContent =
      "记账软件记录更高，检查是否有未同步到本页面的卡片或账单。";
  }
}

function renderCards() {
  cardList.innerHTML = "";

  emptyState.hidden = cards.length > 0;

  cards.forEach((card) => {
    const bankKey = normalizeBank(card.bank, card.name);
    const bankConfig = BANK_CONFIG[bankKey];
    const fragment = cardItemTemplate.content.cloneNode(true);
    const cardElement = fragment.querySelector(".credit-card");
    const bankLogoImageElement = fragment.querySelector(".bank-logo-image");
    const bankLogoFallbackElement = fragment.querySelector(".bank-logo-fallback");
    const bankNameElement = fragment.querySelector(".credit-card__bank-name");
    const nameElement = fragment.querySelector(".credit-card__name");
    const tailElement = fragment.querySelector(".credit-card__tail");
    const limitValueElement = fragment.querySelector(".limit-value");
    const debtValueElement = fragment.querySelector(".debt-value");
    const availableInputElement = fragment.querySelector(".available-input");
    const deleteButton = fragment.querySelector(".delete-btn");

    if (bankConfig.logoPath) {
      bankLogoImageElement.src = bankConfig.logoPath;
      bankLogoImageElement.hidden = false;
      bankLogoFallbackElement.hidden = true;
    } else {
      bankLogoImageElement.hidden = true;
      bankLogoFallbackElement.hidden = false;
      bankLogoFallbackElement.textContent = bankConfig.short;
      bankLogoFallbackElement.className = `bank-logo-fallback bank-logo--${bankKey}`;
    }

    bankNameElement.textContent = bankConfig.name;
    nameElement.textContent = card.name || bankConfig.name;
    tailElement.textContent = `尾号 ${card.last4}`;
    limitValueElement.textContent = formatCurrency(card.limit);
    debtValueElement.textContent = formatCurrency(
      computeDebt(card.limit, card.available)
    );
    availableInputElement.value = card.available
      ? formatAmount(card.available)
      : "";

    bindFormattedAmountInput(availableInputElement, {
      onCommit(nextAvailable) {
        card.available = sanitizeAvailable(card.limit, nextAvailable);
        saveCards();
        renderCards();
        updateSummary();
      },
    });

    deleteButton.addEventListener("click", () => {
      const shouldDelete = window.confirm(
        `确认删除 ${bankConfig.name}${card.last4 ? ` 尾号 ${card.last4}` : ""} 吗？`
      );

      if (!shouldDelete) {
        return;
      }

      cards = cards.filter((item) => item.id !== card.id);
      saveCards();
      renderCards();
      updateSummary();
    });

    cardElement.dataset.id = card.id;
    cardList.appendChild(fragment);
  });
}

function resetForm() {
  form.reset();
  nameInput.focus();
}

function buildExportPayload() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: window.location.href,
    cards,
    ledgerTotalDebt: getLedgerTotal(),
  };
}

function exportData() {
  const payload = buildExportPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateTag = new Date().toISOString().slice(0, 10);

  link.href = objectUrl;
  link.download = `creditopia-backup-${dateTag}.json`;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

function importDataFromPayload(payload) {
  const importedCards = Array.isArray(payload.cards) ? payload.cards : [];
  const importedLedger = Math.max(Number(payload.ledgerTotalDebt) || 0, 0);

  cards = importedCards.map((card) => {
    const normalizedLimit = Math.max(Number(card.limit) || 0, 0);

    return {
      ...card,
      id: card.id || createId(),
      bank: normalizeBank(card.bank, card.name),
      name:
        !String(card.name || "").trim() || String(card.name || "").trim() === "未命名信用卡"
          ? (BANK_CONFIG[normalizeBank(card.bank, card.name)] || BANK_CONFIG.generic).name
          : String(card.name || "").trim(),
      last4: String(card.last4 || ""),
      limit: normalizedLimit,
      available: sanitizeAvailable(normalizedLimit, Number(card.available)),
    };
  });

  ledgerInput.value = importedLedger ? formatAmount(importedLedger) : "";
  saveCards();
  saveLedgerTotal(importedLedger);
  renderCards();
  updateSummary();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const rawName = nameInput.value.trim();
  const bank = normalizeBank(bankInput.value, nameInput.value.trim());
  const bankConfig = BANK_CONFIG[bank] || BANK_CONFIG.generic;
  const name = rawName || bankConfig.name;
  const last4 = last4Input.value.trim();
  const limit = parseAmount(limitInput.value);
  const available = parseAmount(availableInput.value);

  if (!last4 || !Number.isFinite(limit) || !Number.isFinite(available)) {
    return;
  }

  const normalizedLimit = Math.max(limit, 0);
  const normalizedAvailable = sanitizeAvailable(normalizedLimit, available);

  cards.unshift({
    id: createId(),
    bank,
    name,
    last4,
    limit: normalizedLimit,
    available: normalizedAvailable,
  });

  saveCards();
  renderCards();
  updateSummary();
  resetForm();
});

bindFormattedAmountInput(limitInput);
bindFormattedAmountInput(availableInput);
bindFormattedAmountInput(ledgerInput, {
  onCommit(nextValue) {
    saveLedgerTotal(nextValue);
    updateSummary();
  },
});

ledgerInput.value = loadLedgerTotal() ? formatAmount(loadLedgerTotal()) : "";
storageModeElement.textContent = getStorageModeLabel();

exportDataButton.addEventListener("click", exportData);

importDataButton.addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files || [];

  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    importDataFromPayload(payload);
  } catch {
    window.alert("导入失败：请选择 Creditopia 导出的 JSON 文件。");
  } finally {
    event.target.value = "";
  }
});

renderCards();
updateSummary();
