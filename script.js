const creditopiaLogic = window.CreditopiaLogic;
const logicNormalizeBank = creditopiaLogic.normalizeBank;
const logicComputeDebt = creditopiaLogic.computeDebt;
const logicNormalizeLast4 = creditopiaLogic.normalizeLast4;
const logicIsDuplicateCard = creditopiaLogic.isDuplicateCard;
const logicNormalizeCardDraft = creditopiaLogic.normalizeCardDraft;
const logicSummarizeImportPayload = creditopiaLogic.summarizeImportPayload;
const bankCatalog = creditopiaLogic.BANK_CONFIG;

const STORAGE_KEY = 'creditopia-credit-cards';
const LEDGER_STORAGE_KEY = 'creditopia-ledger-total-debt';

const form = document.querySelector('#card-form');
const formModeHint = document.querySelector('#form-mode-hint');
const submitButton = form.querySelector('button[type="submit"]');
const bankInput = document.querySelector('#card-bank');
const nameInput = document.querySelector('#card-name');
const last4Input = document.querySelector('#card-last4');
const limitInput = document.querySelector('#card-limit');
const availableInput = document.querySelector('#card-available');
const ledgerInput = document.querySelector('#ledger-total-debt');
const cardsTotalDebtElement = document.querySelector('#cards-total-debt');
const differenceElement = document.querySelector('#debt-difference');
const differenceHintElement = document.querySelector('#difference-hint');
const storageModeElement = document.querySelector('#storage-mode');
const emptyState = document.querySelector('#empty-state');
const cardList = document.querySelector('#card-list');
const scrollProgressBar = document.querySelector('#scroll-progress-bar');
const heroScoreValueElement = document.querySelector('#hero-score-value');
const heroSignalValueElement = document.querySelector('#hero-signal-value');
const heroDeltaValueElement = document.querySelector('#hero-delta-value');
const heroPipelineValueElement = document.querySelector('#hero-pipeline-value');
const insightCardCountElement = document.querySelector('#insight-card-count');
const insightUtilizationElement = document.querySelector('#insight-utilization');
const insightSyncStateElement = document.querySelector('#insight-sync-state');
const insightLastUpdateElement = document.querySelector('#insight-last-update');
const cardItemTemplate = document.querySelector('#card-item-template');
const exportDataButton = document.querySelector('#export-data-btn');
const importDataButton = document.querySelector('#import-data-btn');
const importFileInput = document.querySelector('#import-file-input');
const processSteps = Array.from(document.querySelectorAll('.process-step'));

let cards = loadCards();
let editingCardId = null;
let summaryAnimationFrame = null;
let previousSummaryState = {
  cardsTotalDebt: 0,
  difference: 0,
};

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `card-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadCards() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).map((card) => logicNormalizeCardDraft(card)) : [];
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
  if (window.location.protocol === 'file:') {
    return '文件模式存储（建议迁移到 localhost）';
  }

  return `本地站点存储：${window.location.origin}`;
}

function formatCurrency(value, { minimumFractionDigits = 2, maximumFractionDigits = 2 } = {}) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
}

function getAmountDensity(formattedValue) {
  const amountText = String(formattedValue || '').replace(/\s/g, '');
  const length = amountText.length;

  if (length >= 16) {
    return 'tiny';
  }

  if (length >= 13) {
    return 'compact';
  }

  return 'default';
}

function setCurrencyValue(element, value, options = {}) {
  if (!element) {
    return;
  }

  const formattedValue = formatCurrency(value, options);
  const currencyMatch = formattedValue.match(/^(-?)¥(.*)$/);
  const prefix = currencyMatch ? `${currencyMatch[1]}¥` : '';
  const amount = currencyMatch ? currencyMatch[2] : formattedValue;
  const amountSegments = amount.split(',');

  element.textContent = '';
  element.dataset.density = getAmountDensity(formattedValue);
  element.setAttribute('aria-label', formattedValue);

  if (prefix) {
    const symbolElement = document.createElement('span');
    symbolElement.className = 'amount-value__symbol';
    symbolElement.textContent = prefix;
    element.appendChild(symbolElement);
  }

  const textElement = document.createElement('span');
  textElement.className = 'amount-value__text';

  amountSegments.forEach((segment, index) => {
    const chunkElement = document.createElement('span');
    const isLastChunk = index === amountSegments.length - 1;
    chunkElement.className = 'amount-value__chunk';
    chunkElement.textContent = isLastChunk ? segment : `${segment},`;
    textElement.appendChild(chunkElement);
  });

  element.appendChild(textElement);
}

function animateCurrencyValue(element, fromValue, toValue, duration = 720) {
  if (!element) {
    return;
  }

  const startValue = Number.isFinite(fromValue) ? fromValue : 0;
  const endValue = Number.isFinite(toValue) ? toValue : 0;
  const startTime = performance.now();

  function step(currentTime) {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const nextValue = startValue + (endValue - startValue) * easedProgress;
    setCurrencyValue(element, nextValue);

    if (progress < 1) {
      summaryAnimationFrame = window.requestAnimationFrame(step);
    }
  }

  window.cancelAnimationFrame(summaryAnimationFrame);
  summaryAnimationFrame = window.requestAnimationFrame(step);
}

function formatAmount(value) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function parseAmount(value) {
  const normalized = String(value || '')
    .replace(/[^\d.]/g, '')
    .replace(/(\..*)\./g, '$1');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function bindFormattedAmountInput(input, { onCommit } = {}) {
  if (!input) {
    return;
  }

  input.addEventListener('focus', () => {
    const parsed = parseAmount(input.value);
    input.value = parsed ? String(parsed) : '';
    input.select();
  });

  input.addEventListener('blur', () => {
    const parsed = parseAmount(input.value);
    input.value = parsed ? formatAmount(parsed) : '';
    if (typeof onCommit === 'function') {
      onCommit(parsed);
    }
  });
}

function formatUpdatedAt(value) {
  if (!value) {
    return '尚未记录更新时间';
  }

  return `更新于 ${new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))}`;
}

function showFormMessage(message, isEditing = false) {
  formModeHint.textContent = message;
  formModeHint.classList.toggle('form-mode-hint--editing', isEditing);
}

function updateHeroTelemetry(cardsTotalDebt, difference) {
  const cardCount = cards.length;
  const diffMagnitude = Math.abs(difference);
  const coverageBonus = Math.min(cardCount * 4, 16);
  const syncPenalty = Math.min(Math.round(diffMagnitude / 1500), 28);
  const score = Math.max(52, Math.min(99, 84 + coverageBonus - syncPenalty));

  if (heroScoreValueElement) {
    heroScoreValueElement.textContent = String(score);
  }

  if (heroPipelineValueElement) {
    heroPipelineValueElement.textContent = `${cardCount} ${cardCount === 1 ? 'node' : 'nodes'}`;
  }

  if (!heroSignalValueElement || !heroDeltaValueElement) {
    return;
  }

  if (cardCount === 0) {
    heroSignalValueElement.textContent = 'standby';
    heroDeltaValueElement.textContent = 'waiting';
    return;
  }

  if (diffMagnitude < 0.005) {
    heroSignalValueElement.textContent = 'stable';
    heroDeltaValueElement.textContent = 'synced';
    return;
  }

  if (diffMagnitude < 5000) {
    heroSignalValueElement.textContent = 'monitor';
    heroDeltaValueElement.textContent = 'offset';
    return;
  }

  heroSignalValueElement.textContent = 'warning';
  heroDeltaValueElement.textContent = 'drifting';
}

function formatRelativeUpdate(value) {
  if (!value) {
    return 'no signal';
  }

  const updateDate = new Date(value);
  if (Number.isNaN(updateDate.getTime())) {
    return 'invalid';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(updateDate);
}

function updateInsightStrip(difference) {
  const cardCount = cards.length;
  const totalLimit = cards.reduce((sum, card) => sum + card.limit, 0);
  const totalDebt = cards.reduce((sum, card) => sum + logicComputeDebt(card.limit, card.available), 0);
  const averageUtilization = totalLimit > 0 ? Math.round((totalDebt / totalLimit) * 100) : 0;
  const latestUpdatedAt = cards.reduce((latest, card) => {
    if (!card.updatedAt) {
      return latest;
    }

    return !latest || new Date(card.updatedAt) > new Date(latest) ? card.updatedAt : latest;
  }, '');

  if (insightCardCountElement) {
    insightCardCountElement.textContent = String(cardCount);
  }

  if (insightUtilizationElement) {
    insightUtilizationElement.textContent = `${averageUtilization}%`;
  }

  if (insightSyncStateElement) {
    if (cardCount === 0) {
      insightSyncStateElement.textContent = 'standby';
    } else if (Math.abs(difference) < 0.005) {
      insightSyncStateElement.textContent = 'synced';
    } else if (Math.abs(difference) < 5000) {
      insightSyncStateElement.textContent = 'monitor';
    } else {
      insightSyncStateElement.textContent = 'warning';
    }
  }

  if (insightLastUpdateElement) {
    insightLastUpdateElement.textContent = formatRelativeUpdate(latestUpdatedAt);
  }
}

function resetForm() {
  editingCardId = null;
  form.reset();
  submitButton.textContent = '添加信用卡';
  showFormMessage('新增后会立即进入下方追踪区，可继续修改剩余额度。', false);
  nameInput.focus();
}

function populateForm(card) {
  editingCardId = card.id;
  bankInput.value = card.bank;
  nameInput.value = card.name;
  last4Input.value = card.last4;
  limitInput.value = formatAmount(card.limit);
  availableInput.value = formatAmount(card.available);
  submitButton.textContent = '保存修改';
  showFormMessage('正在编辑已有信用卡。保存后会刷新更新时间。', true);
  nameInput.focus();
}

function updateSummary() {
  const cardsTotalDebt = cards.reduce((sum, card) => sum + logicComputeDebt(card.limit, card.available), 0);
  const ledgerTotalDebt = getLedgerTotal();
  const difference = cardsTotalDebt - ledgerTotalDebt;

  animateCurrencyValue(cardsTotalDebtElement, previousSummaryState.cardsTotalDebt, cardsTotalDebt);
  setCurrencyValue(differenceElement, difference);

  if (Math.abs(difference) < 0.005) {
    differenceElement.style.color = 'var(--success)';
    differenceHintElement.textContent = '已对平：两边一致，当前对账没有差额。';
  } else if (difference > 0) {
    differenceElement.style.color = 'var(--danger)';
    differenceHintElement.textContent = '信用卡侧更高：记账软件可能少记了这部分。';
  } else {
    differenceElement.style.color = 'var(--accent)';
    differenceHintElement.textContent = '记账侧更高：检查是否有未同步到本页面的卡片或账单。';
  }

  previousSummaryState = {
    cardsTotalDebt,
    difference,
  };

  updateHeroTelemetry(cardsTotalDebt, difference);
  updateInsightStrip(difference);
}

function updateUtilizationRing(cardElement, limit, available) {
  if (!cardElement) {
    return;
  }

  const debt = logicComputeDebt(limit, available);
  const utilization = limit > 0 ? Math.min(debt / limit, 1) : 0;
  const percentElement = cardElement.querySelector('.utilization-percent');
  const ringElement = cardElement.querySelector('.utilization-ring');

  if (percentElement) {
    percentElement.textContent = `${Math.round(utilization * 100)}%`;
  }

  if (ringElement) {
    ringElement.style.setProperty('--progress', utilization.toFixed(4));
  }
}

function updateScrollProgress() {
  if (!scrollProgressBar) {
    return;
  }

  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  scrollProgressBar.style.width = `${Math.min(Math.max(progress, 0), 1) * 100}%`;
}

function bindCardTilt(cardElement) {
  if (!cardElement || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  cardElement.addEventListener('pointermove', (event) => {
    const rect = cardElement.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
    const rotateY = offsetX * 6;
    const rotateX = offsetY * -4;
    cardElement.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
  });

  cardElement.addEventListener('pointerleave', () => {
    cardElement.style.transform = '';
  });
}

function bindMagneticButtons() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const magneticButtons = document.querySelectorAll('.primary-btn, .ghost-btn--light, .credit-card__actions .ghost-btn');

  magneticButtons.forEach((button) => {
    if (button.dataset.magneticBound === 'true') {
      return;
    }

    button.dataset.magneticBound = 'true';
    button.classList.add('magnetic-active');

    button.addEventListener('pointermove', (event) => {
      const rect = button.getBoundingClientRect();
      const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
      const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
      button.style.transform = `translate(${offsetX * 10}px, ${offsetY * 8}px)`;
    });

    button.addEventListener('pointerleave', () => {
      button.style.transform = '';
    });
  });
}

function bindProcessRail() {
  if (!processSteps.length) {
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    processSteps.forEach((step) => step.classList.add('is-active'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          window.setTimeout(() => {
            entry.target.classList.add('is-active');
          }, index * 120);
        }
      });
    },
    {
      threshold: 0.35,
    }
  );

  processSteps.forEach((step) => observer.observe(step));
}

function renderCards() {
  cardList.innerHTML = '';
  emptyState.hidden = cards.length > 0;

  cards.forEach((card) => {
    const bankConfig = bankCatalog[card.bank] || bankCatalog.generic;
    const fragment = cardItemTemplate.content.cloneNode(true);
    const cardElement = fragment.querySelector('.credit-card');
    const bankLogoImageElement = fragment.querySelector('.bank-logo-image');
    const bankLogoFallbackElement = fragment.querySelector('.bank-logo-fallback');
    const bankNameElement = fragment.querySelector('.credit-card__bank-name');
    const nameElement = fragment.querySelector('.credit-card__name');
    const updatedAtElement = fragment.querySelector('.credit-card__updated-at');
    const tailElement = fragment.querySelector('.credit-card__tail');
    const limitValueElement = fragment.querySelector('.limit-value');
    const debtValueElement = fragment.querySelector('.debt-value');
    const availableInputElement = fragment.querySelector('.available-input');
    const editButton = fragment.querySelector('.edit-btn');
    const deleteButton = fragment.querySelector('.delete-btn');

    if (bankConfig.logoPath) {
      bankLogoImageElement.onerror = () => {
        bankLogoImageElement.hidden = true;
        bankLogoFallbackElement.hidden = false;
        bankLogoFallbackElement.textContent = bankConfig.short;
        bankLogoFallbackElement.className = `bank-logo-fallback bank-logo--${card.bank}`;
      };
      bankLogoImageElement.src = bankConfig.logoPath;
      bankLogoImageElement.hidden = false;
      bankLogoFallbackElement.hidden = true;
    } else {
      bankLogoImageElement.hidden = true;
      bankLogoFallbackElement.hidden = false;
      bankLogoFallbackElement.textContent = bankConfig.short;
      bankLogoFallbackElement.className = `bank-logo-fallback bank-logo--${card.bank}`;
    }

    bankNameElement.textContent = bankConfig.name;
    nameElement.textContent = card.name || bankConfig.name;
    updatedAtElement.textContent = formatUpdatedAt(card.updatedAt);
    tailElement.textContent = `尾号 ${card.last4}`;
    setCurrencyValue(limitValueElement, card.limit, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    setCurrencyValue(debtValueElement, logicComputeDebt(card.limit, card.available), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    availableInputElement.value = card.available ? formatAmount(card.available) : '';
    updateUtilizationRing(cardElement, card.limit, card.available);

    bindFormattedAmountInput(availableInputElement, {
      onCommit(nextAvailable) {
        cards = cards.map((item) =>
          item.id === card.id
            ? logicNormalizeCardDraft({ ...item, available: nextAvailable }, new Date().toISOString())
            : item
        );
        saveCards();
        renderCards();
        updateSummary();
      },
    });

    editButton.addEventListener('click', () => {
      populateForm(card);
    });

    deleteButton.addEventListener('click', () => {
      const shouldDelete = window.confirm(
        `确认删除 ${bankConfig.name}${card.last4 ? ` 尾号 ${card.last4}` : ''} 吗？`
      );

      if (!shouldDelete) {
        return;
      }

      cards = cards.filter((item) => item.id !== card.id);
      saveCards();
      if (editingCardId === card.id) {
        resetForm();
      }
      renderCards();
      updateSummary();
    });

    cardElement.dataset.id = card.id;
    bindCardTilt(cardElement);
    cardList.appendChild(fragment);
  });

  bindMagneticButtons();
}

function buildExportPayload() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    source: window.location.href,
    cards,
    ledgerTotalDebt: getLedgerTotal(),
  };
}

function exportData() {
  const payload = buildExportPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateTag = new Date().toISOString().slice(0, 10);

  link.href = objectUrl;
  link.download = `creditopia-backup-${dateTag}.json`;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

function importDataFromPayload(payload) {
  const importedCards = Array.isArray(payload.cards) ? payload.cards : [];
  const importedLedger = Math.max(Number(payload.ledgerTotalDebt) || 0, 0);

  cards = importedCards.map((card) =>
    logicNormalizeCardDraft({
      ...card,
      id: card.id || createId(),
    })
  );

  ledgerInput.value = importedLedger ? formatAmount(importedLedger) : '';
  saveCards();
  saveLedgerTotal(importedLedger);
  resetForm();
  renderCards();
  updateSummary();
}

function confirmImport(payload) {
  const summary = logicSummarizeImportPayload(payload);
  const exportedAt = summary.exportedAt
    ? `\n导出时间：${new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(summary.exportedAt))}`
    : '';

  return window.confirm(
    `将导入 ${summary.cardCount} 张信用卡，记账总欠款 ${formatCurrency(summary.ledgerTotalDebt)}。${exportedAt}\n\n这会覆盖当前页面中的数据，是否继续？`
  );
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const rawName = nameInput.value.trim();
  const bank = logicNormalizeBank(bankInput.value, rawName);
  const bankConfig = bankCatalog[bank] || bankCatalog.generic;
  const draft = logicNormalizeCardDraft(
    {
      id: editingCardId || createId(),
      bank,
      name: rawName || bankConfig.name,
      last4: logicNormalizeLast4(last4Input.value),
      limit: parseAmount(limitInput.value),
      available: parseAmount(availableInput.value),
    },
    new Date().toISOString()
  );

  if (draft.last4.length !== 4) {
    window.alert('请输入 4 位数字尾号。');
    return;
  }

  if (logicIsDuplicateCard(cards, draft, editingCardId)) {
    window.alert('同一家银行下相同尾号的信用卡已存在。');
    return;
  }

  if (editingCardId) {
    cards = cards.map((card) => (card.id === editingCardId ? draft : card));
  } else {
    cards.unshift(draft);
  }

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

ledgerInput.value = loadLedgerTotal() ? formatAmount(loadLedgerTotal()) : '';
storageModeElement.textContent = getStorageModeLabel();
showFormMessage('新增后会立即进入下方追踪区，可继续修改剩余额度。', false);

exportDataButton.addEventListener('click', exportData);

importDataButton.addEventListener('click', () => {
  importFileInput.click();
});

importFileInput.addEventListener('change', async (event) => {
  const [file] = event.target.files || [];

  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    const confirmed = confirmImport(payload);

    if (!confirmed) {
      return;
    }

    importDataFromPayload(payload);
  } catch {
    window.alert('导入失败：请选择 Creditopia 导出的 JSON 文件。');
  } finally {
    event.target.value = '';
  }
});

window.addEventListener('scroll', updateScrollProgress, { passive: true });
window.addEventListener('resize', updateScrollProgress);

renderCards();
updateSummary();
updateScrollProgress();
bindProcessRail();
