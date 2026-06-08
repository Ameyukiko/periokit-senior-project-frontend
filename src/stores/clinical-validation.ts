import { defineStore } from 'pinia'
import type { Surface, ToothId } from '@/domain/chart/chart.types'
import { registerSessionClearListener } from '@/services/session'

type ValidationState = 'valid' | 'invalid' | 'none'

interface ClinicalValidationState {
  validationStates: Record<string, ValidationState>
}

export const useClinicalValidationStore = defineStore('clinicalValidation', {
  state: (): ClinicalValidationState => ({
    validationStates: {}
  }),

  getters: {
    hasInvalidFields: (state) => {
      return Object.values(state.validationStates).some(status => status === 'invalid')
    }
  },

  actions: {
    getFieldKey(toothId: ToothId | string, surface: Surface, field: string, site: number): string {
      return `${toothId}-${surface}-${field}-${site}`
    },

    getFieldValidation(toothId: ToothId | string, surface: Surface, field: string, site: number): ValidationState {
      const key = this.getFieldKey(toothId, surface, field, site)
      return this.validationStates[key] || 'none'
    },

    setFieldValidation(toothId: ToothId | string, surface: Surface, field: string, site: number, state: ValidationState) {
      const key = this.getFieldKey(toothId, surface, field, site)
      this.validationStates[key] = state
    },

    clearValidation() {
      this.validationStates = {}
    },

    clearToothValidation(toothId: ToothId | string) {
      const keysToDelete = Object.keys(this.validationStates).filter(key => key.startsWith(`${toothId}-`))
      keysToDelete.forEach(key => delete this.validationStates[key])
    }
  }
})

registerSessionClearListener(() => {
  const store = useClinicalValidationStore()
  store.clearValidation()
})