# 绿矿智用 · 矿权管理系统

> 省域空间治理数字化平台 —— 矿权管理系统（矿产资源全生命周期一体化监管）
> 依据《矿权管理系统功能设计文档》与 5 张系统截图实现，覆盖文档列出的 **6 大业务域 / 40 个功能点 / 7 个驾驶舱专题**。
>
> 仓库：<https://github.com/Mars2077/kuangquan-platform>　｜　在线体验（火山引擎 IGA Pages）：<https://kuangquan-platfo-541ysnljv4-a0ii6jgxjr.preview.iga-pages.com?iga_token=6d770f1c7103d9b22030a1ba80009856&iga_time=1795067843>　｜　部署文档：[docs/04-部署说明.md](docs/04-部署说明.md)

![数字驾驶舱](docs/shots/dashboard.png)

---

## 一、这是什么

一套面向省—市—县三级自然资源主管部门的矿产资源一体化管理平台，包含：

| 层 | 内容 |
| --- | --- |
| 门户层 | 平台分布（存量系统「迭代」入口 + 新建核心场景「新建」矩阵）、统一登录与三级分权 |
| 一张图层 | 数字驾驶舱：省/市/县三级下钻、专题图层、图斑属性卡、底部专题列表 |
| 业务层 | 矿产地智能管理、保护与规划管理、矿业权管理、绿色矿山管理、矿产资源智慧监管、数智地勘管理 |
| 支撑层 | 绿矿智用数据仓、政务移动端、系统管理（用户/指标监测/操作审计/运行健康） |
| 辅助决策 | 储量核算与三率校验、空间叠置压覆测算、选址合规预检、绿色矿山评分、指标配额、开发利用方案校验、信用评分、超期工单督办 |

演示数据为**按浙江省真实行政区划边界与业务口径生成的模拟数据**，非真实矿山台账，仅用于功能演示。

---

## 二、技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 前端 | React 18.3 + Vite 5 + React Router 6 | HashRouter，按页面懒加载 |
| 样式 | 原生 CSS + 设计令牌（tokens.css） | 不引入 UI 框架，避免样式覆盖；设计规范见 [docs/05-设计规范.md](docs/05-设计规范.md) |
| 动效 | GSAP 3.13 + Motion 12 | 首屏入场、数字滚动、卡片聚光；遵循 `prefers-reduced-motion` |
| 地图 | 自研 SVG 矢量投影 | 真实浙江省 11 市 / 102 区县 GeoJSON，无第三方地图 Key 依赖 |
| 图标 | @hugeicons/react（core-free-icons） | 全站统一图标集，不使用近似绘制 |
| 后端 | Node.js 22 + Express 4 | ES Module，零构建直接运行 |
| 数据库 | SQLite（`node:sqlite` 内置模块） | 免安装、免编译；单文件 `server/data/kuangquan.db`，WAL 模式 |
| 鉴权 | JWT + bcryptjs | 三级行政区划数据权限（`region_code` 前缀隔离） |
| 导出 | ExcelJS（服务端 xlsx）+ 前端 CSV | 列表导出与作战图导出 |
| 二维码 | qrcode（服务端生成 DataURL） | 「一矿一档」扫码溯源 |

> 选型理由：政务类单机/内网部署场景下，Node + SQLite 可实现「解压即跑」，无需独立数据库服务；数据规模（百万级行以内）下 SQLite 的性能与运维成本优于 MySQL。

---

## 三、快速开始

### 环境要求

- Node.js **≥ 22**（依赖内置 `node:sqlite`，20 及以下不可用）
- npm ≥ 9
- 端口：`8787`（API + 生产静态托管）、`5173`（开发态前端）

### 方式一：开发态（推荐首次体验）

```bash
# 1. 安装依赖（前后端一起装）
npm run setup

# 2. 初始化演示数据（首次自动执行，也可手动强制重灌）
npm run seed

# 3. 同时启动 API + 前端
npm run dev
```

- 前端：<http://127.0.0.1:5173/>
- API 健康检查：<http://127.0.0.1:8787/api/health>
- 仅启动 API：`npm run dev -- --api`

### 方式二：生产态（构建后单端口运行）

```bash
npm run build     # 构建前端到 web/dist
npm start         # 启动 API，并静态托管 web/dist
```

访问 <http://127.0.0.1:8787/>（SPA 单端口，无需 Nginx）。

### 方式三：纯静态部署（无后端进程，火山引擎 IGA Pages 线上版）

线上地址见本节末尾。该形态把数据与业务逻辑下沉到浏览器：构建时带上真实数据库导出的快照，
运行期由前端内置的接口层接管全部 `/api/*` 请求，因此可以放在任意静态站点/CDN 上（IGA Pages、OSS、Nginx 均可）。

```bash
npm run export:snapshot          # 1. 从 SQLite 导出快照 + 同步功能规格到前端
npm run build:demo               # 2. 以 demo 模式构建（产物 web/dist 即完整站点）
npm run preview:demo             # 3. 本地验证（http://127.0.0.1:4173）
```

- 上线：`cd web && iga pages deploy --name kuangquan-platform`（需先 `iga login`，配置见 `web/iga.json`）
- 线上：<https://kuangquan-platfo-541ysnljv4-a0ii6jgxjr.preview.iga-pages.com?iga_token=6d770f1c7103d9b22030a1ba80009856&iga_time=1795067843>
- 差异：静态版的新增/修改/删除写入浏览器 `localStorage`（键 `kq_demo_journal_v1`），刷新后仍在、换设备不共享；服务端版写真实 SQLite。
- 两个形态共用同一份前端代码与同一套接口契约，页面、交互、算法完全一致。

### 演示账号

| 账号 | 密码 | 角色 | 数据范围 |
| --- | --- | --- | --- |
| `admin` | `admin123` | 系统管理员 | 全省 |
| `province` | `123456` | 省级管理员 | 全省 |
| `city` | `123456` | 市级管理员 | 湖州市 |
| `county` | `123456` | 县级管理员 | 吴兴区 |
| `enterprise` | `123456` | 矿山企业 | 本企业 |

> 登录页已内置一键填充，无需手动输入。

---

## 四、目录结构

```
kuangquan-platform/
├─ package.json                # 根脚本：setup / dev / seed / build / start / preview
├─ scripts/
│  ├─ dev.mjs                  # 一键启动（API + Vite），--api 只起后端，preview 用 dist
│  └─ prepare-geo.mjs          # 行政区划 GeoJSON 抽稀（Douglas-Peucker）
├─ server/                     # 后端（Express + SQLite）
│  ├─ src/
│  │  ├─ index.js              # 入口：初始化库表 → 自动播种 → 挂载路由 → 静态托管
│  │  ├─ db.js                 # 27 张表 DDL、连接、insertRow 等助手
│  │  ├─ auth.js               # JWT 签发校验、密码哈希、权限码、审计落库
│  │  ├─ util.js               # 统一响应、分页、行政区划隔离、Excel 导出
│  │  ├─ features.js           # ★ 业务规格单一事实源：6 域 40 功能点 + 字段字典
│  │  ├─ seed.js               # 演示数据生成器（可 --force 重灌）
│  │  └─ routes/
│  │     ├─ public.js          # 登录/引导/二维码/一矿一档/数据仓/移动端/系统
│  │     ├─ feature.js         # 通用业务 CRUD + 流程流转 + Excel 导出
│  │     ├─ dashboard.js       # 驾驶舱七场景 / 专题图层 / 作战图
│  │     └─ tools.js           # 8 个辅助决策算法（储量/叠置/预检/评分…）
│  └─ data/
│     ├─ kuangquan.db          # SQLite 数据文件（首次启动自动创建）
│     ├─ geo-raw/              # 行政区划原始 GeoJSON（构建时抽稀）
│     └─ uploads/              # 数据仓上传文件
├─ web/                        # 前端（React + Vite）
│  ├─ public/geo/              # 抽稀后的省/市/县边界（102 个要素，340 KB）
│  └─ src/
│     ├─ main.jsx  App.jsx  api.js  store.jsx
│     ├─ layout/Shell.jsx      # 顶栏（时钟/指标监测/问题监测/用户）+ 场景导航
│     ├─ pages/                # Login Portal Cockpit ModuleHome FeaturePage
│     │                        # Battle Archive Warehouse Mobile SystemPage
│     ├─ components/           # Panel / Modal / DataTable / GeoMap / Icon
│     │  └─ reactbits/         # 12 个动效组件（源码拷贝，非运行时依赖）
│     └─ styles/               # tokens / components / widgets / pages
└─ docs/                       # 交付文档与截图
   ├─ shots/                   # 7 张实机截图
   ├─ 01-需求梳理.md
   ├─ 02-缺失与冲突清单.md
   ├─ 03-模块功能对照.md
   ├─ 04-部署说明.md
   ├─ 05-设计规范.md
   └─ 06-数据字典.md
```

---

## 五、模块与功能对应关系

完整对照（功能点 → 页面路由 → 接口 → 数据表）见 **[docs/03-模块功能对照.md](docs/03-模块功能对照.md)**，概览如下：

| 业务域 | 功能点数 | 入口 |
| --- | --- | --- |
| 数字驾驶舱（首页一张图与市县下钻） | 7 个专题 | `/dashboard`、`/scene/:scene` |
| 矿产地智能管理 | 5 | `/biz/deposit` |
| 保护与规划管理 | 8 | `/biz/plan` |
| 矿业权管理 | 12 | `/biz/rights` |
| 绿色矿山管理 | 3 | `/biz/green` |
| 矿产资源智慧监管 | 7 | `/biz/supervise` |
| 数智地勘管理 | 5 | `/biz/geology` |
| 全局弹窗 · 重点任务作战图 | 1 | 顶栏「指标监测」或地图「重大任务」 |
| 平台分布（门户） | 1 | `/portal` |
| 一矿一档 / 数据仓 / 移动端 / 系统管理 | 4 | `/archive/:id`、`/warehouse`、`/mobile`、`/system` |

---

## 六、界面截图

| 平台分布（门户） | 数字驾驶舱 |
| --- | --- |
| ![](docs/shots/portal.png) | ![](docs/shots/dashboard.png) |

| 重点任务作战图 | 一矿一档 |
| --- | --- |
| ![](docs/shots/battle.png) | ![](docs/shots/archive.png) |

| 业务域落地页 | 通用功能页（净矿出让） |
| --- | --- |
| ![](docs/shots/module-rights.png) | ![](docs/shots/feature.png) |

登录页：![](docs/shots/login.png)

---

## 七、验收对照

| 验收项 | 结论 | 证据 |
| --- | --- | --- |
| 功能设计文档每个功能点都有对应实现 | 通过：6 域 40 个功能点全部落地，逐条对照见 docs/03 | `server/src/features.js` + `/api/meta/bootstrap` 下发的规格即运行时事实源 |
| 可实际操作验证 | 通过：新增/编辑/删除/流程流转/导出/算法试算全链路已实测 | 见 docs/03 每行「验证方式」列 |
| 主要界面布局与截图基本一致 | 通过：驾驶舱三栏 + 顶部导航 + 底部浮动列表、作战图斜切统计卡与四色旗帜、门户双区矩阵 | docs/shots/*.png |
| 能按文档步骤启动 | 通过：`npm run setup → npm run seed → npm run dev`；或 `npm run build → npm start` | 见第三节 |

已知偏差（3 处，均因数据或截图口径差异，非功能缺失）：

1. 驾驶舱「绿色矿山列表」第 6 列截图为「入库时间」，数据库无该字段，改用**「有效期始」**呈现（口径更严谨）。
2. 地图为**矢量行政区划底图**（真实省界/市县界），截图为卫星影像底图；离线环境不接入商业影像服务，图层控制面板中已注明「基础参考图层待接底图」。
3. 矿山图斑为**按矿区面积折算的示意多边形**（真实矿权拐点坐标不公开），点击后属性卡字段与截图完全一致。

---

## 八、数据说明

- 行政区划：浙江省 11 个地市 / 102 个区县，边界来自公开 GeoJSON，构建期抽稀至 340 KB。
- 业务数据：脚本按真实行业口径生成（矿种、勘查程度、许可证号规则、三率阈值、绿色矿山分级、预警分级），**全部为模拟数据**。
- 重置数据：`npm run seed` 幂等；强制重灌用 `node server/src/seed.js --force`。

---

## 九、许可与致谢

- 本项目代码：MIT。
- 动效组件来自 [react-bits](https://github.com/DavidHDev/react-bits)（MIT + Commons Clause），以源码拷贝方式引入，版权归原作者。
- 设计方法论参考 [taste-skill](https://github.com/Leonxlnx/taste-skill)（anti-slop 前端设计规范），落地为 [docs/05-设计规范.md](docs/05-设计规范.md)。
- 动画引擎：[GSAP](https://gsap.com/)（3.13 起标准插件免费）。
