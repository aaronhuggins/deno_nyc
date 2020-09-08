import { transformSync } from 'https://jspm.dev/@babel/core@7.11.6'

const input = `
function hi () {
  console.log('Hello, World!')
}
`
const opts = {
  parserOpts: {
    plugins: ['typescript']
  }
}

console.log(transformSync(input, opts))
