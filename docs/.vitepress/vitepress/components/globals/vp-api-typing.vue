<script setup lang="ts">
import { computed } from 'vue'
import { Warning } from '@element-plus/icons-vue'
import { useLang } from '../../composables/lang'
import apiTypingLocale from '../../../i18n/component/api-typing.json'
import type { PropType } from 'vue'

defineProps({
  type: String,
  details: Object as PropType<{ text: string; type?: 'reference' }[]>,
})

const lang = useLang()
const detail = computed(() => apiTypingLocale[lang.value].detail)
const toTarget = (text) => {
  document
    ?.getElementById(`type-${text}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
</script>

<template>
  <span class="inline-flex items-center">
    <code class="api-typing mr-1">
      {{ type }}
    </code>
    <ClientOnly>
      <ElTooltip v-if="details" effect="light" trigger="click">
        <ElButton
          text
          :icon="Warning"
          :aria-label="detail"
          class="p-2 text-4"
        />
        <template #content>
          <slot>
            <div class="m-1" style="max-width: 600px">
              <code
                style="
                  color: var(--code-tooltip-color);
                  background-color: var(--code-tooltip-bg-color);
                "
              >
                <template v-for="(item, index) in details">
                  <a
                    v-if="item.type === 'reference'"
                    :key="index"
                    @click="toTarget(item.text)"
                    >{{ item.text }}
                  </a>
                  <span v-else :key="`span${index}`">
                    {{ item.text }}
                  </span>
                </template>
              </code>
            </div>
          </slot>
        </template>
      </ElTooltip>
    </ClientOnly>
  </span>
</template>
