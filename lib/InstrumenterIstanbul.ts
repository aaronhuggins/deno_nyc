'use strict'
import { createInstrumenter, convertSourceMap  } from '../deps.ts'

export interface SourceMapOpts {
  sourceMap: any,
  registerMap: any
}

interface InstrumenterOpts {
  compact: boolean,
  preserveComments: boolean,
  produceSourceMap: boolean,
  ignoreClassMethods: any[],
  esModules: any[],
  parserPlugins: any[]
}

export interface Instrumenter {
  instrumentSync(code: string, filename: string, { sourceMap, registerMap }: SourceMapOpts): string
  lastFileCoverage(): any
}

export function InstrumenterIstanbul (options: InstrumenterOpts): Instrumenter {
  const instrumenter = createInstrumenter({
    autoWrap: true,
    coverageVariable: '__coverage__',
    embedSource: true,
    compact: options.compact,
    preserveComments: options.preserveComments,
    produceSourceMap: options.produceSourceMap,
    ignoreClassMethods: options.ignoreClassMethods,
    esModules: options.esModules,
    parserPlugins: options.parserPlugins
  })

  return {
    instrumentSync (code: string, filename: string, { sourceMap, registerMap }: SourceMapOpts): string {
      var instrumented = instrumenter.instrumentSync(code, filename, sourceMap)
      if (instrumented !== code) {
        registerMap()
      }

      // the instrumenter can optionally produce source maps,
      // this is useful for features like remapping stack-traces.
      if (options.produceSourceMap) {
        var lastSourceMap = instrumenter.lastSourceMap()
        /* istanbul ignore else */
        if (lastSourceMap) {
          instrumented += '\n' + convertSourceMap.fromObject(lastSourceMap).toComment()
        }
      }

      return instrumented
    },
    lastFileCoverage (): any {
      return instrumenter.lastFileCoverage()
    }
  }
}
