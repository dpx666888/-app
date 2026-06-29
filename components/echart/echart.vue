<template>
  <view class="echart-container" :style="containerStyle">
    <view :id="cid" :style="{ width: width + 'px', height: height + 'px' }"></view>
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
      _debounceTimer: null
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
          this.$nextTick(() => {
            if (this.chart) this.chart.setOption(this.options, true);
          });
        }, 80);
      }
    }
  },
  mounted() {
    this.$nextTick(() => {
      const el = typeof document !== 'undefined' && document.getElementById(this.cid);
      if (el) {
        this.chart = echarts.init(el, this.theme);
        this.chart.setOption(this.options);
      } else {
        this.initCanvas();
      }
    });
  },
  beforeDestroy() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  },
  methods: {
    initCanvas() {
      uni.createSelectorQuery().in(this)
        .select('#' + this.cid)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0]) return;
          const canvas = res[0].node;
          if (!canvas || !canvas.getContext) return;
          const ctx = canvas.getContext('2d');
          const dpr = uni.getSystemInfoSync().pixelRatio;
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
