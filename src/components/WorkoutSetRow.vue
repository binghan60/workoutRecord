<script setup>
import { computed } from 'vue'

const props = defineProps({
  set: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
})

const fatigueInfo = computed(() => {
  const level = props.set.fatigueLevel
  const fatigueMap = {
    輕鬆: { emoji: '😊', color: 'text-green-400' },
    適中: { emoji: '🙂', color: 'text-yellow-400' },
    困難: { emoji: '😥', color: 'text-orange-400' },
    力竭: { emoji: '🥵', color: 'text-red-500' },
  }
  return fatigueMap[level] || { emoji: '❔', color: 'text-gray-400' }
})
</script>

<template>
  <tr class="border-t border-gray-600">
    <td class="p-2 font-bold">#{{ index + 1 }}</td>
    <td class="p-2">{{ set.weight || 'N/A' }}</td>
    <td class="p-2">{{ set.reps || 'N/A' }}</td>
    <td class="p-2">{{ set.actualRestTime !== null ? set.actualRestTime + 's' : 'N/A' }}</td>
    <td :class="['p-2 font-semibold', fatigueInfo.color]">
      <span class="text-xl mr-1">{{ fatigueInfo.emoji }}</span>
      {{ set.fatigueLevel || 'N/A' }}
    </td>
  </tr>
</template>
