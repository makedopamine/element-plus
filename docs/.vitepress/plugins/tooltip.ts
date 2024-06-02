import type ts from 'typescript'
import type MarkdownIt from 'markdown-it'

export default (md: MarkdownIt): void => {
  md.renderer.rules.tooltip = (tokens, idx) => {
    const token = tokens[idx]

    return `<api-typing type="${token.content}" details="${token.info}" />`
  }

  md.inline.ruler.before('emphasis', 'tooltip', (state, silent) => {
    const tooltipRegExp = /^\^\[([^\]]*)\](`[^`]*`)?/
    const str = state.src.slice(state.pos, state.posMax)

    if (!tooltipRegExp.test(str)) return false
    if (silent) return true

    const result = str.match(tooltipRegExp)

    if (!result) return false

    const token = state.push('tooltip', 'tooltip', 0)
    token.content = result[1].replace(/\\\|/g, '|')
    token.info = (result[2] || '').replace(/^`(.*)`$/, '$1')
    token.level = state.level
    state.pos += result[0].length

    return true
  })
}

interface SymbolDisplayPart {
  text: string
  kind: string
}
declare module 'typescript' {
  function typeToDisplayParts(
    typechecker: ts.TypeChecker,
    type: ts.Type,
    enclosingDeclaration?: ts.Node,
    flags?: ts.TypeFormatFlags
  ): Array<SymbolDisplayPart>
}
