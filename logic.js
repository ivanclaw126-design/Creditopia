const BANK_CONFIG = {
  icbc: { name: "工商银行", short: "ICBC", logoPath: "./assets/logos/icbc.png" },
  ccb: { name: "建设银行", short: "CCB", logoPath: "./assets/logos/ccb.png" },
  abc: { name: "农业银行", short: "ABC", logoPath: "./assets/logos/abc.png" },
  boc: { name: "中国银行", short: "BOC", logoPath: "./assets/logos/boc.png" },
  psbc: { name: "邮储银行", short: "PSBC", logoPath: "./assets/logos/psbc.png" },
  bocom: { name: "交通银行", short: "BOCOM", logoPath: "./assets/logos/bocom.png" },
  cmb: { name: "招商银行", short: "CMB", logoPath: "./assets/logos/cmb.png" },
  cib: { name: "兴业银行", short: "CIB", logoPath: "./assets/logos/cib.png" },
  spdb: { name: "浦发银行", short: "SPDB", logoPath: "./assets/logos/spdb.png" },
  gdb: { name: "广发银行", short: "GDB", logoPath: "./assets/logos/gdb.png" },
  citic: { name: "中信银行", short: "CITIC", logoPath: "./assets/logos/citic.png" },
  ceb: { name: "光大银行", short: "CEB", logoPath: "./assets/logos/ceb.png" },
  cmbc: { name: "民生银行", short: "CMBC", logoPath: "./assets/logos/cmbc.png" },
  pingan: { name: "平安银行", short: "PA", logoPath: "./assets/logos/pingan.png" },
  hxb: { name: "华夏银行", short: "HXB", logoPath: "./assets/logos/hxb.png" },
  bob: { name: "北京银行", short: "BOB", logoPath: "./assets/logos/bob.png" },
  bos: { name: "上海银行", short: "BOS", logoPath: "./assets/logos/bos.png" },
  njcb: { name: "南京银行", short: "NJB", logoPath: "./assets/logos/njcb.png" },
  nbcb: { name: "宁波银行", short: "NBCB", logoPath: "./assets/logos/nbcb.png" },
  czb: { name: "浙商银行", short: "CZB", logoPath: "./assets/logos/czb.png" },
  bhb: { name: "渤海银行", short: "BHB", logoPath: "./assets/logos/bhb.png" },
  hfb: { name: "恒丰银行", short: "HFB", logoPath: "./assets/logos/hfb.png" },
  generic: { name: "其他银行", short: "BANK", logoPath: "./assets/logos/generic.png" },
};

function normalizeBank(bank, cardName = "") {
  if (bank && BANK_CONFIG[bank]) {
    return bank;
  }

  const source = String(cardName).toLowerCase();

  if (source.includes("招商") || source.includes("cmb")) return "cmb";
  if (source.includes("邮储") || source.includes("邮政储蓄") || source.includes("psbc")) return "psbc";
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
  if (source.includes("上海银行") || source.includes("bosc") || source.includes("bos")) return "bos";
  if (source.includes("南京银行") || source.includes("njcb")) return "njcb";
  if (source.includes("宁波银行") || source.includes("nbcb")) return "nbcb";
  if (source.includes("浙商")) return "czb";
  if (source.includes("渤海")) return "bhb";
  if (source.includes("恒丰")) return "hfb";
  if (source.includes("工商") || source.includes("icbc")) return "icbc";
  if (source.includes("建设") || source.includes("ccb")) return "ccb";
  if (source.includes("农业") || source.includes("abc")) return "abc";
  if (source.includes("中国银行") || source.includes("中行") || source.includes("boc")) return "boc";

  return "generic";
}

function sanitizeAvailable(limit, available) {
  if (!Number.isFinite(available) || available < 0) return 0;
  return Math.min(available, limit);
}

function computeDebt(limit, available) {
  return Math.max(limit - sanitizeAvailable(limit, available), 0);
}

function normalizeLast4(last4) {
  return String(last4 || "").replace(/\D/g, "").slice(-4);
}

function buildCardFingerprint(card) {
  return `${normalizeBank(card.bank, card.name)}::${normalizeLast4(card.last4)}`;
}

function isDuplicateCard(cards, draft, excludeId = null) {
  const fingerprint = buildCardFingerprint(draft);
  return cards.some((card) => card.id !== excludeId && buildCardFingerprint(card) === fingerprint);
}

function normalizeCardDraft(card, updatedAt = new Date().toISOString()) {
  const bank = normalizeBank(card.bank, card.name);
  const bankConfig = BANK_CONFIG[bank] || BANK_CONFIG.generic;
  const rawName = String(card.name || "").trim();
  const limit = Math.max(Number(card.limit) || 0, 0);

  return {
    ...card,
    bank,
    name: rawName || bankConfig.name,
    last4: normalizeLast4(card.last4),
    limit,
    available: sanitizeAvailable(limit, Number(card.available)),
    updatedAt: card.updatedAt || updatedAt,
  };
}

function summarizeImportPayload(payload) {
  return {
    cardCount: Array.isArray(payload.cards) ? payload.cards.length : 0,
    ledgerTotalDebt: Math.max(Number(payload.ledgerTotalDebt) || 0, 0),
    exportedAt: payload.exportedAt || "",
  };
}

const logicApi = {
  BANK_CONFIG,
  normalizeBank,
  sanitizeAvailable,
  computeDebt,
  normalizeLast4,
  buildCardFingerprint,
  isDuplicateCard,
  normalizeCardDraft,
  summarizeImportPayload,
};

if (typeof module !== 'undefined') {
  module.exports = logicApi;
}

if (typeof window !== 'undefined') {
  window.CreditopiaLogic = logicApi;
}
