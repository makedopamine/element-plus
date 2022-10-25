import {
  Text,
  computed,
  defineComponent,
  inject,
  ref,
  resolveDynamicComponent,
  unref,
} from 'vue'
import { ElIcon } from '@element-plus/components/icon'
import {
  useDeprecated,
  useDisabled,
  useFormItem,
  useGlobalConfig,
  useNamespace,
  useSize,
} from '@element-plus/hooks'
import { buttonGroupContextKey } from '@element-plus/tokens'
import { buttonEmits, buttonProps } from './button'
import { useButtonCustomStyle } from './button-custom'
import type { VNode } from 'vue'

export default defineComponent({
  name: 'ElButton',
  props: buttonProps,
  emits: buttonEmits,
  setup(props, { slots, emit, expose }) {
    useDeprecated(
      {
        from: 'type.text',
        replacement: 'link',
        version: '3.0.0',
        scope: 'props',
        ref: 'https://element-plus.org/en-US/component/button.html#button-attributes',
      },
      computed(() => props.type === 'text')
    )

    const buttonGroupContext = inject(buttonGroupContextKey, undefined)
    const globalConfig = useGlobalConfig('button')
    const ns = useNamespace('button')
    const { form } = useFormItem()
    const _size = useSize(computed(() => buttonGroupContext?.size))
    const _disabled = useDisabled()
    const _ref = ref<HTMLButtonElement>()
    let defaultSlot: VNode[] | undefined
    const _type = computed(() => props.type || buttonGroupContext?.type || '')
    const autoInsertSpace = computed(
      () =>
        props.autoInsertSpace ?? globalConfig.value?.autoInsertSpace ?? false
    )

    // add space between two characters in Chinese
    const shouldAddSpace = computed(() => {
      console.log('1')
      // const defaultSlot = slots.default?.()
      if (autoInsertSpace.value && defaultSlot?.length === 1) {
        const slot = defaultSlot[0]
        if (slot?.type === Text) {
          const text = slot.children as string
          return /^\p{Unified_Ideograph}{2}$/u.test(text.trim())
        }
      }
      return false
    })

    const buttonStyle = useButtonCustomStyle(props)

    const handleClick = (evt: MouseEvent) => {
      if (props.nativeType === 'reset') {
        form?.resetFields()
      }
      emit('click', evt)
    }

    expose({
      /** @description button html element */
      ref: _ref,
      /** @description button size */
      size: _size,
      /** @description button type */
      type: _type,
      /** @description button disabled */
      disabled: _disabled,
      /** @description whether adding space */
      shouldAddSpace,
    })
    return () => {
      console.log('2')
      defaultSlot = slots.default?.()
      const Icon = () => {
        if (props.loading) {
          return slots.loading ? (
            slots.loading()
          ) : (
            <ElIcon class={ns.is('loading')}>
              {resolveDynamicComponent(props.loadingIcon)?.render?.()}
            </ElIcon>
          )
        } else if (props.icon || slots.icon) {
          return (
            <ElIcon>
              {props.icon
                ? resolveDynamicComponent(props.icon).render?.()
                : slots.icon?.()}
            </ElIcon>
          )
        }
      }
      return (
        <button
          ref="_ref"
          class={[
            ns.b(),
            ns.m(unref(_type)),
            ns.m(unref(_size)),
            ns.is('disabled', unref(_disabled)),
            ns.is('loading', props.loading),
            ns.is('plain', props.plain),
            ns.is('round', props.round),
            ns.is('circle', props.circle),
            ns.is('text', props.text),
            ns.is('link', props.link),
            ns.is('has-bg', props.bg),
          ]}
          aria-disabled={unref(_disabled) || props.loading}
          disabled={unref(_disabled) || props.loading}
          autofocus={props.autofocus}
          type={props.nativeType}
          style={unref(buttonStyle)}
          onClick={handleClick}
        >
          <Icon />
          {slots.default ? (
            <span class={{ [ns.em('text', 'expand')]: unref(shouldAddSpace) }}>
              {defaultSlot}
            </span>
          ) : null}
        </button>
      )
    }
  },
})
