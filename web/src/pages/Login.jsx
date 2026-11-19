import React, { useState } from 'react';
import Threads from '../components/reactbits/Threads.jsx';
import SpotlightCard from '../components/reactbits/SpotlightCard.jsx';
import { Ic, BrandMark } from '../components/Icon';
import { useApp } from '../store.jsx';
import { LockPasswordIcon, UserIcon, ArrowRight01Icon, Shield01Icon } from '@hugeicons/core-free-icons';

const DEMO = [
  { u: 'admin', p: 'admin123', label: '系统管理员', who: '马若涵 · 成都市' },
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

      <section className="login-copy login-copy--min">
        <BrandMark size={56} />
        <h1>绿矿智用</h1>
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
