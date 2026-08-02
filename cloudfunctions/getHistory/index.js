/**
 * 获取历史报告列表
 * 调用参数: { childId, page=1, pageSize=20 }
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const page = event.page || 1
    const pageSize = event.pageSize || 20

    // 查询该儿童的报告列表
    const countRes = await db.collection('reports').where({
      openid,
      childId: event.childId
    }).count()

    const listRes = await db.collection('reports').where({
      openid,
      childId: event.childId
    })
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

    // 精简返回数据（不返回完整answers）
    const reports = listRes.data.map(r => ({
      _id: r._id,
      childId: r.childId,
      childName: r.childName,
      totalScore: r.totalScore,
      dimensionScores: r.dimensionScores,
      intelligenceType: r.intelligenceType,
      createdAt: r.createdAt,
      totalTime: r.totalTime
    }))

    return {
      code: 0,
      message: '获取成功',
      data: {
        list: reports,
        total: countRes.total,
        page,
        pageSize,
        hasMore: countRes.total > page * pageSize
      }
    }
  } catch (err) {
    console.error('获取历史报告失败:', err)
    return { code: -1, message: '获取历史报告失败', data: null }
  }
}
