#!/usr/bin/env node
/**
 * check-classes.mjs —— v3 设计系统类名校验（契约 §9）
 *
 * 扫描 web/src 下所有 .jsx 的 className 字面量，与四层 CSS
 * （tokens.css / base.css / components.css / pages.css）中真实存在的
 * 选择器类名做差集；出现未登记的类即输出 UNKNOWN_CLASS 并以退出码 1 结束。
 *
 * 用法：
 *   node scripts/check-classes.mjs                 # 全量检查
 *   node scripts/check-classes.mjs pages/UiKit      # 只检查路径包含该片段的文件
 *   node scripts/check-classes.mjs layout components
 *
 * 说明：
 * - 只取「字面量」：模板串里的静态类名会被提取，动态片段（如 `tag--${tone}`）
 *   中的 `tag--` 视为动态前缀跳过，不做猜测。
 * - 比较运算里的字符串（drawerMode === 'lg'）不是类名，会被排除。
 * - 白名单：第三方地图/动效类（amap-*、reactbits 等）、状态类 is-*、脚本钩子 js-*。
 *   状态类必须与基础类成对出现（如 .empty.is-error），实现侧逐个落地。
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'web', 'src');
const STYLE_DIR = join(SRC, 'styles');
const STYLE_FILES = ['tokens.css', 'base.css', 'components.css', 'pages.css'].map((f) =>
  join(STYLE_DIR, f)
);

/* ------------------------------------------------------------------ */
/* 白名单                                                              */
/* ------------------------------------------------------------------ */

const EXACT_WHITELIST = new Set([
  'spotlight-card',
  'threads-container',
  'animated-list',
  'animated-list__item',
  'stepper',
  'particles',
  'shiny-text',
  'star-border',
  'glare-hover'
]);

const PREFIX_WHITELIST = [
  'amap-',
  'is-', // 状态类（与基础类成对）
  'js-', // 脚本钩子
  'reactbits',
  'spotlight',
  'threads',
  'particles',
  'shiny-text',
  'star-border',
  'glare-hover',
  'animated-list',
  'stepper',
  'aurora',
  'meteors',
  'dot-pattern',
  'grid-pattern'
];

function isWhitelisted(cls) {
  if (EXACT_WHITELIST.has(cls)) return true;
  return PREFIX_WHITELIST.some((prefix) => cls.startsWith(prefix));
}

/* ------------------------------------------------------------------ */
/* CSS 类名收集                                                        */
/* ------------------------------------------------------------------ */

function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

function collectCssClasses(text, into) {
  const re = /\.(-?[A-Za-z_][\w-]*)/g;
  let m;
  while ((m = re.exec(text)) !== null) into.add(m[1]);
}

/* ------------------------------------------------------------------ */
/* JSX className 字面量提取                                            */
/* ------------------------------------------------------------------ */

function readString(text, start, quote) {
  let out = '';
  let i = start + 1;
  while (i < text.length) {
    const c = text[i];
    if (c === '\\') {
      out += text[i + 1] ?? '';
      i += 2;
      continue;
    }
    if (c === quote) return { value: out, end: i + 1 };
    out += c;
    i += 1;
  }
  return { value: out, end: i };
}

function findClosingBrace(text, start) {
  let depth = 0;
  let i = start;
  while (i < text.length) {
    const c = text[i];
    if (c === "'" || c === '"') {
      i = readString(text, i, c).end;
      continue;
    }
    if (c === '`') {
      i = readTemplate(text, i).end;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      const n = text.indexOf('\n', i + 2);
      i = n < 0 ? text.length : n + 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const n = text.indexOf('*/', i + 2);
      i = n < 0 ? text.length : n + 2;
      continue;
    }
    if (c === '{') {
      depth += 1;
      i += 1;
      continue;
    }
    if (c === '}') {
      depth -= 1;
      i += 1;
      if (depth === 0) return i - 1;
      continue;
    }
    i += 1;
  }
  return -1;
}

function readTemplate(text, start, offset = 0) {
  let out = '';
  const extra = [];
  let i = start + 1;
  while (i < text.length) {
    const c = text[i];
    if (c === '\\') {
      out += text[i + 1] ?? '';
      i += 2;
      continue;
    }
    if (c === '`') return { value: out, extra, end: i + 1 };
    if (c === '$' && text[i + 1] === '{') {
      const end = findClosingBrace(text, i + 1);
      if (end < 0) break;
      extra.push(...collectStrings(text.slice(i + 2, end), offset + i + 2));
      i = end + 1;
      continue;
    }
    out += c;
    i += 1;
  }
  return { value: out, extra, end: i };
}

function collectStrings(text, offset = 0) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === "'" || c === '"') {
      const r = readString(text, i, c);
      out.push({ value: r.value, index: offset + i });
      i = r.end;
      continue;
    }
    if (c === '`') {
      const r = readTemplate(text, i, offset);
      out.push({ value: r.value, index: offset + i }, ...r.extra);
      i = r.end;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      const n = text.indexOf('\n', i + 2);
      i = n < 0 ? text.length : n + 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const n = text.indexOf('*/', i + 2);
      i = n < 0 ? text.length : n + 2;
      continue;
    }
    i += 1;
  }
  return out;
}

function isComparisonOperand(text, index) {
  const head = text.slice(Math.max(0, index - 12), index).replace(/\s+$/, '');
  return /(===|!==|==|!=)$/.test(head);
}

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i += 1) {
    if (text[i] === '\n') line += 1;
  }
  return line;
}

function extractClassRefs(text) {
  const refs = [];
  const re = /className\s*=\s*/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    let i = match.index + match[0].length;
    while (i < text.length && /\s/.test(text[i])) i += 1;
    const chunks = [];
    if (text[i] === "'" || text[i] === '"') {
      chunks.push({ value: readString(text, i, text[i]).value, index: i });
    } else if (text[i] === '{') {
      const end = findClosingBrace(text, i);
      if (end > i) chunks.push(...collectStrings(text.slice(i + 1, end), i + 1));
    }
    for (const chunk of chunks) {
      if (isComparisonOperand(text, chunk.index)) continue;
      for (const token of chunk.value.split(/\s+/)) {
        if (!token || token.includes('${')) continue;
        if (token.endsWith('-')) continue; // 动态前缀
        if (!/^-?[A-Za-z_][\w-]*$/.test(token)) continue;
        refs.push({ cls: token.replace(/^-/, ''), index: chunk.index });
      }
    }
  }
  return refs;
}

/* ------------------------------------------------------------------ */
/* 文件遍历                                                            */
/* ------------------------------------------------------------------ */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      if (entry === 'reactbits') continue; // 第三方动效组件，自带 CSS
      walk(full, out);
    } else if (entry.endsWith('.jsx')) {
      out.push(full);
    }
  }
  return out;
}

function main() {
  const filters = process.argv.slice(2).filter((a) => !a.startsWith('--'));

  const cssClasses = new Set();
  for (const file of STYLE_FILES) {
    if (!existsSync(file)) {
      console.error(`[check-classes] 缺少样式层：${relative(ROOT, file)}`);
      process.exit(2);
    }
    collectCssClasses(stripCssComments(readFileSync(file, 'utf8')), cssClasses);
  }

  const files = walk(SRC).filter((file) => {
    const rel = relative(SRC, file).split(sep).join('/');
    return filters.length === 0 || filters.some((f) => rel.includes(f.replace(/\\/g, '/')));
  });

  if (files.length === 0) {
    console.error('[check-classes] 没有匹配的 .jsx 文件');
    process.exit(2);
  }

  let totalRefs = 0;
  const unknown = [];

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file).split(sep).join('/');
    const seen = new Set();
    for (const { cls, index } of extractClassRefs(text)) {
      totalRefs += 1;
      if (seen.has(cls)) continue;
      seen.add(cls);
      if (cssClasses.has(cls) || isWhitelisted(cls)) continue;
      unknown.push({ cls, file: rel, line: lineOf(text, index) });
    }
  }

  console.log(
    `[check-classes] CSS 类 ${cssClasses.size} 个；JSX 文件 ${files.length} 个；className 引用 ${totalRefs} 处`
  );

  if (unknown.length === 0) {
    console.log('[check-classes] ✓ 未发现未知类名');
    process.exit(0);
  }

  const byFile = new Map();
  for (const item of unknown) {
    if (!byFile.has(item.file)) byFile.set(item.file, []);
    byFile.get(item.file).push(item);
  }

  for (const [file, items] of [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    for (const item of items) {
      console.log(`UNKNOWN_CLASS ${item.cls}  ${file}:${item.line}`);
    }
  }

  console.log(
    `[check-classes] ✗ ${unknown.length} 个未登记类名（${byFile.size} 个文件）。` +
      ' 新增组件请先登记到 docs/11-组件契约-v3.md，再落到 styles/*.css 与 /ui-kit。'
  );
  process.exit(1);
}

main();
