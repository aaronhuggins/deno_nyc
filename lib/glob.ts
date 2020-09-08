import { path, walk } from '../deps.ts'

export interface GlobOptions {
  cwd?: string
  dot?: boolean
  nodir?: boolean
  ignore?: string[]
}

export async function glob (input: string | string[], options: GlobOptions): Promise<string[]> {
  const inputs = typeof input === 'string' ? [input] : input
  const cwd = typeof options.cwd === 'string' ? options.cwd : Deno.cwd()
  const fileEntries = walk(cwd, {
    match: inputs.map(item => path.globToRegExp(item)),
    skip: Array.isArray(options.ignore) ? options.ignore.map(item => path.globToRegExp(item)) : undefined,
    includeDirs: options.nodir
  })
  const files: string[] = []

  for await (const fileEntry of fileEntries) {
    if (fileEntry.isFile) {
      files.push(fileEntry.path)
    }
  }

  return files
}
