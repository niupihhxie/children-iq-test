const api = require('../../utils/api')
const { formatDate, DIMENSION_NAMES, DIMENSION_COLORS, DIMENSION_ICONS } = require('../../utils/util')

Page({
  data: {
    children: [],
    selectedChildId: '',
    reports: [],
    loading: true,
    avgScore: 0,
    bestScore: 0,
    latestScore: 0,
    legendItems: [],
    dimTrendList: []
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
      console.error('加载失败:', e)
      this.setData({ loading: false })
    }
  },

  onSelectChild(e) {
    this.setData({ selectedChildId: e.currentTarget.dataset.id })
    this.loadReports()
  },

  async loadReports() {
    if (!this.data.selectedChildId) return
    try {
      const res = await api.getHistory(this.data.selectedChildId, 1, 50)
      const reports = (res.list || []).sort((a, b) => {
        return new Date(a.createdAt) - new Date(b.createdAt)
      })

      if (reports.length === 0) {
        this.setData({ reports: [], loading: false })
        return
      }

      // 统计
      const scores = reports.map(r => r.totalScore)
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      const bestScore = Math.max(...scores)
      const latestScore = scores[scores.length - 1]

      // 图例
      const dims = ['logic', 'language', 'spatial', 'memory', 'creativity']
      const legendItems = dims.map(d => ({
        key: d,
        name: DIMENSION_NAMES[d],
        color: DIMENSION_COLORS[d],
        icon: DIMENSION_ICONS[d]
      }))

      // 维度变化
      const dimTrendList = dims.map(d => {
        const first = reports[0].dimensionScores[d] || 0
        const last = reports[reports.length - 1].dimensionScores[d] || 0
        const change = last - first
        return {
          key: d,
          name: DIMENSION_NAMES[d],
          color: DIMENSION_COLORS[d],
          icon: DIMENSION_ICONS[d],
          firstScore: first,
          lastScore: last,
          change,
          changeText: change > 0 ? `+${change}` : `${change}`
        }
      })

      this.setData({
        reports,
        avgScore,
        bestScore,
        latestScore,
        legendItems,
        dimTrendList,
        loading: false
      })

      // 绘制趋势图
      if (reports.length > 0) {
        setTimeout(() => this.drawTrendChart(), 300)
      }
    } catch (e) {
      console.error('加载报告失败:', e)
      this.setData({ loading: false })
    }
  },

  // Canvas 折线图
  drawTrendChart() {
    const query = wx.createSelectorQuery()
    query.select('#trendCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getSystemInfoSync().pixelRatio
        const width = res[0].width
        const height = res[0].height

        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)

        const reports = this.data.reports
        const dims = ['logic', 'language', 'spatial', 'memory', 'creativity']
        const dimColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']

        const padding = { top: 30, right: 20, bottom: 40, left: 40 }
        const chartW = width - padding.left - padding.right
        const chartH = height - padding.top - padding.bottom

        ctx.clearRect(0, 0, width, height)

        // 1. 绘制Y轴刻度
        ctx.setFontSize(10)
        ctx.setFillStyle('#ccc')
        ctx.setTextAlign('right')
        for (let i = 0; i <= 5; i++) {
          const y = padding.top + (chartH * (5 - i)) / 5
          const val = i * 20
          ctx.fillText(val, padding.left - 8, y + 3)
          // 网格线
          ctx.beginPath()
          ctx.moveTo(padding.left, y)
          ctx.lineTo(width - padding.right, y)
          ctx.setStrokeStyle('#f5f5f5')
          ctx.setLineWidth(1)
          ctx.stroke()
        }

        // 2. X轴
        const stepX = reports.length > 1 ? chartW / (reports.length - 1) : 0

        // 3. 绘制每条线
        dims.forEach((dim, dimIdx) => {
          ctx.beginPath()
          reports.forEach((report, i) => {
            const score = report.dimensionScores[dim] || 0
            const x = padding.left + (reports.length > 1 ? stepX * i : chartW / 2)
            const y = padding.top + chartH - (chartH * score) / 100
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          })
          ctx.setStrokeStyle(dimColors[dimIdx])
          ctx.setLineWidth(2)
          ctx.stroke()

          // 数据点
          reports.forEach((report, i) => {
            const score = report.dimensionScores[dim] || 0
            const x = padding.left + (reports.length > 1 ? stepX * i : chartW / 2)
            const y = padding.top + chartH - (chartH * score) / 100
            ctx.beginPath()
            ctx.arc(x, y, 3, 0, Math.PI * 2)
            ctx.setFillStyle(dimColors[dimIdx])
            ctx.fill()
          })
        })

        // 4. X轴标签
        ctx.setFontSize(10)
        ctx.setFillStyle('#999')
        ctx.setTextAlign('center')
        reports.forEach((report, i) => {
          const x = padding.left + (reports.length > 1 ? stepX * i : chartW / 2)
          const dateStr = formatDate(report.createdAt, 'MM/DD')
          ctx.fillText(dateStr, x, height - padding.bottom + 16)
        })

        ctx.draw()
      })
  }
})
