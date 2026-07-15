<template>
  <view class="container">
    <!-- 头部用户信息区域 -->
    <view class="header">
      <view class="user-card">
        <view class="avatar-wrap">
          <view class="avatar" @click="selectAvatar">
            <image v-if="user && user.avatar" :key="user.avatar" :src="user.avatar" class="avatar-img" mode="aspectFill" />
            <text v-else>👤</text>
          </view>
          <view class="camera-icon" @click="selectAvatar">📷</view>
        </view>
        <view class="user-info">
          <text class="username">{{ (user && user.username) || '点击登录' }}</text>
        </view>
      </view>

      <view v-if="!user" class="auth-actions">
        <button class="auth-btn login" @click="goToLogin">登录</button>
        <button class="auth-btn register" @click="goToRegister">注册</button>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view v-if="user" class="menu-section">
      <view class="menu-list">
        <view class="menu-item" @click="showChangePassword">
          <text class="menu-icon">🔒</text>
          <text class="menu-text">修改密码</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="showUserManage">
          <text class="menu-icon">👥</text>
          <text class="menu-text">用户管理</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="handleExport">
          <text class="menu-icon">📤</text>
          <text class="menu-text">导出数据</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="handleImport">
          <text class="menu-icon">📥</text>
          <text class="menu-text">导入数据</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="confirmClearData">
          <text class="menu-icon">🗑️</text>
          <text class="menu-text">清除数据</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="showAbout">
          <text class="menu-icon">ℹ️</text>
          <text class="menu-text">关于我们</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <button class="logout-btn" @click="confirmLogout">退出登录</button>
    </view>

    <!-- 修改密码弹窗 -->
    <view v-if="passwordModal" class="modal-overlay" @click="passwordModal = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">修改密码</text>
        <input v-model="oldPassword" class="modal-input" type="password" placeholder="请输入旧密码" />
        <input v-model="newPassword" class="modal-input" type="password" placeholder="请输入新密码（至少6位）" />
        <input v-model="confirmNewPassword" class="modal-input" type="password" placeholder="请确认新密码" />
        <view class="modal-btns">
          <button class="modal-btn cancel" @click="passwordModal = false">取消</button>
          <button class="modal-btn confirm" @click="doChangePassword">确定</button>
        </view>
      </view>
    </view>

    <!-- 用户管理弹窗 -->
    <view v-if="userManageModal" class="modal-overlay" @click="userManageModal = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">用户管理</text>
        <view v-if="allUsers.length === 0" class="empty-tip">暂无用户数据</view>
        <view v-for="u in allUsers" :key="u.id" class="user-row">
          <view class="user-row-left">
            <text class="user-row-avatar">👤</text>
            <text class="user-row-name">{{ u.username }}</text>
            <text v-if="u.id === (user && user.id)" class="user-row-tag">当前</text>
          </view>
          <button v-if="u.id !== (user && user.id)" class="switch-btn" @click="switchToUser(u)">切换</button>
        </view>
        <button class="close-btn" @click="userManageModal = false">关闭</button>
      </view>
    </view>

    <!-- 关于弹窗 -->
    <view v-if="showAboutModal" class="modal-overlay" @click="showAboutModal = false">
      <view class="modal-content" @click.stop>
        <view class="about-header">
          <text class="about-title">🦀 螃蟹记账</text>
          <text class="about-version">版本 0.3.2</text>
        </view>
        <view class="about-content">
          <text class="about-text">螃蟹记账，一款轻量级的个人财务管理工具，帮您清晰掌握每一笔收支，养成良好理财习惯。</text>
          <text class="about-text">功能特点：</text>
          <view class="feature-list">
            <text class="feature-item">✓ 快速记录收支，操作简单</text>
            <text class="feature-item">✓ 多维度分类，轻松管理</text>
            <text class="feature-item">✓ 月度图表统计，一目了然</text>
            <text class="feature-item">✓ 数据导出导入，安全备份</text>
            <text class="feature-item">✓ 多用户支持，全家共用</text>
          </view>
        </view>
        <text class="about-author">—— 作者：大螃蟹</text>
        <button class="close-btn" @click="showAboutModal = false">知道了</button>
      </view>
    </view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user.js';
import { useRecordStore } from '../../store/record.js';
import { exportAllData, importData } from '../../utils/backup.js';
import { exportToExcel, exportToCSV } from '../../utils/export.js';

export default {
  data() {
    return {
      user: null,
      allUsers: [],
      showAboutModal: false,
      passwordModal: false,
      userManageModal: false,
      oldPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    };
  },
  onLoad() {
    this.loadData();
  },
  onShow() {
    useUserStore().syncTabBar();
    this.loadData();
  },
  methods: {
    loadData() {
      const store = useUserStore();
      this.user = store.currentUser;
      if (this.user) {
        store.loadUsers();
        this.allUsers = store.users;
      }
    },
    goToLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    },
    goToRegister() {
      uni.navigateTo({ url: '/pages/register/register' });
    },

    showChangePassword() {
      this.oldPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
      this.passwordModal = true;
    },
    doChangePassword() {
      if (!this.oldPassword) {
        uni.showToast({ title: '请输入旧密码', icon: 'none' });
        return;
      }
      if (!this.newPassword || this.newPassword.length < 6) {
        uni.showToast({ title: '新密码至少6位', icon: 'none' });
        return;
      }
      if (this.newPassword !== this.confirmNewPassword) {
        uni.showToast({ title: '两次密码不一致', icon: 'none' });
        return;
      }
      const store = useUserStore();
      const result = store.changePassword(this.user.id, this.oldPassword, this.newPassword);
      if (result.success) {
        uni.showToast({ title: '密码修改成功', icon: 'success' });
        this.passwordModal = false;
        this.loadData();
      } else {
        uni.showToast({ title: result.message, icon: 'none' });
      }
    },

    showUserManage() {
      const store = useUserStore();
      store.loadUsers();
      this.allUsers = store.users;
      this.userManageModal = true;
    },
    switchToUser(targetUser) {
      uni.showModal({
        title: '切换用户',
        content: '确定切换到用户"' + targetUser.username + '"吗？',
        success: (res) => {
          if (res.confirm) {
            const store = useUserStore();
            store.switchUser(targetUser);
            this.loadData();
            this.userManageModal = false;
            uni.showToast({ title: '已切换用户', icon: 'success' });
          }
        }
      });
    },

    handleExport() {
      uni.showActionSheet({
        itemList: ['导出 Excel', '导出 CSV', '导出 JSON 备份'],
        success: (res) => {
          const records = useRecordStore().records;
          if (res.tapIndex === 0) {
            exportToExcel(records);
          } else if (res.tapIndex === 1) {
            exportToCSV(records);
          } else {
            exportAllData();
          }
        }
      });
    },

    handleImport() {
      importData();
    },

    // 清除数据
    confirmClearData() {
      uni.showModal({
        title: '警告',
        content: '确定要清除所有记账记录吗？此操作不可恢复！',
        success: (res) => {
          if (res.confirm) {
            const result = useRecordStore().clearAll();
            if (result.success) {
              uni.showToast({ title: '数据已清除', icon: 'success' });
              this.loadData();
            } else {
              uni.showToast({ title: '清除失败', icon: 'none' });
            }
          }
        }
      });
    },

    // 关于我们
    showAbout() {
      this.showAboutModal = true;
    },

    // 退出登录
    confirmLogout() {
      uni.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            useUserStore().logout();
            this.loadData();
            uni.showToast({ title: '退出成功', icon: 'success' });
          }
        }
      });
    },

    // 选择头像
    selectAvatar() {
      if (!this.user) return;
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          uni.saveFile({
            tempFilePath: res.tempFilePaths[0],
            success: (saveRes) => {
              const result = useUserStore().updateAvatar(saveRes.savedFilePath);
              if (result.success) {
                uni.showToast({ title: '头像更新成功', icon: 'success' });
                this.loadData();
              } else {
                uni.showToast({ title: result.message || '头像更新失败', icon: 'none' });
              }
            },
            fail: () => {
              uni.showToast({ title: '头像保存失败', icon: 'none' });
            }
          });
        }
      });
    }
  }
};
</script>

<style>
.container {
  min-height: 100vh;
  background: #f5f5f5;
}

/* 头部 */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60rpx 40rpx 40rpx;
}

.user-card {
  display: flex;
  align-items: center;
}

.avatar-wrap {
  position: relative;
  margin-right: 30rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56rpx;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.camera-icon {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 40rpx;
  height: 40rpx;
  background: #ff6b6b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.username {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
}

/* 未登录按钮 */
.auth-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}

.auth-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 30rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.5);
  background: transparent;
  color: #fff;
}

.auth-btn.login {
  background: rgba(255, 255, 255, 0.2);
}

/* 菜单 */
.menu-section {
  padding: 30rpx;
}

.menu-list {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 32rpx 30rpx;
  border-bottom: 2rpx solid #f5f5f5;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-icon {
  font-size: 36rpx;
  margin-right: 24rpx;
}

.menu-text {
  flex: 1;
  font-size: 30rpx;
  color: #333;
}

.menu-arrow {
  font-size: 36rpx;
  color: #ccc;
}

/* 退出登录按钮 */
.logout-btn {
  display: block;
  width: 480rpx;
  height: 72rpx;
  background: transparent;
  color: #ff4757;
  font-size: 28rpx;
  font-weight: bold;
  font-family: 'SimSun', '宋体', serif;
  border-radius: 36rpx;
  border: 2rpx solid #ff4757;
  margin: 30rpx auto 0;
  padding: 0;
}

/* 弹窗 */
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
  width: 80%;
  max-height: 70vh;
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
  overflow-y: auto;
}

.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  display: block;
  margin-bottom: 30rpx;
}

.modal-input {
  height: 88rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  margin-bottom: 20rpx;
}

.modal-btns {
  display: flex;
  gap: 20rpx;
  margin-top: 10rpx;
}

.modal-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
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

/* 用户管理 */
.empty-tip {
  text-align: center;
  color: #999;
  padding: 40rpx 0;
  font-size: 28rpx;
}

.user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
}

.user-row-left {
  display: flex;
  align-items: center;
}

.user-row-avatar {
  font-size: 40rpx;
  margin-right: 16rpx;
}

.user-row-name {
  font-size: 28rpx;
  color: #333;
}

.user-row-tag {
  font-size: 22rpx;
  color: #667eea;
  background: #eef0ff;
  padding: 4rpx 16rpx;
  border-radius: 12rpx;
  margin-left: 16rpx;
}

.switch-btn {
  height: 56rpx;
  line-height: 56rpx;
  padding: 0 24rpx;
  font-size: 24rpx;
  color: #667eea;
  background: #eef0ff;
  border-radius: 28rpx;
  border: none;
}

.close-btn {
  width: 100%;
  height: 80rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 30rpx;
  border-radius: 40rpx;
  border: none;
  margin-top: 20rpx;
}

/* 关于弹窗 */
.about-header {
  text-align: center;
  margin-bottom: 30rpx;
}

.about-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.about-version {
  font-size: 24rpx;
  color: #999;
}

.about-content {
  margin-bottom: 30rpx;
}

.about-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.8;
  display: block;
  margin-bottom: 16rpx;
}

.feature-list {
  padding-left: 20rpx;
}

.feature-item {
  font-size: 26rpx;
  color: #666;
  display: block;
  line-height: 1.8;
}

.about-author {
  display: block;
  text-align: right;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 20rpx;
}
</style>
