'use strict'
import { path } from '../deps.ts'
import { hasha } from './helpers.ts'
import { writeFile as writeFileAtomic } from './writeFileAtomic.ts'

let ownHash = ''

function getOwnHash() {
	ownHash = hasha(Deno.readFileSync(import.meta.url), { algorithm: 'sha256' }) as string

	return ownHash
}

export function cachingTransform(opts: any) {
	if (!(opts.factory || opts.transform) || (opts.factory && opts.transform)) {
		throw new Error('Specify factory or transform but not both')
	}

	if (typeof opts.cacheDir !== 'string' && !opts.disableCache) {
		throw new Error('cacheDir must be a string')
	}

	opts = {
		ext: '',
		salt: '',
		hashData: () => [],
		filenamePrefix: () => '',
		onHash: () => {},
		...opts
	}

	let transformFn = opts.transform
	const {factory, cacheDir, shouldTransform, disableCache, hashData, onHash, filenamePrefix, ext, salt} = opts
	const cacheDirCreated = opts.createCacheDir === false
	let created = transformFn && cacheDirCreated
	const encoding = opts.encoding === 'buffer'
		? undefined
		: opts.encoding || 'utf8'

	function transform (input: any, metadata: any, hash?: string) {
		if (!created) {
			if (!cacheDirCreated && !disableCache) {
				Deno.mkdirSync(cacheDir, { recursive: true })
			}

			if (!transformFn) {
				transformFn = factory(cacheDir)
			}

			created = true
		}

		return transformFn(input, metadata, hash)
	}

	return function (input: any, metadata: any) {
		if (shouldTransform && !shouldTransform(input, metadata)) {
			return input
		}

		if (disableCache) {
			return transform(input, metadata)
		}

		const data = [
			ownHash || getOwnHash(),
			input,
			salt,
			...[].concat(hashData(input, metadata))
		]
		const hash = hasha(data, { algorithm: 'sha256' }) as string
		const cachedPath = path.join(cacheDir, filenamePrefix(metadata) + hash + ext)

		onHash(input, metadata, hash)

		let result
		let retry = 0
		/* eslint-disable-next-line no-constant-condition */
		while (true) {
			try {
				const buf = Deno.readFileSync(cachedPath)

				if (encoding === 'buffer') {
					return buf
				}

				return new TextDecoder(encoding)

			} catch (_) {
				if (!result) {
					result = transform(input, metadata, hash)
				}

				try {
					writeFileAtomic.sync(cachedPath, result, {encoding})
					return result
				} catch (error) {
					/* Likely https://github.com/npm/write-file-atomic/issues/28
					 * Make up to 3 attempts to read or write the cache. */
					retry++
					if (retry > 3) {
						throw error
					}
				}
			}
		}
	}
}
