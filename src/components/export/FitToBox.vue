<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'



const props = defineProps<{ grow?: boolean }>()

const box = ref<HTMLElement | null>(null)
const inner = ref<HTMLElement | null>(null)
const zoom = ref(1)

async function fit() {
  await nextTick()
  const b = box.value
  const el = inner.value
  if (!b || !el) return
  const w = el.offsetWidth
  const h = el.offsetHeight
  if (!w || !h) return
  const k = Math.min(b.clientWidth / w, b.clientHeight / h)
  zoom.value = props.grow ? k : Math.min(1, k)
}

let ro: ResizeObserver | undefined
onMounted(() => {
  ro = new ResizeObserver(fit)
  ro.observe(box.value!)
  ro.observe(inner.value!)
  fit()
})
onUpdated(fit)
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <div ref="box" class="relative overflow-hidden flex items-center justify-center">
    <div class="shrink-0" :style="{ zoom }">
      <div ref="inner"><slot /></div>
    </div>
  </div>
</template>
