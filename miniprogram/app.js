App({
  globalData: {
    cloudEnv: 'your-cloud-env-id', // 替换为你的云开发环境ID
    openid: null,
    currentChildId: null
  },

  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      env: this.globalData.cloudEnv,
      traceUser: true
    })

    // 获取用户openid
    wx.cloud.callFunction({
      name: 'manageProfile',
      data: { action: 'getOpenId' }
    }).then(res => {
      if (res.result && res.result.openid) {
        this.globalData.openid = res.result.openid
      }
    }).catch(err => {
      console.error('获取openid失败:', err)
    })
  }
})
