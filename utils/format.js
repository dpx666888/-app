// 兼容层 — 重新导出拆分后的工具函数
export { formatDate, formatTime, formatDateTime, getMonthLabel, getYearMonth } from './date.js';
export { formatMoney, calculateTotal } from './money.js';
export { calcCategoryStats as getCategoryStats } from './domain/statistics.js';
export { CATEGORY_ICONS, getCategoryIcon } from './categoryIcons.js';
