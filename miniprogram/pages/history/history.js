const api = require('../../utils/api')
const { formatDate } = require('../../utils/util')

Page({
  data: {
    children: [],
    selectedChildId: '',
    reports: [],
    loading: true,
    typeEmojis: {
      all_round: '🌟',
      future_engineer: '🔧',
      art_youth: '🎨',
      logic_master: '🧩',
      spatial_explorer: '🏗️',
      little_speaker: '🎤',
      memory_expert: '🎯',
      creative_artist: '🖍️'
    }
  },

  async onShow() {
    await this.loadChildren()
  },

  async loadChildren() {
    try {
      const list = await api.getProfiles()
      if (!list || list.length === 0) {
        this.setData({ loading: false })
        return
      }
      this.setData({
        children: list,
        selectedChildId: list[0]._id
      })
      await this.loadReports()
    } catch (e) {
      console.error('加载儿童列表失败:', e)
      this.setData({ loading: false })
    }
  },

  onSelectChild(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ selectedChildId: id })
    this.loadReports()
  },

  async loadReports() {
    if (!this.data.selectedChildId) return
    try {
      const res = await api.getHistory(this.data.selectedChildId, 1, 50)
      const reports = (res.list || []).map(r => ({
        ...r,
        dateText: formatDate(r.createdAt, 'YYYY-MM-DD HH:mm')
      }))
      this.setData({ reports, loading: false })
    } catch (e) {
      console.error('加载报告失败:', e)
      this.setData({ loading: false })
    }
  },

  onViewReport(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/report/report?reportId=${id}` })
  },

  goTest() {
    wx.navigateTo({ url: '/pages/profiles/profiles?from=test' })
  }
})
