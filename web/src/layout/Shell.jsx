import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Ic, BrandMark } from '../components/Icon';
import { Modal } from '../components/Modal';
import { Toasts, useApp } from '../store';
import { sys } from '../api';
import {
  Alert02Icon, ChartLineData01Icon, Database01Icon, Logout01Icon, Menu01Icon,
  Notification01Icon, Settings01Icon, SmartPhone01Icon, UserIcon
} from '@hugeicons/core-free-icons';

const SCENE_ROUTES = {
  dashboard: '/dashboard',
  deposit: '/scene/deposit',
  plan: '/scene/plan',
  rights: '/scene/rights',
  green: '/scene/green',
  supervise: '/scene/supervise',
  geology: '/scene/geology'
};

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const p = (n) => String(n).padStart(2, '0');
  return {
    date: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`,
    time: `${p(now.getHours())}:${p(now.getMinutes())}`,
    second: p(now.getSeconds()),
    week: '日一二三四五六'[now.getDay()]
  };
}

function ProblemModal({ open, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!open) return;
    setErr('');
    sys.problem().then((r) => setData(r.data)).catch((e) => setErr(e.message));
  }, [open]);
  return (
    <Modal open={open} title="问题监测" subtitle="超期未办 / 预警未处置 / 指标越线" onClose={onClose}>
      {err && <div className="alert-line err">{err}</div>}
      {!data && !err && <div className="loading"><span className="spinner" />正在汇总 …</div>}
      {data && (
        <div className="stack">
          <div className="kpi-inline">
            <div><div className="k">待处置工单</div><div className="v">{data.orders?.pending ?? 0}<small>件</small></div></div>
            <div><div className="k">超期工单</div><div className="v warm">{data.orders?.overdue ?? 0}<small>件</small></div></div>
            <div><div className="k">未销号预警</div><div className="v warm">{data.openAlertCount ?? data.alerts?.length ?? 0}<small>条</small></div></div>
            <div><div className="k">红黄牌指标</div><div className="v warm">{data.indicators?.length ?? 0}<small>项</small></div></div>
          </div>
          <div className="desc-list">
            {(data.items || []).map((it, i) => (
              <div key={i} className="desc-item">
                <span className={`tag ${it.tone || ''}`}>{it.type}</span>
                <span className="grow">{it.title}</span>
                <span className="muted tiny">{it.at}</span>
              </div>
            ))}
            {(!data.items || data.items.length === 0) && <div className="muted small">当前没有需要督办的问题。</div>}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Shell() {
  const { user, bootMeta, logout } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const clock = useClock();
  const [problem, setProblem] = useState(false);
  const [menu, setMenu] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const menuRef = useRef(null);

  const scenes = bootMeta?.scenes || [];

  useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => setNavOpen(false), [loc.pathname]);

  const bleed = useMemo(() => /^\/(scene|dashboard|battle)/.test(loc.pathname), [loc.pathname]);

  const doLogout = () => {
    logout();
    nav('/login', { replace: true });
  };

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-left">
          <div className="clock">
            <b>{clock.date}</b>
            <span>{clock.time}<i>:{clock.second}</i></span>
          </div>
          <button type="button" className="pill" onClick={() => nav('/battle')}>
            <Ic icon={ChartLineData01Icon} size={14} />
            指标监测
          </button>
        </div>

        <div className="brand">
          <span className="brand-logo"><BrandMark size={34} /></span>
          <div className="brand-text">
            <div className="brand-title">省域空间治理数字化平台 - 绿矿智用</div>
            <div className="brand-sub" />
            <div className="brand-dots"><i className="on" /><i /><i /></div>
          </div>
        </div>

        <div className="topbar-right">
          <button type="button" className="pill" onClick={() => setProblem(true)}>
            <Ic icon={Alert02Icon} size={14} />
            问题监测
          </button>
          <div className="userbox" ref={menuRef}>
            <button type="button" className="who" onClick={() => setMenu((v) => !v)} aria-haspopup="menu" aria-expanded={menu}>
              <b>{user?.name || '未登录'}</b>
              <span>{user?.org || ''}</span>
            </button>
            <button type="button" className="avatar" onClick={() => setMenu((v) => !v)} aria-label="用户菜单">
              {(user?.name || '赵')[0]}
            </button>
            {menu && (
              <div className="user-menu" role="menu">
                <div className="um-head">
                  <b>{user?.name}</b>
                  <span>{bootMeta?.roles?.[user?.role] || user?.role}</span>
                  <span className="muted tiny">{user?.region_name || '浙江省'}</span>
                </div>
                <button type="button" onClick={() => { setMenu(false); nav('/system'); }}>
                  <Ic icon={Settings01Icon} size={14} /> 个人中心与系统管理
                </button>
                <button type="button" onClick={() => { setMenu(false); nav('/mobile'); }}>
                  <Ic icon={SmartPhone01Icon} size={14} /> 政务移动端
                </button>
                <button type="button" onClick={() => { setMenu(false); nav('/warehouse'); }}>
                  <Ic icon={Database01Icon} size={14} /> 绿矿智用数据仓
                </button>
                <button type="button" className="danger" onClick={doLogout}>
                  <Ic icon={Logout01Icon} size={14} /> 退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="scene-nav" aria-label="一级场景导航">
        <div className={`nav-links${navOpen ? ' open' : ''}`}>
          <NavLink to="/portal" className={({ isActive }) => `nav-link${isActive ? ' on' : ''}`}>
            平台分布
          </NavLink>
          {scenes.map((s) => (
            <NavLink
              key={s.key}
              to={SCENE_ROUTES[s.key] || `/${s.key}`}
              className={({ isActive }) => `nav-link${isActive ? ' on' : ''}`}
            >
              {s.name}
            </NavLink>
          ))}
        </div>
        <div className="nav-right">
          <NavLink to="/warehouse" className="nav-mini"><Ic icon={Database01Icon} size={13} /> 数据仓</NavLink>
          <NavLink to="/mobile" className="nav-mini"><Ic icon={SmartPhone01Icon} size={13} /> 移动端</NavLink>
          <NavLink to="/system" className="nav-mini"><Ic icon={UserIcon} size={13} /> 系统</NavLink>
        </div>
        <button type="button" className="nav-toggle" onClick={() => setNavOpen((v) => !v)} aria-label="展开导航">
          <Ic icon={Menu01Icon} size={16} />
        </button>
      </nav>

      <main className={`shell-main${bleed ? ' bleed' : ''}`}>
        <Outlet />
      </main>

      <ProblemModal open={problem} onClose={() => setProblem(false)} />
      <Toasts />
    </div>
  );
}

export { SCENE_ROUTES };
