# 18 · antd 重构后全量回归报告

- 回归时间：2026-11-18 17:11–17:17
- 回归人：qa-review（只读回归，未修改 `web/` 或 `server/` 源码）
- 被测构建：`web/dist` 由 qa-review 于 **2026-11-18 17:11:59** 重新构建，入口 `/assets/index-DBKQcs0L.js`，样式 `/assets/index-CPCeZTlM.css`；构建输出 `✓ built in 9.84s`、12765 modules。该构建包含 t21–t23 的 antd 迁移、t25 样式清理、t27–t29 的评审修复。
- 访问地址：`http://127.0.0.1:8787`（HashRouter）
- 登录：`POST /api/auth/login`，`province / 123456` → 陈嘉禾 / 四川省自然资源厅 / 省级管理员 / 510000；token 写入 `localStorage.kq_token` 后刷新，9 条路由均加载真实数据。
- 视口：1920×1080（dsf=1，mobile=false）与 390×844（dsf=2，mobile=true），均通过 CDP `Emulation.setDeviceMetricsOverride` 覆写。
- 方法：`ego_script` 内逐路由加载 → 等待正文 >300 字并稳定 1.2s → `page.evaluate` 实测 DOM → 截图；原始记录见 `.tmp/qa-review/t24-1920x1080.json`、`.tmp/qa-review/t24-390x844.json`，采集函数见 `.tmp/qa-review/measure-t24.mjs`。
- 截图：`docs/shots/v9/`，18 张路由截图 + 2 张列表展开截图 + 1 张 390 clean-sale 表格证据截图，共 21 张，全部为对应视口的 viewport 尺寸。
- 说明：截图左上角「DeepSeek · 正在载入业务模块…」是 agent 浏览器光标标签，DOM 内无此文本，不计入页面缺陷。

## 1. 结论摘要

**结论：未完全通过。P0 = 0，P1 = 1 类（3 条路由），P2 = 3 类，P3 = 1 类（72 个触控目标）。**

硬指标（18 条记录 = 9 路由 × 2 视口）：

| 指标 | 结果 |
| --- | --- |
| `document.documentElement.scrollWidth − innerWidth` | **0 / 18**（全部为 0） |
| h1 数量 = 1 | **18 / 18**（dashboard 的 h1 为 sr-only，可见标题由页面层级承担；计数仍为 1） |
| JS 运行时错误（error / unhandledrejection / console.error） | **0 / 18** |
| 页面可滚动（内容溢出时 main 可滚） | 全部可滚；dashboard 1920 内容恰好 1020/1020，无可滚内容属正常 |
| 横向溢出/越界元素 | **0 / 18** |
| 截图与记录一一对应 | 18 条记录、21 张 PNG，尺寸均正确 |

四项诉求判定：

| # | 用户诉求 | 判定 | 实测证据 | 主要残余问题 |
| --- | --- | --- | --- | --- |
| ① | 驾驶舱底部列表改为地图下方居中箭头按钮，点开为浮层 | **部分解决** | 1920：地图 `x=332,y=100,w=1256,h=980`；按钮 `.dash-list-toggle` `x=926.6,y=1038,w=66.9,h=30`，水平中心偏差 **0.1px**、宽仅地图 **5.3%**；点击后 `.dash-list-float` `x=0,y=660,w=1920,h=420`、`role=dialog`、有搜索框、100 行。390：按钮 `x=161.6,y=1789.7`，中心偏差 **0.1px**，但位于地图底边下方 **1357.7px** 的页面最底部；浮层 `y=1832`，首屏不可见 | 390 下按钮不在“地图正下方”，浮层在页面底部；见 P2-01 |
| ② | 左右栏列表：数值 26px、行高约 85px、1px 分隔线 | **部分解决** | 20 个 `.stat-row`：**6/20** 行高 83.5–84.6px、数值 26px；其余 13 行 17.1–25.6px、数值 14px（矿业权分组标题 10px），右栏 7 行 23.4–25.6px/14px；分隔线 1px、8 条非末行，末行 0；390 下 6 行 49.9–50.9px、14 行紧凑 | 14/20 行未达到 85px/26px；见 P2-02 |
| ③ | 饼图圆心数字与单位居中 | **通过** | 两个环图 `pie.center=['50%','50%']`、`data[0].label.position='center'`；像素扫描（圆孔内亮度掩膜）：1920 图表 294×180 / 294×202，文字块 41×30 / 20×30.1，dx **0 / −0.5px**、dy **+0.5px**；390 图表 340×72，文字块 40×30.5 / 19×30.5，dx **−0.2px**、dy **+1.0px**；全部 ≤2px | 无阻断；单位字号偏小，属观感问题 |
| ④ | 子模块改用 antd（表格/分页/下拉/日期/表单/标签/抽屉/分段/指标卡） | **部分解决** | 已见：`.ant-table`、`.ant-btn`、`.ant-select`、`.ant-tag`、`.ant-tabs`、`.ant-segmented`、`.ant-statistic`、`.ant-form`、`.ant-switch`、`.ant-drawer`（/system，7 个表单项）；但 **18/18 记录 `.ant-pagination` = 0**、**9 条路由 `.ant-picker` = 0**；`/hub/rights/rights-clean-sale` 仍为自定义 `.pager`（1 个）与自定义 `.drawer`（标题「新增：净矿出让」），仅 `/system` 使用 antd Drawer；`/hub` 使用 antd Segmented + 自绘流程图 | 分页、日期、部分抽屉未 antd 化；见 P2-03 |

**可演示结论：1920×1080 桌面可作为演示基线；390×844 不建议直接演示，需先修 P1-01（数据表压缩）与 P2-01（列表按钮错位）。**

## 2. 路由 × 视口总表

| 路由 | 视口 | docSW | h1 | `.ant-table` | `.ant-btn` | JS 错误 | 截图 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| /dashboard | 1920×1080 | 1920 | 1 | 0 | 2 | 0 | docs/shots/v9/dashboard-1920.png |
| /battle | 1920×1080 | 1920 | 1 | 1 | 6 | 0 | docs/shots/v9/battle-1920.png |
| /hub | 1920×1080 | 1920 | 1 | 0 | 4 | 0 | docs/shots/v9/hub-1920.png |
| /hub/rights/rights-clean-sale | 1920×1080 | 1920 | 1 | 1 | 65 | 0 | docs/shots/v9/hub_rights_rights-clean-sale-1920.png |
| /biz/rights | 1920×1080 | 1920 | 1 | 0 | 2 | 0 | docs/shots/v9/biz_rights-1920.png |
| /warehouse | 1920×1080 | 1920 | 1 | 2 | 2 | 0 | docs/shots/v9/warehouse-1920.png |
| /mobile | 1920×1080 | 1920 | 1 | 0 | 14 | 0 | docs/shots/v9/mobile-1920.png |
| /system | 1920×1080 | 1920 | 1 | 1 | 4 | 0 | docs/shots/v9/system-1920.png |
| /archive/1 | 1920×1080 | 1920 | 1 | 7 | 6 | 0 | docs/shots/v9/archive_1-1920.png |
| /dashboard | 390×844 | 390 | 1 | 0 | 3 | 0 | docs/shots/v9/dashboard-390.png |
| /battle | 390×844 | 390 | 1 | 1 | 7 | 0 | docs/shots/v9/battle-390.png |
| /hub | 390×844 | 390 | 1 | 0 | 5 | 0 | docs/shots/v9/hub-390.png |
| /hub/rights/rights-clean-sale | 390×844 | 390 | 1 | 1 | 66 | 0 | docs/shots/v9/hub_rights_rights-clean-sale-390.png |
| /biz/rights | 390×844 | 390 | 1 | 0 | 3 | 0 | docs/shots/v9/biz_rights-390.png |
| /warehouse | 390×844 | 390 | 1 | 2 | 3 | 0 | docs/shots/v9/warehouse-390.png |
| /mobile | 390×844 | 390 | 1 | 0 | 15 | 0 | docs/shots/v9/mobile-390.png |
| /system | 390×844 | 390 | 1 | 1 | 5 | 0 | docs/shots/v9/system-390.png |
| /archive/1 | 390×844 | 390 | 1 | 7 | 7 | 0 | docs/shots/v9/archive_1-390.png |

注：`.ant-table` / `.ant-btn` 为当前可见 DOM 计数，不含未激活 Tab 与未打开的抽屉；dashboard 的 h1 为 sr-only，页面视觉标题存在；/hub 最终默认视图为流程图，台账表需切换 Segmented 查看。

## 3. 四项诉求核对（细节）

### 3.1 ① 底部列表按钮 + 浮层

- 1920：地图与按钮数字见上表；按钮的 `toggleCenterDelta=0.1`、`toggleWidthRatio=0.0533`、`toggleTopVsMapBottom=-42`（按钮顶边在地图底边上方 42px，即贴地图底部居中）。点击后 `.dash-list-float` 为 `role=dialog`、1920×420、100 行、搜索框存在，截图 `docs/shots/v9/dashboard-1920-list-open.png`。桌面诉求成立。
- 390：`toggleTopVsMapBottom=1357.7`、`listRoot y=1831.7`；点击后的浮层 `y=1832`，首屏截图 `docs/shots/v9/dashboard-390-list-open.png` 仍为地图与侧栏，浮层不可见。按钮虽水平居中，但不在“地图下方”，用户需滚过全部堆叠面板才能看到。判定部分解决。

### 3.2 ② 侧栏列表字号/行高/分隔线

- 20 个 `.stat-row` 的实测行高序列（1920）：`84.5, 84.6, 83.5, 84.5, 84.6, 83.6`（矿产资源储量 3 + 规划与保护 3，数值 26px），随后 `17.1, 24.6, 17.1, 24.6, 17.1, 25.6, 24.6`（矿业权，值 14px、组标题 10px），右栏 `23.4, 25.6, 24.6, 23.4, 25.6, 25.6, 24.6`（智慧监管，值 14px）。
- 390：前 6 行 49.9–50.9px（26px 数值，响应式收窄），其余 14 行仍为 17.1–25.6px / 14–10px；`in85=0`。
- 分隔线：`sep1px=8`、`sepLastZero=7`，颜色 `rgba(255,255,255,0.05)`；1px 分隔线要求满足，但只覆盖 8 条非末行。
- 判定：仅顶部两块面板满足 26px + 85px；矿业权与智慧监管仍是紧凑二级行。若产品口径只要求顶部两组列表，则本条可判通过；按字面 20 行统计为部分解决。

### 3.3 ③ 环图圆心数字/单位

- React fiber 中取到 `donutOption` 的 `series[0]`：`pie.center=['50%','50%']`，`pie.data[0].label={show:true,position:'center'}`，formatter 为函数。
- 像素扫描使用圆孔内半径掩膜（亮度阈值 >110，包含数字与暗色单位行，避免只测得数字行造成 dy=−7.5 的假偏差）：1920 两个环图 dx=0 / −0.5、dy=+0.5；390 两个环图 dx=−0.2、dy=+1.0。数字块与单位行整体居中，最大偏差 1.0px，判通过。
- 证据截图：`docs/shots/v9/dashboard-1920.png`、`docs/shots/v9/dashboard-390.png`。

### 3.4 ④ antd 覆盖

- 已迁移并实际渲染：`/battle`（Table/Select/Input/Statistic/Card/Button/Spin）、`/warehouse`（2×Table/Tabs/Tag/Button）、`/system`（Table/Tabs/Switch/Tag/Button/antd Drawer）、`/archive/1`（7×Table/Descriptions/Timeline/Statistic/Card）、`/hub/rights/rights-clean-sale`（Table/Select/Input/Tag/Button）、`/mobile`（Form/Input/Select/Tabs/List/Tag/Button）、`/dashboard`（Segmented/Button/Avatar）。
- 仍未 antd 化（在本轮 9 路由可见的范围内）：
  - 分页：18/18 记录 `.ant-pagination=0`；`DataTable` 组件固定 `pagination={false}`（`web/src/components/DataTable.jsx:41`），clean-sale 仍使用自绘 `.pager`（1 个）。
  - 日期：9 条路由 `.ant-picker=0`；本项目 `DatePicker` 只在 `web/src/pages/FeaturePage.jsx:610`、`:618` 出现，不在本轮路由清单内，故“日期控件是否 antd 化”在本轮**无法判定为通过**。
  - 抽屉：`/system` 为 antd Drawer（1 个、7 个 Form.Item）；`/hub/rights/rights-clean-sale` 的「新增」打开的是自定义 `.drawer`（`新增：净矿出让`，非 `.ant-drawer`）。
  - `/hub` 使用 antd Segmented，但主视图流程图仍是自绘 `.hub-flow`；台账表视图已能横向滚动（content sw=860 / cw=362）。
- 判定：主要控件已 antd 化，但分页/日期/部分抽屉未完成；判部分解决。

## 4. 问题清单

### P1-01 · 390×844 · antd 数据表被压成逐字竖排，行高 101–500px，操作列被裁

- 编号：P1-01
- 视口：390×844（桌面 1920 对照正常）
- 现象：
  - `/hub/rights/rights-clean-sale` 表格 20 行，行高 **311–332px**（桌面 43px），总高 6367px；表内容宽 408px、容器 362px，`overflow:visible`，外层卡片 `overflow:hidden`，`操作`列右边界 **422px** 超出卡片右边界 **378px**，约 **44px 被裁且不能横滚**；页面 main 高 **7379px**（桌面 1523px）。截图证据 `docs/shots/v9/hub_rights_rights-clean-sale-390-table.png` 可见编号/名称/矿种等列被压成逐字竖排，「删除」按钮被裁掉。
  - `/warehouse` 第二张表 40 行，行高 **101–122px**（桌面 39–59px），内容宽 362=容器宽，无横向滚动；main 高 **6782px**。
  - `/archive/1` 7 张表：储量备案 1 行 **500px**，设备表 122–143px，巡查表 290px（桌面 38–39px）；main 高 **4293px**。
  - 对照：`/system` 27 行 39–59px、`.ant-table-content` sw=980/cw=362、`overflowX:auto`；`/battle` 27 行 39–59px、sw=1180/cw=339、`overflowX:auto`；`/hub` 台账表视图 43–60px、sw=860/cw=362。说明问题不是 antd 本身，而是这几页未给 `DataTable` 传 `scrollX`，表格在 390 下按容器压缩列宽。
- 实测数字：clean-sale `rows=20, rowH=[332,311,311,332], sumH=6367, tableW=362, contentCW=362, contentSW=408, cardW=366 overflow=hidden`；warehouse `rows=40, rowH=[122,101,122], contentSW=362`；archive `rows=1, rowH=[500]`、`rows=5, rowH=[122,122,143]`、`rows=1, rowH=[290]`。
- 分级：**P1**
- 截图：`docs/shots/v9/hub_rights_rights-clean-sale-390-table.png`（表格实拍）、`docs/shots/v9/hub_rights_rights-clean-sale-390.png`、`docs/shots/v9/warehouse-390.png`、`docs/shots/v9/archive_1-390.png`
- 修复建议：
  1. `web/src/components/DataTable.jsx:41-42`：`pagination={false}` 保持不变的前提下，给 Table 默认 `scroll={{ x: 'max-content' }}`（或按列宽和设置 `x: scrollX || 720`），保证窄屏出现内部横向滚动而非压列。
  2. 在 `web/src/pages/Warehouse.jsx`（两处 DataTable）、`web/src/pages/Archive.jsx`（7 处 DataTable）、`web/src/pages/FeaturePage.jsx`（clean-sale 使用的 DataTable，约 664 行）显式传入与列宽匹配的 `scrollX`（建议 ≥900；FeaturePage 已有 `tableMin`/`colWidthOf`，可直接复用）。
  3. clean-sale 的「操作」列给出 `fixed:'right'` 或 `white-space:nowrap`，并在 390 下把操作收为「详情/更多」菜单，避免 44px 被裁。
  4. 回归目标：390 下所有数据表行高 ≤56px、`.ant-table-content` 出现可用的横向滚动；或 <620px 改卡片列表。

### P2-01 · 390×844 · 驾驶舱底部列表按钮落在页面最底部，浮层首屏不可见

- 编号：P2-01
- 视口：390×844（1920 通过）
- 现象：地图 `.dash-map` 为 `x=12,y=112,w=366,h=320`；`.dash-list-toggle` 为 `x=161.6,y=1789.7,w=66.9,h=30`，按钮顶边距地图底边 **1357.7px**；点击后 `.dash-list-float` `x=12,y=1832,w=366,h=360`，首屏截图看不到浮层。桌面按钮在地图正下方居中（中心偏差 0.1px）。
- 实测数字：`toggleTopVsMapBottom=1357.7`（390）/`−42`（1920）；`listRoot y=1831.7`；浮层 100 行、有搜索框。
- 分级：**P2**
- 截图：`docs/shots/v9/dashboard-390-list-open.png`、`docs/shots/v9/dashboard-1920-list-open.png`
- 修复建议：`web/src/pages/Cockpit.jsx` 中将 `.dash-list-toggle` 在 `isPhone` 分支移到地图舞台后立即渲染（或给地图容器 `position:relative`，按钮 `position:absolute; left:50%; transform:translateX(-50%); bottom:12`），浮层用 `position:fixed` 或 `bottom:0` 覆盖在地图下方；不要放在全部堆叠面板之后。

### P2-02 · 1920/390 · 侧栏 20 行中仅 6 行满足 85px/26px

- 编号：P2-02
- 视口：1920×1080、390×844
- 现象：只有矿产资源储量（3 行）与规划与保护（3 行）是 83.5–84.6px/26px；矿业权 7 行 17.1–25.6px/14px（组标题 10px），智慧监管 7 行 23.4–25.6px/14px；390 下 6 行 49.9–50.9px、其余 14 行紧凑。分隔线 1px 只在 8 条非末行存在。
- 实测数字：`rowStats.count=20, in85=6, valueFontSizes=['26px','14px'], sep1px=8`（1920）；390 `in85=0`。
- 分级：**P2**
- 截图：`docs/shots/v9/dashboard-1920.png`、`docs/shots/v9/dashboard-390.png`
- 修复建议：`web/src/pages/Cockpit.jsx` 的 `.stat-row` 渲染/`web/src/styles/pages.css` 的 `.stat-row`：对矿业权主指标行也使用 26px/≥72px 行高，二级说明行统一 24–32px，组标题从 10px 提到 ≥11px；若产品只要求顶部两组列表，请在 `docs/15-界面改造-v5.md` 明确口径，避免“同一组件两种规格”。

### P2-03 · 全路由 · antd 分页/日期/部分抽屉仍未迁移

- 编号：P2-03
- 视口：18/18 记录（DOM 级）
- 现象：
  - `.ant-pagination` = 0（18/18）；`DataTable` `pagination={false}`；clean-sale 仍渲染自定义 `.pager`（1 个）。
  - `.ant-picker` = 0（9 条路由）；`DatePicker` 只在 `FeaturePage.jsx:610/618` 出现，本轮路由未覆盖。
  - `/hub/rights/rights-clean-sale` 的「新增」打开自定义 `.drawer`（0 个 `.ant-drawer`）；`/system` 的「新增用户」为 antd Drawer（1 个、7 个表单项）。
  - `/hub` 主视图为自绘流程图（antd Segmented 切换），台账表视图已可横向滚动。
- 实测数字：clean-sale `ant-pagination=0, ant-picker=0, .pager=1, .ant-table=1`；system `ant-pagination=0, ant-picker=0, .ant-drawer=1`；clean-sale 点击新增后 `.ant-drawer=0, .drawer=1`。
- 分级：**P2**（诉求覆盖缺口，非功能阻断）
- 截图：`docs/shots/v9/system-1920.png`、`docs/shots/v9/hub_rights_rights-clean-sale-390.png`
- 修复建议：
  1. `web/src/components/DataTable.jsx:51-65` 已有 `Pager`（antd Pagination），但 `DataTable` 未使用；为需要分页的列表接入 `<Pager>`，替换 clean-sale 的 `.pager`。
  2. `web/src/pages/FeaturePage.jsx` 的自定义 Drawer 改为 `antd Drawer`（/system 已有可复用模式），并保留 Esc/遮罩关闭。
  3. 日期筛选在 `FeaturePage.jsx:610/618` 已用 antd `DatePicker`；若其他页面需要日期筛选，统一使用 `DatePicker`/`RangePicker`。

### P3-01 · 全路由 · 36 个可见触控目标小于 24px

- 编号：P3-01
- 视口：1920×1080 与 390×844 一致
- 现象与数字：
  - `/dashboard`：6 个 `button.panel-more` **47×17px**（「详情」）。
  - `/hub/rights/rights-clean-sale`：2 个面包屑 `a` **48×19.4 / 60×19.4px**（「业务中枢」「矿业权管理」）。
  - `/biz/rights`：1 个面包屑 `a` **60×19.4px**（「数字驾驶舱」）。
  - `/system`：27 个 `button.ant-switch.ant-switch-small` **26×15px**。
  - 单视口合计 36 个；两视口合计 72 个。
- 分级：**P3**
- 截图：`docs/shots/v9/dashboard-1920.png`、`docs/shots/v9/system-1920.png`
- 修复建议：`web/src/styles/pages.css` 的 `.panel-more` 增大 `min-height:28px`/padding；`web/src/styles/components.css` 的 `.breadcrumb a` 增加上下 padding 使命中区 ≥24px；`web/src/pages/SystemPage.jsx` 的 Switch 改 `size="default"`（或外层加 32×32 命中区）。

## 5. 优先修复顺序（≤5 条）

1. **P1-01 先修**：`DataTable` 默认横向滚动 + Warehouse/Archive/FeaturePage 传 `scrollX`，clean-sale 操作列 `fixed:'right'`；这是 390 下唯一会影响操作（删除/编辑）的问题。
2. **P2-01**：把 `.dash-list-toggle` 移回 390 地图正下方，浮层改 `fixed/bottom`，保证首屏可见、可关闭。
3. **P2-02**：统一侧栏 `.stat-row` 主行 26px/≥72px、组标题 ≥11px；若口径只指顶部两组，补文档说明。
4. **P2-03**：接入 antd `Pagination`（复用 `Pager`）、替换 clean-sale 自定义 Drawer；日期控件按实际页面补齐。
5. **P3-01**：把 `panel-more`、面包屑、`Switch` 的命中区提到 ≥24px（建议 32px）。

## 6. 复现与基线说明

- 复现脚本：`.tmp/qa-review/run-t24.mjs`、`.tmp/qa-review/measure-t24.mjs`；原始记录：`.tmp/qa-review/t24-1920x1080.json`、`.tmp/qa-review/t24-390x844.json`。
- 截图：`docs/shots/v9/` 21 张；其中 `*-list-open.png` 为点击 `.dash-list-toggle` 后的补充证据，`hub_rights_rights-clean-sale-390-table.png` 为 390 表格横向压缩的补充证据。
- 构建基线：`index-DBKQcs0L.js` / `index-CPCeZTlM.css`，2026-11-18 17:11:59；回归完成后再次核对 `web/dist/index.html` mtime 与入口哈希未变化。
- 本轮只读：未修改 `web/`、`server/` 或任何产品样式；报告外未写入产品代码。
