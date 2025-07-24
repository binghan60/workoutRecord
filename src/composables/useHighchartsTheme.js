import { computed } from 'vue'
import { useTheme } from 'vuetify'

export function useHighchartsTheme() {
  const theme = useTheme()

  const highchartsTheme = computed(() => {
    const isDark = theme.global.name.value === 'dark'
    const colors = theme.current.value.colors

    return {
      colors: [
        colors.primary,
        colors.secondary,
        '#81C784', // soft green
        '#64B5F6', // soft blue
        '#BA68C8', // soft purple
        '#E57373', // soft red
      ],
      chart: {
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'sans-serif',
        },
      },
      title: {
        style: {
          color: colors['on-surface'],
        },
      },
      subtitle: {
        style: {
          color: colors['on-surface'],
        },
      },
      xAxis: {
        gridLineColor: isDark ? '#333' : '#E0E0E0',
        labels: {
          style: {
            color: colors['on-surface'],
          },
        },
        lineColor: colors.surface,
        tickColor: colors.surface,
        title: {
          style: {
            color: colors['on-surface'],
          },
        },
      },
      yAxis: {
        gridLineColor: isDark ? '#333' : '#E0E0E0',
        labels: {
          style: {
            color: colors['on-surface'],
          },
        },
        lineColor: colors.surface,
        tickColor: colors.surface,
        title: {
          style: {
            color: colors['on-surface'],
          },
        },
      },
      tooltip: {
        backgroundColor: colors.surface,
        style: {
          color: colors['on-surface'],
        },
        borderColor: colors.primary,
      },
      legend: {
        itemStyle: {
          color: colors['on-surface'],
        },
        itemHoverStyle: {
          color: colors.primary,
        },
        itemHiddenStyle: {
          color: isDark ? '#999' : '#CCC',
        },
      },
      credits: {
        enabled: false,
      },
      labels: {
        style: {
          color: colors['on-surface'],
        },
      },
    }
  })

  return { highchartsTheme }
}
