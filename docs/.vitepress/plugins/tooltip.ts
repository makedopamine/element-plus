import ts from 'typescript'
import type MarkdownIt from 'markdown-it'
import { Project } from 'ts-morph'
import type { SourceFile, TypeNode } from 'ts-morph'
import path from 'path'

const project = new Project({
  tsConfigFilePath: './tsconfig.json',
})

export default (md: MarkdownIt): void => {
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
        const sourceFiles = new Map<SourceFile, string[]>()
        importDeclarations.forEach((importDeclaration) => {
          const namedImports = importDeclaration.getNamedImports()
          const exported = importDeclaration
            .getModuleSpecifierSourceFile()!
            .getExportedDeclarations()
          Array.from(exported)
            .filter(([name]) =>
              namedImports.some((namedImport) => namedImport.getName() === name)
            )
            .forEach(([name, exportedDeclarations]) => {
              const exportedDeclaration = exportedDeclarations[0]
              const sourceFile = exportedDeclaration.getSourceFile()
              const index = sourceFile
                .getStatements()
                .findIndex((statement) => statement === exportedDeclaration)
              try {
                // sourceFile.insertStatements(index + 1, '// ---cut-start---\n')
                // sourceFile.insertStatements(index, '// ---cut-end---\n')
              } catch (e) {
                console.log(e)
              }
              sourceFiles.get(sourceFile)
                ? sourceFiles.get(sourceFile).push(name)
                : sourceFiles.set(sourceFile, [name])
            })
        })
        // d.getText().replace(/export\s*/, '')
        const importedText = Array.from(sourceFiles)
          .map(
            ([sourceFile]) =>
              `\n// @filename: ${sourceFile
                .getFilePath()
                .replace(
                  'D:/github-pr/ep-pr/element-plus/',
                  '../'
                )}\n${sourceFile.getText()}\n`
          )
          .join('\n')
        twoslashBlock.content =
          importedText +
          '\n' +
          `\n// @filename: virtualFile.ts\n${twoslashBlock.content}\n` +
          variableStatements.join('\n')
        console.log('start!!!!\n' + twoslashBlock.content)
      }
    }

    return render(tokens, options, env)
  }
}
