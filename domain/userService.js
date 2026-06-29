import { getUsers, saveUsers, getCurrentUser, saveCurrentUser, removeCurrentUser, updateAvatar as updateAvatarStorage } from '../utils/storage/userStorage.js';
import { deleteRecordsByUser } from '../utils/storage/recordStorage.js';
import { hashPassword, verifyPassword } from '../utils/crypto/index.js';
import { wrapResult } from '../utils/error/index.js';

// ========== 用户业务服务 ==========
// 职责：用户注册/登录/切换/密码/头像等业务逻辑 + 数据校验
// 约定：query 返回 {success, data} | mutation 返回 {success, message, data?}
// 下层：utils/storage（纯 CRUD + 加密）
// 上层：store（状态管理，不写业务逻辑）

export function register(username, password) {
  if (!username || !username.trim()) return wrapResult(false, '用户名不能为空');
  if (!password || password.trim().length < 6) return wrapResult(false, '密码至少6位');
  const users = getUsers();
  if (users.find(u => u.username === username)) return wrapResult(false, '用户名已存在');
  const { hash, salt } = hashPassword(password);
  const user = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), username, passwordHash: hash, salt };
  users.push(user);
  if (!saveUsers(users)) return wrapResult(false, '注册失败');
  saveCurrentUser(user);
  return wrapResult(true, '注册成功', user);
}

export function login(username, password) {
  if (!username || !username.trim()) return wrapResult(false, '请输入用户名');
  if (!password || !password.trim()) return wrapResult(false, '请输入密码');
  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (!user) return wrapResult(false, '用户名或密码错误');
  if (!verifyPassword(password, user.passwordHash, user.salt)) return wrapResult(false, '用户名或密码错误');
  saveCurrentUser(user);
  return wrapResult(true, '登录成功', user);
}

export function logout() {
  removeCurrentUser();
}

export function getCurrent() {
  return getCurrentUser();
}

export function getAll() {
  return getUsers();
}

export function switchUser(targetUser) {
  const users = getUsers();
  const fresh = users.find(u => u.id === targetUser.id);
  if (!fresh) return wrapResult(false, '用户不存在');
  saveCurrentUser(fresh);
  return wrapResult(true, '已切换用户', fresh);
}

export function changePwd(userId, oldPwd, newPwd) {
  if (!newPwd || newPwd.length < 6) return wrapResult(false, '新密码至少6位');
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return wrapResult(false, '用户不存在');
  if (!verifyPassword(oldPwd, users[idx].passwordHash, users[idx].salt)) return wrapResult(false, '旧密码错误');
  const { hash, salt } = hashPassword(newPwd);
  users[idx].passwordHash = hash;
  users[idx].salt = salt;
  if (!saveUsers(users)) return wrapResult(false, '修改失败');
  saveCurrentUser(users[idx]);
  return wrapResult(true, '密码修改成功');
}

export function updateUserAvatar(avatarPath) {
  if (!getCurrentUser()) return wrapResult(false, '未登录');
  if (!updateAvatarStorage(avatarPath)) return wrapResult(false, '头像更新失败');
  saveCurrentUser(getCurrentUser());
  return wrapResult(true, '头像更新成功');
}

export function clearRecordsByUser(userId) {
  return deleteRecordsByUser(userId) ? wrapResult(true, '已清除') : wrapResult(false, '清除失败');
}
