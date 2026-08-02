/**
 * 儿童档案管理 - CRUD
 * action: 'getOpenId' | 'list' | 'add' | 'update' | 'delete'
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    // 获取openid
    if (event.action === 'getOpenId') {
      return {
        code: 0,
        message: 'success',
        data: { openid }
      }
    }

    // 查询档案列表
    if (event.action === 'list') {
      const res = await db.collection('children').where({ openid })
        .orderBy('createdAt', 'asc')
        .get()

      return {
        code: 0,
        message: '获取成功',
        data: res.data
      }
    }

    // 添加档案
    if (event.action === 'add') {
      const data = {
        name: event.name,
        gender: event.gender,
        birthDate: event.birthDate,
        avatar: event.avatar || '',
        openid,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const res = await db.collection('children').add({ data })
      return {
        code: 0,
        message: '添加成功',
        data: { _id: res._id, ...data }
      }
    }

    // 更新档案
    if (event.action === 'update') {
      const updateData = {
        updatedAt: new Date()
      }
      if (event.name) updateData.name = event.name
      if (event.gender) updateData.gender = event.gender
      if (event.birthDate) updateData.birthDate = event.birthDate
      if (event.avatar !== undefined) updateData.avatar = event.avatar

      await db.collection('children').doc(event.childId).update({
        data: updateData
      })

      return {
        code: 0,
        message: '更新成功',
        data: updateData
      }
    }

    // 删除档案
    if (event.action === 'delete') {
      // 同时删除该儿童的测试记录和报告
      await db.collection('test_sessions').where({
        openid,
        childId: event.childId
      }).remove()

      await db.collection('reports').where({
        openid,
        childId: event.childId
      }).remove()

      await db.collection('children').doc(event.childId).remove()

      return {
        code: 0,
        message: '删除成功',
        data: null
      }
    }

    return { code: -1, message: '未知操作: ' + event.action, data: null }
  } catch (err) {
    console.error('档案管理失败:', err)
    return { code: -1, message: '操作失败: ' + err.message, data: null }
  }
}
