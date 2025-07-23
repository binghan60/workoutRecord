<template>
  <v-dialog v-model="modalStore.isOpen" max-width="500px" persistent>
    <v-card>
      <v-card-title class="text-h5">{{ modalStore.title }}</v-card-title>
      <v-card-text>{{ modalStore.message }}</v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey-darken-1" text @click="modalStore.hideConfirmation">取消</v-btn>
        <v-btn color="red-darken-1" text @click="modalStore.confirm">確認</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useModalStore } from '@/stores/modal'

const modalStore = useModalStore()
</script>
