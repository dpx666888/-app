<template>
  <view class="container">
    <view class="center">
      <text class="title">数据迁移</text>
      <text class="sub">正在恢复备份数据...</text>
      <button class="btn" @click="doRestore">点击恢复数据</button>
    </view>
  </view>
</template>

<script>
import { doMigrate } from '../../utils/migrateData.js';

export default {
  methods: {
    doRestore() {
      doMigrate();
    }
  }
};
</script>

<style>
.container {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30rpx;
}
.title { font-size: 40rpx; font-weight: bold; color: #333; }
.sub { font-size: 28rpx; color: #999; }
.btn {
  width: 400rpx; height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff; font-size: 30rpx; border-radius: 44rpx; border: none;
}
</style>
