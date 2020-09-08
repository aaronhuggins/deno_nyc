async function getCmdOutput (...cmd: string[]) {
  const process = Deno.run({
    cmd,
    stderr: 'piped',
    stdout: 'piped'
  })
  const output = await process.output()

  return new TextDecoder('utf-8').decode(output)
}

async function linuxCpuCount () {
  const output = await getCmdOutput('cat', '/proc/cpuinfo')
  const processors = output.split(/\n/).filter(line => line.trim().startsWith('processor'))

  return processors.length || 1
}

async function darwinCpuCount () {
  let output = await getCmdOutput('sysctl', '-n', 'hw.logicalcpu')
  const processors = parseFloat(output.trim())

  if (Number.isNaN(processors)) {
    output = await getCmdOutput('sysctl', '-n', 'hw.ncpu')

    return parseFloat(output.trim()) || 1
  }

  return processors
}

async function windowsCpuCount () {
  const output = Deno.env.get('NUMBER_OF_PROCESSORS')

  if (typeof output === 'undefined') return 1

  return parseFloat(output.trim())
}

export async function getCpuCount () {
  const { os } = Deno.build

  try {
    switch (os) {
      case 'darwin':
        return await darwinCpuCount()
      case 'windows':
        return await windowsCpuCount()
      case 'linux':
      default:
        return await linuxCpuCount()
    }
  } catch (error) {
    // Allow user to run even without required env permission.
    if (
      typeof error.constructor === 'function' &&
      error.constructor.name === 'PermissionDenied'
    ) {
      return 1
    }

    throw error
  }
}
