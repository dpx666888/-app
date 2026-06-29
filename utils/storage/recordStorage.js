const RECORD_KEY = 'crab_records';

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
  return getItem(RECORD_KEY) || [];
}

export function saveAllRecords(records) {
  return setItem(RECORD_KEY, records);
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
