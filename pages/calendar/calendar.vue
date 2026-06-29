<template>
  <view class="container">
    <!-- 未登录 -->
    <view v-if="!currentUser" class="guest-area">
      <view class="top-notice">
        <text class="notice-emoji">📅</text>
        <text class="notice-title">日历账单</text>
        <text class="notice-desc">登录后可按日期查看每日花销</text>
        <view class="notice-actions">
          <text class="notice-btn" @click="goToLogin">去登录</text>
          <text class="notice-btn outline" @click="goToRegister">注册</text>
        </view>
      </view>
    </view>

    <view v-else class="main-content">
      <!-- 月份导航 -->
      <view class="month-nav">
        <text class="nav-btn" @click="prevMonth">◀</text>
        <view class="month-title">
          <text class="month-year">{{ currentYear }}年</text>
          <text class="month-month">{{ currentMonth }}月</text>
        </view>
        <text class="nav-btn" @click="nextMonth">▶</text>
      </view>

      <!-- 周标题 -->
      <view class="weekday-row">
        <text class="weekday" v-for="(w, i) in weekdays" :key="i" :class="{ weekend: i === 0 || i === 6 }">{{ w }}</text>
      </view>

      <!-- 日历网格 -->
      <view class="calendar-grid">
        <view
          v-for="(cell, idx) in calendarCells"
          :key="idx"
          class="day-cell"
          :class="{
            'other-month': !cell.isCurrentMonth,
            'has-expense': cell.hasExpense,
            'has-income': cell.hasIncome,
            selected: selectedDate === cell.dateStr
          }"
          @click="selectDay(cell)"
        >
          <text class="day-num">{{ cell.day }}</text>
          <view v-if="cell.hasExpense || cell.hasIncome" class="day-dots">
            <text v-if="cell.hasExpense" class="dot expense-dot"></text>
            <text v-if="cell.hasIncome" class="dot income-dot"></text>
          </view>
        </view>
      </view>

      <!-- 选中日期的汇总 -->
      <view v-if="selectedRecords.length > 0" class="day-summary">
        <text class="summary-date">{{ selectedDateLabel }}</text>
        <view class="summary-row">
          <text class="summary-expense">支出 -¥{{ formatMoney(selectedExpense) }}</text>
          <text class="summary-income">收入 +¥{{ formatMoney(selectedIncome) }}</text>
        </view>
      </view>

      <!-- 选中日期的记录列表 -->
      <view class="record-section">
        <view class="section-header">
          <text class="section-title">{{ selectedRecords.length > 0 ? '记录' : '暂无记录' }}</text>
        </view>

        <view v-if="selectedRecords.length > 0" class="record-list">
          <view
            v-for="record in selectedRecords"
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

        <view v-else class="empty-day">
          <text class="empty-icon">📝</text>
          <text class="empty-text">这一天还没有记录</text>
          <button class="add-btn" @click="goToAdd">去记账</button>
        </view>
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
  </view>
</template>

<script>
import { getCurrentUser, getRecords, deleteRecord, updateRecord } from '../../utils/storage.js';
import { formatMoney, formatDate, formatTime, formatDateTime, getCategoryIcon, CATEGORY_ICONS } from '../../utils/format.js';

export default {
  data() {
    return {
      currentUser: null,
      records: [],
      currentYear: 0,
      currentMonth: 0,
      selectedDate: '',
      weekdays: ['日', '一', '二', '三', '四', '五', '六'],
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
    calendarCells() {
      const year = this.currentYear;
      const month = this.currentMonth;
      const firstDay = new Date(year, month - 1, 1).getDay();
      const daysInMonth = new Date(year, month, 0).getDate();
      const daysInPrev = new Date(year, month - 1, 0).getDate();

      // 构建日期→记录映射
      const dayMap = {};
      this.records.forEach(r => {
        if (!r || !r.createTime) return;
        const d = formatDate(r.createTime);
        if (!dayMap[d]) dayMap[d] = { expense: 0, income: 0 };
        if (r.type === 'expense') dayMap[d].expense += parseFloat(r.amount);
        else dayMap[d].income += parseFloat(r.amount);
      });

      const cells = [];
      const pad = firstDay;

      // 上月填充
      for (let i = pad - 1; i >= 0; i--) {
        const day = daysInPrev - i;
        const m = month === 1 ? 12 : month - 1;
        const y = month === 1 ? year - 1 : year;
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        cells.push({ day, dateStr, isCurrentMonth: false, hasExpense: false, hasIncome: false });
      }

      // 当月
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const info = dayMap[dateStr] || { expense: 0, income: 0 };
        cells.push({
          day,
          dateStr,
          isCurrentMonth: true,
          hasExpense: info.expense > 0,
          hasIncome: info.income > 0
        });
      }

      // 下月填充至42格
      const remaining = 42 - cells.length;
      for (let day = 1; day <= remaining; day++) {
        const m = month === 12 ? 1 : month + 1;
        const y = month === 12 ? year + 1 : year;
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        cells.push({ day, dateStr, isCurrentMonth: false, hasExpense: false, hasIncome: false });
      }

      return cells;
    },
    selectedRecords() {
      if (!this.selectedDate) return [];
      return this.records.filter(r => r && r.createTime && formatDate(r.createTime) === this.selectedDate)
        .sort((a, b) => (b.createTime || '').localeCompare(a.createTime || ''));
    },
    selectedExpense() {
      return this.selectedRecords.filter(r => r.type === 'expense').reduce((s, r) => s + parseFloat(r.amount), 0);
    },
    selectedIncome() {
      return this.selectedRecords.filter(r => r.type === 'income').reduce((s, r) => s + parseFloat(r.amount), 0);
    },
    selectedDateLabel() {
      if (!this.selectedDate) return '';
      const [y, m, d] = this.selectedDate.split('-');
      return `${parseInt(m)}月${parseInt(d)}日`;
    },
    editCategories() {
      const expenseKeys = ['餐饮', '交通', '购物', '娱乐', '医疗', '教育', '住房', '通讯', '其他'];
      const incomeKeys = ['工资', '奖金', '投资', '其他'];
      const keys = this.editType === 'expense' ? expenseKeys : incomeKeys;
      return keys.map(name => ({ name, icon: CATEGORY_ICONS[name] || '💰' }));
    }
  },
  onLoad() {
    this.loadData();
  },
  onShow() {
    this.loadData();
  },
  methods: {
    loadData() {
      this.currentUser = getCurrentUser();
      if (!this.currentUser) return;
      this.records = getRecords();

      // 初始化年月
      const now = new Date();
      if (!this.currentYear || !this.currentMonth) {
        this.currentYear = now.getFullYear();
        this.currentMonth = now.getMonth() + 1;
      }

      // 默认选中今天
      const today = formatDate(now.toISOString());
      if (!this.selectedDate) {
        this.selectedDate = today;
      }
    },
    prevMonth() {
      if (this.currentMonth === 1) {
        this.currentMonth = 12;
        this.currentYear--;
      } else {
        this.currentMonth--;
      }
      this.selectedDate = '';
    },
    nextMonth() {
      if (this.currentMonth === 12) {
        this.currentMonth = 1;
        this.currentYear++;
      } else {
        this.currentMonth++;
      }
      this.selectedDate = '';
    },
    selectDay(cell) {
      this.selectedDate = cell.dateStr;
    },
    getCategoryIcon,
    formatMoney,
    formatDate,
    formatDateTime,
    formatTime,
    truncateNote(note) {
      if (!note) return '';
      return note.length > 10 ? note.substring(0, 10) + '...' : note;
    },
    goToLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    },
    goToRegister() {
      uni.navigateTo({ url: '/pages/register/register' });
    },
    goToAdd() {
      uni.switchTab({ url: '/pages/add/add' });
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
                  this.loadData();
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
      this.loadData();
      uni.showToast({ title: '修改成功', icon: 'success' });
    }
  }
};
</script>

<style>
.container {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 180rpx;
}

/* 未登录 */
.guest-area {
  min-height: 100vh;
  background: #f5f5f5;
}

.top-notice {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 80rpx 40rpx 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.notice-emoji {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.notice-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 8rpx;
}

.notice-desc {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 28rpx;
}

.notice-actions {
  display: flex;
  gap: 24rpx;
}

.notice-btn {
  font-size: 28rpx;
  color: #667eea;
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

/* 月份导航 */
.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 30rpx 40rpx;
}

.nav-btn {
  font-size: 32rpx;
  color: #667eea;
  padding: 10rpx 20rpx;
}

.month-title {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
}

.month-year {
  font-size: 28rpx;
  color: #999;
}

.month-month {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

/* 周标题 */
.weekday-row {
  display: flex;
  background: #fff;
  padding: 0 20rpx 20rpx;
}

.weekday {
  flex: 1;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}

.weekday.weekend {
  color: #ff6b6b;
}

/* 日历网格 */
.calendar-grid {
  display: flex;
  flex-wrap: wrap;
  background: #fff;
  padding: 0 20rpx 20rpx;
}

.day-cell {
  width: 14.285%;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: 12rpx;
}

.day-cell.other-month .day-num {
  color: #ddd;
}

.day-num {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.day-cell.selected {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.day-cell.selected .day-num {
  color: #fff;
  font-weight: bold;
}

.day-dots {
  display: flex;
  gap: 4rpx;
  margin-top: 4rpx;
}

.dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
}

.expense-dot {
  background: #ff4757;
}

.income-dot {
  background: #2ed573;
}

.day-cell.selected .expense-dot {
  background: rgba(255, 255, 255, 0.9);
}

.day-cell.selected .income-dot {
  background: rgba(255, 255, 255, 0.9);
}

/* 选中日期汇总 */
.day-summary {
  background: #fff;
  margin: 20rpx 40rpx 0;
  border-radius: 20rpx 20rpx 0 0;
  padding: 24rpx 30rpx 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-date {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.summary-row {
  display: flex;
  gap: 20rpx;
}

.summary-expense {
  font-size: 24rpx;
  color: #ff4757;
}

.summary-income {
  font-size: 24rpx;
  color: #2ed573;
}

/* 记录列表 */
.record-section {
  margin: 0 40rpx 30rpx;
  background: #fff;
  border-radius: 0 0 20rpx 20rpx;
  padding: 0 30rpx 20rpx;
}

.section-header {
  padding: 20rpx 0;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #999;
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

/* 空状态 */
.empty-day {
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon {
  font-size: 60rpx;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 24rpx;
}

.add-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 26rpx;
  border-radius: 30rpx;
  padding: 14rpx 36rpx;
  border: none;
}

/* 编辑弹窗 */
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
</style>
