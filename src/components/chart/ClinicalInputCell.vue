<script setup lang="ts">
import { computed, ref } from "vue";
import { filterNumericInput, getFieldKey, isAbnormalValue, exceedsAbsoluteLimit, getFieldDisplayName, MOBILITY_VALID_VALUES } from "../../utils/validation";

interface Props {
  toothNumber: number | string;
  sitePosition: number;
  fieldName: string;
  surface: string;
  section?: string;
  value: any;
  inputType: "numeric" | "toggle";
  validationState?: "valid" | "invalid" | "none";
  disabled?: boolean;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  validationState: "none",
  disabled: false,
  readonly: false,
});

const emit = defineEmits<{
  (e: "change", value: any): void;
  (e: "validate", state: "valid" | "invalid" | "none"): void;
}>();

// Warning state
const showWarning = ref(false);
const warningMessage = ref("");

const clearWarning = () => {
  setTimeout(() => {
    showWarning.value = false;
    warningMessage.value = "";
  }, 3000);
};

// Critical PD value (>4) - PD values greater than 4 are red
const isCriticalValue = computed(() => {
  if (props.inputType !== "numeric") return false;
  const fieldKeyInfo = getFieldKey(props.fieldName);
  // Only apply to PD field
  if (fieldKeyInfo !== "pd") return false;
  const val = parseInt(String(props.value));
  return !isNaN(val) && val > 4;
});

// Abnormal value (exceeds normal threshold but within absolute limit)
const isAbnormal = computed(() => {
  if (props.inputType !== "numeric" || !props.value) return false;
  const fieldKeyInfo = getFieldKey(props.fieldName);
  // CAL should not be styled red
  if (fieldKeyInfo === "cal") return false;
  return isAbnormalValue(String(props.value), props.fieldName);
});

const handleInput = (event: Event) => {
  if (props.disabled || props.readonly) return;
  const target = event.target as HTMLInputElement;
  const inputValue = target.value;

  if (props.inputType === "numeric") {
    const fieldKeyInfo = getFieldKey(props.fieldName);
    const allowNegative = fieldKeyInfo === "cal" || fieldKeyInfo === "rec";
    let filteredValue = filterNumericInput(inputValue, allowNegative);

    // Special validation for Mobility (Miller's Classification: 0-3 only)
    if (fieldKeyInfo === "mo" && filteredValue !== "") {
      const numVal = parseInt(filteredValue);
      if (!MOBILITY_VALID_VALUES.includes(numVal)) {
        filteredValue = "";
        target.value = "";
        warningMessage.value = `Mobility: 0-3 only`;
        showWarning.value = true;
        clearWarning();
        return;
      }
    }

    // Block values exceeding absolute limit (obviously wrong)
    if (filteredValue !== "" && exceedsAbsoluteLimit(filteredValue, props.fieldName)) {
      const absLimit = { pd: 99, rec: 99, cal: 99, mo: 3, ktw: 20, furcation: 3 };
      const limit = absLimit[fieldKeyInfo as keyof typeof absLimit] || 99;

      filteredValue = "";
      target.value = "";
      warningMessage.value = `${getFieldDisplayName(props.fieldName)}: Max ${limit}`;
      showWarning.value = true;
      clearWarning();
      return;
    }

    // Check if value is abnormal (exceeds normal range) - just show warning, don't block
    if (filteredValue !== "" && isAbnormalValue(filteredValue, props.fieldName)) {
      warningMessage.value = `${getFieldDisplayName(props.fieldName)}: ${filteredValue} (Exceeds threshold)`;
      showWarning.value = true;
      clearWarning();
      // Continue processing - don't return early
    }

    if (target.value !== filteredValue) {
      target.value = filteredValue;
    }

    // Normal value - proceed normally
    const state: "valid" | "invalid" | "none" =
      filteredValue === "" ? "none" : "valid";
    emit("validate", state);
    emit("change", filteredValue);
  }
};

const handleToggle = () => {
  if (props.disabled || props.readonly) return;
  emit("change", !props.value);
};

const toggleColorClass = computed(() => {
  if (props.inputType !== "toggle" || !props.value) return "";
  const name = props.fieldName.toLowerCase();
  if (name.includes("bop")) return props.disabled ? "bg-red-800/50" : "bg-red-500 shadow-inner";
  if (name.includes("pi")) return props.disabled ? "bg-blue-800/50" : "bg-blue-500 shadow-inner";
  return props.disabled ? "bg-slate-600/60" : "bg-slate-500";
});

const containerClasses = computed(() => ({
  "bg-slate-800/70 opacity-80 pointer-events-none": props.disabled,
  "bg-slate-50/50": props.readonly,
  "hover:bg-slate-50/80": !props.disabled && !props.readonly && props.inputType === "numeric",
}));
</script>

<template>
  <div
    class="relative flex-1 h-full min-h-6 transition-all duration-200 border-r border-slate-100 last:border-r-0 group"
    :class="containerClasses"
  >
    <!-- Numeric Input -->
    <template v-if="inputType === 'numeric'">
      <input
        type="text"
        :value="value"
        :disabled="disabled"
        :readonly="readonly"
        @input="handleInput"
        :data-tooth="toothNumber"
        :data-surface="surface"
        :data-section="section"
        :data-field="fieldName"
        :data-site="sitePosition"
        class="chart-input w-full h-full text-center text-[10px] outline-none bg-transparent transition-colors focus:bg-white z-10"
        :tabindex="readonly ? -1 : 0"
        :class="[
          isAbnormal ? 'text-red-600 font-bold' : '',
          isCriticalValue && !isAbnormal ? 'text-red-600 font-extrabold' : '',
          !isAbnormal && !isCriticalValue ? (disabled ? 'text-slate-500' : 'text-slate-700') : '',
          readonly ? 'font-bold cursor-default' : 'cursor-text font-medium',
        ]"
      />
      <!-- Warning Tooltip -->
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-1"
      >
        <div
          v-if="showWarning"
          class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-red-600 text-white text-[9px] font-bold rounded-md whitespace-nowrap z-50 shadow-lg"
        >
          {{ warningMessage }}
          <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div class="border-4 border-transparent border-t-red-600"></div>
          </div>
        </div>
      </Transition>
    </template>

    <!-- Toggle Input -->
    <template v-else-if="inputType === 'toggle'">
      <div
        @click="handleToggle"
        @keydown.enter.space.prevent="handleToggle"
        :tabindex="disabled || readonly ? -1 : 0"
        :aria-disabled="disabled || readonly"
        :data-tooth="toothNumber"
        :data-surface="surface"
        :data-section="section"
        :data-field="fieldName"
        :data-site="sitePosition"
        class="chart-input w-full h-full cursor-pointer transition-all duration-150 outline-none flex items-center justify-center focus:ring-1 focus:ring-[#0052ff] focus:ring-inset"
        :class="[toggleColorClass]"
      >
        <div v-if="value" class="w-full h-full opacity-100"></div>
        <div v-else class="w-1.5 h-1.5 rounded-full transition-colors" :class="disabled ? 'bg-slate-500/40' : 'bg-slate-200/50 group-hover:bg-slate-300'"></div>
      </div>
    </template>

    <!-- Focus Indicator -->
    <div
      v-if="!disabled && !readonly"
      class="absolute inset-0 rounded-sm border border-transparent group-focus-within:border-[#0052ff] group-focus-within:shadow-[0_0_0_1px_#0052ff] pointer-events-none transition-all"
    ></div>
  </div>
</template>

