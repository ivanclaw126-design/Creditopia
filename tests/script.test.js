const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildCardFingerprint,
  isDuplicateCard,
  normalizeCardDraft,
  summarizeImportPayload,
} = require('../logic.js');

test('buildCardFingerprint 用银行和尾号构造稳定指纹', () => {
  assert.equal(buildCardFingerprint({ bank: 'cmb', last4: '1234' }), 'cmb::1234');
});

test('isDuplicateCard 在同银行同尾号时返回 true', () => {
  const cards = [{ id: '1', bank: 'cmb', last4: '1234' }];
  assert.equal(isDuplicateCard(cards, { bank: 'cmb', last4: '1234' }), true);
});

test('isDuplicateCard 编辑同一张卡时忽略自身', () => {
  const cards = [{ id: '1', bank: 'cmb', last4: '1234' }];
  assert.equal(isDuplicateCard(cards, { bank: 'cmb', last4: '1234' }, '1'), false);
});

test('normalizeCardDraft 会写入更新时间并夹紧剩余额度', () => {
  const card = normalizeCardDraft(
    {
      id: '1',
      bank: 'cmb',
      name: '招商银行',
      last4: '1234',
      limit: 1000,
      available: 1500,
    },
    '2026-04-21T12:00:00.000Z'
  );

  assert.equal(card.available, 1000);
  assert.equal(card.updatedAt, '2026-04-21T12:00:00.000Z');
});

test('summarizeImportPayload 生成导入预览摘要', () => {
  const summary = summarizeImportPayload({ cards: [{}, {}], ledgerTotalDebt: 88 });
  assert.equal(summary.cardCount, 2);
  assert.equal(summary.ledgerTotalDebt, 88);
});
