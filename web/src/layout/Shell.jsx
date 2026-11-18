import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Ic, BrandMark } from '../components/Icon';
import Drawer from '../components/Drawer';
import { Toasts, useApp } from '../store';
import { sys } from '../api';
import {
  Alert02Icon, Database01Icon, Logout01Icon, Menu01Icon,
  Settings01Icon, SmartPhone01Icon, UserIcon
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
    date: `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`,
    time: `${p(now.getHours())}:${p(now.getMinutes())}`,
    week: '日一二三四五六'[now.getDay()]
  };
}

function ProblemDrawer({ open, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!open) return;
    setErr('');
    sys.problem().then((r) => setData(r.data)).catch((e) => setErr(e.message));
  }, [open]);

  return (
    <Drawer
      open={open}
      title="问题监测"
      subtitle="超期未办 · 预警未处置 · 指标越线"
      onClose={onClose}
      width={560}
    >
      {err && <div className="empty"><p className="empty-text">{err}</p></div>}
      {!data && !err && <div className="skeleton"><i className="skeleton-line" /><i className="skeleton-line" /><i className="skeleton-line" /></div>}
      {data && (
        <div className="stack">
          <div className="kpi-row kpi-row--compact">
            <div className="kpi-card">
              <span className="kpi-label">待处置工单</span>
              <b className="kpi-value">{data.orders?.pending ?? 0}<i className="kpi-unit">件</i></b>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">超期工单</span>
              <b className="kpi-value is-warn">{data.orders?.overdue ?? 0}<i className="kpi-unit">件</i></b>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">未销号预警</span>
              <b className="kpi-value is-warn">{data.openAlertCount ?? 0}<i className="kpi-unit">条</i></b>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">红黄牌指标</span>
              <b className="kpi-value is-warn">{data.indicators?.length ?? 0}<i className="kpi-unit">项</i></b>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3 className="card-title">待督办清单</h3></div>
            <div className="card-body">
              {(data.items || []).length === 0 && (
                <div className="empty"><p className="empty-text">当前没有需要督办的问题</p></div>
              )}
              <ul className="list">
                {(data.items || []).map((it, i) => (
                  <li className="list-item" key={i}>
                    <span className="tag tag--orange">{it.type}</span>
                    <span className="list-main">{it.title}</span>
                    <span className="list-meta">{it.at}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Drawer>
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
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches);
  const menuRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const scenes = bootMeta?.scenes || [];

  useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    setNavOpen(false);
    setMenu(false);
  }, [loc.pathname]);

  const bleed = useMemo(() => /^\/(scene|dashboard|battle)/.test(loc.pathname), [loc.pathname]);

  const doLogout = () => {
    logout();
    nav('/login', { replace: true });
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="hd-brand">
          <BrandMark size={26} />
          <span className="hd-brand-text">
            <b>{narrow ? '绿矿智用' : '省域空间治理数字化平台 · 绿矿智用'}</b>
            <i>四川省矿产资源数字化管理</i>
          </span>
        </div>

        <button
          type="button"
          className="hd-burger"
          onClick={() => setNavOpen((v) => !v)}
          aria-label="展开导航"
          aria-expanded={navOpen}
        >
          <Ic icon={Menu01Icon} size={16} />
        </button>

        <nav className={`hd-nav${navOpen ? ' is-open' : ''}`} aria-label="一级场景导航">
          {scenes.map((s) => (
            <NavLink
              key={s.key}
              to={SCENE_ROUTES[s.key] || `/${s.key}`}
              className={({ isActive }) => `hd-nav-link${isActive ? ' is-on' : ''}`}
            >
              {s.name}
            </NavLink>
          ))}
          <span className="hd-nav-sep" aria-hidden="true" />
          <NavLink to="/warehouse" className={({ isActive }) => `hd-nav-link hd-nav-link--sub${isActive ? ' is-on' : ''}`}>数据仓</NavLink>
          <NavLink to="/mobile" className={({ isActive }) => `hd-nav-link hd-nav-link--sub${isActive ? ' is-on' : ''}`}>移动端</NavLink>
          <NavLink to="/system" className={({ isActive }) => `hd-nav-link hd-nav-link--sub${isActive ? ' is-on' : ''}`}>系统</NavLink>
        </nav>

        <div className="hd-right">
          <span className="hd-clock" title={`${clock.date} 星期${clock.week}`}>
            <b>{clock.time}</b>
            <i>{clock.date.slice(5)}</i>
          </span>
          <button type="button" className="hd-btn" onClick={() => nav('/battle')}>指标监测</button>
          <button type="button" className="hd-btn" onClick={() => setProblem(true)}>
            <Ic icon={Alert02Icon} size={14} /> 问题监测
          </button>

          <div className="userbox" ref={menuRef}>
            <button
              type="button"
              className="userbox-btn"
              onClick={() => setMenu((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menu}
            >
              <span className="avatar">{(user?.name || '用')[0]}</span>
              {!narrow && (
                <span className="userbox-text">
                  <b>{user?.name || '未登录'}</b>
                  <i>{user?.org || ''}</i>
                </span>
              )}
            </button>
            {menu && (
              <div className="user-menu" role="menu">
                <div className="user-menu-head">
                  <b>{user?.name}</b>
                  <span>{bootMeta?.roles?.[user?.role] || user?.role}</span>
                  <small>{user?.region_name || '四川省'}</small>
                </div>
                <button type="button" onClick={() => { setMenu(false); nav('/system'); }}>
                  <Ic icon={Settings01Icon} size={14} /> 系统管理
                </button>
                <button type="button" onClick={() => { setMenu(false); nav('/mobile'); }}>
                  <Ic icon={SmartPhone01Icon} size={14} /> 政务移动端
                </button>
                <button type="button" onClick={() => { setMenu(false); nav('/warehouse'); }}>
                  <Ic icon={Database01Icon} size={14} /> 数据仓
                </button>
                <button type="button" className="is-danger" onClick={doLogout}>
                  <Ic icon={Logout01Icon} size={14} /> 退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        {/^\/(scene|dashboard)/.test(loc.pathname) && (
          <h1 className="sr-only">省域空间治理数字化平台 - 绿矿智用 · 四川省矿产资源数字化管理</h1>
        )}
        <div className={bleed ? 'app-page app-page--bleed' : 'app-page'}>
          <Outlet />
        </div>
      </main>

      <ProblemDrawer open={problem} onClose={() => setProblem(false)} />
      <Toasts />
    </div>
  );
}

export { SCENE_ROUTES };
