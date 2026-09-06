<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Download,
  FileText,
  Image as ImageIcon,
  Info,
  Loader2,
  Lock,
  Pencil,
  RotateCcw,
  Save,
  SquarePen,
  TriangleAlert,
  Stethoscope,
  X,
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
import { useDiagnosisStore, resolveDiagnosisKey } from '@/stores/diagnosis'
import { useVisitSave } from '@/composables/useVisitSave'
import {
  DIABETES_LABEL,
  DIRECT_EVIDENCE_LABEL,
  EXTENT_LABEL,
  FURCATION_CLASS,
  GRADE_MEANING,
  PHENOTYPE_LABEL,
  SMOKING_LABEL,
  STAGE_MEANING,
  type Diabetes,
  type DirectEvidence,
  type ExtentId,
  type GradeChoice,
  type Phenotype,
  type Smoking,
  type StageId,
  type StageRow,
} from '@/domain/diagnosis/diagnosis.types'
import type { ToothId } from '@/domain/chart/chart.types'

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
const showCancelEditConfirm = ref(false)

const patientId = computed(() => (route.query.patientId as string) || null)
const visitId = computed(() => (route.query.visitId as string) || null)

/**
 * The chart page shows "Please select a patient from the drawer" for exactly one
 * combination: a visit in the query with no patient beside it. A visit that has
 * no chart yet gives `loadFromBackend` nothing to read a patient off, so the URL
 * is not always enough — the visit tab strip is asked as well, and a visit is
 * only ever sent on once a patient can be sent with it.
 */
const resolvedPatientId = computed(
  () =>
    patientId.value ||
    chartStore.currentPatientId ||
    visitStore.visits.find(visit => visit.id === visitId.value)?.patientId ||
    null,
)

// Load recorded inputs immediately in setup so template has data on first render
diagnosisStore.openFor(visitId.value, resolvedPatientId.value)

/**
 * The visit always goes back with the doctor, patient or no patient. A chart
 * being drafted for someone not yet on file has no patientId to carry, and
 * arriving at the chart page with an empty query is what used to make it read
 * the trip as "start a new visit" and blank the work in progress.
 */
const chartQuery = computed(() => ({
  ...(resolvedPatientId.value ? { patientId: resolvedPatientId.value } : {}),
  ...(visitId.value ? { visitId: visitId.value } : {}),
}))

const openChartTab = (tab: 'chart' | 'xray' | 'export') => {
  chartStore.activeSubNav = tab
  router.push({
    name: 'chart',
    query: { ...chartQuery.value, ...(tab === 'chart' ? {} : { tab }) },
  })
}

onBeforeRouteLeave(to => {
  // Edit mode belongs to the visit, and the chart and Diagnosis pages are two
  // halves of the same visit. Stepping outside both locks it again.
  if (to.name !== 'chart' && to.name !== 'diagnosis') chartStore.editMode = false
  return true
})

/**
 * A measurement shown here is only ever read. Correcting one means correcting
 * the record, so this opens the chart on the tooth the reading came from, with
 * its detail panel already showing.
 */
const openTooth = (toothId: ToothId) => {
  chartStore.selectedToothId = toothId
  openChartTab('chart')
}

/**
 * The chart the diagnosis reads from is usually already in the store — the
 * doctor came here from it. On a reload or a deep link it is not, so the visit
 * is fetched the same way the chart page fetches it. The guards keep a chart
 * that is already open (and possibly edited) from being reloaded over.
 */
onMounted(async () => {
  chartStore.initializeChart()
  diagnosisStore.openFor(visitId.value, resolvedPatientId.value)

  try {
    if (patientId.value && chartStore.currentPatientId !== patientId.value) {
      await chartStore.loadPatientById(patientId.value)
    }
    // Which visit is open has to be right even for a draft, or a Save pressed
    // from this page after a reload would not know which visit it is writing.
    const alreadyOpen = visitStore.activeVisitId === visitId.value
    if (visitId.value && !alreadyOpen) {
      visitStore.setActiveVisit(visitId.value)
      if (visitId.value !== 'new') await chartStore.loadFromBackend(visitId.value)
    }
  } catch (error) {
    console.error('Failed to load visit for diagnosis:', error)
    loadFailed.value = true
  } finally {
    isLoading.value = false
  }
})

watch(
  [visitId, resolvedPatientId],
  ([newVisit, newPatient]) => {
    diagnosisStore.openFor(newVisit, newPatient)
  },
)

// Anything the doctor can change carries a faint box, so an editable value is
// told apart from a printed one at a glance. The border firms up under the
// cursor and turns blue on focus. On a saved visit nothing here is editable, so
// the box greys out and stops answering the cursor — the value still reads,
// it just no longer offers itself.
const QUIET =
  'bg-white border border-slate-200 rounded-md px-1.5 py-0.5 -mx-0.5 text-[13px] font-bold text-slate-800 outline-none hover:border-slate-300 hover:bg-slate-50 focus:border-[#0052ff] focus:bg-white focus:ring-2 focus:ring-blue-100 transition-colors disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-slate-100'
const QUIET_NUMBER = `${QUIET} w-16`
const QUIET_PROMPT = `${QUIET} placeholder:text-[#0052ff] placeholder:font-bold disabled:placeholder:text-slate-400`

// No box: what the chart recorded is printed, not offered for editing. The
// tooth it was read at sits next to it as a link into the chart.
const RECORDED = 'text-[13px] font-bold text-slate-800'
const CHART_LINK =
  'inline-flex items-center gap-1 ml-0.5 text-[12px] text-slate-400 hover:text-[#0052ff] rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-100 transition-colors'

type NumericKey = 'boneLossPercent' | 'teethLostToPerio' | 'ageYears'

const setNumber = (key: NumericKey, raw: string) => {
  const trimmed = raw.trim()
  if (trimmed === '') {
    inputs[key] = null
    return
  }
  const value = Number(trimmed)
  inputs[key] = Number.isNaN(value) ? null : value
}

// Ticking a band on one row of the staging table, which overrides the band that
// row's measurement fell in. Clicking the same cell again hands the row back to
// the numbers. This is the only way the stage moves — it is worked out from the
// four rows and never set on its own.
const markStageRow = (row: StageRow, stage: StageId) => {
  inputs.stageMarks[row] = inputs.stageMarks[row] === stage ? null : stage
}

// Same shape as the stage and grade controls: picking what the chart already
// counted hands the answer back to the chart, anything else overrides it.
const selectExtent = (option: ExtentId) => {
  inputs.extent = diagnosisStore.extent === option ? null : option
}

const selectPhenotype = (raw: string) => {
  const value = (raw || null) as Phenotype | null
  inputs.phenotype = value === diagnosisStore.suggestedPhenotype ? null : value
}

// Every clickable row of the grading table stands for one of the inputs above
// it, so ticking a cell fills that answer in. As with the stage, this is the
// only way the grade moves — it is worked out from these rows and never set on
// its own.
const applyGradeChoice = (choice: GradeChoice) => {
  switch (choice.field) {
    case 'directEvidence':
      inputs.directEvidence = choice.value
      break
    case 'phenotype':
      // Picking what the chart already reads hands the row back to the chart.
      inputs.phenotype =
        choice.value === diagnosisStore.suggestedPhenotype ? null : choice.value
      break
    case 'smoking':
      inputs.smoking = choice.value
      break
    case 'diabetes':
      inputs.diabetes = choice.value
      break
  }
}

const confirmDiscard = () => {
  showDiscardConfirm.value = false
  diagnosisStore.resetInputs()
  notifStore.info('Diagnosis cleared')
}

// --- Read-only / edit mode ---
// A saved visit opens read-only here for the same reason it does on the chart
// page: it is the same visit. `chartStore.editMode` is what both read, so one
// Edit unlocks both and walking between them keeps it open. A draft — visit
// 'new', or no visit at all — has never been written down and is always open.
const isExistingVisit = computed(() => visitId.value !== null && visitId.value !== 'new')
const editable = computed(() => !isExistingVisit.value || chartStore.editMode)

// Keep the chart store's own guard in step while the doctor is on this page,
// so pressing Edit here unlocks the chart they walk back to.
watch(editable, value => { chartStore.readonly = !value }, { immediate: true })

const handleEdit = () => {
  chartStore.editMode = true
}

const handleCancelEditClick = () => {
  if (chartStore.isDirty || diagnosisStore.isDirty) showCancelEditConfirm.value = true
  else chartStore.editMode = false
}

const confirmCancelEdit = async () => {
  showCancelEditConfirm.value = false
  chartStore.editMode = false
  // Throw the unsaved edits away by reading the visit back off the backend —
  // the chart and the diagnosis together, since one save wrote both.
  const id = visitId.value
  if (id && id !== 'new') {
    try {
      await chartStore.loadFromBackend(id)
    } catch (error) {
      console.error('Failed to reload visit after cancelling edit:', error)
    }
  }
  diagnosisStore.revertToSaved(resolveDiagnosisKey(visitId.value, resolvedPatientId.value))
}

// --- Saving ---
// The same press as the chart page's: this is not a diagnosis of its own, it is
// part of the visit, and the visit is saved in one go.
const { isSaving, validate, saveVisit } = useVisitSave()

const nothingToSave = computed(
  () => isExistingVisit.value && !chartStore.isDirty && !diagnosisStore.isDirty,
)

const handleSaveClick = () => {
  if (isSaving.value) return
  if (!validate()) return
  showSaveConfirm.value = true
}

const confirmSave = async () => {
  showSaveConfirm.value = false
  const saved = await saveVisit()
  if (!saved) return

  // A draft has just been minted a real visit id — carry it in the URL so this
  // page, and the chart behind it, are about the visit that now exists.
  const { visitId: savedVisitId, patientId: savedPatientId } = saved
  if (
    savedVisitId &&
    (route.query.visitId !== savedVisitId ||
      (savedPatientId && route.query.patientId !== savedPatientId))
  ) {
    router.replace({
      query: {
        ...route.query,
        visitId: savedVisitId,
        ...(savedPatientId ? { patientId: savedPatientId } : {}),
      },
    })
  }
}

const EXTENT_OPTIONS: ExtentId[] = ['localized', 'generalized', 'molar-incisor']
const DIRECT_OPTIONS: DirectEvidence[] = ['no-loss', 'lt-2mm', 'gte-2mm']
const PHENOTYPE_OPTIONS: Phenotype[] = ['heavy-biofilm', 'commensurate', 'exceeds']
const SMOKING_OPTIONS: Smoking[] = ['non-smoker', 'lt-10', 'gte-10']
const DIABETES_OPTIONS: Diabetes[] = ['none', 'hba1c-lt-7', 'hba1c-gte-7']

const findings = computed(() => diagnosisStore.findings)

// Where the starting number came from, kept in view after it is edited: the
// chart counts every gap in the arch, whatever put it there.
const toothLossHint = computed(() => {
  const missing = findings.value.missingTeeth.length
  if (!missing) return 'No missing teeth on the chart'
  return `Chart has ${missing} missing ${missing === 1 ? 'tooth' : 'teeth'} — perio only?`
})

const boneLossBand = computed(() => {
  const percent = diagnosisStore.boneLoss
  if (percent === null) return 'Read from the X-ray, at the worst site'

  const band =
    percent < 15
      ? 'Coronal third (< 15%) — Stage I band'
      : percent <= 33
        ? 'Coronal third (15 – 33%) — Stage II band'
        : 'Middle third and beyond — Stage III / IV band'

  return diagnosisStore.boneLossEstimated ? `Estimated from CAL · ${band}` : band
})

const hasChart = computed(() => chartStore.hasChartData)

// What the answer means for the patient. The tables above already show which
// criteria produced it, row by row, so the line under the result is the part
// they never say: how much of the periodontium has gone, and what treating it
// now involves.
const stageMeaning = computed(() =>
  diagnosisStore.finalStage
    ? STAGE_MEANING[diagnosisStore.finalStage]
    : 'The stage says how far the disease has already gone. Fill in the rows still marked above and this line will say what that means for the patient.',
)

const gradeMeaning = computed(() =>
  diagnosisStore.finalGrade
    ? GRADE_MEANING[diagnosisStore.finalGrade]
    : 'The grade says how fast the disease is moving. Answer the rows still marked above and this line will say what that means for the patient.',
)
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
      <div class="flex flex-wrap items-start justify-between gap-3 -mb-2">
        <!-- Out of every state, including the ones with nothing to show. Same
             pill as the one Visit History goes back to My Patients with. -->
        <button
          class="group flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:text-[#0052ff] hover:border-[#0052ff] hover:bg-blue-50 font-medium text-sm shadow-sm transition-all w-fit"
          @click="openChartTab('chart')"
        >
          <ArrowLeft class="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Periodontal Chart
        </button>

        <!-- The same Save the chart page carries, because it is the same save:
             there is no diagnosis record of its own, the diagnosis is written
             with the visit. Each button says so on hover, rather than carrying a
             note underneath that has to be read on every visit to be read once.
             Both tooltips hang off the right edge so they open inwards. -->
        <div
          v-if="hasChart && !isLoading && !loadFailed"
          class="flex flex-wrap items-center justify-end gap-2"
        >
          <span v-if="isExistingVisit && !editable" class="relative group inline-flex">
            <button
              type="button"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-[11px] shadow-sm hover:bg-slate-50 transition-colors"
              @click="handleEdit"
            >
              <Pencil class="w-3.5 h-3.5" /> Edit
            </button>
            <span
              class="hidden group-hover:block group-focus-within:block absolute right-0 top-full mt-2 z-30 w-72 p-3 rounded-xl bg-slate-800 text-white shadow-xl text-[11px] font-normal leading-relaxed text-left"
            >
              <span class="absolute -top-1 right-4 w-2 h-2 bg-slate-800 rotate-45"></span>
              <span class="block font-bold text-white mb-1">Saved and read-only</span>
              Unlocks this visit — the diagnosis here and the chart behind it.
            </span>
          </span>

          <button
            v-if="isExistingVisit && editable"
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-[11px] shadow-sm hover:bg-slate-50 transition-colors"
            @click="handleCancelEditClick"
          >
            <X class="w-3.5 h-3.5" /> Cancel
          </button>

          <span v-if="editable" class="relative group inline-flex">
            <button
              type="button"
              :disabled="isSaving || nothingToSave"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] shadow-md transition-colors"
              :class="
                isSaving || nothingToSave
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              "
              @click="handleSaveClick"
            >
              <Loader2 v-if="isSaving" class="w-3.5 h-3.5 animate-spin" />
              <Save v-else class="w-3.5 h-3.5" />
              {{ isSaving ? 'Saving...' : 'Save Chart' }}
            </button>
            <span
              class="hidden group-hover:block group-focus-within:block absolute right-0 top-full mt-2 z-30 w-72 p-3 rounded-xl bg-slate-800 text-white shadow-xl text-[11px] font-normal leading-relaxed text-left"
            >
              <span class="absolute -top-1 right-4 w-2 h-2 bg-slate-800 rotate-45"></span>
              <span class="block font-bold text-white mb-1">One Save, one visit</span>
              Saves the periodontal chart and this diagnosis together — the same Save as the
              one on the chart page, not a separate one for the worksheet.
            </span>
          </span>
        </div>
      </div>

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

          <!-- Saving lives at the foot of the page, once, below the decisions
               it is meant to record. -->
          <h1 class="mt-1.5 text-2xl xl:text-[28px] font-bold text-slate-800 tracking-tight">
            {{ diagnosisStore.diagnosisTitle }}
          </h1>

          <p class="mt-2.5 text-[12px] text-slate-400">
            Measurements are read from the chart and corrected there. The tables below show where
            they fall, and the stage and grade follow from that — tick a band on any row to say a
            reading belongs elsewhere. Neither is set by hand: both are always the answer their
            own rows add up to, so a diagnosis never leaves the record without its criteria.
          </p>

          <!-- TAP 2023 step 1. The readings alone can fail this and the patient
               still have periodontitis, so it is said and not enforced. -->
          <p
            v-if="!findings.meetsCaseDefinition"
            class="mt-2.5 flex items-start gap-2 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2"
          >
            <TriangleAlert class="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              These readings do not meet the case definition of periodontitis on their own — it
              asks for interdental CAL of 2 mm or more at two teeth that are not neighbours, or
              buccal / oral CAL of 3 mm or more at two sites probing over 3 mm. The staging below
              still follows what is recorded.
            </span>
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
              <span class="relative group inline-flex">
                <button
                  type="button"
                  class="text-slate-400 hover:text-slate-600 focus:text-slate-600 outline-none"
                  aria-label="Staging rule info"
                >
                  <Info class="w-3.5 h-3.5" />
                </button>
                <span
                  class="hidden group-hover:block group-focus-within:block absolute left-1/2 -translate-x-6 top-full mt-2 z-30 w-72 p-3 rounded-xl bg-slate-800 text-white shadow-xl text-[11px] font-normal leading-relaxed"
                >
                  <span class="absolute -top-1 left-5 w-2 h-2 bg-slate-800 rotate-45"></span>
                  <span class="block font-bold text-white mb-1">Staging Rule</span>
                  Severity uses the worst affected site. Complexity can raise the stage, never lower it.
                </span>
              </span>
            </div>
          </div>

          <div
            class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-4 xl:divide-x divide-slate-100"
          >
            <DiagnosisField
              label="Interdental CAL"
              tooltip="The highest interdental attachment loss recorded in the chart. To change this value, edit the chart."
              :missing="diagnosisStore.interdentalCal === null"
            >
              <template v-if="findings.interdentalCal">
                <span :class="RECORDED">{{ diagnosisStore.interdentalCal }}</span>
                <span class="text-[12px] text-slate-500">mm</span>
                <button
                  type="button"
                  :class="CHART_LINK"
                  title="Open the tooth this was recorded at in the chart"
                  @click="openTooth(findings.interdentalCal.toothId)"
                >
                  <SquarePen class="w-3 h-3" />
                </button>
              </template>
              <button v-else type="button" :class="CHART_LINK" @click="openChartTab('chart')">
                Record in the chart <SquarePen class="w-3 h-3" />
              </button>
            </DiagnosisField>

            <DiagnosisField
              label="Max probing depth"
              class="xl:pl-6"
              tooltip="The deepest probing depth recorded in the chart. To change this value, edit the chart."
              :missing="diagnosisStore.probingDepth === null"
            >
              <template v-if="findings.probingDepth">
                <span :class="RECORDED">{{ diagnosisStore.probingDepth }}</span>
                <span class="text-[12px] text-slate-500">mm</span>
                <button
                  type="button"
                  :class="CHART_LINK"
                  title="Open the tooth this was recorded at in the chart"
                  @click="openTooth(findings.probingDepth.toothId)"
                >
                  <SquarePen class="w-3 h-3" />
                </button>
              </template>
              <button v-else type="button" :class="CHART_LINK" @click="openChartTab('chart')">
                Record in the chart <SquarePen class="w-3 h-3" />
              </button>
            </DiagnosisField>

            <DiagnosisField
              label="Furcation / mobility"
              class="xl:pl-6"
              tooltip="The most severe furcation involvement and tooth mobility recorded in the chart. To change these values, edit the chart."
            >
              <template v-if="findings.furcation">
                <span :class="RECORDED">{{ FURCATION_CLASS[findings.furcation.grade] }}</span>
                <button
                  type="button"
                  :class="CHART_LINK"
                  title="Open the tooth this was recorded at in the chart"
                  @click="openTooth(findings.furcation.toothId)"
                >
                  <SquarePen class="w-3 h-3" />
                </button>
              </template>
              <template v-if="findings.mobility">
                <!-- Extra air when furcation sits to its left, so the two
                     readings do not read as one run of text. -->
                <span :class="[RECORDED, findings.furcation && 'ml-2']">
                  Mob {{ findings.mobility.grade }}
                </span>
                <button
                  type="button"
                  :class="CHART_LINK"
                  title="Open the tooth this was recorded at in the chart"
                  @click="openTooth(findings.mobility.toothId)"
                >
                  <SquarePen class="w-3 h-3" />
                </button>
              </template>
              <span v-if="!findings.furcation && !findings.mobility" :class="RECORDED">
                None recorded
              </span>
            </DiagnosisField>

            <DiagnosisField
              label="Radiographic bone loss"
              class="xl:pl-6"
              tooltip="Bone loss at the worst site, as a percentage of the root length. The application estimates it from the attachment loss in the chart, using an average root length. Enter the value measured on the radiograph to replace the estimate."
              :hint="boneLossBand"
              :missing="diagnosisStore.boneLoss === null"
              :overridden="inputs.boneLossPercent !== null"
              @reset="inputs.boneLossPercent = null"
            >
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="Add from X-ray"
                :disabled="!editable"
                :value="diagnosisStore.boneLoss ?? ''"
                :class="[
                  QUIET_PROMPT,
                  diagnosisStore.boneLoss === null ? 'w-36' : 'w-14'
                ]"
                @input="setNumber('boneLossPercent', ($event.target as HTMLInputElement).value)"
              />
              <span
                v-if="diagnosisStore.boneLoss !== null"
                class="text-[12px] text-slate-500 whitespace-nowrap"
              >
                % at worst site
              </span>
            </DiagnosisField>

            <DiagnosisField
              label="Tooth loss cause"
              class="xl:pl-6"
              tooltip="The number of teeth lost because of periodontitis. Tooth loss counts towards the stage only when periodontitis is known to be the cause, and the chart records which teeth are missing but not why, so enter this value yourself."
              :hint="toothLossHint"
              :missing="inputs.teethLostToPerio === null"
            >
              <input
                type="number"
                min="0"
                max="32"
                step="1"
                placeholder="Add"
                :disabled="!editable"
                :value="inputs.teethLostToPerio ?? ''"
                :class="[QUIET_PROMPT, inputs.teethLostToPerio === null ? 'w-16' : 'w-12']"
                @input="setNumber('teethLostToPerio', ($event.target as HTMLInputElement).value)"
              />
              <span
                v-if="inputs.teethLostToPerio !== null"
                class="text-[12px] text-slate-500 whitespace-nowrap"
              >
                teeth lost to perio
              </span>
            </DiagnosisField>
          </div>

          <StageCriteriaTable
            :stage="diagnosisStore.finalStage"
            :marks="inputs.stageMarks"
            :resolved="diagnosisStore.stage.resolved"
            :cal="diagnosisStore.interdentalCal"
            :bone-loss-percent="diagnosisStore.boneLoss"
            :teeth-lost="diagnosisStore.teethLost"
            :complexity="diagnosisStore.complexity"
            :readonly="!editable"
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
                      The stage is taken from the single worst site, so it cannot distinguish one
                      affected tooth from a whole mouth. The extent records that: localized is
                      under 30% of the teeth, generalized is 30% or more, and a molar / incisor
                      pattern is where only molars and incisors are affected. It completes the
                      diagnosis and determines whether treatment is site-specific or full-mouth.
                    </span>
                    <span class="block mt-1.5 text-[11px] font-normal text-amber-300">
                      Molar / incisor pattern also points toward Grade C.
                    </span>
                  </span>
                </span>
              </span>
              <span class="text-[11px] text-slate-400">
                Counted from chart: {{ findings.affectedTeeth }} of
                {{ findings.remainingTeeth }} teeth affected ({{ findings.affectedPercentage }}%)
                <template v-if="diagnosisStore.extentOverridden">
                  — reads as {{ EXTENT_LABEL[diagnosisStore.suggestedExtent!].split(' (')[0] }},
                  you chose otherwise
                </template>
              </span>
            </div>
            <div class="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              <button
                v-for="option in EXTENT_OPTIONS"
                :key="option"
                type="button"
                :disabled="!editable"
                class="px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors"
                :class="[
                  !editable && 'cursor-not-allowed',
                  diagnosisStore.extent === option
                    ? 'bg-[#0052ff] text-white shadow-sm'
                    : editable
                      ? 'text-slate-500 hover:text-slate-700'
                      : 'text-slate-400',
                ]"
                :aria-pressed="diagnosisStore.extent === option"
                @click="selectExtent(option)"
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

            <!-- Not which criteria produced the stage — the table above shows
                 that, row by row — but what having it means for this patient. -->
            <p class="mt-3 text-[13px] text-slate-600 leading-relaxed">
              {{ stageMeaning }}
            </p>

            <!-- The stage carries no dropdown of its own. It is what the four
                 rows add up to, so the way to move it is to tick the row that
                 reads differently, and the answer keeps its criteria with it. -->
            <p class="mt-5 flex items-start gap-2 text-[12px] text-slate-500">
              <Lock class="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
              <span>
                The stage follows the table above. To move it, tick the band that fits on the row
                you read differently — CAL, bone loss, tooth loss or complexity.
              </span>
            </p>
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
              <span class="relative group inline-flex">
                <button
                  type="button"
                  class="text-slate-400 hover:text-slate-600 focus:text-slate-600 outline-none"
                  aria-label="Grading rule info"
                >
                  <Info class="w-3.5 h-3.5" />
                </button>
                <span
                  class="hidden group-hover:block group-focus-within:block absolute left-1/2 -translate-x-6 top-full mt-2 z-30 w-72 p-3 rounded-xl bg-slate-800 text-white shadow-xl text-[11px] font-normal leading-relaxed"
                >
                  <span class="absolute -top-1 left-5 w-2 h-2 bg-slate-800 rotate-45"></span>
                  <span class="block font-bold text-white mb-1">Grading Rule</span>
                  Every case starts at Grade B. Primary criteria move it to A or C; risk factors can
                  only shift it upward.
                </span>
              </span>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4 flex flex-col gap-3.5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="flex items-center gap-1 text-[12px] font-bold text-slate-700">
                Complexity and risk-factor input
                <span class="relative group inline-flex">
                  <button
                    type="button"
                    class="text-slate-300 hover:text-slate-500 focus:text-slate-500 outline-none"
                    aria-label="Where these answers come from"
                  >
                    <Info class="w-3 h-3" />
                  </button>
                  <span
                    class="hidden group-hover:block group-focus-within:block absolute left-1/2 -translate-x-6 top-full mt-2 z-30 w-72 p-3 rounded-xl bg-slate-800 text-white shadow-xl"
                  >
                    <span class="absolute -top-1 left-5 w-2 h-2 bg-slate-800 rotate-45"></span>
                    <span class="block text-[11px] font-bold">Where these answers come from</span>
                    <span class="block mt-1.5 text-[11px] font-normal text-white/80 leading-relaxed">
                      <span class="block">
                        · <span class="text-white">Bone loss</span> — estimated from the chart;
                        replace it with the radiograph
                      </span>
                      <span class="block">
                        · <span class="text-white">Direct evidence, smoking, diabetes</span> —
                        taken from the patient
                      </span>
                      <span class="block">
                        · <span class="text-white">Age</span> — taken from the patient record
                      </span>
                      <span class="block">
                        · <span class="text-white">Case phenotype</span> — suggested only for a
                        molar / incisor pattern; otherwise yours to assess
                      </span>
                    </span>
                  </span>
                </span>
              </span>
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
                <select
                  v-model="inputs.directEvidence"
                  :disabled="!editable"
                  :class="`${QUIET} text-right`"
                >
                  <option :value="null">Not available</option>
                  <option v-for="option in DIRECT_OPTIONS" :key="option" :value="option">
                    {{ DIRECT_EVIDENCE_LABEL[option] }}
                  </option>
                </select>
              </label>

              <label class="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <span class="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
                  <span
                    v-if="diagnosisStore.boneLoss === null"
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
                    :disabled="!editable"
                    :value="diagnosisStore.boneLoss ?? ''"
                    :class="`${QUIET_NUMBER} text-right`"
                    @input="setNumber('boneLossPercent', ($event.target as HTMLInputElement).value)"
                  />
                  <span class="text-[12px] font-bold text-slate-800">%</span>
                </span>
              </label>

              <!-- Age is the one row here the record already answers, so it is
                   read from the patient header and changed there. The input only
                   appears for a record that carries no age at all. -->
              <label class="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <span class="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
                  <span
                    v-if="diagnosisStore.age === null"
                    class="w-1.5 h-1.5 rounded-full bg-amber-400"
                  ></span>
                  Patient age
                </span>
                <span v-if="diagnosisStore.ageFromRecord" class="flex items-center gap-1.5">
                  <span :class="RECORDED">{{ diagnosisStore.age }}</span>
                  <span class="text-[12px] text-slate-500">years</span>
                  <button
                    type="button"
                    :class="CHART_LINK"
                    title="From the patient record — change it in the chart header"
                    @click="openChartTab('chart')"
                  >
                    <SquarePen class="w-3 h-3" />
                  </button>
                </span>
                <span v-else class="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="120"
                    step="1"
                    placeholder="—"
                    :disabled="!editable"
                    :value="inputs.ageYears ?? ''"
                    :class="`${QUIET_NUMBER} text-right`"
                    @input="setNumber('ageYears', ($event.target as HTMLInputElement).value)"
                  />
                  <span class="text-[12px] font-bold text-slate-800">years</span>
                </span>
              </label>

              <label class="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <span class="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
                  <span
                    v-if="!diagnosisStore.phenotype"
                    class="w-1.5 h-1.5 rounded-full bg-amber-400"
                  ></span>
                  Case phenotype
                </span>
                <select
                  :value="diagnosisStore.phenotype ?? ''"
                  :disabled="!editable"
                  :class="`${QUIET} text-right`"
                  @change="selectPhenotype(($event.target as HTMLSelectElement).value)"
                >
                  <option value="">
                    {{ diagnosisStore.suggestedPhenotype ? 'From chart' : 'Not assessed' }}
                  </option>
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
                <select
                  v-model="inputs.smoking"
                  :disabled="!editable"
                  :class="`${QUIET} text-right`"
                >
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
                <select
                  v-model="inputs.diabetes"
                  :disabled="!editable"
                  :class="`${QUIET} text-right`"
                >
                  <option :value="null">Not recorded</option>
                  <option v-for="option in DIABETES_OPTIONS" :key="option" :value="option">
                    {{ DIABETES_LABEL[option] }}
                  </option>
                </select>
              </label>
            </div>
          </div>

          <GradeCriteriaTable
            :grade="diagnosisStore.finalGrade"
            :direct-evidence="inputs.directEvidence"
            :bone-loss-percent="diagnosisStore.boneLoss"
            :age-years="diagnosisStore.age"
            :ratio="diagnosisStore.grade.ratio"
            :ratio-grade="diagnosisStore.grade.ratioGrade"
            :phenotype="diagnosisStore.phenotype"
            :phenotype-from-chart="diagnosisStore.phenotypeFromChart"
            :smoking="inputs.smoking"
            :diabetes="inputs.diabetes"
            :readonly="!editable"
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

            <!-- As with the stage: what the grade means for this patient, not
                 which rows arrived at it. -->
            <p class="mt-3 text-[13px] text-slate-600 leading-relaxed">
              {{ gradeMeaning }}
            </p>

            <!-- No dropdown here either. The grade is what the criteria arrive
                 at, so the way to move it is to change the answer that reads
                 wrong — above the table, or by ticking the row itself. -->
            <p class="mt-5 flex items-start gap-2 text-[12px] text-slate-500">
              <Lock class="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
              <span>
                The grade follows the table above. To move it, change the answer that reads wrong —
                direct evidence, bone loss, age, case phenotype, smoking or diabetes.
              </span>
            </p>
          </div>
        </section>

        <!-- Reference -->
        <section class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
          <span class="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
            Reference
          </span>
          <p class="text-[11px] text-slate-500 leading-relaxed max-w-2xl">
            Tonetti M. S., Greenwell H., Kornman K. S. (2018). Staging and grading of
            periodontitis: framework and proposal of a new classification and case definition.
            Journal of Periodontology, 89(S1), S159–S172.
          </p>
        </section>
      </template>
    </main>

    <!-- Floating Discard Changes Button -->
    <Transition name="fade">
      <div
        v-if="hasChart && !isLoading && !loadFailed && editable && diagnosisStore.hasChanges"
        class="fixed bottom-4 right-4 z-40"
      >
        <button
          type="button"
          class="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/90 hover:bg-white backdrop-blur-sm border border-slate-200/90 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50/80 rounded-full font-semibold text-xs shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer opacity-85 hover:opacity-100 group"
          title="Discard changes and restore chart defaults"
          @click="showDiscardConfirm = true"
        >
          <RotateCcw class="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 transition-transform duration-150 group-hover:-rotate-45" />
          <span>Discard</span>
        </button>
      </div>
    </Transition>

    <!-- Says out loud what the button beneath it already says: one Save, one
         visit. Same wording as the chart page's, because it is the same act. -->
    <ConfirmModal
      :show="showSaveConfirm"
      title="Save Chart"
      message="<span class='text-slate-800 font-bold text-lg block mb-1'>Save this visit?</span><span class='text-slate-500 font-normal'>This saves the periodontal chart and this diagnosis together — the same as pressing Save on the chart page. You can still click Edit to change it later.</span>"
      confirm-text="Save"
      cancel-text="Cancel"
      @confirm="confirmSave"
      @cancel="showSaveConfirm = false"
    />

    <ConfirmModal
      :show="showCancelEditConfirm"
      title="Cancel Editing"
      message="<span class='text-slate-800 font-bold text-lg block mb-1'>Are you sure you want to cancel?</span><span class='text-slate-500 font-normal'>Any unsaved changes will be lost.</span>"
      confirm-text="Discard Changes"
      cancel-text="Continue Editing"
      type="danger"
      @confirm="confirmCancelEdit"
      @cancel="showCancelEditConfirm = false"
    />

    <ConfirmModal
      :show="showDiscardConfirm"
      title="Discard changes"
      message="<span class='text-slate-800 font-bold text-lg block mb-1'>Clear everything you filled in?</span><span class='text-slate-500 font-normal'>The chart's own values come back, and every band you ticked is cleared.</span>"
      confirm-text="Discard"
      cancel-text="Cancel"
      type="danger"
      @confirm="confirmDiscard"
      @cancel="showDiscardConfirm = false"
    />
  </div>
</template>
