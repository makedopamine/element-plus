import {
  defaultHoverInfoProcessor,
  rendererRich,
  transformerTwoslash,
} from '@shikijs/twoslash'

let currentInfo = undefined

export const renderer = rendererRich({
  hast: {
    hoverToken: {
      tagName: 'el-tooltip',
      properties: {
        effect: 'light',
      },
    },
    hoverPopup: {
      tagName: 'div',
      class: 'tooltip-code-wrapper',
    },
    hoverCompose: (parts: { token: any; popup: Element }) => {
      const triggerEl =
        currentInfo.identifierType === 'reference'
          ? {
              type: 'element',
              tagName: 'a',
              properties: {
                href: `#type-${parts.token.value}`,
              },
              children: [parts.token],
            }
          : {
              type: 'element',
              tagName: 'span',
              properties: {
                id: `type-${parts.token.value}`,
              },
              children: [parts.token],
            }
      return [
        triggerEl,
        {
          type: 'element',
          tagName: 'template',
          properties: {
            'v-slot:content': '{}',
          },
          content: {
            type: 'root',
            children: [parts.popup],
          },
          children: [],
        },
      ]
    },
  },
  processHoverInfo: (info: string) => {
    return info.startsWith('interface') ? info : defaultHoverInfoProcessor(info)
  },
})
const nodeStaticInfo = renderer.nodeStaticInfo
renderer.nodeStaticInfo = function (info, node) {
  currentInfo = {
    ...info,
    identifierType:
      this.meta.twoslash.hovers.find((i) => i.target === info.target).line ===
      info.line
        ? 'declaration'
        : 'reference',
  }
  const hast = nodeStaticInfo.call(this, info, node)
  return hast
}
const transformer = transformerTwoslash({
  renderer,
})
export default {
  ...transformer,
  preprocess(code, options) {
    const vPre = options.transformers?.find((i) => i.name === 'vitepress:v-pre')
    if (vPre)
      options.transformers?.splice(options.transformers.indexOf(vPre), 1)

    return transformer.preprocess!.call(this, code, options)
  },
}
