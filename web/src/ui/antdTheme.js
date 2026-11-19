import { theme } from 'antd';

/**
 * antd 主题：映射 CoinPulse 设计系统（仓库根 DESIGN.md）。
 * 深色近黑底 + 电光蓝主色 + 青柠正向 + 琥珀待处理；深度靠面层与 1px 发丝边。
 * 浅色为同一色彩体系的反相面层（白底 / #f6f6f7 表头 / #e4e4e7 描边），主色不变。
 */

const DARK_TOKENS = {
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
  controlHeight: 32,
  fontFamily:
    "'DM Sans', 'PingFang SC', 'Microsoft YaHei', 'Source Han Sans SC', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
};

const LIGHT_TOKENS = {
  ...DARK_TOKENS,
  colorBgBase: '#ffffff',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorBgLayout: '#f7f7f8',
  colorBorder: '#d4d4d8',
  colorBorderSecondary: '#e4e4e7',
  colorText: '#18181b',
  colorTextSecondary: '#52525b',
  colorTextTertiary: '#71717a',
  colorTextQuaternary: '#a1a1aa',
  colorFillAlter: 'rgba(24, 24, 27, 0.03)',
  colorFillSecondary: 'rgba(37, 99, 235, 0.08)'
};

function componentsFor(mode) {
  const light = mode === 'light';
  return {
    Table: {
      headerBg: light ? '#f4f4f5' : '#1f1f23',
      headerColor: light ? '#3f3f46' : '#d4d4d8',
      rowHoverBg: light ? 'rgba(37, 99, 235, 0.05)' : 'rgba(37, 99, 235, 0.10)',
      rowSelectedBg: light ? 'rgba(37, 99, 235, 0.08)' : 'rgba(37, 99, 235, 0.14)',
      borderColor: light ? '#e4e4e7' : '#27272a',
      cellPaddingBlock: 8,
      cellFontSize: 13
    },
    Segmented: {
      itemColor: light ? '#52525b' : '#a1a1aa',
      itemSelectedColor: light ? '#18181b' : '#fafafa',
      trackBg: light ? '#f4f4f5' : 'rgba(24, 24, 27, 0.9)',
      itemSelectedBg: light ? '#ffffff' : 'rgba(37, 99, 235, 0.18)',
      trackPadding: 2
    },
    Button: { primaryShadow: 'none', defaultShadow: 'none', dangerShadow: 'none', fontWeight: 400 },
    Tabs: {
      itemColor: light ? '#52525b' : '#a1a1aa',
      itemSelectedColor: light ? '#18181b' : '#fafafa',
      itemHoverColor: light ? '#18181b' : '#d4d4d8',
      inkBarColor: '#2563eb',
      horizontalItemGutter: 22,
      horizontalItemPadding: '7px 0'
    },
    Modal: { contentBg: light ? '#ffffff' : '#18181b', headerBg: 'transparent' },
    Drawer: { colorBgElevated: light ? '#ffffff' : '#18181b' },
    Tag: { defaultBg: light ? '#f4f4f5' : '#1f1f23', defaultColor: light ? '#52525b' : '#a1a1aa' },
    Descriptions: { labelBg: light ? '#f7f7f8' : '#1f1f23' },
    Card: { colorBgContainer: light ? '#ffffff' : '#18181b' },
    Pagination: { itemActiveBg: light ? '#ffffff' : '#1f1f23' },
    Steps: { colorText: light ? '#52525b' : '#a1a1aa' },
    Upload: { colorFillAlter: light ? '#f7f7f8' : '#111113' },
    Empty: { colorTextDescription: light ? '#71717a' : '#71717a' }
  };
}

export function antdThemeFor(mode = 'dark') {
  const light = mode === 'light';
  return {
    algorithm: light ? theme.defaultAlgorithm : theme.darkAlgorithm,
    token: light ? LIGHT_TOKENS : DARK_TOKENS,
    components: componentsFor(mode)
  };
}

/** 兼容旧引用：默认深色 */
export const antdTheme = antdThemeFor('dark');
