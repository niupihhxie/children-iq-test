/**
 * 初始化题库 - 将题库JSON导入云数据库
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 题库数据（内嵌，部署时自动导入）
const QUESTIONS = require('./questions.json')

exports.main = async (event, context) => {
  try {
    const collection = db.collection('questions')

    // 检查是否已有题库
    const countRes = await collection.count()
    if (countRes.total > 0 && !event.force) {
      return {
        code: 0,
        message: `题库已存在（${countRes.total}题），如需重新导入请传 force: true`,
        data: { total: countRes.total }
      }
    }

    // 如果强制导入，先清空
    if (event.force && countRes.total > 0) {
      // 批量删除
      const allRes = await collection.limit(1000).get()
      const tasks = allRes.data.map(item => collection.doc(item._id).remove())
      await Promise.all(tasks)
    }

    // 批量插入题目（每次最多20条）
    const batchSize = 20
    let inserted = 0
    for (let i = 0; i < QUESTIONS.questions.length; i += batchSize) {
      const batch = QUESTIONS.questions.slice(i, i + batchSize)
      const tasks = batch.map(q => collection.add({ data: q }))
      await Promise.all(tasks)
      inserted += batch.length
    }

    return {
      code: 0,
      message: `题库导入成功，共 ${inserted} 道题`,
      data: { total: inserted }
    }
  } catch (err) {
    console.error('初始化题库失败:', err)
    return {
      code: -1,
      message: '题库导入失败: ' + err.message,
      data: null
    }
  }
}
