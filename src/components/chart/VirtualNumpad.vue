<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Delete, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-vue-next'

const isVisible = ref(false)
const activeInput = ref<HTMLInputElement | null>(null)

const isTouchDevice = ref(false)

onMounted(() => {
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  document.addEventListener('focusin', handleFocusIn)
  document.addEventListener('focusout', handleFocusOut)
})

onUnmounted(() => {
  document.removeEventListener('focusin', handleFocusIn)
  document.removeEventListener('focusout', handleFocusOut)
})

// When an input is focused, check if it's a chart input
const handleFocusIn = (e: FocusEvent) => {
  if (!isTouchDevice.value) return
  
  const target = e.target as HTMLElement
  if (target && target.classList.contains('chart-input') && !target.hasAttribute('readonly')) {
    activeInput.value = target as HTMLInputElement
    isVisible.value = true
  }
}

// When focus leaves, we might want to hide, BUT if we tap a numpad button,
// mousedown.prevent stops focus loss, so focusout doesn't fire.
// If focusout fires to a non-chart input or body, we hide.
const handleFocusOut = () => {
  // Use setTimeout to allow the new focus target to be established
  setTimeout(() => {
    const active = document.activeElement
    if (!active || !active.classList.contains('chart-input')) {
      isVisible.value = false
      activeInput.value = null
    }
  }, 50)
}

// Emit native input event so Vue's v-model / @input catches it
const triggerInput = (el: HTMLInputElement) => {
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

const handleKey = (key: string) => {
  if (!activeInput.value) return
  
  const el = activeInput.value
  let currentVal = el.value

  if (key === 'backspace') {
    el.value = currentVal.slice(0, -1)
  } else if (key === '-') {
    if (currentVal.startsWith('-')) {
      el.value = currentVal.slice(1) // toggle off
    } else {
      el.value = '-' + currentVal // toggle on
    }
  } else {
    // Append number
    // Some logic: if it's currently selected, replace. 
    // Standard input behavior:
    if (el.selectionStart === 0 && el.selectionEnd === currentVal.length) {
      el.value = key
    } else {
      el.value = currentVal + key
    }
  }
  
  triggerInput(el)
}

const navigate = (direction: 'left' | 'right' | 'up' | 'down') => {
  if (!activeInput.value) return
  
  const currentRect = activeInput.value.getBoundingClientRect()
  
  // Get all valid chart inputs
  const inputs = Array.from(document.querySelectorAll('.chart-input:not([readonly]):not([disabled])')) as HTMLInputElement[]
  if (inputs.length === 0) return
  
  let bestInput: HTMLInputElement | null = null
  let minDistance = Infinity

  const currentX = currentRect.left + currentRect.width / 2
  const currentY = currentRect.top + currentRect.height / 2

  inputs.forEach(input => {
    if (input === activeInput.value) return
    const rect = input.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    const dx = x - currentX
    const dy = y - currentY

    let isValidDirection = false
    
    switch (direction) {
      case 'right': isValidDirection = dx > 0 && Math.abs(dy) <= rect.height * 1.5; break; // Same rowish
      case 'left': isValidDirection = dx < 0 && Math.abs(dy) <= rect.height * 1.5; break;
      case 'down': isValidDirection = dy > 0 && Math.abs(dx) <= rect.width * 1.5; break; // Same colish
      case 'up': isValidDirection = dy < 0 && Math.abs(dx) <= rect.width * 1.5; break;
    }

    if (isValidDirection) {
      // Euclidean distance
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // We want the closest one in the primary axis, and penalize drift in the cross axis
      let adjustedDistance = distance
      if (direction === 'left' || direction === 'right') {
        adjustedDistance = Math.abs(dx) + Math.abs(dy) * 5 // Heavily penalize vertical drift
      } else {
        adjustedDistance = Math.abs(dy) + Math.abs(dx) * 5 // Heavily penalize horizontal drift
      }

      if (adjustedDistance < minDistance) {
        minDistance = adjustedDistance
        bestInput = input
      }
    }
  })

  if (bestInput) {
    (bestInput as HTMLInputElement).focus()
    // Select all text on focus for easy overwrite
    setTimeout(() => {
      (bestInput as HTMLInputElement).select()
    }, 10)
  }
}
const hideNumpad = () => {
  if (activeInput.value) {
    activeInput.value.blur()
  }
  isVisible.value = false
  activeInput.value = null
}
</script>

<template>
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    enter-from-class="translate-y-full"
    enter-to-class="translate-y-0"
    leave-active-class="transition-transform duration-200 ease-in"
    leave-from-class="translate-y-0"
    leave-to-class="translate-y-full"
  >
    <div
      v-show="isVisible"
      class="fixed bottom-0 left-0 right-0 z-[200] bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-safe rounded-t-3xl"
    >
      <!-- Accessory View (Navigation & Done) -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div class="flex items-center gap-2">
          <button @mousedown.prevent="navigate('left')" @touchstart.prevent="navigate('left')" class="p-2.5 text-slate-500 hover:text-[#0052ff] active:text-[#0052ff] bg-slate-50 active:bg-blue-50 rounded-xl transition-colors">
            <ArrowLeft class="w-5 h-5" />
          </button>
          <button @mousedown.prevent="navigate('right')" @touchstart.prevent="navigate('right')" class="p-2.5 text-slate-500 hover:text-[#0052ff] active:text-[#0052ff] bg-slate-50 active:bg-blue-50 rounded-xl transition-colors">
            <ArrowRight class="w-5 h-5" />
          </button>
          <div class="w-px h-6 bg-slate-200 mx-1"></div>
          <button @mousedown.prevent="navigate('up')" @touchstart.prevent="navigate('up')" class="p-2.5 text-slate-500 hover:text-[#0052ff] active:text-[#0052ff] bg-slate-50 active:bg-blue-50 rounded-xl transition-colors">
            <ArrowUp class="w-5 h-5" />
          </button>
          <button @mousedown.prevent="navigate('down')" @touchstart.prevent="navigate('down')" class="p-2.5 text-slate-500 hover:text-[#0052ff] active:text-[#0052ff] bg-slate-50 active:bg-blue-50 rounded-xl transition-colors">
            <ArrowDown class="w-5 h-5" />
          </button>
        </div>
        <button @mousedown.prevent="hideNumpad" @touchstart.prevent="hideNumpad" class="px-5 py-2.5 text-[#0052ff] font-bold text-sm bg-blue-50 rounded-xl active:bg-blue-100 transition-colors">
          Done
        </button>
      </div>

      <div class="p-4 max-w-md mx-auto bg-white">
        <!-- Numpad Grid (Modern Clean) -->
        <div class="grid grid-cols-4 gap-2">
          <!-- Row 1 -->
          <button @mousedown.prevent="handleKey('1')" @touchstart.prevent="handleKey('1')" class="h-[52px] bg-slate-50 border border-slate-100 rounded-2xl text-[24px] font-medium text-slate-800 active:bg-slate-200 flex items-center justify-center transition-colors">1</button>
          <button @mousedown.prevent="handleKey('2')" @touchstart.prevent="handleKey('2')" class="h-[52px] bg-slate-50 border border-slate-100 rounded-2xl text-[24px] font-medium text-slate-800 active:bg-slate-200 flex items-center justify-center transition-colors">2</button>
          <button @mousedown.prevent="handleKey('3')" @touchstart.prevent="handleKey('3')" class="h-[52px] bg-slate-50 border border-slate-100 rounded-2xl text-[24px] font-medium text-slate-800 active:bg-slate-200 flex items-center justify-center transition-colors">3</button>
          <button @mousedown.prevent="handleKey('backspace')" @touchstart.prevent="handleKey('backspace')" class="h-[52px] bg-slate-100 border border-transparent rounded-2xl text-slate-600 active:bg-slate-300 flex items-center justify-center transition-colors">
            <Delete class="w-6 h-6" />
          </button>
          
          <!-- Row 2 -->
          <button @mousedown.prevent="handleKey('4')" @touchstart.prevent="handleKey('4')" class="h-[52px] bg-slate-50 border border-slate-100 rounded-2xl text-[24px] font-medium text-slate-800 active:bg-slate-200 flex items-center justify-center transition-colors">4</button>
          <button @mousedown.prevent="handleKey('5')" @touchstart.prevent="handleKey('5')" class="h-[52px] bg-slate-50 border border-slate-100 rounded-2xl text-[24px] font-medium text-slate-800 active:bg-slate-200 flex items-center justify-center transition-colors">5</button>
          <button @mousedown.prevent="handleKey('6')" @touchstart.prevent="handleKey('6')" class="h-[52px] bg-slate-50 border border-slate-100 rounded-2xl text-[24px] font-medium text-slate-800 active:bg-slate-200 flex items-center justify-center transition-colors">6</button>
          <button @mousedown.prevent="handleKey('-')" @touchstart.prevent="handleKey('-')" class="h-[52px] bg-slate-100 border border-transparent rounded-2xl text-[24px] font-medium text-slate-600 active:bg-slate-300 flex items-center justify-center transition-colors">-</button>

          <!-- Row 3 -->
          <button @mousedown.prevent="handleKey('7')" @touchstart.prevent="handleKey('7')" class="h-[52px] bg-slate-50 border border-slate-100 rounded-2xl text-[24px] font-medium text-slate-800 active:bg-slate-200 flex items-center justify-center transition-colors">7</button>
          <button @mousedown.prevent="handleKey('8')" @touchstart.prevent="handleKey('8')" class="h-[52px] bg-slate-50 border border-slate-100 rounded-2xl text-[24px] font-medium text-slate-800 active:bg-slate-200 flex items-center justify-center transition-colors">8</button>
          <button @mousedown.prevent="handleKey('9')" @touchstart.prevent="handleKey('9')" class="h-[52px] bg-slate-50 border border-slate-100 rounded-2xl text-[24px] font-medium text-slate-800 active:bg-slate-200 flex items-center justify-center transition-colors">9</button>
          <button @mousedown.prevent="navigate('right')" @touchstart.prevent="navigate('right')" class="row-span-2 bg-[#0052ff] rounded-2xl shadow-[0_4px_14px_rgba(0,82,255,0.3)] text-[16px] font-bold text-white active:bg-[#003dbf] active:shadow-none active:scale-[0.98] flex items-center justify-center transition-all">Next</button>

          <!-- Row 4 -->
          <button @mousedown.prevent="handleKey('.')" @touchstart.prevent="handleKey('.')" class="h-[52px] bg-slate-100 border border-transparent rounded-2xl text-[24px] font-medium text-slate-600 active:bg-slate-300 flex items-center justify-center transition-colors">.</button>
          <button @mousedown.prevent="handleKey('0')" @touchstart.prevent="handleKey('0')" class="col-span-2 h-[52px] bg-slate-50 border border-slate-100 rounded-2xl text-[24px] font-medium text-slate-800 active:bg-slate-200 flex items-center justify-center transition-colors">0</button>
        </div>
      </div>
    </div>
  </Transition>
</template>
