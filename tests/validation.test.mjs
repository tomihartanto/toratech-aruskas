import test from 'node:test';
import assert from 'node:assert/strict';
const v = await import('../src/lib/validation.ts').catch(() => ({}));
test('strict date-only UTC, month, money and identifiers', () => {
 assert.equal(typeof v.dateOnly, 'function');
 assert.equal(v.dateOnly('2024-02-29').toISOString(), '2024-02-29T00:00:00.000Z');
 for (const x of ['2025-02-29','2026-04-31','0000-01-01','2026-1-01']) assert.throws(() => v.dateOnly(x));
 for (const x of ['2026-00','2026-13','2026-1']) assert.throws(() => v.month(x));
 assert.equal(v.month('2026-12'), '2026-12');
 for (const x of ['1e3','0','-1','1.001','10000000000','Infinity']) assert.throws(() => v.money(x));
 assert.equal(v.money('123.45'), '123.45');
 for (const x of ['1e2','1.2','0','-1','9007199254740992']) assert.throws(() => v.id(x));
 assert.equal(v.id('12'),12);
});
