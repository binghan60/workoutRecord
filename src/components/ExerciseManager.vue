<script setup>
import { ref } from 'vue'
import { useExerciseStore } from '@/stores/exercise'
import { getMuscleGroupColor } from '@/utils/colorUtils'
import { Form, Field, ErrorMessage } from 'vee-validate'

const exerciseStore = useExerciseStore()

// 用於追蹤收合狀態的物件
const collapsedGroups = ref({})

// 切換指定分組的收合狀態
const toggleGroup = (groupName) => {
  collapsedGroups.value[groupName] = !collapsedGroups.value[groupName]
}

const handleAddExercise = (values, { resetForm }) => {
  exerciseStore.addExercise(values.exerciseName, values.muscleGroup)
  resetForm()
}
</script>

<template>
  <div class="mx-auto bg-gray-800 p-6 rounded-lg shadow-xl">
    <h1 class="text-3xl font-bold mb-6 text-center text-white">管理訓練動作</h1>

    <!-- 新增動作表單 -->
    <Form @submit="handleAddExercise" class="space-y-4 mb-8">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-grow relative pb-4">
          <Field
            name="exerciseName"
            type="text"
            label="動作名稱"
            rules="required"
            placeholder="輸入新的動作名稱"
            class="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <ErrorMessage name="exerciseName" class="absolute bottom-0 left-0 text-red-400 text-xs" />
        </div>
        <div class="flex-grow relative pb-4">
          <Field
            name="muscleGroup"
            type="text"
            label="訓練部位"
            rules="required"
            placeholder="訓練部位 (例如: 胸部)"
            class="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <ErrorMessage name="muscleGroup" class="absolute bottom-0 left-0 text-red-400 text-xs" />
        </div>
      </div>
      <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition-transform transform hover:scale-105">新增動作</button>
    </Form>

    <!-- 動作列表 -->
    <div class="space-y-6">
      <h2 class="text-2xl font-semibold mb-4 text-white border-b-2 border-gray-700 pb-2">動作庫</h2>
      <template v-if="Object.keys(exerciseStore.groupedExercises).length > 0">
        <div v-for="(group, groupName) in exerciseStore.groupedExercises" :key="groupName">
          <h3 @click="toggleGroup(groupName)" :class="['text-lg font-bold flex items-center cursor-pointer select-none px-4 py-2 rounded-t-md transition-all', getMuscleGroupColor(groupName)]">
            <span class="transform transition-transform duration-200 mr-2" :class="{ '-rotate-90': collapsedGroups[groupName] }">▼</span>
            {{ groupName }}
          </h3>
          <transition enter-active-class="transition-all duration-300 ease-out" leave-active-class="transition-all duration-200 ease-in" enter-from-class="opacity-0 -translate-y-2" leave-to-class="opacity-0 -translate-y-2">
            <div v-if="!collapsedGroups[groupName]" class="bg-gray-700 p-4 rounded-b-md rounded-r-md space-y-3">
              <div v-for="exercise in group" :key="exercise.id" class="bg-gray-800 p-3 rounded-md flex justify-between items-center">
                <span class="text-gray-200 font-semibold">{{ exercise.name }}</span>
                <div>
                  <button v-if="exercise.isCustom" @click="exerciseStore.deleteExercise(exercise.id)" class="text-red-500 hover:text-red-400 font-semibold transition-colors px-3">刪除</button>
                  <span v-else class="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-600 rounded-full">內建</span>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </template>
      <div v-else class="text-center text-gray-400 py-8">
        <p>尚未新增任何動作。</p>
      </div>
    </div>
  </div>
</template>
