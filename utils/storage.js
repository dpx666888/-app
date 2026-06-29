/**
 * @file storage.js - 本地存储工具模块
 * @description 负责用户数据、记账记录、头像的增删改查操作
 * @author Crab Bookkeeping Team
 * @version 1.0
 */

/**
 * 本地存储的键名常量定义
 * @constant {string} USER_KEY - 用户列表存储键
 * @constant {string} CURRENT_USER_KEY - 当前登录用户存储键
 */
const USER_KEY = 'users';
const CURRENT_USER_KEY = 'current_user';

/**
 * 生成唯一ID
 * @returns {string} 唯一标识符，由时间戳和随机数组成
 * @example generateId() // "jv2x3k"
 */
function generateId() {
  // 使用36进制转换时间戳，拼接随机数，生成短且唯一的ID
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * 获取所有用户列表
 * @returns {Array} 用户数组，每个用户包含id、username、password、avatar、records字段
 */
export function getUsers() {
  try {
    // 从本地存储读取用户数据
    const data = uni.getStorageSync(USER_KEY);
    // 如果有数据则解析JSON，否则返回空数组
    return data ? JSON.parse(data) : [];
  } catch (e) {
    // 解析失败时返回空数组，保证程序稳定性
    console.error('[getUsers] 读取用户列表失败:', e);
    return [];
  }
}

/**
 * 保存用户列表到本地存储
 * @param {Array} users - 用户数组
 * @returns {boolean} 保存是否成功
 */
export function saveUsers(users) {
  try {
    // 将用户数组序列化为JSON字符串存储
    uni.setStorageSync(USER_KEY, JSON.stringify(users));
    return true;
  } catch (e) {
    console.error('[saveUsers] 保存用户列表失败:', e);
    return false;
  }
}

/**
 * 获取当前登录用户信息
 * @returns {Object|null} 当前用户对象，未登录返回null
 */
export function getCurrentUser() {
  try {
    const data = uni.getStorageSync(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('[getCurrentUser] 读取当前用户失败:', e);
    return null;
  }
}

/**
 * 保存当前登录用户
 * @param {Object} user - 用户对象
 * @returns {boolean} 保存是否成功
 */
export function saveCurrentUser(user) {
  try {
    uni.setStorageSync(CURRENT_USER_KEY, JSON.stringify(user));
    return true;
  } catch (e) {
    console.error('[saveCurrentUser] 保存当前用户失败:', e);
    return false;
  }
}

/**
 * 注册新用户
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {{ success: boolean, message: string }} 注册结果
 */
export function register(username, password) {
  const users = getUsers();
  // 检查用户名是否已存在
  if (users.find(u => u.username === username)) {
    return { success: false, message: '用户名已存在' };
  }
  // 创建新用户
  const user = {
    id: generateId(),
    username,
    password,
    records: []
  };
  users.push(user);
  if (saveUsers(users)) {
    return { success: true, message: '注册成功' };
  }
  return { success: false, message: '注册失败，请重试' };
}

/**
 * 用户登录验证
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {{ success: boolean, message: string }} 登录结果
 */
export function login(username, password) {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    saveCurrentUser(user);
    return { success: true, message: '登录成功' };
  }
  return { success: false, message: '用户名或密码错误' };
}

/**
 * 用户退出登录
 * @description 清除当前登录用户状态，但保留用户数据
 */
export function logout() {
  // 移除当前用户存储，实现退出登录
  uni.removeStorageSync(CURRENT_USER_KEY);
}

/**
 * 添加记账记录
 * @param {Object} record - 记账记录对象
 * @param {string} record.type - 类型：expense(支出) 或 income(收入)
 * @param {number} record.amount - 金额
 * @param {string} record.category - 分类
 * @param {string} [record.note] - 备注（可选）
 * @returns {boolean} 添加是否成功
 */
export function addRecord(record) {
  // 检查是否已登录
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.warn('[addRecord] 用户未登录');
    return false;
  }

  // 获取所有用户列表
  const users = getUsers();
  // 查找当前用户在列表中的索引
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  if (userIndex === -1) {
    console.error('[addRecord] 当前用户不存在于用户列表');
    return false;
  }

  // 为记录生成唯一ID
  record.id = generateId();
  // 记录创建时间（ISO格式）
  record.createTime = new Date().toISOString();
  // 确保金额为数字类型
  record.amount = parseFloat(record.amount) || 0;

  // 将记录添加到用户的记录列表
  users[userIndex].records.push(record);

  // 保存更新并同步当前用户
  if (saveUsers(users)) {
    saveCurrentUser(users[userIndex]);
    return true;
  }
  return false;
}

/**
 * 获取当前用户的所有记账记录
 * @returns {Array} 记账记录数组，未登录返回空数组
 */
export function getRecords() {
  const currentUser = getCurrentUser();
  return currentUser ? currentUser.records || [] : [];
}

/**
 * 删除指定记账记录
 * @param {string} recordId - 记录ID
 * @returns {boolean} 删除是否成功
 */
export function deleteRecord(recordId) {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  if (userIndex === -1) return false;

  // 过滤掉要删除的记录
  users[userIndex].records = users[userIndex].records.filter(r => r.id !== recordId);

  if (saveUsers(users)) {
    saveCurrentUser(users[userIndex]);
    return true;
  }
  return false;
}

/**
 * 更新指定记账记录
 * @param {string} recordId - 记录ID
 * @param {Object} updatedRecord - 更新的字段（type、amount、category、note）
 * @returns {boolean} 更新是否成功
 */
export function updateRecord(recordId, updatedRecord) {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  if (userIndex === -1) return false;

  // 查找要更新的记录
  const recordIndex = users[userIndex].records.findIndex(r => r.id === recordId);
  if (recordIndex === -1) return false;

  // 如果更新金额，确保为数字类型
  if (updatedRecord.amount !== undefined) {
    updatedRecord.amount = parseFloat(updatedRecord.amount) || 0;
  }

  // 使用展开运算符合并旧记录和更新字段
  users[userIndex].records[recordIndex] = {
    ...users[userIndex].records[recordIndex],
    ...updatedRecord
  };

  if (saveUsers(users)) {
    saveCurrentUser(users[userIndex]);
    return true;
  }
  return false;
}

/**
 * 更新用户头像
 * @param {string} avatar - 头像文件路径或Base64编码
 * @returns {boolean} 更新是否成功
 */
export function updateAvatar(avatar) {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  if (userIndex === -1) return false;

  // 更新头像字段
  users[userIndex].avatar = avatar;

  if (saveUsers(users)) {
    saveCurrentUser(users[userIndex]);
    return true;
  }
  return false;
}