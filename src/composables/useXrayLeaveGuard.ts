import { onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import { useXrayBoardStore } from '@/stores/xray-board'

/**
 * The one question standing between an unsaved X-ray board and everything that
 * would reload it: another visit, another patient, the Back button.
 *
 * Gathered here because it is one mechanism, not several — the modal, the
 * pending action behind it, the bypass flag its own navigations carry, and the
 * history reading that decides which way "Leave" has to go. Split across a view
 * they read as unrelated flags, and a gate left open is a board lost in silence.
 *
 * The route hooks stay with the page: what counts as "the same board" is the
 * page's own question, and this answers only what to do once it is asked.
 */
export function useXrayLeaveGuard() {
  const router = useRouter()
  const xrayStore = useXrayBoardStore()

  const showLeaveWarning = ref(false)
  // What to run once the doctor agrees to leave unsaved X-ray work behind.
  // Its result is never read — router.push hands back a NavigationFailure that
  // the guard has no use for — so the action is free to return anything.
  let pendingNavigation: (() => unknown) | null = null

  /**
   * Is there anything to ask about? PER-259 §B1 gates the question on being in
   * edit mode as well as dirty. `editable` is this board's version of that: a
   * saved board is read-only until Edit is pressed, and a board that failed to
   * load is nobody's to change either.
   *
   * It is `editable` rather than `editMode` because the card's two modes assume
   * every board has already been saved once. A Draft has never been written
   * down, so `editMode` is false while the doctor is free to arrange films on
   * it — and that is exactly the board whose work has nowhere else to survive.
   */
  const hasUnsavedBoard = () => xrayStore.editable && xrayStore.isDirty

  /**
   * The page's own navigations have already been past the gate, or are the
   * gate's own doing — following a just-saved visit to its real id, blanking
   * the URL after the last tab closes. This marks them so the route guards let
   * them through instead of asking a second time about work the doctor kept.
   */
  let bypassing = false
  const isBypassing = () => bypassing

  const navigate = (to: RouteLocationRaw, mode: 'push' | 'replace' = 'replace') => {
    bypassing = true
    const navigation = mode === 'push' ? router.push(to) : router.replace(to)
    return navigation.finally(() => {
      bypassing = false
    })
  }

  /** Runs `proceed`, or asks first if there is a board that would be lost. */
  const guard = (proceed: () => unknown) => {
    if (!hasUnsavedBoard()) return proceed()
    // A question about one way out is already on screen. Whatever arrives
    // behind it is dropped rather than queued: replacing the pending answer
    // would send the doctor somewhere they were never asked about, and the
    // second route is cancelled by its own guard either way.
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

  /**
   * Whether the navigation being asked about is the browser going backwards.
   * vue-router does not say, and it changes what "Leave" has to do: cancelling
   * a Back makes the router put the current page back, so pushing the
   * destination afterwards would stack it in front of the page the doctor was
   * returning to, and Back would bring them straight here again.
   *
   * Read from the history entry rather than from a `popstate` listener. The
   * browser moves the entry before it fires the event, so by the time a guard
   * runs, `history.state.position` is already the destination's — while a push
   * or replace has not touched history yet and still reads as where we are. A
   * flag set by the listener would also survive a Back that was never asked
   * about and send the *next* navigation backwards instead.
   *
   * `position` is vue-router's own bookkeeping; if it ever stops being there,
   * every navigation reads as forward, which is what the code did before.
   */
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

  /** Goes where the cancelled navigation was heading, the way it was heading. */
  const resumeLeaving = (to: RouteLocationNormalized, wasBack: boolean) => {
    if (!wasBack) return navigate(to.fullPath, 'push')

    // `history.go` hands back no promise to close the gate with, so it is
    // closed by the navigation that follows and by a timer behind it. A gate
    // stuck open means the next unsaved board leaves without a word, which is
    // far worse than the spare history entry this avoids.
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

  /**
   * Nothing outside the chart page knows the X-ray board exists: the visit
   * drawer, the sidebar links and the browser's own Back button all go straight
   * through the router (SRS-363). Asking from a route guard rather than at each
   * call site is what covers the ones nobody has written yet.
   *
   * Leaving does not throw the board away by itself — it survives in the store
   * — but opening any other visit does, and by then the question would be on
   * the wrong page with the films already gone. This is the last moment to ask.
   */
  const askBeforeLeaving = (to: RouteLocationNormalized) => {
    // Read now, not when the doctor answers: by then the router has already put
    // the URL back and the history position no longer says where they were
    // going.
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
