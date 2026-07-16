// 数据备份：导出/导入用户数据的 JSON 文件
import { getUsers, saveUsers } from './storage/userStorage.js';
import { getAllRecords, saveAllRecordsBatched } from './storage/recordStorage.js';
import { hashPassword } from './crypto/index.js';
import { gzip, ungzip } from 'pako';
import {
  utf8Encode, utf8Decode, uint8ToBase64, base64ToUint8, strToJavaBytes,
  appSaveFile, appOpenFile, h5SaveFile, h5OpenFile, mpSaveFile, mpOpenFile
} from './platform.js';

const EXPORT_VERSION = '2.1.0';

let _importProgress = null;

// ---- 检测 gzip 格式（magic bytes: 0x1F 0x8B）-------------------------------

function isGzip(data) {
  return data[0] === 0x1F && data[1] === 0x8B;
}

// ---- 压缩 / 解压 -----------------------------------------------------------

function compressData(json) {
  return gzip(utf8Encode(json), { level: 6 });
}

function decompressData(bytes) {
  return utf8Decode(ungzip(bytes));
}

// ---- 构建备份数据 -----------------------------------------------------------

function buildBackupData() {
  var users = getUsers();
  var records = getAllRecords();
  return JSON.stringify({
    version: EXPORT_VERSION,
    exportTime: new Date().toISOString(),
    users: users.map(function(u) { return {
      id: u.id, username: u.username,
      passwordHash: u.passwordHash || '', salt: u.salt || ''
    }; }),
    records: records
  });
}

// ---- 进度回调辅助 ----------------------------------------------------------

function callProgress(v) {
  try { if (_importProgress) _importProgress(v); } catch (e) { console.error('[backup] progress error:', e); }
}

// ---- 迁移 v1 旧格式 → v2 --------------------------------------------------

function migrateV1(users) {
  var allRecords = [];
  var migratedUsers = users.map(function(u) {
    var records = (u.records || []).map(function(r) { return {
      userId: u.id, type: r.type,
      amount: parseFloat(r.amount) || 0, category: r.category,
      note: r.note || '', createTime: r.createTime,
      id: r.id
    }; });
    allRecords.push.apply(allRecords, records);
    var migrated = { id: u.id, username: u.username };
    if (u.passwordHash && u.salt) {
      migrated.passwordHash = u.passwordHash;
      migrated.salt = u.salt;
    } else if (u.password) {
      var h = hashPassword(u.password);
      migrated.passwordHash = h.hash;
      migrated.salt = h.salt;
    }
    return migrated;
  });
  return { users: migratedUsers, records: allRecords };
}

// ---- 处理导入数据 ----------------------------------------------------------

function processImportData(str) {
  var data;
  try {
    data = JSON.parse(str);
  } catch {
    try {
      callProgress(0.3);
      var bytes = base64ToUint8(str);
      if (!bytes) throw new Error('invalid base64');
      if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
        throw new Error('检测到 ZIP/Excel 格式，请选择 JSON 备份文件');
      }
      if (!isGzip(bytes)) throw new Error('not gzip');
      data = JSON.parse(decompressData(bytes));
    } catch (e2) {
      console.error('[backup] parse error:', e2.message || e2);
      callProgress(-1);
      uni.showToast({ title: '无效的备份文件', icon: 'none' });
      _importProgress = null;
      return;
    }
  }

  if (!data.users || !Array.isArray(data.users)) {
    callProgress(-1);
    uni.showToast({ title: '无效的备份文件', icon: 'none' });
    _importProgress = null;
    return;
  }

  callProgress(0.5);

  var importTime = data.exportTime ? new Date(data.exportTime).toLocaleString('zh-CN') : '未知';
  var isV2 = data.version && data.version.startsWith('2.');

  uni.showModal({
    title: '导入数据',
    content: '备份版本：' + (data.version || 'v1') + '\n备份时间：' + importTime + '\n包含 ' + data.users.length + ' 个用户\n\n导入将覆盖当前所有数据，确定继续？',
    success: function(res) {
      if (!res.confirm) { _importProgress = null; return; }

      callProgress(0.7);

      var users, records;
      if (isV2 && Array.isArray(data.records)) {
        users = data.users;
        records = data.records;
      } else {
        var migrated = migrateV1(data.users);
        users = migrated.users;
        records = migrated.records;
      }

      callProgress(0.85);

      if (!saveUsers(users)) {
        callProgress(-1);
        uni.showToast({ title: '用户数据写入失败', icon: 'none' });
        _importProgress = null;
        return;
      }

      callProgress(0.88);

      saveAllRecordsBatched(records, function(ratio) {
        callProgress(0.88 + ratio * 0.12);
      }).then(function() {
        callProgress(1);
        _importProgress = null;
        uni.showToast({ title: '导入成功，请重新登录', icon: 'success', duration: 2000 });
        setTimeout(function() {
          try { uni.removeStorageSync('crab_current_user'); } catch {}
          uni.reLaunch({ url: '/pages/login/login' });
        }, 1500);
      });
    }
  });
}

// ---- 公共导出入口 ----------------------------------------------------------

export function exportAllData() {
  var records = getAllRecords();
  if (records.length === 0) {
    uni.showToast({ title: '暂无数据可以导出', icon: 'none' });
    return;
  }

  uni.showLoading({ title: '正在导出...', mask: true });

  // 延迟 100ms 确保 loading 指示器渲染完毕，再开始耗时的 JSON 序列化和 gzip 压缩
  setTimeout(function() {
    try {
      var json = buildBackupData();
      var compressed = compressData(json);
      var base64Str = uint8ToBase64(compressed);
      var dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
      var filename = '螃蟹记账_备份_' + dateStr + '.json';

      uni.hideLoading();

      // #ifdef APP-PLUS
      var javaBytes = strToJavaBytes(base64Str);
      appSaveFile(javaBytes, 'application/octet-stream', filename).then(function(ok) {
        uni.showToast({ title: ok ? '导出成功' : '导出失败', icon: ok ? 'success' : 'none' });
      });
      // #endif

      // #ifdef H5
      var ok = h5SaveFile(base64Str, 'application/json;charset=utf-8;', filename);
      uni.showToast({ title: ok ? '导出成功' : '导出失败', icon: ok ? 'success' : 'none' });
      // #endif

      // #ifdef MP-WEIXIN
      mpSaveFile(base64Str, 'utf8', filename).then(function(filePath) {
        if (filePath) {
          wx.shareFileMessage({
            filePath: filePath, fileName: filename,
            success: function() { uni.showToast({ title: '请选择好友或"文件传输助手"发送', icon: 'none', duration: 2500 }); },
            fail: function() { uni.showToast({ title: '导出成功', icon: 'success' }); }
          });
        } else {
          uni.showToast({ title: '导出失败', icon: 'none' });
        }
      });
      // #endif
    } catch (e) {
      uni.hideLoading();
      console.error('[exportAllData] error:', e.message || e);
      uni.showToast({ title: '导出失败', icon: 'none' });
    }
  }, 50);
}

// ---- 公共导入入口 ----------------------------------------------------------

export function importData(onProgress) {
  _importProgress = onProgress;
  if (_importProgress) _importProgress(0.15);

  // #ifdef APP-PLUS
  appOpenFile('*/*').then(function(bytes) {
    if (!bytes) { callProgress(-1); return; }
    processImportData(utf8Decode(bytes));
  });
  // #endif

  // #ifdef H5
  h5OpenFile('.json,.dat').then(function(text) {
    if (text === null) { callProgress(-1); return; }
    processImportData(text);
  });
  // #endif

  // #ifdef MP-WEIXIN
  mpOpenFile('json').then(function(text) {
    if (text === null) { callProgress(-1); return; }
    processImportData(text);
  });
  // #endif
}
