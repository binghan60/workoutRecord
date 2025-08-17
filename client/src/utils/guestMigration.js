// Utility to migrate guest-mode data to the newly registered/logged-in user account
// It reads from localStorage guest_* keys and creates corresponding server resources.

import apiClient from '@/api'

const KEYS = {
  exercises: 'guest_exercises',
  templates: 'guest_templates',
  schedule: 'guest_schedule',
  workouts: 'guest_workouts',
  bodyMetrics: 'guest_body_metrics',
}

function safeParse(json, fallback) {
  try {
    if (!json) return fallback
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

function isGuestId(id) {
  return typeof id === 'string' && (id.startsWith('guest_') || id.startsWith('temp_') || id.startsWith('offline_'))
}

export async function migrateGuestDataIfPresent() {
  // Quick presence check
  const rawExercises = localStorage.getItem(KEYS.exercises)
  const rawTemplates = localStorage.getItem(KEYS.templates)
  const rawSchedule = localStorage.getItem(KEYS.schedule)
  const rawWorkouts = localStorage.getItem(KEYS.workouts)
  const rawBodyMetrics = localStorage.getItem(KEYS.bodyMetrics)

  const hasAny = rawExercises || rawTemplates || rawSchedule || rawWorkouts || rawBodyMetrics
  if (!hasAny) return { migrated: false }

  // Require online
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn('[GuestMigration] Skipped: offline. Will retry on next online session.')
    return { migrated: false, reason: 'offline' }
  }

  const guestExercises = safeParse(rawExercises, [])
  const guestTemplates = safeParse(rawTemplates, [])
  const guestSchedule = safeParse(rawSchedule, {})
  const guestWorkouts = safeParse(rawWorkouts, [])
  const guestBodyMetrics = safeParse(rawBodyMetrics, [])

  const summary = {
    migrated: true,
    exercises: 0,
    templates: 0,
    schedule: 0,
    workouts: 0,
    bodyMetrics: 0,
    notes: [],
  }

  // --- 1) Build server exercise map (name -> id) and create missing custom exercises ---
  const serverExercises = await apiClient.get('/exercises').then(r => r.data)
  const exerciseNameToId = new Map()
  if (Array.isArray(serverExercises)) {
    for (const ex of serverExercises) {
      if (ex && ex.name) exerciseNameToId.set(ex.name, ex._id)
    }
  }

  // Create missing custom exercises from guest
  for (const gEx of guestExercises) {
    try {
      if (!gEx?.name) continue
      if (exerciseNameToId.has(gEx.name)) continue // already exists
      const payload = { name: gEx.name, muscleGroup: gEx.muscleGroup || '未分類' }
      const res = await apiClient.post('/exercises', payload)
      const created = res.data
      exerciseNameToId.set(created.name, created._id)
      summary.exercises++
    } catch (e) {
      // If duplicate or any error, try to refetch and map by name
      try {
        const refreshed = await apiClient.get('/exercises').then(r => r.data)
        const found = refreshed.find(x => x.name === gEx.name)
        if (found) {
          exerciseNameToId.set(found.name, found._id)
        } else {
          summary.notes.push(`exercise failed: ${gEx.name}`)
        }
      } catch {
        summary.notes.push(`exercise failed: ${gEx.name}`)
      }
    }
  }

  // --- 2) Create templates and map guest template id -> server id ---
  const templateIdMap = new Map() // guestId -> serverId
  for (const gTpl of guestTemplates) {
    try {
      if (!gTpl?.name) continue
      const payload = {
        name: gTpl.name,
        exercises: (gTpl.exercises || []).map(ex => ({
          name: ex.name,
          restTime: ex.restTime ?? 60,
          sets: (ex.sets || []).map(s => ({ reps: Number(s.reps) || 0, weight: Number(s.weight) || 0 })),
        })),
        autoSync: !!gTpl.autoSync,
      }
      const res = await apiClient.post('/templates', payload)
      const created = res.data
      templateIdMap.set(gTpl._id, created._id)
      summary.templates++
    } catch (e) {
      // Duplicate name? Try to find by name and map
      try {
        const existing = await apiClient.get('/templates').then(r => r.data)
        const found = existing.find(t => t.name === gTpl.name)
        if (found) {
          templateIdMap.set(gTpl._id, found._id)
        } else {
          summary.notes.push(`template failed: ${gTpl.name}`)
        }
      } catch {
        summary.notes.push(`template failed: ${gTpl.name}`)
      }
    }
  }

  // --- 3) Migrate schedule (IDs only) ---
  if (guestSchedule && typeof guestSchedule === 'object') {
    const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
    const schedulePayload = {}
    let hasAnyDay = false
    for (const day of days) {
      const ids = Array.isArray(guestSchedule[day]) ? guestSchedule[day] : []
      const mapped = ids.map(id => templateIdMap.get(id)).filter(Boolean)
      if (mapped.length > 0) {
        schedulePayload[day] = mapped
        hasAnyDay = true
      } else {
        schedulePayload[day] = [] // explicitly clear
      }
    }
    try {
      await apiClient.put('/schedule', schedulePayload)
      summary.schedule = hasAnyDay ? 1 : 0
    } catch (e) {
      summary.notes.push('schedule failed to migrate')
    }
  }

  // --- 4) Migrate workouts ---
  for (const gW of guestWorkouts) {
    try {
      const payload = {
        name: gW.name || '自訂訓練',
        templateId: isGuestId(gW.templateId) ? (templateIdMap.get(gW.templateId) || undefined) : gW.templateId,
        exercises: (gW.exercises || []).map(ex => {
          const serverExerciseId = exerciseNameToId.get(ex.name)
          return {
            exerciseId: serverExerciseId,
            name: ex.name,
            restTime: ex.restTime,
            sets: (ex.sets || []).map(s => ({
              reps: Number(s.reps) || 0,
              weight: Number(s.weight) || 0,
              isCompleted: !!s.isCompleted,
              actualRestTime: typeof s.actualRestTime === 'number' ? s.actualRestTime : undefined,
            })),
          }
        }).filter(e => !!e.exerciseId),
        date: gW.date || gW.createdAt, // if backend supports date field
      }
      await apiClient.post('/workouts', payload)
      summary.workouts++
    } catch (e) {
      summary.notes.push(`workout failed: ${gW?.name || 'unnamed'}`)
    }
  }

  // --- 5) Migrate body metrics ---
  for (const m of guestBodyMetrics) {
    try {
      const { _id, date, ...rest } = m
      const payload = { date, ...rest }
      await apiClient.post('/body-metrics', payload)
      summary.bodyMetrics++
    } catch (e) {
      summary.notes.push(`body metric failed: ${m?.date || 'unknown date'}`)
    }
  }

  // --- Cleanup guest storages if something got migrated ---
  try {
    localStorage.removeItem(KEYS.exercises)
    localStorage.removeItem(KEYS.templates)
    localStorage.removeItem(KEYS.schedule)
    localStorage.removeItem(KEYS.workouts)
    localStorage.removeItem(KEYS.bodyMetrics)
    // Also clear any in-progress workout state for guest
    try { localStorage.removeItem('workoutInProgress') } catch {}
  } catch {}

  return summary
}
