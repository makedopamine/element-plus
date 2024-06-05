import ts from 'typescript'
import type MarkdownIt from 'markdown-it'
import { Project } from 'ts-morph'
import type { TypeNode } from 'ts-morph'

export default (md: MarkdownIt): void => {
  const project = new Project({
    tsConfigFilePath: './tsconfig.json',
  })

  const render = md.renderer.render.bind(md.renderer)
  md.renderer.render = (tokens, options, env) => {
    const twoslashBlock = tokens.find(
      (t) => t.type === 'fence' && t.info === 'ts twoslash'
    )
    const variableStatements: string[] = []
    const tips = new Map<
      string,
      { token: typeof tokens[number]; briefType: string }
    >()
    const tooltipRegExp = /^\^\[([^\]]*)\](`[^`]*`)?/

    for (const token of tokens) {
      if (token.type !== 'inline') continue

      const str = token.content
      if (!tooltipRegExp.test(str)) continue

      const result = str.match(tooltipRegExp)
      if (!result) continue

      const briefType = result[1].replace(/\\\|/g, '|')
      const detailedType = (result[2] || '').replace(/^`(.*)`$/, '$1')
      token.type = 'html_inline'
      token.content = `<api-typing type="${briefType}" details="${detailedType}"/>`

      if (twoslashBlock && detailedType) {
        const sn = variableStatements.length + 1
        const variableName = `variableName${sn}`
        const variableStatement = `let ${variableName}:${detailedType}`
        tips.set(variableName, { token, briefType })
        variableStatements.push(variableStatement)
      }
    }

    let html = ''
    if (twoslashBlock) {
      const sourceCode = twoslashBlock.content + variableStatements.join('\n')
      const sourceFile = project.createSourceFile(`${env.path}.ts`, sourceCode)
      const locals = sourceFile.getLocals()
      const variableDeclarations = sourceFile.getVariableDeclarations()
      variableDeclarations.forEach((variableDeclaration) => {
        const typeNode = variableDeclaration.getTypeNode()!
        const typeText = typeNode.getText()
        const details = (
          ((typeNode as any).getTypeNodes?.() as TypeNode[]) ?? [typeNode]
        ).reduce((res, node) => {
          const text = node.getText()
          if (
            node.getKind() === ts.SyntaxKind.TypeReference &&
            locals.some((l) => l.getName() === node.getText())
          ) {
            res = res.replace(
              text,
              encodeURIComponent(
                `<a href="javascript:document.getElementById('type-${text}').scrollIntoView({behavior: 'smooth', block: 'center'})">${text}</a>`
              )
            )
          }
          return res
        }, typeText)
        const variableName = variableDeclaration.getName()
        const { token, briefType } = tips.get(variableName)!
        token.content = `<api-typing type="${briefType}" details="${details}"/>`
      })
      const importDeclarations = sourceFile.getImportDeclarations()
      if (importDeclarations.length > 0) {
        const importedText = importDeclarations
          .map((importDeclaration) => {
            const namedImports = importDeclaration.getNamedImports()
            const exports = importDeclaration
              .getModuleSpecifierSourceFile()!
              .getExportedDeclarations()
            return Array.from(exports)
              .filter(([name]) =>
                namedImports.some((n) => n.getName() === name)
              )
              .map(([, exportedDeclarations]) => {
                const exportedDeclaration = exportedDeclarations[0]
                const sf = exportedDeclaration.getSourceFile()
                const index = sf
                  .getStatements()
                  .findIndex(
                    (statement) =>
                      statement.getStart() === exportedDeclaration.getStart() &&
                      statement.getEnd() === statement.getEnd()
                  )
                try {
                  sf.insertStatements(index + 1, '// ---cut-start---\n')
                  sf.insertStatements(index, '// ---cut-end---\n')
                } catch (e) {}
                // // ${sf.getFilePath()}\n
                return `// ---cut-start---\n${sf.getText()}\n// ---cut-end---`
                //           exportedDeclaration
                // .map((d) => {
                //   d.getText().replace(/export\s*/, '')
                // })
                // .join('\n')
              })
          })
          .join('\n')
        twoslashBlock.content =
          importedText +
          '\n' +
          twoslashBlock.content.slice(
            importDeclarations[importDeclarations.length - 1].getEnd()
          )
        console.log(twoslashBlock.content)
      }
    }

    return html ?? render(tokens, options, env)
  }
}
