import manifest from '../manifest.ts'

export const DENO_ISTANBUL_COVERAGE_VERSION = '4.0.3'
export const DENO_NYC_VERSION = manifest.version
export const DENO_NYC_OUTPUT = '.nyc_output'
export const DENO_NYC_CACHE = DENO_NYC_OUTPUT + '/.cache'
export const DENO_NYC_INSTRUMENT = DENO_NYC_OUTPUT + '/.instrumented'
export const DENO_NYC_CONFIG = '.nycrc'
