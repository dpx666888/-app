// 数据备份：导出/导入用户数据的 JSON 文件
import { getUsers, saveUsers } from './storage.js';

// ---- 构建备份数据 --------------------------------------------------------

function buildBackupData() {
  var users = getUsers();
  return JSON.stringify({
    version: '1.0.0',
    exportTime: new Date().toISOString(),
    users: users
  }, null, 2);
}

// ---- APP 导出（弹出保存对话框，用户自选位置）------------------------------

function textToJavaBytes(str) {
  var ByteArrayOutputStream = plus.android.importClass('java.io.ByteArrayOutputStream');
  var baos = new ByteArrayOutputStream();
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c < 0x80) {
      baos.write(c);
    } else if (c < 0x800) {
      baos.write(0xC0 | (c >> 6));
      baos.write(0x80 | (c & 0x3F));
    } else {
      baos.write(0xE0 | (c >> 12));
      baos.write(0x80 | ((c >> 6) & 0x3F));
      baos.write(0x80 | (c & 0x3F));
    }
  }
  baos.close();
  return baos.toByteArray();
}

function appExportAllData(json, filename) {
  try {
    var javaBytes = textToJavaBytes(json);

    var main = plus.android.runtimeMainActivity();
    var Intent = plus.android.importClass('android.content.Intent');
    var intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType('application/json');
    intent.putExtra(Intent.EXTRA_TITLE, filename);

    main.onActivityResult = function(requestCode, resultCode, data) {
      if (requestCode !== 30002) return;
      main.onActivityResult = null;
      if (resultCode !== main.RESULT_OK || !data) return;

      try {
        var resolver = main.getContentResolver();
        var pfd = plus.android.invoke(resolver, 'openFileDescriptor', data.getData(), 'w');
        var fd = plus.android.invoke(pfd, 'getFileDescriptor');
        var fos = new (plus.android.importClass('java.io.FileOutputStream'))(fd);
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
  var main = plus.android.runtimeMainActivity();
  var Intent = plus.android.importClass('android.content.Intent');
  var intent = new Intent(Intent.ACTION_GET_CONTENT);
  intent.setType('application/json');
  intent.addCategory(Intent.CATEGORY_OPENABLE);

  main.onActivityResult = function(requestCode, resultCode, data) {
    if (requestCode !== 20001) return;
    main.onActivityResult = null;
    if (resultCode !== main.RESULT_OK || !data) return;

    try {
      var resolver = main.getContentResolver();
      var inputStream = plus.android.invoke(resolver, 'openInputStream', data.getData());

      // 逐字节读取到 JS 数组
      var bytes = [];
      var b;
      while ((b = plus.android.invoke(inputStream, 'read')) !== -1) {
        bytes.push(b);
      }
      plus.android.invoke(inputStream, 'close');

      // UTF-8 解码为 JS 字符串
      var str = '';
      var i = 0;
      while (i < bytes.length) {
        var c = bytes[i++];
        if (c < 0x80) {
          str += String.fromCharCode(c);
        } else if (c < 0xE0) {
          str += String.fromCharCode(((c & 0x1F) << 6) | (bytes[i++] & 0x3F));
        } else {
          str += String.fromCharCode(((c & 0x0F) << 12) | ((bytes[i++] & 0x3F) << 6) | (bytes[i++] & 0x3F));
        }
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

function h5ExportAllData(json, filename) {
  if (typeof document === 'undefined') return;
  try {
    var blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
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
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(re) {
      processImportData(re.target.result);
    };
    reader.readAsText(file, 'utf-8');
  };
  input.click();
}

// ---- 微信小程序导出 / 导入 ------------------------------------------------

function mpExportAllData(json, filename) {
  try {
    var fs = uni.getFileSystemManager();
    var filePath = wx.env.USER_DATA_PATH + '/' + filename;
    fs.writeFile({
      filePath: filePath,
      data: json,
      encoding: 'utf8',
      success: function() {
        wx.shareFileMessage({
          filePath: filePath,
          fileName: filename,
          success: function() {
            uni.showToast({ title: '请选择好友或"文件传输助手"发送', icon: 'none', duration: 2500 });
          },
          fail: function() {
            uni.showToast({ title: '导出成功', icon: 'success' });
          }
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
    count: 1,
    type: 'file',
    extension: ['json'],
    success: function(res) {
      var fs = uni.getFileSystemManager();
      fs.readFile({
        filePath: res.tempFiles[0].path,
        encoding: 'utf8',
        success: function(r) {
          processImportData(r.data);
        },
        fail: function(err) {
          console.error('[importData] 小程序读取失败:', JSON.stringify(err));
          uni.showToast({ title: '读取文件失败', icon: 'none' });
        }
      });
    },
    fail: function() {}
  });
}

// ---- 公共入口 ------------------------------------------------------------

export function exportAllData() {
  var users = getUsers();
  var hasData = users.some(function(u) { return u.records && u.records.length > 0; });
  if (!hasData) {
    uni.showToast({ title: '暂无数据可以导出', icon: 'none' });
    return;
  }

  var json = buildBackupData();
  var dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
  var filename = '螃蟹记账_备份_' + dateStr + '.json';

  // #ifdef APP-PLUS
  appExportAllData(json, filename);
  // #endif

  // #ifdef H5
  h5ExportAllData(json, filename);
  // #endif

  // #ifdef MP-WEIXIN
  mpExportAllData(json, filename);
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

// ---- 解析并导入备份数据 --------------------------------------------------

function processImportData(jsonStr) {
  try {
    var data = JSON.parse(jsonStr);
    if (!data.users || !Array.isArray(data.users)) {
      uni.showToast({ title: '无效的备份文件', icon: 'none' });
      return;
    }

    var importTime = data.exportTime ? new Date(data.exportTime).toLocaleString('zh-CN') : '未知';

    uni.showModal({
      title: '导入数据',
      content: '备份时间：' + importTime + '\n包含 ' + data.users.length + ' 个用户\n\n导入将覆盖当前所有数据，确定继续？',
      success: function(res) {
        if (res.confirm) {
          saveUsers(data.users);
          uni.showToast({ title: '导入成功，请重新登录', icon: 'success', duration: 2000 });
          setTimeout(function() {
            uni.reLaunch({ url: '/pages/login/login' });
          }, 1500);
        }
      }
    });
  } catch (e) {
    console.error('[processImportData] 解析失败:', e);
    uni.showToast({ title: '文件格式错误', icon: 'none' });
  }
}
