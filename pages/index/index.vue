<template>
  <!-- 首页主容器 -->
  <view class="container">
    <!-- 未登录状态：欢迎页 -->
    <view v-if="!currentUser" class="guest-area">
      <view class="top-notice">
        <text class="notice-emoji">👋</text>
        <text class="notice-title">嗨，欢迎使用螃蟹记账～</text>
        <text class="notice-desc">登录后即可开始记录每一笔收支</text>
        <view class="notice-actions">
          <text class="notice-btn" @click="goToLogin">去登录</text>
          <text class="notice-btn outline" @click="goToRegister">注册</text>
        </view>
      </view>

      <!-- 功能预览卡片 -->
      <view class="preview-area">
        <view class="preview-card">
          <view class="preview-icons">
            <text class="preview-icon">🍔</text>
            <text class="preview-icon">🚗</text>
            <text class="preview-icon">🛍️</text>
            <text class="preview-icon">📚</text>
            <text class="preview-icon">💼</text>
          </view>
          <text class="preview-title">轻松记账，一目了然</text>
          <text class="preview-desc">支持多种分类 · 月度统计 · 数据导出</text>
        </view>
      </view>
    </view>

    <!-- 已登录状态：首页内容 -->
    <view v-else class="main-content">
      <!-- 头部：问候语 + 头像 -->
      <view class="header">
        <view class="user-info">
          <text class="greeting">{{ greeting }}，{{ currentUser?.username }}</text>
          <text class="date">{{ today }}</text>
        </view>
        <view class="avatar">
          <image v-if="currentUser?.avatar" :key="currentUser.avatar" class="avatar-img" :src="currentUser.avatar" mode="aspectFill" />
          <text v-else>👤</text>
        </view>
      </view>

      <!-- 本月概览卡片 -->
      <view class="summary-card">
        <view class="summary-header">
          <text class="summary-title">本月概览</text>
          <text class="summary-month">{{ currentMonth }}</text>
        </view>
        <view class="summary-content">
          <view class="expense">
            <text class="expense-label">支出</text>
            <text class="expense-amount">-¥{{ formatMoney(totalExpense) }}</text>
          </view>
          <view class="divider"></view>
          <view class="income">
            <text class="income-label">收入</text>
            <text class="income-amount">+¥{{ formatMoney(totalIncome) }}</text>
          </view>
        </view>
        <view class="balance">
          <text class="balance-label">结余</text>
          <text class="balance-amount">¥{{ formatMoney(balance) }}</text>
        </view>
      </view>

      <!-- 最近记录列表 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">最近记录</text>
          <text class="section-more" @click="goToReport">查看全部</text>
        </view>

        <view v-if="recentRecords.length > 0" class="record-list">
          <view
            v-for="record in recentRecords"
            :key="record.id"
            class="record-item"
            @longpress="showRecordMenu(record)"
          >
            <view class="record-icon" :class="record.type">
              {{ getCategoryIcon(record.category) }}
            </view>
            <view class="record-info">
              <text class="record-category">{{ record.category }}</text>
              <text v-if="record.note" class="record-note">{{ truncateNote(record.note) }}</text>
              <text class="record-time">{{ record.showTime === false ? formatDate(record.createTime) : formatDateTime(record.createTime) }}</text>
            </view>
            <text class="record-amount" :class="record.type">
              {{ record.type === 'expense' ? '-' : '+' }}¥{{ formatMoney(record.amount) }}
            </text>
          </view>
          <!-- 加载更多 -->
          <view v-if="hasMore" class="load-more-wrap">
            <text class="load-more" @click="loadMore">加载更多</text>
          </view>
        </view>

        <view v-else class="empty-state">
          <text class="empty-icon">📝</text>
          <text class="empty-text">暂无记录</text>
          <button class="add-btn" @click="goToAdd">去记账</button>
        </view>
      </view>
    </view>

    <!-- 悬浮记账按钮 -->
    <view v-if="currentUser" class="fab" :style="fabStyle" @touchstart="onFabTouchStart" @touchmove="onFabTouchMove" @touchend="onFabTouchEnd" @tap="onFabTap">
      <text class="fab-icon">＋</text>
      <text class="fab-text">记一笔</text>
    </view>

    <!-- 编辑记录弹窗 -->
    <view v-if="showEditModal" class="modal-overlay" @click="closeEdit">
      <view class="modal-content" @click.stop>
        <text class="modal-title">编辑记录</text>

        <!-- 收支类型切换 -->
        <view class="type-tabs">
          <view class="tab" :class="{ active: editType === 'expense' }" @click="editType = 'expense'">
            <text>💸 支出</text>
          </view>
          <view class="tab" :class="{ active: editType === 'income' }" @click="editType = 'income'">
            <text>💰 收入</text>
          </view>
        </view>

        <!-- 金额输入 -->
        <view class="amount-section">
          <text class="amount-symbol">¥</text>
          <input v-model="editAmount" class="amount-input" type="digit" placeholder="0.00" @input="handleEditAmountInput" />
        </view>

        <!-- 分类选择 -->
        <view class="category-section">
          <text class="section-title">选择分类</text>
          <view class="category-grid">
            <view
              v-for="cat in editCategories"
              :key="cat.name"
              class="category-item"
              :class="{ active: editCategory === cat.name }"
              @click="editCategory = cat.name"
            >
              <text class="category-icon">{{ cat.icon }}</text>
              <text class="category-name">{{ cat.name }}</text>
            </view>
          </view>
        </view>

        <!-- 日期与时间选择 -->
        <view class="datetime-section">
          <view class="datetime-row">
            <view class="datetime-item">
              <text class="datetime-label">日期</text>
              <picker mode="date" :value="editDate" @change="handleEditDateChange">
                <view class="datetime-picker">
                  <text class="datetime-value">{{ editDate }}</text>
                  <text class="datetime-arrow">▶</text>
                </view>
              </picker>
            </view>
            <view class="datetime-item">
              <text class="datetime-label">时间</text>
              <picker mode="time" :value="editTime" @change="handleEditTimeChange">
                <view class="datetime-picker">
                  <text class="datetime-value">{{ editTime }}</text>
                  <text class="datetime-arrow">▶</text>
                </view>
              </picker>
            </view>
          </view>
          <view class="show-time-toggle" @click="editShowTime = !editShowTime">
            <view class="toggle-box" :class="{ checked: editShowTime }">
              <text v-if="editShowTime" class="toggle-check">✓</text>
            </view>
            <text class="toggle-text">显示时间</text>
          </view>
        </view>

        <!-- 备注 -->
        <view class="note-section">
          <textarea v-model="editNote" class="note-input" placeholder="备注（可选）" />
        </view>

        <view class="modal-actions">
          <button class="modal-btn cancel" @click="closeEdit">取消</button>
          <button class="modal-btn confirm" @click="saveEdit">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
/**
 * @file index.vue - 首页组件
 * @description 显示用户信息、月度收支概览和最近记录列表
 * @author Crab Bookkeeping Team
 * @version 1.0
 */

// 导入存储工具和格式化工具
import { getCurrentUser, getRecords, deleteRecord, updateRecord } from '../../utils/storage.js';
import { formatMoney, formatDate, formatTime, formatDateTime, calculateTotal, getCategoryIcon, CATEGORY_ICONS } from '../../utils/format.js';

export default {
  /**
   * 组件数据定义
   * @property {Object|null} currentUser - 当前登录用户
   * @property {Array} records - 用户的记账记录列表
   * @property {string} greeting - 根据时间显示的问候语
   * @property {string} today - 今日日期显示
   * @property {string} currentMonth - 当前月份显示
   * @property {boolean} showEditModal - 编辑弹窗显示状态
   * @property {Object|null} editRecord - 正在编辑的记录
   * @property {string} editType - 编辑时的收支类型
   * @property {string} editAmount - 编辑时的金额
   * @property {string} editCategory - 编辑时的分类
   * @property {string} editNote - 编辑时的备注
   * @property {number} displayCount - 当前显示的记录数量
   */
  data() {
    return {
      currentUser: null,
      records: [],
      greeting: '早上好',
      today: '',
      currentMonth: '',
      showEditModal: false,
      editRecord: null,
      editType: 'expense',
      editAmount: '',
      editCategory: '',
      editDate: '',
      editTime: '',
      editShowTime: true,
      editNote: '',
      displayCount: 6,
      fabLeft: -1,
      fabTop: -1,
      fabMoved: false,
      fabTouchStartX: 0,
      fabTouchStartY: 0,
      fabStartLeft: 0,
      fabStartTop: 0
    };
  },
  computed: {
    /**
     * 本月总支出
     * @returns {number} 本月所有支出记录的金额总和
     */
    totalExpense() {
      return calculateTotal(this.monthlyRecords, 'expense');
    },
    /**
     * 本月总收入
     * @returns {number} 本月所有收入记录的金额总和
     */
    totalIncome() {
      return calculateTotal(this.monthlyRecords, 'income');
    },
    /**
     * 本月结余
     * @returns {number} 本月收入减去支出的余额
     */
    balance() {
      return this.totalIncome - this.totalExpense;
    },
    /**
     * 当月记录列表
     * @returns {Array} 当月记录数组
     */
    monthlyRecords() {
      const month = this.getCurrentMonth();
      return this.records.filter(r => r && r.createTime && r.createTime.substring(0, 7) === month);
    },
    /**
     * 按时间倒序排列的当月记录
     * @returns {Array} 排序后的当月记录数组
     */
    sortedRecords() {
      return [...this.monthlyRecords].sort((a, b) => new Date(b.createTime || 0) - new Date(a.createTime || 0));
    },
    /**
     * 最近显示的记录（根据displayCount截取）
     * @returns {Array} 最近的记录数组
     */
    recentRecords() {
      return this.sortedRecords.slice(0, this.displayCount);
    },
    /**
     * 是否还有更多记录可加载
     * @returns {boolean} 是否有更多记录
     */
    hasMore() {
      return this.displayCount < this.sortedRecords.length;
    },
    /**
     * 编辑弹窗中显示的分类列表（根据当前类型切换）
     * @returns {Array} 分类数组
     */
    fabStyle() {
      const s = {};
      if (this.fabLeft >= 0) { s.left = this.fabLeft + 'px'; s.right = 'auto'; }
      if (this.fabTop >= 0) { s.top = this.fabTop + 'px'; s.bottom = 'auto'; }
      return s;
    },
    editCategories() {
      // 支出分类列表
      const expenseKeys = ['餐饮', '交通', '购物', '娱乐', '医疗', '教育', '住房', '通讯', '其他'];
      // 收入分类列表
      const incomeKeys = ['工资', '奖金', '投资', '其他'];
      // 根据编辑类型返回对应分类
      const keys = this.editType === 'expense' ? expenseKeys : incomeKeys;
      return keys.map(name => ({ name, icon: CATEGORY_ICONS[name] || '💰' }));
    }
  },
  /**
   * 页面加载时执行
   */
  onLoad() {
    this.loadData();
  },
  /**
   * 页面显示时执行（每次页面切换回来都会执行）
   */
  onShow() {
    // 每次页面显示时刷新数据，确保数据最新
    this.loadData();
  },
  methods: {
    /**
     * 加载用户和记录数据
     */
    loadData() {
      // 获取当前登录用户
      this.currentUser = getCurrentUser();
      if (this.currentUser) {
        // 获取用户的记账记录
        this.records = getRecords();
        // 重置显示数量
        this.displayCount = 10;
        // 设置问候语
        this.setGreeting();
        // 设置日期显示
        this.setDate();
        // 初始化悬浮按钮位置
        this.initFabPosition();
      }
    },
    /**
     * 加载更多记录
     */
    loadMore() {
      this.displayCount += 10;
    },
    initFabPosition() {
      if (this.fabLeft < 0 || this.fabTop < 0) {
        const info = uni.getSystemInfoSync();
        const r = info.windowWidth / 750;
        this.fabLeft = info.windowWidth - 130 * r - 30 * r;
        this.fabTop = info.windowHeight - 130 * r - 240 * r;
      }
    },
    onFabTouchStart(e) {
      const t = e.touches[0];
      this.fabMoved = false;
      this.fabTouchStartX = t.clientX;
      this.fabTouchStartY = t.clientY;
      this.fabStartLeft = this.fabLeft;
      this.fabStartTop = this.fabTop;
    },
    onFabTouchMove(e) {
      const t = e.touches[0];
      const dx = t.clientX - this.fabTouchStartX;
      const dy = t.clientY - this.fabTouchStartY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        this.fabMoved = true;
      }
      const info = uni.getSystemInfoSync();
      const r = info.windowWidth / 750;
      const btnPx = 130 * r;
      let newLeft = this.fabStartLeft + dx;
      let newTop = this.fabStartTop + dy;
      newLeft = Math.max(0, Math.min(info.windowWidth - btnPx, newLeft));
      newTop = Math.max(0, Math.min(info.windowHeight - btnPx - 100 * r, newTop));
      this.fabLeft = newLeft;
      this.fabTop = newTop;
    },
    onFabTouchEnd() {
    },
    onFabTap() {
      if (this.fabMoved) return;
      this.goToAdd();
    },
    /**
     * 根据当前时间设置问候语
     */
    setGreeting() {
      const hour = new Date().getHours();
      if (hour < 12) this.greeting = '早上好';
      else if (hour < 18) this.greeting = '下午好';
      else this.greeting = '晚上好';
    },
    /**
     * 设置日期和月份显示
     */
    setDate() {
      const now = new Date();
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      this.today = `${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`;
      this.currentMonth = `${now.getFullYear()}年${now.getMonth() + 1}月`;
    },
    /**
     * 获取当前月份标识（yyyy-MM格式）
     * @returns {string} 当前月份字符串
     */
    getCurrentMonth() {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    },
    // 以下方法直接从工具函数导入使用
    getCategoryIcon,
    formatMoney,
    formatDate,
    formatDateTime,
    formatTime,
    /**
     * 截断备注内容，超过10字加省略号
     * @param {string} note - 备注内容
     * @returns {string} 截断后的备注
     */
    truncateNote(note) {
      if (!note) return '';
      return note.length > 10 ? note.substring(0, 10) + '...' : note;
    },
    /**
     * 跳转到记账页面
     */
    goToAdd() {
      uni.switchTab({ url: '/pages/add/add' });
    },
    /**
     * 跳转到统计页面
     */
    goToReport() {
      uni.switchTab({ url: '/pages/report/report' });
    },
    /**
     * 跳转到登录页面
     */
    goToLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    },
    /**
     * 跳转到注册页面
     */
    goToRegister() {
      uni.navigateTo({ url: '/pages/register/register' });
    },
    /**
     * 长按记录弹出操作菜单
     * @param {Object} record - 记账记录
     */
    showRecordMenu(record) {
      uni.showActionSheet({
        itemList: ['编辑', '删除'],
        itemColor: '#333',
        success: (res) => {
          if (res.tapIndex === 0) {
            // 点击编辑
            this.openEdit(record);
          } else if (res.tapIndex === 1) {
            // 点击删除，先确认
            uni.showModal({
              title: '提示',
              content: '确定删除这条记录吗？',
              success: (r) => {
                if (r.confirm) {
                  // 确认删除
                  deleteRecord(record.id);
                  // 刷新数据
                  this.loadData();
                  // 提示删除成功
                  uni.showToast({ title: '删除成功', icon: 'success' });
                }
              }
            });
          }
        }
      });
    },
    /**
     * 打开编辑弹窗并填充数据
     * @param {Object} record - 要编辑的记录
     */
    openEdit(record) {
      this.editRecord = record;
      this.editType = record.type;
      this.editAmount = String(record.amount);
      this.editCategory = record.category;
      const ct = record.createTime || new Date().toISOString();
      this.editDate = formatDate(ct);
      this.editTime = formatTime(ct);
      this.editShowTime = record.showTime !== false;
      this.editNote = record.note || '';
      this.showEditModal = true;
    },
    handleEditDateChange(e) {
      this.editDate = e.detail.value;
    },
    handleEditTimeChange(e) {
      this.editTime = e.detail.value;
    },
    /**
     * 关闭编辑弹窗
     */
    closeEdit() {
      this.showEditModal = false;
      this.editRecord = null;
    },
    /**
     * 限制金额输入格式（最多两位小数）
     * @param {Object} e - 输入事件
     */
    handleEditAmountInput(e) {
      let val = e.detail.value;
      // 只保留数字和小数点
      val = val.replace(/[^\d.]/g, '');
      const parts = val.split('.');
      // 最多一个小数点
      if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
      // 小数点后最多两位
      if (parts.length === 2 && parts[1].length > 2) val = parts[0] + '.' + parts[1].slice(0, 2);
      this.editAmount = val;
    },
    /**
     * 保存编辑
     */
    saveEdit() {
      const amount = parseFloat(this.editAmount);
      if (!amount || amount <= 0) {
        uni.showToast({ title: '请输入有效金额', icon: 'none' });
        return;
      }
      if (!this.editCategory) {
        uni.showToast({ title: '请选择分类', icon: 'none' });
        return;
      }
      const updates = {
        type: this.editType,
        amount,
        category: this.editCategory,
        showTime: this.editShowTime,
        note: this.editNote
      };
      const originalDate = formatDate(this.editRecord.createTime || new Date().toISOString());
      const originalTime = formatTime(this.editRecord.createTime || new Date().toISOString());
      if (this.editDate !== originalDate || this.editTime !== originalTime) {
        updates.createTime = new Date(`${this.editDate}T${this.editTime}:00`).toISOString();
      }
      updateRecord(this.editRecord.id, updates);
      this.closeEdit();
      this.loadData();
      uni.showToast({ title: '修改成功', icon: 'success' });
    }
  }
};
</script>

<style>
/**
 * 全局容器样式
 */
.container {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 180rpx;
}

/**
 * 未登录状态区域
 */
.guest-area {
  min-height: 100vh;
  background: #f5f5f5;
}

/**
 * 欢迎区域样式
 */
.top-notice {
  background: linear-gradient(135deg, #ff9a56 0%, #ff6b6b 60%, #ee5a6f 100%);
  padding: 50rpx 40rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.notice-emoji {
  font-size: 56rpx;
  margin-bottom: 12rpx;
}

.notice-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 8rpx;
}

.notice-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 28rpx;
}

.notice-actions {
  display: flex;
  gap: 24rpx;
}

.notice-btn {
  font-size: 28rpx;
  color: #ff6b6b;
  font-weight: bold;
  background: #fff;
  border-radius: 36rpx;
  padding: 14rpx 48rpx;
}

.notice-btn.outline {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 2rpx solid rgba(255, 255, 255, 0.6);
}

/**
 * 功能预览区域
 */
.preview-area {
  padding: 60rpx 40rpx;
}

.preview-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 50rpx 40rpx;
  text-align: center;
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.06);
}

.preview-icons {
  display: flex;
  justify-content: center;
  gap: 24rpx;
  margin-bottom: 30rpx;
}

.preview-icon {
  font-size: 48rpx;
}

.preview-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}

.preview-desc {
  font-size: 26rpx;
  color: #999;
  display: block;
}

/**
 * 首页头部样式
 */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60rpx 40rpx 80rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.greeting {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 10rpx;
}

.date {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
}

/**
 * 本月概览卡片样式
 */
.summary-card {
  background: #fff;
  margin: -40rpx 40rpx 30rpx;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.1);
}

.summary-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30rpx;
}

.summary-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.summary-month {
  font-size: 26rpx;
  color: #999;
}

.summary-content {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 20rpx 0;
}

.expense, .income {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.expense-label, .income-label {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.expense-amount {
  font-size: 40rpx;
  font-weight: bold;
  color: #ff4757;
}

.income-amount {
  font-size: 40rpx;
  font-weight: bold;
  color: #2ed573;
}

.divider {
  width: 2rpx;
  height: 60rpx;
  background: #eee;
}

.balance {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20rpx;
  border-top: 2rpx solid #f0f0f0;
  margin-top: 20rpx;
}

.balance-label {
  font-size: 28rpx;
  color: #666;
}

.balance-amount {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

/**
 * 记录列表区域
 */
.section {
  margin: 0 40rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.section-more {
  font-size: 26rpx;
  color: #667eea;
}

.record-list {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.record-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-bottom: 2rpx solid #f5f5f5;
}

.record-item:last-child {
  border-bottom: none;
}

.load-more-wrap {
  padding: 24rpx;
  text-align: center;
}

.load-more {
  font-size: 26rpx;
  color: #667eea;
}

.record-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  margin-right: 20rpx;
}

.record-icon.expense {
  background: #fff0f0;
}

.record-icon.income {
  background: #f0fff0;
}

.record-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.record-category {
  font-size: 30rpx;
  color: #333;
  margin-bottom: 6rpx;
}

.record-note {
  font-size: 22rpx;
  color: #888;
  margin-bottom: 4rpx;
}

.record-time {
  font-size: 24rpx;
  color: #999;
}

.record-amount {
  font-size: 30rpx;
  font-weight: bold;
}

.record-amount.expense {
  color: #ff4757;
}

.record-amount.income {
  color: #2ed573;
}

/**
 * 空状态样式
 */
.empty-state {
  background: #fff;
  border-radius: 20rpx;
  padding: 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 30rpx;
}

.add-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 28rpx;
  border-radius: 30rpx;
  padding: 16rpx 40rpx;
  border: none;
}

/**
 * 编辑弹窗样式
 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 85%;
  max-height: 80vh;
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx 40rpx 20rpx;
  overflow-y: auto;
}

.modal-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin-bottom: 30rpx;
}

.type-tabs {
  display: flex;
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 16rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #666;
}

.tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.amount-section {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
  border-bottom: 4rpx solid #667eea;
  padding-bottom: 16rpx;
}

.amount-symbol {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  margin-right: 12rpx;
}

.amount-input {
  flex: 1;
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
}

.category-section {
  margin-bottom: 30rpx;
}

.category-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 20rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
}

.category-item.active {
  background: #f0edff;
  border-color: #667eea;
}

.category-icon {
  font-size: 36rpx;
  margin-bottom: 6rpx;
}

.category-name {
  font-size: 24rpx;
  color: #666;
}

.note-section {
  margin-bottom: 30rpx;
}

.datetime-section {
  margin-bottom: 30rpx;
}

.datetime-row {
  display: flex;
  gap: 16rpx;
}

.datetime-item {
  flex: 1;
}

.datetime-label {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.datetime-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx;
}

.datetime-value {
  font-size: 28rpx;
  color: #333;
}

.datetime-arrow {
  font-size: 24rpx;
  color: #999;
}

.show-time-toggle {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
}

.toggle-box {
  width: 40rpx;
  height: 40rpx;
  border-radius: 8rpx;
  border: 2rpx solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12rpx;
  background: #fff;
}

.toggle-box.checked {
  background: #667eea;
  border-color: #667eea;
}

.toggle-check {
  font-size: 24rpx;
  color: #fff;
  font-weight: bold;
}

.toggle-text {
  font-size: 26rpx;
  color: #666;
}

.note-input {
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  width: 100%;
  min-height: 120rpx;
  box-sizing: border-box;
}

.modal-actions {
  display: flex;
  gap: 20rpx;
  position: sticky;
  bottom: 0;
  background: #fff;
  padding-top: 20rpx;
}

.modal-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 30rpx;
  border: none;
}

.modal-btn.cancel {
  background: #f5f5f5;
  color: #666;
}

.modal-btn.confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

/* 悬浮记账按钮 */
.fab {
  position: fixed;
  width: 130rpx;
  height: 130rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 30rpx rgba(102, 126, 234, 0.4);
  z-index: 100;
}

.fab-icon {
  font-size: 36rpx;
  color: #fff;
  font-weight: bold;
  line-height: 1;
}

.fab-text {
  font-size: 18rpx;
  color: #fff;
  margin-top: 2rpx;
}
</style>