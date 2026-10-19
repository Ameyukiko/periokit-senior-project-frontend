<script setup lang="ts">
defineProps<{
  buccalPD?: string[]
  innerSurfacePD?: string[]
  buccalCAL?: string[]
  innerSurfaceCAL?: string[]
  innerSurfaceLabel: string
  extracted?: boolean
}>()

const pdColorClass = (value: string) => Number.parseInt(value, 10) > 4 ? 'text-red-500' : 'text-[#0052ff]'
</script>

<template>
  <section :class="{ 'bg-slate-800/30 opacity-70 pointer-events-none': extracted }">
    <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4">PD</h3>
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-center group hover:border-[#0052ff]/20 transition-all">
        <div class="text-2xl font-black mb-1 flex items-center justify-center gap-0.5">
          <span
            v-for="(val, i) in buccalPD"
            :key="i"
            :class="pdColorClass(val)"
          >
            {{ val }}{{ Number(i) < 2 ? '-' : '' }}
          </span>
        </div>
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buccal (mm)</p>
      </div>

      <div class="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-center group hover:border-[#0052ff]/20 transition-all">
        <div class="text-2xl font-black mb-1 flex items-center justify-center gap-0.5">
          <span
            v-for="(val, i) in innerSurfacePD"
            :key="i"
            :class="pdColorClass(val)"
          >
            {{ val }}{{ Number(i) < 2 ? '-' : '' }}
          </span>
        </div>
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ innerSurfaceLabel }} (mm)</p>
      </div>
    </div>
  </section>

  <section :class="{ 'bg-slate-800/30 opacity-70 pointer-events-none': extracted }">
    <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4">CAL</h3>
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-center group hover:border-[#0052ff]/20 transition-all">
        <div class="text-2xl font-black mb-1 flex items-center justify-center gap-0.5">
          <span
            v-for="(val, i) in buccalCAL"
            :key="i"
            class="text-[#0052ff]"
          >
            {{ val }}{{ Number(i) < 2 ? '-' : '' }}
          </span>
        </div>
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buccal (mm)</p>
      </div>

      <div class="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-center group hover:border-[#0052ff]/20 transition-all">
        <div class="text-2xl font-black mb-1 flex items-center justify-center gap-0.5">
          <span
            v-for="(val, i) in innerSurfaceCAL"
            :key="i"
            class="text-[#0052ff]"
          >
            {{ val }}{{ Number(i) < 2 ? '-' : '' }}
          </span>
        </div>
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ innerSurfaceLabel }} (mm)</p>
      </div>
    </div>
  </section>
</template>
