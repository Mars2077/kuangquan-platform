import { theme } from 'antd';

/**
 * antd 主题：把设计令牌映射到 antd token，让组件库自带的排版/间距/边框生效，
 * 同时保留深色政务底色的观感。刻意不做发光、不做渐变、不做彩色阴影——
 * 深度靠表面层级 + 1px 发丝边（与 unslop 的约束一致）。
 */
export const antdTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#2ea8ff',
    colorInfo: '#2ea8ff',
    colorSuccess: '#35d39a',
    colorWarning: '#ffcc44',
    colorError: '#ff5f57',
    colorBgBase: '#050f21',
    colorBgContainer: '#0a1e33',
    colorBgElevated: '#0d2740',
    colorBgLayout: '#050f21',
    colorBorder: 'rgba(73, 195, 255, 0.22)',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.07)',
    colorText: '#cfe4ff',
    colorTextSecondary: '#9db3cc',
    colorTextTertiary: '#7fa6cc',
    colorTextQuaternary: '#5d7d99',
    colorFillAlter: 'rgba(46, 168, 255, 0.06)',
    colorFillSecondary: 'rgba(46, 168, 255, 0.12)',
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    fontSize: 13,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
    controlHeight: 30,
    controlHeightSM: 26,
    wireframe: false,
    motionDurationMid: '0.18s'
  },
  components: {
    Layout: {
      headerBg: '#061526',
      bodyBg: '#050f21',
      siderBg: '#061526'
    },
    Card: {
      colorBgContainer: '#0a1e33',
      headerBg: 'transparent',
      headerHeight: 38,
      headerFontSize: 13,
      paddingLG: 12,
      borderRadiusLG: 8
    },
    Table: {
      headerBg: '#0d2740',
      headerColor: '#9db3cc',
      headerSplitColor: 'transparent',
      borderColor: 'rgba(255, 255, 255, 0.07)',
      rowHoverBg: 'rgba(46, 168, 255, 0.08)',
      rowSelectedBg: 'rgba(46, 168, 255, 0.14)',
      rowSelectedHoverBg: 'rgba(46, 168, 255, 0.18)',
      cellPaddingBlock: 8,
      cellPaddingInline: 10,
      cellFontSize: 13
    },
    Tabs: {
      itemColor: '#9db3cc',
      itemSelectedColor: '#e8f4ff',
      itemHoverColor: '#cfe4ff',
      inkBarColor: '#49c3ff',
      horizontalItemGutter: 22,
      horizontalItemPadding: '7px 0'
    },
    Segmented: {
      itemColor: '#9db3cc',
      itemSelectedColor: '#e8f4ff',
      trackBg: 'rgba(6, 21, 38, 0.9)',
      itemSelectedBg: 'rgba(46, 168, 255, 0.18)',
      trackPadding: 2
    },
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      fontWeight: 400
    },
    Input: { activeShadow: '0 0 0 2px rgba(46, 168, 255, 0.16)' },
    Select: { optionSelectedBg: 'rgba(46, 168, 255, 0.16)' },
    Modal: { contentBg: '#0a1e33', headerBg: '#0d2740', titleFontSize: 14, titleColor: '#e8f4ff' },
    Drawer: { colorBgElevated: '#0a1e33' },
    Tag: { defaultBg: 'rgba(46, 168, 255, 0.1)', defaultColor: '#9db3cc' },
    Descriptions: { labelBg: 'rgba(46, 168, 255, 0.06)', titleMarginBottom: 8 },
    Statistic: { contentFontSize: 22, titleFontSize: 12 },
    Pagination: { itemActiveBg: 'rgba(46, 168, 255, 0.18)' },
    Steps: { colorPrimary: '#49c3ff', navArrowColor: '#5d7d99' },
    Progress: { defaultColor: '#49c3ff', remainingColor: 'rgba(255, 255, 255, 0.08)' },
    Upload: { colorFillAlter: 'rgba(46, 168, 255, 0.05)' },
    Empty: { colorTextDescription: '#5d7d99' }
  }
};
