/* 全站唯一图表实现：ECharts 封装
 * 统一主题（深色科技蓝）、统一调色板、统一坐标轴样式、统一自适应逻辑。
 * 任何页面需要图表都必须使用本组件的默认导出或此文件导出的 option 构造器，
 * 不得再引入其它图表库或手绘 SVG/CSS 图表。
 */
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { PieChart, BarChart, LineChart, GaugeChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent, TooltipComponent, LegendComponent, TitleComponent, GraphicComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  PieChart, BarChart, LineChart, GaugeChart, ScatterChart,
  GridComponent, TooltipComponent, LegendComponent, TitleComponent, GraphicComponent,
  CanvasRenderer
]);

/* 与 tokens.css 同源的调色板（禁止紫色系） */
export const COLORS = ['#49c3ff', '#35d39a', '#ff8a3d', '#ffcc44', '#5ee0d0', '#ff5f57', '#7fa6cc', '#2ea8ff'];

export const TEXT = '#cfe4ff';
export const TEXT_DIM = '#7fa6cc';
export const LINE = 'rgba(64,158,255,0.22)';

const TOOLTIP = {
  backgroundColor: 'rgba(6,22,44,0.94)',
  borderColor: 'rgba(64,158,255,0.45)',
  borderWidth: 1,
  padding: [6, 9],
  textStyle: { color: TEXT, fontSize: 12 },
  // 关键修复：把浮层挂到 body 并限制在可视区内。
  // 否则 .panel-body / .card 的 overflow 会把 tooltip 裁掉，
  // 表现为「浮层超出容器、被切一半」。
  appendTo: 'body',
  confine: true,
  transitionDuration: 0.15,
  extraCssText: 'border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.45);'
    + 'max-width:260px;white-space:normal;pointer-events:none;z-index:3000;'
};

const fmt = (v, d = 0) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return v ?? '—';
  return n.toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
};

/* ---------------------------------------------------------------- 环形图 */
export function donutOption(parts = [], opts = {}) {
  const {
    center, unit, decimals, legend = false, showLabel = false, radius = ['58%', '82%'], suffix
  } = opts;
  const data = parts.map((p, i) => ({
    name: p.name,
    value: Number(p.value || 0),
    itemStyle: { color: p.color || COLORS[i % COLORS.length] }
  }));
  const total = data.reduce((s, d) => s + d.value, 0);
  return {
    animationDuration: 700,
    color: COLORS,
    tooltip: {
      ...TOOLTIP,
      trigger: 'item',
      formatter: (p) => `${p.marker}${p.name}<br/><b style="font-size:14px">${fmt(p.value, decimals ?? (unit === '亿元' ? 2 : 0))}</b> ${unit || ''} · ${p.percent}%`
    },
    legend: legend ? {
      type: 'scroll', orient: 'vertical', right: 0, top: 'center', itemWidth: 8, itemHeight: 8,
      icon: 'roundRect', itemGap: 9, textStyle: { color: TEXT_DIM, fontSize: 11 }
    } : { show: false },
    title: {
      text: center !== undefined ? fmt(center, decimals ?? (unit === '亿元' ? 2 : 0)) : fmt(total, decimals ?? 0),
      subtext: unit || '',
      left: legend ? '34%' : 'center',
      top: 'center',
      textAlign: 'center',
      textStyle: { color: '#e8f4ff', fontSize: 19, fontWeight: 700, lineHeight: 24 },
      subtextStyle: { color: TEXT_DIM, fontSize: 11 },
      itemGap: 2
    },
    series: [{
      type: 'pie',
      radius,
      center: legend ? ['34%', '50%'] : ['50%', '50%'],
      avoidLabelOverlap: false,
      padAngle: 1.2,
      itemStyle: { borderColor: 'rgba(6,22,44,0.6)', borderWidth: 1, borderRadius: 2 },
      label: showLabel ? {
        show: true, color: TEXT_DIM, fontSize: 11,
        formatter: (p) => `${p.name}\n${(p.percent || 0).toFixed(0)}%`
      } : { show: false },
      labelLine: { show: !!showLabel, length: 8, length2: 6, lineStyle: { color: LINE } },
      emphasis: { scale: true, scaleSize: 4, itemStyle: { shadowBlur: 14, shadowColor: 'rgba(73,195,255,.45)' } },
      data
    }],
    graphic: suffix ? [{
      type: 'text', right: 4, top: 4, style: { text: suffix, fill: TEXT_DIM, fontSize: 10 }
    }] : []
  };
}

/* ---------------------------------------------------------------- 条形图（横向） */
export function barOption(rows = [], opts = {}) {
  const { unit = '', decimals, maxWidth = '96%', colorBy = false, showValue = true } = opts;
  const names = rows.map((r) => r.name);
  const values = rows.map((r) => Number(r.value || 0));
  return {
    animationDuration: 700,
    color: COLORS,
    grid: { left: 4, right: showValue ? 46 : 10, top: 6, bottom: 2, containLabel: true },
    tooltip: {
      ...TOOLTIP, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(73,195,255,0.08)' } },
      formatter: (ps) => `${ps[0].name}<br/><b style="font-size:14px">${fmt(ps[0].value, decimals ?? 0)}</b> ${unit}`
    },
    xAxis: { type: 'value', show: false, max: (v) => v.max * 1.02 },
    yAxis: {
      type: 'category', data: names, inverse: true,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: TEXT_DIM, fontSize: 11, width: 96, overflow: 'truncate' }
    },
    series: [{
      type: 'bar',
      barWidth: Math.min(12, Math.max(7, 90 / Math.max(1, rows.length))),
      itemStyle: {
        borderRadius: [0, 6, 6, 0],
        color: (p) => {
          const c = COLORS[(colorBy ? p.dataIndex : 0) % COLORS.length];
          return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: `${c}33` }, { offset: 1, color: c }
          ]);
        }
      },
      label: {
        show: showValue, position: 'right', color: TEXT, fontSize: 11,
        formatter: (p) => fmt(p.value, decimals ?? 0)
      },
      data: values
    }]
  };
}

/* ---------------------------------------------------------------- 竖向柱状图 */
export function columnOption(rows = [], opts = {}) {
  const { unit = '', decimals, showValue = true, rotate = 0 } = opts;
  return {
    animationDuration: 700,
    color: COLORS,
    grid: { left: 6, right: 10, top: 18, bottom: 2, containLabel: true },
    tooltip: {
      ...TOOLTIP, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(73,195,255,0.08)' } },
      formatter: (ps) => `${ps[0].name}<br/><b style="font-size:14px">${fmt(ps[0].value, decimals ?? 0)}</b> ${unit}`
    },
    xAxis: {
      type: 'category', data: rows.map((r) => r.name),
      axisLine: { lineStyle: { color: LINE } }, axisTick: { show: false },
      axisLabel: { color: TEXT_DIM, fontSize: 10, interval: 0, rotate, width: 62, overflow: 'truncate' }
    },
    yAxis: {
      type: 'value', splitNumber: 3,
      axisLabel: { color: TEXT_DIM, fontSize: 10, formatter: (v) => (v >= 10000 ? `${v / 10000}万` : v) },
      splitLine: { lineStyle: { color: 'rgba(64,158,255,0.12)', type: 'dashed' } }
    },
    series: [{
      type: 'bar',
      barMaxWidth: 22,
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: (p) => new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: COLORS[p.dataIndex % COLORS.length] },
          { offset: 1, color: `${COLORS[p.dataIndex % COLORS.length]}22` }
        ])
      },
      label: { show: showValue, position: 'top', color: TEXT, fontSize: 10, formatter: (p) => fmt(p.value, decimals ?? 0) },
      data: rows.map((r) => Number(r.value || 0))
    }]
  };
}

/* ---------------------------------------------------------------- 折线/面积图 */
export function lineOption(rows = [], opts = {}) {
  const { unit = '', decimals = 0, smooth = true, area = true } = opts;
  return {
    animationDuration: 900,
    color: COLORS,
    grid: { left: 6, right: 12, top: 22, bottom: 2, containLabel: true },
    tooltip: {
      ...TOOLTIP, trigger: 'axis',
      formatter: (ps) => `${ps[0].axisValue}<br/><b style="font-size:14px">${fmt(ps[0].value, decimals)}</b> ${unit}`
    },
    xAxis: {
      type: 'category', boundaryGap: false, data: rows.map((r) => r.name),
      axisLine: { lineStyle: { color: LINE } }, axisTick: { show: false },
      axisLabel: { color: TEXT_DIM, fontSize: 10, interval: 'auto' }
    },
    yAxis: {
      type: 'value', splitNumber: 3,
      axisLabel: { color: TEXT_DIM, fontSize: 10, formatter: (v) => (v >= 10000 ? `${v / 10000}万` : v) },
      splitLine: { lineStyle: { color: 'rgba(64,158,255,0.12)', type: 'dashed' } }
    },
    series: [{
      type: 'line', smooth, symbol: 'circle', symbolSize: 5, showSymbol: rows.length <= 14,
      lineStyle: { width: 2, color: COLORS[0], shadowBlur: 10, shadowColor: 'rgba(73,195,255,.45)' },
      itemStyle: { color: COLORS[0] },
      areaStyle: area ? {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(73,195,255,0.38)' }, { offset: 1, color: 'rgba(73,195,255,0.02)' }
        ])
      } : undefined,
      data: rows.map((r) => Number(r.value || 0))
    }]
  };
}

/* ---------------------------------------------------------------- 仪表盘 */
export function gaugeOption(value, opts = {}) {
  const { max = 100, unit = '', label = '', decimals = 0 } = opts;
  return {
    animationDuration: 900,
    series: [{
      type: 'gauge',
      startAngle: 216, endAngle: -36, min: 0, max, radius: '96%', center: ['50%', '58%'],
      progress: { show: true, width: 9, roundCap: true, itemStyle: { color: COLORS[0] } },
      axisLine: { lineStyle: { width: 9, color: [[1, 'rgba(64,158,255,0.16)']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      pointer: { show: false },
      anchor: { show: false },
      title: { offsetCenter: [0, '28%'], color: TEXT_DIM, fontSize: 11 },
      detail: {
        offsetCenter: [0, '-4%'], color: '#e8f4ff', fontSize: 21, fontWeight: 700,
        formatter: (v) => `${fmt(v, decimals)}${unit}`
      },
      data: [{ value: Number(value || 0), name: label }]
    }]
  };
}

/* ---------------------------------------------------------------- 指标执行预警（横向进度条） */
export function indicatorOption(items = []) {
  const names = items.map((i) => i.name);
  const actuals = items.map((i) => Number(i.actual) || 0);
  const targets = items.map((i) => Number(i.target) || 0);
  const tone = (w) => (w === '红牌' ? '#ff5f57' : w === '黄牌' ? '#ffcc44' : '#35d39a');
  const max = Math.max(1, ...actuals, ...targets);
  // 标签宽度按最长类目自适应，避免「砂石土料产能控制…」被截断
  const longest = names.reduce((m, n) => Math.max(m, String(n).length), 0);
  const labelW = Math.min(196, Math.max(96, Math.round(longest * 11.5) + 14));
  return {
    animationDuration: 780,
    grid: { left: 4, right: 78, top: 6, bottom: 4, containLabel: true },
    tooltip: {
      ...TOOLTIP,
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(73,195,255,0.08)' } },
      formatter: (ps) => {
        const i = ps[0].dataIndex;
        return `${names[i]}<br/>实际 <b style="font-size:13px">${fmt(actuals[i], 0)}</b> / 目标 ${fmt(targets[i], 0)}`;
      }
    },
    xAxis: { type: 'value', show: false, max: max * 1.16 },
    yAxis: {
      type: 'category', data: names, inverse: true,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: TEXT, fontSize: 10, width: labelW, overflow: 'truncate' }
    },
    series: [{
      type: 'bar',
      barWidth: 7,
      showBackground: true,
      backgroundStyle: { color: 'rgba(127,166,204,0.16)', borderRadius: 4 },
      itemStyle: { borderRadius: 4 },
      data: actuals.map((v, i) => ({ value: v, itemStyle: { color: tone(items[i].warn) } })),
      label: {
        show: true, position: 'right', color: TEXT, fontSize: 10,
        formatter: (p) => `${fmt(actuals[p.dataIndex], 0)}/${fmt(targets[p.dataIndex], 0)}`
      }
    }]
  };
}

/* ---------------------------------------------------------------- 组件 */
export default function Chart({
  option, height = 150, style, className = '', onEvents, notMerge = true, group, label
}) {
  const boxRef = useRef(null);
  const instRef = useRef(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || !option) return undefined;
    const inst = echarts.getInstanceByDom(el) || echarts.init(el, null, { renderer: 'canvas' });
    instRef.current = inst;
    if (group) inst.group = group;
    inst.setOption(option, notMerge);
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (el.clientWidth > 0 && el.clientHeight > 0) inst.resize();
      });
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [option, notMerge, group]);

  useEffect(() => () => {
    if (instRef.current) { instRef.current.dispose(); instRef.current = null; }
  }, []);

  useEffect(() => {
    const inst = instRef.current;
    if (!inst || !onEvents) return undefined;
    Object.entries(onEvents).forEach(([evt, fn]) => inst.on(evt, fn));
    return () => Object.keys(onEvents).forEach((evt) => inst.off(evt));
  }, [onEvents, option]);

  return (
    <div
      ref={boxRef}
      role="img"
      aria-label={label || '数据图表'}
      className={`chart ${className}`.trim()}
      style={{ width: '100%', height, ...style }}
    />
  );
}

export { echarts };
