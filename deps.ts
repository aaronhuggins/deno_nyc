import { default as schemaImp } from 'https://jspm.dev/@istanbuljs/schema'
import { default as minimatchImp } from 'https://jspm.dev/minimatch'
// import { default as cachingTransformImp } from 'https://jspm.dev/caching-transform'
import { default as istanbulLibInstrumentImp } from 'https://jspm.dev/istanbul-lib-instrument/package.json'

export { createSourceMapStore } from 'https://jspm.dev/istanbul-lib-source-maps'
export { createCoverageMap } from 'https://jspm.dev/istanbul-lib-coverage'
export { createInstrumenter } from 'https://jspm.dev/istanbul-lib-instrument'
export * as convertSourceMap from 'https://jspm.dev/convert-source-map'
export * as path from 'https://deno.land/std/path/mod.ts'
export { walk } from 'https://deno.land/std/fs/walk.ts'
export const schema = schemaImp as any
export const minimatch = minimatchImp as Function
export const cachingTransform = cachingTransformImp as Function
export const istanbulLibInstrumentPkg = istanbulLibInstrumentImp as any
