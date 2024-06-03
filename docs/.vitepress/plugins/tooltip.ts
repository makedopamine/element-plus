import ts from 'typescript'
import type MarkdownIt from 'markdown-it'

export default (md: MarkdownIt): void => {
  const render = md.renderer.render.bind(md.renderer)
  md.renderer.render = (tokens, options, env) => {
    const tooltipRegExp = /^\^\[([^\]]*)\](`[^`]*`)?/
    const declarationBlock = tokens.find(
      (t) => t.type === 'fence' && t.info === 'ts'
    )
    const tooltips: [string, SymbolDisplayPart[]][] = []
    if (declarationBlock) {
      const variableStatements: string[] = []
      for (const token of tokens) {
        if (token.type !== 'inline') continue

        const str = token.content
        if (!tooltipRegExp.test(str)) continue

        const result = str.match(tooltipRegExp)
        if (!result) continue

        const sn = variableStatements.length + 1
        const identifier = `identifier${sn}`
        const type = (result[2] || '').replace(/^`(.*)`$/, '$1')
        const variableStatement = `let ${identifier}:${type}`
        variableStatements.push(variableStatement)
        // token.type = 'html_inline'
        // token.content = `<twoslash>${identifier}</twoslash>`
      }
      const sourceCode =
        declarationBlock.content + variableStatements.join('\n')
      const compilerOptions = {
        target: ts.ScriptTarget.ES2015,
        paths: {
          'element-plus': ['../packages/element-plus'],
          '~/*': ['./.vitepress/vitepress/*'],
        },
        types: ['../typings/components'],
      }
      const compilerHost: ts.CompilerHost =
        ts.createCompilerHost(compilerOptions)
      const readFile = compilerHost.readFile
      compilerHost.readFile = (fileName: string) => {
        if (fileName === 'virtualFile.ts') return sourceCode
        return readFile(fileName)
      }
      const program = ts.createProgram(
        ['virtualFile.ts'],
        compilerOptions,
        compilerHost
      )
      const typeChecker = program.getTypeChecker()
      const sourceFile = program.getSourceFile(
        'virtualFile.ts'
      )! as ts.SourceFile & { locals: ts.SymbolTable }
      const importDeclaration = sourceFile.statements.find(
        (t) => t.kind === ts.SyntaxKind.ImportDeclaration
      ) as ts.ImportDeclaration | undefined
      const variableDeclarations = sourceFile.statements
        .filter((t) => t.kind === ts.SyntaxKind.VariableStatement)
        .map((v) => (v as ts.VariableStatement).declarationList.declarations[0])
      variableDeclarations.forEach((v) => {
        const type = typeChecker.getTypeAtLocation(v)
        const displayParts = ts.typeToDisplayParts(typeChecker, type)
        tooltips.push([v.name.getText(), displayParts])
      })
      if (importDeclaration) {
        declarationBlock.content = declarationBlock.content.slice(
          Math.max(0, importDeclaration.end)
        )
        const imports =
          importDeclaration.importClause?.namedBindings?.elements.map((t) => {
            return t.name.text
          })
        const exports = typeChecker.getSymbolAtLocation(
          importDeclaration.moduleSpecifier
        )?.exports
        if (imports && exports) {
          for (const i of imports) {
            const exportedSymbol = exports.get(i)
            if (!exportedSymbol) continue

            const typeAliasDeclaration = exportedSymbol.declarations![0]
            const text = (typeAliasDeclaration?.parent as ts.SourceFile).text
              .slice(typeAliasDeclaration.pos, typeAliasDeclaration.end)
              .replace('export', '')
            declarationBlock.content = `${text}\n${declarationBlock?.content}`
          }
        }
      }
    }
    env.tooltips = tooltips
    // tooltips.forEach(([identifier, displayParts]) => {
    //   const tooltipContent = displayParts.map((displayPart) => {
    //     if (
    //       displayPart.kind === 'aliasName' ||
    //       displayPart.kind === 'interfaceName'
    //     ) {
    //       return `<a href="javascript:document.getElementById('type-${displayPart.text}').scrollIntoView({behavior: 'smooth', block: 'center'})">${displayPart.text}</a>`
    //     }
    //     return displayPart.text
    //   })
    //   html = html.replace(
    //     `<twoslash>${identifier}</twoslash>`,
    //     tooltipContent.join('')
    //   )
    // })

    return render(tokens, options, env)
  }
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
    debugger
    const tooltips = state.env.tooltips

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
