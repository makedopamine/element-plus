import type { InjectionKey } from 'vue'
import type { SelectContext, SelectGroupContext } from './types'

// For individual build sharing injection key, we had to make `Symbol` to string
export const selectGroupKey: InjectionKey<SelectGroupContext> =
  Symbol('ElSelectGroup')

export const selectKey: InjectionKey<SelectContext> = Symbol('ElSelect')
