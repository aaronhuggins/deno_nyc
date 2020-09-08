import { path, walk } from '../deps.ts'

export interface GlobOptions {
  cwd?: string
  dot?: boolean
  nodir?: boolean
  ignore?: string[]
  extensions?: string[]
}

export async function glob (input: string | string[], options: GlobOptions): Promise<string[]> {
  const inputs = typeof input === 'string' ? [input] : input
  const cwd = typeof options.cwd === 'string' ? path.resolve(options.cwd) : Deno.cwd()
  const opts = {
    match: inputs.map(item => path.globToRegExp(item)),
    skip: Array.isArray(options.ignore) ? options.ignore.map(item => path.globToRegExp(item)) : undefined,
    includeDirs: options.nodir,
    exts: options.extensions
  }
  const fileEntries = walk(cwd, opts)
  const files: string[] = []

  for await (const fileEntry of fileEntries) {
    if (fileEntry.isFile) {
      const relativeName = path.relative(cwd, fileEntry.path)

      if (typeof opts.skip !== 'undefined' && !opts.skip.map(item => item.test(relativeName)).includes(true)) {
        files.push(relativeName)
      }
    }
  }

  return files
}
