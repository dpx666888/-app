<script>
/**
 * @file App.vue - 应用根组件
 * @description UniApp 应用的入口组件，负责管理应用的全局生命周期
 * @author Crab Bookkeeping Team
 * @version 1.0
 */

export default {
  /**
   * 应用启动时执行（只执行一次）
   * 在应用首次启动时触发，适合进行初始化操作
   */
  onLaunch: function() {
    console.log('🦀 螃蟹记账 App 启动');
    // 可以在这里进行全局初始化，如检查登录状态、加载全局配置等
  },
  /**
   * 应用显示时执行
   * 当应用从后台进入前台时触发
   */
  onShow: function() {
    console.log('App Show');
    // 可以在这里处理应用从后台返回前台的逻辑
  },
  /**
   * 应用隐藏时执行
   * 当应用从前台进入后台时触发
   */
  onHide: function() {
    console.log('App Hide');
    // 可以在这里处理应用进入后台的逻辑，如保存状态等
  }
}
</script>

<style>
/**
 * 全局公共样式
 * 定义应用中所有页面共享的样式
 */

/* 页面容器基础样式 */
page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 28rpx;
  color: #333;
  background-color: #f5f5f5;
  box-sizing: border-box;
}

/* 通用按钮样式重置 */
button {
  margin: 0;
  padding: 0;
  background: none;
  border: none;
}

button::after {
  border: none;
}

/* 输入框样式重置 */
input {
  box-sizing: border-box;
}

/* 图片自适应 */
image {
  display: block;
}

/* 清除默认边距和内边距 */
view, text {
  box-sizing: border-box;
}
</style>