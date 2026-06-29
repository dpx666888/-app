<template>
  <!-- 登录页面主容器 -->
  <view class="container">
    <!-- 头部装饰区域 -->
    <view class="header">
      <text class="logo">🦀</text>
      <text class="title">螃蟹记账</text>
      <text class="subtitle">轻松记录，聪明理财</text>
    </view>

    <!-- 登录表单 -->
    <view class="form-container">
      <!-- 用户名输入 -->
      <view class="form-item">
        <text class="form-icon">👤</text>
        <input
          v-model="username"
          class="form-input"
          type="text"
          placeholder="请输入账号"
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

      <!-- 登录按钮 -->
      <button class="login-btn" @click="handleLogin">登录</button>

      <!-- 跳转注册 -->
      <view class="register-link">
        <text class="link-text">还没有账号？</text>
        <text class="link-btn" @click="goToRegister">立即注册</text>
      </view>
    </view>
  </view>
</template>

<script>
/**
 * @file login.vue - 登录页面组件
 * @description 处理用户登录功能，包含账号和密码输入验证
 * @author Crab Bookkeeping Team
 * @version 1.0
 */

// 导入登录工具
import { useUserStore } from '../../store/user.js';

export default {
  data() {
    return {
      username: '',
      password: ''
    };
  },
  methods: {
    handleLogin() {
      if (!this.username.trim()) {
        uni.showToast({ title: '请输入账号', icon: 'none' });
        return;
      }
      if (!this.password.trim()) {
        uni.showToast({ title: '请输入密码', icon: 'none' });
        return;
      }
      const store = useUserStore();
      const result = store.login(this.username, this.password);
      if (result.success) {
        uni.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => {
          uni.switchTab({ url: '/pages/index/index' });
        }, 1000);
      } else {
        uni.showToast({ title: result.message, icon: 'none' });
      }
    },
    goToRegister() {
      uni.navigateTo({ url: '/pages/register/register' });
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx;
}

/**
 * 头部装饰区域
 */
.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0 80rpx;
}

.logo {
  font-size: 120rpx;
  margin-bottom: 20rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 10rpx;
}

.subtitle {
  font-size: 26rpx;
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
  margin-bottom: 24rpx;
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
 * 登录按钮
 */
.login-btn {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 34rpx;
  font-weight: bold;
  border-radius: 48rpx;
  border: none;
  margin-top: 20rpx;
}

/**
 * 注册链接
 */
.register-link {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 30rpx;
}

.link-text {
  font-size: 26rpx;
  color: #999;
}

.link-btn {
  font-size: 26rpx;
  color: #667eea;
  margin-left: 10rpx;
}
</style>