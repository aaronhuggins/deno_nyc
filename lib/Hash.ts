import { istanbulLibInstrumentPkg } from '../deps.ts'
import { DENO_NYC_VERSION } from './constants.ts'

function getInvalidatingOptions (config: any): Record<string, any> {
  return [
    'compact',
    'esModules',
    'ignoreClassMethods',
    'instrument',
    'instrumenter',
    'parserPlugins',
    'preserveComments',
    'produceSourceMap',
    'sourceMap'
  ].reduce((acc, optName) => {
    acc[optName] = config[optName]

    return acc
  }, {} as Record<string, any>)
}

export const Hash = {
  salt (config: any) {
    return JSON.stringify({
      modules: {
        'istanbul-lib-instrument': istanbulLibInstrumentPkg.version,
        nyc: DENO_NYC_VERSION
      },
      nycrc: getInvalidatingOptions(config)
    })
  }
}
