<template>
  <AuthLayout>
    <v-card class="pa-4 pa-md-8">
      <v-card-title class="text-center text-h4 font-weight-bold mb-6">註冊</v-card-title>
      <v-card-text>
        <Form @submit="handleRegister" v-slot="{ isSubmitting }">
          <Field name="username" rules="required" v-slot="{ field, errors }">
            <v-text-field
              v-bind="field"
              label="使用者名稱"
              variant="outlined"
              class="mb-4"
              prepend-inner-icon="mdi-account-outline"
              :error-messages="errors"
            ></v-text-field>
          </Field>

          <Field name="email" rules="required|email" v-slot="{ field, errors }">
            <v-text-field
              v-bind="field"
              label="電子郵件"
              type="email"
              variant="outlined"
              class="mb-4"
              prepend-inner-icon="mdi-email-outline"
              :error-messages="errors"
            ></v-text-field>
          </Field>

          <Field name="password" rules="required|minLength:6" v-slot="{ field, errors }">
            <v-text-field
              v-bind="field"
              label="密碼"
              type="password"
              variant="outlined"
              class="mb-4"
              prepend-inner-icon="mdi-lock-outline"
              :error-messages="errors"
            ></v-text-field>
          </Field>

          <Field name="confirmPassword" rules="required|confirmed:@password" v-slot="{ field, errors }">
            <v-text-field
              v-bind="field"
              label="確認密碼"
              type="password"
              variant="outlined"
              class="mb-4"
              prepend-inner-icon="mdi-lock-check-outline"
              :error-messages="errors"
            ></v-text-field>
          </Field>

          <v-btn type="submit" color="primary" block size="large" :loading="isSubmitting || uiStore.isLoading">註冊</v-btn>
        </Form>
      </v-card-text>
      <v-card-actions class="justify-center">
        <p class="text-center">
          已經有帳號了？
          <router-link to="/login" class="text-primary font-weight-bold">前往登入</router-link>
        </p>
      </v-card-actions>
    </v-card>
  </AuthLayout>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import AuthLayout from './AuthLayout.vue'
import { Form, Field } from 'vee-validate'

const authStore = useAuthStore()
const uiStore = useUIStore()

const handleRegister = (values) => {
  // VeeValidate handles the validation, so we just submit
  authStore.register({
    username: values.username,
    email: values.email,
    password: values.password,
  })
}
</script>

<style scoped>
a {
  text-decoration: none;
}
</style>
