<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'

const props = defineProps<{
  enableAutoFit?: boolean
}>()

const containerRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const scale = ref(1)
const scaledHeight = ref(0)

const calculateScale = () => {
  if (!props.enableAutoFit) {
    scale.value = 1
    scaledHeight.value = 0
    return
  }
  
  if (containerRef.value && contentRef.value) {
    const containerWidth = containerRef.value.clientWidth
    // Temporarily remove scale to measure true width
    const currentTransform = contentRef.value.style.transform
    contentRef.value.style.transform = 'none'
    
    const contentWidth = contentRef.value.scrollWidth
    const contentHeight = contentRef.value.scrollHeight
    
    // Restore transform
    contentRef.value.style.transform = currentTransform
    
    if (contentWidth > 0 && containerWidth < contentWidth) {
      // Calculate scale to fit width exactly
      scale.value = containerWidth / contentWidth
      scaledHeight.value = contentHeight * scale.value
    } else {
      scale.value = 1
      scaledHeight.value = contentHeight
    }
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      calculateScale()
    })
    resizeObserver.observe(containerRef.value)
  }
  // Initial calculation
  nextTick(calculateScale)
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

watch(() => props.enableAutoFit, calculateScale)
</script>

<template>
  <div ref="containerRef" class="w-full overflow-hidden origin-top-left transition-all duration-300" :style="scaledHeight > 0 ? { height: `${scaledHeight}px` } : {}">
    <div 
      ref="contentRef" 
      class="origin-top-left transition-transform duration-300 min-w-max"
      :style="{ transform: `scale(${scale})` }"
    >
      <slot />
    </div>
  </div>
</template>
