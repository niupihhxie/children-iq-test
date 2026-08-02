/**
 * 测试引擎核心逻辑 - 云函数共享模块
 * 包含：题目选取、难度自适应、评分计算、报告生成
 */

// 维度配置
const DIMENSIONS = ['logic', 'language', 'spatial', 'memory', 'creativity']
const DIM_NAMES = {
  logic: '逻辑推理',
  language: '语言理解',
  spatial: '空间想象',
  memory: '记忆力',
  creativity: '创造力'
}

// 每维度题目数
const QUESTIONS_PER_DIM = 6
// 总题数
const TOTAL_QUESTIONS = 30
// 难度范围
const MIN_DIFFICULTY = 1
const MAX_DIFFICULTY = 3

/**
 * 初始化测试会话 - 生成题目序列
 * @param {Array} questionBank - 该年龄段题库
 * @param {string} childId - 儿童ID
 * @returns {Object} 测试会话
 */
function createTestSession(questionBank, childId) {
  const questionSequence = []
  const dimensionStats = {} // 记录每维度的答题情况
  DIMENSIONS.forEach(dim => {
    dimensionStats[dim] = {
      answered: 0,
      correct: 0,
      totalScore: 0,
      currentDifficulty: 2 // 初始中等难度
    }
  })

  // 生成30题序列：每维度6题，按轮转方式
  for (let round = 0; round < QUESTIONS_PER_DIM; round++) {
    for (let dimIdx = 0; dimIdx < DIMENSIONS.length; dimIdx++) {
      const dim = DIMENSIONS[dimIdx]
      const stats = dimensionStats[dim]
      const targetDifficulty = stats.currentDifficulty

      // 从题库中选取该维度、该难度、且未被选过的题目
      const available = questionBank.filter(q =>
        q.dimension === dim &&
        q.difficulty === targetDifficulty &&
        !questionSequence.some(s => s.questionId === q.questionId)
      )

      let selected
      if (available.length > 0) {
        // 随机选一道
        selected = available[Math.floor(Math.random() * available.length)]
      } else {
        // 该难度无可用题目，降级选最近难度的
        const fallback = questionBank.filter(q =>
          q.dimension === dim &&
          !questionSequence.some(s => s.questionId === q.questionId)
        )
        if (fallback.length > 0) {
          // 按难度差排序，选最接近的
          fallback.sort((a, b) => Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty))
          selected = fallback[0]
        } else {
          // 真的没有了，允许重复
          const sameDim = questionBank.filter(q => q.dimension === dim)
          selected = sameDim[Math.floor(Math.random() * sameDim.length)]
        }
      }

      questionSequence.push({
        questionId: selected.questionId,
        dimension: selected.dimension,
        difficulty: selected.difficulty,
        content: selected.content,
        orderIndex: questionSequence.length
      })
    }
  }

  return {
    childId,
    questions: questionSequence,
    currentIndex: 0,
    answers: [],
    dimensionStats,
    status: 'in_progress',
    startTime: Date.now(),
    createdAt: new Date()
  }
}

/**
 * 处理用户提交答案，更新难度统计
 * @param {Object} session - 测试会话
 * @param {string} questionId - 题目ID
 * @param {number} optionIndex - 选项索引
 * @param {number} timeSpent - 用时(ms)
 * @returns {Object} 更新后的session和答题结果
 */
function processAnswer(session, questionId, optionIndex, timeSpent) {
  const currentQ = session.questions[session.currentIndex]
  if (!currentQ || currentQ.questionId !== questionId) {
    throw new Error('题目不匹配')
  }

  const option = currentQ.content.options[optionIndex]
  if (!option) {
    throw new Error('选项无效')
  }

  const score = option.score
  const isCorrect = score >= 10

  // 记录答案
  const answerRecord = {
    questionId,
    dimension: currentQ.dimension,
    difficulty: currentQ.difficulty,
    optionIndex,
    score,
    isCorrect,
    timeSpent: timeSpent || 0,
    answeredAt: Date.now()
  }
  session.answers.push(answerRecord)

  // 更新维度统计
  const stats = session.dimensionStats[currentQ.dimension]
  stats.answered++
  stats.totalScore += score
  if (isCorrect) {
    stats.correct++
  }

  // 自适应难度调整（从第3题开始调整，需要有足够样本）
  if (stats.answered >= 3) {
    const accuracy = stats.correct / stats.answered
    if (accuracy >= 0.8) {
      stats.currentDifficulty = Math.min(MAX_DIFFICULTY, stats.currentDifficulty + 1)
    } else if (accuracy <= 0.4) {
      stats.currentDifficulty = Math.max(MIN_DIFFICULTY, stats.currentDifficulty - 1)
    }
    // 40% < accuracy < 80% => 难度不变
  }

  // 移动到下一题
  session.currentIndex++

  // 检查是否完成
  if (session.currentIndex >= session.questions.length) {
    session.status = 'completed'
    session.endTime = Date.now()
  }

  return {
    session,
    answer: answerRecord,
    isFinished: session.status === 'completed'
  }
}

/**
 * 计算最终得分并生成报告
 * @param {Object} session - 已完成的测试会话
 * @returns {Object} 报告数据
 */
function generateReport(session) {
  const dimensionScores = {}
  const dimensionDetails = {}

  DIMENSIONS.forEach(dim => {
    const stats = session.dimensionStats[dim]
    // 每维度6题满分60分，归一化到0-100
    const rawScore = stats.totalScore
    const normalizedScore = Math.round((rawScore / (QUESTIONS_PER_DIM * 10)) * 100)
    dimensionScores[dim] = normalizedScore

    dimensionDetails[dim] = {
      name: DIM_NAMES[dim],
      score: normalizedScore,
      rawScore: rawScore,
      maxScore: QUESTIONS_PER_DIM * 10,
      answered: stats.answered,
      correct: stats.correct,
      accuracy: stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : 0
    }
  })

  // 匹配智力类型
  const intelligenceType = getIntelligenceType(dimensionScores)

  // 生成发展建议
  const suggestions = generateSuggestions(dimensionScores)

  // 计算总分
  const totalScore = Math.round(Object.values(dimensionScores).reduce((a, b) => a + b, 0) / DIMENSIONS.length)

  const report = {
    sessionId: session._id || null,
    childId: session.childId,
    dimensionScores,
    dimensionDetails,
    totalScore,
    intelligenceType,
    suggestions,
    answers: session.answers,
    totalTime: session.endTime - session.startTime,
    createdAt: new Date()
  }

  return report
}

/**
 * 匹配智力类型
 */
function getIntelligenceType(scores) {
  const types = [
    {
      id: 'all_round',
      name: '全能小天才',
      tag: '全面发展',
      condition: () => Object.values(scores).every(s => s >= 60)
    },
    {
      id: 'future_engineer',
      name: '未来工程师',
      tag: '理工潜力',
      condition: () => scores.logic >= 60 && scores.spatial >= 60 && scores.logic + scores.spatial > scores.language + scores.creativity
    },
    {
      id: 'art_youth',
      name: '文艺小少年',
      tag: '人文艺术倾向',
      condition: () => scores.language >= 60 && scores.creativity >= 60 && scores.language + scores.creativity > scores.logic + scores.spatial
    },
    {
      id: 'logic_master',
      name: '小小逻辑家',
      tag: '数理思维突出',
      condition: () => scores.logic > scores.language && scores.logic > scores.spatial
    },
    {
      id: 'spatial_explorer',
      name: '空间探索者',
      tag: '空间想象力强',
      condition: () => scores.spatial > scores.memory && scores.spatial > scores.logic
    },
    {
      id: 'little_speaker',
      name: '小小演说家',
      tag: '语言表达突出',
      condition: () => scores.language > scores.logic && scores.language > scores.creativity
    },
    {
      id: 'memory_expert',
      name: '记忆小达人',
      tag: '记忆力出众',
      condition: () => scores.memory > scores.spatial && scores.memory > scores.language
    },
    {
      id: 'creative_artist',
      name: '创意小画家',
      tag: '创造力丰富',
      condition: () => scores.creativity > scores.logic && scores.creativity > scores.language
    }
  ]

  for (const type of types) {
    if (type.condition()) {
      return type
    }
  }

  return types[0] // 默认
}

/**
 * 生成发展建议
 */
function generateSuggestions(scores) {
  const suggestions = []
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])

  // 优势维度
  const top = sorted[0]
  suggestions.push({
    type: 'advantage',
    dimension: top[0],
    dimensionName: DIM_NAMES[top[0]],
    title: `${DIM_NAMES[top[0]]}能力突出`,
    content: getAdvantageSuggestion(top[0])
  })

  // 弱势维度
  const bottom = sorted[sorted.length - 1]
  if (bottom[1] < 50) {
    suggestions.push({
      type: 'improve',
      dimension: bottom[0],
      dimensionName: DIM_NAMES[bottom[0]],
      title: `${DIM_NAMES[bottom[0]]}有待提升`,
      content: getImproveSuggestion(bottom[0])
    })
  }

  // 通用建议
  suggestions.push({
    type: 'general',
    dimension: 'all',
    dimensionName: '全面发展',
    title: '全面发展建议',
    content: '每个孩子都是独特的！建议在保持优势的同时，通过游戏和日常活动全面提升各项能力。定期测试可以追踪成长轨迹。'
  })

  return suggestions
}

function getAdvantageSuggestion(dim) {
  const map = {
    logic: '孩子逻辑推理能力出色，适合通过棋类游戏、数学益智题、编程启蒙等活动进一步发展。可以尝试数独、迷宫等挑战性游戏。',
    language: '孩子语言理解能力优秀，建议多阅读绘本、讲故事、参与讨论。可以鼓励孩子复述故事、描述画面，培养表达能力。',
    spatial: '孩子空间想象力出众，适合积木搭建、拼图、折纸等活动。可以尝试三维拼搭玩具、画画等创意活动。',
    memory: '孩子记忆力出众，可以通过记忆卡片、配对游戏进一步训练。学习外语、背诵诗歌也是很好的锻炼方式。',
    creativity: '孩子创造力丰富，鼓励自由绘画、手工制作、角色扮演。提供开放性玩具（如乐高、黏土）激发想象。'
  }
  return map[dim] || '继续保持优秀的表现！'
}

function getImproveSuggestion(dim) {
  const map = {
    logic: '可以通过分类游戏、排序练习、简单数数等日常活动逐步提升逻辑思维。',
    language: '建议每天亲子阅读15分钟，多与孩子对话，鼓励描述日常见闻。',
    spatial: '可以通过拼图、搭积木、走迷宫等游戏锻炼空间感知。',
    memory: '试试"看一眼记住"游戏、翻牌配对、复述数字串等趣味记忆训练。',
    creativity: '多提供开放式玩具和材料，鼓励"如果...会怎样"的想象游戏。'
  }
  return map[dim] || '通过趣味练习逐步提升。'
}

module.exports = {
  DIMENSIONS,
  DIM_NAMES,
  createTestSession,
  processAnswer,
  generateReport
}
