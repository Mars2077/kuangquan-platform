import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { XProvider } from '@ant-design/x';
import App from './App.jsx';
import { AppProvider } from './store.jsx';
import { ThemeProvider, useTheme } from './theme.jsx';
import { antdThemeFor } from './ui/antdTheme.js';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/theme.css';

/**
 * 主题桥：把 ThemeProvider 的 mode 同时喂给 antd / @ant-design/x，
 * 保证 antd 组件与自研样式在同一套色板上切换。
 */
function Root() {
  const { mode } = useTheme();
  const theme = React.useMemo(() => antdThemeFor(mode), [mode]);
  return (
    <ConfigProvider theme={theme} locale={zhCN} componentSize="small">
      <XProvider theme={theme}>
        <AntdApp>
          <HashRouter>
            <AppProvider>
              <App />
            </AppProvider>
          </HashRouter>
        </AntdApp>
      </XProvider>
    </ConfigProvider>
  );
}

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
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </React.StrictMode>
  );
}

bootstrap();
