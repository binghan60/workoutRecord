// src/plugins/vuetify.js

// Styles
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

// Composables
import { createVuetify } from 'vuetify'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#4DB6AC', // Soft Teal
          secondary: '#FFCC80', // Soft Orange/Sand
          background: '#F5F5F5', // Light Grey
          surface: '#FFFFFF', // White
          'on-background': '#212121',
          'on-surface': '#212121',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#4DB6AC', // Soft Teal
          secondary: '#FFCC80', // Soft Orange/Sand
          background: '#121212', // Standard Material Dark
          surface: '#1E1E1E', // Slightly Lighter Dark
          'on-background': '#FFFFFF',
          'on-surface': '#FFFFFF',
        },
      },
    },
  },
})
