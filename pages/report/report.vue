<template>
  <!-- 统计页面主容器 -->
  <view class="container">
    <!-- 月份选择器 -->
    <view class="filter-bar">
      <picker mode="selector" :range="availableMonthLabels" :value="selectedMonthIndex" @change="handleDateChange">
        <view class="date-picker">
          <text class="date-text">{{ availableMonthLabels[selectedMonthIndex] }}</text>
          <text class="date-arrow">▼</text>
        </view>
      </picker>
    </view>

    <!-- 月度收支汇总 -->
    <view class="summary-row">
      <view class="summary-item expense">
        <text class="summary-icon">💸</text>
        <view class="summary-info">
          <text class="summary-label">支出</text>
          <text class="summary-value">-¥{{ formatMoney(monthlyExpense) }}</text>
        </view>
      </view>
      <view class="summary-item income">
        <text class="summary-icon">💰</text>
        <view class="summary-info">
          <text class="summary-label">收入</text>
          <text class="summary-value">+¥{{ formatMoney(monthlyIncome) }}</text>
        </view>
      </view>
    </view>

    <!-- 分类分布图表 -->
    <view class="chart-section">
      <view class="section-header">
        <text class="section-title">{{ type === 'expense' ? '支出' : '收入' }}{{ type === 'expense' ? '分类' : '来源' }}分布</text>
        <view class="type-switch">
          <view
            class="switch-btn"
            :class="{ active: type === 'expense' }"
            @click="type = 'expense'"
          >支出</view>
          <view
            class="switch-btn"
            :class="{ active: type === 'income' }"
            @click="type = 'income'"
          >收入</view>
        </view>
      </view>

      <!-- 分类进度条 -->
      <view class="chart-container">
        <view v-for="(item, index) in chartData" :key="index" class="chart-item">
          <view class="chart-label">
            <text class="label-icon">{{ getCategoryIcon(item.name) }}</text>
            <text class="label-text">{{ item.name }}</text>
          </view>
          <view class="chart-bar-wrap">
            <view class="chart-bar" :style="{ width: item.percent + '%', background: getBarColor(index) }"></view>
          </view>
          <view class="chart-value">
            <text class="value-amount">¥{{ formatMoney(item.amount) }}</text>
            <text class="value-percent">{{ item.percent }}%</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 明细记录列表 -->
    <view class="record-section">
      <view class="section-header">
        <text class="section-title">明细记录</text>
      </view>

      <template v-if="monthlyRecords.length > 0">
        <view class="record-list">
          <view
            v-for="record in displayedRecords"
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
        </view>

        <view v-if="monthlyRecords.length > 3" class="toggle-btn" @click="showAllRecords = !showAllRecords">
          <text>{{ showAllRecords ? '收起' : '查看全部' }}</text>
          <text class="toggle-arrow" :class="{ expanded: showAllRecords }">▼</text>
        </view>
      </template>

      <view v-else class="empty-state">
        <text class="empty-text">本月暂无记录</text>
      </view>
    </view>

    <!-- 编辑记录弹窗 -->
    <view v-if="showEditModal" class="modal-overlay" @click="closeEdit">
      <view class="modal-content" @click.stop>
        <text class="modal-title">编辑记录</text>

        <view class="type-tabs">
          <view class="tab" :class="{ active: editType === 'expense' }" @click="editType = 'expense'">
            <text>💸 支出</text>
          </view>
          <view class="tab" :class="{ active: editType === 'income' }" @click="editType = 'income'">
            <text>💰 收入</text>
          </view>
        </view>

        <view class="amount-section">
          <text class="amount-symbol">¥</text>
          <input v-model="editAmount" class="amount-input" type="digit" placeholder="0.00" @input="handleEditAmountInput" />
        </view>

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

        <view class="note-section">
          <textarea v-model="editNote" class="note-input" placeholder="备注（可选）" />
        </view>

        <view class="modal-actions">
          <button class="modal-btn cancel" @click="closeEdit">取消</button>
          <button class="modal-btn confirm" @click="saveEdit">保存</button>
        </view>
      </view>
    </view>

    <!-- 导出按钮 -->
    <button class="export-btn" @click="exportData">导出Excel</button>
  </view>
</template>

<script>
/**
 * @file report.vue - 统计页面组件
 * @description 展示月度收支统计、分类分布图表和明细记录，支持导出功能
 * @author Crab Bookkeeping Team
 * @version 1.0
 */

// 导入存储工具、格式化工具和导出工具
import { getRecords, deleteRecord, updateRecord } from '../../utils/storage.js';
import { formatMoney, formatDate, formatTime, formatDateTime, getCategoryStats, getCategoryIcon, CATEGORY_ICONS } from '../../utils/format.js';
import { exportToExcel } from '../../utils/export.js';

export default {
  /**
   * 组件数据定义
   * @property {string} selectedDate - 选中的月份（格式：yyyy-MM）
   * @property {string} type - 统计类型：'expense'(支出) 或 'income'(收入)
   * @property {Array} records - 用户的所有记账记录
   */
  data() {
    return {
      selectedDate: '',
      type: 'expense',
      records: [],
      showAllRecords: false,
      showEditModal: false,
      editRecord: null,
      editType: 'expense',
      editAmount: '',
      editCategory: '',
      editDate: '',
      editTime: '',
      editShowTime: true,
      editNote: ''
    };
  },
  computed: {
    /**
     * 从所有记录中提取有数据的月份（降序排列）
     * @returns {string[]} 格式 ["2026-06", "2026-05", ...]
     */
    availableMonthValues() {
      const months = [...new Set(
        this.records.filter(r => r && r.createTime).map(r => r.createTime.substring(0, 7))
      )];
      if (months.length === 0) {
        const now = new Date();
        months.push(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      }
      return months.sort().reverse();
    },
    /**
     * 有数据月份的显示标签
     * @returns {string[]} 格式 ["2026年6月", "2026年5月", ...]
     */
    availableMonthLabels() {
      return this.availableMonthValues.map(v => {
        const [y, m] = v.split('-');
        return `${y}年${parseInt(m)}月`;
      });
    },
    /**
     * 当前选中月份在可用月份列表中的索引
     * @returns {number}
     */
    selectedMonthIndex() {
      const idx = this.availableMonthValues.indexOf(this.selectedDate);
      return idx >= 0 ? idx : 0;
    },
    /**
     * 筛选出当月的记录
     * @returns {Array} 当月的记录数组
     */
    monthlyRecords() {
      const month = this.selectedDate.substring(0, 7);
      return this.records.filter(r => r && r.createTime && r.createTime.substring(0, 7) === month);
    },
    /**
     * 当月总支出
     * @returns {number} 当月所有支出记录的金额总和
     */
    monthlyExpense() {
      return this.monthlyRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + parseFloat(r.amount), 0);
    },
    /**
     * 当月总收入
     * @returns {number} 当月所有收入记录的金额总和
     */
    monthlyIncome() {
      return this.monthlyRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + parseFloat(r.amount), 0);
    },
    /**
     * 分类统计数据（用于图表展示）
     * @returns {Array} 包含分类名称、金额和百分比的数组
     */
    /**
     * 展示的记录列表：默认只显示最新3条，展开后显示全部
     * @returns {Array} 排序后的当月记录数组
     */
    displayedRecords() {
      const filtered = this.monthlyRecords.filter(r => r.type === this.type);
      const sorted = [...filtered].sort((a, b) => (b.createTime || '').localeCompare(a.createTime || ''));
      return this.showAllRecords ? sorted : sorted.slice(0, 3);
    },
    editCategories() {
      const expenseKeys = ['餐饮', '交通', '购物', '娱乐', '医疗', '教育', '住房', '通讯', '其他'];
      const incomeKeys = ['工资', '奖金', '投资', '其他'];
      const keys = this.editType === 'expense' ? expenseKeys : incomeKeys;
      return keys.map(name => ({ name, icon: CATEGORY_ICONS[name] || '💰' }));
    },
    chartData() {
      // 获取分类统计
      const stats = getCategoryStats(this.monthlyRecords, this.type);
      // 获取对应类型的总额
      const total = this.type === 'expense' ? this.monthlyExpense : this.monthlyIncome;

      // 转换为图表数据格式并按金额降序排序
      return Object.keys(stats)
        .map(name => ({
          name,
          amount: stats[name],
          percent: total > 0 ? ((stats[name] / total) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.amount - a.amount);
    }
  },
  /**
   * 页面加载时执行
   */
  onLoad() {
    this.loadRecords();
  },
  /**
   * 页面显示时执行（每次页面切换回来都会执行）
   */
  onShow() {
    // 每次显示时刷新记录
    this.loadRecords();
  },
  methods: {
    /**
     * 加载记账记录
     */
    loadRecords() {
      this.records = getRecords();
      // 同步选中月份：确保当前选中的月份在可用列表中
      const months = [...new Set(
        this.records.filter(r => r && r.createTime).map(r => r.createTime.substring(0, 7))
      )].sort().reverse();
      if (months.length > 0) {
        if (!months.includes(this.selectedDate)) {
          this.selectedDate = months[0];
        }
      } else {
        const now = new Date();
        this.selectedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      }
    },
    /**
     * 切换月份
     * @param {Object} e - 选择事件对象
     */
    handleDateChange(e) {
      this.selectedDate = this.availableMonthValues[e.detail.value];
    },
    /**
     * 获取分类图标（直接使用工具函数）
     */
    getCategoryIcon,
    formatDate,
    formatTime,
    /**
     * 获取图表进度条颜色（循环使用预设颜色数组）
     * @param {number} index - 索引
     * @returns {string} 颜色值
     */
    getBarColor(index) {
      const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
      return colors[index % colors.length];
    },
    /**
     * 金额格式化（直接使用工具函数）
     */
    formatMoney,
    /**
     * 日期时间格式化（直接使用工具函数）
     */
    formatDateTime,
    truncateNote(note) {
      if (!note) return '';
      return note.length > 10 ? note.substring(0, 10) + '...' : note;
    },
    showRecordMenu(record) {
      uni.showActionSheet({
        itemList: ['编辑', '删除'],
        itemColor: '#333',
        success: (res) => {
          if (res.tapIndex === 0) {
            this.openEdit(record);
          } else if (res.tapIndex === 1) {
            uni.showModal({
              title: '提示',
              content: '确定删除这条记录吗？',
              success: (r) => {
                if (r.confirm) {
                  deleteRecord(record.id);
                  this.loadRecords();
                  uni.showToast({ title: '删除成功', icon: 'success' });
                }
              }
            });
          }
        }
      });
    },
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
    closeEdit() {
      this.showEditModal = false;
      this.editRecord = null;
    },
    handleEditAmountInput(e) {
      let val = e.detail.value;
      val = val.replace(/[^\d.]/g, '');
      const parts = val.split('.');
      if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
      if (parts.length === 2 && parts[1].length > 2) val = parts[0] + '.' + parts[1].slice(0, 2);
      this.editAmount = val;
    },
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
      this.loadRecords();
      uni.showToast({ title: '修改成功', icon: 'success' });
    },
    /**
     * 导出当月记录为Excel
     */
    exportData() {
      // 检查是否有数据
      if (this.monthlyRecords.length === 0) {
        uni.showToast({ title: '暂无数据可导出', icon: 'none' });
        return;
      }
      // 调用导出工具
      exportToExcel(this.monthlyRecords);
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
  padding-bottom: 180rpx;
}

/**
 * 月份选择栏
 */
.filter-bar {
  background: #fff;
  padding: 20rpx 40rpx;
  display: flex;
  justify-content: center;
}

.date-picker {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  padding: 16rpx 32rpx;
  border-radius: 30rpx;
}

.date-text {
  font-size: 30rpx;
  color: #333;
  font-weight: bold;
}

.date-arrow {
  font-size: 20rpx;
  color: #999;
  margin-left: 10rpx;
}

/**
 * 月度汇总行
 */
.summary-row {
  display: flex;
  padding: 20rpx 40rpx;
  gap: 20rpx;
}

.summary-item {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
}

.summary-icon {
  font-size: 48rpx;
  margin-right: 20rpx;
}

.summary-info {
  display: flex;
  flex-direction: column;
}

.summary-label {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 6rpx;
}

.summary-value {
  font-size: 32rpx;
  font-weight: bold;
}

.summary-item.expense .summary-value {
  color: #ff4757;
}

.summary-item.income .summary-value {
  color: #2ed573;
}

/**
 * 图表区域
 */
.chart-section {
  margin: 20rpx 40rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.type-switch {
  display: flex;
  background: #f5f5f5;
  border-radius: 20rpx;
  padding: 6rpx;
}

.switch-btn {
  padding: 10rpx 24rpx;
  font-size: 24rpx;
  color: #666;
  border-radius: 16rpx;
  transition: all 0.3s;
}

.switch-btn.active {
  background: #667eea;
  color: #fff;
}

.chart-container {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.chart-item {
  display: flex;
  align-items: center;
}

.chart-label {
  width: 120rpx;
  display: flex;
  align-items: center;
}

.label-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.label-text {
  font-size: 24rpx;
  color: #333;
}

.chart-bar-wrap {
  flex: 1;
  height: 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  overflow: hidden;
  margin: 0 20rpx;
}

.chart-bar {
  height: 100%;
  border-radius: 12rpx;
  transition: width 0.3s;
}

.chart-value {
  width: 160rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.value-amount {
  font-size: 24rpx;
  color: #333;
  font-weight: bold;
}

.value-percent {
  font-size: 20rpx;
  color: #999;
}

/**
 * 明细记录区域
 */
.record-section {
  margin: 20rpx 40rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
}

.record-list {
  display: flex;
  flex-direction: column;
}

.record-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
}

.record-item:last-child {
  border-bottom: none;
}

.record-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
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
  font-size: 28rpx;
  color: #333;
  margin-bottom: 4rpx;
}

.record-note {
  font-size: 22rpx;
  color: #888;
  margin-bottom: 4rpx;
}

.record-time {
  font-size: 22rpx;
  color: #999;
}

.record-amount {
  font-size: 28rpx;
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
  padding: 40rpx;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
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
  border-radius: 12rpx;
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

/**
 * 导出按钮
 */
/**
 * 查看全部/收起按钮
 */
.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 0;
  font-size: 26rpx;
  color: #667eea;
}

.toggle-arrow {
  margin-left: 8rpx;
  font-size: 20rpx;
  transition: transform 0.3s;
}

.toggle-arrow.expanded {
  transform: rotate(180deg);
}

.export-btn {
  position: fixed;
  bottom: 100rpx;
  left: 40rpx;
  right: 40rpx;
  height: 90rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 34rpx;
  border-radius: 45rpx;
  border: none;
}
</style>