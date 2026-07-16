// 跨平台工具模块 — UTF-8、Base64、文件保存/打开
// 消除 backup.js 和 export.js 之间的重复代码

// ---- UTF-8 编解码 ----------------------------------------------------------

export function utf8Encode(str) {
  var buf = [];
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c < 0x80) {
      buf.push(c);
    } else if (c < 0x800) {
      buf.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
    } else if (c < 0xD800 || c >= 0xE000) {
      buf.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    } else {
      i++;
      c = 0x10000 + ((c & 0x3FF) << 10) | (str.charCodeAt(i) & 0x3FF);
      buf.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 0x3F), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    }
  }
  return new Uint8Array(buf);
}

export function utf8Decode(raw) {
  var str = '', i = 0;
  while (i < raw.length) {
    var c = raw[i++];
    if (c < 0x80) {
      str += String.fromCharCode(c);
    } else if (c < 0xE0) {
      str += String.fromCharCode(((c & 0x1F) << 6) | (raw[i++] & 0x3F));
    } else if (c < 0xF0) {
      str += String.fromCharCode(((c & 0x0F) << 12) | ((raw[i++] & 0x3F) << 6) | (raw[i++] & 0x3F));
    } else {
      var cp = ((c & 0x07) << 18) | ((raw[i++] & 0x3F) << 12) | ((raw[i++] & 0x3F) << 6) | (raw[i++] & 0x3F);
      str += String.fromCodePoint(cp);
    }
  }
  return str;
}

// ---- Base64 编解码 ---------------------------------------------------------

export function uint8ToBase64(bytes) {
  // 分块构建避免 O(n²) 字符串拼接，每块 ~8KB
  var CHUNK = 8192;
  var chunks = [];
  for (var i = 0; i < bytes.length; i += CHUNK) {
    var end = Math.min(i + CHUNK, bytes.length);
    var chunk = '';
    for (var j = i; j < end; j++) chunk += String.fromCharCode(bytes[j]);
    chunks.push(chunk);
  }
  var binary = chunks.join('');
  try { return btoa(binary); } catch { return binary; }
}

export function base64ToUint8(str) {
  try { str = atob(str); } catch { return null; }
  var bytes = new Uint8Array(str.length);
  for (var i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

// ---- Java 字节数组转换（APP 端专用）-----------------------------------------

export function uint8ToJavaBytes(bytes) {
  var ByteArrayOutputStream = plus.android.importClass('java.io.ByteArrayOutputStream');
  var baos = new ByteArrayOutputStream();
  for (var i = 0; i < bytes.length; i++) baos.write(bytes[i] & 0xFF);
  baos.close();
  return baos.toByteArray();
}

export function strToJavaBytes(str) {
  return uint8ToJavaBytes(utf8Encode(str));
}

// ---- 文件保存对话框（APP 端 SAF）--------------------------------------------

var _saveResolve = null;

export function appSaveFile(dataBytes, mimeType, filename) {
  return new Promise(function(resolve) {
    _saveResolve = resolve;
    var main = plus.android.runtimeMainActivity();
    var Intent = plus.android.importClass('android.content.Intent');
    var intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType(mimeType);
    intent.putExtra(Intent.EXTRA_TITLE, filename);

    main.onActivityResult = function(requestCode, resultCode, data) {
      if (requestCode !== 30010) return;
      main.onActivityResult = null;
      if (resultCode !== main.RESULT_OK || !data) {
        resolve(false);
        return;
      }
      try {
        var resolver = main.getContentResolver();
        var pfd = plus.android.invoke(resolver, 'openFileDescriptor', data.getData(), 'w');
        var fd = plus.android.invoke(pfd, 'getFileDescriptor');
        var fos = new (plus.android.importClass('java.io.FileOutputStream'))(fd);
        plus.android.invoke(fos, 'write', dataBytes);
        plus.android.invoke(fos, 'close');
        plus.android.invoke(pfd, 'close');
        resolve(true);
      } catch (err) {
        console.error('[platform] save error:', err.message || err);
        resolve(false);
      }
    };
    main.startActivityForResult(intent, 30010);
  });
}

// ---- 文件打开对话框（APP 端 SAF）--------------------------------------------

var _openResolve = null;

export function appOpenFile(mimeType) {
  return new Promise(function(resolve) {
    _openResolve = resolve;
    var main = plus.android.runtimeMainActivity();
    var Intent = plus.android.importClass('android.content.Intent');
    var intent = new Intent(Intent.ACTION_GET_CONTENT);
    intent.setType(mimeType);
    intent.addCategory(Intent.CATEGORY_OPENABLE);

    main.onActivityResult = function(requestCode, resultCode, data) {
      if (requestCode !== 30011) return;
      main.onActivityResult = null;
      if (resultCode !== main.RESULT_OK || !data) {
        resolve(null);
        return;
      }
      try {
        var resolver = main.getContentResolver();
        var inputStream = plus.android.invoke(resolver, 'openInputStream', data.getData());
        var bytes = [];
        var b;
        while ((b = plus.android.invoke(inputStream, 'read')) !== -1) bytes.push(b);
        plus.android.invoke(inputStream, 'close');
        resolve(new Uint8Array(bytes));
      } catch (err) {
        console.error('[platform] open error:', err.message || err);
        resolve(null);
      }
    };
    main.startActivityForResult(intent, 30011);
  });
}

// ---- H5 文件保存（Blob 下载）------------------------------------------------

export function h5SaveFile(data, mimeType, filename) {
  if (typeof document === 'undefined') return false;
  try {
    var blob = new Blob([data], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.error('[platform] h5 save error:', e);
    return false;
  }
}

export function h5OpenFile(accept) {
  return new Promise(function(resolve) {
    if (typeof document === 'undefined') { resolve(null); return; }
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) { resolve(null); return; }
      var reader = new FileReader();
      reader.onload = function(re) { resolve(re.target.result); };
      reader.onerror = function() { resolve(null); };
      reader.readAsText(file, 'utf-8');
    };
    input.oncancel = function() { resolve(null); };
    input.click();
  });
}

// ---- 微信小程序文件保存/打开 ------------------------------------------------

export function mpSaveFile(data, encoding, filename) {
  return new Promise(function(resolve) {
    var fs = uni.getFileSystemManager();
    var filePath = wx.env.USER_DATA_PATH + '/' + filename;
    fs.writeFile({
      filePath: filePath, data: data, encoding: encoding,
      success: function() { resolve(filePath); },
      fail: function(err) {
        console.error('[platform] mp save error:', JSON.stringify(err));
        resolve(null);
      }
    });
  });
}

export function mpOpenFile(extension) {
  return new Promise(function(resolve) {
    wx.chooseMessageFile({
      count: 1, type: 'file', extension: [extension],
      success: function(res) {
        var fs = uni.getFileSystemManager();
        fs.readFile({
          filePath: res.tempFiles[0].path, encoding: 'utf8',
          success: function(r) { resolve(r.data); },
          fail: function(err) {
            console.error('[platform] mp open error:', JSON.stringify(err));
            resolve(null);
          }
        });
      },
      fail: function() { resolve(null); }
    });
  });
}
