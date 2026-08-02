const api = require('../../utils/api')
const { showToast, showLoading, hideLoading, calculateAge, formatDate } = require('../../utils/util')

Page({
  data: {
    profiles: [],
    loading: true,
    fromTest: false,
    showModal: false,
    editingId: '',
    formName: '',
    formGender: '男',
    formBirthDate: '',
    today: '',
    saving: false
  },

  onLoad(options) {
    const today = formatDate(new Date(), 'YYYY-MM-DD')
    this.setData({ today })
    if (options.from === 'test') {
      this.setData({ fromTest: true })
    }
  },

  onShow() {
    this.loadProfiles()
  },

  async loadProfiles() {
    try {
      const list = await api.getProfiles()
      const profiles = (list || []).map(p => ({
        ...p,
        ageText: `${calculateAge(p.birthDate)}岁`
      }))
      this.setData({ profiles, loading: false })
    } catch (e) {
      console.error('加载档案失败:', e)
      this.setData({ loading: false })
    }
  },

  onAddProfile() {
    this.setData({
      showModal: true,
      editingId: '',
      formName: '',
      formGender: '男',
      formBirthDate: ''
    })
  },

  onEditProfile(e) {
    const id = e.currentTarget.dataset.id
    const profile = this.data.profiles.find(p => p._id === id)
    if (profile) {
      this.setData({
        showModal: true,
        editingId: id,
        formName: profile.name,
        formGender: profile.gender,
        formBirthDate: formatDate(profile.birthDate, 'YYYY-MM-DD')
      })
    }
  },

  async onSelectProfile(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name

    if (this.data.fromTest) {
      // 从测试入口进入，直接开始测试
      const app = getApp()
      app.globalData.currentChildId = id
      wx.navigateTo({
        url: `/pages/test/test?childId=${id}&childName=${encodeURIComponent(name)}`
      })
    }
  },

  onNameInput(e) {
    this.setData({ formName: e.detail.value })
  },

  onGenderPick(e) {
    this.setData({ formGender: e.currentTarget.dataset.gender })
  },

  onDateChange(e) {
    this.setData({ formBirthDate: e.detail.value })
  },

  closeModal() {
    this.setData({ showModal: false })
  },

  stopProp() {},

  async onSaveProfile() {
    if (!this.data.formName.trim()) {
      showToast('请输入姓名')
      return
    }
    if (!this.data.formBirthDate) {
      showToast('请选择出生日期')
      return
    }

    this.setData({ saving: true })
    try {
      if (this.data.editingId) {
        await api.updateProfile(this.data.editingId, {
          name: this.data.formName.trim(),
          gender: this.data.formGender,
          birthDate: this.data.formBirthDate
        })
        showToast('更新成功', 'success')
      } else {
        await api.addProfile({
          name: this.data.formName.trim(),
          gender: this.data.formGender,
          birthDate: this.data.formBirthDate
        })
        showToast('添加成功', 'success')
      }
      this.setData({ showModal: false, saving: false })
      this.loadProfiles()
    } catch (e) {
      console.error('保存失败:', e)
      this.setData({ saving: false })
    }
  },

  async onDeleteProfile() {
    const that = this
    wx.showModal({
      title: '确认删除',
      content: '删除后该儿童的测试记录和报告将一并删除，无法恢复。',
      confirmColor: '#FF6B6B',
      success: async (res) => {
        if (res.confirm) {
          showLoading('删除中...')
          try {
            await api.deleteProfile(that.data.editingId)
            hideLoading()
            showToast('删除成功', 'success')
            that.setData({ showModal: false })
            that.loadProfiles()
          } catch (e) {
            hideLoading()
            console.error('删除失败:', e)
          }
        }
      }
    })
  }
})
