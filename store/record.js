import { defineStore } from 'pinia';
import * as recordService from '../domain/recordService.js';

export const useRecordStore = defineStore('record', {
  state: () => ({
    records: []
  }),

  getters: {
    monthlyRecords: (state) => (month) =>
      state.records.filter(r => r && r.createTime && r.createTime.substring(0, 7) === month),
    recordsByDate: (state) => (dateStr) =>
      state.records.filter(r => r && r.createTime && r.createTime.substring(0, 10) === dateStr),
    monthlyExpense: (state) => (month) =>
      state.records
        .filter(r => r.type === 'expense' && r.createTime?.substring(0, 7) === month)
        .reduce((s, r) => s + parseFloat(r.amount), 0),
    monthlyIncome: (state) => (month) =>
      state.records
        .filter(r => r.type === 'income' && r.createTime?.substring(0, 7) === month)
        .reduce((s, r) => s + parseFloat(r.amount), 0)
  },

  actions: {
    fetch() {
      const result = recordService.getList();
      this.records = result.data || [];
    },
    add({ type, amount, category, note }) {
      const result = recordService.create({ type, amount, category, note });
      if (result.success) this.fetch();
      return result;
    },
    update(recordId, updates) {
      const result = recordService.update(recordId, updates);
      if (result.success) this.fetch();
      return result;
    },
    remove(recordId) {
      const result = recordService.remove(recordId);
      if (result.success) this.fetch();
      return result;
    },
    clearAll() {
      const result = recordService.clearAll();
      if (result.success) this.records = [];
      return result;
    }
  }
});
