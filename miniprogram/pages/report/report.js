const api = require('../../utils/api')
const { showToast, DIMENSION_NAMES, DIMENSION_COLORS, DIMENSION_ICONS } = require('../../utils/util')

const TYPE_EMOJIS = {
  all_round: '🌟',
  future_engineer: '🔧',
  art_youth: '🎨',
  logic_master: '🧩',
  spatial_explorer: '🏗️',
  little_speaker: '🎤',
  memory_expert: '🎯',
  creative_artist: '🖍️'
}

Page({
  data: {
    loading: true,
    report: null,
    reportId: '',
    typeEmoji: '🌟',
    dimScoreList: [],
    dimDetailList: []
  },

  onLoad(options) {
    if (options.reportId) {
      this.setData({ reportId: options.reportId })
      this.loadReport()
    }
  },

  async loadReport() {
    try {
      const report = await api.getReport(this.data.reportId)
      const dims = Object.keys(report.dimensionScores)
      const dimScoreList = dims.map(d => ({
        key: d,
        name: DIMENSION_NAMES[d],
        color: DIMENSION_COLORS[d],
        icon: DIMENSION_ICONS[d],
        score: report.dimensionScores[d]
      }))

      const dimDetailList = Object.entries(report.dimensionDetails).map(([key, detail]) => ({
        key,
        name: detail.name,
        score: detail.score,
        color: DIMENSION_COLORS[key],
        icon: DIMENSION_ICONS[key],
        correct: detail.correct,
        answered: detail.answered,
        accuracy: detail.accuracy
      }))

      this.setData({
        report,
        dimScoreList,
        dimDetailList,
        typeEmoji: TYPE_EMOJIS[report.intelligenceType.id] || '🌟',
        loading: false
      })

      // 绘制雷达图
      setTimeout(() => this.drawRadarChart(), 300)
    } catch (e) {
      console.error('加载报告失败:', e)
      showToast('加载报告失败')
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  // Canvas 雷达图绘制
  drawRadarChart() {
    const query = wx.createSelectorQuery()
    query.select('#radarCanvas')
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

        const centerX = width / 2
        const centerY = height / 2
        const radius = Math.min(width, height) / 2 - 50
        const dims = ['logic', 'language', 'spatial', 'memory', 'creativity']
        const dimLabels = ['逻辑推理', '语言理解', '空间想象', '记忆力', '创造力']
        const dimColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
        const scores = this.data.report.dimensionScores
        const levels = 5 // 5层网格

        ctx.clearRect(0, 0, width, height)

        // 1. 绘制网格
        for (let level = levels; level > 0; level--) {
          const r = (radius * level) / levels
          ctx.beginPath()
          for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
            const x = centerX + r * Math.cos(angle)
            const y = centerY + r * Math.sin(angle)
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.setStrokeStyle(level === levels ? '#ddd' : '#eee')
          ctx.setLineWidth(1)
          ctx.stroke()
        }

        // 2. 绘制轴线
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)
          ctx.beginPath()
          ctx.moveTo(centerX, centerY)
          ctx.lineTo(x, y)
          ctx.setStrokeStyle('#eee')
          ctx.setLineWidth(1)
          ctx.stroke()
        }

        // 3. 绘制数据区域
        ctx.beginPath()
        const points = []
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
          const score = scores[dims[i]] || 0
          const r = (radius * score) / 100
          const x = centerX + r * Math.cos(angle)
          const y = centerY + r * Math.sin(angle)
          points.push({ x, y })
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()

        // 填充
        ctx.setFillStyle('rgba(255, 149, 0, 0.15)')
        ctx.fill()

        // 边框
        ctx.setStrokeStyle('#FF9500')
        ctx.setLineWidth(2)
        ctx.stroke()

        // 4. 绘制数据点
        for (let i = 0; i < 5; i++) {
          ctx.beginPath()
          ctx.arc(points[i].x, points[i].y, 5, 0, Math.PI * 2)
          ctx.setFillStyle(dimColors[i])
          ctx.fill()
        }

        // 5. 绘制标签
        ctx.setFontSize(12)
        ctx.setTextAlign('center')
        ctx.setTextBaseline('middle')
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
          const labelR = radius + 25
          const x = centerX + labelR * Math.cos(angle)
          const y = centerY + labelR * Math.sin(angle)
          ctx.setFillStyle('#666')
          ctx.fillText(dimLabels[i], x, y)
          // 分数
          ctx.setFillStyle(dimColors[i])
          ctx.setFontSize(14)
          ctx.fillText(scores[dims[i]] || 0, x, y + 16)
          ctx.setFontSize(12)
        }

        ctx.draw()
      })
  },

  onCanvasTouch() {},

  onRetest() {
    wx.navigateBack()
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' })
  },

  onShareAppMessage() {
    const report = this.data.report
    return {
      title: `我家宝贝是${report.intelligenceType.name}！${report.intelligenceType.tag}🧠`,
      path: `/pages/home/home`,
      imageUrl: ''
    }
  },

  onShareTimeline() {
    const report = this.data.report
    return {
      title: `我家宝贝是${report.intelligenceType.name}！来测测你家的吧~`
    }
  }
})
