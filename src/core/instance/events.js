/* @flow */

/**
 * 初始化vue原型上的事件方法
 */
import {
  tip,
  toArray,
  hyphenate,
  handleError,
  formatComponentName
} from '../util/index'
import { updateListeners } from '../vdom/helpers/index'

export function initEvents (vm: Component) {
  // 一个私有属性，做什么的？？？？？？？？？？？？？？？？？？？？
  vm._events = Object.create(null)
  // 同样不知道是做什么的？？？？？？？？？？？？？？、
  vm._hasHookEvent = false
  // init parent attached events
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}

let target: Component

function add (event, fn, once) {
  if (once) {
    target.$once(event, fn)
  } else {
    target.$on(event, fn)
  }
}

function remove (event, fn) {
  target.$off(event, fn)
}

export function updateComponentListeners (
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  target = vm
  updateListeners(listeners, oldListeners || {}, add, remove, vm)
}

// 扩展vue原型的方法。定义了原型的事件方法
export function eventsMixin (Vue: Class<Component>) {
	// 如果是hook开头，可以注册生命周期事件，https://cn.vuejs.org/v2/guide/components-edge-cases.html#%E7%A8%8B%E5%BA%8F%E5%8C%96%E7%9A%84%E4%BA%8B%E4%BB%B6%E4%BE%A6%E5%90%AC%E5%99%A8
  const hookRE = /^hook:/
  // 注意event是事件名或者是事件名的数组
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        this.$on(event[i], fn)
      }
    } else {
      // 把事件名保存到_events里面对应事件的函数数组里面
      // 这种写法很短小，我在工作中经常遇到这种场景，可以借鉴这种写法。不过可读性差
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      // 如果有事件使用hook:开头，标记一下
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }

  // 不支持事件名是一个数组？？？？？？？？？？？？？
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this

		// 就是调用$on，并自定义一个cb，里面调用$off和原cb
    function on () {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    on.fn = fn
    vm.$on(event, on)
    return vm
  }

  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // all
    // 如果没有事件名参数，清除所用事件
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // array of events
		// 如果事件名是一个数组，将数组里面的事件名一个个清除
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        this.$off(event[i], fn)
      }
      return vm
    }
    // specific event
    // 如果event事件名未注册事件，直接反会
    const cbs = vm._events[event]
    if (!cbs) {
      return vm
    }

    // 如果event注册了事件，且只有一个参数，没有指定fn，清空事件列表
    if (arguments.length === 1) {
      vm._events[event] = null
      return vm
    }
		
		// 否则仅清空指定的fn
    if (fn) {
      // specific handler
      let cb
      let i = cbs.length
      while (i--) {
        cb = cbs[i]
        if (cb === fn || cb.fn === fn) {
          cbs.splice(i, 1)
          break
        }
      }
    }
    return vm
  }

	//事件名不区分大小写
  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    if (process.env.NODE_ENV !== 'production') {
      const lowerCaseEvent = event.toLowerCase()
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      for (let i = 0, l = cbs.length; i < l; i++) {
        try {
          // 依次调用注册的事件回调函数。注意这是一个同步调用。也就是说emit执行后，所有的cb已经执行完成
          cbs[i].apply(vm, args)
        } catch (e) {
          handleError(e, vm, `event handler for "${event}"`)
        }
      }
    }
    return vm
  }
}
