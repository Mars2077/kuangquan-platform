import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GeoMap from '../components/GeoMap.jsx';
import Chart, { COLORS, donutOption, barOption, indicatorOption } from '../components/Chart.jsx';
import { Tabs } from '../components/Panel.jsx';
import { Ic, QuarterFlag } from '../components/Icon';
import { useApp, useFetch } from '../store.jsx';
import { meta as metaApi, screen as screenApi } from '../api';
import {
  ArrowLeft01Icon, Camera01Icon, ChevronDownIcon, Download01Icon, FilterIcon, Layers01Icon,
  Location01Icon, More01Icon, Refresh01Icon, RulerIcon, Search01Icon, Task01Icon, ToolsIcon
} from '@hugeicons/core-free-icons';

/* ------------------------------------------------------------------ 工具函数 */
const nf = (v, d = 2) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return v ?? '—';
  return n.toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
};
const int = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString('zh-CN') : '—');

const PALETTE = COLORS;

const THEMES = [
  { key: 'online', label: '在线矿山', tone: '#35d39a' },
  { key: 'green', label: '绿色矿山', tone: '#35d39a' },
  { key: 'deposit', label: '矿产地', tone: '#49c3ff' },
  { key: 'right', label: '矿业权', tone: '#ffcc44' },
  { key: 'hazard', label: '地灾隐患点', tone: '#ff5f57' }
];

const SCENE_META = {
  dashboard: { title: '在线矿山', module: 'deposit', theme: 'online' },
  deposit: { title: '矿产地', module: 'deposit', theme: 'deposit' },
  plan: { title: '规划分区', module: 'plan', theme: 'deposit' },
  rights: { title: '矿业权', module: 'rights', theme: 'right' },
  green: { title: '绿色矿山', module: 'green', theme: 'green' },
  supervise: { title: '预警线索', module: 'supervise', theme: 'online' },
  geology: { title: '地勘项目', module: 'geology', theme: 'hazard' }
};

const LIST_COLUMNS = {  dashboard: [
    { key: 'region_name', label: '区县名称', width: 96 },
    { key: 'name', label: '矿山名称', flex: true },
    { key: 'devices_total', label: '设备接入总数', width: 110, align: 'right' },
    { key: 'devices_online', label: '在线数量', width: 90, align: 'right' }
  ],
  deposit: [
    { key: 'region_name', label: '区县名称', width: 96 },
    { key: 'name', label: '矿产地名称', flex: true },
    { key: 'mineral', label: '矿种', width: 100 },
    { key: 'stage', label: '勘查程度', width: 90 },
    { key: 'reserve_t', label: '保有资源量(万吨)', width: 150, align: 'right' }
  ],
  plan: [
    { key: 'region_name', label: '区县名称', width: 96 },
    { key: 'name', label: '规划区块', flex: true },
    { key: 'zone_type', label: '分区类型', width: 150 },
    { key: 'area', label: '面积(km²)', width: 100, align: 'right' },
    { key: 'level', label: '级别', width: 80 }
  ],
  rights: [
    { key: 'license_no', label: '许可证号', width: 200 },
    { key: 'right_type', label: '权类', width: 80 },
    { key: 'mine_name', label: '矿山名称', flex: true },
    { key: 'holder', label: '权利人', width: 190 },
    { key: 'status', label: '状态', width: 80 }
  ],
  green: [
    { key: 'region_name', label: '区县名称', width: 96 },
    { key: 'name', label: '矿山名称', flex: true },
    { key: 'valid_to', label: '有效期止', width: 110 },
    { key: 'right_holder', label: '采矿权人', width: 200 },
    { key: 'green_level', label: '入库等级', width: 90 }
  ],
  supervise: [
    { key: 'alert_no', label: '预警编号', width: 150 },
    { key: 'kind', label: '类型', width: 110 },
    { key: 'mine_name', label: '矿山名称', flex: true },
    { key: 'level', label: '等级', width: 80 },
    { key: 'status', label: '处置状态', width: 100 }
  ],
  geology: [
    { key: 'code', label: '项目编号', width: 140 },
    { key: 'name', label: '项目名称', flex: true },
    { key: 'category', label: '类别', width: 120 },
    { key: 'region_name', label: '区县名称', width: 96 },
    { key: 'progress', label: '进度', width: 80, align: 'right' }
  ]
};

const POPUP_FIELDS = {
  online: [
    ['right_holder', '采矿权人'], ['econ_type', '经济类型'], ['area_km2', '矿区面积（平方千米）'],
    ['license_no', '许可证号'], ['mineral', '开采矿种'], ['valid_from', '有效期起'],
    ['valid_to', '有效期止'], ['region_code', '行政区划代码']
  ],
  green: [
    ['right_holder', '采矿权人'], ['green_level', '绿色矿山等级'], ['valid_to', '有效期止'], ['region_name', '行政区划']
  ],
  deposit: [
    ['mineral', '矿种'], ['stage', '勘查程度'], ['degree', '勘查阶段'],
    ['reserve_t', '保有资源量（万吨）'], ['area', '面积（km²）'], ['region_name', '行政区划']
  ],
  right: [
    ['right_type', '权类'], ['holder', '权利人'], ['license_no', '许可证号'],
    ['mineral', '矿种'], ['valid_to', '有效期止'], ['status', '状态']
  ],
  hazard: [['type', '灾害类型'], ['level', '风险等级'], ['status', '状态'], ['region_name', '行政区划']]
};

/* ------------------------------------------------------------------ 面板内容 */
function PanelBody({ panel, onMore }) {
  const [tab, setTab] = useState(panel.tabs?.[0]?.key);
  useEffect(() => {
    if (panel.tabs && !panel.tabs.some((t) => t.key === tab)) setTab(panel.tabs[0]?.key);
  }, [panel, tab]);

  if (!panel) return null;

  if (panel.type === 'stat-list') {
    return (
      <div className="stat-list">
        {(panel.rows || []).map((r, i) => (
          <div className="stat-row" key={r.label + i}>
            <span className="k">{r.label}</span>
            {r.suffix && <span className="muted tiny" style={{ marginLeft: 4 }}>{r.suffix}</span>}
            <span className={`v${r.tone === 'warm' ? ' warm' : ''}`}>
              {typeof r.value === 'number' ? nf(r.value, r.decimals ?? (r.unit === '亿元' ? 2 : 0)) : r.value}
            </span>
            {r.unit && <span className="u">{r.unit}</span>}
            {r.delta !== undefined && r.delta !== null && (
              <span className={`d ${r.delta >= 0 ? 'up' : 'down'}`}>
                {r.delta >= 0 ? '▲' : '▼'} {Math.abs(Number(r.delta)).toFixed(1)}%
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (panel.type === 'tabbed') {
    const cur = panel.tabs?.find((t) => t.key === tab) || panel.tabs?.[0];
    return (
      <>
        <Tabs items={(panel.tabs || []).map((t) => ({ key: t.key, label: t.label }))} value={cur?.key} onChange={setTab} />
        <div className="tab-groups">
          {(cur?.groups || []).map((g) => (
            <div key={g.title} className="tab-group">
              <div className="tab-group-title">{g.title}</div>
              <div className="stat-list tight">
                {(g.rows || []).map((r, i) => (
                  <div className="stat-row" key={r.label + i}>
                    <span className="k">{r.label}</span>
                    <span className="v">{nf(r.value, r.decimals ?? (r.unit === '亿元' ? 2 : 0))}</span>
                    {r.unit && <span className="u">{r.unit}</span>}
                    {r.delta !== undefined && r.delta !== null && (
                      <span className={`d ${r.delta >= 0 ? 'up' : 'down'}`}>
                        {r.delta >= 0 ? '▲' : '▼'} {Math.abs(Number(r.delta)).toFixed(1)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (panel.type === 'ring-split') {
    const parts = panel.rows || [];
    return (
      <div className="ring-card">
        <Chart
          className="ring-chart"
          height={96}
          style={{ width: 96, flex: "0 0 96px" }}
          option={donutOption(parts, { center: Number(panel.ring?.center ?? panel.ring?.total), unit: panel.ring?.unit })}
        />
        <div className="ring-legend">
          {parts.map((r, i) => (
            <div className="ring-row" key={r.name + i}>
              <i style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="n">{r.name}</span>
              <span className="v">{nf(r.value, r.decimals ?? (r.unit === '亿元' ? 2 : 0))}</span>
              {r.unit && <span className="muted tiny">{r.unit}</span>}
              {r.delta !== undefined && r.delta !== null && (
                <span className={`d ${r.delta >= 0 ? 'up' : 'down'}`}>{Math.abs(Number(r.delta)).toFixed(1)}%</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (panel.type === 'tabbed-ring') {
    const cur = panel.tabs?.find((t) => t.key === tab) || panel.tabs?.[0];
    return (
      <>
        <Tabs items={(panel.tabs || []).map((t) => ({ key: t.key, label: t.label }))} value={cur?.key} onChange={setTab} />
        <div className="ring-card">
          <Chart
            className="ring-chart"
            height={96}
            style={{ width: 96, flex: "0 0 96px" }}
            option={donutOption(cur?.parts || [], { center: Number(cur?.total), unit: cur?.unit })}
          />
          <div className="ring-legend">
            {(cur?.parts || []).map((r, i) => (
              <div className="ring-row" key={r.name + i}>
                <i style={{ background: PALETTE[i % PALETTE.length] }} />
                <span className="n">{r.name}</span>
                <span className="v">{nf(r.value, cur?.unit === '亿元' ? 2 : 0)}</span>
                <span className="muted tiny">{cur?.unit}</span>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (panel.type === 'stat-grid') {
    return (
      <div className="stack-sm">
        {(panel.blocks || []).map((b) => (
          <div key={b.title}>
            <div className="block-label">{b.title}</div>
            {b.title.includes('预警') ? (
              <div className="warn-grid">
                {(b.items || []).map((it, i) => (
                  <div className="warn-card" key={it.label + i}>
                    <div className="k">{it.label}</div>
                    <div className="v">{int(it.value)}</div>
                    {it.sub && <div className="s">{it.sub}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="sensor-grid">
                {(b.items || []).map((it, i) => (
                  <div className="c" key={it.label + i}>
                    <div className="v">{int(it.value)}<small>{it.unit}</small></div>
                    <div className="k">{it.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (panel.type === 'bars') {
    const rows = panel.rows || [];
    return (
      <Chart
        className="bars-chart"
        height={Math.max(96, rows.length * 26 + 14)}
        option={barOption(rows, { unit: panel.unit || '', colorBy: true })}
      />
    );
  }

  return null;
}

/* ------------------------------------------------------------------ 测距 / 测面（与后端同口径） */
const R = 6371;
function haversine(a, b) {
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const la1 = (a[1] * Math.PI) / 180;
  const la2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function polygonAreaKm2(ring) {
  if (!ring || ring.length < 3) return 0;
  const lat0 = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const kx = 111.32 * Math.cos((lat0 * Math.PI) / 180);
  const ky = 110.57;
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = [ring[i][0] * kx, ring[i][1] * ky];
    const [x2, y2] = [ring[(i + 1) % ring.length][0] * kx, ring[(i + 1) % ring.length][1] * ky];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum / 2);
}

/* ------------------------------------------------------------------ 主页面 */
const LIST_KEYS = {
  online: ['online', 'green', 'deposit', 'right'],
  green: ['green', 'online'],
  deposit: ['deposit', 'online'],
  right: ['right', 'online'],
  hazard: ['hazard', 'alert'],
  topo: ['topo', 'zone']
};

/* 后端 /api/screen/:scene 的 list 是「列表类型 → 行数组」的对象 */
function pickListArray(raw, theme, scene) {
  if (!raw || typeof raw !== 'object') return [];
  const tries = [...(LIST_KEYS[theme] || []), theme, scene, 'online', 'list'];
  for (const k of tries) {
    if (Array.isArray(raw[k])) return raw[k];
  }
  const first = Object.values(raw).find((v) => Array.isArray(v));
  return first || [];
}

export default function Cockpit({ sceneKey }) {
  const params = useParams();
  const nav = useNavigate();
  const { user, bootMeta, toast } = useApp();
  const scene = sceneKey || params.scene || 'dashboard';
  const meta0 = SCENE_META[scene] || SCENE_META.dashboard;

  const [code, setCode] = useState('510000');
  const [theme, setTheme] = useState(meta0.theme);
  const [layerOpen, setLayerOpen] = useState(false);
  const [toolOpen, setToolOpen] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [sel, setSel] = useState(null);
  const [kw, setKw] = useState('');
  const [measure, setMeasure] = useState({ mode: 'none', points: [], closed: false });
  const [locate, setLocate] = useState('');
  const stageRef = useRef({});

  useEffect(() => {
    setTheme(meta0.theme);
    setSel(null);
  }, [scene]);

  const regions = useFetch(() => metaApi.regions(), []);
  const regionMap = useMemo(() => {
    const m = new Map();
    (regions.data?.list || []).forEach((r) => m.set(String(r.code), r));
    return m;
  }, [regions.data]);

  const screenQ = useFetch(() => screenApi.get(scene, { code }), [scene, code]);
  const pointsQ = useFetch(() => screenApi.layers(theme, { code }), [theme, code]);

  const data = screenQ.data;
  const allPoints = pointsQ.data?.list || [];

  const points = useMemo(() => {
    if (theme !== 'deposit') return allPoints;
    const stages = stageRef.current;
    const keys = Object.keys(stages).filter((k) => stages[k]);
    if (keys.length === 0) return allPoints;
    return allPoints.filter((p) => keys.includes(p.stage));
  }, [allPoints, theme, layerOpen]);

  const scopeName = code === '510000' ? '全省' : regionMap.get(String(code))?.name || '四川省';
  const themeLabel = THEMES.find((t) => t.key === theme)?.label || meta0.title;
  const mapTitle = `${scopeName}${themeLabel}分布专题图`;

  const list = useMemo(() => {
    const raw = data?.list;
    const rows = Array.isArray(raw) ? raw : pickListArray(raw, theme, scene);
    if (!kw) return rows;
    const k = kw.trim();
    return rows.filter((r) => JSON.stringify(r).includes(k));
  }, [data, kw, theme, scene]);

  const bubbles = useMemo(() => {
    const raw = data?.map?.bubbles || [];
    const isProvince = String(code) === '510000';
    const isCity = String(code).endsWith('00') && !isProvince;
    if (isProvince) {
      /* 省级视角：把区县气泡聚合成 11 个地市气泡 */
      const acc = new Map();
      raw.forEach((b) => {
        const lv = String(b.level || b.bubble_level || '').toLowerCase();
        if (lv === 'city') {
          acc.set(String(b.code), { ...b });
          return;
        }
        const c = String(b.code || '');
        if (c.length !== 6) return;
        const key = `${c.slice(0, 4)}00`;
        const cur = acc.get(key) || { code: key, name: '', value: 0, lon: 0, lat: 0, n: 0 };
        cur.value += Number(b.value) || 0;
        cur.lon += Number(b.lon) || 0;
        cur.lat += Number(b.lat) || 0;
        cur.n += 1;
        acc.set(key, cur);
      });
      return [...acc.values()].map((b) => {
        const reg = regionMap.get(String(b.code));
        return {
          code: String(b.code),
          name: reg?.name || b.name || '',
          value: b.value,
          lon: reg?.lon ?? (b.n ? b.lon / b.n : b.lon),
          lat: reg?.lat ?? (b.n ? b.lat / b.n : b.lat)
        };
      }).filter((b) => b.name);
    }
    if (isCity) return raw.filter((b) => String(b.code).slice(0, 4) === String(code).slice(0, 4) && String(b.code) !== String(code));
    return raw.filter((b) => String(b.code) === String(code));
  }, [data, code, regionMap]);

  const columns = LIST_COLUMNS[scene] || LIST_COLUMNS.dashboard;

  const drill = (adcode) => {
    const c = String(adcode);
    if (!/^\d{6}$/.test(c)) return;
    setCode(c);
    setSel(null);
    setMeasure({ mode: 'none', points: [], closed: false });
  };

  const backTo = (c) => {
    setCode(c);
    setSel(null);
  };

  const breadcrumb = useMemo(() => {
    const c = String(code);
    const listPath = [];
    if (c === '510000') return listPath;
    listPath.push({ code: '510000', name: '四川省' });
    if (!c.endsWith('0000')) {
      const city = regionMap.get(`${c.slice(0, 4)}00`);
      if (city) listPath.push({ code: city.code, name: city.name });
      if (!c.endsWith('00')) {
        const county = regionMap.get(c);
        if (county) listPath.push({ code: c, name: county.name });
      }
    }
    return listPath;
  }, [code, regionMap]);

  /* -------- 地图交互 -------- */
  const onMapClick = useCallback(
    (pt) => {
      if (measure.mode === 'none') return;
      setMeasure((m) => {
        const pts = [...m.points, pt];
        if (m.mode === 'dist') return { ...m, points: pts.slice(-2), closed: false };
        return { ...m, points: pts, closed: pts.length >= 3 };
      });
    },
    [measure.mode]
  );

  const measureText = useMemo(() => {
    const pts = measure.points;
    if (measure.mode === 'dist' && pts.length === 2) {
      return `直线距离 ${nf(haversine(pts[0], pts[1]), 3)} km`;
    }
    if (measure.mode === 'area' && pts.length >= 3) {
      const area = polygonAreaKm2(pts);
      let peri = 0;
      for (let i = 0; i < pts.length; i += 1) peri += haversine(pts[i], pts[(i + 1) % pts.length]);
      return `面积 ${nf(area, 3)} km² · 周长 ${nf(peri, 2)} km`;
    }
    if (measure.mode !== 'none') return measure.mode === 'dist' ? '请在地图上依次点击两点' : '请在地图上连续点击至少三点';
    return '';
  }, [measure]);

  const exportPng = () => {
    const svg = document.querySelector('.map-stage .geo-svg');
    if (!svg) {
      // 高德底图模式：尝试直接导出地图 canvas；瓦片为跨域资源时不放开 CORS，故失败时明确提示
      const canvasEl = document.querySelector('.geomap-canvas canvas');
      if (!canvasEl) {
        toast('未找到地图画布', 'err');
        return;
      }
      try {
        const out = document.createElement('canvas');
        out.width = canvasEl.width;
        out.height = canvasEl.height;
        const ctx = out.getContext('2d');
        ctx.fillStyle = '#050f21';
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(canvasEl, 0, 0);
        const a = document.createElement('a');
        a.href = out.toDataURL('image/png');
        a.download = `${mapTitle}-高德底图.png`;
        a.click();
        toast('已导出当前专题图 PNG');
      } catch {
        toast('高德瓦片为跨域资源，无法直接导出；请使用系统截图', 'err');
      }
      return;
    }
    try {
      const clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const rect = svg.getBoundingClientRect();
      clone.setAttribute('width', rect.width);
      clone.setAttribute('height', rect.height);
      const str = new XMLSerializer().serializeToString(clone);
      const img = new Image();
      const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(str)}`;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = window.devicePixelRatio || 1;
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#050f21';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(ratio, ratio);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `${mapTitle}.png`;
        a.click();
        toast('已导出当前专题图 PNG');
      };
      img.onerror = () => toast('导出失败：画布包含跨域资源', 'err');
      img.src = url;
    } catch {
      toast('导出失败', 'err');
    }
  };

  const exportCsv = () => {
    if (!list.length) {
      toast('当前列表没有可导出的数据', 'err');
      return;
    }
    const keys = Object.keys(list[0]);
    const head = keys.join(',');
    const body = list.map((r) => keys.map((k) => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${head}\n${body}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${mapTitle}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast(`已导出 ${list.length} 条记录`);
  };

  const popupRows = (POPUP_FIELDS[theme] || POPUP_FIELDS.online).filter(([k]) => sel?.[k] !== undefined && sel?.[k] !== null);

  return (
    <div className="screen">
      <aside className="screen-col">
        {(data?.left || []).map((p) => (
          <section className="panel" key={p.key}>
            <header className="panel-head">
              <h2>{p.title}</h2>
              <button type="button" className="panel-more" onClick={() => nav(`/biz/${meta0.module}`)}>
                详情 <Ic icon={ChevronDownIcon} size={11} />
              </button>
            </header>
            <div className="panel-body"><PanelBody panel={p} /></div>
          </section>
        ))}
        {!data && <div className="loading"><span className="spinner" />加载中 …</div>}
      </aside>

      <div className="map-stage">
        <GeoMap
          code={code}
          onDrill={drill}
          bubbles={bubbles}
          points={points}
          selected={sel}
          onSelectPoint={(pt) => setSel(pt)}
          onMapClick={onMapClick}
          measure={measure}
          selectedRegion={code}
        />

        <div className="map-title">{mapTitle}</div>

        {breadcrumb.length > 0 && (
          <div className="map-breadcrumb">
            {breadcrumb.map((b, i) => (
              <React.Fragment key={b.code}>
                {i > 0 && <i>/</i>}
                <button type="button" onClick={() => backTo(b.code)}>{b.name}</button>
              </React.Fragment>
            ))}
            {measure.mode !== 'none' && <button type="button" onClick={() => setMeasure({ mode: 'none', points: [], closed: false })}>结束量算</button>}
          </div>
        )}

        <div className="map-float-left">
          <select
            className="select"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-label="选择行政区划"
          >
            <option value="510000">四川省（全省）</option>
            {(regions.data?.list || []).filter((r) => r.level === 'city').map((r) => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
            {(regions.data?.list || []).filter((r) => r.level === 'county' && String(r.code).slice(0, 4) === String(code).slice(0, 4)).map((r) => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>
          <div className="float-btns">
            {THEMES.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`map-btn${theme === t.key ? ' on' : ''}`}
                onClick={() => {
                  setTheme(t.key);
                  setSel(null);
                }}
              >
                <span className="dot" style={{ background: t.tone }} />
                {t.label}
              </button>
            ))}
            <button type="button" className="map-btn" onClick={() => nav('/battle')}>
              <Ic icon={Task01Icon} size={13} />
              重大任务
            </button>
          </div>
        </div>

        <div className="map-float-right">
          <button type="button" className={`icon-btn${toolOpen ? ' on' : ''}`} aria-label="工具" onClick={() => { setToolOpen((v) => !v); setLayerOpen(false); }}>
            <Ic icon={ToolsIcon} size={16} />
          </button>
          <button type="button" className={`icon-btn${layerOpen ? ' on' : ''}`} aria-label="图层控制" onClick={() => { setLayerOpen((v) => !v); setToolOpen(false); }}>
            <Ic icon={Layers01Icon} size={16} />
          </button>
        </div>

        {toolOpen && (
          <div className="layer-panel" style={{ right: 56 }}>
            <div className="layer-head">
              <h3>工具</h3>
              <button type="button" className="btn-link" onClick={() => setToolOpen(false)}>关闭</button>
            </div>
            <div className="layer-body">
              <button type="button" className="tool-item" onClick={() => setMeasure({ mode: 'dist', points: [], closed: false })}>
                <Ic icon={RulerIcon} size={14} /> 测距
              </button>
              <button type="button" className="tool-item" onClick={() => setMeasure({ mode: 'area', points: [], closed: false })}>
                <Ic icon={FilterIcon} size={14} /> 测面
              </button>
              <div className="tool-item-box">
                <div className="muted tiny">坐标定位（经度,纬度）</div>
                <div className="row">
                  <input className="input" value={locate} onChange={(e) => setLocate(e.target.value)} placeholder="120.09,30.89" />
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      const m = locate.split(/[,，\s]+/).map(Number).filter((n) => Number.isFinite(n));
                      if (m.length < 2) {
                        toast('请输入「经度,纬度」，例如 120.09,30.89', 'err');
                        return;
                      }
                      setMeasure({ mode: 'dist', points: [[m[0], m[1]]], closed: false });
                      const near = [...(points || [])]
                        .filter((p) => p.lon && p.lat)
                        .map((p) => ({ p, d: haversine([m[0], m[1]], [Number(p.lon), Number(p.lat)]) }))
                        .sort((a, b) => a.d - b.d)[0];
                      toast(near ? `已定位，最近要素：${near.p.name}（${nf(near.d, 2)} km）` : '已定位');
                    }}
                  >
                    定位
                  </button>
                </div>
              </div>
              <button type="button" className="tool-item" onClick={exportPng}>
                <Ic icon={Camera01Icon} size={14} /> 截图导出 PNG
              </button>
              <button type="button" className="tool-item" onClick={exportCsv}>
                <Ic icon={Download01Icon} size={14} /> 导出当前列表
              </button>
              <button type="button" className="tool-item" onClick={() => { setCode(user?.region_code || '510000'); setSel(null); }}>
                <Ic icon={Refresh01Icon} size={14} /> 回到本辖区视角
              </button>
            </div>
          </div>
        )}

        {layerOpen && (
          <div className="layer-panel">
            <div className="layer-head">
              <h3>图层控制</h3>
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  stageRef.current = {};
                  setTheme(meta0.theme);
                  setSel(null);
                }}
              >
                清除
              </button>
            </div>
            <div className="layer-body">
              <div className="layer-group">
                <div className="layer-group-title">专题图层</div>
                {THEMES.map((t) => (
                  <label className="layer-item" key={t.key}>
                    <input
                      type="checkbox"
                      checked={theme === t.key}
                      onChange={() => setTheme(t.key)}
                    />
                    <span>{t.label}</span>
                    <span className="muted tiny">{t.key === theme ? `${points.length} 个要素` : ''}</span>
                  </label>
                ))}
              </div>
              <div className="layer-group">
                <div className="layer-group-title">矿产地（按勘查程度）</div>
                {['待查', '在查', '查明', '规划'].map((st) => (
                  <label className="layer-item" key={st}>
                    <input
                      type="checkbox"
                      checked={!!stageRef.current[st]}
                      onChange={(e) => {
                        stageRef.current = { ...stageRef.current, [st]: e.target.checked };
                        setTheme('deposit');
                        setSel(null);
                        // 触发重算
                        setMeasure((m) => ({ ...m }));
                      }}
                    />
                    <span>{st}矿产地</span>
                  </label>
                ))}
              </div>
              <div className="layer-group">
                <div className="layer-group-title">基础参考图层</div>
                {['清查家底', '三线（生态保护红线）', '辅助规划范围', '省级规划', '市级规划', '县级规划'].map((n) => (
                  <label className="layer-item" key={n}>
                    <input type="checkbox" disabled />
                    <span className="muted">{n}</span>
                    <span className="muted tiny">待接底图</span>
                  </label>
                ))}
              </div>
              <p className="muted tiny" style={{ lineHeight: 1.6, marginTop: 8 }}>
                基础参考图层需接入省级二三维底图服务后开放；当前演示环境以真实行政区划边界与要素点位呈现。
              </p>
            </div>
          </div>
        )}

        {measureText && <div className="tool-tip">{measureText}</div>}

        {sel && (
          <div className="mine-popup">
            <div className="mine-popup-head">
              <h3>{sel.name}</h3>
              <button type="button" className="close" onClick={() => setSel(null)} aria-label="关闭">✕</button>
            </div>
            <div className="mine-popup-body">
              {popupRows.map(([k, label]) => (
                <div className="mp-row" key={k}>
                  <span className="k">{label}</span>
                  <span className="v">{sel[k] === null || sel[k] === '' ? '—' : sel[k]}</span>
                </div>
              ))}
              <button type="button" className="mp-more" onClick={() => nav(`/archive/${sel.id}`)}>
                更多 <Ic icon={More01Icon} size={12} />
              </button>
            </div>
            {theme === 'online' && (
              <div className="badges">
                <span className={sel.video_connected ? 'on' : 'off'}>
                  <i><Ic icon={Camera01Icon} size={13} /></i>视频监控<small>{sel.video_connected ? '已接入' : '未接入'}</small>
                </span>
                <span className={sel.monitor_connected ? 'on' : 'off'}>
                  <i><Ic icon={ToolsIcon} size={13} /></i>监测设备<small>{sel.monitor_connected ? '已接入' : '未接入'}</small>
                </span>
                <span className={sel.warn_connected ? 'on' : 'off'}>
                  <i><Ic icon={Location01Icon} size={13} /></i>监测预警<small>{sel.warn_connected ? '已接入' : '未接入'}</small>
                </span>
              </div>
            )}
          </div>
        )}

      </div>

      <aside className="screen-col">
        {(data?.right || []).map((p) => (
          <section className="panel" key={p.key}>
            <header className="panel-head">
              <h2>{p.title}</h2>
              <button type="button" className="panel-more" onClick={() => nav(`/biz/${meta0.module}`)}>
                详情 <Ic icon={ChevronDownIcon} size={11} />
              </button>
            </header>
            <div className="panel-body"><PanelBody panel={p} /></div>
          </section>
        ))}
        {data?.extra?.indicators && (
          <section className="panel">
            <header className="panel-head"><h2>指标执行预警</h2></header>
            <div className="panel-body">
              <Chart
                className="indicator-chart"
                height={Math.max(120, Math.min(5, data.extra.indicators.length) * 30 + 16)}
                option={indicatorOption(data.extra.indicators.slice(0, 5))}
              />
            </div>
          </section>
        )}
      </aside>

      <section className={`map-list${listOpen ? '' : ' collapsed'}`}>
        <header className="map-list-head">
          <h3>{themeLabel}列表</h3>
          <div className="map-list-tools">
            <div className="search-mini">
              <Ic icon={Search01Icon} size={12} />
              <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="筛选当前列表" aria-label="筛选当前列表" />
            </div>
            <button type="button" className="btn-link" onClick={exportCsv}>
              <Ic icon={Download01Icon} size={12} /> 导出
            </button>
            <button type="button" className="btn-link" onClick={() => setListOpen((v) => !v)}>
              {listOpen ? '收起' : '展开'}
            </button>
          </div>
        </header>
        <div className="map-list-body">
          <table className="data-table dense map-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>序号</th>
                {columns.map((c) => (
                  <th key={c.key} className={c.align === 'right' ? 'num' : ''} style={c.width ? { width: c.width } : undefined}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 200).map((row, i) => (
                <tr key={row.id ?? i} onClick={() => setSel(row)} className={sel && sel.id === row.id ? 'selected' : ''}>
                  <td className="num">{i + 1}</td>
                  {columns.map((c) => (
                    <td key={c.key} className={c.align === 'right' ? 'num' : ''}>
                      {c.align === 'right' && Number.isFinite(Number(row[c.key])) ? int(row[c.key]) : row[c.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={columns.length + 1}><div className="table-empty">当前视角下没有要素</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
