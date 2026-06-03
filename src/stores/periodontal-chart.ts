import { defineStore } from 'pinia'
import { calculateBopPercentage, calculateCal, calculateChartSummary, calculatePdCategories, calculatePiPercentage } from '@/domain/chart/chart.calculations'
import { createInitialChartData } from '@/domain/chart/chart.factory'
import type { PatientInfo, SiteIndex, Surface, ToothId } from '@/domain/chart/chart.types'
import { useAuthStore } from './auth'
import { useVisitStore } from './visit'
import { useNotificationStore } from './notification'
import { mapChartToPayload, mapPayloadToChart } from '@/domain/chart/chart.mapper'
import { chartApi } from '@/services/api/chart.api'

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
    date: new Date().toISOString().split('T')[0],
    visitPhase: 'before_hygienic' // Default phase
  }
}

export const usePeriodontalChartStore = defineStore('periodontalChart', {
  state: () => ({
    // Single active chart for the current visit
    chartName: 'New Chart' as string,
    patientInfo: createDefaultPatientInfo(),
    teethData: createInitialChartData(),
    selectedToothId: null as ToothId | null,
    activeSubNav: 'chart' as 'chart' | 'xray' | 'export',
    currentPatientId: null as string | null,
    isDirty: false as boolean,
  }),

  getters: {
    selectedToothData: state => {
      if (state.selectedToothId === null) return null
      return state.teethData[state.selectedToothId] ?? null
    },

    bopPercentage: state => calculateBopPercentage(state.teethData),

    piPercentage: state => calculatePiPercentage(state.teethData),

    pdCategories: state => calculatePdCategories(state.teethData),

    summary: state => calculateChartSummary(state.teethData)
  },

  actions: {
    initializeChart() {
      if (Object.keys(this.teethData).length > 0) return
      this.patientInfo = createDefaultPatientInfo()
      this.teethData = createInitialChartData()
    },

    resetChart() {
      this.chartName = 'New Chart'
      this.patientInfo = createDefaultPatientInfo()
      this.teethData = createInitialChartData()
      this.selectedToothId = null
      this.activeSubNav = 'chart'
      this.isDirty = false
    },

    updatePatientInfo(value: PatientInfo) {
      this.patientInfo = { ...value }
      this.isDirty = true
    },

    selectTooth(id: ToothId) {
      const tooth = this.teethData[id]
      if (!tooth || tooth.extracted) return
      this.selectedToothId = this.selectedToothId === id ? null : id
    },

    toggleBop(id: ToothId, surface: Surface, site: SiteIndex) {
      const tooth = this.teethData[id]
      if (!tooth || tooth.extracted) return
      tooth[surface].bop[site] = !tooth[surface].bop[site]
      this.isDirty = true
    },

    togglePi(id: ToothId, surface: Surface, site: SiteIndex) {
      const tooth = this.teethData[id]
      if (!tooth || tooth.extracted) return
      tooth[surface].pi[site] = !tooth[surface].pi[site]
      this.isDirty = true
    },

    updatePd(id: ToothId, surface: Surface, site: SiteIndex, value: string) {
      const tooth = this.teethData[id]
      if (!tooth || tooth.extracted) return
      tooth[surface].pd[site] = value
      this.updateCal(id, surface, site)
      this.isDirty = true
    },

    updateRec(id: ToothId, surface: Surface, site: SiteIndex, value: string) {
      const tooth = this.teethData[id]
      if (!tooth || tooth.extracted) return
      tooth[surface].rec[site] = value
      this.updateCal(id, surface, site)
      this.isDirty = true
    },

    updateMobility(id: ToothId, value: string) {
      const tooth = this.teethData[id]
      if (!tooth || tooth.extracted || tooth.implant) return
      tooth.mo = value
      this.isDirty = true
    },

    updateKtw(id: ToothId, surface: Surface, value: string) {
      const tooth = this.teethData[id]
      if (!tooth || tooth.extracted) return
      tooth[surface].ktw = value
      this.isDirty = true
    },

    updateCal(id: ToothId, surface: Surface, site: SiteIndex) {
      const tooth = this.teethData[id]
      if (!tooth || tooth.extracted) return
      tooth[surface].cal[site] = calculateCal(tooth[surface].pd[site], tooth[surface].rec[site])
    },

    toggleFur(id: ToothId, surface: Surface, index: number) {
      const tooth = this.teethData[id]
      if (!tooth || tooth.extracted || tooth.implant) return
      tooth.fur[surface][index] = (tooth.fur[surface][index] + 1) % 4
      this.isDirty = true
    },

    toggleImplant(id: ToothId) {
      const tooth = this.teethData[id]
      if (!tooth || tooth.extracted) return
      tooth.implant = !tooth.implant

      // When Implant toggles, reset the existing mobility/furcation values
      tooth.mo = ''
      tooth.fur.buccal = tooth.fur.buccal.map(() => 0)
      tooth.fur.lingual = tooth.fur.lingual.map(() => 0)
      this.isDirty = true
    },

    toggleExtracted(id: ToothId) {
      const tooth = this.teethData[id]
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

        tooth.buccal = clearSurfaceData()
        tooth.lingual = clearSurfaceData()
        tooth.implant = false
        tooth.mo = ''
        tooth.note = ''
        tooth.prognosisKC = ''
        tooth.prognosisMN = ''
        tooth.fur.buccal = tooth.fur.buccal.map(() => 0)
        tooth.fur.lingual = tooth.fur.lingual.map(() => 0)

        if (this.selectedToothId === id) {
          this.selectedToothId = null
        }
      }
      this.isDirty = true
    },

    updateNote(id: ToothId, note: string) {
      const tooth = this.teethData[id]
      if (!tooth) return
      tooth.note = note
      this.isDirty = true
    },

    async saveToBackend() {
      const visitStore = useVisitStore()
      const notifStore = useNotificationStore()
      const visitId = visitStore.activeVisitId === 'new' ? undefined : visitStore.activeVisitId

      const { patientInfo } = this

      // Validate patient info before save (HN and Patient Name are required)
      if (!patientInfo.hn) {
        notifStore.error('Please enter HN before saving')
        throw new Error('HN is required')
      }
      if (!patientInfo.patientName) {
        notifStore.error('Please enter patient name before saving')
        throw new Error('Patient name is required')
      }

      const payload = mapChartToPayload({
        name: this.chartName,
        patientInfo: this.patientInfo,
        teethData: this.teethData,
      })

      const names = patientInfo.patientName.trim().split(/\s+/)
      const patientGender = patientInfo.gender?.trim().toLowerCase() || null
      const patientNationality = patientInfo.nationality?.trim() || null

      try {
        const { data } = await chartApi.save({
          visitId,
          chartName: this.chartName,
          teethData: payload,
          patientHn: patientInfo.hn,
          patientFirstName: names[0] ?? '',
          patientLastName: names.length > 1 ? names.slice(1).join(' ') : '',
          patientAge: patientInfo.age ?? null,
          patientGender,
          patientNationality,
          visitDate: patientInfo.date,
          visitPhase: patientInfo.visitPhase || 'before_hygienic',
        })

        const savedChart = data?.saveChart
        if (savedChart?.visitId) {
          visitStore.setActiveVisit(savedChart.visitId)
        }

        this.isDirty = false
        notifStore.success('Chart saved successfully')
      } catch (err) {
        console.error('Save chart error:', err)
        notifStore.error('Failed to save chart, please try again')
        throw err
      }
    },

    async loadFromBackend(visitId: string) {
      try {
        const { data } = await chartApi.getByVisit(visitId)
        const chartData = data?.chartByVisit

        if (!chartData || !chartData.teethData) {
          // New/empty visit: blank the chart but keep the current patient's
          // header info (same patient — don't wipe HN/name).
          this.chartName = 'New Chart'
          this.teethData = createInitialChartData()
          this.selectedToothId = null
          this.isDirty = false
          return
        }

        const chartPayload = {
          chart_name: chartData.chartName || 'Chart',
          patient_info: chartData.patientInfo || this.patientInfo,
          teeth: chartData.teethData,
          summary: chartData.summary || undefined
        }

        const rehydrated = mapPayloadToChart(chartPayload)

        this.chartName = chartData.chartName || rehydrated.name || this.chartName
        this.teethData = rehydrated.teethData || this.teethData

        if (chartData.patientInfo) {
          const pi = chartData.patientInfo
          this.patientInfo = {
            hn: pi.hn || '',
            patientName: pi.patientName || '',
            age: pi.age ?? null,
            gender: pi.gender || '',
            nationality: pi.nationality || '',
            date: pi.date || new Date().toISOString().split('T')[0],
            doctor: pi.doctor || '',
            studentId: pi.studentId || '',
            visitPhase: pi.visitPhase || 'before_hygienic',
          }
        } else {
          this.patientInfo = rehydrated.patientInfo || this.patientInfo
        }

        this.isDirty = false

      } catch (error) {
        console.error('Failed to load chart from backend:', error)
        throw error
      }
    },

    async loadPatientById(id: string) {
      this.currentPatientId = id
      const { patientApi } = await import('@/services/api/patient.api')
      const patient = await patientApi.getById(id)
      if (patient) {
        const genderRaw = patient.gender || ''
        this.patientInfo = {
          hn: patient.hn || '',
          doctor: this.patientInfo.doctor,
          studentId: this.patientInfo.studentId,
          patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
          age: patient.age ?? null,
          nationality: patient.nationality || '',
          gender: genderRaw ? genderRaw.charAt(0).toUpperCase() + genderRaw.slice(1) : '',
          date: patient.lastVisitDate ? patient.lastVisitDate.split('T')[0] : new Date().toISOString().split('T')[0],
          visitPhase: this.patientInfo.visitPhase || 'before_hygienic',
        }
      }
    }
  }
})
