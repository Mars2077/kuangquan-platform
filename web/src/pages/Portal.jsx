import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ic } from '../components/Icon';
import { useApp } from '../store.jsx';
import { ArrowRight01Icon, Task01Icon } from '@hugeicons/core-free-icons';

/* ---------------- 缩略示意图（自绘，不用外部截屏） ---------------- */
function Art({ kind, cover = false }) {
  const vb = kind === 'dashboardBig' ? '0 0 240 240' : '0 0 240 120';
  return (
    <svg
      viewBox={vb}
      preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
      aria-hidden="true"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id={`g-${kind}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10406e" />
          <stop offset="100%" stopColor="#071c33" />
        </linearGradient>
      </defs>
      {kind === 'dashboardBig' && <DashboardBigArt />}
      {kind !== 'dashboardBig' && <rect x="0" y="0" width="240" height="120" fill={`url(#g-${kind})`} />}
      {kind === 'dashboard' && (
        <>
          <rect x="8" y="8" width="52" height="104" rx="3" fill="rgba(12,44,80,0.85)" stroke="rgba(73,195,255,0.45)" />
          <rect x="180" y="8" width="52" height="104" rx="3" fill="rgba(12,44,80,0.85)" stroke="rgba(73,195,255,0.45)" />
          <rect x="66" y="8" width="108" height="104" rx="3" fill="rgba(6,28,52,0.9)" stroke="rgba(73,195,255,0.3)" />
          <ellipse cx="120" cy="60" rx="44" ry="38" fill="rgba(31,110,170,0.35)" stroke="rgba(126,214,255,0.7)" />
          <ellipse cx="120" cy="60" rx="52" ry="46" fill="none" stroke="rgba(73,195,255,0.22)" strokeDasharray="3 6" />
          <circle cx="108" cy="52" r="2.4" fill="#7fe3ff" />
          <circle cx="132" cy="66" r="2.4" fill="#35d39a" />
          <circle cx="122" cy="44" r="2.4" fill="#ffcc44" />
          {[20, 34, 48, 62, 76, 90].map((y, i) => (
            <rect key={y} x="16" y={y} width={i % 2 ? 36 : 28} height="4" rx="2" fill="rgba(126,214,255,0.5)" />
          ))}
          <rect x="188" y="20" width="36" height="36" rx="18" fill="none" stroke="rgba(73,195,255,0.6)" strokeWidth="3" strokeDasharray="60 40" />
          {[70, 82, 94].map((y) => <rect key={y} x="188" y={y} width="34" height="4" rx="2" fill="rgba(126,214,255,0.42)" />)}
        </>
      )}
      {kind === 'map' && (
        <>
          <path d="M30 74 L58 44 L92 56 L104 88 L62 100 Z" fill="rgba(34,120,180,0.55)" stroke="rgba(126,214,255,0.8)" />
          <path d="M104 88 L92 56 L128 40 L164 58 L152 92 Z" fill="rgba(28,100,158,0.5)" stroke="rgba(126,214,255,0.6)" />
          <path d="M164 58 L128 40 L160 22 L198 34 L188 66 Z" fill="rgba(22,84,138,0.45)" stroke="rgba(126,214,255,0.5)" />
          <path d="M118 66 L132 60 L140 72 L126 80 Z" fill="rgba(255,95,87,0.28)" stroke="#ff6b62" strokeDasharray="3 3" />
          {[[70, 66], [148, 70], [176, 46]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.6" fill="#7fe3ff" />
          ))}
        </>
      )}
      {kind === 'deposit' && (
        <>
          {[0, 1, 2, 3].map((r) => (
            <g key={r}>
              {[0, 1, 2, 3, 4, 5].map((c) => (
                <rect key={c} x={16 + c * 36} y={14 + r * 24} width="28" height="16" rx="2"
                  fill={`rgba(46,168,255,${0.1 + ((r + c) % 3) * 0.12})`} stroke="rgba(126,214,255,0.22)" />
              ))}
            </g>
          ))}
          <rect x="88" y="38" width="64" height="40" rx="3" fill="none" stroke="#7fe3ff" strokeWidth="1.4" />
        </>
      )}
      {kind === 'plan' && (
        <>
          <path d="M20 90 L60 30 L110 66 L160 26 L220 74" fill="none" stroke="rgba(73,195,255,0.7)" strokeWidth="1.6" />
          <path d="M20 90 L60 30 L110 66 L160 26 L220 74 L220 108 L20 108 Z" fill="rgba(46,168,255,0.16)" />
          {[[60, 30], [110, 66], [160, 26]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#7fe3ff" />)}
          <rect x="16" y="14" width="46" height="6" rx="3" fill="rgba(126,214,255,0.55)" />
        </>
      )}
      {kind === 'rights' && (
        <>
          <rect x="18" y="18" width="86" height="84" rx="4" fill="rgba(12,46,82,0.8)" stroke="rgba(73,195,255,0.5)" />
          <rect x="112" y="18" width="86" height="84" rx="4" fill="rgba(12,46,82,0.6)" stroke="rgba(73,195,255,0.3)" />
          {[30, 42, 54, 66, 78].map((y, i) => (
            <rect key={y} x="28" y={y} width={i % 2 ? 64 : 52} height="4" rx="2" fill="rgba(126,214,255,0.5)" />
          ))}
          <path d="M122 56 L150 40 L178 62 L146 80 Z" fill="rgba(255,138,61,0.24)" stroke="#ff8a3d" strokeDasharray="3 3" />
        </>
      )}
      {kind === 'green' && (
        <>
          <path d="M120 96 C84 78 78 52 96 34 C110 20 132 24 140 40 C150 60 138 82 120 96 Z" fill="rgba(53,211,154,0.22)" stroke="rgba(53,211,154,0.85)" />
          <path d="M120 96 L120 44" stroke="rgba(53,211,154,0.7)" strokeWidth="1.2" />
          <circle cx="120" cy="52" r="4" fill="#35d39a" />
          {[40, 56, 72].map((y) => <rect key={y} x="176" y={y} width="48" height="4" rx="2" fill="rgba(126,214,255,0.45)" />)}
        </>
      )}
      {kind === 'supervise' && (
        <>
          <rect x="20" y="20" width="200" height="80" rx="4" fill="rgba(10,38,68,0.75)" stroke="rgba(73,195,255,0.35)" />
          {[34, 50, 66].map((y, i) => (
            <g key={y}>
              <circle cx="40" cy={y + 4} r="4" fill={i === 0 ? '#ff8a3d' : i === 1 ? '#ffcc44' : '#35d39a'} />
              <rect x="52" y={y} width={130 - i * 18} height="5" rx="2" fill="rgba(126,214,255,0.5)" />
            </g>
          ))}
          <rect x="164" y="82" width="44" height="10" rx="5" fill="rgba(255,138,61,0.3)" stroke="rgba(255,138,61,0.7)" />
        </>
      )}
      {kind === 'geology' && (
        <>
          <path d="M16 92 L52 40 L88 92 Z" fill="rgba(46,168,255,0.2)" stroke="rgba(126,214,255,0.7)" />
          <path d="M72 96 L116 30 L160 96 Z" fill="rgba(46,168,255,0.14)" stroke="rgba(126,214,255,0.55)" />
          <path d="M150 96 L188 48 L224 96 Z" fill="rgba(46,168,255,0.1)" stroke="rgba(126,214,255,0.4)" />
          {[24, 48, 72].map((x, i) => (
            <rect key={x} x={x} y={20 + i * 4} width="16" height="4" rx="2" fill="rgba(255,204,68,0.6)" />
          ))}
        </>
      )}
      {kind === 'legacy' && (
        <>
          <rect x="22" y="22" width="196" height="76" rx="4" fill="rgba(9,34,60,0.7)" stroke="rgba(73,195,255,0.28)" />
          {[34, 46, 58, 70, 82].map((y, i) => (
            <rect key={y} x="34" y={y} width={160 - i * 24} height="4" rx="2" fill="rgba(126,214,255,0.34)" />
          ))}
          <rect x="150" y="30" width="56" height="16" rx="8" fill="none" stroke="rgba(73,195,255,0.5)" />
        </>
      )}
    </svg>
  );
}

/* 大卡专用（竖向构图，贴合驾驶舱三栏） */
function DashboardBigArt() {
  const bar = (x, y, w, o = 0.42) => <rect x={x} y={y} width={w} height="3.4" rx="1.7" fill={`rgba(126,214,255,${o})`} />;
  return (
    <g>
      <rect x="0" y="0" width="240" height="240" fill="url(#g-dashboardBig)" />
      {/* 左栏 */}
      <rect x="8" y="10" width="62" height="106" rx="3" fill="rgba(12,44,80,0.82)" stroke="rgba(73,195,255,0.42)" />
      <rect x="8" y="124" width="62" height="106" rx="3" fill="rgba(12,44,80,0.82)" stroke="rgba(73,195,255,0.42)" />
      {[20, 32, 44, 56, 68, 80].map((y, i) => bar(16, y, i % 2 ? 40 : 30))}
      {[134, 146, 158, 170, 182, 194, 206].map((y, i) => bar(16, y, i % 3 === 0 ? 44 : 34, 0.34))}
      {/* 右栏 */}
      <rect x="170" y="10" width="62" height="106" rx="3" fill="rgba(12,44,80,0.82)" stroke="rgba(73,195,255,0.42)" />
      <rect x="170" y="124" width="62" height="106" rx="3" fill="rgba(12,44,80,0.82)" stroke="rgba(73,195,255,0.42)" />
      <circle cx="201" cy="46" r="21" fill="none" stroke="rgba(73,195,255,0.55)" strokeWidth="4" strokeDasharray="86 46" />
      {[22, 34, 46, 58, 70, 82, 94].map((y) => bar(180, y + 34, 40, 0.32))}
      <circle cx="201" cy="166" r="21" fill="none" stroke="rgba(255,138,61,0.6)" strokeWidth="4" strokeDasharray="60 72" />
      {[140, 152, 164, 176, 188, 200, 212].map((y) => bar(180, y, 40, 0.3))}
      {/* 中间地图 */}
      <rect x="76" y="10" width="88" height="220" rx="3" fill="rgba(6,28,52,0.9)" stroke="rgba(73,195,255,0.3)" />
      <ellipse cx="120" cy="104" rx="34" ry="30" fill="rgba(31,110,170,0.32)" stroke="rgba(126,214,255,0.65)" />
      <ellipse cx="120" cy="104" rx="41" ry="37" fill="none" stroke="rgba(73,195,255,0.2)" strokeDasharray="3 6" />
      {[[110, 96], [128, 108], [121, 88]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.4" fill={['#7fe3ff', '#35d39a', '#ffcc44'][i]} />
      ))}
      <rect x="80" y="150" width="80" height="6" rx="3" fill="rgba(46,168,255,0.5)" />
      {[164, 176, 188, 200, 212].map((y, i) => (
        <rect key={y} x="80" y={y} width={76 - i * 4} height="3" rx="1.5" fill="rgba(126,214,255,0.3)" />
      ))}
      <rect x="76" y="10" width="88" height="220" rx="3" fill="none" stroke="rgba(73,195,255,0.28)" />
    </g>
  );
}

const LEGACY = [
  { title: '四川省地矿综合监管系统', meta: '存量系统 · 已上线', kind: 'legacy', tag: '单点登录' },
  { title: '自然资源行政审批管理信息系统（矿政部分）', meta: '存量系统 · 已上线', kind: 'legacy', tag: '单点登录' },
  { title: '四川省矿业权网上交易系统', meta: '存量系统 · 已上线', kind: 'legacy', tag: '单点登录' }
];

const BUILT = [
  {
    key: 'dashboard', title: '数字驾驶舱', kind: 'dashboardBig', big: true,
    to: '/dashboard', desc: '省—市—县三级下钻，专题图与图层控制，矿山图斑一张图，关键指标一屏总览',
    icon: 'ChartLineData01Icon'
  },
  { key: 'supervise', title: '矿产资源智慧监管', kind: 'supervise', to: '/scene/supervise', desc: '智能巡查 · 动态监测 · 问题闭环' },
  { key: 'green', title: '绿色矿山管理', kind: 'green', to: '/scene/green', desc: '申报入库 · 动态提升 · 出库管理' },
  { key: 'deposit', title: '矿产地智能管理', kind: 'deposit', to: '/scene/deposit', desc: '一矿一档 · 清查 · 储量评审备案' },
  { key: 'plan', title: '保护与规划管理', kind: 'plan', to: '/scene/plan', desc: '规划成果 · 动态调整 · 压覆矿产' },
  { key: 'rights', title: '矿业权管理', kind: 'rights', to: '/scene/rights', desc: '一张图 · 净矿出让 · 全流程审查' },
  { key: 'geology', title: '数智地勘管理', kind: 'geology', to: '/scene/geology', desc: '攻深找盲 · 农业地质 · 地质文化' }
];

/* —— v4 参考截图样式（只能用内联样式，不改公共 CSS）——
   系统卡 = 缩略图铺满上半 + 底部深色标题条；四角斜切 8px；hover 亮边 + 上浮（沿 .tile 现有 transition） */
const CARD_CLIP = 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)';

const CARD_BASE = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 0,
  minHeight: 0,
  padding: 0,
  overflow: 'hidden',
  borderRadius: 0,
  textAlign: 'left',
  background: 'linear-gradient(180deg, rgba(12, 42, 76, 0.86), rgba(6, 20, 38, 0.92))',
  clipPath: CARD_CLIP
};

function SysCard({ title, kind, onClick, style, className = '' }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      className={`tile ${className}`.trim()}
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        ...CARD_BASE,
        border: `1px solid ${hover ? '#49c3ff' : 'rgba(64, 158, 255, 0.45)'}`,
        boxShadow: hover ? '0 0 0 1px rgba(73, 195, 255, 0.35), 0 10px 24px rgba(0, 0, 0, 0.38)' : 'none',
        ...style
      }}
    >
      <span style={{ position: 'relative', flex: '1 1 auto', minHeight: 96, overflow: 'hidden' }}>
        <span style={{ position: 'absolute', inset: 0, display: 'block' }}>
          <Art kind={kind} cover />
        </span>
      </span>
      <span
        style={{
          display: 'flex',
          flex: 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          minHeight: 44,
          padding: '8px 12px',
          borderTop: '1px solid rgba(64, 158, 255, 0.28)',
          background: 'linear-gradient(180deg, rgba(6, 20, 38, 0.2), rgba(6, 20, 38, 0.95))'
        }}
      >
        <span style={{ minWidth: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.3, color: '#fff' }}>{title}</span>
        <span
          style={{
            display: 'inline-flex',
            flex: 'none',
            color: hover ? '#7fe3ff' : 'rgba(127, 227, 255, 0.72)'
          }}
        >
          <Ic icon={ArrowRight01Icon} size={14} />
        </span>
      </span>
    </button>
  );
}

/* 分区标题：左侧 3px 青色竖条 + 16px 白字 + 向右延伸的淡青细线 */
function SectionHead({ title, right }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        paddingBottom: 8,
        borderBottom: '1px solid rgba(64, 158, 255, 0.2)'
      }}
    >
      <span
        style={{
          flex: 'none',
          width: 3,
          height: 16,
          background: 'var(--cyan)',
          boxShadow: '0 0 8px rgba(73, 195, 255, 0.9)'
        }}
      />
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '0.06em', color: '#fff' }}>{title}</h2>
      <span
        style={{
          flex: '1 1 auto',
          minWidth: 24,
          height: 1,
          background: 'linear-gradient(90deg, rgba(73, 195, 255, 0.55), rgba(73, 195, 255, 0))'
        }}
      />
      {right}
    </div>
  );
}

export default function Portal() {
  const nav = useNavigate();
  const { bootMeta, user } = useApp();
  const modules = bootMeta?.modules || [];
  const featureCount = modules.reduce((s, m) => s + m.features.length, 0);
  const roleName = bootMeta?.roles?.[user?.role] || '—';
  const hero = BUILT[0];
  const scenes = BUILT.slice(1);

  /* <900 时全部卡片按整行排列，驾驶舱不再跨两行 */
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const onChange = (e) => setCompact(e.matches);
    mq.addEventListener('change', onChange);
    setCompact(mq.matches);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div
      className="content"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-4)',
        flex: '1 1 auto',
        minHeight: 'calc(100vh - 172px)'
      }}
    >
      <header className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">平台分布</h1>
          <p className="page-desc">
            存量系统集成区与新建核心场景矩阵的统一入口。当前身份 {user?.name}（{roleName}），可按行政区划权限下钻至地市与区县。
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav('/battle')}>
            <Ic icon={Task01Icon} size={14} /> 重点任务作战图
          </button>
        </div>
      </header>

      <div className="kpi-row">
        <div className="kpi-card">
          <span className="kpi-label">存量系统</span>
          <b className="kpi-value">{LEGACY.length}<i className="kpi-unit">个</i></b>
          <span className="kpi-delta">单点登录 · 已上线</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">新建场景</span>
          <b className="kpi-value">{BUILT.length}<i className="kpi-unit">个</i></b>
          <span className="kpi-delta">驾驶舱 + 六大业务域</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">业务域</span>
          <b className="kpi-value">{modules.length}<i className="kpi-unit">个</i></b>
          <span className="kpi-delta">与《功能设计》逐条对应</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">业务功能点</span>
          <b className="kpi-value">{featureCount}<i className="kpi-unit">项</i></b>
          <span className="kpi-delta up">全部可实操验证</span>
        </div>
      </div>

      <div
        className="content-grid"
        style={{ flex: '1 1 auto', alignItems: 'stretch', gridTemplateRows: 'minmax(min-content, 1fr)' }}
      >
        <section className="portal-section span-4" style={{ minWidth: 0 }}>
          <SectionHead title="迭代" right={<span className="tag tag--grey">{LEGACY.length} 个存量系统</span>} />
          <div className="stack" style={{ flex: '1 1 auto', minHeight: 0 }}>
            {LEGACY.map((c) => (
              <SysCard
                key={c.title}
                title={c.title}
                kind={c.kind}
                onClick={() => nav('/warehouse')}
                style={{ flex: '1 1 auto' }}
              />
            ))}
          </div>
        </section>

        <section className="portal-section span-8" style={{ minWidth: 0 }}>
          <SectionHead title="新建" right={<span className="tag tag--blue">{BUILT.length} 个场景</span>} />

          <div
            className="content-grid"
            style={{
              flex: '1 1 auto',
              alignItems: 'stretch',
              gap: 'var(--sp-3)',
              gridAutoRows: compact ? '148px' : 'minmax(128px, 1fr)'
            }}
          >
            <SysCard
              className="span-6"
              title={hero.title}
              kind={hero.kind}
              onClick={() => nav(hero.to)}
              style={compact ? undefined : { gridRow: 'span 2' }}
            />
            {scenes.map((c, i) => (
              <SysCard
                key={c.key}
                className={i < 4 ? 'span-3' : 'span-6'}
                title={c.title}
                kind={c.kind}
                onClick={() => nav(c.to)}
              />
            ))}
          </div>
        </section>
      </div>

      <p className="page-desc">
        省市县三级数据权限按行政区划自动隔离，跨级可下钻不可越权；六大业务域 {featureCount} 个功能点与《功能设计》逐条对应；
        存量系统经统一身份认证单点登录跳转（演示环境以数据仓页面替代外部系统地址）。
      </p>
    </div>
  );
}
