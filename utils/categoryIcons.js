export const CATEGORY_ICONS = {
  '餐饮': '🍔', '交通': '🚗', '购物': '🛍️', '娱乐': '🎮',
  '医疗': '🏥', '教育': '📚', '住房': '🏠', '通讯': '📱',
  '工资': '💼', '奖金': '🎁', '投资': '📈', '其他': '💰'
};

export function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || '💰';
}
