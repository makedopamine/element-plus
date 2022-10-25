import { withInstall, withNoopInstall } from '@element-plus/utils'
import Button from './src/button.tsx'
import ButtonGroup from './src/button-group.vue'

export const ElButton = withInstall(Button, {
  ButtonGroup,
})
export const ElButtonGroup = withNoopInstall(ButtonGroup)
export default ElButton

export * from './src/button'
export type { ButtonInstance, ButtonGroupInstance } from './src/instance'
