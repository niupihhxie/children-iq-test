/**
 * 工具函数模块
 */

// 格式化日期
function formatDate(date, fmt = 'YYYY-MM-DD HH:mm') {
  if (typeof date === 'string' || typeof date === 'number') {
    date = new Date(date)
  }
  const map = {
    YYYY: date.getFullYear(),
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    DD: String(date.getDate()).padStart(2, '0'),
    HH: String(date.getHours()).padStart(2, '0'),
    mm: String(date.getMinutes()).padStart(2, '0'),
    ss: String(date.getSeconds()).padStart(2, '0')
  }
  return fmt.replace(/YYYY|MM|DD|HH|mm|ss/g, m => map[m])
}

// 计算年龄（岁）
function calculateAge(birthDate) {
  const birth = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// 根据年龄返回年龄段索引 (0: 3-6, 1: 6-9, 2: 9-12)
function getAgeRangeIndex(age) {
  if (age >= 3 && age < 6) return 0
  if (age >= 6 && age < 9) return 1
  if (age >= 9 && age <= 12) return 2
  return 1 // 默认中等
}

// 维度中文名映射
const DIMENSION_NAMES = {
  logic: '逻辑推理',
  language: '语言理解',
  spatial: '空间想象',
  memory: '记忆力',
  creativity: '创造力'
}

const DIMENSION_COLORS = {
  logic: '#FF6B6B',
  language: '#4ECDC4',
  spatial: '#45B7D1',
  memory: '#FFA07A',
  creativity: '#98D8C8'
}

const DIMENSION_ICONS = {
  logic: '🧩',
  language: '📖',
  spatial: '🏗️',
  memory: '🎯',
  creativity: '🎨'
}

// 智力类型模板
const INTELLIGENCE_TYPES = [
  {
    id: 'logic_master',
    name: '小小逻辑家',
    tag: '数理思维突出',
    condition: (scores) => scores.logic > scores.language && scores.logic > scores.spatial
  },
  {
    id: 'spatial_explorer',
    name: '空间探索者',
    tag: '空间想象力强',
    condition: (scores) => scores.spatial > scores.memory && scores.spatial > scores.logic
  },
  {
    id: 'little_speaker',
    name: '小小演说家',
    tag: '语言表达突出',
    condition: (scores) => scores.language > scores.logic && scores.language > scores.creativity
  },
  {
    id: 'memory_expert',
    name: '记忆小达人',
    tag: '记忆力出众',
    condition: (scores) => scores.memory > scores.spatial && scores.memory > scores.language
  },
  {
    id: 'creative_artist',
    name: '创意小画家',
    tag: '创造力丰富',
    condition: (scores) => scores.creativity > scores.logic && scores.creativity > scores.language
  },
  {
    id: 'all_round',
    name: '全能小天才',
    tag: '全面发展',
    condition: (scores) => Object.values(scores).every(s => s >= 60)
  },
  {
    id: 'future_engineer',
    name: '未来工程师',
    tag: '理工潜力',
    condition: (scores) => scores.logic >= 60 && scores.spatial >= 60 && scores.logic + scores.spatial > scores.language + scores.creativity
  },
  {
    id: 'art_youth',
    name: '文艺小少年',
    tag: '人文艺术倾向',
    condition: (scores) => scores.language >= 60 && scores.creativity >= 60 && scores.language + scores.creativity > scores.logic + scores.spatial
  }
]

// 根据五维度得分匹配智力类型
function getIntelligenceType(dimensionScores) {
  for (const type of INTELLIGENCE_TYPES) {
    if (type.condition(dimensionScores)) {
      return type
    }
  }
  // 默认返回全能小天才
  return INTELLIGENCE_TYPES.find(t => t.id === 'all_round')
}

// 生成发展建议
function generateSuggestions(dimensionScores) {
  const suggestions = []
  const dims = Object.entries(dimensionScores).sort((a, b) => b[1] - a[1])

  // 优势维度建议
  const topDim = dims[0]
  suggestions.push({
    type: 'advantage',
    dimension: topDim[0],
    title: `${DIMENSION_NAMES[topDim[0]]}能力突出`,
    content: getAdvantageSuggestion(topDim[0], topDim[1])
  })

  // 弱势维度建议
  const bottomDim = dims[dims.length - 1]
  if (bottomDim[1] < 50) {
    suggestions.push({
      type: 'improve',
      dimension: bottomDim[0],
      title: `${DIMENSION_NAMES[bottomDim[0]]}有待提升`,
      content: getImproveSuggestion(bottomDim[0])
    })
  }

  // 通用建议
  suggestions.push({
    type: 'general',
    dimension: 'all',
    title: '全面发展建议',
    content: '每个孩子都是独特的！建议在保持优势的同时，通过游戏和日常活动全面提升各项能力。定期测试可以追踪成长轨迹。'
  })

  return suggestions
}

function getAdvantageSuggestion(dim, score) {
  const suggestions = {
    logic: '孩子逻辑推理能力出色，适合通过棋类游戏、数学益智题、编程启蒙等活动进一步发展。可以尝试数独、迷宫等挑战性游戏。',
    language: '孩子语言理解能力优秀，建议多阅读绘本、讲故事、参与讨论。可以鼓励孩子复述故事、描述画面，培养表达能力。',
    spatial: '孩子空间想象力出众，适合积木搭建、拼图、折纸等活动。可以尝试三维拼搭玩具、画画等创意活动。',
    memory: '孩子记忆力出众，可以通过记忆卡片、配对游戏进一步训练。学习外语、背诵诗歌也是很好的锻炼方式。',
    creativity: '孩子创造力丰富，鼓励自由绘画、手工制作、角色扮演。提供开放性玩具（如乐高、黏土）激发想象。'
  }
  return suggestions[dim] || '继续保持优秀的表现！'
}

function getImproveSuggestion(dim) {
  const suggestions = {
    logic: '可以通过分类游戏、排序练习、简单数数等日常活动逐步提升逻辑思维。',
    language: '建议每天亲子阅读15分钟，多与孩子对话，鼓励描述日常见闻。',
    spatial: '可以通过拼图、搭积木、走迷宫等游戏锻炼空间感知。',
    memory: '试试"看一眼记住"游戏、翻牌配对、复述数字串等趣味记忆训练。',
    creativity: '多提供开放式玩具和材料，鼓励"如果...会怎样"的想象游戏。'
  }
  return suggestions[dim] || '通过趣味练习逐步提升。'
}

// 防抖
function debounce(fn, delay = 500) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

// 显示Toast
function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({ title, icon, duration })
}

// 显示Loading
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true })
}

function hideLoading() {
  wx.hideLoading()
}

module.exports = {
  formatDate,
  calculateAge,
  getAgeRangeIndex,
  DIMENSION_NAMES,
  DIMENSION_COLORS,
  DIMENSION_ICONS,
  INTELLIGENCE_TYPES,
  getIntelligenceType,
  generateSuggestions,
  debounce,
  showToast,
  showLoading,
  hideLoading
}
