const api = require('../../utils/api')
const { showToast, DIMENSION_NAMES, DIMENSION_COLORS, DIMENSION_ICONS } = require('../../utils/util')

Page({
  data: {
    loading: true,
    finished: false,
    sessionId: '',
    childId: '',
    childName: '',
    currentIndex: 0,
    totalQuestions: 30,
    currentQuestion: null,
    selectedOption: -1,
    showResult: false,
    submitting: false,
    questionStartTime: 0,
    optionLabels: ['A', 'B', 'C', 'D', 'E', 'F'],
    dimName: '',
    dimColor: '',
    dimIcon: '',
    progressPercent: 0
  },

  onLoad(options) {
    if (options.childId) {
      this.setData({
        childId: options.childId,
        childName: decodeURIComponent(options.childName || '')
      })
      this.startTest()
    } else {
      showToast('参数错误')
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  async startTest() {
    try {
      const res = await api.startTest(this.data.childId)
      this.setData({
        sessionId: res.sessionId,
        currentIndex: res.currentIndex,
        totalQuestions: res.totalQuestions,
        currentQuestion: res.currentQuestion,
        loading: false,
        questionStartTime: Date.now(),
        progressPercent: ((res.currentIndex + 1) / res.totalQuestions) * 100
      })
      this.updateDimInfo(res.currentQuestion.dimension)
    } catch (e) {
      console.error('开始测试失败:', e)
      showToast('开始测试失败')
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  updateDimInfo(dim) {
    this.setData({
      dimName: DIMENSION_NAMES[dim] || dim,
      dimColor: DIMENSION_COLORS[dim] || '#FF9500',
      dimIcon: DIMENSION_ICONS[dim] || '🧩'
    })
  },

  onSelectOption(e) {
    if (this.data.showResult) return
    const index = e.currentTarget.dataset.index
    this.setData({ selectedOption: index })
  },

  async onNext() {
    if (this.data.selectedOption === -1 || this.data.submitting) return

    this.setData({ submitting: true })

    const timeSpent = Date.now() - this.data.questionStartTime
    const currentQ = this.data.currentQuestion

    try {
      const res = await api.submitAnswer(
        this.data.sessionId,
        currentQ.questionId,
        this.data.selectedOption,
        timeSpent
      )

      if (res.isFinished) {
        // 测试完成，生成报告
        this.setData({ finished: true, submitting: false })
        setTimeout(async () => {
          try {
            const report = await api.finishTest(this.data.sessionId)
            wx.redirectTo({
              url: `/pages/report/report?reportId=${report.reportId}`
            })
          } catch (e) {
            console.error('生成报告失败:', e)
            showToast('生成报告失败')
            setTimeout(() => wx.navigateBack(), 1500)
          }
        }, 1500)
      } else {
        // 下一题
        this.setData({
          currentIndex: res.currentIndex,
          currentQuestion: res.currentQuestion,
          selectedOption: -1,
          showResult: false,
          submitting: false,
          questionStartTime: Date.now(),
          progressPercent: ((res.currentIndex + 1) / this.data.totalQuestions) * 100
        })
        this.updateDimInfo(res.currentQuestion.dimension)
      }
    } catch (e) {
      console.error('提交答案失败:', e)
      this.setData({ submitting: false })
    }
  },

  // 退出确认
  onUnload() {
    if (this.data.sessionId && !this.data.finished) {
      // 测试未完成，数据已在服务端保存，下次可恢复
    }
  }
})
