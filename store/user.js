import { defineStore } from 'pinia';
import { login, register, logout, getCurrent, getAll, switchUser, changePwd, updateUserAvatar } from '../domain/userService.js';

function syncTabBar(loggedIn) {
  try {
    if (loggedIn) {
      uni.showTabBar();
    } else {
      uni.hideTabBar();
    }
  } catch {}
}

export const useUserStore = defineStore('user', {
  state: () => ({
    currentUser: null,
    users: []
  }),

  getters: {
    isLoggedIn: (state) => !!state.currentUser,
    username: (state) => state.currentUser?.username || ''
  },

  actions: {
    init() {
      this.currentUser = getCurrent();
      if (this.currentUser) {
        const all = getAll();
        const fresh = all.find(u => u.id === this.currentUser.id);
        if (fresh) this.currentUser = fresh;
        else this.currentUser = null;
      }
      syncTabBar(!!this.currentUser);
    },
    register(username, password) {
      const result = register(username, password);
      if (result.success) {
        this.currentUser = result.data;
        syncTabBar(true);
      }
      return result;
    },
    login(username, password) {
      const result = login(username, password);
      if (result.success) {
        this.currentUser = result.data;
        syncTabBar(true);
      }
      return result;
    },
    logout() {
      logout();
      this.currentUser = null;
      this.users = [];
      syncTabBar(false);
    },
    loadUsers() {
      this.users = getAll();
    },
    switchUser(user) {
      const result = switchUser(user);
      if (result.success) {
        this.currentUser = user;
        this.loadUsers();
      }
      return result;
    },
    changePassword(userId, oldPwd, newPwd) {
      const result = changePwd(userId, oldPwd, newPwd);
      if (result.success) this.init();
      return result;
    },
    updateAvatar(avatarPath) {
      const result = updateUserAvatar(avatarPath);
      if (result.success) this.init();
      return result;
    },
    syncTabBar() {
      syncTabBar(!!this.currentUser);
    }
  }
});
