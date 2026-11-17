import React, { useState } from 'react';
import Threads from '../components/reactbits/Threads.jsx';
import SpotlightCard from '../components/reactbits/SpotlightCard.jsx';
import CountUp from '../components/reactbits/CountUp.jsx';
import { Ic, BrandMark } from '../components/Icon';
import { useApp } from '../store.jsx';
import { LockPasswordIcon, UserIcon, ArrowRight01Icon, Shield01Icon } from '@hugeicons/core-free-icons';

const DEMO = [
  { u: 'admin', p: 'admin123', label: '系统管理员', who: '赵丹蕾 · 成都市' },
  { u: 'province', p: '123456', label: '省级管理员', who: '陈嘉禾 · 四川省自然资源厅' },
  { u: 'city', p: '123456', label: '市级管理员', who: '沈立群 · 成都市' },
  { u: 'county', p: '123456', label: '县级管理员', who: '王永祥 · 彭州市' },
  { u: 'enterprise', p: '123456', label: '矿山企业', who: '李国强 · 白象硅灰石矿' }
];

export default function Login() {
  const { login, toast } = useApp();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      const u = await login(username.trim(), password);
      toast(`欢迎回来，${u.name}`);
    } catch (ex) {
      setErr(ex.message || '登录失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-bg" aria-hidden="true">
        <Threads color={[0.18, 0.62, 1]} accentColor={[0.3, 0.85, 1]} amplitude={2.1} distance={0.42} lineCount={70} speed={0.45} />
      </div>

      <section className="login-copy">
        <span className="eyebrow"><BrandMark size={16} /> 四川省自然资源厅 · 绿矿智用</span>
        <h1>
          省域空间治理数字化平台
          <br />
          <em>矿权管理系统</em>
        </h1>
        <p>
          覆盖矿产地、保护与规划、矿业权、绿色矿山、智慧监管、数智地勘六大业务域，以省市县三级行政区划数据权限为底座，
          把「一矿一档」、储量评审备案、范围论证、净矿出让与问题处置闭环搬到线上。
        </p>

        <div className="login-stats">
          <div>
            <b><CountUp to={6} duration={1.2} /></b>
            <span>业务域</span>
          </div>
          <div>
            <b><CountUp to={40} duration={1.4} /></b>
            <span>功能点</span>
          </div>
          <div>
            <b><CountUp to={7} duration={1.1} /></b>
            <span>驾驶舱场景</span>
          </div>
          <div>
            <b><CountUp to={11} duration={1.6} /></b>
            <span>地市覆盖</span>
          </div>
        </div>

        <p className="login-note">演示数据 · 系统内全部统计数值由本地数据库按真实空间关系生成，不代表实际统计口径。</p>
      </section>

      <SpotlightCard className="login-card" spotlightColor="rgba(73,195,255,0.32)" intensity={0.18} spotlightSize={320}>
        <h2>统一身份认证</h2>
        <p className="sub">对接省级政务协同平台 · 单点登录</p>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="kq-user">账号</label>
            <div className="input-icon">
              <Ic icon={UserIcon} size={15} />
              <input
                id="kq-user"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="请输入政务账号"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="kq-pass">密码</label>
            <div className="input-icon">
              <Ic icon={LockPasswordIcon} size={15} />
              <input
                id="kq-pass"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="请输入密码"
              />
            </div>
          </div>

          {err && <div className="alert-line err">{err}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? '正在认证 …' : '登录平台'}
            {!busy && <Ic icon={ArrowRight01Icon} size={16} />}
          </button>
        </form>

        <div className="login-demo">
          <div className="login-demo-title">
            <Ic icon={Shield01Icon} size={13} />
            演示账号（点击即填）
          </div>
          <div className="demo-chips">
            {DEMO.map((d) => (
              <button
                key={d.u}
                type="button"
                className="demo-chip"
                onClick={() => {
                  setUsername(d.u);
                  setPassword(d.p);
                }}
                title={d.who}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}
