// @deno-types='./types/import-any.d.ts'
import schemaImp from 'https://jspm.dev/@istanbuljs/schema'
// @deno-types="https://unpkg.com/@types/minimatch@3.0.3/index.d.ts"
import minimatchImp from 'https://jspm.dev/minimatch@3.0.4'
// @deno-types="https://unpkg.com/@types/imurmurhash@0.1.1/index.d.ts"
import imurmurhashImp from 'https://jspm.dev/imurmurhash@0.1.4'
// @ts-ignore
// @deno-types="https://unpkg.com/@types/istanbul-lib-coverage@2.0.3/index.d.ts"
import libCoverageImp from 'https://jspm.dev/istanbul-lib-coverage@3.0.0'

// @deno-types='./types/istanbul-lib-source-maps.d.ts'
export { createSourceMapStore } from 'https://jspm.dev/istanbul-lib-source-maps@4.0.0'
// @deno-types='./types/istanbul-lib-instrument.d.ts'
export { createInstrumenter } from 'https://jspm.dev/istanbul-lib-instrument@4.0.3'
// @deno-types="https://unpkg.com/@types/convert-source-map@1.5.1/index.d.ts"
export * as convertSourceMap from 'https://jspm.dev/convert-source-map@1.7.0'

export * as path from 'https://deno.land/std@0.68.0/path/mod.ts'
export { parse } from 'https://deno.land/std@0.68.0/flags/mod.ts'
export { walk } from 'https://deno.land/std@0.68.0/fs/walk.ts'
export { createHash } from 'https://deno.land/std@0.68.0/hash/mod.ts'
export { generate as uuidv4 } from 'https://deno.land/std@0.68.0/uuid/v4.ts'

export const schema = schemaImp as any
export const minimatch = minimatchImp as Function
export const MurmurHash3 = imurmurhashImp as Function
export const createCoverageMap = libCoverageImp.createCoverageMap
