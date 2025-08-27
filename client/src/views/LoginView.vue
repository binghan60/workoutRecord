<template>
  <AuthLayout>
    <v-card class="auth-card" elevation="8">
      <v-card-text class="pa-8">
        <!-- 標題區域 -->
        <div class="auth-header mb-8">
          <h1 class="text-h4 font-weight-bold text-center mb-2">歡迎回來</h1>
          <p class="text-body-1 text-medium-emphasis text-center">請登入您的帳號以繼續</p>
        </div>

        <!-- 登入表單 -->
        <Form ref="formRef" @submit="handleLogin" v-slot="{ isSubmitting }">
          <div class="auth-form mb-6">
            <Field name="email" rules="required|email" v-slot="{ field, errors }">
              <v-text-field v-bind="field" label="電子郵件" type="email" variant="outlined" class="mb-2" prepend-inner-icon="mdi-email-outline" :error-messages="errors" persistent-placeholder density="comfortable" />
            </Field>

            <Field name="password" rules="required" v-slot="{ field, errors }">
              <v-text-field v-bind="field" label="密碼" type="password" variant="outlined" class="mb-2" prepend-inner-icon="mdi-lock-outline" :error-messages="errors" density="comfortable" />
            </Field>

            <Field name="rememberMe" v-slot="{ field }">
              <v-checkbox :model-value="field.value" @update:model-value="field.onChange" class="mb-2" label="記住我" density="" />
            </Field>

            <v-btn type="submit" color="primary" block size="large" :loading="isSubmitting" class="mb-6"> 登入 </v-btn>
          </div>
        </Form>

        <!-- 分隔線 -->
        <div class="auth-divider mb-6">
          <span>或使用其他方式登入</span>
        </div>

        <!-- 社群登入按鈕 -->
        <div class="auth-social mb-6">
          <div id="googleSignInBtn" class="google-signin-container"></div>
        </div>

        <!-- 其他操作按鈕 -->
        <div class="auth-actions">
          <v-btn variant="outlined" color="secondary" block size="large" @click="handleGuestLogin" class="mb-4">
            <v-icon start>mdi-account-question</v-icon>
            以訪客身份繼續
          </v-btn>

          <div class="text-center">
            <span class="text-body-2 text-medium-emphasis">還沒有帳號？</span>
            <router-link to="/register" class="text-primary font-weight-medium text-decoration-none ml-1"> 立即註冊 </router-link>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </AuthLayout>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import AuthLayout from './AuthLayout.vue'
import { Form, Field } from 'vee-validate'

const authStore = useAuthStore()
const uiStore = useUIStore()
const formRef = ref(null)

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.id) return resolve()
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity script'))
    document.head.appendChild(script)
  })
}

onMounted(async () => {
  const rememberedEmail = localStorage.getItem('rememberedEmail')
  if (rememberedEmail) {
    await nextTick()
    if (formRef.value) {
      formRef.value.resetForm({
        values: {
          email: rememberedEmail,
          password: '',
          rememberMe: true,
        },
      })
    }
  }

  // Init Google button
  try {
    await loadGoogleScript()
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID not set. Google Sign-In button will not render.')
      return
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        try {
          const idToken = response.credential
          if (!idToken) return
          await authStore.loginWithGoogle(idToken)
        } catch (err) {
          console.error('Google login failed:', err)
        }
      },
      auto_select: false,
      context: 'signin',
      ux_mode: 'popup',
    })
    window.google.accounts.id.renderButton(document.getElementById('googleSignInBtn'), {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      width: '100%',
      text: 'signin_with',
      logo_alignment: 'left',
    })
  } catch (e) {
    console.warn('Google Identity init failed:', e)
  }
})

const handleLogin = (values) => {
  authStore.login(values)
}

const handleGuestLogin = () => {
  authStore.loginAsGuest()
}
</script>

<style scoped>
.auth-card {
  max-width: 440px;
  margin: 0 auto;
  border-radius: 16px;
}

.auth-header {
  text-align: center;
}

.auth-form {
  width: 100%;
}

.auth-divider {
  position: relative;
  text-align: center;
  margin: 24px 0;
}

.auth-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: rgba(var(--v-border-color), var(--v-border-opacity));
}

.auth-divider span {
  background-color: rgb(var(--v-theme-surface));
  padding: 0 16px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.875rem;
}

.auth-social {
  width: 100%;
}

.google-signin-container {
  width: 100%;
}

.auth-actions {
  width: 100%;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .auth-card {
    margin: 16px;
    max-width: none;
  }

  .auth-card .pa-8 {
    padding: 24px !important;
  }

  .auth-header.mb-8 {
    margin-bottom: 32px !important;
  }
}

/* Dark theme adjustments */
.v-theme--dark .auth-divider span {
  background-color: rgb(var(--v-theme-surface));
}
</style>
