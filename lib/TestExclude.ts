'use strict'
import { minimatch, path, schema } from '../deps.ts'
import { glob, GlobOptions } from './glob.ts'

const { defaults } = schema

function isOutsideDir (dir: string, filename: string): boolean {
  if (Deno.build.os === 'windows') {
    return !minimatch(path.resolve(dir, filename), path.join(dir, '**'), { dot: true })
  }

  return /^\.\./.test(path.relative(dir, filename))
}

function prepGlobPatterns(patterns: string[]) {
  return patterns.reduce((result, pattern) => {
    // Allow gitignore style of directory exclusion
    if (!/\/\*\*$/.test(pattern)) {
      result = result.concat(pattern.replace(/\/$/, '') + '/**')
    }

    // Any rules of the form **/foo.js, should also match foo.js.
    if (/^\*\*\//.test(pattern)) {
      result = result.concat(pattern.replace(/^\*\*\//, ''))
    }

    return result.concat(pattern)
  }, new Array<string>())
}

function getExtensionPattern(extension: string[]) {
  switch (extension.length) {
    case 0:
      return '**'
    case 1:
      return `**/*${extension[0]}`
    default:
      return `**/*{${extension.join()}}`
  }
}

export class TestExclude {
  constructor(opts = {}) {
    Object.assign(
      this,
      { relativePath: true },
      defaults.testExclude,
    )

    this.include = []
    this.exclude = []
    this.extension = []
    this.cwd = '.'

    for (const [name, value] of Object.entries(opts)) {
      if (value !== undefined) {
        this[name] = value
      }
    }

    if (typeof this.include === 'string') {
      this.include = [this.include]
    }

    if (typeof this.exclude === 'string') {
      this.exclude = [this.exclude]
    }

    if (typeof this.extension === 'string') {
      this.extension = [this.extension]
    } else if (this.extension.length === 0) {
      this.extension = false
    }

    if (Array.isArray(this.include) && this.include.length > 0) {
      this.include = prepGlobPatterns(new Array<string>().concat(this.include))
    } else {
      this.include = false
    }

    if (
      this.excludeNodeModules &&
      !this.exclude.includes('**/node_modules/**')
    ) {
      this.exclude = this.exclude.concat('**/node_modules/**')
    }

    this.exclude = prepGlobPatterns(new Array<string>().concat(this.exclude))

    this.handleNegation()
  }

  cwd: string
  exclude: string[]
  include: string[] | false
  extension: string[] | false
  [key: string]: any

  /* handle the special case of negative globs
     * (!**foo/bar); we create a new this.excludeNegated set
     * of rules, which is applied after excludes and we
     * move excluded include rules into this.excludes.
     */
  handleNegation() {
    const noNeg = (e: string) => e.charAt(0) !== '!'
    const onlyNeg = (e: string) => e.charAt(0) === '!'
    const stripNeg = (e: string) => e.slice(1)

    if (Array.isArray(this.include)) {
      const includeNegated = this.include.filter(onlyNeg).map(stripNeg)
      this.exclude.push(...prepGlobPatterns(includeNegated))
      this.include = this.include.filter(noNeg)
    }

    this.excludeNegated = this.exclude.filter(onlyNeg).map(stripNeg)
    this.exclude = this.exclude.filter(noNeg)
    this.excludeNegated = prepGlobPatterns(this.excludeNegated)
  }

  shouldInstrument(filename: string, relFile?: string) {
    if (
      this.extension &&
      !this.extension.some((ext) => filename.endsWith(ext))
    ) {
      return false
    }

    let pathToCheck = filename

    if (this.relativePath) {
      relFile = relFile || path.relative(this.cwd, filename)

      // Don't instrument files that are outside of the current working directory.
      if (isOutsideDir(this.cwd, filename)) {
        return false
      }

      pathToCheck = relFile.replace(/^\.[\\/]/, ''); // remove leading './' or '.\'.
    }

    const dot = { dot: true }
    const matches = (pattern: string) => (minimatch(pathToCheck, pattern, dot) as string)

    return (
      (!this.include || this.include.some(matches)) &&
      (!this.exclude.some(matches) || this.excludeNegated.some(matches))
    )
  }

  async glob(cwd: string = this.cwd) {
    const globPatterns = getExtensionPattern(this.extension || [])
    const globOptions: GlobOptions = {
      cwd,
      nodir: true,
      dot: true,
      /* If we don't have any excludeNegated then we can optimize glob by telling
       * it to not iterate into unwanted directory trees (like node_modules). */
      ignore: this.excludeNegated.length === 0 ? this.exclude : undefined
    }
    const list = await glob(globPatterns, globOptions)

    return list.filter((file) =>
      this.shouldInstrument(path.resolve(cwd, file))
    )
  }
}
