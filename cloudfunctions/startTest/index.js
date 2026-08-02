/**
 * 开始测试 - 创建测试会话或恢复未完成会话
 * 调用参数: { childId: string, resume?: boolean, sessionId?: string }
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { createTestSession } = require('../shared/testEngine')

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    // 恢复未完成的测试
    if (event.resume && event.sessionId) {
      const res = await db.collection('test_sessions').doc(event.sessionId).get()
      const session = res.data
      if (!session) {
        return { code: -1, message: '测试会话不存在', data: null }
      }
      if (session.status === 'completed') {
        return { code: -1, message: '该测试已完成', data: null }
      }

      // 返回当前题目
      const currentQ = session.questions[session.currentIndex]
      return {
        code: 0,
        message: '恢复测试成功',
        data: {
          sessionId: session._id,
          currentIndex: session.currentIndex,
          totalQuestions: session.questions.length,
          currentQuestion: currentQ,
          progress: session.currentIndex + 1
        }
      }
    }

    // 检查是否有未完成的测试
    const existingRes = await db.collection('test_sessions').where({
      openid,
      childId: event.childId,
      status: 'in_progress'
    }).limit(1).get()

    if (existingRes.data.length > 0) {
      const session = existingRes.data[0]
      const currentQ = session.questions[session.currentIndex]
      return {
        code: 0,
        message: '有未完成的测试',
        data: {
          sessionId: session._id,
          currentIndex: session.currentIndex,
          totalQuestions: session.questions.length,
          currentQuestion: currentQ,
          progress: session.currentIndex + 1
        }
      }
    }

    // 获取儿童信息以确定年龄段
    const childRes = await db.collection('children').doc(event.childId).get()
    const child = childRes.data
    if (!child) {
      return { code: -1, message: '儿童档案不存在', data: null }
    }

    // 计算年龄和年龄段
    const birth = new Date(child.birthDate)
    const now = new Date()
    let age = now.getFullYear() - birth.getFullYear()
    const monthDiff = now.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--
    }

    // 获取题库（按年龄段筛选）
    const questionRes = await db.collection('questions').where({
      'ageRange.0': db.command.lte(age),
      'ageRange.1': db.command.gte(age)
    }).get()

    if (questionRes.data.length === 0) {
      // 年龄段无题目，获取全部题目
      const allRes = await db.collection('questions').get()
      questionRes.data = allRes.data
    }

    // 创建测试会话
    const session = createTestSession(questionRes.data, event.childId)

    // 存入数据库
    const addRes = await db.collection('test_sessions').add({
      data: {
        ...session,
        openid,
        childName: child.name
      }
    })

    // 返回第一道题
    const firstQ = session.questions[0]
    return {
      code: 0,
      message: '测试开始',
      data: {
        sessionId: addRes._id,
        currentIndex: 0,
        totalQuestions: session.questions.length,
        currentQuestion: firstQ,
        progress: 1
      }
    }
  } catch (err) {
    console.error('开始测试失败:', err)
    return {
      code: -1,
      message: '开始测试失败: ' + err.message,
      data: null
    }
  }
}
