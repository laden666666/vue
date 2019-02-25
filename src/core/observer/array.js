/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
// 克隆一个数组的原型
export const arrayMethods = Object.create(arrayProto)

/**
 * Intercept mutating methods and emit events
 */
// 将可将数组元素变化的方法全部放增加def，这样如果用户是使用这些方法是数组元素发生变化的，可以对外发出消息。
// 需要注意一点是，数组通过[]索引是没有响应式的，一般数组是依赖整个数组，和索引无关。同时用[]修改数组，也不触发数据的dep的notify
;[
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]
.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  // 重写数组原型上的方法
  def(arrayMethods, method, function mutator (...args) {
    const result = original.apply(this, args)
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    if (inserted) ob.observeArray(inserted)
    // notify change
		// 执行notify，相当于数组的setter
    ob.dep.notify()
    return result
  })
})
