import type { ExtractPropTypes } from 'vue'
import type { SelectProps } from './select'

export interface SelectGroupContext {
  disabled: boolean
}
export interface SelectContext {
  props: ExtractPropTypes<typeof SelectProps>
  states: SelectStates
  expanded: boolean
  selectRef: HTMLElement
  optionsArray: any[]
  setSelected(): void
  onOptionCreate(vm: SelectOptionProxy): void
  onOptionDestroy(
    key: number | string | Record<string, string>,
    vm: SelectOptionProxy
  ): void
  handleOptionSelect(vm: SelectOptionProxy): void
}
export interface SelectOptionProxy {
  value: string | number | Record<string, string>
  label: string | number
  created: boolean
  disabled: boolean
  currentLabel: string
  itemSelected: boolean
  isDisabled: boolean
  visible: boolean
  hover: boolean
  select: SelectContext
  hoverItem: () => void
  updateOption: (query: string) => void
  selectOptionClick: () => void
}
export type SelectStates = {
  inputValue: string
  options: Map<string, SelectOptionProxy>
  cachedOptions: Map<string, SelectOptionProxy>
  disabledOptions: Map<string, SelectOptionProxy>
  optionValues: any[]
  selected: any
  selectionWidth: number
  calculatorWidth: number
  collapseItemWidth: number
  selectedLabel: string
  hoveringIndex: number
  previousQuery: string | null
  inputHovering: boolean
  menuVisibleOnFocus: boolean
  isBeforeHide: boolean
}
export type OptionValue = string | number | boolean | Record<string, any>
