// src/plugins/vuetify.js

// Styles
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

// Composables
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  defaults: {
    VBtn: {
      color: 'primary',
      rounded: 'pill',
      elevation: 2,
      variant: 'flat',
      density: 'comfortable'
    },
    VCard: {
      elevation: 2,
      rounded: 'lg'
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary'
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary'
    },
    VTabs: {
      color: 'primary',
      density: 'comfortable'
    },
    VChip: {
      color: 'secondary',
      variant: 'tonal'
    }
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#33A3FF', // Cool Blue
          secondary: '#FF9E6E', // Warm Orange-Peach
          background: '#F6F9FC', // Soft Light
          surface: '#FFFFFF', // White
          'on-background': '#1F2937',
          'on-surface': '#1F2937',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#33A3FF', // Cool Blue
          secondary: '#FF9E6E', // Warm Orange-Peach
          background: '#0F151B', // Deep Ink
          surface: '#171E26', // Dark Surface
          'on-background': '#F3F4F6',
          'on-surface': '#F3F4F6',
        },
      },
    },
  },
})
