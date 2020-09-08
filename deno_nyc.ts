import { parse, path } from './deps.ts'
import { NYC } from './mod.ts'
import { DENO_NYC_INSTRUMENT } from './lib/constants.ts'
import { getNycConfig } from './lib/helpers.ts'

async function main () {
  const args = parse(Deno.args)
  const config = await getNycConfig()

  if (args._[0] === 'instrument') {
    const opts: any = {
      ...config,
      input: typeof args._[1] === 'string'
        ? args._[1]
        : Deno.cwd(),
      output: typeof args._[2] === 'string'
        ? args._[2]
        : DENO_NYC_INSTRUMENT,
      verboseError: args['verbose-error'],
      completeCopy: args['complete-copy'],
      exitOnError: args['exit-on-error'],
      esModules: 'module'
    }
    const nyc = new NYC(opts)

    try {
      await nyc.instrumentAllFiles(opts.input, opts.output)
    } catch (error) {
      console.log(error)
    }

    return
  }

  const opts: any = {
    ...config,
    input: Deno.cwd(),
    output: DENO_NYC_INSTRUMENT,
    verboseError: args['verbose-error'],
    exitOnError: args['exit-on-error'],
    // include: ['**/test/**'],
    // completeCopy: true,
    esModules: 'module'
  }
  const nyc = new NYC(opts)

  try {
    await nyc.instrumentAllFiles(opts.input, opts.output)
  } catch (error) {}
  
  const process = Deno.run({
    cwd: path.resolve(Deno.cwd(), DENO_NYC_INSTRUMENT),
    cmd: ['cmd', '/c', Deno.args.join(' ')],
    stderr: 'inherit',
    stdout: 'inherit',
    stdin: 'inherit'
  })
  const status = await process.status()

  if (status.code > 0) {
    Deno.exit(status.code)
  }
}

main()
