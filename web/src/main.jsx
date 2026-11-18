import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { XProvider } from '@ant-design/x';
import App from './App.jsx';
import { AppProvider } from './store.jsx';
import { antdTheme } from './ui/antdTheme.js';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';

/**
 * 静态部署模式（VITE_DEMO=1）先装浏览器端数据层，再渲染。
 * 该模式下 /api/* 由 web/src/demo/engine.js 在本机接管，用于 IGA Pages 纯静态托管。
 */
async function bootstrap() {
  if (import.meta.env.VITE_DEMO === '1') {
    const { default: installDemoApi } = await import('./demo/engine.js');
    installDemoApi();
  }
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ConfigProvider theme={antdTheme} locale={zhCN} componentSize="small">
        <XProvider theme={antdTheme}>
          <AntdApp>
            <HashRouter>
              <AppProvider>
                <App />
              </AppProvider>
            </HashRouter>
          </AntdApp>
        </XProvider>
      </ConfigProvider>
    </React.StrictMode>
  );
}

bootstrap();
