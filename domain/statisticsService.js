import { formatDate } from '../utils/date.js';

// ========== 统计业务服务 ==========
// 职责：时间筛选、数据聚合、图表数据转换
// 下层：utils/date（日期格式化）
// 上层：report.vue / store

// ---------- 时间筛选 ----------

export function getAvailableMonths(records) {
  const months = [...new Set(
    records.filter(r => r && r.createTime).map(r => r.createTime.substring(0, 7))
  )].sort().reverse();
  if (months.length === 0) {
    const now = new Date();
    months.push(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export function monthLabel(yearMonth) {
  const [y, m] = yearMonth.split('-');
  return `${y}年${parseInt(m)}月`;
}

export function getWeekRange(yearMonth, weekOffset) {
  let ref;
  if (yearMonth) {
    const [y, m] = yearMonth.split('-');
    ref = new Date(+y, +m - 1, 1);
  } else {
    ref = new Date();
  }
  const dayOfWeek = ref.getDay() || 7;
  const start = new Date(ref);
  start.setDate(ref.getDate() + weekOffset * 7 - dayOfWeek + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export function weekLabel(yearMonth, weekOffset) {
  const { start } = getWeekRange(yearMonth, weekOffset);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
  const tag = weekOffset === 0 ? '本周 ' : weekOffset === -1 ? '上周 ' : '';
  return tag + fmt(start) + ' - ' + fmt(end);
}

export function filterByMonth(records, yearMonth) {
  return records.filter(r => r && r.createTime && r.createTime.substring(0, 7) === yearMonth);
}

export function filterByWeek(records, yearMonth, weekOffset) {
  const { start, end } = getWeekRange(yearMonth, weekOffset);
  return records.filter(r => {
    if (!r || !r.createTime) return false;
    const d = new Date(r.createTime);
    return d >= start && d < end;
  });
}

export function filterRecords(records, viewMode, yearMonth, weekOffset) {
  if (viewMode === 'week') return filterByWeek(records, yearMonth, weekOffset);
  return filterByMonth(records, yearMonth);
}

// ---------- 数据聚合 ----------

export function calcCategoryStats(records, type) {
  const stats = {};
  records.filter(r => r.type === type).forEach(r => {
    stats[r.category] = (stats[r.category] || 0) + parseFloat(r.amount);
  });
  return stats;
}

export function calcChartData(records, type) {
  const stats = calcCategoryStats(records, type);
  const total = Object.values(stats).reduce((s, v) => s + v, 0);
  return Object.keys(stats)
    .map(name => ({ name, amount: stats[name], percent: total > 0 ? Number(((stats[name] / total) * 100).toFixed(1)) : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

export function calcMonthlySummary(records) {
  return {
    expense: records.filter(r => r.type === 'expense').reduce((s, r) => s + parseFloat(r.amount), 0),
    income: records.filter(r => r.type === 'income').reduce((s, r) => s + parseFloat(r.amount), 0)
  };
}

export function calcDailyStats(records) {
  const map = {};
  records.forEach(r => {
    if (!r || !r.createTime) return;
    const day = r.createTime.substring(8, 10);
    if (!map[day]) map[day] = { income: 0, expense: 0 };
    map[day][r.type] = (map[day][r.type] || 0) + parseFloat(r.amount);
  });
  return map;
}

// ---------- 图表 options 构建 ----------

export function buildPieOptions(chartData) {
  const data = chartData.map(item => ({ name: item.name, value: item.amount }));
  return {
    tooltip: { trigger: 'item', formatter(p) { return p.name + ': ¥' + p.value.toFixed(2) + ' (' + p.percent + '%)'; } },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 12 } },
    series: [{
      type: 'pie', radius: ['35%', '60%'], center: ['35%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: data.length > 0 ? data : [{ name: '无数据', value: 1, itemStyle: { color: '#eee' } }]
    }]
  };
}

export function buildBarOptions(dailyStats) {
  const days = Object.keys(dailyStats).sort((a, b) => +a - +b);
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['收入', '支出'], bottom: 0, textStyle: { fontSize: 12 } },
    grid: { left: 10, right: 20, top: 10, bottom: 36 },
    xAxis: { type: 'category', data: days.map(d => d + '日'), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
    series: [
      { name: '收入', type: 'bar', data: days.map(d => dailyStats[d].income || 0), itemStyle: { color: '#2ed573', borderRadius: [4, 4, 0, 0] } },
      { name: '支出', type: 'bar', data: days.map(d => dailyStats[d].expense || 0), itemStyle: { color: '#ff4757', borderRadius: [4, 4, 0, 0] } }
    ]
  };
}

export function buildLineOptions(dailyStats) {
  const days = Object.keys(dailyStats).sort((a, b) => +a - +b);
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出'], bottom: 0, textStyle: { fontSize: 12 } },
    grid: { left: 10, right: 20, top: 10, bottom: 36 },
    xAxis: { type: 'category', data: days.map(d => d + '日'), boundaryGap: false, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
    series: [
      { name: '收入', type: 'line', data: days.map(d => dailyStats[d].income || 0), smooth: true, symbol: 'circle', symbolSize: 4,
        itemStyle: { color: '#2ed573' }, lineStyle: { color: '#2ed573', width: 2 } },
      { name: '支出', type: 'line', data: days.map(d => dailyStats[d].expense || 0), smooth: true, symbol: 'circle', symbolSize: 4,
        itemStyle: { color: '#ff4757' }, lineStyle: { color: '#ff4757', width: 2 } }
    ]
  };
}
