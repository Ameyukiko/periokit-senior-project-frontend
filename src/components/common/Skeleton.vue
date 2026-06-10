<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string
  height?: string
  animation?: 'pulse' | 'shimmer' | 'none'
  customClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'text',
  animation: 'shimmer',
  customClass: ''
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'circular':
      return 'rounded-full'
    case 'rectangular':
      return 'rounded-none'
    case 'rounded':
      return 'rounded-xl'
    case 'text':
    default:
      return 'rounded-md h-4'
  }
})

const animationClasses = computed(() => {
  if (props.animation === 'pulse') {
    return 'animate-pulse bg-slate-200/80'
  }
  if (props.animation === 'shimmer') {
    return 'shimmer-loader bg-slate-200/60'
  }
  return 'bg-slate-200/80'
})

const styles = computed(() => {
  const s: Record<string, string> = {}
  if (props.width) s.width = props.width
  if (props.height) s.height = props.height
  return s
})
</script>

<template>
  <div
    :class="[
      'inline-block w-full',
      variantClasses,
      animationClasses,
      customClass
    ]"
    :style="styles"
  />
</template>

<style scoped>
.shimmer-loader {
  position: relative;
  overflow: hidden;
}

.shimmer-loader::after {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  transform: translateX(-100%);
  background-image: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.4) 20%,
    rgba(255, 255, 255, 0.7) 60%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: shimmer 1.6s infinite;
  content: '';
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
