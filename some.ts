window.addEventListener('unload', () => console.log('hi 1'))
window.onunload = () => console.log('hi 2')

// window.onunload({} as any)
window.dispatchEvent(new Event('unload'))
Deno.exit()