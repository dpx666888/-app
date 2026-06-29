<template>
  <!-- 注册页面主容器 -->
  <view class="container">
    <!-- 头部装饰区域 -->
    <view class="header">
      <text class="logo">🦀</text>
      <text class="title">创建账号</text>
      <text class="subtitle">开启您的记账之旅</text>
    </view>

    <!-- 注册表单 -->
    <view class="form-container">
      <!-- 用户名输入 -->
      <view class="form-item">
        <text class="form-icon">👤</text>
        <input
          v-model="username"
          class="form-input"
          type="text"
          placeholder="请输入用户名"
          placeholder-class="placeholder"
        />
      </view>

      <!-- 密码输入 -->
      <view class="form-item">
        <text class="form-icon">🔒</text>
        <input
          v-model="password"
          class="form-input"
          type="password"
          placeholder="请输入密码"
          placeholder-class="placeholder"
        />
      </view>

      <!-- 确认密码 -->
      <view class="form-item">
        <text class="form-icon">🔑</text>
        <input
          v-model="confirmPassword"
          class="form-input"
          type="password"
          placeholder="请确认密码"
          placeholder-class="placeholder"
        />
      </view>

      <!-- 注册按钮 -->
      <button class="register-btn" @click="handleRegister">注册</button>

      <!-- 跳转登录 -->
      <view class="login-link">
        <text class="link-text">已有账号？</text>
        <text class="link-btn" @click="goToLogin">立即登录</text>
      </view>
    </view>
  </view>
</template>

<script>
/**
 * @file register.vue - 注册页面组件
 * @description 处理用户注册功能，包含用户名、密码的输入验证
 * @author Crab Bookkeeping Team
 * @version 1.0
 */

// 导入注册工具
import { useUserStore } from '../../store/user.js';

export default {
  data() {
    return {
      username: '',
      password: '',
      confirmPassword: ''
    };
  },
  methods: {
    handleRegister() {
      if (!this.username.trim()) {
        uni.showToast({ title: '请输入用户名', icon: 'none' });
        return;
      }
      if (!this.password.trim()) {
        uni.showToast({ title: '请输入密码', icon: 'none' });
        return;
      }
      if (!this.confirmPassword.trim()) {
        uni.showToast({ title: '请确认密码', icon: 'none' });
        return;
      }
      if (this.password.length < 6) {
        uni.showToast({ title: '密码长度至少6位', icon: 'none' });
        return;
      }
      if (this.password !== this.confirmPassword) {
        uni.showToast({ title: '两次输入的密码不一致', icon: 'none' });
        return;
      }
      const store = useUserStore();
      const result = store.register(this.username, this.password);
      if (result.success) {
        uni.showToast({ title: '注册成功', icon: 'success' });
        setTimeout(() => {
          uni.switchTab({ url: '/pages/index/index' });
        }, 1000);
      } else {
        uni.showToast({ title: result.message, icon: 'none' });
      }
    },
    goToLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
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
  background: linear-gradient(135deg, #ff9a56 0%, #ff6b6b 60%, #ee5a6f 100%);
  padding: 40rpx;
}

/**
 * 头部装饰区域
 */
.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0 60rpx;
}

.logo {
  font-size: 100rpx;
  margin-bottom: 16rpx;
}

.title {
  font-size: 44rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 8rpx;
}

.subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

/**
 * 表单容器
 */
.form-container {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
}

/**
 * 表单输入项
 */
.form-item {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 16rpx;
  padding: 0 24rpx;
  margin-bottom: 20rpx;
}

.form-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
}

.form-input {
  flex: 1;
  height: 88rpx;
  font-size: 30rpx;
  color: #333;
}

.placeholder {
  color: #999;
}

/**
 * 注册按钮
 */
.register-btn {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #ff9a56 0%, #ff6b6b 60%, #ee5a6f 100%);
  color: #fff;
  font-size: 34rpx;
  font-weight: bold;
  border-radius: 48rpx;
  border: none;
  margin-top: 16rpx;
}

/**
 * 登录链接
 */
.login-link {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 24rpx;
}

.link-text {
  font-size: 26rpx;
  color: #999;
}

.link-btn {
  font-size: 26rpx;
  color: #ff6b6b;
  margin-left: 10rpx;
}
</style>