/**
 * @file format.js - 数据格式化工具模块
 * @description 提供日期、金额格式化及分类统计功能
 * @author Crab Bookkeeping Team
 * @version 1.0
 */

/**
 * 将日期字符串格式化为 yyyy-MM-dd 格式
 * @param {string|Date} dateStr - 日期字符串或Date对象
 * @returns {string} 格式化后的日期字符串
 * @example formatDate('2024-01-15T10:30:00.000Z') // "2024-01-15"
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  // 月份从0开始，需要+1，并补零到2位
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 将日期字符串格式化为 yyyy-MM-dd HH:mm 格式
 * @param {string|Date} dateStr - 日期字符串或Date对象
 * @returns {string} 格式化后的日期时间字符串
 * @example formatDateTime('2024-01-15T10:30:00.000Z') // "2024-01-15 10:30"
 */
/**
 * 从日期字符串中提取时间部分 HH:mm 格式
 * @param {string|Date} dateStr - 日期字符串或Date对象
 * @returns {string} 格式化后的时间字符串
 * @example formatTime('2024-01-15T10:30:00.000Z') // "18:30" (东八区)
 */
export function formatTime(dateStr) {
  const date = new Date(dateStr);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 金额格式化，保留两位小数
 * @param {number|string} amount - 金额
 * @returns {string} 格式化后的金额字符串
 * @example formatMoney(50) // "50.00"
 * @example formatMoney('123.456') // "123.46"
 */
export function formatMoney(amount) {
  return parseFloat(amount).toFixed(2);
}

/**
 * 按月份分组记账记录
 * @param {Array} records - 记账记录数组
 * @returns {Object} 以月份为key，记录数组为value的对象
 * @example
 * groupRecordsByMonth([{createTime: '2024-01-15T10:30:00.000Z'}])
 * // { '2024-01': [{createTime: '2024-01-15T10:30:00.000Z'}] }
 */
export function groupRecordsByMonth(records) {
  const groups = {};
  records.forEach(record => {
    // 提取年月部分作为分组key
    const month = formatDate(record.createTime).substring(0, 7);
    if (!groups[month]) {
      groups[month] = [];
    }
    groups[month].push(record);
  });
  return groups;
}

/**
 * 计算指定类型的总金额
 * @param {Array} records - 记账记录数组
 * @param {string} type - 类型：'expense'(支出) 或 'income'(收入)
 * @returns {number} 总金额
 * @example calculateTotal(records, 'expense') // 1234.56
 */
export function calculateTotal(records, type) {
  return records
    // 过滤出指定类型的记录
    .filter(r => r.type === type)
    // 累加金额
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);
}

/**
 * 分类图标映射表
 * @constant {Object} CATEGORY_ICONS - 分类名称到图标的映射
 */
export const CATEGORY_ICONS = {
  '餐饮': '🍔',  // 餐饮分类图标
  '交通': '🚗',  // 交通分类图标
  '购物': '🛍️',  // 购物分类图标
  '娱乐': '🎮',  // 娱乐分类图标
  '医疗': '🏥',  // 医疗分类图标
  '教育': '📚',  // 教育分类图标
  '住房': '🏠',  // 住房分类图标
  '通讯': '📱',  // 通讯分类图标
  '工资': '💼',  // 工资分类图标
  '奖金': '🎁',  // 奖金分类图标
  '投资': '📈',  // 投资分类图标
  '其他': '💰'   // 其他分类图标
};

/**
 * 获取分类对应的图标
 * @param {string} category - 分类名称
 * @returns {string} Emoji图标
 * @example getCategoryIcon('餐饮') // "🍔"
 * @example getCategoryIcon('未知') // "💰" (默认)
 */
export function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || '💰';
}

/**
 * 按分类统计金额
 * @param {Array} records - 记账记录数组
 * @param {string} type - 类型：'expense'(支出) 或 'income'(收入)
 * @returns {Object} 以分类为key，金额为value的对象
 * @example
 * getCategoryStats(records, 'expense')
 * // { '餐饮': 500.00, '交通': 200.00 }
 */
export function getCategoryStats(records, type) {
  const stats = {};
  records
    .filter(r => r.type === type)
    .forEach(record => {
      // 如果分类不存在，初始化为0
      if (!stats[record.category]) {
        stats[record.category] = 0;
      }
      // 累加金额
      stats[record.category] += parseFloat(record.amount);
    });
  return stats;
}