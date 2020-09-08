import { path } from './deps.ts'
import { getCpuCount } from './lib/getCpuCount.ts'
import { pMap } from './lib/pMap.ts'
import { glob } from './lib/glob.ts'
import { getCacheDir } from './lib/helpers.ts'
import { TestExclude } from './lib/TestExclude.ts'
import { Hash } from './lib/Hash.ts'
import { SourceMaps } from './lib/SourceMaps.ts'
import { InstrumenterIstanbul, Instrumenter, SourceMapOpts } from './lib/InstrumenterIstanbul.ts'
import { cachingTransform } from './lib/cachingTransform.ts'

type TransformFunction = (code: string, { filename }: { filename: string }) => string

export class NYC {
  constructor (config: any) {
    this.config = { ...config }
    this.cwd = typeof config.cwd === 'string' ? path.resolve(config.cwd) : Deno.cwd()
    this.cacheDirectory = getCacheDir(config.cacheDir)
    this.cache = Boolean(this.cacheDirectory && config.cache)
    this._eagerInstantiation = config.eager as boolean || false
    this._instrumenterLib = InstrumenterIstanbul
    this._sourceMap = typeof config.sourceMap === 'boolean' ? config.sourceMap : true

    this.extensions = new Array<string>().concat(Array.isArray(config.extension) ? config.extension : [])
      .concat('.js')
      .map(ext => ext.toLowerCase())
      .filter((item, pos, arr) => arr.indexOf(item) === pos)

    this.exclude = new TestExclude({
      cwd: this.cwd,
      include: config.include,
      exclude: config.exclude,
      excludeNodeModules: config.excludeNodeModules !== false,
      extension: this.extensions
    })

    this.transforms = this.extensions.reduce((transforms, ext) => {
      transforms[ext] = this._createTransform(ext)
      return transforms
    }, {} as Record<string, TransformFunction>)

    this.sourceMaps = new SourceMaps({
      cache: this.cache,
      cacheDirectory: this.cacheDirectory
    })

    this.hashCache = {}
    this.fakeRequire = false // null
    this._instrumenter = undefined as unknown as Instrumenter
  }

  config: any
  cwd: string
  cacheDirectory: string
  cache: boolean
  exclude: TestExclude
  extensions: string[]
  fakeRequire: boolean
  transforms: Record<string, TransformFunction>
  hashCache: Record<string, string>
  sourceMaps: SourceMaps
  private _eagerInstantiation: boolean
  private _instrumenterLib: typeof InstrumenterIstanbul
  private _instrumenter: Instrumenter
  private _sourceMap: boolean

  instrumenter (): Instrumenter {
    return typeof this._instrumenter === 'object'
      ? this._instrumenter
      : this._instrumenter = this._createInstrumenter()
  }

  async instrumentAllFiles (input: string, output: string) {
    let inputDir = '.' + path.sep
    const visitor = async (relFile: string) => {
      const inFile = path.resolve(inputDir, relFile)
      const inCode = await Deno.readTextFile(inFile)
      const resultCode = this._transform(inCode, inFile)
      const outCode = typeof resultCode === 'string' ? resultCode : inCode

      if (output) {
        const { mode } = await Deno.stat(inFile)
        const outFile = path.resolve(output, relFile)

        await Deno.mkdir(path.dirname(outFile), { recursive: true })
        await Deno.writeTextFile(outFile, outCode)
        if (typeof mode === 'number') {
          await Deno.chmod(outFile, mode)
        }
      } else {
        console.log(outCode)
      }
    }

    // this._loadAdditionalModules() // is this even needed?

    const stats = await Deno.lstat(input)

    if (stats.isDirectory) {
      inputDir = input

      const filesToInstrument = await this.exclude.glob(input)

      const concurrency = typeof output === 'string' ? (await getCpuCount()) : 1

      if (this.config.completeCopy && output) {
        const files = await glob(path.resolve(input, '**'), {
          dot: true,
          nodir: true,
          ignore: ['**/.git', '**/.git/**', path.join(output, '**')]
        })
        const destDirs = new Set(
          files.map((src: string) => path.dirname(path.join(output, path.relative(input, src))))
        )

        await pMap(
          destDirs,
          (dir: string) => Deno.mkdir(path.dirname(dir), { recursive: true }),
          { concurrency }
        )
        await pMap(
          files,
          (src: string) => Deno.copyFile(src, path.join(output, path.relative(input, src))),
          { concurrency }
        )
      }

      await pMap(filesToInstrument, visitor, { concurrency })
    } else {
      await visitor(input)
    }
  }

  private _transform (code: string, filename: string): string | void {
    const extname = path.extname(filename).toLowerCase()
    const transform = typeof this.transforms[extname] === 'function'
      ? this.transforms[extname]
      : (() => {})

    return transform(code, { filename })
  }

  private _createTransform (ext: string) {
    const opts: any = {
      salt: Hash.salt(this.config),
      hashData: (input: any, metadata: { filename: string }) => [metadata.filename],
      filenamePrefix: (metadata: { filename: string }) => path.parse(metadata.filename).name + '-',
      onHash: (input: any, metadata: { filename: string }, hash: string) => {
        this.hashCache[metadata.filename] = hash
      },
      cacheDir: this.cacheDirectory,
      // when running --all we should not load source-file from
      // cache, we want to instead return the fake source.
      disableCache: this._disableCachingTransform(),
      ext: ext
    }

    if (this._eagerInstantiation) {
      opts.transform = this._transformFactory(this.cacheDirectory)
    } else {
      opts.factory = this._transformFactory.bind(this)
    }

    return cachingTransform(opts)
  }

  private _disableCachingTransform () {
    return !(this.cache && this.config.isChildProcess)
  }

  private _transformFactory (cacheDir?: string) {
    const instrumenter = this.instrumenter()
    let instrumented

    return (code: string, metadata: { filename: string }, hash: string) => {
      const filename = metadata.filename
      const sourceMap = this._getSourceMap(code, filename, hash)

      try {
        instrumented = instrumenter.instrumentSync(code, filename, sourceMap)
      } catch (e) {
        // debugLog('failed to instrument ' + filename + ' with error: ' + e.stack)
        if (this.config.exitOnError) {
          console.error('Failed to instrument ' + filename)
          console.error(e)
          if (typeof window.onunload === 'function') window.onunload({} as any)
          Deno.exit(1)
        } else {
          if (this.config.verboseError) {
            console.error('Failed to instrument ' + filename)
            console.error(e)
          }
          instrumented = code
        }
      }

      if (this.fakeRequire) {
        return 'function x () {}'
      } else {
        return instrumented
      }
    }
  }

  private _createInstrumenter (): Instrumenter {
    return this._instrumenterLib({
      ignoreClassMethods: new Array<string>().concat(this.config.ignoreClassMethod || []).filter(a => !!a),
      produceSourceMap: this.config.produceSourceMap,
      compact: this.config.compact,
      preserveComments: this.config.preserveComments,
      esModules: this.config.esModules,
      parserPlugins: Array.isArray(this.config.parserPlugins)
        ? this.config.parserPlugins.concat('typescript')
        : ['typescript']
    })
  }

  private _getSourceMap (code: string, filename: string, hash: string): SourceMapOpts {
    const sourceMap: SourceMapOpts = {} as any

    if (this._sourceMap) {
      sourceMap.sourceMap = this.sourceMaps.extract(code, filename)
      sourceMap.registerMap = () => this.sourceMaps.registerMap(filename, hash, sourceMap.sourceMap)
    } else {
      sourceMap.registerMap = () => {}
    }

    return sourceMap
  }
}
