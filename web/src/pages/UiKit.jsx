import React, { useState } from 'react';
import Drawer from '../components/Drawer.jsx';

/**
 * /ui-kit —— 设计系统 v3 静态对照页
 * 契约：docs/11-组件契约-v3.md §3 / §4 / §6
 * 用途：三名前端按此确认类名、状态与密度；不做业务逻辑。
 */

const ROW = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 10
};

const Scroll = ({ children, min = 640 }) => (
  <div style={{ overflowX: 'auto' }}>
    <div style={{ minWidth: min }}>{children}</div>
  </div>
);

function Section({ title, desc, children }) {
  return (
    <section className="portal-section">
      <div className="portal-section-head">
        <h2>{title}</h2>
        {desc ? <p>{desc}</p> : null}
      </div>
      {children}
    </section>
  );
}

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const IconExport = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />
  </svg>
);

const IconInbox = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 13h4l2 3h4l2-3h4M4 13 6.5 5h11L20 13v5H4v-5Z" />
  </svg>
);

const BTN_VARIANTS = [
  { name: 'Primary 主操作', cls: 'btn-primary' },
  { name: 'Ghost 次操作', cls: 'btn-ghost' },
  { name: 'Text 文字按钮', cls: 'btn-text' },
  { name: 'Danger 危险操作', cls: 'btn-danger' }
];

const STATES = ['默认', 'Hover', 'Active', 'Focus', 'Disabled'];

const PALETTE = [
  ['--bg-0', '底色 0'],
  ['--bg-1', '底色 1'],
  ['--bg-2', '底色 2'],
  ['--panel', '面板'],
  ['--panel-2', '面板 2'],
  ['--panel-3', '面板 3'],
  ['--line', '分隔线'],
  ['--line-strong', '强线'],
  ['--cyan', '主青'],
  ['--cyan-2', '亮青'],
  ['--blue', '交互蓝'],
  ['--green', '正常'],
  ['--orange', '预警'],
  ['--yellow', '关注'],
  ['--red', '危险'],
  ['--text-1', '主文'],
  ['--text-2', '次文'],
  ['--text-3', '弱文'],
  ['--text-4', '最弱文']
];

const TYPE_SCALE = [
  ['--fs-11', '11', '辅助'],
  ['--fs-12', '12', '标签'],
  ['--fs-13', '13', '正文'],
  ['--fs-14', '14', '强调'],
  ['--fs-16', '16', '小标题'],
  ['--fs-20', '20', '卡片值'],
  ['--fs-28', '28', '页标题']
];

const RADII = [
  ['--r-sm', '8', 'sm'],
  ['--r-md', '12', 'md'],
  ['--r-lg', '16', 'lg']
];

const SPACES = [
  ['--sp-1', '4'],
  ['--sp-2', '8'],
  ['--sp-3', '12'],
  ['--sp-4', '16'],
  ['--sp-5', '24'],
  ['--sp-6', '32'],
  ['--sp-7', '40'],
  ['--sp-8', '56']
];

const QR_SRC = (() => {
  const cells = [];
  const finder = (x, y) => {
    const zones = [
      [0, 0],
      [14, 0],
      [0, 14]
    ];
    for (const [ox, oy] of zones) {
      if (x < ox || x >= ox + 7 || y < oy || y >= oy + 7) continue;
      const dx = x - ox;
      const dy = y - oy;
      const ring = dx === 0 || dx === 6 || dy === 0 || dy === 6;
      const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
      return ring || core;
    }
    return null;
  };
  for (let y = 0; y < 21; y += 1) {
    for (let x = 0; x < 21; x += 1) {
      const f = finder(x, y);
      const on = f === null ? (x * 3 + y * 5 + ((x * y) % 4)) % 7 < 3 : f;
      if (on) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" shape-rendering="crispEdges"><rect width="21" height="21" fill="#fff"/><g fill="#0b2138">${cells.join('')}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
})();

const TAGS = [
  { cls: 'tag--green', label: '正常' },
  { cls: 'tag--yellow', label: '关注' },
  { cls: 'tag--orange', label: '预警' },
  { cls: 'tag--red', label: '超期' },
  { cls: 'tag--blue', label: '在办' },
  { cls: 'tag--grey', label: '已归档' }
];

const TABLE_ROWS = [
  { code: 'C5101002024001', name: '攀西钒钛磁铁矿', type: '采矿权', area: '12.4800', status: '正常', tone: 'tag--green', flag: 'done', flagText: '已完成' },
  { code: 'C5101002024002', name: '白马铁矿北矿段', type: '探矿权', area: '8.2100', status: '关注', tone: 'tag--yellow', flag: 'doing', flagText: '推进中' },
  { code: 'C5101002024003', name: '盐源木里铜矿', type: '采矿权', area: '5.6400', status: '超期', tone: 'tag--red', flag: 'late', flagText: '已逾期' },
  { code: 'C5101002024004', name: '会理铅锌矿', type: '采矿权', area: '3.0900', status: '在办', tone: 'tag--blue', flag: 'none', flagText: '未开始' }
];

export default function UiKit() {
  const [tab, setTab] = useState('all');
  const [seg, setSeg] = useState('month');
  const [drawerMode, setDrawerMode] = useState(null);

  return (
    <div className="stack" style={{ gap: 24 }}>
      <header className="page-head">
        <div>
          <h1 className="page-title">设计系统 v3 · 组件对照</h1>
          <p className="page-desc">
            政务深蓝基调、去噪表面、等宽数字。以下每个分区即为契约中的一类原子组件，四态与窄屏表现均以此为准。
          </p>
        </div>
        <div className="page-actions">
          <span className="badge badge--ok">契约 §2–§6 已覆盖</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDrawerMode('base')}>
            打开抽屉
          </button>
        </div>
      </header>

      <div className="content">
        {/* —— 按钮 —— */}
        <Section title="按钮" desc="每类按钮含 默认 / hover / active / focus / disabled 五态">
          <div className="card">
            <div className="card-body">
              <Scroll min={680}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '128px repeat(5, minmax(0, 1fr))',
                    gap: '10px 12px',
                    alignItems: 'center'
                  }}
                >
                  <span className="tiny muted">样式 \ 状态</span>
                  {STATES.map((s) => (
                    <span className="tiny muted" key={s}>
                      {s}
                    </span>
                  ))}
                  {BTN_VARIANTS.map((v) => (
                    <React.Fragment key={v.cls}>
                      <span className="small muted">{v.name}</span>
                      <span>
                        <button type="button" className={`btn ${v.cls}`}>
                          保存
                        </button>
                      </span>
                      <span>
                        <button type="button" className={`btn ${v.cls} is-hover`}>
                          保存
                        </button>
                      </span>
                      <span>
                        <button type="button" className={`btn ${v.cls} is-active`}>
                          保存
                        </button>
                      </span>
                      <span>
                        <button type="button" className={`btn ${v.cls} is-focus`}>
                          保存
                        </button>
                      </span>
                      <span>
                        <button type="button" className={`btn ${v.cls}`} disabled>
                          保存
                        </button>
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </Scroll>

              <div style={{ ...ROW, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line-faint)' }}>
                <button type="button" className="btn btn-primary">
                  <IconPlus />
                  新建矿权
                </button>
                <button type="button" className="btn btn-ghost">
                  <IconExport />
                  导出
                </button>
                <button type="button" className="btn btn-primary btn-sm">
                  小号主操作
                </button>
                <button type="button" className="btn btn-ghost btn-sm">
                  小号次操作
                </button>
                <button type="button" className="btn btn-primary is-loading">
                  提交中
                </button>
                <button type="button" className="btn btn-ghost" disabled>
                  不可用
                </button>
                <button type="button" className="icon-btn" aria-label="新建">
                  <IconPlus />
                </button>
                <button type="button" className="icon-btn icon-btn--sm" aria-label="导出">
                  <IconExport />
                </button>
                <span className="badge badge--off">icon-btn / is-loading</span>
              </div>

              <div style={{ ...ROW, marginTop: 16 }}>
                <button type="button" className="btn btn-primary btn-block">
                  全宽主操作 · .btn-block
                </button>
              </div>
            </div>
          </div>
        </Section>

        {/* —— 表单 —— */}
        <Section title="表单" desc="默认 / hover / focus / disabled 四态，聚焦为 2px 青环">
          <div className="card">
            <div className="card-body">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16
                }}
              >
                <div className="field">
                  <label className="field-label" htmlFor="kit-name">
                    矿山名称
                  </label>
                  <input id="kit-name" className="input" placeholder="请输入矿山名称" defaultValue="" />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="kit-name-hover">
                    Hover 态
                  </label>
                  <input id="kit-name-hover" className="input is-hover" placeholder="悬停描边变亮" defaultValue="" />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="kit-name-focus">
                    Focus 态
                  </label>
                  <input id="kit-name-focus" className="input is-focus" defaultValue="攀西钒钛磁铁矿" />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="kit-name-dis">
                    Disabled
                  </label>
                  <input id="kit-name-dis" className="input" defaultValue="不可编辑" disabled />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="kit-select">
                    矿权类型
                  </label>
                  <select id="kit-select" className="select" defaultValue="mining">
                    <option value="mining">采矿权</option>
                    <option value="explore">探矿权</option>
                    <option value="reserve">预留区</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="kit-invalid">
                    校验失败
                  </label>
                  <input id="kit-invalid" className="input" defaultValue="C5101" aria-invalid="true" />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label" htmlFor="kit-note">
                    备注
                  </label>
                  <textarea id="kit-note" className="textarea" rows={3} placeholder="填写核查意见、处置要求…" />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* —— 筛选胶囊 / 标签 —— */}
        <Section title="表单 · 筛选与标签" desc="chip 为可点击筛选，tag 为只读状态，标签圆角固定 6">
          <div className="card">
            <div className="card-body">
              <div style={ROW}>
                <span className="chip is-on">全部</span>
                <span className="chip">采矿权</span>
                <span className="chip">探矿权</span>
                <span className="chip">预留区</span>
                <span className="chip is-hover">Hover</span>
                <span className="chip" aria-disabled="true" style={{ opacity: 0.45 }}>
                  不可用
                </span>
              </div>
              <div style={{ ...ROW, marginTop: 14 }}>
                {TAGS.map((t) => (
                  <span className={`tag ${t.cls}`} key={t.cls}>
                    {t.label}
                  </span>
                ))}
                <span className="tag">默认</span>
              </div>
            </div>
          </div>
        </Section>

        {/* —— 表格 / 分页 —— */}
        <Section title="表格" desc="表头吸顶、操作列右固定、数字等宽右对齐">
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">
                矿权台账
                <span className="card-sub">共 128 条</span>
              </h3>
              <div style={ROW}>
                <div className="toolbar-search">
                  <input className="input" placeholder="搜索矿山名称 / 许可证号" />
                </div>
                <button type="button" className="btn btn-ghost btn-sm">
                  筛选
                </button>
              </div>
            </div>
            <div style={{ padding: 0 }}>
              <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>许可证号</th>
                      <th>矿山名称</th>
                      <th>类型</th>
                      <th align="right">面积（km²）</th>
                      <th>状态</th>
                      <th>季度进度</th>
                      <th className="col-actions">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TABLE_ROWS.map((r) => (
                      <tr key={r.code}>
                        <td className="num">{r.code}</td>
                        <td>{r.name}</td>
                        <td>{r.type}</td>
                        <td align="right" className="num">
                          {r.area}
                        </td>
                        <td>
                          <span className={`tag ${r.tone}`}>{r.status}</span>
                        </td>
                        <td>
                          <span className={`flag flag--${r.flag}`}>{r.flagText}</span>
                        </td>
                        <td className="col-actions">
                          <button type="button" className="btn btn-text btn-sm">
                            详情
                          </button>
                          <button type="button" className="btn btn-text btn-sm">
                            编辑
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card-body" style={{ paddingTop: 10, paddingBottom: 12 }}>
              <div className="pager">
                <span className="pager-info">第 1–4 条 / 共 128 条</span>
                <button type="button" className="pager-btn" disabled>
                  上一页
                </button>
                <button type="button" className="pager-btn is-on">
                  1
                </button>
                <button type="button" className="pager-btn">
                  2
                </button>
                <button type="button" className="pager-btn">
                  3
                </button>
                <button type="button" className="pager-btn">
                  下一页
                </button>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="card-head">
              <h3 className="card-title">紧凑表格 · .is-dense</h3>
            </div>
            <div style={{ padding: 0 }}>
              <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
                <table className="data-table is-dense">
                  <thead>
                    <tr>
                      <th>指标</th>
                      <th>当前值</th>
                      <th align="right">阈值</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>开采回采率</td>
                      <td>92.4%</td>
                      <td align="right" className="num">
                        90.0%
                      </td>
                      <td>
                        <span className="badge badge--ok">达标</span>
                      </td>
                    </tr>
                    <tr>
                      <td>选矿回收率</td>
                      <td>86.1%</td>
                      <td align="right" className="num">
                        88.0%
                      </td>
                      <td>
                        <span className="badge badge--warn">关注</span>
                      </td>
                    </tr>
                    <tr>
                      <td>尾矿综合利用率</td>
                      <td>—</td>
                      <td align="right" className="num">
                        60.0%
                      </td>
                      <td>
                        <span className="badge badge--off">未采集</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="card" style={{ marginTop: 12, height: 300 }}>
            <div className="card-head">
              <h3 className="card-title">
                撑满卡片高度
                <span className="card-sub">U-09 .table-wrap--fill</span>
              </h3>
              <span className="tiny muted">表体滚动 · 分页贴底</span>
            </div>
            <div className="card-body" style={{ padding: '0 0 10px' }}>
              <div className="table-wrap table-wrap--fill">
                <table className="data-table is-dense">
                  <thead>
                    <tr>
                      <th>序号</th>
                      <th>矿山名称</th>
                      <th>矿种</th>
                      <th style={{ textAlign: 'right' }}>面积 km²</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <tr key={i}>
                        <td className="num">{i + 1}</td>
                        <td>示例矿山 {String(i + 1).padStart(2, '0')}</td>
                        <td>{i % 3 === 0 ? '钒钛磁铁矿' : i % 3 === 1 ? '煤矿' : '石灰岩'}</td>
                        <td className="num" align="right">
                          {(i * 1.7 + 3.2).toFixed(2)}
                        </td>
                        <td>
                          <span className={`badge ${i % 4 === 0 ? 'badge--warn' : 'badge--ok'}`}>
                            {i % 4 === 0 ? '待核查' : '正常'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pager" style={{ padding: '0 12px' }}>
                <span className="pager-info">共 12 条</span>
                <button type="button" className="pager-btn" aria-label="上一页" disabled>
                  ‹
                </button>
                <button type="button" className="pager-btn is-on">
                  1
                </button>
                <button type="button" className="pager-btn">
                  2
                </button>
                <button type="button" className="pager-btn" aria-label="下一页">
                  ›
                </button>
              </div>
            </div>
          </div>
        </Section>

        {/* —— 卡片 / 栅格 —— */}
        <Section title="卡片 · 栅格与详情" desc="内容区统一 12 栅格；--2 / --3 为两列 / 三列">
          <div className="content-grid content-grid--3">
            {[1, 2, 3].map((n) => (
              <div className="card" key={n}>
                <div className="card-head">
                  <h3 className="card-title">
                    卡片标题 {n}
                    <span className="card-sub">副标题</span>
                  </h3>
                  <button type="button" className="btn btn-text btn-sm">
                    更多
                  </button>
                </div>
                <div className="card-body">
                  <ul className="list">
                    <li className="list-item">
                      <span className="tag tag--green">在办</span>
                      <span className="list-main">绿色矿山年度核查</span>
                      <span className="list-meta">12-08</span>
                    </li>
                    <li className="list-item">
                      <span className="tag tag--orange">预警</span>
                      <span className="list-main">越界开采疑似图斑</span>
                      <span className="list-meta">12-07</span>
                    </li>
                    <li className="list-item">
                      <span className="tag tag--grey">归档</span>
                      <span className="list-main">储量核实报告（2023）</span>
                      <span className="list-meta">12-02</span>
                    </li>
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="content-grid" style={{ marginTop: 12 }}>
            <div className="content-col span-6">
              <div className="card">
                <div className="card-head">
                  <h3 className="card-title">
                    详情键值列
                    <span className="card-sub">U-02 .desc-list</span>
                  </h3>
                </div>
                <div className="card-body">
                  <div className="desc-list">
                    <div className="desc-row">
                      <span className="desc-key">许可证号</span>
                      <span className="desc-value mono">C5101002024001</span>
                    </div>
                    <div className="desc-row">
                      <span className="desc-key">矿山名称</span>
                      <span className="desc-value">攀西钒钛磁铁矿</span>
                    </div>
                    <div className="desc-row">
                      <span className="desc-key">开采矿种</span>
                      <span className="desc-value">钒钛磁铁矿 / 伴生钛</span>
                    </div>
                    <div className="desc-row">
                      <span className="desc-key">矿区面积</span>
                      <span className="desc-value num">12.48 km²</span>
                    </div>
                    <div className="desc-row">
                      <span className="desc-key">备注</span>
                      <span className="desc-value">
                        位于攀枝花市东区，生产规模 300 万吨/年，剩余服务年限 18 年。
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="content-col span-6">
              <div className="card">
                <div className="card-head">
                  <h3 className="card-title">
                    纵向内容列
                    <span className="card-sub">U-03 .content-col</span>
                  </h3>
                </div>
                <div className="card-body">
                  <ul className="list">
                    <li className="list-item">
                      <span className="tag tag--green">正常</span>
                      <span className="list-main">安全生产许可证在有效期内</span>
                      <span className="list-meta">2027-06</span>
                    </li>
                    <li className="list-item">
                      <span className="tag tag--yellow">临期</span>
                      <span className="list-main">矿产资源开发利用方案备案</span>
                      <span className="list-meta">2026-03</span>
                    </li>
                    <li className="list-item">
                      <span className="tag tag--red">逾期</span>
                      <span className="list-main">矿山地质环境治理恢复基金缴存</span>
                      <span className="list-meta">2025-12</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <div className="alert-line">同一列内的卡片间距由 .content-col 的 gap 统一控制。</div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* —— 标签页 / 分段 —— */}
        <Section title="流程 · 步骤与切换" desc="步骤条 6 列自适应；标签页与分段用于同一路由内的视图切换">
          <div className="card">
            <div className="card-body">
              <div className="stack" style={{ marginBottom: 18 }}>
                <nav className="breadcrumb" aria-label="面包屑">
                  <a href="#kit">首页</a>
                  <span className="sep">/</span>
                  <a href="#kit">矿权管理</a>
                  <span className="sep">/</span>
                  <span>延续登记</span>
                </nav>
                <div className="steps">
                  <div className="step is-done">
                    <b>受理</b>
                    <small>11-02</small>
                  </div>
                  <div className="step is-done">
                    <b>初审</b>
                    <small>11-05</small>
                  </div>
                  <div className="step is-on">
                    <b>复核</b>
                    <small>进行中</small>
                  </div>
                  <div className="step">
                    <b>决定</b>
                    <small>待办</small>
                  </div>
                  <div className="step">
                    <b>制证</b>
                    <small>待办</small>
                  </div>
                  <div className="step">
                    <b>归档</b>
                    <small>待办</small>
                  </div>
                </div>
              </div>

              <div className="tabs" role="tablist">
                {[
                  ['all', '全部矿权'],
                  ['mining', '采矿权'],
                  ['explore', '探矿权'],
                  ['warn', '预警事项']
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    className={`tab${tab === key ? ' is-on' : ''}`}
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
                <button type="button" className="tab" disabled>
                  不可用
                </button>
              </div>

              <div style={{ ...ROW, marginTop: 16, justifyContent: 'space-between' }}>
                <div className="segmented" role="group" aria-label="统计周期">
                  {[
                    ['month', '本月'],
                    ['quarter', '本季度'],
                    ['year', '本年度']
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`segmented-item${seg === key ? ' is-on' : ''}`}
                      onClick={() => setSeg(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <span className="tiny muted">当前：{tab} / {seg}</span>
              </div>
            </div>
          </div>
        </Section>

        {/* —— 空态 / 骨架 / 提示 —— */}
        <Section title="空态 · 骨架与提示" desc="加载与异常不改变布局高度，避免页面抖动">
          <div className="content-grid content-grid--2">
            <div className="card">
              <div className="card-head">
                <h3 className="card-title">空态 .empty</h3>
              </div>
              <div className="card-body">
                <div className="empty">
                  <span className="empty-icon">
                    <IconInbox />
                  </span>
                  <p className="empty-text">当前筛选条件下没有矿权记录</p>
                  <button type="button" className="btn btn-ghost btn-sm">
                    清空筛选
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3 className="card-title">骨架屏 .skeleton</h3>
              </div>
              <div className="card-body">
                <div className="skeleton">
                  <i className="skeleton-line" />
                  <i className="skeleton-line" />
                  <i className="skeleton-line" />
                </div>
                <div style={{ ...ROW, marginTop: 16 }}>
                  <span className="spinner" />
                  <span className="small muted">加载中 · .spinner</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3 className="card-title">提示 .toast / .alert-line</h3>
              </div>
              <div className="card-body">
                <div className="toast toast--ok" style={{ maxWidth: '100%', marginBottom: 10 }}>
                  保存成功，已记录操作日志
                </div>
                <div className="toast toast--err" style={{ maxWidth: '100%' }}>
                  提交失败：许可证号已存在
                </div>
                <div className="alert-line ok" style={{ marginTop: 12 }}>
                  数据同步完成（2026-11-18 09:20）
                </div>
                <div className="alert-line err">缺少必填项：矿山名称</div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3 className="card-title">徽章 .badge</h3>
              </div>
              <div className="card-body">
                <div style={ROW}>
                  <span className="badge badge--ok">在线</span>
                  <span className="badge badge--warn">待核查</span>
                  <span className="badge badge--off">离线</span>
                  <span className="badge">未知</span>
                </div>
                <div style={{ ...ROW, marginTop: 16 }}>
                  <span className="flag flag--done">已完成</span>
                  <span className="flag flag--doing">推进中</span>
                  <span className="flag flag--late">已逾期</span>
                  <span className="flag flag--none">未开始</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3 className="card-title">
                  错误空态
                  <span className="card-sub">U-07 .empty.is-error</span>
                </h3>
              </div>
              <div className="card-body">
                <div className="empty is-error">
                  <span className="empty-icon">!</span>
                  <p className="empty-text">数据加载失败，请稍后重试</p>
                  <div className="empty-action">
                    <button type="button" className="btn btn-ghost btn-sm">
                      重试
                    </button>
                    <button type="button" className="btn btn-text btn-sm">
                      查看诊断
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* —— 上传 —— */}
        <Section title="上传" desc="拖拽区虚线描边，hover 转青色；二维码用于移动端接续办理">
          <div className="content-grid content-grid--2">
            <div className="card">
              <div className="card-head">
                <h3 className="card-title">
                  文件上传
                  <span className="card-sub">U-06 .upload</span>
                </h3>
              </div>
              <div className="card-body">
                <div className="upload">
                  <div className="upload-box" tabIndex={0} role="button">
                    <IconExport />
                    <span>拖拽文件到此处，或点击选择</span>
                  </div>
                  <p className="upload-hint">支持 PDF / JPG / PNG，单文件不超过 20 MB</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-head">
                <h3 className="card-title">
                  二维码
                  <span className="card-sub">U-04 .qr</span>
                </h3>
              </div>
              <div className="card-body">
                <div className="qr">
                  <img className="qr-img" src={QR_SRC} alt="示例二维码" />
                  <span className="qr-cap">扫码在移动端继续办理</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* —— KPI —— */}
        <Section title="图表 · 指标带" desc="数值等宽、单位次级；--compact 用于抽屉与侧栏">
          <div className="kpi-row">
            <div className="kpi-card">
              <span className="kpi-label">矿权总数</span>
              <b className="kpi-value">
                1,286
                <i className="kpi-unit">宗</i>
              </b>
              <span className="kpi-delta up">↑ 12 本月新增</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">绿色矿山</span>
              <b className="kpi-value">
                418
                <i className="kpi-unit">家</i>
              </b>
              <span className="kpi-delta up">↑ 3.2%</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">超期未办</span>
              <b className="kpi-value is-warn">
                27
                <i className="kpi-unit">件</i>
              </b>
              <span className="kpi-delta down">↑ 6 件</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">年度办结率</span>
              <b className="kpi-value">
                94.6
                <i className="kpi-unit">%</i>
              </b>
              <span className="kpi-delta flat">与上月持平</span>
            </div>
          </div>

          <div className="kpi-row kpi-row--compact" style={{ marginTop: 12 }}>
            <div className="kpi-card">
              <span className="kpi-label">待处置工单</span>
              <b className="kpi-value">
                36
                <i className="kpi-unit">件</i>
              </b>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">超期工单</span>
              <b className="kpi-value is-warn">
                7
                <i className="kpi-unit">件</i>
              </b>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">未销号预警</span>
              <b className="kpi-value is-warn">
                12
                <i className="kpi-unit">条</i>
              </b>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">红黄牌指标</span>
              <b className="kpi-value">
                2
                <i className="kpi-unit">项</i>
              </b>
            </div>
          </div>
        </Section>

        {/* —— 图表框 —— */}
        <Section title="图表 · 曲线与环形" desc="面板不透明、不铺底纹；图表颜色只取 --chart-1…8">
          <div className="content-grid">
            <div className="panel span-7">
              <div className="panel-head">
                <h3 className="panel-title">矿权办理趋势</h3>
                <button type="button" className="panel-more">
                  近 12 个月 ›
                </button>
              </div>
              <div className="panel-body">
                <div className="chart">
                  <svg viewBox="0 0 640 200" width="100%" height="200" role="img" aria-label="办理趋势示意图">
                    <defs>
                      <linearGradient id="kitArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[40, 80, 120, 160].map((y) => (
                      <line key={y} x1="0" y1={y} x2="640" y2={y} stroke="var(--line-faint)" strokeWidth="1" />
                    ))}
                    <path
                      d="M0 150 L64 138 L128 146 L192 112 L256 120 L320 92 L384 98 L448 70 L512 78 L576 52 L640 60"
                      fill="none"
                      stroke="var(--cyan)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M0 150 L64 138 L128 146 L192 112 L256 120 L320 92 L384 98 L448 70 L512 78 L576 52 L640 60 L640 200 L0 200 Z"
                      fill="url(#kitArea)"
                    />
                    {[[64, 138], [192, 112], [320, 92], [448, 70], [576, 52]].map(([x, y]) => (
                      <circle key={x} cx={x} cy={y} r="3" fill="var(--bg-0)" stroke="var(--cyan-2)" strokeWidth="2" />
                    ))}
                    <line x1="0" y1="200" x2="640" y2="200" stroke="var(--line)" strokeWidth="1" />
                  </svg>
                </div>
                <div className="bars">
                  <div className="ring-legend">
                    <span>
                      <i style={{ background: 'var(--chart-1)' }} />
                      受理 <b>1,024</b>
                    </span>
                    <span>
                      <i style={{ background: 'var(--chart-2)' }} />
                      办结 <b>968</b>
                    </span>
                    <span>
                      <i style={{ background: 'var(--chart-3)' }} />
                      退回 <b>56</b>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel span-5">
              <div className="panel-head">
                <h3 className="panel-title">矿种结构</h3>
              </div>
              <div className="panel-body">
                <div className="ring-card">
                  <svg width="160" height="160" viewBox="0 0 42 42" role="img" aria-label="矿种结构环形图">
                    <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--panel-3)" strokeWidth="6" />
                    <circle
                      cx="21"
                      cy="21"
                      r="15.9"
                      fill="none"
                      stroke="var(--chart-1)"
                      strokeWidth="6"
                      strokeDasharray="46 54"
                      strokeDashoffset="25"
                      strokeLinecap="butt"
                    />
                    <circle
                      cx="21"
                      cy="21"
                      r="15.9"
                      fill="none"
                      stroke="var(--chart-2)"
                      strokeWidth="6"
                      strokeDasharray="28 72"
                      strokeDashoffset="-21"
                      strokeLinecap="butt"
                    />
                    <circle
                      cx="21"
                      cy="21"
                      r="15.9"
                      fill="none"
                      stroke="var(--chart-3)"
                      strokeWidth="6"
                      strokeDasharray="16 84"
                      strokeDashoffset="-49"
                      strokeLinecap="butt"
                    />
                    <text x="21" y="20" textAnchor="middle" fill="var(--text-1)" fontSize="5.4" fontWeight="600">
                      1,286
                    </text>
                    <text x="21" y="25.5" textAnchor="middle" fill="var(--text-3)" fontSize="2.6">
                      矿权总数
                    </text>
                  </svg>
                </div>
                <div className="ring-legend">
                  <span>
                    <i style={{ background: 'var(--chart-1)' }} />
                    金属矿 <b>46%</b>
                  </span>
                  <span>
                    <i style={{ background: 'var(--chart-2)' }} />
                    非金属 <b>28%</b>
                  </span>
                  <span>
                    <i style={{ background: 'var(--chart-3)' }} />
                    能源矿 <b>16%</b>
                  </span>
                  <span>
                    <i style={{ background: 'var(--chart-7)' }} />
                    其他 <b>10%</b>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* —— 抽屉 —— */}
        <Section title="抽屉" desc="默认 520px；lg 720px；full 全屏；Esc / 遮罩关闭；焦点陷阱由 Drawer 组件负责">
          <div className="card">
            <div className="card-body">
              <div style={ROW}>
                <button type="button" className="btn btn-primary" onClick={() => setDrawerMode('base')}>
                  默认 520px
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setDrawerMode('lg')}>
                  lg 720px
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setDrawerMode('full')}>
                  full 全屏
                </button>
                <span className="small muted">Esc / 遮罩关闭，焦点陷阱由 Drawer 组件负责</span>
              </div>
            </div>
          </div>
        </Section>
        <Section title="令牌色板" desc="颜色 / 字号 / 间距 / 圆角；页面只引用变量，不写死色值">
          <div className="content-grid content-grid--2">
            <div className="card">
              <div className="card-head">
                <h3 className="card-title">
                  颜色变量
                  <span className="card-sub">tokens.css</span>
                </h3>
              </div>
              <div className="card-body">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
                    gap: 10
                  }}
                >
                  {PALETTE.map(([token, label]) => (
                    <div key={token}>
                      <div
                        style={{
                          height: 34,
                          background: 'var(' + token + ')',
                          border: '1px solid var(--line)',
                          borderRadius: 8
                        }}
                      />
                      <div className="tiny mono muted" style={{ marginTop: 4 }}>
                        {token}
                      </div>
                      <div className="tiny muted">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="content-col">
              <div className="card">
                <div className="card-head">
                  <h3 className="card-title">
                    字号阶梯
                    <span className="card-sub">--fs-*</span>
                  </h3>
                </div>
                <div className="card-body">
                  <div className="stack" style={{ gap: 6 }}>
                    {TYPE_SCALE.map(([token, px, use]) => (
                      <div key={token} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                        <span className="mono muted tiny" style={{ width: 72 }}>
                          {token}
                        </span>
                        <span style={{ fontSize: 'var(' + token + ')', color: 'var(--text-1)' }}>
                          矿权管理 {px}px
                        </span>
                        <span className="tiny muted">{use}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-head">
                  <h3 className="card-title">
                    圆角与间距
                    <span className="card-sub">--r-* / --sp-*</span>
                  </h3>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    {RADII.map(([token, px, name]) => (
                      <div key={token} style={{ textAlign: 'center' }}>
                        <div
                          style={{
                            width: 52,
                            height: 40,
                            borderRadius: 'var(' + token + ')',
                            background: 'var(--panel-3)',
                            border: '1px solid var(--line-strong)'
                          }}
                        />
                        <span className="tiny mono muted">
                          {name} {px}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                    {SPACES.map(([token, px]) => (
                      <div key={token} style={{ textAlign: 'center' }}>
                        <div
                          style={{
                            width: 14,
                            height: 'var(' + token + ')',
                            background: 'var(--cyan-a28)',
                            borderRadius: 3
                          }}
                        />
                        <span className="tiny mono muted">{px}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <Drawer
        open={Boolean(drawerMode)}
        className={drawerMode === 'lg' ? 'drawer--lg' : drawerMode === 'full' ? 'drawer--full' : ''}
        title="攀西钒钛磁铁矿"
        subtitle="许可证号 C5101002024001 · 采矿权"
        onClose={() => setDrawerMode(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDrawerMode(null)}>
              取消
            </button>
            <button type="button" className="btn btn-primary">
              保存
            </button>
          </>
        }
      >
        <div className="stack">
          <div className="kpi-row kpi-row--compact">
            <div className="kpi-card">
              <span className="kpi-label">矿区面积</span>
              <b className="kpi-value">
                12.48
                <i className="kpi-unit">km²</i>
              </b>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">剩余储量</span>
              <b className="kpi-value">
                3,240
                <i className="kpi-unit">万吨</i>
              </b>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">开采年限</span>
              <b className="kpi-value">
                18
                <i className="kpi-unit">年</i>
              </b>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">预警</span>
              <b className="kpi-value is-warn">
                1
                <i className="kpi-unit">条</i>
              </b>
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="drawer-name">
              矿山名称
            </label>
            <input id="drawer-name" className="input" defaultValue="攀西钒钛磁铁矿" data-autofocus />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="drawer-status">
              状态
            </label>
            <select id="drawer-status" className="select" defaultValue="ok">
              <option value="ok">正常</option>
              <option value="warn">预警</option>
              <option value="late">超期</option>
            </select>
          </div>

          <div className="alert-line err">该矿权存在 1 条越界开采预警，请核查后处置。</div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">最近办理记录</h3>
            </div>
            <div className="card-body">
              <ul className="list">
                <li className="list-item">
                  <span className="tag tag--blue">受理</span>
                  <span className="list-main">延续登记申请</span>
                  <span className="list-meta">11-28</span>
                </li>
                <li className="list-item">
                  <span className="tag tag--green">办结</span>
                  <span className="list-main">开发利用方案备案</span>
                  <span className="list-meta">11-16</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
