import React, { useMemo, useState } from 'react';
import { Ic } from '../components/Icon';
import { useApp } from '../store.jsx';
import { tools } from '../api';
import { Alert02Icon, PlayCircleIcon, Tick02Icon } from '@hugeicons/core-free-icons';

/**
 * 功能点附带的辅助分析面板（抽屉内使用）。
 * 交互型功能调用 /api/tools/*，表单与结果分区呈现，未测算前不展示任何数字；
 * 聚合型功能只呈现真实判定规则与统计口径说明，不编造数据。
 */

const nf = (v, d = 2) =>
  Number.isFinite(Number(v))
    ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d })
    : '—';

const RULES = {
  indicator: {
    title: '规划指标预警规则',
    intro: '规划指标管理按省市县三级拆解约束性与预期性指标，实时对比实际执行值与规划目标值。',
    items: [
      '实际值 / 目标值 ≥ 90% 触发黄牌预警，提示接近控制上限；',
      '实际值 / 目标值 ≥ 100% 触发红牌预警，需启动指标调剂或调整论证；',
      '约束性指标（矿山总数上限、大中型矿山比例、绿色矿山建成率、砂石土料产能）不可突破。'
    ]
  },
  planStats: {
    title: '规划成果统计口径',
    intro: '按行政区划、分区类型、矿种类别自动汇总规划区块数量、面积与资源储量规模。',
    items: [
      '统计范围为当前账号行政区划权限内的已批复规划区块；',
      '规划实施率 = 已设矿业权区块数 / 规划区块总数；',
      '面积以 km² 计，资源储量以万吨计，数据随台账实时刷新。'
    ]
  },
  rightsMap: {
    title: '矿业权一张图说明',
    intro: '整合探矿权、采矿权有效登记发证空间范围与全生命周期属性。',
    items: [
      '在驾驶舱切换「矿业权」专题即可叠加遥感影像、三线与规划图层；',
      '点击图斑查看许可证号、权利人、矿种、有效期与三枚接入徽章；',
      '历史发证范围回溯需接入省级时空数据库，当前演示环境提供现行有效范围。'
    ]
  },
  rightsStats: {
    title: '矿业权统计口径',
    intro: '围绕新立、延续、变更、注销、出让成交数量与金额、有效矿业权结构多维交叉统计。',
    items: [
      '成交金额单位万元，按出让公告发布时间归属年度；',
      '有效矿业权指当前日期处于有效期起止区间内的矿业权；',
      '同比口径为同一自然月/年环比去年同期。'
    ]
  },
  greenDynamic: {
    title: '绿色矿山名录管理规则',
    intro: '分级建立国家级 / 省级 / 市级绿色矿山及数字矿山、智能矿山动态名录库。',
    items: [
      '名录等级取自主管部门入库结论，巡查与复核结果实时回写台账；',
      '年度复核未通过的自动转入问题整改督办；',
      '数字化、智能化等级单独标识，用于跟踪绿色矿山向智能矿山升级改造进度。'
    ]
  },
  monitor: {
    title: '动态监测阈值与分级预警',
    intro: '接入视频监控、钻机 GPS、粉尘噪声在线监测、边坡位移与地磅产量数据。',
    items: [
      '状态报警：设备离线超过 30 分钟触发「超时报警」；',
      '监测指标报警：粉尘浓度超过阈值触发「粉尘报警」，边坡位移日增量超过 5mm 触发位移报警；',
      '地热与矿泉水监测采集水位、水质、水量、水温四项指标，超采即预警；',
      '三维矿山叠加展示需接入高精度地质模型与实景三维底座。'
    ]
  },
  project: {
    title: '工程项目节点管控',
    intro: '生态修复、地质灾害治理与绿色矿山重点建设项目按立项、施工、资金拨付、验收四段管控。',
    items: [
      '进度 = 已完成节点数 / 计划节点数；',
      '资金拨付率 = 已付 / 预算，低于时序进度触发督办；',
      '竣工验收后自动归档至项目管理台账。'
    ]
  },
  annualCheck: {
    title: '年报快报校验规则',
    intro: '在线催报、企业填报、主管部门审核矿山开发利用统计年报与季度快报。',
    items: [
      '产量 × 单价 与产值偏差超过 8% 标为逻辑异常；',
      '综合利用率、选矿回收率超出行业合理区间标为异常；',
      '连续两年未填报的企业自动进入异常名录。'
    ]
  },
  smartPatrol: {
    title: '智能巡查线索生成',
    intro: '基于卫星遥感变化监测图斑、越界开采电子围栏与视频 AI 识别自动生成疑似违法线索。',
    items: [
      '遥感图斑与矿区范围相交且面积超过 500 m² 时生成线索；',
      '视频 AI 识别到未佩戴安全帽、违规作业、夜间盗采等行为时推送工单；',
      '线索自动派发至属地网格员，需在 3 个工作日内完成现场核实。'
    ]
  },
  explore: {
    title: '攻深找盲项目库',
    intro: '重点成矿带与老矿山深部、外围找矿项目，展示钻孔、物化探异常与新增资源量成果。',
    items: [
      '项目按类别分为基础地质调查、矿产勘查、老矿山增储；',
      '新增资源量以万吨计，进度按设计工作量完成比例计算；',
      '三维成矿预测靶区需接入专用建模平台，当前以项目台账与成果汇总呈现。'
    ]
  },
  agri: {
    title: '农业地质一张图规则',
    intro: '整合富硒土地与特色农产品产地土地质量地球化学调查成果。',
    items: [
      '富硒判定：土壤硒含量 ≥ 0.4 mg/kg 且 ≤ 3.0 mg/kg；',
      '重金属风险按镉含量分级：≤ 0.3 低风险、≤ 0.6 中风险、> 0.6 高风险；',
      '风险等级综合酸碱度、镉含量与作物类型给出。'
    ]
  },
  culture: {
    title: '地质文化传播管理',
    intro: '省级地质文化村（镇）、地质遗迹保护区、地质公园数字化展示。',
    items: [
      '申报创建进度按申报、评审、公示、挂牌四阶段管理；',
      '科普研学路线按遗迹点串联，标注游览时长与开放状态；',
      '地质文化村申报材料与评审意见归档至文化传播台账。'
    ]
  },
  industry: {
    title: '地勘行业信用评价',
    intro: '归集地勘单位资质、技术人员、装备能力及在建项目备案信息。',
    items: [
      '信用分由资质等级、人员规模、装备能力与项目质量抽查结果综合测算；',
      '项目质量抽查不合格的，扣减信用分并纳入重点监管；',
      '行业信用评价结果与资质延续、项目招投标挂钩。'
    ]
  },
  hazard: {
    title: '地质环境监测预警',
    intro: '接入地质灾害隐患点与矿山地质环境监测设备，构建风险一张图。',
    items: [
      '隐患点按威胁人数与财产划分一至四级；',
      'GNSS 位移日增量 > 5mm、雨量 1 小时 > 30mm、地下水位骤降触发预警；',
      '一级、二级隐患点自动推送应急避险联动通知至属地责任人。'
    ]
  }
};

const TOOL_TITLE = {
  calc: '辅助计算 · 储量核算与空间叠置',
  precheck: '辅助规划实施 · 选址合规一键审查',
  compliance: '规划动态调整 · 合规性预检',
  scopeArgument: '范围论证 · 空间叠置与避让建议',
  greenScore: '申报指标辅助评价（六大维度）',
  developCheck: '开发利用方案技术指标校验',
  credit: '矿企信用评分测算',
  quota: '保护矿种年度开采总量控制',
  order: '超时未处置工单督办'
};

const INTERACTIVE = Object.keys(TOOL_TITLE);

const GRID = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  gap: 'var(--sp-3)'
};
const FULL = { gridColumn: '1 / -1' };
const ROW = { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' };
const NOTE = { margin: 0, fontSize: 12, lineHeight: 1.7, color: 'var(--text-3)' };

function Field({ label, htmlFor, children, full }) {
  return (
    <div className="field" style={full ? FULL : undefined}>
      <label className="field-label" htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

function RuleCard({ rule }) {
  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">{rule.title}</h3>
        <span className="card-sub">判定规则与统计口径</span>
      </div>
      <div className="card-body">
        <p className="page-desc" style={{ marginTop: 0, marginBottom: 12 }}>{rule.intro}</p>
        <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, lineHeight: 1.75, color: 'var(--text-2)' }}>
          {rule.items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function ResultCard({ title, sub, children }) {
  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">{title}</h3>
        {sub ? <span className="card-sub">{sub}</span> : null}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

function MiniKpi({ items }) {
  return (
    <div className="kpi-row kpi-row--compact">
      {items.map((it) => (
        <div className="kpi-card" key={it.label}>
          <span className="kpi-label">{it.label}</span>
          <b className={`kpi-value${it.warn ? ' is-warn' : ''}`}>
            {it.value}
            {it.unit ? <i className="kpi-unit">{it.unit}</i> : null}
          </b>
        </div>
      ))}
    </div>
  );
}

function DataTable({ head, rows, minWidth }) {
  return (
    <div className="table-wrap">
      <table className="data-table is-dense" style={{ minWidth: minWidth || 480 }}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h.label} align={h.right ? 'right' : undefined} className={h.right ? 'num' : undefined}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

export default function SpecialPanel({ kind, spec, onChanged }) {
  const { toast } = useApp();
  const [busy, setBusy] = useState(false);

  /* 储量核算 */
  const [calc, setCalc] = useState({ areaKm2: 0.64, thickness: 12, density: 2.7, mined: 0, loss: 0, recovery: 92, dilution: 8, utilization: 88, annualOutput: 60 });
  const [calcRes, setCalcRes] = useState(null);

  /* 空间叠置 */
  const [polyText, setPolyText] = useState('120.05,30.92\n120.09,30.92\n120.09,30.89\n120.05,30.89');
  const [overlayRes, setOverlayRes] = useState(null);

  /* 选址合规 */
  const [pre, setPre] = useState({ lon: 119.92, lat: 30.98, areaKm2: 1.2 });
  const [preRes, setPreRes] = useState(null);

  /* 绿色矿山评分 */
  const DIMS = [
    { key: 'env', name: '矿区环境', weight: 0.18 },
    { key: 'develop', name: '资源开发方式', weight: 0.2 },
    { key: 'utilize', name: '资源综合利用', weight: 0.18 },
    { key: 'energy', name: '节能减排', weight: 0.16 },
    { key: 'tech', name: '科技创新与智能矿山', weight: 0.16 },
    { key: 'manage', name: '企业管理与形象', weight: 0.12 }
  ];
  const [green, setGreen] = useState({ env: 88, develop: 86, utilize: 82, energy: 80, tech: 78, manage: 90 });
  const [greenRes, setGreenRes] = useState(null);

  /* 开发利用方案校验 */
  const [dev, setDev] = useState({ scale: 60, years: 20, recovery: 92, dilution: 8, utilization: 85, reserve: 1200 });
  const [devRes, setDevRes] = useState(null);

  /* 信用评分 */
  const [credit, setCredit] = useState({ punishCount: 0, abnormal: 0, greenLevel: '省级', annualOk: true });
  const [creditRes, setCreditRes] = useState(null);

  /* 配额 / 督办 */
  const [quota, setQuota] = useState(null);
  const [overdue, setOverdue] = useState(null);

  const rule = RULES[kind];
  const title = useMemo(() => TOOL_TITLE[kind] || rule?.title || '功能说明', [kind, rule]);

  const run = async (fn, setter) => {
    setBusy(true);
    try {
      const r = await fn();
      setter(r && typeof r === 'object' && r.data !== undefined ? r.data : r);
      if (onChanged) onChanged();
    } catch (e) {
      toast(e.message || '计算失败', 'err');
    } finally {
      setBusy(false);
    }
  };

  const doCalc = () => run(() => tools.reserveCalc(calc), setCalcRes);
  const doOverlay = () => {
    const pts = polyText
      .split(/\n+/)
      .map((line) => line.split(/[,，\s]+/).map(Number).filter((n) => Number.isFinite(n)))
      .filter((p) => p.length >= 2);
    if (pts.length < 3) {
      toast('请至少输入 3 行「经度,纬度」顶点', 'err');
      return;
    }
    run(() => tools.overlay({ points: pts, bufferKm: 0 }), setOverlayRes);
  };
  const doPre = () => run(() => tools.precheck(pre), setPreRes);
  const doGreen = () => run(() => tools.greenScore(green), setGreenRes);
  const doDev = () => run(() => tools.developCheck(dev), setDevRes);
  const doCredit = () => run(() => tools.creditScore(credit), setCreditRes);
  const loadQuota = () => run(() => tools.quota(), setQuota);
  const loadOverdue = () => run(() => tools.overdue(), setOverdue);

  if (!INTERACTIVE.includes(kind) && !rule) return null;

  const head = (
    <div className="alert-line" style={{ marginTop: 0 }}>
      <b style={{ color: 'var(--text-1)' }}>{title}</b>
      {spec?.name ? ` · ${spec.name}` : ''}
      {INTERACTIVE.includes(kind)
        ? '：填写参数后在线试算，结果由后端工具接口实时计算。'
        : '：以下为该功能的判定规则与统计口径。'}
    </div>
  );

  /* —— 非交互型：仅规则说明 —— */
  if (!INTERACTIVE.includes(kind)) {
    return (
      <div className="content">
        {head}
        <RuleCard rule={rule} />
      </div>
    );
  }

  return (
    <div className="content">
      {head}
      {rule && <RuleCard rule={rule} />}

      {kind === 'calc' && (
        <>
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">储量核算参数</h3>
              <span className="card-sub">三率指标参与校验</span>
            </div>
            <div className="card-body">
              <div style={GRID}>
                <Field label="矿区面积（km²）" htmlFor="c-area">
                  <input id="c-area" className="input" type="number" step="0.01" value={calc.areaKm2} onChange={(e) => setCalc({ ...calc, areaKm2: e.target.value })} />
                </Field>
                <Field label="矿体平均厚度（m）" htmlFor="c-thick">
                  <input id="c-thick" className="input" type="number" step="0.1" value={calc.thickness} onChange={(e) => setCalc({ ...calc, thickness: e.target.value })} />
                </Field>
                <Field label="矿石体重（t/m³）" htmlFor="c-density">
                  <input id="c-density" className="input" type="number" step="0.1" value={calc.density} onChange={(e) => setCalc({ ...calc, density: e.target.value })} />
                </Field>
                <Field label="累计动用（万吨）" htmlFor="c-mined">
                  <input id="c-mined" className="input" type="number" value={calc.mined} onChange={(e) => setCalc({ ...calc, mined: e.target.value })} />
                </Field>
                <Field label="累计损失（万吨）" htmlFor="c-loss">
                  <input id="c-loss" className="input" type="number" value={calc.loss} onChange={(e) => setCalc({ ...calc, loss: e.target.value })} />
                </Field>
                <Field label="开采回采率（%）" htmlFor="c-recovery">
                  <input id="c-recovery" className="input" type="number" value={calc.recovery} onChange={(e) => setCalc({ ...calc, recovery: e.target.value })} />
                </Field>
                <Field label="矿石贫化率（%）" htmlFor="c-dilution">
                  <input id="c-dilution" className="input" type="number" value={calc.dilution} onChange={(e) => setCalc({ ...calc, dilution: e.target.value })} />
                </Field>
                <Field label="选矿回收率（%）" htmlFor="c-util">
                  <input id="c-util" className="input" type="number" value={calc.utilization} onChange={(e) => setCalc({ ...calc, utilization: e.target.value })} />
                </Field>
                <Field label="设计年产量（万吨）" htmlFor="c-output">
                  <input id="c-output" className="input" type="number" value={calc.annualOutput} onChange={(e) => setCalc({ ...calc, annualOutput: e.target.value })} />
                </Field>
              </div>
              <div style={{ ...ROW, marginTop: 12 }}>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={doCalc}>
                  <Ic icon={PlayCircleIcon} size={14} /> 计算保有储量与三率
                </button>
                <span className="card-sub">未点击测算前不产生任何数值</span>
              </div>
            </div>
          </div>

          {calcRes && (
            <ResultCard title="储量核算结果" sub="单位：万吨 / 年">
              <MiniKpi
                items={[
                  { label: '累计查明资源量', value: nf(calcRes.result.resourceTotal), unit: '万吨' },
                  { label: '保有资源量', value: nf(calcRes.result.remaining), unit: '万吨' },
                  { label: '累计动用', value: nf(calcRes.result.mined), unit: '万吨' },
                  { label: '可服务年限', value: calcRes.result.serviceYears ?? '—', unit: '年' }
                ]}
              />
              <div style={{ ...ROW, marginTop: 10 }}>
                {calcRes.checks.map((c) => (
                  <span key={c.key} className={`tag ${c.ok ? 'tag--green' : 'tag--red'}`}>
                    {c.label} {c.value}%（标准 {c.standard}）
                  </span>
                ))}
              </div>
              <div className={`alert-line ${calcRes.checks.every((c) => c.ok) ? 'ok' : 'err'}`}>{calcRes.conclusion}</div>
            </ResultCard>
          )}

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">空间叠置测算</h3>
              <span className="card-sub">多边形与矿产地、矿业权重叠</span>
            </div>
            <div className="card-body">
              <p style={NOTE}>每行一个顶点，格式「经度,纬度」，至少 3 行。</p>
              <textarea
                className="textarea"
                rows={4}
                style={{ marginTop: 8 }}
                value={polyText}
                onChange={(e) => setPolyText(e.target.value)}
                placeholder="120.05,30.92"
                aria-label="多边形顶点"
              />
              <div style={{ ...ROW, marginTop: 10 }}>
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={doOverlay}>
                  <Ic icon={PlayCircleIcon} size={14} /> 测算重叠面积
                </button>
              </div>
            </div>
          </div>

          {overlayRes && (
            <ResultCard title="空间叠置结果" sub={`命中 ${overlayRes.hits.length} 个对象`}>
              <MiniKpi
                items={[
                  { label: '查询面积', value: nf(overlayRes.summary.area, 4), unit: 'km²' },
                  { label: '重叠面积', value: nf(overlayRes.summary.overlapArea, 4), unit: 'km²' },
                  { label: '重叠比例', value: nf(overlayRes.summary.overlapRatio), unit: '%' },
                  { label: '压覆资源量', value: nf(overlayRes.summary.reserveOverlap), unit: '万吨' }
                ]}
              />
              {overlayRes.hits.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <DataTable
                    head={[
                      { label: '名称' },
                      { label: '类型' },
                      { label: '重叠面积(km²)', right: true },
                      { label: '重叠比例', right: true }
                    ]}
                    rows={overlayRes.hits.slice(0, 8).map((h) => (
                      <tr key={`${h.kind}-${h.id}`}>
                        <td>{h.name}</td>
                        <td>{h.kind}</td>
                        <td align="right" className="num">{nf(h.overlapArea, 4)}</td>
                        <td align="right" className="num">{nf(h.overlapRatio * 100, 1)}%</td>
                      </tr>
                    ))}
                  />
                </div>
              )}
              <div className="alert-line">{overlayRes.conclusion}</div>
            </ResultCard>
          )}
        </>
      )}

      {(kind === 'precheck' || kind === 'compliance' || kind === 'scopeArgument') && (
        <>
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">拟选址参数</h3>
              <span className="card-sub">与三区三线、规划区块、矿产地叠置</span>
            </div>
            <div className="card-body">
              <div style={GRID}>
                <Field label="拟选址经度" htmlFor="p-lon">
                  <input id="p-lon" className="input" type="number" step="0.0001" value={pre.lon} onChange={(e) => setPre({ ...pre, lon: e.target.value })} />
                </Field>
                <Field label="拟选址纬度" htmlFor="p-lat">
                  <input id="p-lat" className="input" type="number" step="0.0001" value={pre.lat} onChange={(e) => setPre({ ...pre, lat: e.target.value })} />
                </Field>
                <Field label="区块面积（km²）" htmlFor="p-area">
                  <input id="p-area" className="input" type="number" step="0.01" value={pre.areaKm2} onChange={(e) => setPre({ ...pre, areaKm2: e.target.value })} />
                </Field>
              </div>
              <div style={{ ...ROW, marginTop: 12 }}>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={doPre}>
                  <Ic icon={PlayCircleIcon} size={14} /> 一键合规审查
                </button>
                <span className="card-sub">未点击审查前不产生任何判定</span>
              </div>
            </div>
          </div>

          {preRes && (
            <ResultCard title="合规审查结果">
              <div className={`alert-line ${preRes.blocking.length ? 'err' : preRes.limiting.length ? '' : 'ok'}`} style={{ marginTop: 0 }}>
                {preRes.conclusion}
              </div>
              <div style={{ marginTop: 10 }}>
                <DataTable
                  head={[{ label: '审查规则' }, { label: '判定结果' }, { label: '结论', right: true }]}
                  rows={preRes.rules.map((r) => (
                    <tr key={r.rule}>
                      <td>{r.rule}</td>
                      <td>{r.result}</td>
                      <td align="right">
                        <span className={`tag ${r.ok ? 'tag--green' : 'tag--red'}`}>{r.ok ? '通过' : '不通过'}</span>
                      </td>
                    </tr>
                  ))}
                />
              </div>
              {preRes.zones.length > 0 && (
                <p style={{ ...NOTE, marginTop: 10 }}>
                  涉及规划区块：{preRes.zones.slice(0, 3).map((z) => `${z.name}（${z.zone_type}）`).join('、')}
                </p>
              )}
            </ResultCard>
          )}
        </>
      )}

      {kind === 'greenScore' && (
        <>
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">六大维度自评</h3>
              <span className="card-sub">权重内置，拖动分值后核算</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {DIMS.map((d) => (
                  <div key={d.key}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <span className="field-label">{d.name}（权重 {(d.weight * 100).toFixed(0)}%）</span>
                      <b style={{ fontSize: 13, color: 'var(--cyan-2)' }}>{green[d.key]} 分</b>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={green[d.key]}
                      onChange={(e) => setGreen({ ...green, [d.key]: Number(e.target.value) })}
                      style={{ width: '100%', accentColor: 'var(--cyan)' }}
                      aria-label={d.name}
                    />
                  </div>
                ))}
              </div>
              <div style={{ ...ROW, marginTop: 12 }}>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={doGreen}>
                  <Ic icon={PlayCircleIcon} size={14} /> 核算综合得分
                </button>
              </div>
            </div>
          </div>

          {greenRes && (
            <ResultCard title="评价结果" sub={greenRes.grade}>
              <MiniKpi items={[{ label: '综合得分', value: greenRes.total, unit: '分' }, { label: '评价等级', value: greenRes.grade }]} />
              {greenRes.suggestions.length > 0 && (
                <ol style={{ margin: '12px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, lineHeight: 1.7, color: 'var(--text-2)' }}>
                  {greenRes.suggestions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              )}
            </ResultCard>
          )}
        </>
      )}

      {kind === 'developCheck' && (
        <>
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">开发利用方案参数</h3>
              <span className="card-sub">技术指标与服务年限匹配校验</span>
            </div>
            <div className="card-body">
              <div style={GRID}>
                <Field label="设计生产规模（万吨/年）" htmlFor="d-scale">
                  <input id="d-scale" className="input" type="number" value={dev.scale} onChange={(e) => setDev({ ...dev, scale: e.target.value })} />
                </Field>
                <Field label="设计服务年限（年）" htmlFor="d-years">
                  <input id="d-years" className="input" type="number" value={dev.years} onChange={(e) => setDev({ ...dev, years: e.target.value })} />
                </Field>
                <Field label="剩余可采储量（万吨）" htmlFor="d-reserve">
                  <input id="d-reserve" className="input" type="number" value={dev.reserve} onChange={(e) => setDev({ ...dev, reserve: e.target.value })} />
                </Field>
                <Field label="开采回采率（%）" htmlFor="d-recovery">
                  <input id="d-recovery" className="input" type="number" value={dev.recovery} onChange={(e) => setDev({ ...dev, recovery: e.target.value })} />
                </Field>
                <Field label="矿石贫化率（%）" htmlFor="d-dilution">
                  <input id="d-dilution" className="input" type="number" value={dev.dilution} onChange={(e) => setDev({ ...dev, dilution: e.target.value })} />
                </Field>
                <Field label="选矿回收率（%）" htmlFor="d-util">
                  <input id="d-util" className="input" type="number" value={dev.utilization} onChange={(e) => setDev({ ...dev, utilization: e.target.value })} />
                </Field>
              </div>
              <div style={{ ...ROW, marginTop: 12 }}>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={doDev}>
                  <Ic icon={PlayCircleIcon} size={14} /> 校验技术指标
                </button>
              </div>
            </div>
          </div>

          {devRes && (
            <ResultCard title="校验结果">
              <DataTable
                head={[{ label: '校验项' }, { label: '取值' }, { label: '判定说明' }, { label: '结果', right: true }]}
                minWidth={520}
                rows={devRes.items.map((i) => (
                  <tr key={i.name}>
                    <td>{i.name}</td>
                    <td>{i.value}</td>
                    <td>{i.note}</td>
                    <td align="right">
                      <span className={`tag ${i.ok ? 'tag--green' : 'tag--red'}`}>{i.ok ? '符合' : '不符合'}</span>
                    </td>
                  </tr>
                ))}
              />
            </ResultCard>
          )}
        </>
      )}

      {kind === 'credit' && (
        <>
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">信用评分参数</h3>
              <span className="card-sub">处罚、异常名录、绿色等级、年报公示</span>
            </div>
            <div className="card-body">
              <div style={GRID}>
                <Field label="行政处罚次数" htmlFor="cr-punish">
                  <input id="cr-punish" className="input" type="number" value={credit.punishCount} onChange={(e) => setCredit({ ...credit, punishCount: Number(e.target.value) })} />
                </Field>
                <Field label="是否列入异常名录" htmlFor="cr-abnormal">
                  <select id="cr-abnormal" className="select" value={credit.abnormal} onChange={(e) => setCredit({ ...credit, abnormal: Number(e.target.value) })}>
                    <option value={0}>否</option>
                    <option value={1}>是</option>
                  </select>
                </Field>
                <Field label="绿色矿山等级" htmlFor="cr-green">
                  <select id="cr-green" className="select" value={credit.greenLevel} onChange={(e) => setCredit({ ...credit, greenLevel: e.target.value })}>
                    {['未入库', '市级', '省级', '国家级'].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </Field>
                <Field label="年报是否按期公示" htmlFor="cr-annual">
                  <select id="cr-annual" className="select" value={String(credit.annualOk)} onChange={(e) => setCredit({ ...credit, annualOk: e.target.value === 'true' })}>
                    <option value="true">是</option>
                    <option value="false">否</option>
                  </select>
                </Field>
              </div>
              <div style={{ ...ROW, marginTop: 12 }}>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={doCredit}>
                  <Ic icon={PlayCircleIcon} size={14} /> 测算信用评分
                </button>
              </div>
            </div>
          </div>

          {creditRes && (
            <ResultCard title="信用评分结果" sub={creditRes.listType}>
              <MiniKpi
                items={[
                  { label: '信用得分', value: creditRes.score, unit: '分' },
                  { label: '信用等级', value: creditRes.level },
                  { label: '名单类型', value: creditRes.listType }
                ]}
              />
              <div style={{ ...ROW, marginTop: 10 }}>
                {creditRes.breakdown.map((b) => (
                  <span className="tag tag--grey" key={b.name}>{b.name} {b.value > 0 ? `+${b.value}` : b.value}</span>
                ))}
              </div>
              <div className="alert-line">监管措施：{creditRes.measure}</div>
            </ResultCard>
          )}
        </>
      )}

      {kind === 'quota' && (
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">年度配额与核销</h3>
            <span className="card-sub">按矿种统计控制指标执行情况</span>
          </div>
          <div className="card-body">
            <div style={ROW}>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={loadQuota}>
                <Ic icon={PlayCircleIcon} size={14} /> 加载年度配额与核销情况
              </button>
            </div>
            {quota && (
              <div style={{ marginTop: 12 }}>
                <DataTable
                  head={[
                    { label: '矿种' },
                    { label: '矿山数', right: true },
                    { label: '控制指标', right: true },
                    { label: '已发放', right: true },
                    { label: '实际产量', right: true },
                    { label: '余量', right: true },
                    { label: '状态' }
                  ]}
                  minWidth={620}
                  rows={quota.list.map((q) => (
                    <tr key={q.mineral}>
                      <td>{q.mineral}</td>
                      <td align="right" className="num">{q.mines}</td>
                      <td align="right" className="num">{nf(q.quota)}</td>
                      <td align="right" className="num">{nf(q.issued)}</td>
                      <td align="right" className="num">{nf(q.actual)}</td>
                      <td align="right" className="num">{nf(q.balance)}</td>
                      <td><span className={`tag ${q.warn === '超指标' ? 'tag--red' : 'tag--green'}`}>{q.warn}</span></td>
                    </tr>
                  ))}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {kind === 'order' && (
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">超时未处置工单</h3>
            <span className="card-sub">按超期天数排序</span>
          </div>
          <div className="card-body">
            <div style={ROW}>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={loadOverdue}>
                <Ic icon={Alert02Icon} size={14} /> 加载超时未处置工单
              </button>
            </div>
            {overdue && (overdue.list.length === 0 ? (
              <div className="empty" style={{ minHeight: 96, marginTop: 12 }}>
                <span className="empty-icon"><Ic icon={Tick02Icon} size={18} /></span>
                <p className="empty-text">当前没有超时未处置工单</p>
              </div>
            ) : (
              <div style={{ marginTop: 12 }}>
                <DataTable
                  head={[{ label: '工单编号' }, { label: '矿山' }, { label: '区县' }, { label: '状态' }, { label: '期限' }, { label: '超期天数', right: true }]}
                  minWidth={620}
                  rows={overdue.list.slice(0, 8).map((o) => (
                    <tr key={o.id}>
                      <td>{o.order_no}</td>
                      <td>{o.mine_name}</td>
                      <td>{o.region_name}</td>
                      <td>{o.status}</td>
                      <td>{o.due_at}</td>
                      <td align="right" className="num" style={{ color: 'var(--red)' }}>{o.overdueDays}</td>
                    </tr>
                  ))}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
