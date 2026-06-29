<template>
  <!-- 记账页面主容器 -->
  <view class="container">
    <!-- 收支类型切换 -->
    <view class="type-tabs">
      <view
        class="tab"
        :class="{ active: type === 'expense' }"
        @click="type = 'expense'"
      >
        <text class="tab-icon">💸</text>
        <text class="tab-text">支出</text>
      </view>
      <view
        class="tab"
        :class="{ active: type === 'income' }"
        @click="type = 'income'"
      >
        <text class="tab-icon">💰</text>
        <text class="tab-text">收入</text>
      </view>
    </view>

    <!-- 金额输入 -->
    <view class="amount-section">
      <view class="amount-input-wrap">
        <text class="amount-symbol">¥</text>
        <input
          v-model="amount"
          class="amount-input"
          type="digit"
          placeholder="0.00"
          @input="handleAmountInput"
        />
      </view>
    </view>

    <!-- 分类选择 -->
    <view class="category-section">
      <text class="section-title">选择分类</text>
      <view class="category-grid">
        <view
          v-for="cat in categories"
          :key="cat.name"
          class="category-item"
          :class="{ active: category === cat.name }"
          @click="category = cat.name"
        >
          <text class="category-icon">{{ cat.icon }}</text>
          <text class="category-name">{{ cat.name }}</text>
        </view>
      </view>
    </view>

    <!-- 备注输入 -->
    <view class="note-section">
      <text class="section-title">备注</text>
      <input
        v-model="note"
        class="note-input"
        placeholder="添加备注（可选）"
        placeholder-class="placeholder"
      />
    </view>

    <!-- 保存按钮 -->
    <button class="save-btn" @click="saveRecord">保存</button>
  </view>
</template>

<script>
/**
 * @file add.vue - 记账页面组件
 * @description 用于添加新的收支记录，包含类型选择、金额输入、分类选择和备注功能
 * @author Crab Bookkeeping Team
 * @version 1.0
 */

// 导入存储工具
import { addRecord } from '../../utils/storage.js';

export default {
  /**
   * 组件数据定义
   * @property {string} type - 收支类型：'expense'(支出) 或 'income'(收入)
   * @property {string} amount - 金额输入值
   * @property {string} category - 选中的分类
   * @property {string} note - 备注内容
   * @property {Array} expenseCategories - 支出分类列表
   * @property {Array} incomeCategories - 收入分类列表
   */
  data() {
    return {
      type: 'expense',
      amount: '',
      category: '',
      note: '',
      // 支出分类列表（9个分类）
      expenseCategories: [
        { name: '餐饮', icon: '🍔' },
        { name: '交通', icon: '🚗' },
        { name: '购物', icon: '🛍️' },
        { name: '娱乐', icon: '🎮' },
        { name: '医疗', icon: '🏥' },
        { name: '教育', icon: '📚' },
        { name: '住房', icon: '🏠' },
        { name: '通讯', icon: '📱' },
        { name: '其他', icon: '💰' }
      ],
      // 收入分类列表（4个分类）
      incomeCategories: [
        { name: '工资', icon: '💼' },
        { name: '奖金', icon: '🎁' },
        { name: '投资', icon: '📈' },
        { name: '其他', icon: '💰' }
      ]
    };
  },
  computed: {
    /**
     * 根据当前类型返回对应的分类列表
     * @returns {Array} 分类数组
     */
    categories() {
      return this.type === 'expense' ? this.expenseCategories : this.incomeCategories;
    }
  },
  /**
   * 页面加载时执行
   */
  onLoad() {
    // 默认选中第一个分类
    this.category = this.categories[0].name;
  },
  methods: {
    /**
     * 限制金额输入格式（最多两位小数）
     * @param {Object} e - 输入事件对象
     */
    handleAmountInput(e) {
      let value = e.detail.value;
      // 只保留数字和小数点
      value = value.replace(/[^\d.]/g, '');
      const parts = value.split('.');
      // 最多一个小数点
      if (parts.length > 2) {
        value = parts[0] + '.' + parts[1];
      }
      // 小数点后最多两位
      if (parts[1] && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2);
      }
      this.amount = value;
    },
    /**
     * 保存记账记录
     */
    saveRecord() {
      // 验证金额是否有效
      if (!this.amount || parseFloat(this.amount) <= 0) {
        uni.showToast({ title: '请输入有效金额', icon: 'none' });
        return;
      }

      // 验证分类是否选择
      if (!this.category) {
        uni.showToast({ title: '请选择分类', icon: 'none' });
        return;
      }

      // 构建记录对象
      const record = {
        type: this.type,
        amount: this.amount,
        category: this.category,
        note: this.note
      };

      // 调用存储工具添加记录
      if (addRecord(record)) {
        // 添加成功
        uni.showToast({ title: '保存成功', icon: 'success' });
        // 保存后重置表单并跳转首页
        setTimeout(() => {
          this.amount = '';
          this.note = '';
          this.category = this.categories[0].name;
          uni.switchTab({ url: '/pages/index/index' });
        }, 1000);
      } else {
        // 添加失败
        uni.showToast({ title: '保存失败', icon: 'none' });
      }
    }
  }
};
</script>

<style>
/**
 * 页面容器样式
 */
.container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 40rpx;
  padding-bottom: 200rpx;
}

/**
 * 收支类型切换标签
 */
.type-tabs {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  padding: 8rpx;
  margin-bottom: 40rpx;
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx;
  border-radius: 12rpx;
  transition: all 0.3s;
}

.tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.tab-icon {
  font-size: 48rpx;
  margin-bottom: 8rpx;
}

.tab-text {
  font-size: 28rpx;
  color: #666;
}

.tab.active .tab-text {
  color: #fff;
}

/**
 * 金额输入区域
 */
.amount-section {
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 40rpx;
}

.amount-input-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

.amount-symbol {
  font-size: 48rpx;
  color: #333;
  font-weight: bold;
  margin-right: 10rpx;
}

.amount-input {
  font-size: 64rpx;
  font-weight: bold;
  color: #333;
  text-align: left;
  width: 300rpx;
}

/**
 * 通用区域标题
 */
.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

/**
 * 分类选择区域
 */
.category-section {
  margin-bottom: 40rpx;
}

.category-grid {
  display: flex;
  flex-wrap: wrap;
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx;
}

.category-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 10rpx;
  border-radius: 12rpx;
  transition: all 0.3s;
}

.category-item.active {
  background: rgba(102, 126, 234, 0.1);
}

.category-icon {
  font-size: 48rpx;
  margin-bottom: 10rpx;
}

.category-name {
  font-size: 24rpx;
  color: #666;
}

.category-item.active .category-name {
  color: #667eea;
  font-weight: bold;
}

/**
 * 备注输入区域
 */
.note-section {
  margin-bottom: 40rpx;
}

.note-input {
  width: 100%;
  height: 80rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}

.placeholder {
  color: #999;
}

/**
 * 保存按钮
 */
.save-btn {
  height: 96rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 36rpx;
  font-weight: bold;
  border-radius: 48rpx;
  border: none;
  position: fixed;
  bottom: 100rpx;
  left: 40rpx;
  right: 40rpx;
}
</style>