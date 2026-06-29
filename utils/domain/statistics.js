export function calcCategoryStats(records, type) {
  const stats = {};
  records
    .filter(r => r.type === type)
    .forEach(r => {
      stats[r.category] = (stats[r.category] || 0) + parseFloat(r.amount);
    });
  return stats;
}

export function calcChartData(records, type) {
  const stats = calcCategoryStats(records, type);
  const total = Object.values(stats).reduce((s, v) => s + v, 0);
  return Object.keys(stats)
    .map(name => ({
      name,
      amount: stats[name],
      percent: total > 0 ? Number(((stats[name] / total) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function calcDayMap(records) {
  const map = {};
  records.forEach(r => {
    if (!r || !r.createTime) return;
    const d = formatDate(r.createTime);
    if (!map[d]) map[d] = { expense: 0, income: 0, records: [] };
    if (r.type === 'expense') map[d].expense += parseFloat(r.amount);
    else map[d].income += parseFloat(r.amount);
    map[d].records.push(r);
  });
  return map;
}

export function getAvailableMonths(records) {
  const months = [...new Set(
    records.filter(r => r && r.createTime).map(r => r.createTime.substring(0, 7))
  )].sort().reverse();
  if (months.length === 0) {
    const now = new Date();
    months.push(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

import { formatDate } from '../date.js';
