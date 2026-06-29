export function formatMoney(amount) {
  return parseFloat(amount).toFixed(2);
}

export function calculateTotal(records, type) {
  return records
    .filter(r => r.type === type)
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);
}
