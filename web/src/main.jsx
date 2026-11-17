import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { AppProvider } from './store.jsx';

import './styles/tokens.css';
import './styles/components.css';
import './styles/widgets.css';
import './styles/pages.css';

/**
 * 静态部署模式（VITE_DEMO=1）：安装浏览器端数据层，拦截 /api/* 请求，
 * 使整个系统可以零后端运行在静态托管（火山引擎 IGA Pages 等）上。
 * 本地开发默认不开启，仍走真实 Express + SQLite 后端。
 */
async function bootstrap() {
  if (import.meta.env.VITE_DEMO === '1') {
    const { default: installDemoApi } = await import('./demo/engine.js');
    installDemoApi();
  }
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <HashRouter>
        <AppProvider>
          <App />
        </AppProvider>
      </HashRouter>
    </React.StrictMode>
  );
}

bootstrap();
