import { computed } from 'vue'
import { useDisplay } from 'vuetify'

/**
 * 響應式設計 Composable
 * 提供一致的斷點處理和響應式工具
 */
export function useResponsiveDesign() {
  const { xs, sm, md, lg, xl, mobile } = useDisplay()

  // 響應式網格列數
  const responsiveColumns = computed(() => ({
    // 卡片/項目網格
    cards: {
      cols: xs.value ? 12 : sm.value ? 6 : md.value ? 4 : lg.value ? 3 : 2
    },
    // 表單佈局
    form: {
      cols: xs.value ? 12 : sm.value ? 12 : md.value ? 8 : lg.value ? 6 : 6
    },
    // 儀表板小部件
    dashboard: {
      cols: xs.value ? 12 : sm.value ? 12 : md.value ? 6 : lg.value ? 4 : 3
    },
    // 運動組數佈局
    exerciseSet: {
      reps: xs.value ? 4 : sm.value ? 3 : 4,
      weight: xs.value ? 4 : sm.value ? 3 : 4,
      action: 'auto'
    }
  }))

  // 響應式尺寸
  const responsiveSizes = computed(() => ({
    button: xs.value ? 'small' : 'default',
    chip: xs.value ? 'small' : 'default',
    icon: xs.value ? 'default' : 'large',
    avatar: xs.value ? 32 : 40,
    card: {
      elevation: xs.value ? 2 : 4,
      rounded: xs.value ? 'lg' : 'xl'
    }
  }))

  // 響應式間距
  const responsiveSpacing = computed(() => ({
    padding: xs.value ? 2 : sm.value ? 3 : 4,
    margin: xs.value ? 2 : sm.value ? 3 : 4,
    gap: xs.value ? 1 : 2
  }))

  // 圖表尺寸
  const chartDimensions = computed(() => ({
    height: xs.value ? 250 : sm.value ? 300 : md.value ? 350 : 400,
    width: '100%'
  }))

  // 模態框尺寸
  const modalSizes = computed(() => ({
    maxWidth: xs.value ? '95vw' : sm.value ? '80vw' : md.value ? '60vw' : '50vw',
    fullscreen: xs.value
  }))

  // 導航抽屜行為
  const drawerBehavior = computed(() => ({
    rail: false, // 暫時禁用 rail 模式，確保所有內容都能正常顯示
    temporary: mobile.value || sm.value, // 手機和小平板使用臨時模式
    permanent: md.value || lg.value || xl.value // 中等以上螢幕使用永久模式
  }))

  // 字體比例
  const typographyScale = computed(() => ({
    h1: xs.value ? 'text-h4' : sm.value ? 'text-h3' : 'text-h2',
    h2: xs.value ? 'text-h5' : sm.value ? 'text-h4' : 'text-h3',
    h3: xs.value ? 'text-h6' : sm.value ? 'text-h5' : 'text-h4',
    body: xs.value ? 'text-body-2' : 'text-body-1',
    caption: 'text-caption'
  }))

  // 密度設置
  const density = computed(() => xs.value ? 'compact' : 'default')

  return {
    // 斷點狀態
    xs,
    sm,
    md,
    lg,
    xl,
    mobile,
    
    // 響應式工具
    responsiveColumns,
    responsiveSizes,
    responsiveSpacing,
    chartDimensions,
    modalSizes,
    drawerBehavior,
    typographyScale,
    density,
    
    // 輔助函數
    isMobile: computed(() => mobile.value),
    isTablet: computed(() => sm.value || md.value),
    isDesktop: computed(() => lg.value || xl.value),
    
    // 條件類名
    mobileClass: computed(() => mobile.value ? 'mobile-layout' : 'desktop-layout'),
    responsiveClass: computed(() => ({
      'xs-screen': xs.value,
      'sm-screen': sm.value,
      'md-screen': md.value,
      'lg-screen': lg.value,
      'xl-screen': xl.value,
      'mobile-device': mobile.value
    }))
  }
}