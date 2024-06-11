import path from 'path'
// import ts from 'typescript'
import { Project, SyntaxKind } from 'ts-morph'
import type MarkdownIt from 'markdown-it'
import {
  ExportedDeclarations,
  SourceFile,
  Statement,
  TypeNode,
  TypeFormatFlags,
} from 'ts-morph'
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

      if (twoslashBlock && detailedType) {
        const sn = variableStatements.length + 1
        const variableName = `variableName${sn}`
        const variableStatement = `let ${variableName}:${detailedType}`
        tips.set(variableName, { token, briefType })
        variableStatements.push(variableStatement)
      } else {
        token.content = `<api-typing type="${briefType}"/>`
      }
    }

    if (twoslashBlock) {
      const sourceCode = twoslashBlock.content + variableStatements.join('\n')
      const sourceFile = project.createSourceFile(`${env.path}.ts`, sourceCode)
      const locals = sourceFile.getLocals()
      const variableDeclarations = sourceFile.getVariableDeclarations()
      variableDeclarations.forEach((variableDeclaration) => {
        const typeNode = variableDeclaration.getTypeNode()!
        let typeText = typeNode.getText()
        const details: { text: string; type?: 'reference' }[] = []
        ;(
          ((typeNode as any).getTypeNodes?.() as TypeNode[]) ?? [typeNode]
        ).forEach((node) => {
          const text = node.getText()
          if (node.getKind() === SyntaxKind.IndexedAccessType) {
            const tsTypeChecker = project.getTypeChecker().compilerObject
            const isEnum =
              tips.get(variableDeclaration.getName())?.briefType === 'enum'
            typeText = tsTypeChecker.typeToString(
              tsTypeChecker.getTypeAtLocation(node.compilerNode),
              undefined,
              isEnum
                ? TypeFormatFlags.InTypeAlias |
                    TypeFormatFlags.UseSingleQuotesForStringLiteralType
                : undefined
            )
          } else if (
            node.getKind() === SyntaxKind.TypeReference &&
            locals.some((l) => l.getName() === node.getText())
          ) {
            const [firstPart, secondPart] = typeText.split(text)
            details.push(
              {
                text: firstPart,
              },
              {
                text,
                type: 'reference',
              }
            )
            typeText = secondPart
          }
        })
        details.push({ text: typeText })
        const variableName = variableDeclaration.getName()
        const { token, briefType } = tips.get(variableName)!
        token.content = `<api-typing type="${briefType}" :details="[${details
          .map((value) => {
            return `{ text: '${value.text.replace(/'/g, "\\'")}' ${
              value.type ? `, type: '${value.type}'` : ''
            }}`
          })
          .join(',')}]"/>`
      })
      const importDeclarations = sourceFile.getImportDeclarations()
      if (importDeclarations.length > 0) {
        const sourceFiles = new Set<SourceFile>()
        const exportedDeclarations = new Set<ExportedDeclarations>()
        importDeclarations.forEach((importDeclaration) => {
          const namedImports = importDeclaration.getNamedImports()
          const exported = importDeclaration
            .getModuleSpecifierSourceFile()!
            .getExportedDeclarations()
          Array.from(exported)
            .filter(([name]) =>
              namedImports.some((namedImport) => namedImport.getName() === name)
            )
            .forEach(([, [exportedDeclaration]]) => {
              const sourceFile = exportedDeclaration.getSourceFile()
              exportedDeclarations.add(exportedDeclaration)
              sourceFiles.add(sourceFile)
            })
        })
        const importedText = Array.from(sourceFiles)
          .map(
            (sourceFile) =>
              `// ---cut-start---\n// @filename: ${path.relative(
                path.resolve('.'),
                sourceFile.getFilePath()
              )}\n${sourceFile
                .getStatements()
                .map((statement) => {
                  return exportedDeclarations.has(statement)
                    ? `// ---cut-end---\n${statement.getText()}\n// ---cut-start---`
                    : statement.getText()
                })
                .join('\n')}\n// ---cut-end---`
          )
          .join('\n')
        twoslashBlock.content = `${importedText}\n// @filename: virtualFile.ts\n${
          twoslashBlock.content
        }\n${variableStatements.join('\n')}`
      }
      project.removeSourceFile(sourceFile)
    }
    return render(tokens, options, env)
  }
}
