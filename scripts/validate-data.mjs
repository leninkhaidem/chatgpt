import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const current = JSON.parse(
  await readFile(new URL("../data/current-cycle.json", import.meta.url), "utf8"),
);
const history = JSON.parse(
  await readFile(new URL("../data/previous-cycles.json", import.meta.url), "utf8"),
);

assert.equal(current.schemaVersion, 1, "Unsupported current-cycle schema");
assert.equal(current.currency, "AED", "Dashboard currency must be AED");
assert.match(current.cycle.start, /^\d{4}-\d{2}-\d{2}$/);
assert.match(current.cycle.end, /^\d{4}-\d{2}-\d{2}$/);
assert.ok(current.cycle.start <= current.cycle.end, "Cycle dates are reversed");
assert.ok(Array.isArray(current.transactions), "transactions must be an array");
assert.ok(Array.isArray(current.reviewItems), "reviewItems must be an array");

const ids = new Set();
for (const transaction of current.transactions) {
  assert.equal(typeof transaction.id, "string");
  assert.ok(!ids.has(transaction.id), `Duplicate transaction id: ${transaction.id}`);
  ids.add(transaction.id);
  assert.match(transaction.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(
    transaction.date >= current.cycle.start && transaction.date <= current.cycle.end,
    `Transaction ${transaction.id} falls outside the active cycle`,
  );
  assert.equal(typeof transaction.merchant, "string");
  assert.ok(transaction.merchant.length > 0);
  assert.equal(typeof transaction.amount, "number");
  assert.ok(Number.isFinite(transaction.amount) && transaction.amount >= 0);
  assert.equal(typeof transaction.category, "string");

  const serialized = JSON.stringify(transaction).toLowerCase();
  for (const forbidden of ["mail.google.com", "docs.google.com", "card ending", "source email"]) {
    assert.ok(!serialized.includes(forbidden), `Private field detected in ${transaction.id}`);
  }
}

for (const review of current.reviewItems) {
  assert.ok(ids.has(review.transactionId), `Unknown review transaction: ${review.transactionId}`);
}

assert.equal(history.schemaVersion, 1, "Unsupported history schema");
assert.equal(history.currency, "AED", "History currency must be AED");
assert.ok(Array.isArray(history.cycles), "cycles must be an array");
for (const cycle of history.cycles) {
  assert.match(cycle.start, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(cycle.end, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Number.isFinite(cycle.total) && cycle.total >= 0);
  assert.ok(Number.isInteger(cycle.transactionCount) && cycle.transactionCount >= 0);
}

const total = current.transactions.reduce((sum, item) => sum + item.amount, 0);
console.log(
  `Validated ${current.transactions.length} transactions totaling AED ${total.toFixed(2)}.`,
);
