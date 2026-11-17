import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { auth, setToken, getToken, setUnauthorizedHandler, meta as metaApi } from './api';

const AppCtx = createContext(null);

export function useApp() {
  return useContext(AppCtx);
}

let toastSeq = 0;

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootMeta, setBootMeta] = useState(null);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const toast = useCallback((message, type = 'ok') => {
    const id = ++toastSeq;
    setToasts((list) => [...list, { id, message, type }]);
    timers.current[id] = setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
      delete timers.current[id];
    }, type === 'err' ? 4200 : 2600);
  }, []);

  const logout = useCallback(() => {
    setToken('');
    setUser(null);
    setBootMeta(null);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await auth.login(username, password);
    setToken(res.data.token);
    setUser(res.data.user);
    const m = await metaApi.bootstrap();
    setBootMeta(m.data);
    return res.data.user;
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      toast('登录状态已失效，请重新登录', 'err');
    });
  }, [toast]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!getToken()) {
        setReady(true);
        return;
      }
      try {
        const me = await auth.me();
        const m = await metaApi.bootstrap();
        if (!alive) return;
        setUser({ ...me.data, roleLabel: me.data.roleLabel });
        setBootMeta(m.data);
      } catch {
        setToken('');
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo(
    () => ({ user, setUser, bootMeta, ready, login, logout, toast, toasts }),
    [user, bootMeta, ready, login, logout, toast, toasts]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function Toasts() {
  const ctx = useContext(AppCtx);
  if (!ctx) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {ctx.toasts.map((t) => (
        <div key={t.id} className={`toast${t.type === 'err' ? ' err' : ''}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

/** 通用异步数据加载 */
export function useFetch(fn, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState('');
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fnRef.current();
      setData(r?.data !== undefined ? r.data : r);
      return r;
    } catch (e) {
      setError(e.message || '加载失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (immediate) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload, setData };
}
