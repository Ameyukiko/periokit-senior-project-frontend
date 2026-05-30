import { defineStore } from 'pinia'
import { calculateBopPercentage, calculateCal, calculateChartSummary, calculatePdCategories, calculatePiPercentage } from '@/domain/chart/chart.calculations'
import { createInitialChartData } from '@/domain/chart/chart.factory'
import type { ChartData, PatientInfo, SiteIndex, Surface, ToothId } from '@/domain/chart/chart.types'
import { useAuthStore } from './auth'

type ChartId = string

interface Chart {
  id: ChartId
  name: string
  patientInfo: PatientInfo
  teethData: ChartData
  createdAt: string
}

const createDefaultPatientInfo = (): PatientInfo => {
  const authStore = useAuthStore()
  const user = authStore.user

  return {
    hn: '',
    doctor: user?.first_name ? `${user.first_name} ${user.last_name}` : '',
    studentId: user?.student_id || '',
    patientName: '',
    age: null,
    nationality: '',
    gender: '',
    date: new Date().toISOString().split('T')[0]
  }
}

const createNewChart = (): Chart => {
  return {
    id: crypto.randomUUID(),
    name: 'New Chart',
    patientInfo: createDefaultPatientInfo(),
    teethData: createInitialChartData(),
    createdAt: new Date().toISOString()
  }
}

// Helper function to get active chart from state
const getActiveChart = (state: { charts: Chart[]; activeChartId: ChartId | null }): Chart => {
  if (state.activeChartId === null) return state.charts[0]
  return state.charts.find(c => c.id === state.activeChartId) ?? state.charts[0]
}

export const usePeriodontalChartStore = defineStore('periodontalChart', {
  state: () => ({
    charts: [createNewChart()] as Chart[],
    activeChartId: null as ChartId | null,
    selectedToothId: null as ToothId | null,
    activeSubNav: 'chart'
  }),

  getters: {
    activeChart: state => getActiveChart(state),

    patientInfo: state => getActiveChart(state).patientInfo,

    teethData: state => getActiveChart(state).teethData,

    selectedToothData: state => {
      if (state.selectedToothId === null) return null
      return getActiveChart(state).teethData[state.selectedToothId] ?? null
    },

    bopPercentage: state => calculateBopPercentage(getActiveChart(state).teethData),

    piPercentage: state => calculatePiPercentage(getActiveChart(state).teethData),

    pdCategories: state => calculatePdCategories(getActiveChart(state).teethData),

    summary: state => calculateChartSummary(getActiveChart(state).teethData)
  },

  actions: {
    // Chart management
    createNewChart() {
      const newChart = createNewChart()
      this.charts.push(newChart)
      this.activeChartId = newChart.id
      this.selectedToothId = null
    },

    switchChart(chartId: ChartId) {
      this.activeChartId = chartId
      this.selectedToothId = null
    },

    deleteChart(chartId: ChartId) {
      if (this.charts.length <= 1) return // Cannot delete last chart
      const index = this.charts.findIndex(c => c.id === chartId)
      if (index === -1) return

      this.charts.splice(index, 1)

      // If deleted chart was active, switch to another
      if (this.activeChartId === chartId) {
        this.activeChartId = this.charts[0]?.id ?? null
      }
      this.selectedToothId = null
    },

    updateChartName(chartId: ChartId, name: string) {
      const chart = this.charts.find(c => c.id === chartId)
      if (chart) chart.name = name
    },

    // Original chart data methods (now work on active chart)
    initializeChart() {
      const chart = getActiveChart(this)
      if (Object.keys(chart.teethData).length > 0) return
      chart.patientInfo = createDefaultPatientInfo()
      chart.teethData = createInitialChartData()
    },

    selectTooth(id: ToothId) {
      const chart = getActiveChart(this)
      const tooth = chart.teethData[id]
      // Prevent selection if tooth is extracted
      if (!tooth || tooth.extracted) return
      // If clicking same tooth, deselect; otherwise select new tooth
      this.selectedToothId = this.selectedToothId === id ? null : id
    },

    toggleBop(id: ToothId, surface: Surface, site: SiteIndex) {
      const chart = getActiveChart(this)
      const tooth = chart.teethData[id]
      if (!tooth || tooth.extracted) return
      tooth[surface].bop[site] = !tooth[surface].bop[site]
    },

    togglePi(id: ToothId, surface: Surface, site: SiteIndex) {
      const chart = getActiveChart(this)
      const tooth = chart.teethData[id]
      if (!tooth || tooth.extracted) return
      tooth[surface].pi[site] = !tooth[surface].pi[site]
    },

    updatePd(id: ToothId, surface: Surface, site: SiteIndex, value: string) {
      const chart = getActiveChart(this)
      const tooth = chart.teethData[id]
      if (!tooth || tooth.extracted) return
      tooth[surface].pd[site] = value
      this.updateCal(id, surface, site)
    },

    updateRec(id: ToothId, surface: Surface, site: SiteIndex, value: string) {
      const chart = getActiveChart(this)
      const tooth = chart.teethData[id]
      if (!tooth || tooth.extracted) return
      tooth[surface].rec[site] = value
      this.updateCal(id, surface, site)
    },

    updateMobility(id: ToothId, value: string) {
      const chart = getActiveChart(this)
      const tooth = chart.teethData[id]
      if (!tooth || tooth.extracted || tooth.implant) return
      tooth.mo = value
    },

    updateKtw(id: ToothId, surface: Surface, value: string) {
      const chart = getActiveChart(this)
      const tooth = chart.teethData[id]
      if (!tooth || tooth.extracted) return
      tooth[surface].ktw = value
    },

    updateCal(id: ToothId, surface: Surface, site: SiteIndex) {
      const chart = getActiveChart(this)
      const tooth = chart.teethData[id]
      if (!tooth || tooth.extracted) return
      tooth[surface].cal[site] = calculateCal(tooth[surface].pd[site], tooth[surface].rec[site])
    },

    toggleFur(id: ToothId, surface: Surface, index: number) {
      const chart = getActiveChart(this)
      const tooth = chart.teethData[id]
      if (!tooth || tooth.extracted || tooth.implant) return
      tooth.fur[surface][index] = (tooth.fur[surface][index] + 1) % 4
    },

    toggleImplant(id: ToothId) {
      const chart = getActiveChart(this)
      const tooth = chart.teethData[id]
      if (!tooth || tooth.extracted) return
      tooth.implant = !tooth.implant

      // เมื่อ Implant toggle ให้ reset ค่า mobility/furcation ที่มีอยู่ก่อน
      tooth.mo = ''
      tooth.fur.buccal = tooth.fur.buccal.map(() => 0)
      tooth.fur.lingual = tooth.fur.lingual.map(() => 0)
    },

    toggleExtracted(id: ToothId) {
      const chart = getActiveChart(this)
      const tooth = chart.teethData[id]
      if (!tooth) return
      tooth.extracted = !tooth.extracted

      // Clear ALL clinical data when tooth is extracted (fill black)
      if (tooth.extracted) {
        const clearSurfaceData = () => ({
          bop: [false, false, false],
          pi: [false, false, false],
          rec: ['', '', ''],
          pd: ['', '', ''],
          cal: ['', '', ''],
          ktw: ''
        })

        // Surface data (BOP, PI, Recession, PD, CAL, Keratinized)
        tooth.buccal = clearSurfaceData()
        tooth.lingual = clearSurfaceData()

        // Other fields
        tooth.implant = false
        tooth.mo = ''
        tooth.note = ''
        tooth.prognosisKC = ''
        tooth.prognosisMN = ''

        // Furcation
        tooth.fur.buccal = tooth.fur.buccal.map(() => 0)
        tooth.fur.lingual = tooth.fur.lingual.map(() => 0)

        // Close sidebar if this tooth was selected
        if (this.selectedToothId === id) {
          this.selectedToothId = null
        }
      }
    },

    updateNote(id: ToothId, note: string) {
      const chart = getActiveChart(this)
      const tooth = chart.teethData[id]
      if (!tooth) return
      tooth.note = note
    },

    resetChart() {
      const chart = getActiveChart(this)
      chart.patientInfo = createDefaultPatientInfo()
      chart.teethData = createInitialChartData()
      this.selectedToothId = null
      this.activeSubNav = 'chart'
    }
  }
})
