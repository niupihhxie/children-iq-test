/**
 * 提交答案 - 处理用户提交的答案，返回下一题
 * 调用参数: { sessionId, questionId, optionIndex, timeSpent }
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { processAnswer } = require('../shared/testEngine')

exports.main = async (event, context) => {
  try {
    // 获取测试会话
    const res = await db.collection('test_sessions').doc(event.sessionId).get()
    const session = res.data

    if (!session) {
      return { code: -1, message: '测试会话不存在', data: null }
    }
    if (session.status === 'completed') {
      return { code: -1, message: '测试已完成', data: null }
    }

    // 防重复提交：检查是否已答过该题
    const existingAnswer = session.answers.find(
      a => a.questionId === event.questionId
    )
    if (existingAnswer) {
      return { code: -1, message: '该题已作答', data: null }
    }

    // 处理答案
    const result = processAnswer(session, event.questionId, event.optionIndex, event.timeSpent)

    // 更新数据库中的会话
    await db.collection('test_sessions').doc(event.sessionId).update({
      data: {
        answers: result.session.answers,
        currentIndex: result.session.currentIndex,
        dimensionStats: result.session.dimensionStats,
        status: result.session.status,
        endTime: result.session.endTime || null
      }
    })

    // 如果测试完成，生成报告
    if (result.isFinished) {
      return {
        code: 0,
        message: '测试完成',
        data: {
          isFinished: true,
          sessionId: event.sessionId,
          dimensionScores: Object.fromEntries(
            Object.entries(result.session.dimensionStats).map(([k, v]) => [
              k,
              Math.round((v.totalScore / 60) * 100)
            ])
          )
        }
      }
    }

    // 返回下一题
    const nextQ = result.session.questions[result.session.currentIndex]
    return {
      code: 0,
      message: '答题成功',
      data: {
        isFinished: false,
        sessionId: event.sessionId,
        currentIndex: result.session.currentIndex,
        totalQuestions: result.session.questions.length,
        currentQuestion: nextQ,
        progress: result.session.currentIndex + 1,
        lastScore: result.answer.score,
        lastCorrect: result.answer.isCorrect
      }
    }
  } catch (err) {
    console.error('提交答案失败:', err)
    return {
      code: -1,
      message: '提交答案失败: ' + err.message,
      data: null
    }
  }
}
