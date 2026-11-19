# v14：CoinPulse 设计系统落地与移动端重做

> 依据：产品方给定的 CoinPulse 设计系统（深色、实时数据密集、电光蓝 + 青柠 + 琥珀）。
> 规范固化在仓库根 **`DESIGN.md`**（唯一设计来源），本文件只记录「改了什么、怎么验证」。

---

## 一、设计令牌切换（`web/src/styles/tokens.css` 的 `§ v14` 段）

| 令牌 | v13（政务深蓝） | v14（CoinPulse） |
| --- | --- | --- |
| 根画布 `--bg-0` | `#050e1c` | `#09090b` |
| 面层 `--panel` / `--panel-2` / `--panel-3` | `#0b2138` / `#0d2941` / `#102f4c` | `#18181b` / `#1f1f23` / `#27272a` |
| 描边 `--line` / `--line-strong` | `#1c4d78` / `#2b6b9e` | `#27272a` / `#3f3f46` |
| 主色 `--cyan` / `--cyan-2` | `#49c3ff` / `#7fe3ff` | `#2563eb` / `#3b82f6` |
| 正向 `--green` | `#35d39a` | `#22c55e` |
| 警示 `--orange` / `--yellow` | `#ff8a3d` / `#ffcc44` | `#f59e0b` / `#f59e0b` |
| 负向 `--red` | `#ff5f57` | `#ef4444` |
| 文字 1~4 | `#eaf4ff` → `#5d7d99` | `#fafafa` → `#71717a` |
| 圆角 | 4 / 8 / 12 | 4 / 8 / 12 / **16** / 全圆 |
| 阴影 | 黑色投影 | **彩色光晕**（蓝色 15/25/35%，绿/红 30%） |
| 图表序列 | 青蓝系 8 色 | 蓝 → 青柠 → 琥珀 → 绿 → 红 → 灰 |

同时把 `--font-sans` / `--font-mono` 改为「首选 DM Sans / Space Mono，回退系统黑体与等宽」——Google Fonts 在政务内网与离线演示环境不保证可达，回退不影响排版比例（数字全部 `tabular-nums`）。

## 二、antd 组件库主题（`web/src/ui/antdTheme.js`）

- `colorPrimary` `#2563eb`、`colorSuccess` `#22c55e`、`colorWarning` `#f59e0b`、`colorError` `#ef4444`。
- `colorBgBase` `#09090b`、`colorBgContainer` `#18181b`、`colorBgElevated` `#1f1f23`、`colorBorder` `#3f3f46`、`colorBorderSecondary` `#27272a`。
- 圆角 8 / 12 / 4；控件高 32；表格表头 `#1f1f23`、行悬停 `rgba(37,99,235,.10)`、选中 `rgba(37,99,235,.14)`。

## 三、组件层（`web/src/styles/pages.css` 的 `§ v14` 段）

| 组件 | 规范落地 |
| --- | --- |
| 顶栏 | 近黑实底 `#09090b` + 1px `#27272a` 下边线；导航改为 `#18181b` 轨道，选中 `rgba(37,99,235,.16)` |
| 卡片 / 面板 | `#18181b` + 1px `#27272a` + 12px 圆角，取消投影 |
| 面板标题条 | `#1f1f23` + 下边线，标题 15px/600 |
| 按钮 | Primary `#2563eb`（hover `#3b82f6` + 蓝色光晕）；Ghost 透明 + `#a1a1aa`；Danger `#ef4444` + 红光；禁用 40% |
| 输入 | 36px 高、`#18181b` 底、`#3f3f46` 边；聚焦 `#2563eb` 边 + 8px 光晕 |
| 标签 | 4px 圆角；正向 `#22c55e1a/#22c55e`、负向 `#ef44441a/#ef4444`、待处理 `#f59e0b1a/#f59e0b`、信息 `#2563eb1a/#3b82f6` |
| 表格 | 表头 `#1f1f23`/38px、行 40px、悬停 `#27272a`、选中左侧 2px 主色、数字列右对齐等宽 |
| 驾驶舱 | 面板/统计行/图表全部跟随新令牌；地图掩膜改中性暗色（常态 `#0b0b0d` 0.22 / 悬停 `#26262a` 0.42 / 选中 `#37373c` 0.34）；点位与区块配色改为绿/琥珀/青柠/蓝 |

## 四、品牌标识

- 上传的 logo 已入库：`web/public/brand/logo.png`（原图 1024×1024）与等比缩放版 `logo-512/128/64.png`。
- `web/src/components/Icon.jsx` 的 `BrandMark` 由自绘六边形 SVG 改为 `<img src="/brand/logo-128.png">`，尺寸由调用方传入（顶栏 26px、移动端 20px、登录页 56px）。
- `web/index.html` 的 favicon 与 apple-touch-icon 改为该 logo；`theme-color` 改为 `#09090b`。

## 五、移动端重做（`web/src/pages/Mobile.jsx` + `pages.css`）

| 项 | 改前 | 改后 |
| --- | --- | --- |
| 页面根节点 | 片段（无 `mobile-page`）→ 移动端样式规则**全部失效** | `<div className="page mobile-page">`，移动端规范真正生效 |
| 手机框顶栏 | 两行小字「四川省 / 掌上绿矿」 | 44px `.m-appbar`：logo 20px + 「绿矿智用」14/600 + 右侧区域名 12px |
| 手机框底色 | `#18181b` 卡片底 | `#09090b` 画布 + `#18181b` 卡片面 |
| KPI 四宫格 | 无边框 | `#18181b` 面 + 1px 发丝边 + 8px 圆角，悬停描边变主色 + 12px 光晕 |
| 列表行 | 38px、无分隔 | 40px、`#27272a` 发丝分隔、悬停抬一层面 |
| 表单控件 | antd 默认 32px | 36px；提交按钮 44px 整宽 |
| 窄屏（≤620） | 仍显示时钟与副标题 | 隐藏时钟与副标题，仅留品牌 / 汉堡 / 告警 / 头像 |
| 窄屏（≤900） | 保留手机外框装饰 | 去掉外框边框与固定高度，直接按移动端规范铺满并避让安全区 |

## 六、地图：显示点位后不再显示数量

- `web/src/components/GeoMap.jsx`：新增 `const showBubbles = !showPoints;`（`showPoints = zoom >= 8`），气泡渲染改为 `(showBubbles ? bubbles || [] : []).forEach(...)`。
- 实测（1920，真实 API）：

| 缩放级别 | 数量气泡 `.amap-bubble` | 规划区块 `.amap-zone` |
| --- | --- | --- |
| 6.87（默认全省） | **21** | 0 |
| 9.0（显示点位） | **0** | 0 |
| 11.0（显示点位 + 区块） | **0** | **400** |

## 七、验证

| 项 | 结果 |
| --- | --- |
| 令牌生效 | `--bg-0=#09090b`、`--cyan=#2563eb`、`body` 背景 `rgb(9,9,11)` |
| 顶栏 | `rgb(9,9,11)`，导航选中 `rgba(37,99,235,.16)`，无横向溢出（`scrollWidth=1920`） |
| 面板 | 背景 `rgb(24,24,27)`、描边 `rgb(39,39,42)`、圆角 12px；标题条 `rgb(31,31,35)` |
| 统计数字 | `27px`、`rgb(250,250,250)`、字体栈首选 `Space Mono` |
| 列表按钮 | `rgba(9,9,11,.92)` + `rgb(63,63,70)` 描边，无残留青色 |
| 移动端 390 | `scrollWidth=390`、手机框 356×948、appbar 44px、列表行 40px、提交按钮 44px、时钟隐藏 |
| 构建 | `npm run build` ✓ 8.4–9.5s（index 446 kB / gzip 149 kB、charts 549.83 kB） |

## 八、已知取舍

1. Space Mono / DM Sans 未随包引入（无网络依赖），实际渲染回退到系统等宽与中文黑体；字形不同，但字号、行高、`tabular-nums` 对齐一致。
2. CoinPulse 原文含「实时价格闪烁」类动效，本系统只保留「涨跌短闪」的语义，不做循环脉冲（与无障碍和政务演示场景冲突）。
3. 同屏彩色光晕由 unslop 阶段的「不超过 2 处」放宽到 3 处（主按钮 + 当前选中 + 一处告警），仍禁止整屏发光。

---

## 九、收尾核对（2026-11-19）

上线后按截图复核，发现并修掉 4 处与 CoinPulse 令牌不一致的残留：

| # | 位置 | 现象 | 修法 | 复测 |
| --- | --- | --- | --- | --- |
| 1 | web/src/pages/Cockpit.jsx 地图专题牌 | 仍是 gba(7,22,40,.92) 深蓝底 + 青边框，与新近黑面板割裂 | 改 ackground:#18181b、order:1px solid #3f3f46、adius 8、标题字色 #fafafa；底下强调线沿用 ar(--cyan) | 计算样式 gb(24,24,27) / gb(63,63,70) |
| 2 | .amap-bubble 区县气泡 | 背景透明，压在明亮的卫星影像上不易读 | 补 gba(24,24,27,.94) 底 + 1px rgba(37,99,235,.55) 边， 白 / span #a1a1aa | 计算样式 gba(24,24,27,.94) |
| 3 | 左右两栏底部 | 第三块面板底边贴着视口底（y=1080），最后一行几乎被切 | .dash-col--l/.dash-col--r { padding-bottom: 8px } | 面板底边 1080 → **1072** |
| 4 | 数值与单位 | 4,508,895.38 与「万吨」之间只有 4px，读数挤 | 追加 .dash-col--l .stat-row .u, .dash-col--r .stat-row .u { margin-left:6px }（覆盖先前 4px 的高优先级规则），数值加 letter-spacing:-.5px | 计算样式 6px |

**另核实**：.panel 计算背景确为 gb(24,24,27)、.panel-head 为 gb(31,31,35)（截图观感偏蓝来自缩放后的色彩错觉，非样式问题）；涨跌语义正确——▼ 2.4% 为红 gb(239,68,68)、▲ 4.8% 为绿，箭头与颜色一致。

**最终部署**：zkvtb6bsv → <https://kuangquan-platfo-541ysnljv4-vzkvtb6bsv.preview.iga-pages.com?iga_token=9a23a40bf5175fd46805209f0819ba9e&iga_time=1795245587>（README / docs/04 / docs/16 / docs/17 地址已同步替换）。线上复验：__KQ_DEMO__=true、logo /brand/logo-128.png 加载成功、气泡 21、气泡底 gba(24,24,27,.94)、专题牌 gb(24,24,27)、docSW=1920、h1=1。