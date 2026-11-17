import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Ic } from '../components/Icon';
import { useApp } from '../store.jsx';
import { biz } from '../api';
import {
  Add01Icon, ArrowRight01Icon, ChartHistogramIcon, CheckmarkBadge02Icon, Database01Icon,
  File01Icon, InboxIcon, QrCodeIcon, StarIcon, Task01Icon
} from '@hugeicons/core-free-icons';

const MODULE_ICON = {
  deposit: Database01Icon,
  plan: Task01Icon,
  rights: File01Icon,
  green: StarIcon,
  supervise: CheckmarkBadge02Icon,
  geology: ChartHistogramIcon
};

function badgeOf(f) {
  if (f.special) return { text: '分析工具', tone: 'cyan' };
  if (f.score) return { text: '辅助评价', tone: 'green' };
  if (f.qr || f.archive) return { text: '一矿一档', tone: 'blue' };
  if (f.readonly) return { text: '台账查询', tone: 'grey' };
  if (f.workflow) return { text: '流程办理', tone: 'orange' };
  return { text: '登记台账', tone: 'blue' };
}

export default function ModuleHome() {
  const { module } = useParams();
  const nav = useNavigate();
  const { bootMeta } = useApp();
  const [counts, setCounts] = useState({});

  const mod = useMemo(
    () => (bootMeta?.modules || []).find((m) => m.key === module),
    [bootMeta, module]
  );

  useEffect(() => {
    let alive = true;
    const features = mod?.features || [];
    if (!features.length) return undefined;
    Promise.all(
      features.map((f) =>
        biz
          .list(module, f.key, { page: 1, pageSize: 1 })
          .then((r) => [f.key, r?.data?.total ?? r?.total ?? 0])
          .catch(() => [f.key, null])
      )
    ).then((pairs) => {
      if (!alive) return;
      const next = {};
      pairs.forEach(([k, v]) => {
        next[k] = v;
      });
      setCounts(next);
    });
    return () => {
      alive = false;
    };
  }, [module, mod]);

  if (!bootMeta) return <div className="loading"><span className="spinner" />正在加载业务规格 …</div>;
  if (!mod) {
    return (
      <div className="page">
        <div className="card">未找到业务域「{module}」，请从顶部导航重新进入。</div>
      </div>
    );
  }

  const total = useMemo(() => {
    const seen = new Set();
    let sum = 0;
    (mod?.features || []).forEach((f) => {
      const cnt = Number(counts[f.key]);
      if (!Number.isFinite(cnt) || cnt <= 0) return;
      /* 同一张物理表被多个功能点引用时只计一次（如 矿业权一张图 / 统计分析） */
      const key = f.table && f.table !== 'biz_record' ? f.table : `f:${f.key}`;
      if (seen.has(key)) return;
      seen.add(key);
      sum += cnt;
    });
    return sum;
  }, [counts, mod]);
  const Icon = MODULE_ICON[mod.key] || InboxIcon;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Ic icon={Icon} size={20} />
            {mod.name}
          </h1>
          <p className="desc">{mod.intro}</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={() => nav('/dashboard')}>
            打开驾驶舱
          </button>
          <button type="button" className="btn" onClick={() => nav(`/biz/${mod.key}/${mod.features[0]?.key}`)}>
            进入首个功能
            <Ic icon={ArrowRight01Icon} size={14} />
          </button>
        </div>
      </header>

      <div className="grid-4" style={{ marginBottom: 16 }}>
        <div className="kpi">
          <div className="k">业务功能点</div>
          <div className="v">{mod.features.length}<small>项</small></div>
          <div className="s">覆盖功能设计文档对应章节</div>
        </div>
        <div className="kpi">
          <div className="k">台账记录</div>
          <div className="v">{total.toLocaleString('zh-CN')}<small>条</small></div>
          <div className="s">演示数据集，可按流程新增与流转</div>
        </div>
        <div className="kpi">
          <div className="k">流程办理</div>
          <div className="v">{mod.features.filter((f) => f.workflow).length}<small>个</small></div>
          <div className="s">支持审核、退回补正与归档</div>
        </div>
        <div className="kpi">
          <div className="k">统计与工具</div>
          <div className="v">{mod.features.filter((f) => f.special || f.score).length}<small>个</small></div>
          <div className="s">实时聚合、评分类辅助决策</div>
        </div>
      </div>

      <div className="module-cards">
        {mod.features.map((f) => {
          const badge = badgeOf(f);
          const cnt = counts[f.key];
          return (
            <button
              key={f.key}
              type="button"
              className="feature-card"
              onClick={() => nav(`/biz/${mod.key}/${f.key}`)}
            >
              <h4>
                <Ic icon={f.special ? ChartHistogramIcon : f.qr || f.archive ? QrCodeIcon : Add01Icon} size={14} />
                {f.name}
              </h4>
              <p>{f.desc}</p>
              <div className="foot">
                <span className={`tag tone-${badge.tone}`}>{badge.text}</span>
                <span>{cnt === undefined ? '统计中 …' : cnt === null ? '—' : `${cnt.toLocaleString('zh-CN')} 条`}</span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="muted tiny" style={{ marginTop: 18, lineHeight: 1.8 }}>
        说明：本页功能点与《功能设计文档》章节一一对应；演示数据由 seed 生成，仅用于功能验证，不代表真实统计口径。
      </p>
    </div>
  );
}
