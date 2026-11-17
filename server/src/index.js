import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initSchema, tableCount } from './db.js';
import { seed } from './seed.js';
import { MODULES, SCENES } from './features.js';
import publicRoutes from './routes/public.js';
import featureRoutes from './routes/feature.js';
import dashboardRoutes from './routes/dashboard.js';
import toolRoutes from './routes/tools.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8787);

initSchema();
if (tableCount('mine') === 0) {
  console.log('[init] 检测到空库，正在生成演示数据 …');
  seed({ force: true });
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      const ms = Date.now() - start;
      if (ms > 500) console.log(`[slow] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    }
  });
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ code: 0, msg: 'ok', data: { service: '绿矿智用 · 矿权管理系统', time: new Date().toISOString(), scenes: SCENES.length, modules: MODULES.length } });
});

app.use('/api', publicRoutes);
app.use('/api/biz', featureRoutes);
app.use('/api/screen', dashboardRoutes);
app.use('/api/tools', toolRoutes);

/* 生产模式：托管前端构建产物 */
const DIST = path.resolve(ROOT, '../web/dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { maxAge: '1h', index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.type('html').send(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>绿矿智用 · 矿权管理系统</title>
    <style>body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#0a1a33;color:#cfe4ff;padding:48px;line-height:1.9}
    code{background:#132a4a;padding:2px 6px;border-radius:4px}a{color:#49c3ff}</style></head><body>
    <h1>绿矿智用 · 矿权管理系统 API 服务已启动</h1>
    <p>前端开发服务器默认运行在 <code>http://localhost:5173</code>，请先执行 <code>npm run dev</code>。</p>
    <p>接口健康检查：<a href="/api/health">/api/health</a></p>
    <p>生产模式：先执行 <code>npm run build</code>，再执行 <code>npm start</code>，本服务会同时托管前端页面。</p>
    </body></html>`);
  });
}

app.use((req, res) => {
  res.status(404).json({ code: 404, msg: `接口不存在: ${req.method} ${req.originalUrl}`, data: null });
});

app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ code: 500, msg: err?.message || '服务器内部错误', data: null });
});

app.listen(PORT, () => {
  console.log(`\n  绿矿智用 · 矿权管理系统 API`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  场景 ${SCENES.length} 个 / 业务域 ${MODULES.length} 个 / 功能点 ${MODULES.reduce((s, m) => s + m.features.length, 0)} 个\n`);
});
