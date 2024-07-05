<template>
  <li
    v-show="visible"
    :id="id"
    :class="containerKls"
    role="option"
    :aria-disabled="isDisabled || undefined"
    :aria-selected="itemSelected"
    @mouseenter="hoverItem"
    @click.stop="selectOptionClick"
  >
    <slot>
      <span>{{ currentLabel }}</span>
    </slot>
  </li>
</template>

<script lang="ts" setup>
import {
  computed,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  reactive,
  toRefs,
  unref,
} from 'vue'
import { useId, useNamespace } from '@element-plus/hooks'
import { throwError } from '@element-plus/utils'
import { useOption } from './useOption'
import type { SelectOptionProxy } from './types'

const COMPONENT_NAME = 'ElOption'
defineOptions({
  name: COMPONENT_NAME,
})
const props = defineProps({
  /**
   * @description value of option
   */
  value: {
    required: true,
    type: [String, Number, Boolean, Object],
  },
  /**
   * @description label of option, same as `value` if omitted
   */
  label: [String, Number],
  created: Boolean,
  /**
   * @description whether option is disabled
   */
  disabled: Boolean,
})

const ns = useNamespace('select')
const id = useId()

const containerKls = computed(() => [
  ns.be('dropdown', 'item'),
  ns.is('disabled', unref(isDisabled)),
  ns.is('selected', unref(itemSelected)),
  ns.is('hovering', unref(hover)),
])

const states = reactive({
  index: -1,
  groupDisabled: false,
  visible: true,
  hover: false,
})

const {
  currentLabel,
  itemSelected,
  isDisabled,
  select,
  hoverItem,
  updateOption,
} = useOption(props, states)
if (!select)
  throwError(COMPONENT_NAME, 'usage: <el-select><el-option /></el-select/>')

const { visible, hover } = toRefs(states)

const vm = getCurrentInstance()!.proxy as unknown as SelectOptionProxy

select.onOptionCreate(vm)

onBeforeUnmount(() => {
  const key = vm.value
  const { selected } = select.states
  const selectedOptions: any[] = select.props.multiple ? selected : [selected]
  const doesSelected = selectedOptions.some((item) => {
    return item.value === vm.value
  })
  // if option is not selected, remove it from cache
  nextTick(() => {
    if (select.states.cachedOptions.get(key) === vm && !doesSelected) {
      select.states.cachedOptions.delete(key)
    }
  })
  select.onOptionDestroy(key, vm)
})

function selectOptionClick() {
  if (props.disabled !== true && states.groupDisabled !== true) {
    select!.handleOptionSelect(vm)
  }
}

defineExpose({
  ns,
  id,
  containerKls,
  currentLabel,
  itemSelected,
  isDisabled,
  select,
  hoverItem,
  updateOption,
  visible,
  hover,
  selectOptionClick,
  states,
})
</script>
