<template>
  <view class="echart-container" :style="containerStyle">
    <view :id="cid" ref="chartEl" :style="{ width: width + 'px', height: height + 'px' }"></view>
  </view>
</template>

<script>
import * as echarts from 'echarts';

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
      chart: null,
      _debounceTimer: null,
      _retries: 0
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
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
          if (this.chart) this.chart.setOption(this.options, true);
        }, 80);
      }
    }
  },
  mounted() {
    this.tryInit();
  },
  beforeDestroy() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  },
  methods: {
    tryInit() {
      const query = uni.createSelectorQuery().in(this);
      query.select('#' + this.cid).boundingClientRect().exec((res) => {
        const rect = res && res[0];
        if (rect && rect.width > 0 && rect.height > 0) {
          this.initChart();
        } else if (this._retries < 10) {
          this._retries++;
          setTimeout(() => this.tryInit(), 150);
        } else {
          this.initChart();
        }
      });
    },
    initChart() {
      try {
        const el = typeof document !== 'undefined' && document.getElementById(this.cid);
        if (el) {
          this.chart = echarts.init(el, this.theme);
          this.chart.setOption(this.options);
          return;
        }
      } catch {}
      this.initCanvas();
    },
    initCanvas() {
      uni.createSelectorQuery().in(this)
        .select('#' + this.cid)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) return;
          const canvas = res[0].node;
          if (!canvas.getContext) return;
          const ctx = canvas.getContext('2d');
          const dpr = uni.getSystemInfoSync().pixelRatio || 1;
          canvas.width = this.width * dpr;
          canvas.height = this.height * dpr;
          ctx.scale(dpr, dpr);
          this.chart = echarts.init(canvas, null, { width: this.width, height: this.height });
          this.chart.setOption(this.options);
        });
    }
  }
};
</script>
