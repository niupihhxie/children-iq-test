const api = require('../../utils/api')
const { showToast } = require('../../utils/util')

Page({
  data: {
    hasChildren: false,
    childCount: 0
  },

  onShow() {
    this.loadProfiles()
  },

  async loadProfiles() {
    try {
      const list = await api.getProfiles()
      this.setData({
        hasChildren: list && list.length > 0,
        childCount: list ? list.length : 0
      })
    } catch (e) {
      console.error('加载档案失败:', e)
    }
  },

  goTest() {
    if (!this.data.hasChildren) {
      showToast('请先创建儿童档案')
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/profiles/profiles' })
      }, 1500)
      return
    }
    wx.navigateTo({ url: '/pages/profiles/profiles?from=test' })
  },

  goProfiles() {
    wx.navigateTo({ url: '/pages/profiles/profiles' })
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' })
  },

  goTrend() {
    wx.navigateTo({ url: '/pages/trend/trend' })
  }
})
