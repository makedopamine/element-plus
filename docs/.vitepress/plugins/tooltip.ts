import ts from 'typescript'
import type MarkdownIt from 'markdown-it'
import {} from 'vue'

export default (md: MarkdownIt): void => {
  const render = md.renderer.render.bind(md.renderer)
  md.renderer.render = (tokens, options, env) => {
    const tooltipRegExp = /^\^\[([^\]]*)\](`[^`]*`)?/
    const declarationBlock = tokens.find(
      (t) => t.type === 'fence' && t.info === 'ts twoslash'
    )
    if (declarationBlock) {
      const tips = new Map<
        string,
        { token: typeof tokens[number]; briefType: string }
      >()
      const variableStatements: string[] = []
      for (const token of tokens) {
        if (token.type !== 'inline') continue

        const str = token.content
        if (!tooltipRegExp.test(str)) continue

        const result = str.match(tooltipRegExp)
        if (!result) continue

        const briefType = result[1].replace(/\\\|/g, '|')
        let detailedType = (result[2] || '').replace(/^`(.*)`$/, '$1')
        if (detailedType) {
          const sn = variableStatements.length + 1
          const identifier = `identifier${sn}`
          const variableStatement = `let ${identifier}:${detailedType}`
          tips.set(identifier, { token, briefType })
          variableStatements.push(variableStatement)
        } else {
          token.type = 'html_inline'
          token.content = `<api-typing type="${briefType}"/>`
        }
      }
      const sourceCode =
        declarationBlock.content + variableStatements.join('\n')
      const compilerOptions: ts.CompilerOptions = {
        baseUrl: '.',
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
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
        const detailedType = v.type!.getText()
        const details = (v.type!.types ?? [v.type]).reduce((res, type) => {
          const targetType = type.getText()
          if (
            type.kind === ts.SyntaxKind.TypeReference &&
            sourceFile.locals.get(targetType)
          ) {
            res = res.replace(
              targetType,
              encodeURIComponent(
                `<a href="javascript:document.getElementById('type-${targetType}').scrollIntoView({behavior: 'smooth', block: 'center'})">${targetType}</a>`
              )
            )
          }
          return res
        }, detailedType)
        const identifier = v.name.getText()
        const { token, briefType } = tips.get(identifier)!
        token.type = 'html_inline'
        token.content = `<api-typing type="${briefType}" details="${details}"/>`
      })
      debugger
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

    return render(tokens, options, env)
  }
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
