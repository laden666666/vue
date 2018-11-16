/* @flow */

// 一个不可修改的空对象
export const emptyObject = Object.freeze({})

/**
 * Check if a string starts with $ or _
 */
export function isReserved (str: string): boolean {
  const c = (str + '').charCodeAt(0)
  // 0x24是$  0x5F是_
  return c === 0x24 || c === 0x5F
}

/**
 * Define a property.
 */
// Object.defineProperty的简写
export function def (obj: Object, key: string, val: any, enumerable?: boolean) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  })
}

/**
 * Parse simple path.
 */
// 一个路径取值函数，类似lodash的_.property
const bailRE = /[^\w.$]/
export function parsePath (path: string): any {
  // 如果不是字母和.的组合，直接返回，因为不是合法路径
  if (bailRE.test(path)) {
    return
  }
  const segments = path.split('.')
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]]
    }
    return obj
  }
}
