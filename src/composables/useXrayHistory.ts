import { computed, ref } from 'vue'
import { HISTORY_MAX } from '@/domain/xray/xray.constants'

/**
 * Undo/redo over serialised snapshots — the memento pattern, with the two ends
 * left to the caller: `take` says what a restore point is made of and `apply`
 * puts one back. Nothing here knows what is in a snapshot, so what counts as an
 * edit stays a decision of the thing being edited.
 */
export function useXrayHistory(take: () => string, apply: (snapshot: string) => void) {
  const history = ref<string[]>([])
  const index = ref(-1)

  const canUndo = computed(() => index.value > 0)
  const canRedo = computed(() => index.value < history.value.length - 1)

  function push() {
    const snap = take()
    if (history.value[index.value] === snap) return
    history.value = history.value.slice(0, index.value + 1)
    history.value.push(snap)
    if (history.value.length > HISTORY_MAX + 1) history.value.shift()
    index.value = history.value.length - 1
  }

  function undo() {
    if (!canUndo.value) return
    index.value -= 1
    apply(history.value[index.value])
  }

  function redo() {
    if (!canRedo.value) return
    index.value += 1
    apply(history.value[index.value])
  }

  /** Empties the past outright — used where the states behind us are gone. */
  function clear() {
    history.value = []
    index.value = -1
  }

  /** The same, then pins where we are now as the only step to come back to. */
  function reset() {
    clear()
    push()
  }

  return { canUndo, canRedo, push, undo, redo, clear, reset }
}
