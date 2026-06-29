import { getCurrentUser } from '../utils/storage/userStorage.js';
import * as recordStorage from '../utils/storage/recordStorage.js';
import { wrapResult } from '../utils/error/index.js';
import { validateRecord, validateType, sanitizeAmount } from './recordValidator.js';

// ========== 记账记录业务服务 ==========
// 职责：权限校验、记录 CRUD 编排
// 下层：utils/storage/recordStorage（纯 CRUD）、recordValidator（校验）
// 上层：store（状态管理）

// 约定：query 返回 {success, data} | mutation 返回 {success, message, data?}

function requireAuth() {
  const user = getCurrentUser();
  if (!user) return null;
  return user;
}

export function getList() {
  const user = requireAuth();
  if (!user) return { success: false, data: [] };
  return { success: true, data: recordStorage.getRecordsByUser(user.id) };
}

export function create({ type, amount, category, note }) {
  const user = requireAuth();
  if (!user) return wrapResult(false, '未登录');
  const err = validateRecord({ type, amount, category });
  if (err) return wrapResult(false, err);
  const record = recordStorage.addRecord({ userId: user.id, type, amount, category, note });
  return record ? wrapResult(true, '保存成功', record) : wrapResult(false, '保存失败');
}

export function update(recordId, updates) {
  if (!requireAuth()) return wrapResult(false, '未登录');
  if (updates.type !== undefined) {
    const err = validateType(updates.type);
    if (err) return wrapResult(false, err);
  }
  if (updates.amount !== undefined) updates.amount = sanitizeAmount(updates.amount);
  return recordStorage.updateRecord(recordId, updates)
    ? wrapResult(true, '修改成功')
    : wrapResult(false, '修改失败');
}

export function remove(recordId) {
  if (!requireAuth()) return wrapResult(false, '未登录');
  return recordStorage.deleteRecord(recordId)
    ? wrapResult(true, '删除成功')
    : wrapResult(false, '删除失败');
}

export function clearAll() {
  const user = requireAuth();
  if (!user) return wrapResult(false, '未登录');
  return recordStorage.deleteRecordsByUser(user.id)
    ? wrapResult(true, '数据已清除')
    : wrapResult(false, '清除失败');
}
