'use strict'
import { path, MurmurHash3 } from '../deps.ts'
import { isTypedArray } from './isTypedArray.ts'

const activeFiles: Record<string, any[]> = {}

function onExit (fn: Function) {
  window.addEventListener('unload', fn as EventListener)

  return function removeListener () {
    window.removeEventListener('unload', fn as EventListener)
  }
}

function getId () {
  try {
    return Deno.pid
  } catch (e) {
    return 0
  }
}

/* istanbul ignore next */
const threadId = getId()

let invocations = 0

function getTmpname (filename: string) {
  return filename + '.' +
    MurmurHash3(import.meta.url)
      .hash(String(threadId))
      .hash(String(++invocations))
      .result()
}

function cleanupOnExit (tmpfile: string | Function) {
  return () => {
    try {
      Deno.removeSync(typeof tmpfile === 'function' ? tmpfile() : tmpfile)
    } catch (_) {}
  }
}

function serializeActiveFile (absoluteName: string): Promise<void> {
  return new Promise(resolve => {
    // make a queue if it doesn't already exist
    if (!activeFiles[absoluteName]) activeFiles[absoluteName] = []

    activeFiles[absoluteName].push(resolve) // add this job to the queue
    if (activeFiles[absoluteName].length === 1) resolve() // kick off the first one
  })
}

// https://github.com/isaacs/node-graceful-fs/blob/master/polyfills.js#L315-L342
function isChownErrOk (err: any) {
  if (err.code === 'ENOSYS') {
    return true
  }

  // Assume non-root since there's no getuid() function at this time.
  if (err.code === 'EINVAL' || err.code === 'EPERM') {
    return true
  }

  return false
}

async function writeFileAsync (filename: string, data: any, options: any = {}) {
  if (typeof options === 'string') {
    options = { encoding: options }
  }

  let fd
  let tmpfile: any
  /* istanbul ignore next -- The closure only gets called when onExit triggers */
  const removeOnExitHandler = onExit(cleanupOnExit(() => tmpfile))
  const absoluteName = path.resolve(filename)

  try {
    await serializeActiveFile(absoluteName)
    const truename = await Deno.realPath(filename).catch(() => filename)
    tmpfile = getTmpname(truename)

    if (!options.mode || !options.chown) {
      // Either mode or chown is not explicitly set
      // Default behavior is to copy it from original file
      const stats = await Deno.stat(truename).catch(() => {})
      if (stats) {
        if (options.mode == null) {
          options.mode = stats.mode
        }

        if (options.chown == null) {
          options.chown = { uid: stats.uid, gid: stats.gid }
        }
      }
    }

    fd = await Deno.open(tmpfile, { write: true, mode: options.mode })
    if (options.tmpfileCreated) {
      await options.tmpfileCreated(tmpfile)
    }
    if (isTypedArray(data)) {
      await fd.write(data)
    } else if (data !== null) {
      await fd.write(new TextEncoder().encode(String(data)))
    }

    await fd.close()
    fd = null

    if (options.chown) {
      await Deno.chown(tmpfile, options.chown.uid, options.chown.gid).catch(err => {
        if (!isChownErrOk(err)) {
          throw err
        }
      })
    }

    if (options.mode) {
      await Deno.chmod(tmpfile, options.mode).catch(err => {
        if (!isChownErrOk(err)) {
          throw err
        }
      })
    }

    await Deno.rename(tmpfile, truename)
  } finally {
    if (fd) {
      try {
        await fd.close()
      } catch (_) {}
    }
    removeOnExitHandler()
    await Deno.remove(tmpfile).catch(() => {})
    activeFiles[absoluteName].shift() // remove the element added by serializeSameFile
    if (activeFiles[absoluteName].length > 0) {
      activeFiles[absoluteName][0]() // start next job if one is pending
    } else {
      delete activeFiles[absoluteName]
    }
  }
}

export function writeFile (filename: string, data: any, options: any, callback?: Function) {
  if (options instanceof Function) {
    callback = options
    options = {}
  }

  const promise = writeFileAsync(filename, data, options)
  if (callback) {
    promise.then(callback as any, callback as any)
  }

  return promise
}

function writeFileSync (filename: string, data: any, options: any) {
  if (typeof options === 'string') {
    options = { encoding: options }
  } else if (!options) {
    options = {}
  }
  try {
    filename = Deno.realPathSync(filename)
  } catch (ex) {
    // it's ok, it'll happen on a not yet existing file
  }
  const tmpfile = getTmpname(filename)

  if (!options.mode || !options.chown) {
    // Either mode or chown is not explicitly set
    // Default behavior is to copy it from original file
    try {
      const stats = Deno.statSync(filename)
      options = { ...options }
      if (!options.mode) {
        options.mode = stats.mode
      }
      if (!options.chown) {
        options.chown = { uid: stats.uid, gid: stats.gid }
      }
    } catch (ex) {
      // ignore stat errors
    }
  }

  let fd
  const cleanup = cleanupOnExit(tmpfile)
  const removeOnExitHandler = onExit(cleanup)

  let threw = true
  try {
    fd = Deno.openSync(tmpfile, { write: true, mode: options.mode || 0o666 })
    if (options.tmpfileCreated) {
      options.tmpfileCreated(tmpfile)
    }
    if (isTypedArray(data)) {
      fd.writeSync(data)
    } else if (data != null) {
      fd.writeSync(new TextEncoder().encode(String(data)))
    }

    fd.close()
    fd = null

    if (options.chown) {
      try {
        Deno.chownSync(tmpfile, options.chown.uid, options.chown.gid)
      } catch (err) {
        if (!isChownErrOk(err)) {
          throw err
        }
      }
    }

    if (options.mode) {
      try {
        Deno.chmodSync(tmpfile, options.mode)
      } catch (err) {
        if (!isChownErrOk(err)) {
          throw err
        }
      }
    }

    Deno.renameSync(tmpfile, filename)
    threw = false
  } finally {
    if (fd) {
      try {
        fd.close()
      } catch (ex) {
        // ignore close errors at this stage, error may have closed fd already.
      }
    }
    removeOnExitHandler()
    if (threw) {
      cleanup()
    }
  }
}

writeFile.sync = writeFileSync
writeFile._getTmpname = getTmpname // for testing
writeFile._cleanupOnExit = cleanupOnExit
