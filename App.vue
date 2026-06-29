<script>
import { useUserStore } from './store/user.js';
import { doMigrate } from './utils/migrateData.js';

export default {
  onLaunch() {
    const userStore = useUserStore();
    userStore.init();
    // 首次启动：如果无用户数据则自动恢复备份
    if (!userStore.currentUser) {
      try {
        const users = uni.getStorageSync('crab_users');
        if (!users || JSON.parse(users).length === 0) {
          doMigrate();
          return;
        }
      } catch {}
    }
    userStore.syncTabBar();
    console.log('螃蟹记账 v2.0 启动');
  },
  onShow() {},
  onHide() {}
};
</script>

<style>
page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 28rpx;
  color: #333;
  background-color: #f5f5f5;
  box-sizing: border-box;
}
button { margin: 0; padding: 0; background: none; border: none; }
button::after { border: none; }
input { box-sizing: border-box; }
image { display: block; }
view, text { box-sizing: border-box; }
</style>
