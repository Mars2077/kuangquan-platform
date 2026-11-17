/* 此文件由 scripts/export-snapshot.mjs 从 server/src/features.js 自动复制，请勿手工修改 */
/**
 * 全局字段字典 + 业务功能目录。
 * 一次定义，服务端（CRUD / 导出 / 校验）与前端（表格 / 表单 / 详情抽屉）共用同一份 spec，
 * 保证「文档里的每个功能点」在系统里都有可操作的界面与数据表。
 */

export const REGION_OPTIONS = [
  { value: '330000', label: '浙江省' },
  { value: '330100', label: '杭州市' },
  { value: '330200', label: '宁波市' },
  { value: '330300', label: '温州市' },
  { value: '330400', label: '嘉兴市' },
  { value: '330500', label: '湖州市' },
  { value: '330600', label: '绍兴市' },
  { value: '330700', label: '金华市' },
  { value: '330800', label: '衢州市' },
  { value: '330900', label: '舟山市' },
  { value: '331000', label: '台州市' },
  { value: '331100', label: '丽水市' }
];

export const MINERAL_OPTIONS = [
  '石灰岩', '溶剂用灰岩', '方解石', '萤石', '叶蜡石', '建筑用石料', '建筑用砂',
  '花岗岩', '玄武岩', '膨润土', '高岭土', '硅灰石', '石英砂岩', '地热', '矿泉水',
  '金', '银', '铜', '铅', '锌', '钼', '钨', '锡', '铁', '煤', '石煤'
].map((v) => ({ value: v, label: v }));

/** 通用字段字典：key -> 列定义 */
export const FIELDS = {
  code: { label: '编号', type: 'text', width: 150 },
  title: { label: '名称/标题', type: 'text', width: 260, main: true },
  name: { label: '名称', type: 'text', width: 240, main: true },
  status: { label: '状态', type: 'status', width: 110 },
  stage: { label: '办理环节', type: 'text', width: 120 },
  region_name: { label: '行政区划', type: 'text', width: 110, filter: 'region' },
  mineral: { label: '矿种', type: 'text', width: 110, filter: 'mineral' },
  applicant: { label: '申报/申请单位', type: 'text', width: 200 },
  dept: { label: '责任部门', type: 'text', width: 130 },
  amount: { label: '金额(万元)', type: 'money', width: 120 },
  qty: { label: '数量', type: 'number', width: 100 },
  occur_at: { label: '发生/申报日期', type: 'date', width: 120 },
  due_at: { label: '期限', type: 'date', width: 120 },
  level: { label: '级别', type: 'text', width: 100 },
  remark: { label: '备注', type: 'longtext', width: 220 },
  created_at: { label: '创建时间', type: 'datetime', width: 160 }
};

/**
 * 扩展字段字典：业务表里的专有列。
 * 前端表格表头、表单标签、详情抽屉与导出表头全部读这一份，避免出现裸字段名。
 */
Object.assign(FIELDS, {
  mine_name: { label: '矿山名称', type: 'text', width: 220, main: true },
  license_no: { label: '许可证号', type: 'text', width: 190 },
  right_type: { label: '权类', type: 'text', width: 90, options: ['采矿权', '探矿权'] },
  holder: { label: '权利人', type: 'text', width: 190 },
  right_holder: { label: '采矿权人', type: 'text', width: 190 },
  econ_type: { label: '经济类型', type: 'text', width: 150 },
  valid_from: { label: '有效期起', type: 'date', width: 110 },
  valid_to: { label: '有效期止', type: 'date', width: 110 },
  scale: { label: '规模', type: 'text', width: 100 },
  area: { label: '面积(km²)', type: 'number', width: 100 },
  reserve_t: { label: '保有资源量(万吨)', type: 'number', width: 150 },
  degree: { label: '勘查阶段', type: 'text', width: 120 },
  owner: { label: '责任主体', type: 'text', width: 180 },
  review_no: { label: '备案文号', type: 'text', width: 170 },
  record_at: { label: '备案日期', type: 'date', width: 110 },
  report_name: { label: '报告名称', type: 'text', width: 220 },
  grade: { label: '规模等级', type: 'text', width: 100 },
  zone_type: { label: '规划分区类型', type: 'text', width: 160 },
  version: { label: '版本', type: 'text', width: 80 },
  category: { label: '类别', type: 'text', width: 120 },
  unit: { label: '单位', type: 'text', width: 80 },
  target: { label: '目标值', type: 'number', width: 100 },
  actual: { label: '实际值', type: 'number', width: 100 },
  year: { label: '年度', type: 'text', width: 80 },
  warn: { label: '预警', type: 'text', width: 80 },
  cnt: { label: '数量', type: 'number', width: 90 },
  gdp_type: { label: '经济类型', type: 'text', width: 130 },
  issue_date: { label: '发证日期', type: 'date', width: 110 },
  apply_level: { label: '申报级别', type: 'text', width: 100 },
  total_score: { label: '综合得分', type: 'number', width: 100 },
  submit_at: { label: '提交时间', type: 'date', width: 110 },
  green_level: { label: '绿色矿山等级', type: 'text', width: 120 },
  digital_level: { label: '数字化等级', type: 'text', width: 110 },
  smart_level: { label: '智能化等级', type: 'text', width: 110 },
  green_since: { label: '入库时间', type: 'date', width: 110 },
  patrol_count: { label: '巡查次数', type: 'number', width: 100 },
  rectify: { label: '整改状态', type: 'text', width: 100 },
  out_type: { label: '出库类型', type: 'text', width: 100 },
  trigger_rule: { label: '触发规则', type: 'longtext', width: 200 },
  occurred_at: { label: '发生时间', type: 'date', width: 110 },
  reason: { label: '原因', type: 'longtext', width: 200 },
  alert_no: { label: '预警编号', type: 'text', width: 150 },
  kind: { label: '类型', type: 'text', width: 110 },
  content: { label: '内容', type: 'longtext', width: 240 },
  plan_name: { label: '巡查计划', type: 'text', width: 180 },
  grid: { label: '网格', type: 'text', width: 120 },
  inspector: { label: '巡查人', type: 'text', width: 110 },
  sign_at: { label: '签到时间', type: 'datetime', width: 150 },
  photos: { label: '影像(张)', type: 'number', width: 90 },
  result: { label: '结果', type: 'text', width: 90 },
  finding: { label: '发现问题', type: 'longtext', width: 220 },
  device_type: { label: '设备类型', type: 'text', width: 130 },
  value: { label: '当前值', type: 'number', width: 100 },
  online: { label: '在线', type: 'text', width: 80 },
  threshold: { label: '阈值', type: 'text', width: 110 },
  score: { label: '信用评分', type: 'number', width: 100 },
  punish_count: { label: '处罚次数', type: 'number', width: 100 },
  abnormal: { label: '异常名录', type: 'text', width: 100 },
  list_type: { label: '名单类型', type: 'text', width: 100 },
  order_no: { label: '工单编号', type: 'text', width: 150 },
  source: { label: '来源', type: 'text', width: 110 },
  overdue: { label: '是否超期', type: 'text', width: 90 },
  budget: { label: '预算(万元)', type: 'money', width: 120 },
  paid: { label: '已付(万元)', type: 'money', width: 120 },
  start_at: { label: '开始时间', type: 'date', width: 110 },
  end_at: { label: '结束时间', type: 'date', width: 110 },
  progress: { label: '进度(%)', type: 'number', width: 90 },
  reserve_add: { label: '新增资源量(万吨)', type: 'number', width: 150 },
  selenium: { label: '硒含量(mg/kg)', type: 'number', width: 130 },
  ph: { label: '酸碱度', type: 'number', width: 90 },
  cadmium: { label: '镉含量(mg/kg)', type: 'number', width: 130 },
  crop: { label: '主要作物', type: 'text', width: 110 },
  risk: { label: '风险等级', type: 'text', width: 100 },
  type: { label: '类型', type: 'text', width: 120 },
  points: { label: '遗迹点', type: 'number', width: 90 },
  route: { label: '科普路线', type: 'longtext', width: 220 },
  intro: { label: '简介', type: 'longtext', width: 240 },
  unit_type: { label: '单位类型', type: 'text', width: 110 },
  qualification: { label: '资质等级', type: 'text', width: 110 },
  staff: { label: '技术人员', type: 'number', width: 100 },
  senior: { label: '高级职称', type: 'number', width: 100 },
  equipment: { label: '装备(台套)', type: 'number', width: 110 },
  credit_score: { label: '信用分', type: 'number', width: 100 },
  threat_people: { label: '威胁人数', type: 'number', width: 100 },
  threat_asset: { label: '威胁财产(万元)', type: 'money', width: 130 },
  device_online: { label: '在线设备', type: 'number', width: 100 },
  lon: { label: '经度', type: 'number', width: 100 },
  lat: { label: '纬度', type: 'number', width: 100 },
  region_code: { label: '行政区划代码', type: 'text', width: 120 },
  effective: { label: '有效状态', type: 'text', width: 100 }
});

/** 业务功能目录：7 个业务域 + 支撑体系 */
export const MODULES = [
  {
    key: 'deposit',
    name: '矿产地智能管理',
    route: '/deposit',
    intro: '按矿种类别、勘查程度与省市县三级行政区划管理资源家底，覆盖一矿一档、清查填报、储量评审备案与辅助计算。',
    features: [
      {
        key: 'deposit-overview', name: '矿产地概况', table: 'mineral_deposit',
        desc: '按矿种类别、勘查程度（待查/在查/查明/规划）及省市县行政区划，以图表和空间热力展示资源家底与分布格局。',
        columns: ['name', 'region_name', 'mineral', 'stage', 'scale', 'area', 'reserve_t', 'degree'],
        filters: ['region', 'mineral', 'stage'],
        form: ['name', 'region_name', 'mineral', 'stage', 'scale', 'area', 'reserve_t', 'degree']
      },
      {
        key: 'deposit-archive', name: '矿产地一本账', table: 'mineral_deposit',
        desc: '「一矿一档」全息数字档案：基础地质特征、历年储量变化、开发利用现状、空间压覆及管理制度文件，可生成专属二维码扫码查看。',
        columns: ['code', 'name', 'region_name', 'mineral', 'stage', 'reserve_t', 'owner'],
        filters: ['region', 'mineral', 'stage'],
        form: ['code', 'name', 'region_name', 'mineral', 'stage', 'reserve_t', 'owner'],
        qr: true,
        archive: true
      },
      {
        key: 'deposit-survey', name: '矿产地清查管理', table: 'biz_record',
        desc: '县级管理员在线填报清查表单、绘制或导入空间范围矢量上图，流转至市级、省级在线审核，支持退回补正。',
        columns: ['code', 'title', 'region_name', 'mineral', 'stage', 'applicant', 'occur_at'],
        filters: ['region', 'mineral', 'status'],
        form: ['code', 'title', 'region_name', 'mineral', 'applicant', 'occur_at', 'remark'],
        workflow: {
          field: 'stage',
          steps: [
            { key: '县级填报', role: 'county' },
            { key: '市级审核', role: 'city' },
            { key: '省级审核', role: 'province' },
            { key: '已完成', role: 'province', terminal: true }
          ],
          rejectTo: '县级填报'
        },
        extras: { area_km2: ['上图面积(km²)', 'number'], coord: ['范围矢量(GeoJSON)', 'text'] }
      },
      {
        key: 'reserve-review', name: '储量评审备案', table: 'reserve_review',
        desc: '储量核实报告线上申报、受理、专家评审意见上传、备案文号自动生成及储量估算范围矢量图斑入库，支持多条件检索与电子档案调阅。',
        columns: ['review_no', 'mine_name', 'applicant', 'mineral', 'region_name', 'reserve_t', 'status', 'record_at'],
        filters: ['region', 'mineral', 'status', 'kw', 'dateRange'],
        form: ['mine_name', 'applicant', 'mineral', 'region_name', 'report_name', 'reserve_t', 'grade'],
        workflow: {
          field: 'status',
          steps: [
            { key: '待受理', role: 'county' },
            { key: '已受理', role: 'city' },
            { key: '专家评审', role: 'province' },
            { key: '已备案', role: 'province', terminal: true }
          ],
          rejectTo: '待受理',
          onTerminal: 'genReviewNo'
        },
        extras: { report_name: ['核实报告名称', 'text'], grade: ['储量规模', 'text'] }
      },
      {
        key: 'deposit-calc', name: '辅助计算', table: 'biz_record',
        desc: '内置资源储量核算与空间叠置分析工具：导入矿体块段参数或三维地质模型自动计算保有储量、动用储量、损失量及三率指标；在地图上自定义绘制多边形自动测算与矿产地、矿业权的空间重叠面积及资源压覆量。',
        columns: ['code', 'title', 'region_name', 'mineral', 'qty', 'occur_at'],
        filters: ['region', 'mineral'],
        form: ['title', 'region_name', 'mineral', 'qty', 'remark'],
        special: 'calc',
        extras: {
          method: ['计算方式', 'text'],
          block_params: ['块段参数', 'text'],
          resource_total: ['资源量(万吨)', 'number'],
          mined: ['动用储量(万吨)', 'number'],
          loss: ['损失量(万吨)', 'number'],
          recovery: ['开采回采率(%)', 'number'],
          dilution: ['矿石贫化率(%)', 'number'],
          utilization: ['选矿回收率(%)', 'number'],
          overlap_area: ['重叠面积(km²)', 'number'],
          overlap_rights: ['压覆矿业权', 'text']
        }
      }
    ]
  },
  {
    key: 'plan',
    name: '保护与规划管理',
    route: '/plan',
    intro: '省市县三级矿产资源总体规划的目标达成、成果入库、动态调整、合规审查、压覆查询、保护管控与指标预警。',
    features: [
      {
        key: 'plan-overview', name: '规划情况概览', table: 'plan_zone',
        desc: '省市县三级矿产资源总体规划目标达成进度，重点勘查区、重点开采区、砂石土料集中开采区空间分布。',
        columns: ['code', 'name', 'zone_type', 'region_name', 'mineral', 'area', 'reserve_t', 'level', 'version'],
        filters: ['region', 'zoneType', 'mineral'],
        form: ['code', 'name', 'zone_type', 'region_name', 'mineral', 'area', 'reserve_t', 'level', 'version']
      },
      {
        key: 'plan-archive', name: '规划成果管理', table: 'biz_record',
        desc: '规划文本、附表及矢量空间数据库标准化入库，支持多版本对比与空间叠加浏览。',
        columns: ['code', 'title', 'region_name', 'level', 'status', 'occur_at'],
        filters: ['region', 'status'],
        form: ['code', 'title', 'region_name', 'level', 'occur_at', 'remark'],
        extras: {
          version: ['版本号', 'text'],
          text_file: ['规划文本', 'text'],
          table_file: ['规划附表', 'text'],
          shp_file: ['矢量库', 'text'],
          compare_with: ['对比版本', 'text']
        }
      },
      {
        key: 'plan-adjust', name: '动态规划调整', table: 'biz_record',
        desc: '在线受理规划区块增设、边界调整、指标调剂申请，自动执行生态保护红线与永久基本农田合规性预检，形成动态调整台账。',
        columns: ['code', 'title', 'region_name', 'status', 'stage', 'applicant', 'occur_at'],
        filters: ['region', 'status'],
        form: ['title', 'region_name', 'applicant', 'occur_at', 'remark'],
        workflow: {
          field: 'stage',
          steps: [
            { key: '待预检', role: 'county' },
            { key: '预检通过', role: 'city' },
            { key: '市级审核', role: 'city' },
            { key: '省级批复', role: 'province', terminal: true }
          ],
          rejectTo: '待预检'
        },
        special: 'precheck',
        extras: {
          adjust_type: ['调整类型', 'text'],
          old_area: ['原区块面积(km²)', 'number'],
          new_area: ['调整后面积(km²)', 'number'],
          redline_hit: ['生态保护红线', 'text'],
          farmland_hit: ['永久基本农田', 'text']
        }
      },
      {
        key: 'plan-compliance', name: '辅助规划实施', table: 'biz_record',
        desc: '拟设矿业权选址智能合规审查：输入坐标或框选范围，一键检测是否落入禁止/限制勘查开采区、是否符合规划区块设置准入条件。',
        columns: ['code', 'title', 'region_name', 'mineral', 'status', 'occur_at'],
        filters: ['region', 'mineral'],
        form: ['title', 'region_name', 'mineral', 'remark'],
        special: 'compliance',
        extras: {
          input_mode: ['输入方式', 'text'],
          lon: ['经度', 'number'],
          lat: ['纬度', 'number'],
          area_km2: ['范围面积(km²)', 'number'],
          forbid_hit: ['禁止勘查开采区', 'text'],
          limit_hit: ['限制勘查开采区', 'text'],
          plan_zone_hit: ['规划区块', 'text'],
          conclusion: ['审查结论', 'text']
        }
      },
      {
        key: 'plan-overburden', name: '压覆矿产情况', table: 'biz_record',
        desc: '建设项目压覆重要矿产资源在线查询、压覆评估报告备案及压覆范围矢量上图，避免重复压覆。',
        columns: ['code', 'title', 'region_name', 'applicant', 'status', 'occur_at'],
        filters: ['region', 'status'],
        form: ['title', 'region_name', 'applicant', 'occur_at', 'remark'],
        extras: {
          project_type: ['项目类型', 'text'],
          deposit_name: ['压覆矿产地', 'text'],
          overlap_area: ['压覆面积(km²)', 'number'],
          reserve_t: ['压覆资源量(万吨)', 'number'],
          assess_report: ['评估报告', 'text'],
          filed_no: ['备案文号', 'text']
        }
      },
      {
        key: 'plan-protect', name: '矿产资源保护', table: 'biz_record',
        desc: '战略性矿产、保护性开采特定矿种及古生物化石产地分区管控与保护边界监测。',
        columns: ['code', 'title', 'region_name', 'mineral', 'level', 'status'],
        filters: ['region', 'mineral', 'level'],
        form: ['title', 'region_name', 'mineral', 'level', 'status', 'remark'],
        extras: {
          protect_type: ['保护类型', 'text'],
          boundary: ['保护边界(km)', 'number'],
          monitor: ['边界监测', 'text'],
          restriction: ['管控要求', 'text']
        }
      },
      {
        key: 'plan-indicator', name: '规划指标管理', table: 'plan_indicator',
        desc: '拆解下达省市县三级约束性与预期性指标，实时对比实际执行值与规划目标值，接近或突破上限自动触发红黄牌预警。',
        columns: ['region_name', 'level', 'name', 'category', 'unit', 'target', 'actual', 'year', 'warn'],
        filters: ['region', 'level', 'year'],
        form: ['region_name', 'level', 'name', 'category', 'unit', 'target', 'actual', 'year'],
        special: 'indicator'
      },
      {
        key: 'plan-stats', name: '规划成果统计', table: 'plan_zone',
        desc: '按行政区划、规划分区类型、矿种类别自动汇总统计规划区块数量、面积、资源储量规模及规划实施率，一键生成标准化统计报表与图表导出。',
        columns: ['region_name', 'zone_type', 'mineral', 'cnt', 'area', 'reserve_t'],
        filters: ['region', 'zoneType', 'mineral'],
        form: [],
        special: 'planStats',
        readonly: true
      }
    ]
  },
  {
    key: 'rights',
    name: '矿业权管理',
    route: '/rights',
    intro: '探矿权与采矿权全生命周期管理：一张图、净矿出让、废弃处置、年报快报、范围论证、实地核查、交易准备、方案审查、抵押备案、保护矿种与统计分析。',
    features: [
      {
        key: 'rights-map', name: '矿业权一张图', table: 'mining_right',
        desc: '整合探矿权、采矿权有效登记发证空间范围与全生命周期属性，支持叠加遥感影像、三线及规划图层查询，支持历史发证范围时空回溯对比。',
        columns: ['license_no', 'right_type', 'mine_name', 'holder', 'mineral', 'area', 'region_name', 'valid_from', 'valid_to', 'status'],
        filters: ['region', 'mineral', 'rightType', 'status'],
        form: ['license_no', 'right_type', 'mine_name', 'holder', 'mineral', 'area', 'region_name', 'valid_from', 'valid_to', 'status'],
        special: 'rightsMap'
      },
      {
        key: 'rights-clean-sale', name: '净矿出让', table: 'biz_record',
        desc: '统筹出让前期土地、林地、环保、安全等部门联合踏勘与政策处理进度节点，确保具备净矿出让条件。',
        columns: ['code', 'title', 'region_name', 'mineral', 'stage', 'status', 'occur_at'],
        filters: ['region', 'mineral', 'status'],
        form: ['code', 'title', 'region_name', 'mineral', 'occur_at', 'remark'],
        workflow: {
          field: 'stage',
          steps: [
            { key: '拟出让区块', role: 'city' },
            { key: '联合踏勘', role: 'city' },
            { key: '政策处理', role: 'county' },
            { key: '净矿条件具备', role: 'province', terminal: true }
          ],
          rejectTo: '拟出让区块'
        },
        extras: {
          land: ['土地处理', 'text'], forest: ['林地处理', 'text'],
          env: ['环保意见', 'text'], safe: ['安全意见', 'text'],
          nodes_done: ['已完节点', 'number'], nodes_total: ['节点总数', 'number']
        }
      },
      {
        key: 'rights-abandon', name: '废弃处置', table: 'biz_record',
        desc: '政策性关闭/资源枯竭/过期未延续矿山的闭坑治理、生态修复验收与采矿许可证注销闭环登记。',
        columns: ['code', 'title', 'region_name', 'mineral', 'stage', 'status', 'occur_at'],
        filters: ['region', 'status'],
        form: ['title', 'region_name', 'mineral', 'occur_at', 'remark'],
        workflow: {
          field: 'stage',
          steps: [
            { key: '闭坑申请', role: 'county' },
            { key: '闭坑治理', role: 'county' },
            { key: '生态修复验收', role: 'city' },
            { key: '许可证注销', role: 'province', terminal: true }
          ],
          rejectTo: '闭坑申请'
        },
        extras: {
          close_reason: ['关闭原因', 'text'], govern_area: ['治理面积(亩)', 'number'],
          restore_check: ['修复验收', 'text'], cancel_no: ['注销文号', 'text']
        }
      },
      {
        key: 'rights-annual', name: '年报快报', table: 'biz_record',
        desc: '在线催报、企业填报、主管部门审核矿山开发利用统计年报及季度快报（产量、产值、销售、储量消耗、从业人员等），自动校验数值逻辑异常。',
        columns: ['code', 'title', 'region_name', 'mineral', 'stage', 'status', 'occur_at'],
        filters: ['region', 'status', 'year'],
        form: ['title', 'region_name', 'mineral', 'occur_at', 'remark'],
        workflow: {
          field: 'stage',
          steps: [
            { key: '待填报', role: 'enterprise' },
            { key: '已填报', role: 'enterprise' },
            { key: '部门审核', role: 'county' },
            { key: '已通过', role: 'city', terminal: true }
          ],
          rejectTo: '已填报'
        },
        special: 'annualCheck',
        extras: {
          output: ['产量(万吨)', 'number'], value: ['产值(万元)', 'number'],
          sale: ['销售量(万吨)', 'number'], consume: ['储量消耗(万吨)', 'number'],
          staff: ['从业人员(人)', 'number'], recovery: ['开采回采率(%)', 'number'],
          check_result: ['逻辑校验', 'text']
        }
      },
      {
        key: 'rights-scope', name: '范围论证', table: 'biz_record',
        desc: '拟出让或新立/变更矿业权区块自动与生态保护红线、永久基本农田、自然保护地、已设矿业权及矿产资源规划空间叠置分析，输出是否重叠、重叠面积及避让建议。',
        columns: ['code', 'title', 'region_name', 'mineral', 'status', 'occur_at'],
        filters: ['region', 'mineral', 'status'],
        form: ['title', 'region_name', 'mineral', 'occur_at', 'remark'],
        special: 'scopeArgument',
        extras: {
          area_km2: ['区块面积(km²)', 'number'], redline: ['生态保护红线', 'text'],
          farmland: ['永久基本农田', 'text'], nature: ['自然保护地', 'text'],
          other_rights: ['已设矿业权', 'text'], plan_zone: ['规划区块', 'text'],
          conclusion: ['论证结论', 'text'], report_no: ['论证报告编号', 'text']
        }
      },
      {
        key: 'rights-field-check', name: '实地核查', table: 'biz_record',
        desc: '外业核查任务线上派发，联动移动端采集现场坐标、界桩照片、周边敏感目标（居民点、道路、高压线等），生成图文核查表单并回传审核。',
        columns: ['code', 'title', 'region_name', 'dept', 'stage', 'status', 'due_at'],
        filters: ['region', 'status'],
        form: ['title', 'region_name', 'dept', 'due_at', 'remark'],
        workflow: {
          field: 'stage',
          steps: [
            { key: '任务派发', role: 'county' },
            { key: '外业核查', role: 'county' },
            { key: '成果回传', role: 'county' },
            { key: '审核完成', role: 'city', terminal: true }
          ],
          rejectTo: '外业核查'
        },
        mobile: true,
        extras: {
          coord: ['现场坐标', 'text'], photos: ['界桩照片(张)', 'number'],
          residents: ['周边居民点', 'text'], roads: ['周边道路', 'text'], power: ['高压线', 'text']
        }
      },
      {
        key: 'rights-trade', name: '交易准备', table: 'biz_record',
        desc: '自动归集通过范围论证与实地核查的拟出让区块资料（出让公告、坐标拐点、资源储量、起始价评估结果），一键推送至矿业权网上交易系统挂牌出让并同步回传成交结果。',
        columns: ['code', 'title', 'region_name', 'mineral', 'amount', 'stage', 'status'],
        filters: ['region', 'mineral', 'status'],
        form: ['title', 'region_name', 'mineral', 'amount', 'remark'],
        workflow: {
          field: 'stage',
          steps: [
            { key: '资料归集', role: 'city' },
            { key: '推送交易系统', role: 'province' },
            { key: '已挂牌', role: 'province' },
            { key: '成交回传', role: 'province', terminal: true }
          ],
          rejectTo: '资料归集'
        },
        extras: {
          announce: ['出让公告', 'text'], corners: ['坐标拐点', 'text'],
          reserve_t: ['资源储量(万吨)', 'number'], start_price: ['起始价(万元)', 'number'],
          deal_price: ['成交价(万元)', 'number'], deal_buyer: ['竞得人', 'text']
        }
      },
      {
        key: 'rights-explore-review', name: '勘查实施方案审查', table: 'biz_record',
        desc: '线上申报、专家组在线阅卷与意见汇总、修改稿复核、审查意见书电子签章归档，跟踪探矿工程实物工作量进度。',
        columns: ['code', 'title', 'region_name', 'mineral', 'stage', 'status', 'occur_at'],
        filters: ['region', 'mineral', 'status'],
        form: ['title', 'region_name', 'mineral', 'occur_at', 'remark'],
        workflow: {
          field: 'stage',
          steps: [
            { key: '申报', role: 'enterprise' },
            { key: '专家阅卷', role: 'province' },
            { key: '意见汇总', role: 'province' },
            { key: '修改稿复核', role: 'province' },
            { key: '签章归档', role: 'province', terminal: true }
          ],
          rejectTo: '申报'
        },
        extras: {
          holes: ['设计钻孔(个)', 'number'], meters: ['实物工作量(m)', 'number'],
          done_meters: ['已完成(m)', 'number'], opinion: ['专家意见', 'text'], seal: ['电子签章', 'text']
        }
      },
      {
        key: 'rights-develop-review', name: '开发利用方案审查', table: 'biz_record',
        desc: '采矿权开发利用方案（含绿色矿山建设专章、安全与生态修复要求）线上报审、技术指标自动校验（开采方式、设计生产规模、服务年限、三率指标）及审查结果入库。',
        columns: ['code', 'title', 'region_name', 'mineral', 'stage', 'status', 'occur_at'],
        filters: ['region', 'mineral', 'status'],
        form: ['title', 'region_name', 'mineral', 'occur_at', 'remark'],
        workflow: {
          field: 'stage',
          steps: [
            { key: '报审', role: 'enterprise' },
            { key: '技术校验', role: 'city' },
            { key: '专家审查', role: 'province' },
            { key: '结果入库', role: 'province', terminal: true }
          ],
          rejectTo: '报审'
        },
        special: 'developCheck',
        extras: {
          method: ['开采方式', 'text'], scale: ['设计生产规模(万吨/年)', 'number'],
          years: ['服务年限(年)', 'number'], recovery: ['开采回采率(%)', 'number'],
          dilution: ['矿石贫化率(%)', 'number'], utilization: ['选矿回收率(%)', 'number'],
          green_chapter: ['绿色矿山专章', 'text'], check_result: ['校验结果', 'text']
        }
      },
      {
        key: 'rights-mortgage', name: '抵押备案', table: 'biz_record',
        desc: '采矿权/探矿权抵押备案登记、变更与解除申请，核验抵押合同、评估报告及矿业权状态（无查封/无异常），更新权利限制台账并生成备案回执。',
        columns: ['code', 'title', 'region_name', 'applicant', 'amount', 'stage', 'status'],
        filters: ['region', 'status'],
        form: ['title', 'region_name', 'applicant', 'amount', 'remark'],
        workflow: {
          field: 'stage',
          steps: [
            { key: '提交申请', role: 'enterprise' },
            { key: '材料核验', role: 'county' },
            { key: '备案登记', role: 'city' },
            { key: '回执生成', role: 'city', terminal: true }
          ],
          rejectTo: '提交申请'
        },
        extras: {
          mortgage_type: ['抵押类型', 'text'], contract: ['抵押合同', 'text'],
          appraisal: ['评估报告', 'text'], right_state: ['矿业权状态', 'text'], receipt_no: ['回执编号', 'text']
        }
      },
      {
        key: 'rights-protect-mineral', name: '保护矿种', table: 'biz_record',
        desc: '优势矿产与保护性开采特定矿种专项台账，年度开采总量控制指标分解、配额发放与实际产量动态核销，超指标自动预警。',
        columns: ['code', 'title', 'region_name', 'mineral', 'qty', 'status'],
        filters: ['region', 'mineral', 'status'],
        form: ['title', 'region_name', 'mineral', 'qty', 'status', 'remark'],
        special: 'quota',
        extras: {
          year: ['年度', 'number'], quota: ['控制指标(万吨)', 'number'],
          issued: ['已发放配额(万吨)', 'number'], actual: ['实际产量(万吨)', 'number'],
          balance: ['剩余额度(万吨)', 'number'], warn: ['预警', 'text']
        }
      },
      {
        key: 'rights-stats', name: '统计分析', table: 'mining_right',
        desc: '围绕矿业权新立、延续、变更、注销、出让成交数量与金额、有效矿业权结构（按矿种、规模、经济类型、发证机关）多维交叉统计与同比环比趋势分析。',
        columns: ['mine_name', 'right_type', 'mineral', 'scale', 'gdp_type', 'region_name', 'status', 'issue_date'],
        filters: ['region', 'mineral', 'rightType'],
        form: [],
        special: 'rightsStats',
        readonly: true
      }
    ]
  },
  {
    key: 'green',
    name: '绿色矿山管理',
    route: '/green',
    intro: '申报入库全流程线上办理、六大维度自动评分、国家级/省级/市级动态名录与出库闭环。',
    features: [
      {
        key: 'green-apply', name: '申报入库', table: 'green_apply',
        desc: '企业自评填报→县级初审→市级核查→省级抽查与公示入库全流程线上办理；按矿区环境、资源开发方式、资源综合利用、节能减排、科技创新与智能矿山、企业管理与形象六大维度自动核算得分并标注短板项。',
        columns: ['mine_name', 'region_name', 'apply_level', 'year', 'stage', 'total_score', 'submit_at'],
        filters: ['region', 'status', 'year'],
        form: ['mine_name', 'region_name', 'apply_level', 'year', 'submit_at'],
        workflow: {
          field: 'stage',
          steps: [
            { key: '企业自评', role: 'enterprise' },
            { key: '县级初审', role: 'county' },
            { key: '市级核查', role: 'city' },
            { key: '省级公示', role: 'province' },
            { key: '已入库', role: 'province', terminal: true }
          ],
          rejectTo: '企业自评'
        },
        special: 'greenScore',
        score: true
      },
      {
        key: 'green-dynamic', name: '动态提升', table: 'mine',
        desc: '分级建立国家级/省级/市级绿色矿山及数字矿山、智能矿山动态名录库，关联日常巡查记录、年度复核抽查、问题整改督办及绿色矿山向智能矿山升级改造进度。',
        columns: ['name', 'region_name', 'green_level', 'digital_level', 'smart_level', 'green_since', 'patrol_count', 'rectify'],
        filters: ['region', 'greenLevel'],
        form: ['green_level', 'digital_level', 'smart_level'],
        special: 'greenDynamic'
      },
      {
        key: 'green-out', name: '出库管理', table: 'green_out',
        desc: '自动出库（触发严重违法违规、较大以上生产安全或突发环境事件、采矿许可证过期注销、整改逾期未达标等规则时自动触发出库预警流程）与手动出库（依规核查后移出名录）。',
        columns: ['mine_name', 'region_name', 'out_type', 'trigger_rule', 'stage', 'status', 'occurred_at'],
        filters: ['region', 'status'],
        form: ['mine_name', 'region_name', 'out_type', 'reason', 'occurred_at'],
        workflow: {
          field: 'status',
          steps: [
            { key: '出库预警', role: 'city' },
            { key: '核查中', role: 'city' },
            { key: '已出库', role: 'province', terminal: true }
          ],
          rejectTo: '出库预警'
        },
        extras: { trigger_rule: ['触发规则', 'text'], reason: ['出库原因', 'text'] }
      }
    ]
  },
  {
    key: 'supervise',
    name: '矿产资源智慧监管',
    route: '/supervise',
    intro: '智能巡查、日常巡查、动态监测、协同监管、信用监管、问题处置与工程管理的闭环监管体系。',
    features: [
      {
        key: 'supervise-smart', name: '智能巡查', table: 'alert',
        desc: '基于卫星遥感变化监测图斑、矿区越界开采电子围栏、视频 AI 算法识别（未佩戴安全帽、违规作业、夜间盗采等）自动生成疑似违法线索并智能派发核查工单。',
        columns: ['alert_no', 'kind', 'level', 'mine_name', 'region_name', 'content', 'status', 'occurred_at'],
        filters: ['region', 'kind', 'status'],
        form: ['kind', 'level', 'mine_name', 'region_name', 'content', 'occurred_at'],
        special: 'smartPatrol'
      },
      {
        key: 'supervise-patrol', name: '日常巡查', table: 'patrol_log',
        desc: '网格化巡查计划，移动端定位签到、拍照录像填报巡查日志，全程留痕。',
        columns: ['plan_name', 'grid', 'mine_name', 'inspector', 'sign_at', 'photos', 'result', 'finding'],
        filters: ['region', 'result'],
        form: ['plan_name', 'grid', 'mine_name', 'inspector', 'sign_at', 'photos', 'finding', 'result'],
        mobile: true
      },
      {
        key: 'supervise-monitor', name: '动态监测', table: 'device',
        desc: '实时接入矿山视频监控、钻机 GPS 定位、粉尘/噪声在线监测、边坡位移监测、地磅产量数据，阈值自动对比与分级预警；拓展地热与矿泉水水位/水质/水量/水温四项指标监测与数字化矿山三维叠加监管。',
        columns: ['code', 'name', 'device_type', 'category', 'mine_name', 'value', 'unit', 'online', 'status'],
        filters: ['region', 'category', 'status'],
        form: ['code', 'name', 'device_type', 'category', 'mine_name', 'threshold', 'unit'],
        special: 'monitor'
      },
      {
        key: 'supervise-coop', name: '协同监管', table: 'biz_record',
        desc: '打通自然资源、应急管理、生态环境、水利、公安等部门数据共享与联合执法通道，跨部门线索移交、联合检查与处置结果反馈。',
        columns: ['code', 'title', 'dept', 'region_name', 'stage', 'status', 'occur_at'],
        filters: ['region', 'dept', 'status'],
        form: ['title', 'dept', 'region_name', 'occur_at', 'remark'],
        workflow: {
          field: 'stage',
          steps: [
            { key: '线索移交', role: 'county' },
            { key: '联合检查', role: 'city' },
            { key: '处置反馈', role: 'city' },
            { key: '归档', role: 'province', terminal: true }
          ],
          rejectTo: '线索移交'
        },
        extras: {
          from_dept: ['移交部门', 'text'], to_dept: ['接收部门', 'text'],
          co_depts: ['联合部门', 'text'], result: ['处置结果', 'text']
        }
      },
      {
        key: 'supervise-credit', name: '信用监管', table: 'credit_record',
        desc: '归集行政处罚、异常名录、绿色矿山评价、年报公示情况，构建矿企信用评分模型与红黑名单分级分类监管。',
        columns: ['mine_name', 'region_name', 'score', 'level', 'punish_count', 'abnormal', 'list_type', 'year'],
        filters: ['region', 'level', 'listType'],
        form: ['mine_name', 'region_name', 'score', 'punish_count', 'abnormal', 'year'],
        special: 'credit'
      },
      {
        key: 'supervise-order', name: '问题处置', table: 'work_order',
        desc: '感知预警/巡查发现→任务分派→现场核实→整改落实→复核销号全流程闭环台账，超时未处置自动亮灯督办。',
        columns: ['order_no', 'source', 'category', 'mine_name', 'region_name', 'level', 'status', 'due_at', 'overdue'],
        filters: ['region', 'status', 'level'],
        form: ['title', 'source', 'category', 'mine_name', 'region_name', 'level', 'due_at'],
        workflow: {
          field: 'status',
          steps: [
            { key: '待分派', role: 'county' },
            { key: '现场核实', role: 'county' },
            { key: '整改落实', role: 'city' },
            { key: '复核销号', role: 'city', terminal: true }
          ],
          rejectTo: '整改落实'
        },
        special: 'order'
      },
      {
        key: 'supervise-project', name: '工程管理', table: 'gov_project',
        desc: '矿山生态修复工程、地质灾害治理工程、绿色矿山重点建设项目的立项、施工进度、资金拨付及竣工验收全过程节点管控。',
        columns: ['code', 'name', 'category', 'region_name', 'owner', 'budget', 'paid', 'progress', 'status'],
        filters: ['region', 'category', 'status'],
        form: ['code', 'name', 'category', 'region_name', 'owner', 'budget', 'start_at', 'end_at'],
        special: 'project'
      }
    ]
  },
  {
    key: 'geology',
    name: '数智地勘管理',
    route: '/geology',
    intro: '攻深找盲扩能、农业地质服务、地质文化传播、地勘行业管理与地质环境智慧监测。',
    features: [
      {
        key: 'geology-explore', name: '攻深找盲扩能', table: 'geo_project',
        desc: '重点成矿带与老矿山深部/外围找矿项目库，可视化展示钻孔数据、物化探异常区、三维成矿预测模型及新增资源储量成果，支持找矿靶区优选与项目全周期进度跟踪。',
        columns: ['code', 'name', 'category', 'region_name', 'unit', 'budget', 'progress', 'reserve_add', 'status'],
        filters: ['region', 'category', 'status'],
        form: ['code', 'name', 'category', 'region_name', 'unit', 'budget', 'start_at', 'end_at', 'target'],
        special: 'explore',
        extras: {
          target: ['找矿靶区', 'text'], reserve_add: ['新增资源量(万吨)', 'number'],
          drill_holes: ['钻孔数(个)', 'number'], drill_meters: ['钻探工作量(m)', 'number'],
          anomaly: ['物化探异常', 'text'], model3d: ['三维成矿预测模型', 'text']
        }
      },
      {
        key: 'geology-agri', name: '农业地质服务', table: 'agri_plot',
        desc: '整合富硒土地、特色农产品产地土地质量地球化学调查成果，建设农业地质一张图，提供富硒地块空间查询、土壤重金属污染风险评估、特色农业园区规划选址辅助及农产品产地地质溯源。',
        columns: ['code', 'name', 'region_name', 'area', 'selenium', 'ph', 'cadmium', 'level', 'crop', 'risk'],
        filters: ['region', 'level', 'risk'],
        form: ['code', 'name', 'region_name', 'area', 'selenium', 'ph', 'cadmium', 'crop'],
        special: 'agri'
      },
      {
        key: 'geology-culture', name: '地质文化传播', table: 'geo_culture',
        desc: '省级地质文化村（镇）、地质遗迹保护区、地质公园数字化展示平台，展示核心地质遗迹点分布、科普研学路线、地质文化村申报创建进度及文化传播活动管理。',
        columns: ['code', 'name', 'type', 'region_name', 'level', 'status', 'progress', 'points'],
        filters: ['region', 'type', 'status'],
        form: ['code', 'name', 'type', 'region_name', 'level', 'status', 'progress', 'route', 'intro'],
        special: 'culture',
        extras: { route: ['研学路线', 'text'], intro: ['简介', 'text'] }
      },
      {
        key: 'geology-industry', name: '地勘行业管理', table: 'org_unit',
        desc: '归集地勘单位资质、技术人员、装备能力及在建地勘项目备案信息，开展项目质量监督抽查、安全生产检查与行业信用评价，打通地勘单位与行政管理部门数据报送通道。',
        columns: ['code', 'name', 'unit_type', 'region_name', 'qualification', 'staff', 'senior', 'equipment', 'credit_score', 'status'],
        filters: ['region', 'unitType', 'status'],
        form: ['code', 'name', 'unit_type', 'region_name', 'qualification', 'staff', 'senior', 'equipment', 'credit_score'],
        special: 'industry'
      },
      {
        key: 'geology-env', name: '地质环境智慧监测', table: 'hazard_point',
        desc: '接入地质灾害隐患点（滑坡、崩塌、泥石流、地面沉降）及矿山地质环境监测设备（GNSS位移、雨量计、地下水位计、倾角传感器），实现风险一张图态势感知、临界阈值自动预警与应急避险联动响应。',
        columns: ['code', 'name', 'type', 'region_name', 'level', 'threat_people', 'threat_asset', 'device_online', 'status'],
        filters: ['region', 'type', 'level'],
        form: ['code', 'name', 'type', 'region_name', 'level', 'threat_people', 'threat_asset'],
        special: 'hazard'
      }
    ]
  }
];

/** 顶部一级场景导航（大屏入口） */
export const SCENES = [
  { key: 'dashboard', name: '首页驾驶舱', route: '/dashboard' },
  { key: 'deposit', name: '矿产地', route: '/deposit' },
  { key: 'plan', name: '保护与规划', route: '/plan' },
  { key: 'rights', name: '矿业权', route: '/rights' },
  { key: 'green', name: '绿色矿山', route: '/green' },
  { key: 'supervise', name: '智慧监管', route: '/supervise' },
  { key: 'geology', name: '数智地勘', route: '/geology' }
];

export function findFeature(moduleKey, featureKey) {
  const mod = MODULES.find((m) => m.key === moduleKey);
  if (!mod) return null;
  const feature = mod.features.find((f) => f.key === featureKey);
  if (!feature) return null;
  return { module: mod, feature };
}

export const ALL_FEATURES = MODULES.flatMap((m) =>
  m.features.map((f) => ({ ...f, moduleKey: m.key, moduleName: m.name }))
);
