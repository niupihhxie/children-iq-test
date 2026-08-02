/**
 * 云函数调用封装
 */
const { showToast } = require('./util')

// 统一调用云函数
function call(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: res => {
        if (res.result && res.result.code === 0) {
          resolve(res.result.data)
        } else {
          const msg = (res.result && res.result.message) || '请求失败'
          showToast(msg)
          reject(new Error(msg))
        }
      },
      fail: err => {
        showToast('网络不太稳定，请稍后再试')
        reject(err)
      }
    })
  })
}

// 档案管理
function getProfiles() {
  return call('manageProfile', { action: 'list' })
}

function addProfile(data) {
  return call('manageProfile', { action: 'add', ...data })
}

function updateProfile(id, data) {
  return call('manageProfile', { action: 'update', childId: id, ...data })
}

function deleteProfile(id) {
  return call('manageProfile', { action: 'delete', childId: id })
}

// 测试流程
function startTest(childId) {
  return call('startTest', { childId })
}

function submitAnswer(sessionId, questionId, optionIndex, timeSpent) {
  return call('submitAnswer', {
    sessionId,
    questionId,
    optionIndex,
    timeSpent
  })
}

function finishTest(sessionId) {
  return call('finishTest', { sessionId })
}

function resumeTest(sessionId) {
  return call('startTest', { sessionId, resume: true })
}

// 报告
function getReport(reportId) {
  return call('getReport', { reportId })
}

function getHistory(childId, page = 1, pageSize = 20) {
  return call('getHistory', { childId, page, pageSize })
}

// 初始化题库
function initQuestions() {
  return call('initQuestions', {})
}

module.exports = {
  call,
  getProfiles,
  addProfile,
  updateProfile,
  deleteProfile,
  startTest,
  submitAnswer,
  finishTest,
  resumeTest,
  getReport,
  getHistory,
  initQuestions
}
