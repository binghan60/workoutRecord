<template>
  <v-container>
    <!-- 1. 訓練目的選擇 -->
    <v-card>
      <v-card-title class="headline">經典訓練課表</v-card-title>
      <v-card-subtitle>請先選擇您的主要訓練目的。</v-card-subtitle>
      <v-card-text>
        <v-chip-group v-model="selectedCategory" mandatory color="primary">
          <v-chip v-for="(category, name) in programCategories" :key="name" :value="name" filter size="large">
            {{ name }}
          </v-chip>
        </v-chip-group>
      </v-card-text>
    </v-card>

    <!-- 2. 根據訓練目的顯示對應的課表設定 -->
    <template v-if="selectedCategory === '力量'">
      <!-- 1RM 輸入 -->
      <v-card class="mt-4">
        <v-card-title>力量課表設定</v-card-title>
        <v-card-subtitle>輸入你的單次最大反覆重量 (1RM)。</v-card-subtitle>
        <v-card-text>
          <v-row>
            <v-col cols="12" sm="6" md="3">
              <v-text-field v-model.number="oneRepMax.squat" label="深蹲 (Squat) 1RM (kg)" type="number" outlined dense></v-text-field>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-text-field v-model.number="oneRepMax.bench" label="臥推 (Bench Press) 1RM (kg)" type="number" outlined dense></v-text-field>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-text-field v-model.number="oneRepMax.deadlift" label="硬舉 (Deadlift) 1RM (kg)" type="number" outlined dense></v-text-field>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-text-field v-model.number="oneRepMax.press" label="肩推 (Overhead Press) 1RM (kg)" type="number" outlined dense></v-text-field>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- 輔助動作選擇 -->
      <v-card class="mt-4">
        <v-card-title>輔助動作選擇 (選填)</v-card-title>
        <v-card-subtitle>為主要訓練日添加額外的動作 (預設 3x10)。</v-card-subtitle>
        <v-card-text>
          <!-- 5x5 Accessories -->
          <div v-if="programTab === 'fiveByFive'">
            <v-row>
              <v-col cols="12" sm="6">
                <v-select v-model="fiveByFiveAccessories.A" :items="accessoryList" label="加入「訓練 A」的輔助動作" multiple chips closable-chips outlined dense></v-select>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="fiveByFiveAccessories.B" :items="accessoryList" label="加入「訓練 B」的輔助動作" multiple chips closable-chips outlined dense></v-select>
              </v-col>
            </v-row>
          </div>
          <!-- 5/3/1 Accessories -->
          <div v-if="programTab === 'fiveThreeOne'">
            <v-row>
              <v-col cols="12" sm="6">
                <v-select v-model="fiveThreeOneAccessories.squat" :items="accessoryList" label="加入「深蹲日」的輔助動作" multiple chips closable-chips outlined dense></v-select>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="fiveThreeOneAccessories.bench" :items="accessoryList" label="加入「臥推日」的輔助動作" multiple chips closable-chips outlined dense></v-select>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="fiveThreeOneAccessories.deadlift" :items="accessoryList" label="加入「硬舉日」的輔助動作" multiple chips closable-chips outlined dense></v-select>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="fiveThreeOneAccessories.press" :items="accessoryList" label="加入「肩推日」的輔助動作" multiple chips closable-chips outlined dense></v-select>
              </v-col>
            </v-row>
          </div>
        </v-card-text>
      </v-card>

      <!-- 日期選擇與排程按鈕 -->
      <v-card class="mt-4">
        <v-card-text>
          <v-row align="center">
            <v-col cols="12" sm="6">
              <v-text-field v-model="startDate" label="計畫開始日期" type="date" outlined dense></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-btn :disabled="!isFormValid" :loading="isScheduling" color="primary" block size="large" @click="generateAndSchedule">
                <v-icon left>mdi-calendar-check</v-icon>
                生成訓練計畫並排程
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- 課表選擇與預覽 -->
      <v-card class="mt-4">
        <v-card-title>課表選擇與預覽</v-card-title>
        <v-tabs v-model="programTab" grow>
          <v-tab v-for="program in programCategories[selectedCategory].programs" :key="program.id" :value="program.id">
            {{ program.name }}
          </v-tab>
        </v-tabs>
        <v-window v-model="programTab">
          <!-- 5/3/1 預覽 -->
          <v-window-item value="fiveThreeOne">
            <v-card-text>
              <div v-if="!isOneRepMaxValid" class="text-center pa-4 text-medium-emphasis">請輸入 1RM 以預覽計畫。</div>
              <div v-else>
                <p class="mb-2 text-body-2"><strong>TM</strong> 為 1RM 的 90%。最後一組為 <strong>AMRAP</strong> (力竭組)。</p>
                <v-expansion-panels>
                  <v-expansion-panel v-for="(week, weekIndex) in fiveThreeOnePlan.weeks" :key="weekIndex" class="mb-2">
                    <v-expansion-panel-title class="font-weight-bold">{{ week.name }}</v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <v-list dense lines="two">
                        <v-list-item v-for="(day, dayIndex) in week.days" :key="dayIndex">
                          <v-list-item-title class="font-weight-bold">{{ day.name }}</v-list-item-title>
                          <v-list-item-subtitle>
                            <div v-for="(exercise, exIndex) in day.exercises" :key="exIndex">
                              {{ exercise.name }}:
                              <span v-for="(set, setIndex) in exercise.sets" :key="setIndex">
                                {{ set.weight }}kg x {{ set.reps }}{{ set.amrap ? '+' : '' }}{{ setIndex < exercise.sets.length - 1 ? ', ' : '' }}
                              </span>
                            </div>
                          </v-list-item-subtitle>
                        </v-list-item>
                      </v-list>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </div>
            </v-card-text>
          </v-window-item>
          <!-- 5x5 預覽 -->
          <v-window-item value="fiveByFive">
            <v-card-text>
              <div v-if="!isOneRepMaxValid" class="text-center pa-4 text-medium-emphasis">請輸入 1RM 以預覽計畫。</div>
              <div v-else>
                <p class="mb-2 text-body-2"><strong>起始重量</strong> 建議從 1RM 的 50% 開始。</p>
                <v-list dense lines="one">
                  <v-list-item v-for="(session, sessionName) in fiveByFivePlan" :key="sessionName">
                    <v-list-item-title class="text-h6 mb-2">{{ sessionName }}</v-list-item-title>
                    <div v-for="(exercise, exIndex) in session.exercises" :key="exIndex" class="mb-1">
                      <span class="font-weight-bold">{{ exercise.name }}:</span>
                      {{ exercise.sets.length }}x{{ exercise.sets[0].reps }} @ {{ exercise.sets[0].weight }} kg
                    </div>
                  </v-list-item>
                </v-list>
              </div>
            </v-card-text>
          </v-window-item>
        </v-window>
      </v-card>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTemplateStore } from '@/stores/template';
import { useAuthStore } from '@/stores/auth';
import { useExerciseStore } from '@/stores/exercise';
import { useToast } from 'vue-toastification';

// --- STATE ---
const oneRepMax = ref({ squat: null, bench: null, deadlift: null, press: null });
const startDate = ref(new Date().toISOString().split('T')[0]);
const isScheduling = ref(false);
const fiveByFiveAccessories = ref({ A: [], B: [] });
const fiveThreeOneAccessories = ref({ squat: [], bench: [], deadlift: [], press: [] });

const programCategories = ref({
  '力量': {
    description: '以提升最大肌力為主要目標。',
    programs: [
      { id: 'fiveThreeOne', name: '5/3/1' },
      { id: 'fiveByFive', name: '5x5' }
    ]
  }
  // Future categories like '肌肥大' can be added here
});
const selectedCategory = ref(null); // Start with null, user must select
const programTab = ref('fiveThreeOne');

const router = useRouter();
const templateStore = useTemplateStore();
const authStore = useAuthStore();
const exerciseStore = useExerciseStore();
const toast = useToast();

// --- LIFECYCLE ---
onMounted(() => {
  exerciseStore.fetchExercises();
});

// --- COMPUTED ---
const isOneRepMaxValid = computed(() => Object.values(oneRepMax.value).some(val => val && val > 0));
const isFormValid = computed(() => isOneRepMaxValid.value && !!startDate.value);

const accessoryList = computed(() => {
  const mainLifts = ['深蹲', '臥推', '硬舉', '肩推', '槓鈴划船'];
  return exerciseStore.allExercises
    .filter(ex => !mainLifts.includes(ex.name))
    .map(ex => ({ title: ex.name, value: ex.name }));
});

const roundToNearest2_5 = (weight) => Math.round(weight / 2.5) * 2.5;
const getTrainingMax = (oneRm) => (oneRm && oneRm > 0) ? oneRm * 0.9 : 0;

// --- PROGRAM LOGIC ---

const fiveThreeOnePlan = computed(() => {
  const lifts = {
    '深蹲': { tm: getTrainingMax(oneRepMax.value.squat), key: 'squat' },
    '臥推': { tm: getTrainingMax(oneRepMax.value.bench), key: 'bench' },
    '硬舉': { tm: getTrainingMax(oneRepMax.value.deadlift), key: 'deadlift' },
    '肩推': { tm: getTrainingMax(oneRepMax.value.press), key: 'press' },
  };

  const generateWeek = (weekNum, percentages, reps) => {
    const weekNames = ['第一週: 3x5', '第二週: 3x3', '第三週: 5/3/1', '第四週: 減量'];
    const dayLifts = ['深蹲', '臥推', '硬舉', '肩推'];

    return {
      name: weekNames[weekNum],
      days: dayLifts.filter(lift => lifts[lift].tm > 0).map((liftName, dayIndex) => ({
        name: `第 ${dayIndex + 1} 天: ${liftName}`,
        templateName: `531 W${weekNum + 1}D${dayIndex + 1} ${liftName}`,
        accessoryKey: lifts[liftName].key,
        exercises: [{
          name: liftName,
          sets: percentages.map((p, i) => ({
            weight: roundToNearest2_5(lifts[liftName].tm * p),
            reps: parseInt(reps[i]),
            amrap: i === percentages.length - 1 && weekNum < 3
          }))
        }]
      }))
    };
  };

  return {
    weeks: [
      generateWeek(0, [0.65, 0.75, 0.85], ['5', '5', '5']),
      generateWeek(1, [0.70, 0.80, 0.90], ['3', '3', '3']),
      generateWeek(2, [0.75, 0.85, 0.95], ['5', '3', '1']),
      generateWeek(3, [0.40, 0.50, 0.60], ['5', '5', '5']),
    ]
  };
});

const fiveByFivePlan = computed(() => {
  const startingWeight = (oneRm) => (oneRm && oneRm > 0) ? roundToNearest2_5(oneRm * 0.5) : 0;
  const plan = {};

  const squatWeight = startingWeight(oneRepMax.value.squat);
  const benchWeight = startingWeight(oneRepMax.value.bench);
  const deadliftWeight = startingWeight(oneRepMax.value.deadlift);
  const pressWeight = startingWeight(oneRepMax.value.press);
  const rowWeight = benchWeight;

  if (isOneRepMaxValid.value) {
    plan['訓練 A'] = {
      templateName: '5x5 訓練 A',
      accessoryKey: 'A',
      exercises: [
        { name: '深蹲', sets: Array(5).fill({ reps: 5, weight: squatWeight }) },
        { name: '臥推', sets: Array(5).fill({ reps: 5, weight: benchWeight }) },
        { name: '槓鈴划船', sets: Array(5).fill({ reps: 5, weight: rowWeight }) },
      ].filter(e => e.sets[0].weight > 0)
    };
    plan['訓練 B'] = {
      templateName: '5x5 訓練 B',
      accessoryKey: 'B',
      exercises: [
        { name: '深蹲', sets: Array(5).fill({ reps: 5, weight: squatWeight }) },
        { name: '肩推', sets: Array(5).fill({ reps: 5, weight: pressWeight }) },
        { name: '硬舉', sets: Array(1).fill({ reps: 5, weight: deadliftWeight }) },
      ].filter(e => e.sets[0].weight > 0)
    };
  }
  return plan;
});

// --- ACTIONS ---

const generateAndSchedule = async () => {
  isScheduling.value = true;
  try {
    if (programTab.value === 'fiveThreeOne') {
      await schedule531();
    } else {
      await schedule5x5();
    }
    toast.success('訓練計畫已成功生成並排程！');
    router.push('/schedule');
  } catch (error) {
    console.error('Failed to generate and schedule plan:', error);
    toast.error(error.message || '排程失敗，請稍後再試。');
  } finally {
    isScheduling.value = false;
  }
};

const createTemplates = async (sessions, accessoryMap) => {
  const accessorySets = Array(3).fill({ reps: 10, weight: 0 });

  const templatePromises = sessions.map(session => {
    const accessories = (accessoryMap[session.accessoryKey] || []).map(name => ({
      name,
      sets: accessorySets,
      restTime: 60
    }));

    const payload = {
      name: session.templateName,
      exercises: [
        ...session.exercises.map(ex => ({
          name: ex.name,
          sets: ex.sets.map(s => ({ reps: s.reps, weight: s.weight })),
          restTime: 90
        })),
        ...accessories
      ],
      user: authStore.user._id,
    };
    return templateStore.addTemplate(payload);
  });
  return await Promise.all(templatePromises);
};

const schedule531 = async () => {
  const sessions = fiveThreeOnePlan.value.weeks.flatMap(week => week.days);
  const newTemplates = await createTemplates(sessions, fiveThreeOneAccessories.value);

  const newSchedule = { ...templateStore.schedule };
  let currentDate = new Date(startDate.value + 'T00:00:00');
  const trainingDays = [0, 1, 3, 4]; // Mon, Tue, Thu, Fri

  newTemplates.forEach((template, index) => {
    const dayInWeek = index % 4;
    let daysToAdd = 0;
    if (index > 0) {
      daysToAdd = (dayInWeek === 0) ? 3 : (trainingDays[dayInWeek] - trainingDays[dayInWeek - 1]);
    }
    currentDate.setDate(currentDate.getDate() + daysToAdd);
    
    const dateString = currentDate.toISOString().split('T')[0];
    if (!newSchedule[dateString]) newSchedule[dateString] = [];
    newSchedule[dateString].push({ _id: template._id, name: template.name });
  });

  await templateStore.updateScheduleOnBackend(newSchedule);
};

const schedule5x5 = async () => {
  const sessions = Object.values(fiveByFivePlan.value);
  const newTemplates = await createTemplates(sessions, fiveByFiveAccessories.value);
  const templateMap = { '訓練 A': newTemplates[0], '訓練 B': newTemplates[1] };

  const newSchedule = { ...templateStore.schedule };
  let currentDate = new Date(startDate.value + 'T00:00:00');
  const workoutSequence = ['A', 'B', 'A'];
  let sessionIndex = 0;

  for (let i = 0; i < 30; i++) { // Schedule for 30 days
    const dayOfWeek = currentDate.getDay();
    if ([1, 3, 5].includes(dayOfWeek)) { // Mon, Wed, Fri
      const workoutType = workoutSequence[sessionIndex % workoutSequence.length];
      const template = templateMap[`訓練 ${workoutType}`];
      
      if (template) {
        const dateString = currentDate.toISOString().split('T')[0];
        if (!newSchedule[dateString]) newSchedule[dateString] = [];
        newSchedule[dateString].push({ _id: template._id, name: template.name });
        sessionIndex++;
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  await templateStore.updateScheduleOnBackend(newSchedule);
};

</script>

<style scoped>
.v-card-title {
  font-weight: bold;
}
.v-list-item-title {
  white-space: normal;
}
.v-list-item-subtitle {
  white-space: normal;
  line-height: 1.6;
}
</style>