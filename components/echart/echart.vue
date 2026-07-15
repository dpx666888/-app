<template>
  <view class="echart-container" :style="containerStyle">
    <view :id="cid"
      :prop-opts="chartData" :change:prop-opts="render.onOptionsChange"
      :style="{ width: width + 'px', height: height + 'px' }"></view>
  </view>
</template>

<script module="render" lang="renderjs">
import * as echarts from 'echarts';

let chart = null;
let ready = false;

function initChart(id, options) {
  try {
    const el = document.getElementById(id);
    if (!el) {
      console.error('[echart-render] 节点未找到:', id);
      return false;
    }
    chart = echarts.init(el);
    chart.setOption(options, true);
    console.log('[echart-render] 初始化成功');
    return true;
  } catch (e) {
    console.error('[echart-render] 初始化失败:', e);
    return false;
  }
}

export default {
  methods: {
    onOptionsChange(newVal, oldVal) {
      if (!newVal) return;
      if (!ready) {
        ready = initChart(newVal.id, newVal.options);
      } else if (chart && newVal.options) {
        chart.setOption(newVal.options, true);
        chart.resize();
      }
    }
  }
};
</script>

<script>
export default {
  props: {
    options: { type: Object, required: true },
    width: { type: Number, default: 375 },
    height: { type: Number, default: 300 },
    theme: { type: String, default: '' }
  },
  data() {
    return {
      cid: 'ec_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      _debounceTimer: null,
      chartData: null
    };
  },
  computed: {
    containerStyle() {
      return { width: this.width + 'px', height: this.height + 'px' };
    }
  },
  watch: {
    options: {
      deep: true,
      handler() {
        this.scheduleUpdate();
      }
    }
  },
  created() {
    this.chartData = { id: this.cid, options: this.options };
  },
  beforeDestroy() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
  },
  methods: {
    scheduleUpdate() {
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        // 更新 chartData 引用以触发 renderjs
        this.chartData = { id: this.cid, options: this.options };
      }, 80);
    }
  }
};
</script>
