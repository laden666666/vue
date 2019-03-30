/* @flow */

import { warn } from '../util/index'
import { hasSymbol } from 'core/util/env'
import { defineReactive, observerState } from '../observer/index'

export function initProvide (vm: Component) {
  const provide = vm.$options.provide
  if (provide) {
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide
  }
}

// 初始化ioc的内容
export function initInjections (vm: Component) {
	// 根据options提供的inject配置，获取inject
  const result = resolveInject(vm.$options.inject, vm)
  if (result) {
    observerState.shouldConvert = false
    Object.keys(result).forEach(key => {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
				// inject通过resolveInject从父控件实例获取，但是如果父控件的_provided改变，inject不会自动同步过来（引用对象除外）。但是inject自身是可响应数据，因此用defineReactive定义
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
            `overwritten whenever the provided component re-renders. ` +
            `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        defineReactive(vm, key, result[key])
      }
    })
    observerState.shouldConvert = true
  }
}

// 获取ioc的内容
export function resolveInject (inject: any, vm: Component): ?Object {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    const result = Object.create(null)
		
		// 取出inject所有的key
    const keys = hasSymbol
		// 如果当前js引起支持Symbol，用反射语法，取出所有可枚举的属性。因为Object.keys取不出Symbol。因此使用反射的ownKeys
        ? Reflect.ownKeys(inject).filter(key => {
          /* istanbul ignore next */
					// 如果不可枚举，即使使用Reflect.ownKeys取出也不使用
          return Object.getOwnPropertyDescriptor(inject, key).enumerable
        })
				// 否则使用object.keys
        : Object.keys(inject)

		// 遍历所有key，创建一个result做inject注入的值，并返回
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const provideKey = inject[key].from
      let source = vm
			
			// 一直查找存在一个父控件的_provided存在指定的key的数据，赋给result
      while (source) {
        if (source._provided && provideKey in source._provided) {
          result[key] = source._provided[provideKey]
          break
        }
        source = source.$parent
      }
			
			// 如果没找到，使用default属性获取。如果没有default属性，在非生产模式下给出提示
      if (!source) {
        if ('default' in inject[key]) {
          const provideDefault = inject[key].default
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(vm)
            : provideDefault
        } else if (process.env.NODE_ENV !== 'production') {
          warn(`Injection "${key}" not found`, vm)
        }
      }
    }
    return result
  }
}
