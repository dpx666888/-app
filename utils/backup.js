// 数据备份：导出/导入用户数据的 JSON 文件
import { getUsers, saveUsers } from './storage/userStorage.js';
import { getAllRecords, saveAllRecords } from './storage/recordStorage.js';
import { hashPassword } from './crypto/index.js';
import { gzip, ungzip } from 'pako';

const EXPORT_VERSION = '2.1.0';

// ---- Base64 工具（跨平台安全）-----------------------------------------------

function uint8ToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  try { return btoa(binary); } catch { return binary; }
}

function base64ToUint8(str) {
  try { str = atob(str); } catch { return null; }
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

// ---- 压缩 / 解压 -----------------------------------------------------------

function compressData(json) {
  // pako.gzip 可直接处理字符串（自动 UTF-8 编码）
  return gzip(json, { level: 6 });
}

function decompressData(bytes) {
  const raw = ungzip(bytes);
  // 手动解码 UTF-8 字节 → 字符串（兼容小程序等不支持 TextDecoder 的环境）
  let str = '', i = 0;
  while (i < raw.length) {
    const c = raw[i++];
    if (c < 0x80) {
      str += String.fromCharCode(c);
    } else if (c < 0xE0) {
      str += String.fromCharCode(((c & 0x1F) << 6) | (raw[i++] & 0x3F));
    } else if (c < 0xF0) {
      str += String.fromCharCode(((c & 0x0F) << 12) | ((raw[i++] & 0x3F) << 6) | (raw[i++] & 0x3F));
    } else {
      const cp = ((c & 0x07) << 18) | ((raw[i++] & 0x3F) << 12) | ((raw[i++] & 0x3F) << 6) | (raw[i++] & 0x3F);
      str += String.fromCodePoint(cp);
    }
  }
  return str;
}

// ---- 检测是否为 gzip 格式（magic bytes: 0x1F 0x8B）----------------------------

function isGzip(data) {
  return data[0] === 0x1F && data[1] === 0x8B;
}

// ---- 构建备份数据（v2.1+）--------------------------------------------------

function buildBackupData() {
  const users = getUsers();
  const records = getAllRecords();
  return JSON.stringify({
    version: EXPORT_VERSION,
    exportTime: new Date().toISOString(),
    users: users.map(u => ({
      id: u.id, username: u.username,
      passwordHash: u.passwordHash || '', salt: u.salt || ''
    })),
    records: records
  });
}

// ---- 处理导入数据（自动识别新旧格式）----------------------------------------

function processImportData(str) {
  let data;
  try {
    // 尝试旧格式：纯 JSON
    data = JSON.parse(str);
  } catch {
    // 尝试新格式：base64 → gzip → JSON
    try {
      const bytes = base64ToUint8(str);
      if (!bytes) throw new Error('invalid base64');
      if (!isGzip(bytes)) throw new Error('not gzip');
      const json = decompressData(bytes);
      data = JSON.parse(json);
    } catch (e2) {
      uni.showToast({ title: '无效的备份文件', icon: 'none' });
      return;
    }
  }

  if (!data.users || !Array.isArray(data.users)) {
    uni.showToast({ title: '无效的备份文件', icon: 'none' });
    return;
  }

  const importTime = data.exportTime ? new Date(data.exportTime).toLocaleString('zh-CN') : '未知';
  const isV2 = data.version && data.version.startsWith('2.');

  uni.showModal({
    title: '导入数据',
    content: '备份版本：' + (data.version || 'v1') + '\n备份时间：' + importTime + '\n包含 ' + data.users.length + ' 个用户\n\n导入将覆盖当前所有数据，确定继续？',
    success: function(res) {
      if (!res.confirm) return;

      let users, records;
      if (isV2 && Array.isArray(data.records)) {
        users = data.users;
        records = data.records;
      } else {
        const migrated = migrateV1(data.users);
        users = migrated.users;
        records = migrated.records;
      }

      if (!saveUsers(users)) {
        uni.showToast({ title: '用户数据写入失败', icon: 'none' });
        return;
      }
      if (!saveAllRecords(records)) {
        uni.showToast({ title: '记录数据写入失败', icon: 'none' });
        return;
      }
      uni.showToast({ title: '导入成功，请重新登录', icon: 'success', duration: 2000 });
      setTimeout(function() {
        try { uni.removeStorageSync('crab_current_user'); } catch {}
        uni.reLaunch({ url: '/pages/login/login' });
      }, 1500);
    }
  });
}

// ---- 迁移 v1 旧格式 → v2 --------------------------------------------------

function migrateV1(users) {
  const allRecords = [];
  const migratedUsers = users.map(u => {
    const records = (u.records || []).map(r => ({
      ...r,
      userId: u.id,
      amount: parseFloat(r.amount) || 0
    }));
    allRecords.push(...records);
    const migrated = {
      id: u.id,
      username: u.username,
    };
    if (u.passwordHash && u.salt) {
      migrated.passwordHash = u.passwordHash;
      migrated.salt = u.salt;
    } else if (u.password) {
      const { hash, salt } = hashPassword(u.password);
      migrated.passwordHash = hash;
      migrated.salt = salt;
    }
    return migrated;
  });
  return { users: migratedUsers, records: allRecords };
}

// ---- Base64 转 Java byte[]（App 端写入用）-----------------------------------

function base64ToJavaBytes(base64) {
  const binary = atob(base64);
  const ByteArrayOutputStream = plus.android.importClass('java.io.ByteArrayOutputStream');
  const baos = new ByteArrayOutputStream();
  for (let i = 0; i < binary.length; i++) {
    baos.write(binary.charCodeAt(i) & 0xFF);
  }
  baos.close();
  return baos.toByteArray();
}

// ---- APP 导出（弹出保存对话框，用户自选位置）------------------------------

function appExportAllData(base64Str, filename) {
  try {
    const javaBytes = base64ToJavaBytes(base64Str);
    const main = plus.android.runtimeMainActivity();
    const Intent = plus.android.importClass('android.content.Intent');
    const intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType('application/octet-stream');
    intent.putExtra(Intent.EXTRA_TITLE, filename);
    main.onActivityResult = function(requestCode, resultCode, data) {
      if (requestCode !== 30002) return;
      main.onActivityResult = null;
      if (resultCode !== main.RESULT_OK || !data) return;
      try {
        const resolver = main.getContentResolver();
        const pfd = plus.android.invoke(resolver, 'openFileDescriptor', data.getData(), 'w');
        const fd = plus.android.invoke(pfd, 'getFileDescriptor');
        const fos = new (plus.android.importClass('java.io.FileOutputStream'))(fd);
        plus.android.invoke(fos, 'write', javaBytes);
        plus.android.invoke(fos, 'close');
        plus.android.invoke(pfd, 'close');
        uni.showToast({ title: '导出成功', icon: 'success' });
      } catch (err) {
        console.error('[exportAllData] 写入失败:', err.message || err);
        uni.showToast({ title: '导出失败', icon: 'none' });
      }
    };
    main.startActivityForResult(intent, 30002);
  } catch (e) {
    console.error('[exportAllData] 导出异常:', e.message || e);
    uni.showToast({ title: '导出失败', icon: 'none' });
  }
}

// ---- APP 导入（系统文件选择器 → ContentResolver 读取）--------------------

function appImportData() {
  const main = plus.android.runtimeMainActivity();
  const Intent = plus.android.importClass('android.content.Intent');
  const intent = new Intent(Intent.ACTION_GET_CONTENT);
  intent.setType('*/*');
  intent.addCategory(Intent.CATEGORY_OPENABLE);
  main.onActivityResult = function(requestCode, resultCode, data) {
    if (requestCode !== 20001) return;
    main.onActivityResult = null;
    if (resultCode !== main.RESULT_OK || !data) return;
    try {
      const resolver = main.getContentResolver();
      const inputStream = plus.android.invoke(resolver, 'openInputStream', data.getData());
      const bytes = [];
      let b;
      while ((b = plus.android.invoke(inputStream, 'read')) !== -1) bytes.push(b);
      plus.android.invoke(inputStream, 'close');
      let str = '';
      let i = 0;
      while (i < bytes.length) {
        const c = bytes[i++];
        if (c < 0x80) str += String.fromCharCode(c);
        else if (c < 0xE0) str += String.fromCharCode(((c & 0x1F) << 6) | (bytes[i++] & 0x3F));
        else str += String.fromCharCode(((c & 0x0F) << 12) | ((bytes[i++] & 0x3F) << 6) | (bytes[i++] & 0x3F));
      }
      processImportData(str);
    } catch (err) {
      console.error('[importData] 读取异常:', err.message || err);
      uni.showToast({ title: '读取文件失败', icon: 'none' });
    }
  };
  main.startActivityForResult(intent, 20001);
}

// ---- H5 导出 / 导入 ------------------------------------------------------

function h5ExportAllData(base64Str, filename) {
  if (typeof document === 'undefined') return;
  try {
    const binary = atob(base64Str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    uni.showToast({ title: '导出成功', icon: 'success' });
  } catch (e) {
    console.error('[exportAllData] H5 导出失败:', e);
    uni.showToast({ title: '导出失败', icon: 'none' });
  }
}

function h5ImportData() {
  if (typeof document === 'undefined') return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.dat';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(re) { processImportData(re.target.result); };
    reader.readAsText(file, 'utf-8');
  };
  input.click();
}

// ---- 微信小程序导出 / 导入 ------------------------------------------------

function mpExportAllData(base64Str, filename) {
  try {
    const fs = uni.getFileSystemManager();
    const filePath = wx.env.USER_DATA_PATH + '/' + filename;
    fs.writeFile({
      filePath: filePath, data: base64Str, encoding: 'utf8',
      success: function() {
        wx.shareFileMessage({
          filePath: filePath, fileName: filename,
          success: function() { uni.showToast({ title: '请选择好友或"文件传输助手"发送', icon: 'none', duration: 2500 }); },
          fail: function() { uni.showToast({ title: '导出成功', icon: 'success' }); }
        });
      },
      fail: function(err) {
        console.error('[exportAllData] 小程序写入失败:', JSON.stringify(err));
        uni.showToast({ title: '导出失败', icon: 'none' });
      }
    });
  } catch (e) {
    console.error('[exportAllData] 小程序导出异常:', e);
    uni.showToast({ title: '导出失败', icon: 'none' });
  }
}

function mpImportData() {
  wx.chooseMessageFile({
    count: 1, type: 'file', extension: ['json'],
    success: function(res) {
      const fs = uni.getFileSystemManager();
      fs.readFile({
        filePath: res.tempFiles[0].path, encoding: 'utf8',
        success: function(r) { processImportData(r.data); },
        fail: function(err) {
          console.error('[importData] 小程序读取失败:', JSON.stringify(err));
          uni.showToast({ title: '读取文件失败', icon: 'none' });
        }
      });
    }, fail: function() {}
  });
}

// ---- 公共入口 ------------------------------------------------------------

export function exportAllData() {
  const records = getAllRecords();
  if (records.length === 0) {
    uni.showToast({ title: '暂无数据可以导出', icon: 'none' });
    return;
  }
  const json = buildBackupData();
  const compressed = compressData(json);
  const base64Str = uint8ToBase64(compressed);
  const dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
  const filename = '螃蟹记账_备份_' + dateStr + '.json';
  // #ifdef APP-PLUS
  appExportAllData(base64Str, filename);
  // #endif
  // #ifdef H5
  h5ExportAllData(base64Str, filename);
  // #endif
  // #ifdef MP-WEIXIN
  mpExportAllData(base64Str, filename);
  // #endif
}

export function importData() {
  // #ifdef APP-PLUS
  appImportData();
  // #endif
  // #ifdef H5
  h5ImportData();
  // #endif
  // #ifdef MP-WEIXIN
  mpImportData();
  // #endif
}
