<template>
  <v-container fluid class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <slot></slot>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
// No script needed for this simple layout component
</script>

<style scoped>
.fill-height {
  min-height: 100vh;
}
</style>
