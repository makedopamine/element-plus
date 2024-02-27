import ts from 'typescript'
import { createProgram } from 'vue-tsc'
import path from 'path'
import fs from 'fs-extra'
import {
  buildOutput,
  projRoot,
} from '@element-plus/build-utils'
import { pathRewriter } from '../utils'

export default async () => {
  const configPath = path.join(projRoot, 'tsconfig.web.json')
  const jsonText = fs.readFileSync(configPath, 'utf8')
  const result = ts.parseConfigFileTextToJson(configPath, jsonText)
  const config = ts.parseJsonConfigFileContent(result.config, {
    useCaseSensitiveFileNames: false,
    readDirectory: ts.sys.readDirectory,
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
  }, projRoot)
  const declarationDir = path.join(buildOutput, 'types')
  const compilerOptions = {
    ...config.options,
    declaration: true,
    emitDeclarationOnly: true,
    declarationDir
  }
  const rootNames = config.fileNames
  const host = ts.createCompilerHost(compilerOptions)

  const targetDir = path.join(declarationDir, 'packages')
  const sourceDir = path.join(targetDir, 'element-plus')
  ts.sys.writeFile = (filePath, text) => {
    if (path.normalize(filePath).startsWith(sourceDir)) {
      filePath = path.join(targetDir, path.relative(sourceDir, filePath))
    }
    fs.outputFile(filePath, pathRewriter('esm')(text), 'utf-8', (err) => {
      if (err) throw err
    })
  }

  const program = createProgram({
    host,
    rootNames,
    options: compilerOptions
  })
  program.emit()
}
