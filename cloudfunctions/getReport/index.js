/**
 * 获取报告详情
 * 调用参数: { reportId }
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const res = await db.collection('reports').doc(event.reportId).get()
    if (!res.data) {
      return { code: -1, message: '报告不存在', data: null }
    }
    return {
      code: 0,
      message: '获取成功',
      data: res.data
    }
  } catch (err) {
    console.error('获取报告失败:', err)
    return { code: -1, message: '获取报告失败', data: null }
  }
}
