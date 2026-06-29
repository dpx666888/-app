// ========== 记录校验模块 ==========
// 职责：纯校验逻辑，不含 I/O，不含业务组合
// 上层：domain/recordService

export function validateType(type) {
  if (!type || !['expense', 'income'].includes(type)) return '请选择收支类型';
  return null;
}

export function validateAmount(amount) {
  if (!amount || parseFloat(amount) <= 0) return '请输入有效金额';
  return null;
}

export function validateCategory(category) {
  if (!category) return '请选择分类';
  return null;
}

export function validateRecord({ type, amount, category }) {
  return validateType(type) || validateAmount(amount) || validateCategory(category);
}

export function sanitizeAmount(amount) {
  if (amount === undefined || amount === null) return amount;
  return parseFloat(amount) || 0;
}
