/**
 * @file export.js - Excel/CSV导出工具模块
 * @description 提供记账记录的Excel和CSV格式导出功能，支持多平台
 * @author Crab Bookkeeping Team
 * @version 2.0 - 性能优化版
 */

import * as XLSX from 'xlsx';

// ---- 常量配置 --------------------------------------------------------------
const BATCH_SIZE = 2000;
const ASYNC_THRESHOLD = 3000; // 超过此数量启用异步分批处理

// ---- 日期格式化缓存 --------------------------------------------------------
const dateCache = new Map();

function formatDate(timestamp) {
  const cached = dateCache.get(timestamp);
  if (cached !== undefined) return cached;
  const formatted = new Date(timestamp).toLocaleString('zh-CN');
  dateCache.set(timestamp, formatted);
  return formatted;
}

// ---- 异步工具 --------------------------------------------------------------
function yieldToMain() {
  return new Promise(function(resolve) { setTimeout(resolve, 0); });
}

// ---- 构建 Sheet Data（数组预分配）------------------------------------------

function buildSheetDataSync(records, onProgress) {
  var len = records.length;
  var data = new Array(len);

  for (var i = 0; i < len; i++) {
    var record = records[i];
    data[i] = {
      '日期': formatDate(record.createTime),
      '类型': record.type === 'expense' ? '支出' : '收入',
      '分类': record.category,
      '金额': parseFloat(record.amount).toFixed(2),
      '备注': record.note || ''
    };

    if (onProgress && i % BATCH_SIZE === 0) {
      onProgress(i / len);
    }
  }

  return data;
}

async function buildSheetDataAsync(records, onProgress) {
  var len = records.length;
  var data = new Array(len);

  for (var i = 0; i < len; i++) {
    var record = records[i];
    data[i] = {
      '日期': formatDate(record.createTime),
      '类型': record.type === 'expense' ? '支出' : '收入',
      '分类': record.category,
      '金额': parseFloat(record.amount).toFixed(2),
      '备注': record.note || ''
    };

    if (i % BATCH_SIZE === 0 && i > 0) {
      if (onProgress) onProgress(i / len);
      await yieldToMain();
    }
  }

  return data;
}

function buildSheetData(records, onProgress) {
  if (records.length > ASYNC_THRESHOLD) {
    return buildSheetDataAsync(records, onProgress);
  }
  return Promise.resolve(buildSheetDataSync(records, onProgress));
}

// ---- 生成工作簿 ------------------------------------------------------------

function createWorksheet(data, onProgress) {
  var ws = XLSX.utils.json_to_sheet(data);
  // 设置列宽
  ws['!cols'] = [
    { wch: 22 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 20 }
  ];
  if (onProgress) onProgress(0.95);
  return ws;
}

async function generateWorkbookAsync(records, sheetName, onProgress) {
  var data = await buildSheetData(records, function(p) {
    if (onProgress) onProgress(p * 0.6);
  });
  var ws = createWorksheet(data, onProgress);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

// ---- APP 导出（弹出保存对话框，用户自选位置）------------------------------

function hideLoadingAndToast(title, icon) {
  uni.hideLoading();
  uni.showToast({ title: title, icon: icon });
}

function base64ToJavaBytes(base64) {
  var binary = atob(base64);
  var ByteArrayOutputStream = plus.android.importClass('java.io.ByteArrayOutputStream');
  var baos = new ByteArrayOutputStream();
  for (var i = 0; i < binary.length; i++) {
    baos.write(binary.charCodeAt(i) & 0xFF);
  }
  baos.close();
  return baos.toByteArray();
}

function openSaveDialog(dataBytes, mimeType, filename) {
  var main = plus.android.runtimeMainActivity();
  var Intent = plus.android.importClass('android.content.Intent');
  var intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
  intent.addCategory(Intent.CATEGORY_OPENABLE);
  intent.setType(mimeType);
  intent.putExtra(Intent.EXTRA_TITLE, filename);

  main.onActivityResult = function(requestCode, resultCode, data) {
    if (requestCode !== 30001) return;
    main.onActivityResult = null;
    if (resultCode !== main.RESULT_OK || !data) {
      uni.hideLoading();
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
      hideLoadingAndToast('导出成功', 'success');
    } catch (err) {
      console.error('[export] 写入失败:', err.message || err);
      hideLoadingAndToast('导出失败', 'none');
    }
  };

  main.startActivityForResult(intent, 30001);
}

function appExport(wb, filename) {
  try {
    // 禁用不必要的特性以提升性能
    var base64 = XLSX.write(wb, {
      type: 'base64',
      bookType: 'xlsx',
      bookSST: false,
      compression: false
    });
    var javaBytes = base64ToJavaBytes(base64);
    openSaveDialog(javaBytes,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename);
  } catch (e) {
    console.error('[exportToExcel] 导出异常:', e.message || e);
    hideLoadingAndToast('导出失败', 'none');
  }
}

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

function appExportCSV(csv, filename) {
  try {
    var javaBytes = textToJavaBytes(csv);
    openSaveDialog(javaBytes, 'text/csv', filename);
  } catch (e) {
    console.error('[exportToCSV] 导出异常:', e.message || e);
    hideLoadingAndToast('导出失败', 'none');
  }
}

// ---- H5 导出（浏览器 Blob 下载）-------------------------------------------

function h5Export(wb, filename) {
  if (typeof document === 'undefined') return;
  try {
    // 禁用不必要的特性以提升性能
    var array = XLSX.write(wb, {
      type: 'array',
      bookType: 'xlsx',
      bookSST: false,
      compression: false
    });
    var blob = new Blob([array], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    hideLoadingAndToast('导出成功', 'success');
  } catch (e) {
    console.error('[exportToExcel] H5 导出失败:', e);
    hideLoadingAndToast('导出失败', 'none');
  }
}

function h5ExportCSV(csv, filename) {
  if (typeof document === 'undefined') return;
  try {
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    hideLoadingAndToast('导出成功', 'success');
  } catch (e) {
    console.error('[exportToCSV] H5 导出失败:', e);
    hideLoadingAndToast('导出失败', 'none');
  }
}

// ---- 微信小程序导出 -------------------------------------------------------

function mpExport(wb, filename) {
  try {
    // 禁用不必要的特性以提升性能
    var base64 = XLSX.write(wb, {
      type: 'base64',
      bookType: 'xlsx',
      bookSST: false,
      compression: false
    });
    var fs = uni.getFileSystemManager();
    var filePath = wx.env.USER_DATA_PATH + '/' + filename;
    fs.writeFile({
      filePath: filePath,
      data: base64,
      encoding: 'base64',
      success: function() {
        hideLoadingAndToast('导出成功', 'success');
      },
      fail: function(err) {
        console.error('[exportToExcel] 小程序写入失败:', JSON.stringify(err));
        hideLoadingAndToast('导出失败', 'none');
      }
    });
  } catch (e) {
    console.error('[exportToExcel] 小程序导出异常:', e);
    hideLoadingAndToast('导出失败', 'none');
  }
}

function mpExportCSV(csv, filename) {
  try {
    var fs = uni.getFileSystemManager();
    var filePath = wx.env.USER_DATA_PATH + '/' + filename;
    fs.writeFile({
      filePath: filePath,
      data: csv,
      encoding: 'utf8',
      success: function() {
        hideLoadingAndToast('导出成功', 'success');
      },
      fail: function(err) {
        console.error('[exportToCSV] 小程序写入失败:', JSON.stringify(err));
        hideLoadingAndToast('导出失败', 'none');
      }
    });
  } catch (e) {
    console.error('[exportToCSV] 小程序导出异常:', e);
    hideLoadingAndToast('导出失败', 'none');
  }
}

// ---- 公共导出入口 ---------------------------------------------------------

export async function exportToExcel(records, options) {
  var opts = options || {};
  var onProgress = opts.onProgress || null;

  var total = records.length;
  uni.showLoading({ title: '正在导出 0%', mask: true });

  function updateProgress(ratio) {
    if (ratio < 1) {
      var pct = Math.round(ratio * 100);
      uni.showLoading({ title: '正在导出 ' + pct + '%', mask: true });
    }
    if (onProgress) onProgress(ratio);
  }

  var dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
  var filename = '记账记录_' + dateStr + '.xlsx';

  try {
    var wb = await generateWorkbookAsync(records, '记账记录', updateProgress);
  } catch (e) {
    console.error('[exportToExcel] 生成工作簿失败:', JSON.stringify(e));
    hideLoadingAndToast('导出失败', 'none');
    return;
  }

  updateProgress(0.98);

  // 使用 setTimeout 让出主线程后再执行文件写入
  await yieldToMain();

  // #ifdef APP-PLUS
  appExport(wb, filename);
  // #endif

  // #ifdef H5
  h5Export(wb, filename);
  // #endif

  // #ifdef MP-WEIXIN
  mpExport(wb, filename);
  // #endif
}

export async function exportToCSV(records, options) {
  var opts = options || {};
  var onProgress = opts.onProgress || null;

  var total = records.length;
  uni.showLoading({ title: '正在导出 0%', mask: true });

  function updateProgress(ratio) {
    if (ratio < 1) {
      var pct = Math.round(ratio * 100);
      uni.showLoading({ title: '正在导出 ' + pct + '%', mask: true });
    }
    if (onProgress) onProgress(ratio);
  }

  var dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
  var filename = '记账记录_' + dateStr + '.csv';

  // 使用数组 join 代替字符串拼接
  var BOM = '﻿';
  var header = '日期,类型,分类,金额,备注';
  var rows = new Array(total + 1);
  rows[0] = header;

  if (total > ASYNC_THRESHOLD) {
    // 异步分批构建 CSV 行
    for (var i = 0; i < total; i++) {
      var record = records[i];
      var date = formatDate(record.createTime);
      var type = record.type === 'expense' ? '支出' : '收入';
      var amount = parseFloat(record.amount).toFixed(2);
      var category = record.category;
      var note = record.note || '';

      rows[i + 1] = '"' + date + '","' + type + '","' + category + '","' + amount + '","' + note + '"';

      if (i % BATCH_SIZE === 0 && i > 0) {
        updateProgress(i / total);
        await yieldToMain();
      }
    }
  } else {
    // 小数据量同步构建
    for (var j = 0; j < total; j++) {
      var rec = records[j];
      var d = formatDate(rec.createTime);
      var t = rec.type === 'expense' ? '支出' : '收入';
      var amt = parseFloat(rec.amount).toFixed(2);
      var cat = rec.category;
      var n = rec.note || '';

      rows[j + 1] = '"' + d + '","' + t + '","' + cat + '","' + amt + '","' + n + '"';
    }
  }

  updateProgress(0.95);
  var csv = BOM + rows.join('\n');

  // 使用 setTimeout 让出主线程后再执行文件写入
  await yieldToMain();
  updateProgress(0.98);

  // #ifdef APP-PLUS
  appExportCSV(csv, filename);
  // #endif

  // #ifdef H5
  h5ExportCSV(csv, filename);
  // #endif

  // #ifdef MP-WEIXIN
  mpExportCSV(csv, filename);
  // #endif
}
