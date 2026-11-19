import { theme } from 'antd';

/**
 * antd 主题：映射 CoinPulse 设计系统（仓库根 DESIGN.md）。
 * 深色近黑底 + 电光蓝主色 + 青柠正向 + 琥珀待处理；深度靠面层与 1px 发丝边，
 * 光晕只用于主按钮/聚焦/告警，避免整屏发光。
 */
export const antdTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#2563eb',
    colorInfo: '#2563eb',
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorBgBase: '#09090b',
    colorBgContainer: '#18181b',
    colorBgElevated: '#1f1f23',
    colorBgLayout: '#09090b',
    colorBorder: '#3f3f46',
    colorBorderSecondary: '#27272a',
    colorText: '#fafafa',
    colorTextSecondary: '#a1a1aa',
    colorTextTertiary: '#71717a',
    colorTextQuaternary: '#52525b',
    colorFillAlter: 'rgba(37, 99, 235, 0.06)',
    colorFillSecondary: 'rgba(37, 99, 235, 0.12)',
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
    fontSize: 14,
    fontFamily:
      '"DM Sans", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
    controlHeight: 32,
    controlHeightSM: 28,
    wireframe: false,
    motionDurationMid: '0.18s'
  },
  components: {
    Layout: {
      headerBg: '#09090b',
      bodyBg: '#09090b',
      siderBg: '#18181b'
    },
    Card: {
      colorBgContainer: '#18181b',
      headerBg: 'transparent',
      headerHeight: 38,
      headerFontSize: 13,
      paddingLG: 12,
      borderRadiusLG: 8
    },
    Table: {
      headerBg: '#1f1f23',
      headerColor: '#a1a1aa',
      headerSplitColor: 'transparent',
      borderColor: '#27272a',
      rowHoverBg: 'rgba(37, 99, 235, 0.10)',
      rowSelectedBg: 'rgba(37, 99, 235, 0.14)',
      rowSelectedHoverBg: 'rgba(37, 99, 235, 0.18)',
      cellPaddingBlock: 8,
      cellPaddingInline: 10,
      cellFontSize: 13
    },
    Tabs: {
      itemColor: '#a1a1aa',
      itemSelectedColor: '#fafafa',
      itemHoverColor: '#d4d4d8',
      inkBarColor: '#2563eb',
      horizontalItemGutter: 22,
      horizontalItemPadding: '7px 0'
    },
    Segmented: {
      itemColor: '#a1a1aa',
      itemSelectedColor: '#fafafa',
      trackBg: 'rgba(24, 24, 27, 0.9)',
      itemSelectedBg: 'rgba(37, 99, 235, 0.18)',
      trackPadding: 2
    },
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      fontWeight: 400
    },
    Input: { activeShadow: '0 0 0 2px rgba(37, 99, 235, 0.16)' },
    Select: { optionSelectedBg: 'rgba(37, 99, 235, 0.16)' },
    Modal: { contentBg: '#18181b', headerBg: '#1f1f23', titleFontSize: 14, titleColor: '#fafafa' },
    Drawer: { colorBgElevated: '#18181b' },
    Tag: { defaultBg: 'rgba(37, 99, 235, 0.10)', defaultColor: '#a1a1aa' },
    Descriptions: { labelBg: 'rgba(37, 99, 235, 0.06)', titleMarginBottom: 8 },
    Statistic: { contentFontSize: 22, titleFontSize: 12 },
    Pagination: { itemActiveBg: 'rgba(37, 99, 235, 0.18)' },
    Steps: { colorPrimary: '#2563eb', navArrowColor: '#71717a' },
    Progress: { defaultColor: '#2563eb', remainingColor: 'rgba(255, 255, 255, 0.08)' },
    Upload: { colorFillAlter: 'rgba(37, 99, 235, 0.05)' },
    Empty: { colorTextDescription: '#71717a' }
  }
};
