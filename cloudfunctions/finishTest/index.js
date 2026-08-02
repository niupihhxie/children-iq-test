/**
 * 完成测试 - 计算最终得分，生成报告并存入数据库
 * 调用参数: { sessionId }
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { generateReport } = require('../shared/testEngine')

exports.main = async (event, context) => {
  try {
    const res = await db.collection('test_sessions').doc(event.sessionId).get()
    const session = res.data

    if (!session) {
      return { code: -1, message: '测试会话不存在', data: null }
    }
    if (session.status !== 'completed') {
      return { code: -1, message: '测试尚未完成', data: null }
    }

    // 生成报告
    const report = generateReport(session)

    // 存入报告集合
    const addRes = await db.collection('reports').add({
      data: {
        ...report,
        sessionId: event.sessionId,
        openid: session.openid,
        childName: session.childName
      }
    })

    // 更新测试会话，关联报告ID
    await db.collection('test_sessions').doc(event.sessionId).update({
      data: { reportId: addRes._id }
    })

    return {
      code: 0,
      message: '报告生成成功',
      data: {
        reportId: addRes._id,
        ...report
      }
    }
  } catch (err) {
    console.error('生成报告失败:', err)
    return {
      code: -1,
      message: '生成报告失败: ' + err.message,
      data: null
    }
  }
}
