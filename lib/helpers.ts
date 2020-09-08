import { path, createHash } from '../deps.ts'
import { DENO_NYC_CACHE } from './constants.ts'
import { isTypedArray } from './isTypedArray.ts'

interface HashaOptions {
  /** @default 'hex' */
  encoding?: 'hex' | 'base64' | 'buffer'
  /** @default 'sha512' */
  algorithm?: 'md2' | 'md4' | 'md5' | 'ripemd160' | 'ripemd320' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512' | 'sha3-224' | 'sha3-256' | 'sha3-384' | 'sha3-512' | 'keccak224' | 'keccak256' | 'keccak384' | 'keccak512'
}

export function hasha (input: any, options: HashaOptions = {}) {
  const encoding = typeof options.encoding === 'undefined'
    ? 'hex'
    : options.encoding
  const algorithm = typeof options.algorithm === 'undefined'
    ? 'sha512'
    : options.algorithm
	const hash = createHash(algorithm)
	const update = (buffer: any) => {
    if (!isTypedArray(buffer)) {
      buffer = new TextEncoder().encode(String(buffer))
    }

		hash.update(buffer)
	}

	if (Array.isArray(input)) {
    for (const buffer of input) update(buffer)
	} else {
		update(input)
	}

  if (encoding === 'buffer') {
    return hash.digest()
  } else {
    return hash.toString(encoding)
  }
}

export function getCacheDir (cacheDir?: string) {
  if (typeof cacheDir === 'string') {
    const resolved = path.resolve(cacheDir)

    if (resolved.trim() !== '') {
      return resolved
    }
  }

  return DENO_NYC_CACHE
}
