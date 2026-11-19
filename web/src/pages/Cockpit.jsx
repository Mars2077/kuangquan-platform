/* 驾驶舱（7 个专题场景共用）：契约 §5 两行栅格
 *   第一行：左栏（.dash-col--l）| 地图（.dash-map）| 右栏（.dash-col--r）
 *   第二行：底部列表（.dash-list，跨满三列，可折叠）
 * 面板只用 .panel / .stat-list / .ring-card / .ring-legend / .bars / .chart。
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Segmented } from 'antd';
import GeoMap from '../components/GeoMap.jsx';
import Chart, {
  COLORS, donutOption, barOption, indicatorOption, formatValue, pieOption
} from '../components/Chart.jsx';
import { Ic } from '../components/Icon';
import { useApp, useFetch } from '../store.jsx';
import { meta as metaApi, screen as screenApi } from '../api';
import {
  Camera01Icon, ChevronDownIcon, ChevronUpIcon, Download01Icon, FilterIcon, Layers01Icon,
  Location01Icon, More01Icon, Refresh01Icon, RulerIcon, Search01Icon, ToolsIcon
} from '@hugeicons/core-free-icons';

/* ------------------------------------------------------------------ 常量 */
const PALETTE = COLORS;
const nf = (v, d = 2) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return v ?? '—';
  return n.toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
};
const int = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString('zh-CN') : '—');

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

/* v7：驾驶舱内的 7 个 Tab —— 总览 + 6 个业务专题（原二级场景页） */
const SCENE_TABS = [
  { key: 'dashboard', name: '综合总览', hint: '全省态势' },
  { key: 'deposit', name: '矿产地', hint: '家底与清查' },
  { key: 'plan', name: '保护与规划', hint: '规划与指标' },
  { key: 'rights', name: '矿业权', hint: '登记与出让' },
  { key: 'green', name: '绿色矿山', hint: '申报与名录' },
  { key: 'supervise', name: '智慧监管', hint: '预警与处置' },
  { key: 'geology', name: '数智地勘', hint: '项目与地灾' }
];

/* 底部列表开关上的文字：按专题取一个业务名词，避免只显示一个数字看不懂 */
const LIST_LABEL = {
  dashboard: '矿山列表',
  deposit: '矿产地列表',
  plan: '规划区块列表',
  rights: '矿业权列表',
  green: '绿色矿山列表',
  supervise: '预警列表',
  geology: '项目列表'
};

/* 面板「详情」落点：统一指向「业务中枢」里的对应视图（/hub/模块/功能点）。
 * 面板与功能点的对应关系按业务含义确定，见 docs/16-统一详情纳管与统计重做.md。 */
const DETAIL_ROUTE = {
  dashboard: {
    reserve: '/hub/deposit/reserve-review',
    plan: '/hub/plan/plan-overview',
    rights: '/hub/rights/rights-stats',
    geo: '/hub/geology/geology-explore',
    green: '/hub/green/green-dynamic',
    supervise: '/hub/supervise/supervise-monitor'
  },
  deposit: {
    stage: '/hub/deposit/deposit-overview',
    mineral: '/hub/deposit/deposit-overview',
    scale: '/hub/deposit/deposit-overview',
    degree: '/hub/deposit/deposit-survey',
    reserve: '/hub/deposit/reserve-review',
    top: '/hub/deposit/deposit-overview'
  },
  plan: {
    zones: '/hub/plan/plan-overview',
    zoneArea: '/hub/plan/plan-stats',
    level: '/hub/plan/plan-overview',
    rate: '/hub/plan/plan-indicator',
    zoneTop: '/hub/plan/plan-overview',
    warn: '/hub/plan/plan-indicator'
  },
  rights: {
    type: '/hub/rights/rights-stats',
    status: '/hub/rights/rights-map',
    scale: '/hub/rights/rights-stats',
    method: '/hub/rights/rights-trade',
    mineral: '/hub/rights/rights-stats',
    amount: '/hub/rights/rights-stats'
  },
  green: {
    level: '/hub/green/green-dynamic',
    digital: '/hub/green/green-dynamic',
    dims: '/hub/green/green-apply',
    stage: '/hub/green/green-apply',
    out: '/hub/green/green-out',
    score: '/hub/green/green-apply'
  },
  supervise: {
    alert: '/hub/supervise/supervise-order',
    device: '/hub/supervise/supervise-monitor',
    deviceType: '/hub/supervise/supervise-monitor',
    order: '/hub/supervise/supervise-order',
    overdue: '/hub/supervise/supervise-order',
    alertLevel: '/hub/supervise/supervise-order'
  },
  geology: {
    cat: '/hub/geology/geology-explore',
    status: '/hub/geology/geology-explore',
    reserve: '/hub/geology/geology-explore',
    hazard: '/hub/geology/geology-env',
    level: '/hub/geology/geology-env',
    agri: '/hub/geology/geology-agri'
  }
};

const LIST_COLUMNS = {
  dashboard: [
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

/* ------------------------------------------------------------------ 小工具组件 */
function Tabs({ items = [], value, onChange }) {
  return (
    <Segmented
      size="small"
      block
      value={value}
      onChange={onChange}
      options={items.map((it) => ({ label: it.label, value: it.key }))}
      style={{ marginBottom: 4 }}
    />
  );
}

function Delta({ value }) {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) return null;
  const n = Number(value);
  return (
    <span className={`d ${n >= 0 ? 'up' : 'down'}`}>
      {n >= 0 ? '▲' : '▼'} {Math.abs(n).toFixed(1)}%
    </span>
  );
}

/* 统计行：.stat-list > .stat-row > .k / .v / .u / .d（契约 §5）
 * 行高与字号在这里统一：2–3 行时 72–88px；4 行以上等分（≥48px）；数值统一 25px、标签统一 13px。 */
const STAT_ROW_TALL = { flex: '1 1 0', minHeight: 72, maxHeight: 88, padding: '6px 0' };
const STAT_ROW_DENSE = { flex: '1 1 0', minHeight: 42, padding: '4px 0' };
const rowStyleFor = (n) => (n <= 3 ? STAT_ROW_TALL : STAT_ROW_DENSE);

function StatRowList({ rows = [], rowStyle }) {
  return rows.map((r, i) => {
    const numeric = r.value !== null && r.value !== undefined && Number.isFinite(Number(r.value));
    return (
      <div className="stat-row" key={`${r.label || r.name}-${i}`} style={rowStyle}>
        <span className="k" title={r.label} style={{ fontSize: 13 }}>
          {r.label}
          {r.sub ? <span className="muted tiny" style={{ marginLeft: 4 }}>{r.sub}</span> : null}
        </span>
        {r.suffix ? <span className="u" style={{ flex: 'none' }}>{r.suffix}</span> : null}
        <span
          className="v"
          style={{
            fontSize: 25,
            lineHeight: 1.15,
            ...(r.tone === 'warm' ? { color: 'var(--orange)' } : null)
          }}
        >
          {numeric ? formatValue(r.value, r.unit, r.decimals) : (r.value ?? '—')}
        </span>
        {r.unit ? <span className="u">{r.unit}</span> : null}
        <Delta value={r.delta} />
      </div>
    );
  });
}

/* bare：不包 .stat-list（供 tabbed / stat-grid 用 display:contents 分组后跨组等分行高） */
function StatRows({ rows = [], rowStyle, bare = false }) {
  if (bare) return <StatRowList rows={rows} rowStyle={rowStyle} />;
  return (
    <div className="stat-list" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <StatRowList rows={rows} rowStyle={rowStyle} />
    </div>
  );
}

function RingLegend({ rows = [], unit, decimals, dense = false }) {
  return (
    <div
      className="ring-legend"
      style={{
        width: '100%',
        gap: dense ? '2px 8px' : '2px 10px',
        marginTop: dense ? 2 : 4,
        fontSize: dense ? 10 : undefined,
        lineHeight: 1.3
      }}
    >
      {rows.map((r, i) => (
        <span key={`${r.name}-${i}`}>
          <i style={{ background: PALETTE[i % PALETTE.length] }} />
          <span className="ellipsis" style={{ maxWidth: 108 }} title={r.name}>{r.name}</span>
          <b>{formatValue(r.value, r.unit || unit, r.decimals ?? decimals)}</b>
          {(r.unit || unit) ? <span className="muted tiny">{r.unit || unit}</span> : null}
          {r.delta !== undefined && r.delta !== null ? (
            <span
              className="tiny"
              style={{ color: Number(r.delta) >= 0 ? 'var(--green)' : 'var(--red)' }}
            >
              {Number(r.delta) >= 0 ? '▲' : '▼'}{Math.abs(Number(r.delta)).toFixed(1)}%
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

/* 面板内容：按后端 /api/screen/:scene 的 type 渲染（6 型 + plan 的指标预警） */
function PanelBody({ panel, extra, dense = false }) {
  const [tab, setTab] = useState(panel?.tabs?.[0]?.key);

  useEffect(() => {
    if (panel?.tabs && !panel.tabs.some((t) => t.key === tab)) setTab(panel.tabs[0]?.key);
  }, [panel, tab]);

  if (!panel) return null;

  if (panel.type === 'stat-list') {
    const rows = panel.rows || [];
    return <StatRows rows={rows} rowStyle={rowStyleFor(rows.length)} />;
  }

  if (panel.type === 'tabbed') {
    const cur = panel.tabs?.find((t) => t.key === tab) || panel.tabs?.[0];
    const groups = cur?.groups || [];
    const total = groups.reduce((s, g) => s + (g.rows?.length || 0), 0);
    const rowStyle = rowStyleFor(total);
    return (
      <>
        <Tabs
          items={(panel.tabs || []).map((t) => ({ key: t.key, label: t.label }))}
          value={cur?.key}
          onChange={setTab}
        />
        <div className="stat-list" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {groups.map((g) => (
            <div key={g.title} style={{ display: 'contents' }}>
              <div
                style={{
                  flex: '0 0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px 0 0',
                  fontSize: 11,
                  lineHeight: 1.3,
                  color: 'var(--text-4)'
                }}
              >
                {g.title}
              </div>
              <StatRows rows={g.rows || []} rowStyle={rowStyle} bare />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (panel.type === 'ring-split') {
    const parts = panel.rows || [];
    const ring = panel.ring || {};
    return (
      <div
        className="ring-card"
        style={{ flex: '1 1 auto', flexDirection: 'column', minHeight: 0, width: '100%', padding: 0, gap: 2 }}
      >
        {ring.label ? (
          <div className="tiny muted" style={{ textAlign: 'center' }}>{ring.label}</div>
        ) : null}
        <div style={{ display: 'flex', flex: '1 1 auto', minHeight: dense ? 56 : 72, width: '100%' }}>
          <Chart
            height="100%"
            style={{ flex: '1 1 auto', minHeight: 0 }}
            label={`${panel.title || ''}占比`}
            option={donutOption(parts, {
              center: ring.center ?? ring.total,
              unit: ring.unit,
              decimals: ring.decimals
            })}
          />
        </div>
        <RingLegend rows={parts} unit={ring.unit} decimals={ring.decimals} dense={dense} />
      </div>
    );
  }

  if (panel.type === 'tabbed-ring') {
    const cur = panel.tabs?.find((t) => t.key === tab) || panel.tabs?.[0];
    const parts = cur?.parts || [];
    return (
      <>
        <Tabs
          items={(panel.tabs || []).map((t) => ({ key: t.key, label: t.label }))}
          value={cur?.key}
          onChange={setTab}
        />
        <div
          className="ring-card"
          style={{ flex: '1 1 auto', flexDirection: 'column', minHeight: 0, width: '100%', padding: 0, gap: 2 }}
        >
          <div style={{ display: 'flex', flex: '1 1 auto', minHeight: dense ? 56 : 72, width: '100%' }}>
            <Chart
              height="100%"
              style={{ flex: '1 1 auto', minHeight: 0 }}
              label={`${cur?.label || ''}结构`}
              option={donutOption(parts, { center: cur?.total, unit: cur?.unit, decimals: cur?.decimals })}
            />
          </div>
          <RingLegend rows={parts} unit={cur?.unit} decimals={cur?.decimals} dense={dense} />
        </div>
      </>
    );
  }

  if (panel.type === 'stat-grid') {
    const blocks = panel.blocks || [];
    const total = blocks.reduce((s, b) => s + (b.items?.length || 0), 0);
    const rowStyle = rowStyleFor(total);
    return (
      <div className="stat-list" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {blocks.map((b) => (
          <div key={b.title} style={{ display: 'contents' }}>
            <div
              style={{
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 0 0',
                fontSize: 11,
                lineHeight: 1.3,
                fontWeight: 600,
                color: 'var(--text-2)'
              }}
            >
              <span
                className="dot"
                style={{ background: b.icon === 'alert' ? 'var(--orange)' : 'var(--cyan)' }}
              />
              {b.title}
            </div>
            <StatRows
              rows={(b.items || []).map((it) => ({
                label: it.label, sub: it.sub, value: it.value, unit: it.unit, tone: it.tone
              }))}
              rowStyle={rowStyle}
              bare
            />
          </div>
        ))}
      </div>
    );
  }

  if (panel.type === 'pie') {
    const rows = panel.rows || [];
    return (
      <div className="pie-panel">
        <Chart
          label={`${panel.title || ''}占比`}
          height={152}
          style={{ flex: '0 0 152px' }}
          option={pieOption(rows, { unit: panel.unit || '', radius: ['0%', '74%'] })}
        />
        <ul className="pie-legend">
          {rows.map((r, i) => (
            <li key={r.name}>
              <i style={{ background: COLORS[i % COLORS.length] }} />
              <span className="n">{r.name}</span>
              <b className="v">{formatValue(r.value, panel.unit, 1)}</b>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (panel.type === 'bars') {
    return (
      <Chart
        height="100%"
        style={{ flex: '1 1 auto', minHeight: 0 }}
        label={`${panel.title || ''}分布`}
        option={barOption(panel.rows || [], { unit: panel.unit || '', colorBy: true })}
      />
    );
  }

  return null;
}

function Panel({ title, action, children, bodyStyle, style }) {
  return (
    <section className="panel" style={style}>
      <header className="panel-head">
        <h2 className="panel-title">{title}</h2>
        {action}
      </header>
      <div className="panel-body" style={bodyStyle}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ 测距 / 测面 */
const R_EARTH = 6371;
function haversine(a, b) {
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const la1 = (a[1] * Math.PI) / 180;
  const la2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
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

/* ------------------------------------------------------------------ 列表取值 */
const LIST_KEYS = {
  online: ['online', 'green', 'deposit', 'right'],
  green: ['green', 'online'],
  deposit: ['deposit', 'online'],
  right: ['right', 'online'],
  hazard: ['hazard', 'alert'],
  topo: ['topo', 'zone']
};

function pickListArray(raw, theme, scene) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  const tries = [...(LIST_KEYS[theme] || []), theme, scene, 'online', 'list'];
  for (const k of tries) {
    if (Array.isArray(raw[k])) return raw[k];
  }
  return Object.values(raw).find((v) => Array.isArray(v)) || [];
}

/* 底部列表的展开/收起开关：只显示条数 + 箭头，hover 用描边反馈；浮层内以静态流式呈现，保证收起入口常驻 */
function ListToggle({ count, open = false, onClick, label = '列表' }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      className="dash-list-toggle"
      onClick={onClick}
      aria-expanded={open}
      title={open ? `收起${label}` : `展开${label}（${count} 条）`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...(open ? { position: 'static', left: 'auto', bottom: 'auto', transform: 'none' } : null),
        borderColor: hover ? 'rgba(73, 195, 255, 0.8)' : 'rgba(73, 195, 255, 0.45)',
        color: hover ? 'var(--text-1)' : undefined,
        background: hover ? 'rgba(10, 32, 64, 0.95)' : undefined
      }}
    >
      <span className="dash-list-toggle-text">{label}</span>
      <Ic icon={open ? ChevronDownIcon : ChevronUpIcon} size={14} />
      <span className="sr-only">{open ? `收起${label}` : `展开${label}`}</span>
    </button>
  );
}

/* v4 专题标题牌（对应参考截图的地图顶部居中矩形牌） */
const PLATE_CLIP = 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))';

const FLOAT_DARK = 'rgba(5,14,28,.78)';
/* v4 地图 chrome：深蓝玻璃 + 青边 */
const CHROME_BG = 'linear-gradient(180deg, rgba(14,52,90,.94), rgba(8,30,54,.94))';

/* ------------------------------------------------------------------ 页面 */
export default function Cockpit({ sceneKey }) {
  const params = useParams();
  const nav = useNavigate();
  const { user, toast } = useApp();
  const routeScene = sceneKey || params.scene || 'dashboard';
  /* v7：6 个业务专题全部收进驾驶舱，用 Tab 切换（不再走二级页面） */
  const [scene, setScene] = useState(routeScene);
  useEffect(() => {
    setScene(routeScene);
  }, [routeScene]);
  const meta0 = SCENE_META[scene] || SCENE_META.dashboard;

  const [code, setCode] = useState('510000');
  const [theme, setTheme] = useState(meta0.theme);
  const [layerOpen, setLayerOpen] = useState(false);
  const [toolOpen, setToolOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [sel, setSel] = useState(null);
  const [kw, setKw] = useState('');
  const [stages, setStages] = useState({});
  const [measure, setMeasure] = useState({ mode: 'none', points: [], closed: false });
  const [locate, setLocate] = useState('');

  /* 视口：≤1360 收成单列，避免三栏把面板压到内容以下（与 pages.css 断点协同） */
  const [vw, setVw] = useState(() => (typeof window === 'undefined' ? 1920 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const narrow = vw <= 1360;
  /* 1361–1500 档：右栏三块面板高度被压到 ~185，环图卡片需收紧以不裁切 */
  const midRange = vw >= 1361 && vw <= 1500;
  const isPhone = vw < 620;

  useEffect(() => {
    setTheme(meta0.theme);
    setSel(null);
    setStages({});
  }, [scene, meta0.theme]);

  const regionsQ = useFetch(() => metaApi.regions(), []);
  const regionMap = useMemo(() => {
    const m = new Map();
    (regionsQ.data?.list || []).forEach((r) => m.set(String(r.code), r));
    return m;
  }, [regionsQ.data]);

  const screenQ = useFetch(() => screenApi.get(scene, { code }), [scene, code]);
  const pointsQ = useFetch(() => screenApi.layers(theme, { code }), [theme, code]);

  const data = screenQ.data;
  const allPoints = pointsQ.data?.list || [];

  const points = useMemo(() => {
    if (theme !== 'deposit') return allPoints;
    const keys = Object.keys(stages).filter((k) => stages[k]);
    if (!keys.length) return allPoints;
    return allPoints.filter((p) => keys.includes(p.stage));
  }, [allPoints, theme, stages]);

  const scopeName = code === '510000' ? '全省' : regionMap.get(String(code))?.name || '四川省';
  const themeLabel = THEMES.find((t) => t.key === theme)?.label || meta0.title;
  const mapTitle = `${scopeName}${themeLabel}分布专题图`;
  const columns = LIST_COLUMNS[scene] || LIST_COLUMNS.dashboard;

  const list = useMemo(() => {
    const rows = pickListArray(data?.list, theme, scene);
    if (!kw.trim()) return rows;
    const k = kw.trim();
    return rows.filter((r) => JSON.stringify(r).includes(k));
  }, [data, kw, theme, scene]);

  const bubbles = useMemo(() => {
    const raw = data?.map?.bubbles || [];
    const isProvince = String(code) === '510000';
    const isCity = String(code).endsWith('00') && !isProvince;
    if (isProvince) {
      /* 省级视角：区县气泡按地市聚合（11 个地市），坐标取行政区中心 */
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
    if (isCity) {
      return raw.filter((b) => String(b.code).slice(0, 4) === String(code).slice(0, 4)
        && String(b.code) !== String(code));
    }
    return raw.filter((b) => String(b.code) === String(code));
  }, [data, code, regionMap]);

  const drill = useCallback((adcode) => {
    const c = String(adcode || '');
    if (!/^\d{6}$/.test(c)) return;
    setCode(c);
    setSel(null);
    setMeasure({ mode: 'none', points: [], closed: false });
    setToolOpen(false);
    setLayerOpen(false);
  }, []);

  const resetMeasure = () => setMeasure({ mode: 'none', points: [], closed: false });

  const breadcrumb = useMemo(() => {
    const c = String(code);
    if (c === '510000') return [];
    const path = [{ code: '510000', name: '四川省' }];
    if (!c.endsWith('0000')) {
      const city = regionMap.get(`${c.slice(0, 4)}00`);
      if (city) path.push({ code: city.code, name: city.name });
      if (!c.endsWith('00')) {
        const county = regionMap.get(c);
        if (county) path.push({ code: county.code, name: county.name });
      }
    }
    return path;
  }, [code, regionMap]);

  const regionOptions = useMemo(() => {
    const regionList = regionsQ.data?.list || [];
    const opts = [{ code: '510000', name: '四川省（全省）' }];
    regionList.filter((r) => r.level === 'city').forEach((r) => opts.push({ code: r.code, name: r.name }));
    regionList
      .filter((r) => r.level === 'county' && String(r.code).slice(0, 4) === String(code).slice(0, 4))
      .forEach((r) => opts.push({ code: r.code, name: r.name }));
    if (!opts.some((o) => String(o.code) === String(code))) {
      const cur = regionMap.get(String(code));
      if (cur) opts.unshift({ code: cur.code, name: cur.name });
    }
    const seen = new Set();
    return opts.filter((o) => {
      if (seen.has(String(o.code))) return false;
      seen.add(String(o.code));
      return true;
    });
  }, [regionsQ.data, code, regionMap]);

  /* -------- 地图交互 -------- */
  const onMapClick = useCallback((pt) => {
    if (!Array.isArray(pt) || pt.length < 2) return;
    setMeasure((m) => {
      if (m.mode === 'none') return m;
      const pts = [...m.points, pt];
      if (m.mode === 'dist') return { ...m, points: pts.slice(-2) };
      return { ...m, points: pts, closed: pts.length >= 3 };
    });
  }, []);

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
    if (measure.mode === 'dist') return `测距：已取 ${pts.length} 点，共需 2 点`;
    if (measure.mode === 'area') return `测面：已取 ${pts.length} 点，至少 3 点`;
    return '';
  }, [measure]);

  const exportPng = () => {
    const svg = document.querySelector('[data-geo-svg]');
    if (!svg) {
      const canvasEl = document.querySelector('[data-amap-canvas] canvas');
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

  const locateGo = () => {
    const nums = locate.split(/[,，\s]+/).map(Number).filter((n) => Number.isFinite(n));
    if (nums.length < 2) {
      toast('请输入「经度,纬度」，例如 120.09,30.89', 'err');
      return;
    }
    setMeasure({ mode: 'dist', points: [[nums[0], nums[1]]], closed: false });
    const near = [...(points || [])]
      .filter((p) => p.lon && p.lat)
      .map((p) => ({ p, d: haversine([nums[0], nums[1]], [Number(p.lon), Number(p.lat)]) }))
      .sort((a, b) => a.d - b.d)[0];
    toast(near ? `已定位，最近要素：${near.p.name}（${nf(near.d, 2)} km）` : '已定位');
  };

  const popupRows = (POPUP_FIELDS[theme] || POPUP_FIELDS.online)
    .filter(([k]) => sel?.[k] !== undefined && sel?.[k] !== null);

  const leftPanels = data?.left || [];
  const rightPanels = data?.right || [];
  /* 宽屏：左右栏面板等高（flex-basis 0）；窄屏：高度随内容，避免溢出裁切 */
  const panelStyle = narrow ? undefined : { flex: '1 1 0' };
  const bodyStyleFor = (p) => {
    if (p.type === 'bars') return { display: 'flex', flexDirection: 'column', minHeight: 0, paddingBottom: 8 };
    if (p.type === 'ring-split' || p.type === 'tabbed-ring') {
      /* 1361–1500 档允许面板内部滚动，避免 4px 级裁切 */
      return { display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: midRange ? 'auto' : 'hidden', overflowX: 'hidden' };
    }
    return { overflow: 'auto' };
  };
  const indicators = data?.extra?.indicators || [];
  const warnCount = data?.extra?.warnCount;

  const tableMinWidth = columns.reduce((s, c) => s + (c.width || (c.flex ? 220 : 100)), 48);

  /* 地图 chrome 布局：专题牌顶部居中，左上控件竖排（参考截图口径） */
  const plateH = isPhone ? 32 : 40;
  const plateTop = isPhone ? 6 : 8;
  const chromeTop = isPhone ? plateTop + plateH + 6 : 10;
  const ctrlTop = chromeTop + (breadcrumb.length ? 26 : 0);
  const leftThemeLabel = THEMES.find((t) => t.key === meta0.theme)?.label || '在线矿山';

  const panelSkeleton = (n) => [0, 1, 2].slice(0, n).map((i) => (
    <section className="panel" key={`sk-${i}`}>
      <header className="panel-head"><h2 className="panel-title">加载中</h2></header>
      <div className="panel-body">
        <div className="skeleton">
          <span className="skeleton-line" />
          <span className="skeleton-line" />
          <span className="skeleton-line" />
        </div>
      </div>
    </section>
  ));

  /* 底部列表浮层：桌面挂在 .dash 底部；窄屏改为地图区域内 absolute（见地图 children），
   * 高度由外层容器约束（≤70vh 且不超出地图可视区），首屏可见。 */
  const listFloat = (extraStyle) => (
    <div
      className="dash-list-float"
      role="dialog"
      aria-label={`${meta0.title}列表`}
      style={{
        background: 'rgba(5,16,32,0.98)',
        border: '1px solid rgba(73,195,255,0.22)',
        borderRadius: 8,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        ...extraStyle
      }}
    >
      <header
        className="panel-head"
        style={{ minHeight: 38, borderBottom: '1px solid rgba(73,195,255,0.22)' }}
      >
        <h2 className="panel-title">
          {meta0.title}列表
          <span className="muted tiny" style={{ fontWeight: 400 }}>· {list.length} 条</span>
        </h2>
        <div className="row center gap-2">
          <label className="input-icon" style={{ width: isPhone ? 92 : 180 }}>
            <Ic icon={Search01Icon} size={13} />
            <input
              className="input"
              style={{ height: 28, fontSize: 12 }}
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              placeholder="筛选当前列表"
              aria-label="筛选当前列表"
            />
          </label>
          <button type="button" className="btn btn-text btn-sm" onClick={exportCsv}>
            <Ic icon={Download01Icon} size={12} /> 导出
          </button>
          <button type="button" className="btn btn-text btn-sm" onClick={() => setListOpen(false)}>
            收起
          </button>
        </div>
      </header>
      <div
        className="panel-body"
        style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
      >
        <div
          className="table-wrap"
          style={{ flex: '1 1 auto', minHeight: 0, border: 0, borderRadius: 0, overflow: 'auto' }}
        >
          <table className="data-table is-dense" style={{ minWidth: tableMinWidth, width: '100%', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 56 }} />
              {columns.map((c) => (
                <col key={c.key} style={c.flex ? undefined : { width: c.width || 110 }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="num" style={{ width: 48 }}>序号</th>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={c.align === 'right' ? 'num' : ''}
                    style={c.width ? { width: c.width } : undefined}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 200).map((row, i) => (
                <tr
                  key={row.id ?? i}
                  onClick={() => setSel(row)}
                  className={sel && sel.id === row.id ? 'selected' : ''}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="num">{i + 1}</td>
                  {columns.map((c) => (
                    <td key={c.key} className={c.align === 'right' ? 'num' : ''}>
                      {c.align === 'right' && Number.isFinite(Number(row[c.key]))
                        ? int(row[c.key])
                        : row[c.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
              {list.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1}>
                    <div className="table-empty">当前视角下没有要素</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 0 8px'
        }}
      >
        <ListToggle
          count={list.length}
          open
          onClick={() => setListOpen(false)}
          label={LIST_LABEL[scene] || `${meta0.title}列表`}
        />
      </div>
    </div>
  );

  return (
    <div className="dash-wrap">
      <nav className="dash-tabs" role="tablist" aria-label="驾驶舱专题">
        {SCENE_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={scene === t.key}
            title={t.hint}
            className={`dash-tab${scene === t.key ? ' is-on' : ''}`}
            onClick={() => {
              if (t.key === scene) return;
              setScene(t.key);
              setSel(null);
              setStages({});
              setMeasure({ mode: 'none', points: [], closed: false });
            }}
          >
            {t.name}
          </button>
        ))}
      </nav>
      <div
        className="dash"
        style={narrow ? {
          minHeight: 'calc(100vh - var(--header-h) - var(--nav-h) - 40px)',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gridTemplateRows: 'minmax(0, 1fr)'
        } : {
          minHeight: 'calc(100vh - var(--header-h) - var(--nav-h) - 40px)',
          gridTemplateRows: 'minmax(0, 1fr)'
        }}
      >
      {/* ---------------- 左栏 ---------------- */}
      <aside className="dash-col--l">
        {leftPanels.map((p) => (
          <Panel
            key={p.key}
            title={p.title}
            action={(
              <button type="button" className="panel-more" onClick={() => nav((DETAIL_ROUTE[scene] || {})[p.key] || '/hub')}>
                详情 <Ic icon={ChevronDownIcon} size={10} />
              </button>
            )}
            bodyStyle={bodyStyleFor(p)}
            style={panelStyle}
          >
            <PanelBody panel={p} extra={data?.extra} dense={midRange} />
          </Panel>
        ))}
        {!data && panelSkeleton(3)}
      </aside>

      {/* ---------------- 地图 ---------------- */}
      <GeoMap
        code={code}
        onDrill={measure.mode === 'none' ? drill : undefined}
        bubbles={bubbles}
        points={points}
        selected={sel}
        onSelectPoint={(pt) => setSel(pt)}
        onSelectRegion={measure.mode === 'none' ? (b) => { if (b?.code) drill(b.code); } : undefined}
        selectedRegion={code}
        onMapClick={onMapClick}
        measure={measure}
        style={narrow ? { order: -1 } : undefined}
      >
        {/* 专题标题牌：扁平深色底 + 发丝边框 + 一段强调线（去发光/渐变） */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: plateTop,
            transform: 'translateX(-50%)',
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: isPhone ? 'calc(100% - 120px)' : 'min(440px, calc(100% - 200px))',
            height: plateH,
            padding: isPhone ? '0 12px' : '0 20px',
            background: 'rgba(7,22,40,.92)',
            border: '1px solid rgba(127,227,255,.22)',
            borderRadius: 6,
            boxShadow: '0 6px 18px rgba(0,0,0,.35)',
            pointerEvents: 'none',
            overflow: 'hidden'
          }}
        >
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: isPhone ? 13 : 20,
            fontWeight: 600,
            color: '#eaf4ff',
            letterSpacing: isPhone ? '0.5px' : '1px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {mapTitle}
          </span>
          <span style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 0,
            width: 72,
            height: 2,
            background: 'var(--cyan)'
          }} />
        </div>

        {breadcrumb.length > 0 ? (
          <nav className="breadcrumb" style={{ position: 'absolute', left: 12, top: chromeTop, zIndex: 6 }}>
            {breadcrumb.map((b, i) => {
              const last = i === breadcrumb.length - 1;
              return (
                <React.Fragment key={b.code}>
                  {i > 0 ? <span className="sep">/</span> : null}
                  {last ? (
                    <span>{b.name}</span>
                  ) : (
                    <a
                      href="#back"
                      onClick={(e) => { e.preventDefault(); setCode(b.code); setSel(null); resetMeasure(); }}
                    >
                      {b.name}
                    </a>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        ) : null}

        {/* 左上控件：区划下拉 + 在线矿山 / 重大任务 两个竖排按钮 */}
        <div style={{
          position: 'absolute',
          left: 12,
          top: ctrlTop,
          zIndex: 7,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 8
        }}>
          <div style={{ position: 'relative', width: 150, height: 34 }}>
            <select
              className="select"
              value={code}
              onChange={(e) => { setCode(e.target.value); setSel(null); resetMeasure(); }}
              aria-label="选择行政区划"
              style={{
                width: 150,
                height: 34,
                padding: '0 26px 0 10px',
                appearance: 'none',
                WebkitAppearance: 'none',
                fontSize: 12,
                color: '#dff0ff',
                background: CHROME_BG,
                border: '1px solid rgba(73,195,255,.55)',
                borderRadius: 2
              }}
            >
              {regionOptions.map((o) => (
                <option key={o.code} value={o.code}>{o.name}</option>
              ))}
            </select>
            <Ic
              icon={ChevronDownIcon}
              size={14}
              color="#7fe3ff"
              style={{ position: 'absolute', right: 8, top: 10, pointerEvents: 'none' }}
            />
          </div>
        </div>

        {/* 右上：工具 / 图层 方形按钮（窄屏下移到标题牌下方，避免与牌面重叠） */}
        <div style={{ position: 'absolute', right: 12, top: isPhone ? 44 : 10, zIndex: 8, display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="icon-btn"
            aria-label="工具"
            aria-pressed={toolOpen}
            style={{
              width: 36,
              height: 36,
              borderRadius: 2,
              background: 'rgba(12,44,78,.85)',
              borderColor: toolOpen ? 'var(--cyan)' : 'rgba(73,195,255,.45)',
              color: toolOpen ? 'var(--cyan)' : '#cfe4ff'
            }}
            onClick={() => { setToolOpen((v) => !v); setLayerOpen(false); }}
          >
            <Ic icon={ToolsIcon} size={16} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="图层控制"
            aria-pressed={layerOpen}
            style={{
              width: 36,
              height: 36,
              borderRadius: 2,
              background: 'rgba(12,44,78,.85)',
              borderColor: layerOpen ? 'var(--cyan)' : 'rgba(73,195,255,.45)',
              color: layerOpen ? 'var(--cyan)' : '#cfe4ff'
            }}
            onClick={() => { setLayerOpen((v) => !v); setToolOpen(false); }}
          >
            <Ic icon={Layers01Icon} size={16} />
          </button>
        </div>

        {toolOpen && (
          <div className="card" style={{ position: 'absolute', right: 12, top: 54, width: 272, zIndex: 9 }}>
            <header className="card-head" style={{ minHeight: 40, padding: '0 12px' }}>
              <h3 className="card-title" style={{ fontSize: 13 }}>工具</h3>
              <button type="button" className="btn btn-text btn-sm" onClick={() => setToolOpen(false)}>关闭</button>
            </header>
            <div className="card-body" style={{ padding: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button
                  type="button"
                  className="btn btn-text btn-sm"
                  style={{ justifyContent: 'flex-start', gap: 8 }}
                  onClick={() => setMeasure({ mode: 'dist', points: [], closed: false })}
                >
                  <Ic icon={RulerIcon} size={14} /> 测距
                </button>
                <button
                  type="button"
                  className="btn btn-text btn-sm"
                  style={{ justifyContent: 'flex-start', gap: 8 }}
                  onClick={() => setMeasure({ mode: 'area', points: [], closed: false })}
                >
                  <Ic icon={FilterIcon} size={14} /> 测面
                </button>
                <div style={{ margin: '6px 0 2px' }}>
                  <div className="tiny muted" style={{ marginBottom: 4 }}>坐标定位（经度,纬度）</div>
                  <div className="row gap-2">
                    <input
                      className="input"
                      style={{ height: 28, flex: 1, minWidth: 0, fontSize: 12 }}
                      value={locate}
                      onChange={(e) => setLocate(e.target.value)}
                      placeholder="120.09,30.89"
                      aria-label="坐标定位"
                    />
                    <button type="button" className="btn btn-sm" onClick={locateGo}>定位</button>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-text btn-sm"
                  style={{ justifyContent: 'flex-start', gap: 8 }}
                  onClick={exportPng}
                >
                  <Ic icon={Camera01Icon} size={14} /> 截图导出 PNG
                </button>
                <button
                  type="button"
                  className="btn btn-text btn-sm"
                  style={{ justifyContent: 'flex-start', gap: 8 }}
                  onClick={exportCsv}
                >
                  <Ic icon={Download01Icon} size={14} /> 导出当前列表
                </button>
                <button
                  type="button"
                  className="btn btn-text btn-sm"
                  style={{ justifyContent: 'flex-start', gap: 8 }}
                  onClick={() => { setCode(user?.region_code || '510000'); setSel(null); resetMeasure(); }}
                >
                  <Ic icon={Refresh01Icon} size={14} /> 回到本辖区视角
                </button>
              </div>
            </div>
          </div>
        )}

        {layerOpen && (
          <div className="card" style={{ position: 'absolute', right: 12, top: 54, width: 272, zIndex: 9 }}>
            <header className="card-head" style={{ minHeight: 40, padding: '0 12px' }}>
              <h3 className="card-title" style={{ fontSize: 13 }}>图层控制</h3>
              <button
                type="button"
                className="btn btn-text btn-sm"
                onClick={() => { setStages({}); setTheme(meta0.theme); setSel(null); }}
              >
                清除
              </button>
            </header>
            <div className="card-body" style={{ padding: 10 }}>
              <div className="tiny muted" style={{ margin: '0 0 2px', letterSpacing: '.04em' }}>专题图层</div>
              {THEMES.map((t) => (
                <label
                  key={t.key}
                  className="row center gap-2"
                  style={{ minHeight: 26, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer' }}
                >
                  <input type="checkbox" checked={theme === t.key} onChange={() => setTheme(t.key)} />
                  <span>{t.label}</span>
                  <span className="grow" />
                  {theme === t.key ? <span className="tiny muted">{points.length} 个要素</span> : null}
                </label>
              ))}
              <div className="tiny muted" style={{ margin: '10px 0 2px', letterSpacing: '.04em' }}>矿产地（按勘查程度）</div>
              {['待查', '在查', '查明', '规划'].map((st) => (
                <label
                  key={st}
                  className="row gap-2"
                  style={{ minHeight: 26, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer', justifyContent: 'flex-start' }}
                >
                  <input
                    type="checkbox"
                    checked={!!stages[st]}
                    onChange={(e) => {
                      setStages((prev) => ({ ...prev, [st]: e.target.checked }));
                      setTheme('deposit');
                      setSel(null);
                    }}
                  />
                  <span>{st}矿产地</span>
                </label>
              ))}
              <div className="tiny muted" style={{ margin: '10px 0 2px', letterSpacing: '.04em' }}>基础参考图层</div>
              {['清查家底', '三线（生态保护红线）', '辅助规划范围', '省级规划', '市级规划', '县级规划'].map((n) => (
                <label
                  key={n}
                  className="row center gap-2"
                  style={{ minHeight: 24, fontSize: 12, color: 'var(--text-4)', cursor: 'not-allowed' }}
                >
                  <input type="checkbox" disabled />
                  <span>{n}</span>
                  <span className="grow" />
                  <span className="tiny muted">待接底图</span>
                </label>
              ))}
              <p className="muted tiny" style={{ lineHeight: 1.6, margin: '8px 0 0' }}>
                基础参考图层需接入省级二三维底图服务后开放；当前以真实行政区划边界与要素点位呈现。
              </p>
            </div>
          </div>
        )}

        {measureText && (
          <div style={{
            position: 'absolute',
            left: '50%',
            bottom: narrow ? 56 : 14,
            transform: 'translateX(-50%)',
            zIndex: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            maxWidth: 'calc(100% - 24px)',
            padding: '6px 10px',
            fontSize: 12,
            color: 'var(--text-1)',
            whiteSpace: 'nowrap',
            background: 'rgba(5,14,28,.86)',
            border: '1px solid var(--line-strong)',
            borderRadius: 8
          }}>
            <span>{measureText}</span>
            {measure.mode !== 'none' ? (
              <button type="button" className="btn btn-text btn-sm" onClick={resetMeasure}>结束</button>
            ) : null}
          </div>
        )}

        {sel && (
          <div
            className="card"
            style={{
              position: 'absolute',
              right: 12,
              bottom: narrow ? 56 : 12,
              zIndex: 9,
              width: 'min(300px, calc(100% - 24px))',
              maxHeight: 'calc(100% - 72px)'
            }}
          >
            <header className="card-head" style={{ minHeight: 40, padding: '0 12px' }}>
              <h3 className="card-title" style={{ fontSize: 13, minWidth: 0 }}>
                <span className="ellipsis" title={sel.name || sel.mine_name || ''}>
                  {sel.name || sel.mine_name || '要素详情'}
                </span>
              </h3>
              <button type="button" className="icon-btn icon-btn--sm" aria-label="关闭" onClick={() => setSel(null)}>
                ✕
              </button>
            </header>
            <div className="card-body" style={{ padding: 10, overflow: 'auto' }}>
              <div className="desc-list">
                {popupRows.map(([k, label]) => (
                  <div className="desc-row" key={k}>
                    <span className="desc-key">{label}</span>
                    <span className="desc-value">{sel[k] === '' ? '—' : String(sel[k])}</span>
                  </div>
                ))}
                {popupRows.length === 0 ? <div className="tiny muted">该要素暂无扩展字段</div> : null}
              </div>

              {theme === 'online' ? (
                <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  <span className={`tag ${sel.video_connected ? 'tag--green' : 'tag--grey'}`}>
                    <Ic icon={Camera01Icon} size={12} /> 视频监控 · {sel.video_connected ? '已接入' : '未接入'}
                  </span>
                  <span className={`tag ${sel.monitor_connected ? 'tag--green' : 'tag--grey'}`}>
                    <Ic icon={ToolsIcon} size={12} /> 监测设备 · {sel.monitor_connected ? '已接入' : '未接入'}
                  </span>
                  <span className={`tag ${sel.warn_connected ? 'tag--green' : 'tag--grey'}`}>
                    <Ic icon={Location01Icon} size={12} /> 监测预警 · {sel.warn_connected ? '已接入' : '未接入'}
                  </span>
                </div>
              ) : null}

              {sel.id ? (
                <button
                  type="button"
                  className="btn btn-text btn-sm"
                  style={{ marginTop: 8, gap: 4 }}
                  onClick={() => nav(`/archive/${sel.id}`)}
                >
                  更多 <Ic icon={More01Icon} size={12} />
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* 窄屏：列表按钮固定在「地图可视区」底部居中（bottom 12 相对 .dash-map），
            浮层也限制在地图区域内（高度 ≤70vh 且不超出地图），首屏即可操作 */}
        {narrow ? (
          !listOpen ? (
            <div style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 12,
              zIndex: 28,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ pointerEvents: 'auto' }}>
                <ListToggle
                  count={list.length}
                  open={false}
                  onClick={() => setListOpen(true)}
                  label={LIST_LABEL[scene] || `${meta0.title}列表`}
                />
              </div>
            </div>
          ) : (
            <div style={{
              position: 'absolute',
              left: 8,
              right: 8,
              top: 8,
              bottom: 52,
              zIndex: 28,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '70vh'
            }}>
              {listFloat({ height: '100%' })}
            </div>
          )
        ) : null}

      </GeoMap>

      {/* ---------------- 右栏 ---------------- */}
      <aside className="dash-col--r">
        {rightPanels.map((p) => (
          <Panel
            key={p.key}
            title={p.title}
            action={(
              <button type="button" className="panel-more" onClick={() => nav((DETAIL_ROUTE[scene] || {})[p.key] || '/hub')}>
                详情 <Ic icon={ChevronDownIcon} size={10} />
              </button>
            )}
            bodyStyle={bodyStyleFor(p)}
            style={panelStyle}
          >
            <PanelBody panel={p} extra={data?.extra} dense={midRange} />
            {p.key === 'warn' && indicators.length ? (
              <div style={{ marginTop: 10, borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                <div className="panel-title" style={{ fontSize: 12, marginBottom: 2, display: 'flex' }}>
                  指标执行预警
                  <span className="muted tiny" style={{ fontWeight: 400 }}>
                    {warnCount ? `· 黄牌 ${warnCount} 项` : ''}
                  </span>
                </div>
                <Chart
                  height={Math.max(108, Math.min(6, indicators.length) * 26 + 14)}
                  style={{ minHeight: 0 }}
                  label="指标执行预警"
                  option={indicatorOption(indicators.slice(0, 6))}
                />
              </div>
            ) : null}
          </Panel>
        ))}
        {!data && panelSkeleton(2)}
      </aside>

      {/* ---------------- 底部列表：桌面挂在 .dash 底部；窄屏改为地图区域内浮层 ---------------- */}
      {!narrow ? (
        <section className={`dash-list${listOpen ? ' is-open' : ''}`} aria-label={`${meta0.title}列表`}>
          {!listOpen
            ? <ListToggle count={list.length} open={false} onClick={() => setListOpen(true)} label={LIST_LABEL[scene] || `${meta0.title}列表`} />
            : listFloat()}
        </section>
      ) : null}
      </div>
    </div>
  );
}
