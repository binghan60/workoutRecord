<template>
  <AuthLayout>
    <v-card class="pa-4 pa-md-8">
      <v-card-title class="text-center text-h4 font-weight-bold mb-6">登入</v-card-title>
      <v-card-text>
        <Form ref="formRef" @submit="handleLogin" v-slot="{ isSubmitting, values, resetForm }">
          <Field name="email" rules="required|email" v-slot="{ field, errors }">
            <v-text-field v-bind="field" label="電子郵件" type="email" variant="outlined" class="mb-4" prepend-inner-icon="mdi-email-outline" :error-messages="errors" persistent-placeholder />
          </Field>

          <Field name="password" rules="required" v-slot="{ field, errors }">
            <v-text-field v-bind="field" label="密碼" type="password" variant="outlined" prepend-inner-icon="mdi-lock-outline" :error-messages="errors" />
          </Field>

          <!-- 修正 rememberMe checkbox -->
          <Field name="rememberMe" v-slot="{ field }">
            <v-checkbox :model-value="field.value" @update:model-value="field.onChange" label="記住我" />
          </Field>

          <v-btn type="submit" color="primary" block size="large" :loading="isSubmitting || uiStore.isLoading"> 登入 </v-btn>
        </Form>
      </v-card-text>
      <v-card-actions class="justify-center flex-column">
        <p class="text-center">
          還沒有帳號？
          <router-link to="/register" class="text-primary font-weight-bold"> 立即註冊 </router-link>
        </p>
        <p class="text-center mt-4">
          或者
          <a href="#" @click.prevent="handleGuestLogin" class="text-secondary font-weight-bold"> 以訪客身份繼續 </a>
        </p>
      </v-card-actions>
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
})

const handleLogin = (values) => {
  authStore.login(values)
}

const handleGuestLogin = () => {
  authStore.loginAsGuest()
}
</script>

<style scoped>
a {
  text-decoration: none;
}
</style>
