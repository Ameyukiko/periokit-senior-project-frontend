import { computed, ref } from 'vue'
import { HISTORY_MAX } from '@/domain/xray/xray.constants'







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


  function clear() {
    history.value = []
    index.value = -1
  }


  function reset() {
    clear()
    push()
  }

  return { canUndo, canRedo, push, undo, redo, clear, reset }
}
