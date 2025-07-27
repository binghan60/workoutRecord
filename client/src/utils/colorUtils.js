export const getMuscleGroupColor = (muscleGroup) => {
  const colors = {
    胸部: 'bg-blue-500 text-blue-100',
    背部: 'bg-green-500 text-green-100',
    腿部: 'bg-red-500 text-red-100',
    肩部: 'bg-yellow-500 text-yellow-100',
    手臂: 'bg-purple-500 text-purple-100',
    核心: 'bg-pink-500 text-pink-100',
    // 可以繼續添加更多部位...
  }
  return colors[muscleGroup] || 'bg-gray-500 text-gray-100' // 回傳一個預設顏色
}
