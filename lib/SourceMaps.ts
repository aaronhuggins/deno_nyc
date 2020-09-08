'use strict'
import { path, convertSourceMap, createCoverageMap, createSourceMapStore } from '../deps.ts'
import { pMap } from './pMap.ts'
import { getCpuCount } from './getCpuCount.ts'

export class SourceMaps {
  constructor (opts: any) {
    this.cache = opts.cache
    this.cacheDirectory = opts.cacheDirectory
    this.loadedMaps = {}
    this._sourceMapCache = createSourceMapStore()
  }

  cache: boolean
  cacheDirectory: string
  loadedMaps: Record<string, any>
  private _sourceMapCache: {
    registerMap: (filename: string, sourceMap: any) => void
    transformCoverage: (input: any) => any
  }

  cachedPath (source: string, hash: string) {
    return path.join(
      this.cacheDirectory,
      `${path.parse(source).name}-${hash}.map`
    )
  }

  purgeCache () {
    this._sourceMapCache = createSourceMapStore()
    this.loadedMaps = {}
  }

  extract (code: string, filename: string) {
    const sourceMap = convertSourceMap.fromSource(code) || convertSourceMap.fromMapFileSource(code, path.dirname(filename))
    return sourceMap ? sourceMap.toObject() : undefined
  }

  registerMap (filename: string, hash: string, sourceMap: any) {
    if (!sourceMap) {
      return
    }

    if (this.cache && hash) {
      const mapPath = this.cachedPath(filename, hash)

      Deno.writeTextFileSync(mapPath, JSON.stringify(sourceMap))
    } else {
      this._sourceMapCache.registerMap(filename, sourceMap)
    }
  }

  async remapCoverage (obj: any) {
    const transformed = await this._sourceMapCache.transformCoverage(
      createCoverageMap(obj)
    )

    return transformed.data
  }

  async reloadCachedSourceMaps (report: Record<string, any>) {
    await pMap(
      Object.entries(report),
      async ([absFile, fileReport]: [string, any]) => {
        if (!fileReport || !fileReport.contentHash) {
          return
        }

        const hash = fileReport.contentHash
        if (!(hash in this.loadedMaps)) {
          try {
            const mapPath = this.cachedPath(absFile, hash)
            this.loadedMaps[hash] = JSON.parse(await Deno.readTextFile(mapPath))
          } catch (e) {
            // set to false to avoid repeatedly trying to load the map
            this.loadedMaps[hash] = false
          }
        }

        if (this.loadedMaps[hash]) {
          this._sourceMapCache.registerMap(absFile, this.loadedMaps[hash])
        }
      },
      { concurrency: await getCpuCount() }
    )
  }
}
