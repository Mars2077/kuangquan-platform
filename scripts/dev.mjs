#!/usr/bin/env node
/**
 * 本地开发一键启动：
 *   1) 启动 API 服务（server/src/index.js，默认 8787）
 *   2) 启动 Vite 开发服务（web，默认 5173，/api 反向代理到 8787）
 *
 * 用法：
 *   npm run dev             # API + 前端热更
 *   npm run dev -- --api    # 只启动 API
 *   npm run preview         # 构建产物 + API（等价于生产本地预览）
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiOnly = process.argv.includes('--api');
const prod = process.argv.includes('--prod');

const API_PORT = process.env.PORT || '8787';
const WEB_PORT = process.env.WEB_PORT || '5173';

const children = [];
let shuttingDown = false;

function run(name, cmd, args, opts = {}) {
  const child = spawn(cmd, args, {
    cwd: opts.cwd || root,
    env: { ...process.env, ...(opts.env || {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
    /* 不用 shell：Windows 上 node 路径含空格（C:\Program Files\...），shell 会拆开参数 */
    shell: false,
    windowsHide: true
  });
  children.push({ name, child });

  const tag = `[${name}]`;
  const pipe = (stream, isErr) => {
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      String(chunk)
        .split(/\r?\n/)
        .filter((line) => line.trim() !== '')
        .forEach((line) => (isErr ? console.error(`${tag} ${line}`) : console.log(`${tag} ${line}`)));
    });
  };
  pipe(child.stdout, false);
  pipe(child.stderr, true);

  child.on('exit', (code) => {
    if (shuttingDown) return;
    console.log(`${tag} 进程退出（code=${code}）`);
    /* 任一子进程退出则整体收尾，避免端口占用残留 */
    shutdown(code ?? 0);
  });
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of children) {
    if (child && !child.killed) {
      try {
        child.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    }
  }
  setTimeout(() => process.exit(code), 300);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

const node = process.execPath;
const serverEntry = path.join(root, 'server', 'src', 'index.js');
if (!existsSync(serverEntry)) {
  console.error('未找到 server/src/index.js，请确认目录结构完整。');
  process.exit(1);
}

run('api', node, [serverEntry], { cwd: path.join(root, 'server'), env: { PORT: API_PORT } });

if (!apiOnly) {
  const webDir = path.join(root, 'web');
  if (prod) {
    if (!existsSync(path.join(webDir, 'dist', 'index.html'))) {
      console.error('未找到 web/dist，请先执行 npm run build。');
      shutdown(1);
    } else {
      console.log('[web] 生产预览：由 API 服务直接托管 web/dist');
    }
  } else {
    const vitePkg = path.join(webDir, 'node_modules', 'vite', 'bin', 'vite.js');
    if (!existsSync(vitePkg)) {
      console.error('未安装前端依赖，请先执行 npm run setup。');
      shutdown(1);
    } else {
      run('web', node, [vitePkg, '--port', WEB_PORT, '--strictPort'], {
        cwd: webDir,
        env: { VITE_API_TARGET: `http://127.0.0.1:${API_PORT}` }
      });
    }
  }
}

console.log('');
console.log('  绿矿智用 · 矿权管理系统');
console.log(`  API      http://127.0.0.1:${API_PORT}/api/health`);
console.log(prod || apiOnly ? `  应用     http://127.0.0.1:${API_PORT}/` : `  前端     http://127.0.0.1:${WEB_PORT}/`);
console.log('  账号     admin / admin123');
console.log('');
