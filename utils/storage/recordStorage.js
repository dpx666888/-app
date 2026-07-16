const RECORD_KEY = 'crab_records';
const BATCH_META_KEY = 'crab_records_batch_meta';
const BATCH_SIZE = 500;

function getItem(key) {
  try {
    const data = uni.getStorageSync(key);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

function setItem(key, val) {
  try { uni.setStorageSync(key, JSON.stringify(val)); return true; }
  catch { return false; }
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getAllRecords() {
  // 优先检查分块存储（批量导入写入的格式）
  const meta = getItem(BATCH_META_KEY);
  if (meta && meta.batches > 0) {
    let all = [];
    for (let i = 0; i < meta.batches; i++) {
      const batch = getItem(RECORD_KEY + '_batch_' + i);
      if (batch) all = all.concat(batch);
    }
    return all;
  }
  // 回退到单键存储（正常 CRUD 写入的格式）
  return getItem(RECORD_KEY) || [];
}

export function saveAllRecords(records) {
  // 清理残留的分块元数据
  try { uni.removeStorageSync(BATCH_META_KEY); } catch {}
  return setItem(RECORD_KEY, records);
}

// 批量异步保存：适用于大量数据导入，分批写入 + 进度回调 + 主线程让出
export function saveAllRecordsBatched(records, onProgress) {
  return new Promise(function(resolve) {
    var total = records.length;
    if (total <= BATCH_SIZE) {
      // 小数据量直接保存，不影响正常使用
      var ok = setItem(RECORD_KEY, records);
      try { uni.removeStorageSync(BATCH_META_KEY); } catch {}
      if (onProgress) onProgress(1);
      resolve(ok);
      return;
    }

    // 清理旧分块
    var oldMeta = getItem(BATCH_META_KEY);
    if (oldMeta && oldMeta.batches > 0) {
      for (var i = 0; i < oldMeta.batches; i++) {
        try { uni.removeStorageSync(RECORD_KEY + '_batch_' + i); } catch {}
      }
    }
    // 清理旧单键数据
    try { uni.removeStorageSync(RECORD_KEY); } catch {}

    var totalBatches = Math.ceil(total / BATCH_SIZE);
    var batchIndex = 0;

    function saveNextBatch() {
      var start = batchIndex * BATCH_SIZE;
      var end = Math.min(start + BATCH_SIZE, total);
      var batch = records.slice(start, end);
      setItem(RECORD_KEY + '_batch_' + batchIndex, batch);

      batchIndex++;
      if (onProgress) onProgress(batchIndex / totalBatches);

      if (batchIndex < totalBatches) {
        // 让出主线程，使 UI 进度条更新
        setTimeout(saveNextBatch, 0);
      } else {
        setItem(BATCH_META_KEY, { batches: totalBatches, total: total });
        resolve(true);
      }
    }

    saveNextBatch();
  });
}

export function getRecordsByUser(userId) {
  return getAllRecords().filter(r => r.userId === userId);
}

export function addRecord(record) {
  const records = getAllRecords();
  const newRecord = {
    ...record,
    id: genId(),
    createTime: new Date().toISOString(),
    amount: parseFloat(record.amount) || 0
  };
  records.push(newRecord);
  return setItem(RECORD_KEY, records) ? newRecord : null;
}

export function updateRecord(recordId, updates) {
  const records = getAllRecords();
  const idx = records.findIndex(r => r.id === recordId);
  if (idx === -1) return false;
  records[idx] = { ...records[idx], ...updates, id: recordId };
  return setItem(RECORD_KEY, records);
}

export function deleteRecord(recordId) {
  const records = getAllRecords();
  const filtered = records.filter(r => r.id !== recordId);
  if (filtered.length === records.length) return false;
  return setItem(RECORD_KEY, filtered);
}

export function deleteRecordsByUser(userId) {
  const records = getAllRecords();
  return setItem(RECORD_KEY, records.filter(r => r.userId !== userId));
}
