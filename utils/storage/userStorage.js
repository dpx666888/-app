const USER_KEY = 'crab_users';
const RECORD_KEY = 'crab_records';
const CURRENT_USER_KEY = 'crab_current_user';

function getItem(key) {
  try {
    const data = uni.getStorageSync(key);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

function setItem(key, val) {
  try {
    uni.setStorageSync(key, JSON.stringify(val));
    return true;
  } catch { return false; }
}

export function getUsers() { return getItem(USER_KEY) || []; }
export function saveUsers(users) { return setItem(USER_KEY, users); }
export function getCurrentUser() { return getItem(CURRENT_USER_KEY); }
export function saveCurrentUser(user) { return setItem(CURRENT_USER_KEY, user); }
export function removeCurrentUser() { try { uni.removeStorageSync(CURRENT_USER_KEY); } catch {} }

export function updateAvatar(avatar) {
  const user = getCurrentUser();
  if (!user) return false;
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx === -1) return false;
  users[idx].avatar = avatar;
  return saveUsers(users) && saveCurrentUser(users[idx]);
}
