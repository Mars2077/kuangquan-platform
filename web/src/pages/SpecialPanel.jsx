import React, { useMemo, useState } from 'react';
import { Ic } from '../components/Icon';
import { useApp } from '../store.jsx';
import { tools } from '../api';
import { ChevronDownIcon, PlayCircleIcon, Tick02Icon, Alert02Icon, Target02Icon } from '@hugeicons/core-free-icons';

/**
 * 功能点附带的辅助分析面板。
 * 交互型功能（储量核算、选址合规、绿色矿山评分、开发利用校验、信用评分、指标配额、超时督办）
 * 直接调用 /api/tools/*；其余聚合型功能给出真实判定规则与口径说明，不编造数字。
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

function Field({ label, children }) {
  return (
    <div className="fld">
      <label>{label}</label>
      {children}
    </div>
  );
}

export default function SpecialPanel({ kind, spec, onChanged }) {
  const { toast } = useApp();
  const [open, setOpen] = useState(kind === 'calc' || kind === 'greenScore');
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

  const title = useMemo(() => {
    if (kind === 'calc') return '辅助计算 · 储量核算与空间叠置';
    if (kind === 'precheck') return '辅助规划实施 · 选址合规一键审查';
    if (kind === 'compliance') return '规划动态调整 · 合规性预检';
    if (kind === 'scopeArgument') return '范围论证 · 空间叠置与避让建议';
    if (kind === 'greenScore') return '申报指标辅助评价（六大维度）';
    if (kind === 'developCheck') return '开发利用方案技术指标校验';
    if (kind === 'credit') return '矿企信用评分测算';
    if (kind === 'quota') return '保护矿种年度开采总量控制';
    if (kind === 'order') return '超时未处置工单督办';
    return rule?.title || '功能说明';
  }, [kind, rule]);

  const interactive = ['calc', 'precheck', 'compliance', 'scopeArgument', 'greenScore', 'developCheck', 'credit', 'quota', 'order'].includes(kind);

  if (!interactive && !rule) return null;

  return (
    <section className="card" style={{ marginBottom: 14 }}>
      <h3 style={{ justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setOpen((v) => !v)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ic icon={Target02Icon} size={14} />
          {title}
        </span>
        <span className="muted tiny" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {interactive ? '展开试算' : '查看规则'}
          <Ic icon={ChevronDownIcon} size={12} />
        </span>
      </h3>

      {!open && <p className="muted tiny" style={{ lineHeight: 1.7 }}>{rule?.intro || '该功能提供在线试算，展开后可输入参数查看测算结果。'}</p>}

      {open && (
        <>
          {rule && (
            <>
              <p className="muted tiny" style={{ lineHeight: 1.8, marginBottom: 10 }}>{rule.intro}</p>
              <ul className="rule-list">
                {rule.items.map((t) => (<li key={t}>{t}</li>))}
              </ul>
            </>
          )}

          {kind === 'calc' && (
            <div style={{ marginTop: 14 }}>
              <div className="form-grid cols-3">
                <Field label="矿区面积（km²）"><input className="input" type="number" step="0.01" value={calc.areaKm2} onChange={(e) => setCalc({ ...calc, areaKm2: e.target.value })} /></Field>
                <Field label="矿体平均厚度（m）"><input className="input" type="number" step="0.1" value={calc.thickness} onChange={(e) => setCalc({ ...calc, thickness: e.target.value })} /></Field>
                <Field label="矿石体重（t/m³）"><input className="input" type="number" step="0.1" value={calc.density} onChange={(e) => setCalc({ ...calc, density: e.target.value })} /></Field>
                <Field label="累计动用（万吨）"><input className="input" type="number" value={calc.mined} onChange={(e) => setCalc({ ...calc, mined: e.target.value })} /></Field>
                <Field label="累计损失（万吨）"><input className="input" type="number" value={calc.loss} onChange={(e) => setCalc({ ...calc, loss: e.target.value })} /></Field>
                <Field label="开采回采率（%）"><input className="input" type="number" value={calc.recovery} onChange={(e) => setCalc({ ...calc, recovery: e.target.value })} /></Field>
                <Field label="矿石贫化率（%）"><input className="input" type="number" value={calc.dilution} onChange={(e) => setCalc({ ...calc, dilution: e.target.value })} /></Field>
                <Field label="选矿回收率（%）"><input className="input" type="number" value={calc.utilization} onChange={(e) => setCalc({ ...calc, utilization: e.target.value })} /></Field>
                <Field label="设计年产量（万吨）"><input className="input" type="number" value={calc.annualOutput} onChange={(e) => setCalc({ ...calc, annualOutput: e.target.value })} /></Field>
              </div>
              <div className="actions" style={{ marginTop: 12 }}>
                <button type="button" className="btn" disabled={busy} onClick={doCalc}>
                  <Ic icon={PlayCircleIcon} size={14} /> 计算保有储量与三率
                </button>
              </div>
              {calcRes && (
                <div className="calc-result">
                  <div className="grid-4">
                    <div className="kpi"><div className="k">累计查明资源量</div><div className="v">{nf(calcRes.result.resourceTotal)}<small>万吨</small></div></div>
                    <div className="kpi"><div className="k">保有资源量</div><div className="v">{nf(calcRes.result.remaining)}<small>万吨</small></div></div>
                    <div className="kpi"><div className="k">累计动用</div><div className="v">{nf(calcRes.result.mined)}<small>万吨</small></div></div>
                    <div className="kpi"><div className="k">可服务年限</div><div className="v">{calcRes.result.serviceYears ?? '—'}<small>年</small></div></div>
                  </div>
                  <div className="tag-list" style={{ marginTop: 10 }}>
                    {calcRes.checks.map((c) => (
                      <span key={c.key} className={`tag tone-${c.ok ? 'green' : 'red'}`}>
                        {c.label} {c.value}%（标准 {c.standard}）
                      </span>
                    ))}
                  </div>
                  <p className="muted tiny" style={{ marginTop: 8, lineHeight: 1.7 }}>{calcRes.conclusion}</p>
                </div>
              )}

              <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px dashed rgba(64,158,255,0.2)' }}>
                <div className="block-label">空间叠置测算（绘制多边形，测算与矿产地、矿业权的重叠面积与压覆资源量）</div>
                <textarea className="textarea" rows={4} value={polyText} onChange={(e) => setPolyText(e.target.value)} placeholder="每行一个顶点：经度,纬度" />
                <div className="actions" style={{ marginTop: 10 }}>
                  <button type="button" className="btn btn-ghost" disabled={busy} onClick={doOverlay}>
                    <Ic icon={PlayCircleIcon} size={14} /> 测算重叠面积
                  </button>
                </div>
                {overlayRes && (
                  <div style={{ marginTop: 12 }}>
                    <div className="grid-4">
                      <div className="kpi"><div className="k">查询面积</div><div className="v">{nf(overlayRes.summary.area, 4)}<small>km²</small></div></div>
                      <div className="kpi"><div className="k">重叠面积</div><div className="v">{nf(overlayRes.summary.overlapArea, 4)}<small>km²</small></div></div>
                      <div className="kpi"><div className="k">重叠比例</div><div className="v">{nf(overlayRes.summary.overlapRatio)}<small>%</small></div></div>
                      <div className="kpi"><div className="k">压覆资源量</div><div className="v">{nf(overlayRes.summary.reserveOverlap)}<small>万吨</small></div></div>
                    </div>
                    {overlayRes.hits.length > 0 && (
                      <table className="data-table dense" style={{ marginTop: 10 }}>
                        <thead><tr><th>名称</th><th>类型</th><th className="num">重叠面积(km²)</th><th className="num">重叠比例</th></tr></thead>
                        <tbody>
                          {overlayRes.hits.slice(0, 8).map((h) => (
                            <tr key={`${h.kind}-${h.id}`}>
                              <td>{h.name}</td>
                              <td>{h.kind}</td>
                              <td className="num">{nf(h.overlapArea, 4)}</td>
                              <td className="num">{nf(h.overlapRatio * 100, 1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <p className="muted tiny" style={{ marginTop: 8, lineHeight: 1.7 }}>{overlayRes.conclusion}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {(kind === 'precheck' || kind === 'compliance' || kind === 'scopeArgument') && (
            <div style={{ marginTop: 14 }}>
              <div className="form-grid cols-3">
                <Field label="拟选址经度"><input className="input" type="number" step="0.0001" value={pre.lon} onChange={(e) => setPre({ ...pre, lon: e.target.value })} /></Field>
                <Field label="拟选址纬度"><input className="input" type="number" step="0.0001" value={pre.lat} onChange={(e) => setPre({ ...pre, lat: e.target.value })} /></Field>
                <Field label="区块面积（km²）"><input className="input" type="number" step="0.01" value={pre.areaKm2} onChange={(e) => setPre({ ...pre, areaKm2: e.target.value })} /></Field>
              </div>
              <div className="actions" style={{ marginTop: 12 }}>
                <button type="button" className="btn" disabled={busy} onClick={doPre}>
                  <Ic icon={PlayCircleIcon} size={14} /> 一键合规审查
                </button>
              </div>
              {preRes && (
                <div style={{ marginTop: 12 }}>
                  <div className={`alert-line ${preRes.blocking.length ? 'err' : preRes.limiting.length ? 'warn' : 'ok'}`} style={{ marginBottom: 10 }}>
                    {preRes.conclusion}
                  </div>
                  <table className="data-table dense">
                    <thead><tr><th>审查规则</th><th>判定结果</th><th style={{ width: 80 }}>结论</th></tr></thead>
                    <tbody>
                      {preRes.rules.map((r) => (
                        <tr key={r.rule}>
                          <td>{r.rule}</td>
                          <td>{r.result}</td>
                          <td>{r.ok ? <span className="tag tone-green">通过</span> : <span className="tag tone-red">不通过</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preRes.zones.length > 0 && (
                    <p className="muted tiny" style={{ marginTop: 8, lineHeight: 1.7 }}>
                      涉及规划区块：{preRes.zones.slice(0, 3).map((z) => `${z.name}（${z.zone_type}）`).join('、')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {kind === 'greenScore' && (
            <div style={{ marginTop: 14 }}>
              <div className="dim-list">
                {DIMS.map((d) => (
                  <div className="dim-row" key={d.key}>
                    <div className="t"><span>{d.name}（权重 {(d.weight * 100).toFixed(0)}%）</span><b>{green[d.key]} 分</b></div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={green[d.key]}
                      onChange={(e) => setGreen({ ...green, [d.key]: Number(e.target.value) })}
                      style={{ width: '100%' }}
                      aria-label={d.name}
                    />
                  </div>
                ))}
              </div>
              <div className="actions" style={{ marginTop: 12 }}>
                <button type="button" className="btn" disabled={busy} onClick={doGreen}>
                  <Ic icon={PlayCircleIcon} size={14} /> 核算综合得分
                </button>
              </div>
              {greenRes && (
                <div style={{ marginTop: 12 }}>
                  <div className="score-ring">
                    <div className="num">{greenRes.total}<small>分</small></div>
                    <span className={`tag tone-${greenRes.grade === '优秀' ? 'green' : greenRes.grade === '良好' ? 'cyan' : greenRes.grade === '合格' ? 'yellow' : 'red'}`}>{greenRes.grade}</span>
                  </div>
                  <ul className="rule-list" style={{ marginTop: 10 }}>
                    {greenRes.suggestions.map((s) => (<li key={s}>{s}</li>))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {kind === 'developCheck' && (
            <div style={{ marginTop: 14 }}>
              <div className="form-grid cols-3">
                <Field label="设计生产规模（万吨/年）"><input className="input" type="number" value={dev.scale} onChange={(e) => setDev({ ...dev, scale: e.target.value })} /></Field>
                <Field label="设计服务年限（年）"><input className="input" type="number" value={dev.years} onChange={(e) => setDev({ ...dev, years: e.target.value })} /></Field>
                <Field label="剩余可采储量（万吨）"><input className="input" type="number" value={dev.reserve} onChange={(e) => setDev({ ...dev, reserve: e.target.value })} /></Field>
                <Field label="开采回采率（%）"><input className="input" type="number" value={dev.recovery} onChange={(e) => setDev({ ...dev, recovery: e.target.value })} /></Field>
                <Field label="矿石贫化率（%）"><input className="input" type="number" value={dev.dilution} onChange={(e) => setDev({ ...dev, dilution: e.target.value })} /></Field>
                <Field label="选矿回收率（%）"><input className="input" type="number" value={dev.utilization} onChange={(e) => setDev({ ...dev, utilization: e.target.value })} /></Field>
              </div>
              <div className="actions" style={{ marginTop: 12 }}>
                <button type="button" className="btn" disabled={busy} onClick={doDev}>
                  <Ic icon={PlayCircleIcon} size={14} /> 校验技术指标
                </button>
              </div>
              {devRes && (
                <table className="data-table dense" style={{ marginTop: 12 }}>
                  <thead><tr><th>校验项</th><th>取值</th><th>判定说明</th><th style={{ width: 70 }}>结果</th></tr></thead>
                  <tbody>
                    {devRes.items.map((i) => (
                      <tr key={i.name}>
                        <td>{i.name}</td>
                        <td>{i.value}</td>
                        <td>{i.note}</td>
                        <td>{i.ok ? <span className="tag tone-green">符合</span> : <span className="tag tone-red">不符合</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {kind === 'credit' && (
            <div style={{ marginTop: 14 }}>
              <div className="form-grid cols-3">
                <Field label="行政处罚次数"><input className="input" type="number" value={credit.punishCount} onChange={(e) => setCredit({ ...credit, punishCount: Number(e.target.value) })} /></Field>
                <Field label="是否列入异常名录">
                  <select className="select" value={credit.abnormal} onChange={(e) => setCredit({ ...credit, abnormal: Number(e.target.value) })}>
                    <option value={0}>否</option>
                    <option value={1}>是</option>
                  </select>
                </Field>
                <Field label="绿色矿山等级">
                  <select className="select" value={credit.greenLevel} onChange={(e) => setCredit({ ...credit, greenLevel: e.target.value })}>
                    {['未入库', '市级', '省级', '国家级'].map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="年报是否按期公示">
                  <select className="select" value={String(credit.annualOk)} onChange={(e) => setCredit({ ...credit, annualOk: e.target.value === 'true' })}>
                    <option value="true">是</option>
                    <option value="false">否</option>
                  </select>
                </Field>
              </div>
              <div className="actions" style={{ marginTop: 12 }}>
                <button type="button" className="btn" disabled={busy} onClick={doCredit}>
                  <Ic icon={PlayCircleIcon} size={14} /> 测算信用评分
                </button>
              </div>
              {creditRes && (
                <div style={{ marginTop: 12 }}>
                  <div className="score-ring">
                    <div className="num">{creditRes.score}<small>分</small></div>
                    <span className="tag tone-cyan">{creditRes.level} 级</span>
                    <span className={`tag tone-${creditRes.listType === '红名单' ? 'green' : creditRes.listType === '黑名单' ? 'red' : 'grey'}`}>{creditRes.listType}</span>
                  </div>
                  <div className="tag-list" style={{ marginTop: 10 }}>
                    {creditRes.breakdown.map((b) => (
                      <span className="tag tone-grey" key={b.name}>{b.name} {b.value > 0 ? `+${b.value}` : b.value}</span>
                    ))}
                  </div>
                  <p className="muted tiny" style={{ marginTop: 8, lineHeight: 1.7 }}>监管措施：{creditRes.measure}</p>
                </div>
              )}
            </div>
          )}

          {kind === 'quota' && (
            <div style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={loadQuota}>
                <Ic icon={PlayCircleIcon} size={14} /> 加载年度配额与核销情况
              </button>
              {quota && (
                <table className="data-table dense" style={{ marginTop: 12 }}>
                  <thead><tr><th>矿种</th><th className="num">矿山数</th><th className="num">控制指标</th><th className="num">已发放</th><th className="num">实际产量</th><th className="num">余量</th><th>状态</th></tr></thead>
                  <tbody>
                    {quota.list.map((q) => (
                      <tr key={q.mineral}>
                        <td>{q.mineral}</td>
                        <td className="num">{q.mines}</td>
                        <td className="num">{nf(q.quota)}</td>
                        <td className="num">{nf(q.issued)}</td>
                        <td className="num">{nf(q.actual)}</td>
                        <td className="num">{nf(q.balance)}</td>
                        <td><span className={`tag tone-${q.warn === '超指标' ? 'red' : 'green'}`}>{q.warn}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {kind === 'order' && (
            <div style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={loadOverdue}>
                <Ic icon={Alert02Icon} size={14} /> 加载超时未处置工单
              </button>
              {overdue && (
                overdue.list.length === 0 ? (
                  <p className="muted tiny" style={{ marginTop: 10 }}>
                    <Ic icon={Tick02Icon} size={12} /> 当前没有超时未处置工单。
                  </p>
                ) : (
                  <table className="data-table dense" style={{ marginTop: 12 }}>
                    <thead><tr><th>工单编号</th><th>矿山</th><th>区县</th><th>状态</th><th>期限</th><th className="num">超期天数</th></tr></thead>
                    <tbody>
                      {overdue.list.slice(0, 8).map((o) => (
                        <tr key={o.id}>
                          <td>{o.order_no}</td>
                          <td>{o.mine_name}</td>
                          <td>{o.region_name}</td>
                          <td>{o.status}</td>
                          <td>{o.due_at}</td>
                          <td className="num" style={{ color: 'var(--red)' }}>{o.overdueDays}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
