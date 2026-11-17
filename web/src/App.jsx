import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from './layout/Shell.jsx';
import Login from './pages/Login.jsx';
import { useApp } from './store.jsx';

const Portal = lazy(() => import('./pages/Portal.jsx'));
const Cockpit = lazy(() => import('./pages/Cockpit.jsx'));
const ModuleHome = lazy(() => import('./pages/ModuleHome.jsx'));
const FeaturePage = lazy(() => import('./pages/FeaturePage.jsx'));
const Battle = lazy(() => import('./pages/Battle.jsx'));
const Warehouse = lazy(() => import('./pages/Warehouse.jsx'));
const Mobile = lazy(() => import('./pages/Mobile.jsx'));
const Archive = lazy(() => import('./pages/Archive.jsx'));
const SystemPage = lazy(() => import('./pages/SystemPage.jsx'));
const UiKit = lazy(() => import('./pages/UiKit.jsx'));

function Splash({ text = '正在初始化绿矿智用平台 …' }) {
  return (
    <div className="splash">
      <div className="splash-mark" aria-hidden="true" />
      <p>{text}</p>
      <span className="spinner" />
    </div>
  );
}

export default function App() {
  const { ready, user } = useApp();

  if (!ready) return <Splash />;
  if (!user) return <Login />;

  return (
    <Suspense fallback={<Splash text="正在载入业务模块 …" />}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Navigate to="/portal" replace />} />
          <Route path="/portal" element={<Portal />} />
          <Route path="/dashboard" element={<Cockpit sceneKey="dashboard" />} />
          <Route path="/scene/:scene" element={<Cockpit />} />
          <Route path="/battle" element={<Battle />} />
          <Route path="/biz/:module" element={<ModuleHome />} />
          <Route path="/biz/:module/:feature" element={<FeaturePage />} />
          <Route path="/archive/:id" element={<Archive />} />
          <Route path="/warehouse" element={<Warehouse />} />
          <Route path="/mobile" element={<Mobile />} />
          <Route path="/system" element={<SystemPage />} />
          <Route path="/ui-kit" element={<UiKit />} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
