<template>
  <v-card :class="['workout-set-row transition-all duration-300 mb-2', isCompleted ? 'bg-success-darken-2' : 'bg-surface-lighten-3']" :elevation="isCompleted ? 2 : 1" rounded="lg">
    <v-card-text :class="`pa-${responsiveSpacing.padding}`">
      <v-row align="center" no-gutters class="fill-height">
        <!-- Set Number - 響應式尺寸 -->
        <v-col cols="auto" :class="`pr-${responsiveSpacing.gap} pr-sm-3`">
          <v-chip :color="isCompleted ? 'success' : 'primary'" :size="responsiveSizes.chip" label class="font-weight-bold" :aria-label="`第 ${setIndex + 1} 組`">
            {{ setIndex + 1 }}
          </v-chip>
        </v-col>

        <!-- Reps Input - 響應式 -->
        <v-col :cols="responsiveColumns.exerciseSet.reps">
          <Field :name="`exercises[${exIndex}].sets[${setIndex}].reps`" v-slot="{ field, value, errors }">
            <v-text-field v-bind="field" type="number" variant="outlined" :density="density" hide-details="auto" suffix="次" :readonly="isCompleted" :model-value="value" :error-messages="errors" :aria-label="`第 ${setIndex + 1} 組次數`" class="text-center" @focus="$event.target.select()" />
          </Field>
        </v-col>

        <!-- 乘號符號 -->
        <v-col cols="auto" :class="`px-${responsiveSpacing.gap} text-center`">
          <v-icon :size="xs ? 'small' : 'default'" color="primary"> mdi-close </v-icon>
        </v-col>

        <!-- Weight Input - 響應式 -->
        <v-col :cols="responsiveColumns.exerciseSet.weight">
          <Field :name="`exercises[${exIndex}].sets[${setIndex}].weight`" v-slot="{ field, value, errors }">
            <v-text-field v-bind="field" type="number" variant="outlined" :density="density" hide-details="auto" suffix="kg" :readonly="isCompleted" :model-value="value" :error-messages="errors" :aria-label="`第 ${setIndex + 1} 組重量`" class="text-center" step="0.5" @focus="$event.target.select()" />
          </Field>
        </v-col>

        <!-- Action Button - 響應式 -->
        <v-col cols="auto" :class="`pl-${responsiveSpacing.gap} pl-sm-3`">
          <v-btn v-if="!isCompleted" ref="completeButtonRef" @click="handleComplete" :disabled="isButtonDisabled" color="primary" :icon="xs" :size="responsiveSizes.button" :aria-label="`完成第 ${setIndex + 1} 組`" class="complete-btn transition-all hover-scale">
            <v-icon>mdi-check</v-icon>
            <span v-if="!xs" class="ml-1">完成</span>
          </v-btn>

          <div v-else ref="completedIconRef" class="completed-icon-container animate-bounce-in" :aria-label="`第 ${setIndex + 1} 組已完成`">
            <v-icon color="success" :size="xs ? 'default' : 'large'" class="completed-icon animate-pulse"> mdi-check-circle </v-icon>
          </div>
        </v-col>
      </v-row>

      <!-- 移動端進度指示器 -->
      <v-progress-linear v-if="xs && isCompleted" color="success" value="100" height="2" class="mt-2" />
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { Field, useField } from 'vee-validate'
import { useResponsiveDesign } from '@/composables/useResponsiveDesign'
import { animateSuccess, bounceIn, createRippleEffect } from '@/utils/animations'

const props = defineProps({
  setIndex: {
    type: Number,
    required: true,
  },
  exIndex: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits(['complete-set'])

// 響應式設計
const { xs, responsiveColumns, responsiveSizes, responsiveSpacing, density } = useResponsiveDesign()

// 組件引用
const completeButtonRef = ref(null)
const completedIconRef = ref(null)

const { value: reps } = useField(() => `exercises[${props.exIndex}].sets[${props.setIndex}].reps`)
const { value: weight } = useField(() => `exercises[${props.exIndex}].sets[${props.setIndex}].weight`)
const { value: isCompleted } = useField(() => `exercises[${props.exIndex}].sets[${props.setIndex}].isCompleted`)

const isButtonDisabled = computed(() => {
  const repsValue = parseFloat(reps.value)
  const weightValue = parseFloat(weight.value)
  return isNaN(repsValue) || repsValue <= 0 || isNaN(weightValue) || weightValue < 0
})

const handleComplete = (event) => {
  if (!isButtonDisabled.value) {
    // 創建漣漪效果
    if (completeButtonRef.value && completeButtonRef.value.$el) {
      createRippleEffect(completeButtonRef.value.$el, event)
    }

    emit('complete-set')
  }
}

// 監聽完成狀態變化，觸發動畫
watch(isCompleted, async (newValue, oldValue) => {
  if (newValue && !oldValue) {
    // 組數剛完成時的動畫
    await nextTick()

    if (completedIconRef.value) {
      // 彈跳進入動畫
      bounceIn(completedIconRef.value, 600)

      // 延遲一點後觸發成功動畫
      setTimeout(() => {
        if (completedIconRef.value) {
          animateSuccess(completedIconRef.value)
        }
      }, 300)
    }
  }
})
</script>

<style scoped>
.workout-set-row {
  border-left: 4px solid transparent;
  transition: all 0.3s ease;
}

.workout-set-row:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.workout-set-row.bg-success-lighten-4 {
  border-left-color: rgb(var(--v-theme-success));
}

.complete-btn {
  transition: all 0.2s ease;
}

.complete-btn:hover {
  transform: scale(1.05);
}

.completed-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.completed-icon {
  filter: drop-shadow(0 2px 4px rgba(76, 175, 80, 0.3));
}

/* 完成狀態的特殊效果 */
.workout-set-row.bg-success-lighten-4 {
  animation: completedGlow 0.5s ease-out;
}

@keyframes completedGlow {
  0% {
    box-shadow: 0 0 0 rgba(76, 175, 80, 0);
  }
  50% {
    box-shadow: 0 0 20px rgba(76, 175, 80, 0.4);
  }
  100% {
    box-shadow: 0 0 0 rgba(76, 175, 80, 0);
  }
}

/* 移動端優化 */
@media (max-width: 600px) {
  .v-text-field {
    font-size: 14px;
  }
}

/* 深色主題調整 */
.v-theme--dark .workout-set-row {
  border-left-color: rgba(var(--v-theme-success), 0.8);
}
</style>
