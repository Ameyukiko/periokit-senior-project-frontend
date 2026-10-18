import { onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import { useXrayBoardStore } from '@/stores/xray-board'


















export const XRAY_LEAVE_WARNING = {
  title: 'Unsaved X-ray board',
  message:
    "<span class='text-slate-800 font-bold text-lg block mb-1'>The X-ray board has unsaved changes.</span>" +
    "<span class='text-slate-500 font-normal'>Save it on the X-ray tab first, or those films and notes may be lost.</span>",
  confirmText: 'Leave',
  cancelText: 'Stay',
} as const

export function useXrayLeaveGuard() {
  const router = useRouter()
  const xrayStore = useXrayBoardStore()

  const showLeaveWarning = ref(false)



  let pendingNavigation: (() => unknown) | null = null












  const hasUnsavedBoard = () => xrayStore.editable && xrayStore.isDirty







  let bypassing = false
  const isBypassing = () => bypassing

  const navigate = (to: RouteLocationRaw, mode: 'push' | 'replace' = 'replace') => {
    bypassing = true
    const navigation = mode === 'push' ? router.push(to) : router.replace(to)
    return navigation.finally(() => {
      bypassing = false
    })
  }


  const guard = (proceed: () => unknown) => {
    if (!hasUnsavedBoard()) return proceed()




    if (showLeaveWarning.value) return
    pendingNavigation = proceed
    showLeaveWarning.value = true
  }

  const confirmLeave = async () => {
    showLeaveWarning.value = false
    const proceed = pendingNavigation
    pendingNavigation = null
    await proceed?.()
  }

  const cancelLeave = () => {
    showLeaveWarning.value = false
    pendingNavigation = null
  }


















  const historyPosition = () => {
    const position = (window.history.state as { position?: unknown } | null)?.position
    return typeof position === 'number' ? position : null
  }

  let currentPosition = historyPosition()
  const stopTrackingPosition = router.afterEach(() => {
    currentPosition = historyPosition()
  })
  onUnmounted(stopTrackingPosition)

  const isGoingBack = () => {
    const target = historyPosition()
    return target !== null && currentPosition !== null && target < currentPosition
  }


  const resumeLeaving = (to: RouteLocationNormalized, wasBack: boolean) => {
    if (!wasBack) return navigate(to.fullPath, 'push')





    bypassing = true
    const failsafe = window.setTimeout(() => {
      bypassing = false
    }, 2000)
    const stopWatching = router.afterEach(() => {
      window.clearTimeout(failsafe)
      bypassing = false
      stopWatching()
    })
    router.go(-1)
  }











  const askBeforeLeaving = (to: RouteLocationNormalized) => {



    const wasBack = isGoingBack()
    guard(() => resumeLeaving(to, wasBack))
    return false
  }

  return {
    showLeaveWarning,
    hasUnsavedBoard,
    isBypassing,
    navigate,
    guard,
    confirmLeave,
    cancelLeave,
    askBeforeLeaving,
  }
}
