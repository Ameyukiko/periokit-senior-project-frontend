<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Download,
  FileText,
  Image as ImageIcon,
  Info,
  RotateCcw,
  Stethoscope,
} from 'lucide-vue-next'
import Navbar from '@/components/layout/Navbar.vue'
import PatientDrawer from '@/components/patients/VisitListPanel.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import Skeleton from '@/components/common/Skeleton.vue'
import DiagnosisField from '@/components/diagnosis/DiagnosisField.vue'
import GradeCriteriaTable from '@/components/diagnosis/GradeCriteriaTable.vue'
import StageCriteriaTable from '@/components/diagnosis/StageCriteriaTable.vue'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useVisitStore } from '@/stores/visit'
import { useNotificationStore } from '@/stores/notification'
import { useDiagnosisStore } from '@/stores/diagnosis'
import { GRADE_IDS, STAGE_IDS } from '@/domain/diagnosis/diagnosis.rules'
import {
  DIABETES_LABEL,
  DIRECT_EVIDENCE_LABEL,
  EXTENT_LABEL,
  FURCATION_CLASS,
  PHENOTYPE_LABEL,
  SMOKING_LABEL,
  type Diabetes,
  type DirectEvidence,
  type ExtentId,
  type GradeChoice,
  type GradeId,
  type Phenotype,
  type Smoking,
  type StageId,
  type StageRow,
} from '@/domain/diagnosis/diagnosis.types'

const route = useRoute()
const router = useRouter()
const chartStore = usePeriodontalChartStore()
const visitStore = useVisitStore()
const notifStore = useNotificationStore()
const diagnosisStore = useDiagnosisStore()

// Stable object — resetInputs() assigns into it rather than replacing it.
const inputs = diagnosisStore.inputs

const drawerOpen = ref(false)
const isLoading = ref(true)
const loadFailed = ref(false)
const showDiscardConfirm = ref(false)
const showSaveConfirm = ref(false)

const patientId = computed(() => (route.query.patientId as string) || null)
const visitId = computed(() => (route.query.visitId as string) || null)

const chartQuery = computed(() => ({
  ...(patientId.value ? { patientId: patientId.value } : {}),
  ...(visitId.value ? { visitId: visitId.value } : {}),
}))

const openChartTab = (tab: 'chart' | 'xray' | 'export') => {
  chartStore.activeSubNav = tab
  router.push({
    name: 'chart',
    query: { ...chartQuery.value, ...(tab === 'chart' ? {} : { tab }) },
  })
}

/**
 * The chart the diagnosis reads from is usually already in the store — the
 * doctor came here from it. On a reload or a deep link it is not, so the visit
 * is fetched the same way the chart page fetches it. The guards keep a chart
 * that is already open (and possibly edited) from being reloaded over.
 */
onMounted(async () => {
  chartStore.initializeChart()
  diagnosisStore.openFor(visitId.value)

  try {
    if (patientId.value && chartStore.currentPatientId !== patientId.value) {
      await chartStore.loadPatientById(patientId.value)
    }
    if (visitId.value && visitId.value !== 'new' && visitStore.activeVisitId !== visitId.value) {
      visitStore.setActiveVisit(visitId.value)
      await chartStore.loadFromBackend(visitId.value)
    }
  } catch (error) {
    console.error('Failed to load visit for diagnosis:', error)
    loadFailed.value = true
  } finally {
    isLoading.value = false
  }
})

// Values read like text until they are clicked, the way the printed AAP table
// reads — the box only shows up under the cursor.
const QUIET =
  'bg-transparent border-0 rounded px-1 -mx-1 text-[13px] font-bold text-slate-800 outline-none hover:bg-slate-100 focus:bg-blue-50 focus:ring-2 focus:ring-blue-100 transition-colors'
const QUIET_NUMBER = `${QUIET} w-14`
const QUIET_PROMPT = `${QUIET} placeholder:text-[#0052ff] placeholder:font-bold`

type NumericKey =
  | 'interdentalCalMm'
  | 'probingDepthMm'
  | 'boneLossPercent'
  | 'teethLostToPerio'
  | 'ageYears'

const setNumber = (key: NumericKey, raw: string) => {
  const trimmed = raw.trim()
  if (trimmed === '') {
    inputs[key] = null
    return
  }
  const value = Number(trimmed)
  inputs[key] = Number.isNaN(value) ? null : value
}

const setGradeCount = (key: 'furcationGrade' | 'mobilityGrade', raw: string) => {
  inputs[key] = raw === '' ? null : Number(raw)
}

const selectStage = (stage: StageId) => {
  if (inputs.stageOverride === stage || stage === diagnosisStore.stage.stage) {
    inputs.stageOverride = null
  } else {
    inputs.stageOverride = stage
  }
  if (!diagnosisStore.stageOverridden) inputs.stageReason = ''
}

const handleStageSelect = (raw: string) => {
  if (!raw) {
    inputs.stageOverride = null
    inputs.stageReason = ''
    return
  }
  const stage = raw as StageId
  if (diagnosisStore.stage.stage && stage === diagnosisStore.stage.stage) {
    inputs.stageOverride = null
    inputs.stageReason = ''
  } else {
    inputs.stageOverride = stage
  }
}

// Ticking a band on one row of the staging table. Rows are independent — the
// stage itself is a separate decision, so a mark never moves it on its own.
const markStageRow = (row: StageRow, stage: StageId) => {
  inputs.stageMarks[row] = inputs.stageMarks[row] === stage ? null : stage
}

const selectGrade = (grade: GradeId) => {
  if (inputs.gradeOverride === grade || grade === diagnosisStore.grade.grade) {
    inputs.gradeOverride = null
  } else {
    inputs.gradeOverride = grade
  }
  if (!diagnosisStore.gradeOverridden) inputs.gradeReason = ''
}

const handleGradeSelect = (raw: string) => {
  if (!raw) {
    inputs.gradeOverride = null
    inputs.gradeReason = ''
    return
  }
  const grade = raw as GradeId
  if (diagnosisStore.grade.grade && grade === diagnosisStore.grade.grade) {
    inputs.gradeOverride = null
    inputs.gradeReason = ''
  } else {
    inputs.gradeOverride = grade
  }
}

// Every clickable row of the grading table stands for one of the inputs above
// it, so ticking a cell fills that answer in.
const applyGradeChoice = (choice: GradeChoice) => {
  switch (choice.field) {
    case 'directEvidence':
      inputs.directEvidence = choice.value
      break
    case 'phenotype':
      inputs.phenotype = choice.value
      break
    case 'smoking':
      inputs.smoking = choice.value
      break
    case 'diabetes':
      inputs.diabetes = choice.value
      break
  }
}

// Drops the values typed over the chart, so the four clinical measurements come
// from the chart again. The answers the chart cannot hold are left alone.
const recalculate = () => {
  inputs.interdentalCalMm = null
  inputs.probingDepthMm = null
  inputs.furcationGrade = null
  inputs.mobilityGrade = null
  inputs.ageYears = null
  notifStore.info('Measurements re-read from the chart')
}

const confirmDiscard = () => {
  showDiscardConfirm.value = false
  diagnosisStore.resetInputs()
  notifStore.info('Diagnosis cleared')
}

// Mock: there is no diagnosis record on the backend yet, so this says so
// rather than pretending the worksheet went anywhere.
const confirmSave = () => {
  showSaveConfirm.value = false
  notifStore.info(
    'Save is a mock for now',
    'The backend has no diagnosis record yet, so this worksheet stays in this session.',
  )
}

const EXTENT_OPTIONS: ExtentId[] = ['localized', 'generalized', 'molar-incisor']
const DIRECT_OPTIONS: DirectEvidence[] = ['no-loss', 'lt-2mm', 'gte-2mm']
const PHENOTYPE_OPTIONS: Phenotype[] = ['heavy-biofilm', 'commensurate', 'exceeds']
const SMOKING_OPTIONS: Smoking[] = ['non-smoker', 'lt-10', 'gte-10']
const DIABETES_OPTIONS: Diabetes[] = ['none', 'hba1c-lt-7', 'hba1c-gte-7']

const findings = computed(() => diagnosisStore.findings)

const calSite = computed(() => {
  const found = findings.value.interdentalCal
  return found ? `#${found.toothId} ${found.site}` : null
})

const probingDepthSite = computed(() => {
  const found = findings.value.probingDepth
  return found ? `#${found.toothId} ${found.site}` : null
})

const boneLossBand = computed(() => {
  const percent = inputs.boneLossPercent
  if (percent === null) return 'Read from the X-ray, at the worst site'
  if (percent < 15) return 'Coronal third (< 15%) — Stage I band'
  if (percent <= 33) return 'Coronal third (15 – 33%) — Stage II band'
  return 'Middle third and beyond — Stage III / IV band'
})

const hasChart = computed(() => chartStore.hasChartData)
</script>

<template>
  <div class="min-h-screen bg-[#f1f5f9] font-sans text-[#1e293b]">
    <Navbar @toggle-drawer="drawerOpen = !drawerOpen" />
    <PatientDrawer v-model:open="drawerOpen" />

    <div class="bg-white border-b border-slate-200 py-1.5 sticky top-16 z-40">
      <div class="max-w-400 mx-auto px-4 flex items-center justify-center">
        <div
          class="flex items-center gap-1.5 p-0.5 bg-slate-100/80 rounded-xl border border-slate-200 overflow-x-auto min-w-max"
        >
          <button
            class="flex items-center gap-1.5 px-4 py-1 rounded-lg text-[12px] font-bold bg-white text-[#0052ff] shadow-sm transition-all duration-200"
            @click="openChartTab('chart')"
          >
            <FileText class="w-3.5 h-3.5" />
            Periodontal Chart
          </button>
          <button
            class="flex items-center gap-1.5 px-4 py-1 rounded-lg text-[12px] font-bold text-slate-500 hover:text-slate-700 transition-all duration-200"
            @click="openChartTab('xray')"
          >
            <ImageIcon class="w-3.5 h-3.5" />
            X-ray
          </button>
          <div class="w-px h-3 bg-slate-300 my-auto mx-0.5"></div>
          <button
            class="flex items-center gap-1.5 px-4 py-1 rounded-lg text-[12px] font-bold text-slate-500 hover:text-slate-700 transition-all duration-200"
            @click="openChartTab('export')"
          >
            <Download class="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>
    </div>

    <main class="max-w-320 mx-auto px-4 py-6 flex flex-col gap-5">
      <!-- Out of every state, including the ones with nothing to show. Same
           pill as the one Visit History goes back to My Patients with. -->
      <button
        class="group flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:text-[#0052ff] hover:border-[#0052ff] hover:bg-blue-50 font-medium text-sm shadow-sm transition-all -mb-2 w-fit"
        @click="openChartTab('chart')"
      >
        <ArrowLeft class="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Periodontal Chart
      </button>

      <!-- Loading -->
      <template v-if="isLoading">
        <Skeleton variant="rounded" height="120px" />
        <Skeleton variant="rounded" height="420px" />
        <Skeleton variant="rounded" height="420px" />
      </template>

      <!-- Could not read the visit -->
      <section
        v-else-if="loadFailed"
        class="bg-white rounded-3xl shadow-md border border-slate-200 p-10 flex flex-col items-center gap-3"
      >
        <p class="text-[13px] font-bold text-slate-700">This visit could not be loaded</p>
        <p class="text-[12px] text-slate-400">
          The diagnosis reads the periodontal chart of this visit. Try again from the chart page.
        </p>
      </section>

      <!-- Nothing recorded to diagnose from -->
      <section
        v-else-if="!hasChart"
        class="bg-white rounded-3xl shadow-md border border-slate-200 p-10 flex flex-col items-center gap-3"
      >
        <Stethoscope class="w-8 h-8 text-slate-300" />
        <p class="text-[13px] font-bold text-slate-700">This visit has no periodontal chart yet</p>
        <p class="text-[12px] text-slate-400 text-center max-w-100">
          Staging reads CAL, probing depth, furcation and mobility from the chart. Record them
          first, then come back — the radiographic and risk-factor answers are asked for here.
        </p>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 bg-[#0052ff] text-white rounded-lg font-bold text-[11px] shadow-md hover:bg-blue-700 transition-colors"
          @click="openChartTab('chart')"
        >
          <ArrowLeft class="w-3.5 h-3.5" /> Go to the chart
        </button>
      </section>

      <template v-else>
        <!-- Diagnosis header -->
        <header class="px-1">
          <span class="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Periodontal diagnosis · AAP / EFP 2017
          </span>

          <div class="flex flex-wrap items-start justify-between gap-3 mt-1.5">
            <div class="min-w-0">
              <h1 class="text-2xl xl:text-[28px] font-bold text-slate-800 tracking-tight">
                {{ diagnosisStore.diagnosisTitle }}
              </h1>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                class="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-[12px] shadow-sm hover:bg-slate-50 transition-colors"
                @click="recalculate"
              >
                <RotateCcw class="w-3.5 h-3.5" /> Recalculate
              </button>
              <button
                class="px-3.5 py-2 bg-[#0052ff] text-white rounded-lg font-bold text-[12px] shadow-md hover:bg-blue-700 transition-colors"
                @click="showSaveConfirm = true"
              >
                Save to visit record
              </button>
            </div>
          </div>

          <p class="mt-2.5 text-[12px] text-slate-400">
            The tables below show where your numbers fall. Tick the band that matches on each row
            and the stage and grade follow from what you ticked — nothing is read straight out of
            the chart.
          </p>
        </header>

        <!-- 1 · Stage -->
        <section class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 xl:p-6 flex flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span
                class="w-5 h-5 rounded-full bg-[#0052ff] text-white text-[10px] font-bold grid place-items-center"
              >
                1
              </span>
              <h2 class="text-[15px] font-bold text-slate-800">Periodontitis Stage</h2>
              <span class="text-[11px] text-slate-400">From the bands you tick</span>
            </div>
            <p class="text-[11px] text-slate-400">
              Severity uses the worst affected site. Complexity can raise the stage, never lower it.
            </p>
          </div>

          <div
            class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-4 xl:divide-x divide-slate-100"
          >
            <DiagnosisField
              label="Interdental CAL"
              tooltip="Highest interdental clinical attachment loss (CAL) from chart, or click to override"
              :missing="diagnosisStore.interdentalCal === null"
              :overridden="inputs.interdentalCalMm !== null"
              @reset="inputs.interdentalCalMm = null"
            >
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="Add"
                :value="diagnosisStore.interdentalCal ?? ''"
                :class="`${QUIET_PROMPT} w-14`"
                @input="setNumber('interdentalCalMm', ($event.target as HTMLInputElement).value)"
              />
              <span class="text-[12px] text-slate-500">mm</span>
              <span v-if="calSite" class="text-[12px] text-slate-400">· {{ calSite }}</span>
            </DiagnosisField>

            <DiagnosisField
              label="Max probing depth"
              class="xl:pl-6"
              tooltip="Maximum probing depth recorded from chart, or click to override"
              :missing="diagnosisStore.probingDepth === null"
              :overridden="inputs.probingDepthMm !== null"
              @reset="inputs.probingDepthMm = null"
            >
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Add"
                :value="diagnosisStore.probingDepth ?? ''"
                :class="`${QUIET_PROMPT} w-14`"
                @input="setNumber('probingDepthMm', ($event.target as HTMLInputElement).value)"
              />
              <span class="text-[12px] text-slate-500">mm</span>
              <span v-if="probingDepthSite" class="text-[12px] text-slate-400">
                · {{ probingDepthSite }}
              </span>
            </DiagnosisField>

            <DiagnosisField
              label="Furcation / mobility"
              class="xl:pl-6"
              tooltip="Maximum furcation involvement or tooth mobility recorded from chart"
              :overridden="inputs.furcationGrade !== null || inputs.mobilityGrade !== null"
              @reset="
                inputs.furcationGrade = null;
                inputs.mobilityGrade = null
              "
            >
              <select
                :value="diagnosisStore.furcation ?? ''"
                :class="`${QUIET} w-20`"
                @change="setGradeCount('furcationGrade', ($event.target as HTMLSelectElement).value)"
              >
                <option value="">None</option>
                <option v-for="(label, grade) in FURCATION_CLASS" :key="grade" :value="grade">
                  {{ label }}
                </option>
              </select>
              <span v-if="findings.furcation" class="text-[12px] text-slate-400">
                #{{ findings.furcation.toothId }} ·
              </span>
              <select
                :value="diagnosisStore.mobility ?? ''"
                :class="`${QUIET} w-20`"
                @change="setGradeCount('mobilityGrade', ($event.target as HTMLSelectElement).value)"
              >
                <option value="">No mob</option>
                <option v-for="grade in [0, 1, 2, 3]" :key="grade" :value="grade">
                  Mob {{ grade }}
                </option>
              </select>
            </DiagnosisField>

            <DiagnosisField
              label="Radiographic bone loss"
              class="xl:pl-6"
              tooltip="Estimate the highest % bone loss from radiographs (worst site) and enter here to calculate Stage & Grade"
              :hint="boneLossBand"
              :missing="inputs.boneLossPercent === null"
            >
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="Add from X-ray"
                :value="inputs.boneLossPercent ?? ''"
                :class="[
                  QUIET_PROMPT,
                  inputs.boneLossPercent === null ? 'w-32' : 'w-10'
                ]"
                @input="setNumber('boneLossPercent', ($event.target as HTMLInputElement).value)"
              />
              <span v-if="inputs.boneLossPercent !== null" class="text-[12px] text-slate-500 whitespace-nowrap">
                % at worst site
              </span>
            </DiagnosisField>

            <DiagnosisField
              label="Tooth loss cause"
              class="xl:pl-6"
              tooltip="Number of teeth lost specifically due to periodontitis (defaults to missing teeth recorded from chart, or click to edit)"
              :overridden="inputs.teethLostToPerio !== null"
              @reset="inputs.teethLostToPerio = null"
            >
              <input
                type="number"
                min="0"
                max="32"
                step="1"
                :value="diagnosisStore.teethLost"
                :class="`${QUIET} w-10`"
                @input="setNumber('teethLostToPerio', ($event.target as HTMLInputElement).value)"
              />
              <span class="text-[12px] text-slate-500 whitespace-nowrap">
                teeth lost to perio
              </span>
            </DiagnosisField>
          </div>

          <StageCriteriaTable
            :selected="diagnosisStore.finalStage"
            :marks="inputs.stageMarks"
            :cal="diagnosisStore.interdentalCal"
            :cal-site="calSite"
            :bone-loss-percent="inputs.boneLossPercent"
            :teeth-lost="diagnosisStore.teethLost"
            :complexity="diagnosisStore.complexity"
            @select="selectStage"
            @mark="markStageRow"
          />

          <div
            class="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200"
          >
            <div>
              <span class="flex items-center gap-1 text-[12px] font-bold text-slate-700">
                Extent and distribution
                <span class="relative group inline-flex">
                  <button
                    type="button"
                    class="text-slate-300 hover:text-slate-500 focus:text-slate-500 outline-none"
                    aria-label="What extent and distribution means"
                  >
                    <Info class="w-3 h-3" />
                  </button>
                  <span
                    class="hidden group-hover:block group-focus-within:block absolute left-1/2 -translate-x-6 top-full mt-2 z-30 w-72 p-3 rounded-xl bg-slate-800 text-white shadow-xl"
                  >
                    <span class="absolute -top-1 left-5 w-2 h-2 bg-slate-800 rotate-45"></span>
                    <span class="block text-[11px] font-bold">
                      How much of the mouth is affected
                    </span>
                    <span class="block mt-1.5 text-[11px] font-normal text-white/80 leading-relaxed">
                      Stage measures severity at the single worst site, so it cannot tell one
                      affected tooth apart from a whole mouth. Extent adds that: localized under
                      30% of teeth, generalized 30% or more, or a molar / incisor pattern. It
                      completes the diagnosis line and drives whether treatment is site-specific or
                      full-mouth.
                    </span>
                    <span class="block mt-1.5 text-[11px] font-normal text-amber-300">
                      Molar / incisor pattern also points toward Grade C.
                    </span>
                  </span>
                </span>
              </span>
              <span class="text-[11px] text-slate-400">
                Suggested from chart: {{ findings.affectedTeeth }} of
                {{ findings.remainingTeeth }} teeth affected ({{ findings.affectedPercentage }}%)
              </span>
            </div>
            <div class="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              <button
                v-for="option in EXTENT_OPTIONS"
                :key="option"
                type="button"
                class="px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors"
                :class="
                  inputs.extent === option
                    ? 'bg-[#0052ff] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                "
                :aria-pressed="inputs.extent === option"
                @click="inputs.extent = inputs.extent === option ? null : option"
              >
                {{ EXTENT_LABEL[option] }}
              </button>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-5 xl:p-6 shadow-sm">
            <div class="flex flex-wrap items-center gap-3">
              <span class="text-[13px] text-slate-500 font-normal">System result</span>
              <span class="text-[18px] font-bold text-slate-900">
                {{ diagnosisStore.stage.stage ? `Stage ${diagnosisStore.stage.stage}` : 'Not enough data' }}
              </span>
              <span
                v-if="diagnosisStore.stage.missing.length"
                class="px-3 py-0.5 rounded-full bg-[#FECE44] text-slate-900 text-[12px] font-semibold tracking-normal"
              >
                {{ diagnosisStore.stage.missing.length }}
                {{ diagnosisStore.stage.missing.length === 1 ? 'criterion' : 'criteria' }}
                still missing
              </span>
              <span
                v-else
                class="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[12px] font-semibold tracking-normal"
              >
                All criteria recorded
              </span>
            </div>

            <p class="mt-3 text-[13px] text-slate-600 leading-relaxed">
              Why: {{ diagnosisStore.stage.reasons.join(' ') }}
            </p>

            <div class="mt-5 flex flex-wrap items-center gap-3.5">
              <span class="text-[13px] text-slate-400">Final stage — you decide</span>

              <div class="relative inline-flex items-center">
                <select
                  :value="diagnosisStore.finalStage ?? ''"
                  class="appearance-none bg-white border border-slate-300 hover:border-slate-400 rounded-lg pl-3.5 pr-8 py-1.5 text-[13px] font-bold text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-blue-100 transition-colors cursor-pointer"
                  @change="handleStageSelect(($event.target as HTMLSelectElement).value)"
                >
                  <option v-if="!diagnosisStore.finalStage" value="">Not selected</option>
                  <option v-for="stage in STAGE_IDS" :key="stage" :value="stage">
                    Stage {{ stage }}
                  </option>
                </select>
                <div class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg class="w-3 h-3 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                  </svg>
                </div>
              </div>

              <input
                v-if="diagnosisStore.stageOverridden"
                v-model="inputs.stageReason"
                type="text"
                class="flex-1 min-w-60 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-[12px] text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-100"
                :placeholder="`Why does Stage ${inputs.stageOverride} fit this patient better?`"
              />
            </div>
          </div>
        </section>

        <!-- 2 · Grade -->
        <section class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 xl:p-6 flex flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span
                class="w-5 h-5 rounded-full bg-[#0052ff] text-white text-[10px] font-bold grid place-items-center"
              >
                2
              </span>
              <h2 class="text-[15px] font-bold text-slate-800">Periodontitis Grade</h2>
              <span class="text-[11px] text-slate-400">Needs your input</span>
            </div>
            <p class="text-[11px] text-slate-400">
              Every case starts at Grade B. Primary criteria move it to A or C; risk factors can
              only shift it upward.
            </p>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4 flex flex-col gap-3.5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-baseline gap-2">
                <span class="text-[12px] font-bold text-slate-700">
                  Complexity and risk-factor input
                </span>
                <span class="text-[11px] text-slate-400">
                  Not in the periodontal chart — fill these in and the grade updates.
                </span>
              </div>
              <div
                v-if="diagnosisStore.grade.ratio !== null"
                class="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm"
              >
                <span class="text-[11px] text-slate-400">% bone loss ÷ age</span>
                <span class="text-[13px] font-bold text-slate-800">
                  {{ diagnosisStore.grade.ratio }}
                </span>
                <span class="px-2 py-0.5 rounded-[4px] bg-[#ffce44] text-slate-900 text-[11px] font-bold">
                  Grade {{ diagnosisStore.grade.ratioGrade }} band
                </span>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2">
              <label class="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <span class="text-[11px] text-slate-500 shrink-0">Direct evidence ≥ 5 yrs</span>
                <select v-model="inputs.directEvidence" :class="`${QUIET} text-right`">
                  <option :value="null">Not available</option>
                  <option v-for="option in DIRECT_OPTIONS" :key="option" :value="option">
                    {{ DIRECT_EVIDENCE_LABEL[option] }}
                  </option>
                </select>
              </label>

              <label class="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <span class="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
                  <span
                    v-if="inputs.boneLossPercent === null"
                    class="w-1.5 h-1.5 rounded-full bg-amber-400"
                  ></span>
                  Bone loss, worst site
                </span>
                <span class="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="—"
                    :value="inputs.boneLossPercent ?? ''"
                    :class="`${QUIET_NUMBER} text-right`"
                    @input="setNumber('boneLossPercent', ($event.target as HTMLInputElement).value)"
                  />
                  <span class="text-[12px] font-bold text-slate-800">%</span>
                </span>
              </label>

              <label class="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <span class="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
                  <span
                    v-if="diagnosisStore.age === null"
                    class="w-1.5 h-1.5 rounded-full bg-amber-400"
                  ></span>
                  Patient age
                </span>
                <span class="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="120"
                    step="1"
                    placeholder="—"
                    :value="diagnosisStore.age ?? ''"
                    :class="`${QUIET_NUMBER} text-right`"
                    @input="setNumber('ageYears', ($event.target as HTMLInputElement).value)"
                  />
                  <span class="text-[12px] font-bold text-slate-800">years</span>
                </span>
              </label>

              <label class="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <span class="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
                  <span v-if="!inputs.phenotype" class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Case phenotype
                </span>
                <select v-model="inputs.phenotype" :class="`${QUIET} text-right`">
                  <option :value="null">Not assessed</option>
                  <option v-for="option in PHENOTYPE_OPTIONS" :key="option" :value="option">
                    {{ PHENOTYPE_LABEL[option] }}
                  </option>
                </select>
              </label>

              <label class="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <span class="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
                  <span v-if="!inputs.smoking" class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Smoking
                </span>
                <select v-model="inputs.smoking" :class="`${QUIET} text-right`">
                  <option :value="null">Not recorded</option>
                  <option v-for="option in SMOKING_OPTIONS" :key="option" :value="option">
                    {{ SMOKING_LABEL[option] }}
                  </option>
                </select>
              </label>

              <label class="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <span class="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
                  <span v-if="!inputs.diabetes" class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Diabetes
                </span>
                <select v-model="inputs.diabetes" :class="`${QUIET} text-right`">
                  <option :value="null">Not recorded</option>
                  <option v-for="option in DIABETES_OPTIONS" :key="option" :value="option">
                    {{ DIABETES_LABEL[option] }}
                  </option>
                </select>
              </label>
            </div>
          </div>

          <GradeCriteriaTable
            :selected="diagnosisStore.finalGrade"
            :result="diagnosisStore.grade.grade"
            :direct-evidence="inputs.directEvidence"
            :bone-loss-percent="inputs.boneLossPercent"
            :age-years="diagnosisStore.age"
            :ratio="diagnosisStore.grade.ratio"
            :ratio-grade="diagnosisStore.grade.ratioGrade"
            :phenotype="inputs.phenotype"
            :smoking="inputs.smoking"
            :diabetes="inputs.diabetes"
            @select="selectGrade"
            @choose="applyGradeChoice"
          />

          <div class="rounded-2xl border border-slate-200 bg-white p-5 xl:p-6 shadow-sm">
            <div class="flex flex-wrap items-center gap-3">
              <span class="text-[13px] text-slate-500 font-normal">System result</span>
              <span class="text-[18px] font-bold text-slate-900">
                {{
                  diagnosisStore.grade.grade
                    ? `Grade ${diagnosisStore.grade.grade}`
                    : 'Not enough input'
                }}
              </span>
              <span
                v-if="diagnosisStore.grade.missing.length"
                class="px-3 py-0.5 rounded-full bg-[#FECE44] text-slate-900 text-[12px] font-semibold tracking-normal"
              >
                Still needs {{ diagnosisStore.grade.missing.join(', ') }}
              </span>
              <span
                v-else
                class="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[12px] font-semibold tracking-normal"
              >
                All required input provided
              </span>
            </div>

            <p
              v-if="diagnosisStore.grade.reasons.length"
              class="mt-3 text-[13px] text-slate-600 leading-relaxed"
            >
              Why: {{ diagnosisStore.grade.reasons.join(' ') }}
            </p>

            <div class="mt-5 flex flex-wrap items-center gap-3.5">
              <span class="text-[13px] text-slate-400">Final grade — you decide</span>

              <div class="relative inline-flex items-center">
                <select
                  :value="diagnosisStore.finalGrade ?? ''"
                  class="appearance-none bg-white border border-slate-300 hover:border-slate-400 rounded-lg pl-3.5 pr-8 py-1.5 text-[13px] font-bold text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-blue-100 transition-colors cursor-pointer"
                  @change="handleGradeSelect(($event.target as HTMLSelectElement).value)"
                >
                  <option v-if="!diagnosisStore.finalGrade" value="">Not selected</option>
                  <option v-for="grade in GRADE_IDS" :key="grade" :value="grade">
                    Grade {{ grade }}
                  </option>
                </select>
                <div class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg class="w-3 h-3 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                  </svg>
                </div>
              </div>

              <input
                v-if="diagnosisStore.gradeOverridden"
                v-model="inputs.gradeReason"
                type="text"
                class="flex-1 min-w-60 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-[12px] text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-100"
                :placeholder="`Why does Grade ${inputs.gradeOverride} fit this patient better?`"
              />
            </div>
          </div>
        </section>

        <!-- Reference + record actions -->
        <section class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="min-w-0 max-w-160">
              <span class="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                Reference
              </span>
              <p class="text-[11px] text-slate-500 leading-relaxed">
                Tonetti M. S., Greenwell H., Kornman K. S. (2018). Staging and grading of
                periodontitis: framework and proposal of a new classification and case definition.
                Journal of Periodontology, 89(S1), S159–S172.
              </p>
              <p class="mt-1.5 text-[10px] text-slate-400">
                Save is a mock for now — the backend has no diagnosis record yet, so this worksheet
                lasts as long as this session.
              </p>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                class="px-3.5 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-[12px] shadow-sm hover:bg-slate-50 transition-colors"
                @click="showDiscardConfirm = true"
              >
                Discard changes
              </button>
              <button
                class="px-3.5 py-2 bg-[#0052ff] text-white rounded-lg font-bold text-[12px] shadow-md hover:bg-blue-700 transition-colors"
                @click="showSaveConfirm = true"
              >
                Save diagnosis to visit record
              </button>
            </div>
          </div>
        </section>
      </template>
    </main>

    <ConfirmModal
      :show="showDiscardConfirm"
      title="Discard changes"
      message="<span class='text-slate-800 font-bold text-lg block mb-1'>Clear everything you filled in?</span><span class='text-slate-500 font-normal'>The chart's own values come back, and your stage and grade choices are cleared.</span>"
      confirm-text="Discard"
      cancel-text="Cancel"
      type="danger"
      @confirm="confirmDiscard"
      @cancel="showDiscardConfirm = false"
    />

    <ConfirmModal
      :show="showSaveConfirm"
      title="Save diagnosis"
      message="<span class='text-slate-800 font-bold text-lg block mb-1'>Save this diagnosis to the visit record?</span><span class='text-slate-500 font-normal'>This button is a mock — the backend has no diagnosis record yet, so nothing is written.</span>"
      confirm-text="Save"
      cancel-text="Cancel"
      @confirm="confirmSave"
      @cancel="showSaveConfirm = false"
    />
  </div>
</template>
