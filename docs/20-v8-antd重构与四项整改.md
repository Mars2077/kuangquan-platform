# v8：四项整改与 antd 组件化重构

> 本轮针对四条问题整改，并把各界面子模块的承载组件统一到 antd（`antd 6.7.1`）+ `@ant-design/x 2.10.0`，同时清掉样式层的「AI 味」装饰。
> 日期：2026-11-18　范围：`web/src`（页面、组件、样式、主题）　后端接口与统计口径未改。

---

## 一、下方矿山列表：长条 → 地图内的箭头按钮

**问题**：底部「在线矿山列表」是一条横贯整页的长条，占掉约 200px 高度，把地图压小，且与截图口径不符。

**改动**（`web/src/pages/Cockpit.jsx`、`web/src/styles/pages.css`）

- 收起态从「全宽横条」改为一枚**居中胶囊按钮**：`position:absolute; left:50%; bottom:12px; transform:translateX(-50%)`，30px 高、圆角 999px，内容为「记录条数 + 箭头图标（⌃/⌄）」，`title` 与 `aria-expanded` 同步。
- 展开态浮层：`background rgba(5,16,32,.98)`、`border 1px rgba(73,195,255,.22)`、`radius 8`、`backdrop-filter blur(10px)`，高 `min(46vh,420px)`；浮层底部再渲染一枚同款按钮用于收起，右上角「收起」保留——两个入口都能关。
- 窄屏（≤900px）：浮层改为地图区域内定位（非页面流），高 ≤70vh，按钮固定在地图可视区底部。

**验证（真实 API，province/123456）**

| 视口 | 按钮尺寸/位置 | 展开浮层 | 行数 | 横向溢出 |
|---|---|---|---|---|
| 1920×1080 | 67×30 @(927,1038)，居中偏差 0.5px | 1920×420 @y660 | 100 | 0 |
| 390×844 | 67×30 @(157,378)，bottom 408（地图内） | 340×260 @(20,120) | 100 | 0 |

开合前后地图高度 1920 下 980 → 980，不跳变；`document.scrollWidth` 恒等于视口宽。

截图：`docs/shots/v8-dashboard.png`（收起）、`docs/shots/v8-dashboard-list.png`（展开）。

---

## 二、驾驶舱侧栏：字号太小、行距太空

**问题**：侧栏面板里统计行字号 12px、行高 51px，3 行内容摊在 300 多像素高的面板里，行间出现 40~80px 空洞。

**根因**：①`.dash-col > .panel { flex:1 1 auto; min-height:132px }` 把内容少的板块强行拉高；②`.stat-list { justify-content: space-evenly }` 把剩余空间全部摊到行间距上；③数值/标签字号未随面板尺寸调整。

**改动**（`web/src/styles/pages.css`、`web/src/pages/Cockpit.jsx`）

- 面板不再强行等高拉伸：`flex: 0 1 auto`；`.stat-list` 改为 `space-between` + 行 `flex:1 1 0`（行高等分但有上下限）。
- 行高分档（`Cockpit.jsx` 内联）：行数 ≤3 时 `minHeight 72 / maxHeight 88`，≥4 行时 `minHeight 42`。
- 字号统一：标签 `.k` 13px（原 12）、数值 `.v` 25px（原 16/22）、单位 `.u` 12px、涨跌 `.d` 11.5px、后缀 `.sfx` 11px；数字 `tabular-nums`；行间改 1px 发丝分隔线（`rgba(255,255,255,.05)`），末行去线。

**验证**：7 个 Tab 逐一切换，15 块面板、全部 `.v=25px` / `.k=13px`。

| 面板行数 | 实测行高 |
|---|---|
| 2–3 行（矿产资源储量、规划与保护、矿业权、地质勘查、绿色矿山、智慧监管、出库情况） | 83.5–88px |
| 4 行（资源家底、评价结果、感知设备、督办与处置） | 62.4–63.4px |
| 5 行以上（tabbed / stat-grid / 指标预警） | 42–44.4px |

改造前出现的 21px 行高、14px 数值已不再出现。

---

## 三、饼图圆心文字不居中（第三次修，这次修到根因）

**问题**：环形图中心的数字与单位始终偏右。

**根因**：ECharts 的 `title` / `graphic` 用 `left:'50%'` 时，是以**元素包围盒左边缘**对齐到 50%，再叠加 `textAlign:'center'` 就变成「先居中、再按自身宽度偏一次」，视觉上右移半个字宽。

**终解**（`web/src/components/Chart.jsx` 的 `donutOption`）：不再用 `title`/`graphic` 定位文字，改为**饼图自身的 label**——把中心文字挂在 `series[0].data[0].label` 上：`{ position:'center', formatter:'{v|…}\n{u|…}', rich:{ v:{…}, u:{…} } }`，由饼心直接定位，天然水平垂直居中；`title:{show:false}`。

**验证（像素级）**：对画布 `getImageData` 扫描——环包围盒中心 `cx=146.5`，文字亮像素中心 `cx=147.0`，**dx=+0.5px**；另一次独立测量为环心 160.0 / 文本 159.5–160.0，dy≤1.0px。旧版为偏半个字宽（约 8–12px）。

---

## 四、用 antd / @ant-design/x 重构界面子模块，去掉 AI 味

### 4.1 主题与外壳

- 新增 `web/src/ui/antdTheme.js`：`theme.darkAlgorithm` + 项目色板（primary `#2ea8ff`、容器 `#0a1e33`、浮层 `#0d2740`、文本 `#cfe4ff`、边框 `rgba(73,195,255,.22)`、圆角 6、字号 13、控件高 30），并逐组件（Table/Tabs/Segmented/Button/Modal/Drawer/Tag/Descriptions/Statistic/Pagination/Steps/Progress/Upload/Empty）覆写。
- `web/src/main.jsx` 改为 `ConfigProvider(zhCN)` → `XProvider` → `AntdApp` → `HashRouter` → `AppProvider` → `App`。

### 4.2 逐页迁移

| 界面 | 组件化改造 |
|---|---|
| `/dashboard` 驾驶舱 | `Segmented` 替换自制 Tab（采矿权/探矿权、绿色矿山三档）；列表浮层改 antd 风格的独立容器；地图专题牌去渐变发光、改实底 + 发丝边 |
| `/hub` 业务中枢 | `Segmented` 做「流程图 / 台账表」二选一；台账表换 `DataTable`(antd Table)；`Button`/`Tag` 替换原生控件 |
| `/biz/:module/:feature` 台账 | `Table` + `Pagination` + `Select` + `DatePicker` + `Input` + `Button` + `Tag`；状态入口由三处收敛为一处（KPI 概览 + chips 筛选） |
| `/warehouse` 数据仓 | `Tabs` + 两张 `DataTable`，字段用 `Tag` |
| `/system` 系统管理 | `Tabs` 四分区、启停用改 `Switch`、新增用户改 `Drawer + Form` |
| `/mobile` 移动端 | `Tabs + List` 台账、`Form` 巡查表单、四宫格改 `Button` |
| `/archive/:id` 一矿一档 | `Card + Statistic` 四卡、`Descriptions`、`Timeline`、7 张 `DataTable` |
| `/battle` 作战图 | `Card + Statistic` 三卡、`Select/Input/Button + Table`（两行表头用 `columns.children`、合并单元格用 `onCell` rowSpan） |
| 顶栏 | `Button`/`Dropdown`/`Avatar` 替换自制下拉与按钮 |

### 4.3 去 AI 味（样式层）

- 删除全部 `text-shadow`、彩色 `box-shadow`、`drop-shadow`、渐变文字；面板改**实底 + 1px 发丝边**，表头改纯色 `#0d2740`，按钮纯色，`clip-path` 仅保留面板标题条 12px 与 KPI 右下 10px 两处切角。
- `components.css` 由 3011 行降到 2541 行（删掉整段「v4 参考截图皮肤」约 470 行无效规则）。

### 4.4 验证

| 检查项 | 结果 |
|---|---|
| 9 路由 × 2 视口回归（`docs/18-antd重构回归报告.md`） | 横向溢出 0/18、`h1=1` 18/18、JS 错误 0/18 |
| antd 组件落地量 | Table 9 处、Tabs 4、Switch 27、Select 2+、Tag 20+、Drawer 2、Pagination 1 |
| 类名完整性 | `check-classes` 314 类 / 271 引用 / 0 未知 |
| 390 台账行高 | 修复前 311–332px → 修复后 43px；数据仓 101–122px → 39px；档案 500px → 38–39px |
| 1920 台账行高 | 43px，列宽与改造前一致 |

截图：`docs/shots/v8-feature.png`、`v8-hub.png`、`v8-system.png`、`v8-archive.png`；移动端修复证据 `docs/shots/fix390-*.png`。

---

## 五、已知遗留

1. **触控目标**：390 下仍有 72 处可点元素小于 24px（多为 antd 表格里的链接按钮），后续统一加 `padding` 或改图标按钮。
2. **日期筛选**：`DatePicker` 只在带日期区间的功能点出现（如项目类台账），台账类功能点本身无时间筛选口径，故多数页面不显示——这是业务口径，不是缺失。
3. **驾驶舱侧栏表格**：左右面板里的 `stat-list` 仍是项目自有 DOM（截图皮肤要求等宽数字与分隔线），未换成 antd `Descriptions`，属设计内保留。
4. **`@ant-design/x`** 仅用到 `XProvider` 主题桥接；其对话类组件（Bubble/Sender/Conversations）本系统无 AI 会话场景，未强行引入。

---

## 六、回归与发布

- 构建：`cd web && npm run build` → `✓ built in ~10s`（index 518 kB / gzip 176 kB、charts 549.83 kB / gzip 185 kB、Table 170 kB）。
- 静态演示版：`npm run build:demo`（`VITE_DEMO=1`，数据走 `public/demo/data.json` + 浏览器端数据层）。
- 部署：`cd web && cmd /c "iga pages deploy --name kuangquan-platform -l"`。
- 详细评审记录见 [`docs/18-antd重构回归报告.md`](./18-antd重构回归报告.md) 与 [`docs/19-界面评审-antd重构后.md`](./19-界面评审-antd重构后.md)。
