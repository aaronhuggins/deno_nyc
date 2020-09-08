const toString = Object.prototype.toString
const names: Record<string, boolean> = {
  '[object Int8Array]': true,
  '[object Int16Array]': true,
  '[object Int32Array]': true,
  '[object Uint8Array]': true,
  '[object Uint8ClampedArray]': true,
  '[object Uint16Array]': true,
  '[object Uint32Array]': true,
  '[object Float32Array]': true,
  '[object Float64Array]': true
}

export function isStrictTypedArray(arr: any): boolean {
  return (
    arr instanceof Int8Array ||
    arr instanceof Int16Array ||
    arr instanceof Int32Array ||
    arr instanceof Uint8Array ||
    arr instanceof Uint8ClampedArray ||
    arr instanceof Uint16Array ||
    arr instanceof Uint32Array ||
    arr instanceof Float32Array ||
    arr instanceof Float64Array
  )
}

export function isLooseTypedArray(arr: any): boolean {
  return names[toString.call(arr)]
}

export function isTypedArray(arr: any) {
  return isStrictTypedArray(arr) || isLooseTypedArray(arr)
}

isTypedArray.strict = isStrictTypedArray
isTypedArray.loose = isLooseTypedArray
