// Excel/CSV 导出导入工具模块 — 性能优化版 v2.2
import * as XLSX from 'xlsx';
import { getCurrentUser } from './storage/userStorage.js';
import { getAllRecords, saveAllRecordsBatched } from './storage/recordStorage.js';
import {
  utf8Decode, uint8ToJavaBytes, strToJavaBytes,
  appSaveFile, appOpenFile, h5SaveFile, h5OpenFile, mpSaveFile, mpOpenFile
} from './platform.js';

var _csvImportProgress = null;

// ---- 常量 ------------------------------------------------------------------
var BATCH_SIZE = 2000;        // 每批处理记录数
var ASYNC_THRESHOLD = 3000;   // 超过此数量启用异步分批
var PROGRESS_INTERVAL = 500;  // 少量数据时进度更新间隔

// ---- 快速日期格式化（比 toLocaleString 快 5-10x）----------------------------

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function formatDateTime(timestamp) {
  var d = new Date(timestamp);
  return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' +
    pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
}

// ---- 异步工具 --------------------------------------------------------------

function yieldToMain() {
  return new Promise(function(resolve) { setTimeout(resolve, 0); });
}

function toast(title, icon) {
  uni.hideLoading();
  uni.showToast({ title: title, icon: icon });
}

// ---- 构建 Sheet Data -------------------------------------------------------

function buildSheetData(records, onProgress) {
  var len = records.length;
  var data = new Array(len);
  var useAsync = len > ASYNC_THRESHOLD;

  function buildRow(record) {
    return {
      '日期': formatDateTime(record.createTime),
      '类型': record.type === 'expense' ? '支出' : '收入',
      '分类': record.category,
      '金额': parseFloat(record.amount).toFixed(2),
      '备注': record.note || ''
    };
  }

  // 通知进度：少量数据跳着报，大量数据每批报
  function notify(idx) {
    if (!onProgress) return;
    if (len <= BATCH_SIZE) {
      if (idx % PROGRESS_INTERVAL === 0 || idx >= len - 1) onProgress(idx / len);
    } else {
      if (idx % BATCH_SIZE === 0) onProgress(idx / len);
    }
  }

  if (useAsync) {
    return (function() {
      var i = 0;
      function next() {
        var batchEnd = Math.min(i + BATCH_SIZE, len);
        while (i < batchEnd) {
          data[i] = buildRow(records[i]);
          i++;
        }
        notify(i - 1);
        if (i < len) return yieldToMain().then(next);
        if (onProgress) onProgress(1);
        return Promise.resolve(data);
      }
      return next();
    })();
  }

  for (var i = 0; i < len; i++) {
    data[i] = buildRow(records[i]);
    notify(i);
  }
  if (onProgress) onProgress(1);
  return Promise.resolve(data);
}

// ---- 生成工作簿 ------------------------------------------------------------

function createWorksheet(data, onProgress) {
  var ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 20 }
  ];
  if (onProgress) onProgress(0.95);
  return ws;
}

function buildWorkbook(records, sheetName, onProgress) {
  // sheetData 占 90% 进度，worksheet 创建占剩余 10%
  return buildSheetData(records, function(p) {
    if (onProgress) onProgress(p * 0.9);
  }).then(function(data) {
    return createWorksheet(data, onProgress);
  }).then(function(ws) {
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return wb;
  });
}

// ---- APP 导出 --------------------------------------------------------------

function appExportXLSX(wb, filename) {
  try {
    var base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx', bookSST: false, compression: false });
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i) & 0xFF;
    var javaBytes = uint8ToJavaBytes(bytes);
    appSaveFile(javaBytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename)
      .then(function(ok) { toast(ok ? '导出成功' : '导出失败', ok ? 'success' : 'none'); });
  } catch (e) {
    console.error('[exportToExcel] error:', e.message || e);
    toast('导出失败', 'none');
  }
}

function appExportCSVFile(csv, filename) {
  try {
    var javaBytes = strToJavaBytes(csv);
    appSaveFile(javaBytes, 'text/csv', filename)
      .then(function(ok) { toast(ok ? '导出成功' : '导出失败', ok ? 'success' : 'none'); });
  } catch (e) {
    console.error('[exportToCSV] error:', e.message || e);
    toast('导出失败', 'none');
  }
}

// ---- H5 导出 ---------------------------------------------------------------

function h5ExportXLSX(wb, filename) {
  try {
    var array = XLSX.write(wb, { type: 'array', bookType: 'xlsx', bookSST: false, compression: false });
    var ok = h5SaveFile(array, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename);
    toast(ok ? '导出成功' : '导出失败', ok ? 'success' : 'none');
  } catch (e) {
    console.error('[exportToExcel] H5 error:', e);
    toast('导出失败', 'none');
  }
}

function h5ExportCSVFile(csv, filename) {
  try {
    var ok = h5SaveFile(csv, 'text/csv;charset=utf-8;', filename);
    toast(ok ? '导出成功' : '导出失败', ok ? 'success' : 'none');
  } catch (e) {
    console.error('[exportToCSV] H5 error:', e);
    toast('导出失败', 'none');
  }
}

// ---- 微信小程序导出 ---------------------------------------------------------

function mpExportXLSX(wb, filename) {
  try {
    var base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx', bookSST: false, compression: false });
    mpSaveFile(base64, 'base64', filename).then(function(filePath) {
      toast(filePath ? '导出成功' : '导出失败', filePath ? 'success' : 'none');
    });
  } catch (e) {
    console.error('[exportToExcel] mp error:', e);
    toast('导出失败', 'none');
  }
}

function mpExportCSVFile(csv, filename) {
  mpSaveFile(csv, 'utf8', filename).then(function(filePath) {
    toast(filePath ? '导出成功' : '导出失败', filePath ? 'success' : 'none');
  });
}

// ---- 公共导出入口 ----------------------------------------------------------

export function exportToExcel(records, options) {
  var opts = options || {};
  var onProgress = opts.onProgress || null;

  if (!onProgress) uni.showLoading({ title: '正在导出 0%', mask: true });

  function updateProgress(ratio) {
    if (onProgress) onProgress(ratio);
    else if (ratio < 1) uni.showLoading({ title: '正在导出 ' + Math.round(ratio * 100) + '%', mask: true });
  }

  var dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
  var filename = '记账记录_' + dateStr + '.xlsx';

  buildWorkbook(records, '记账记录', updateProgress).then(function(wb) {
    updateProgress(0.98);
    // 将 wb 传入下一阶段，嵌套调用避免变量丢失
    return yieldToMain().then(function() {
      // #ifdef APP-PLUS
      appExportXLSX(wb, filename);
      // #endif
      // #ifdef H5
      h5ExportXLSX(wb, filename);
      // #endif
      // #ifdef MP-WEIXIN
      mpExportXLSX(wb, filename);
      // #endif
    });
  }).catch(function(e) {
    console.error('[exportToExcel] error:', JSON.stringify(e));
    toast('导出失败', 'none');
  });
}

export function exportToCSV(records, options) {
  var opts = options || {};
  var onProgress = opts.onProgress || null;
  var total = records.length;

  if (!onProgress) uni.showLoading({ title: '正在导出 0%', mask: true });

  function updateProgress(ratio) {
    if (onProgress) onProgress(ratio);
    else if (ratio < 1) uni.showLoading({ title: '正在导出 ' + Math.round(ratio * 100) + '%', mask: true });
  }

  var dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
  var filename = '记账记录_' + dateStr + '.csv';
  var BOM = '﻿';

  function buildRow(record) {
    return '"' + formatDateTime(record.createTime) + '","' +
      (record.type === 'expense' ? '支出' : '收入') + '","' +
      record.category + '","' +
      parseFloat(record.amount).toFixed(2) + '","' +
      (record.note || '') + '"';
  }

  var rows = new Array(total + 1);
  rows[0] = '日期,类型,分类,金额,备注';

  function notify(idx) {
    if (total <= BATCH_SIZE) {
      if (idx % PROGRESS_INTERVAL === 0 || idx >= total - 1) updateProgress(idx / total * 0.95);
    } else {
      if (idx % BATCH_SIZE === 0) updateProgress(idx / total * 0.95);
    }
  }

  function doBuild() {
    if (total > ASYNC_THRESHOLD) {
      var i = 0;
      function next() {
        var batchEnd = Math.min(i + BATCH_SIZE, total);
        while (i < batchEnd) {
          rows[i + 1] = buildRow(records[i]);
          i++;
        }
        notify(i - 1);
        if (i < total) return yieldToMain().then(next);
        updateProgress(0.95);
        return Promise.resolve();
      }
      return next();
    }
    for (var j = 0; j < total; j++) {
      rows[j + 1] = buildRow(records[j]);
      notify(j);
    }
    updateProgress(0.95);
    return Promise.resolve();
  }

  doBuild().then(function() {
    var csv = BOM + rows.join('\n');
    return yieldToMain().then(function() {
      updateProgress(0.98);
      // #ifdef APP-PLUS
      appExportCSVFile(csv, filename);
      // #endif
      // #ifdef H5
      h5ExportCSVFile(csv, filename);
      // #endif
      // #ifdef MP-WEIXIN
      mpExportCSVFile(csv, filename);
      // #endif
    });
  });
}

// ---- CSV 导入 --------------------------------------------------------------

function parseCSVLine(line) {
  var result = [];
  var i = 0, field = '';
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      while (i < line.length && line[i] !== '"') field += line[i++];
      i++;
      result.push(field);
      field = '';
      if (i < line.length && line[i] === ',') i++;
    } else if (line[i] === ',') {
      result.push(field);
      field = '';
      i++;
    } else {
      field += line[i++];
    }
  }
  result.push(field);
  return result;
}

function parseCSVDate(str) {
  try {
    var parts = str.split(' ');
    var dateParts = parts[0].split('/');
    var timePart = parts[1] || '00:00:00';
    return dateParts[0] + '-' + pad2(parseInt(dateParts[1], 10)) + '-' + pad2(parseInt(dateParts[2], 10)) + 'T' + timePart + '+08:00';
  } catch (e) { return new Date().toISOString(); }
}

function csvProgress(v) {
  try { if (_csvImportProgress) _csvImportProgress(v); } catch (e) { console.error('[export] csv progress error:', e); }
}

function processCSVData(rows, userId) {
  var records = new Array(rows.length);
  for (var i = 0; i < rows.length; i++) {
    records[i] = {
      userId: userId,
      type: rows[i].type === '收入' ? 'income' : 'expense',
      amount: parseFloat(rows[i].amount) || 0,
      category: rows[i].category,
      note: rows[i].note || '',
      createTime: parseCSVDate(rows[i].date)
    };
  }
  return records;
}

function doImportCSV(csvText) {
  var user = getCurrentUser();
  if (!user) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    csvProgress(-1);
    _csvImportProgress = null;
    return;
  }

  csvProgress(0.3);

  var lines = csvText.replace(/\r/g, '').split('\n').filter(function(l) { return l.trim(); });
  if (lines.length < 2) {
    uni.showToast({ title: 'CSV 文件为空或格式错误', icon: 'none' });
    csvProgress(-1);
    _csvImportProgress = null;
    return;
  }

  csvProgress(0.4);

  var headerLine = lines[0].replace(/^﻿/, '');
  var headers = parseCSVLine(headerLine);
  if (headers.length < 4 || headers[0].indexOf('日期') < 0) {
    uni.showToast({ title: 'CSV 格式不匹配，请检查文件', icon: 'none' });
    csvProgress(-1);
    _csvImportProgress = null;
    return;
  }

  var rows = [];
  for (var i = 1; i < lines.length; i++) {
    var values = parseCSVLine(lines[i]);
    if (values.length < 4) continue;
    rows.push({ date: values[0] || '', type: values[1] || '', category: values[2] || '', amount: values[3] || '0', note: values[4] || '' });
  }

  if (rows.length === 0) {
    uni.showToast({ title: '没有可导入的记录', icon: 'none' });
    csvProgress(-1);
    _csvImportProgress = null;
    return;
  }

  csvProgress(0.55);

  var records = processCSVData(rows, user.id);
  var existing = getAllRecords();

  csvProgress(0.65);

  uni.showModal({
    title: '导入 CSV',
    content: '将导入 ' + rows.length + ' 条记录到当前用户\n\n导入将覆盖当前所有数据，确定继续？',
    success: function(res) {
      if (!res.confirm) { _csvImportProgress = null; return; }

      csvProgress(0.8);

      var otherRecords = existing.filter(function(r) { return r.userId !== user.id; });
      var allRecords = otherRecords.concat(records);

      saveAllRecordsBatched(allRecords, function(ratio) {
        csvProgress(0.8 + ratio * 0.2);
      }).then(function() {
        csvProgress(1);
        _csvImportProgress = null;
        uni.showToast({ title: '导入成功', icon: 'success', duration: 2000 });
      });
    }
  });
}

// ---- CSV 导入入口（平台适配）-----------------------------------------------

export function importCSV(onProgress) {
  _csvImportProgress = onProgress;
  if (_csvImportProgress) _csvImportProgress(0.15);

  // #ifdef APP-PLUS
  appOpenFile('text/csv').then(function(bytes) {
    if (!bytes) { csvProgress(-1); return; }
    doImportCSV(utf8Decode(bytes));
  });
  // #endif

  // #ifdef H5
  h5OpenFile('.csv').then(function(text) {
    if (text === null) { csvProgress(-1); return; }
    doImportCSV(text);
  });
  // #endif

  // #ifdef MP-WEIXIN
  mpOpenFile('csv').then(function(text) {
    if (text === null) { csvProgress(-1); return; }
    doImportCSV(text);
  });
  // #endif
}
