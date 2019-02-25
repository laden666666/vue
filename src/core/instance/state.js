/* @flow */

// 定义和数据相关的内容,例如data
import config from '../config'
import Dep from '../observer/dep'
import Watcher from '../observer/watcher'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,
  del,
  observe,
  observerState,
  defineReactive
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute
} from '../util/index'

// 默认的defineProperty的属性
const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

/**
 * 一个代理模式，将target的sourceKey属性，代理到target上面。
 */
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  if (opts.props) initProps(vm, opts.props)
  if (opts.methods) initMethods(vm, opts.methods)
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  if (opts.computed) initComputed(vm, opts.computed)
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}

function initProps (vm: Component, propsOptions: Object) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  const keys = vm.$options._propKeys = []
  const isRoot = !vm.$parent
  // root instance props should be converted
  observerState.shouldConvert = isRoot
  for (const key in propsOptions) {
    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      defineReactive(props, key, value, () => {
        if (vm.$parent && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  observerState.shouldConvert = true
}

// 初始化data，与initState不同，该函数作用于实例
// ????????????????????????????????? _data和$data以及 _props和$props
function initData (vm: Component) {
  let data = vm.$options.data
	
	// 对于根控件，data是一个对象，非根控件，data是一个工厂函数（因为费根控件会创建多个）
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  const keys = Object.keys(data)
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length
  while (i--) {
    const key = keys[i]
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {
			// 如果命名和法，将其定义在原型的_data对象上面
      proxy(vm, `_data`, key)
    }
  }
  // observe data
	// 将data对象转为observe对象
  observe(data, true /* asRootData */)
}

function getData (data: Function, vm: Component): any {
  try {
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  }
}

const computedWatcherOptions = { lazy: true }

// 初始化一个对象的计算值
function initComputed (vm: Component, computed: Object) {
	// 创建一个缓存计算值的watch的地方
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  const isSSR = isServerRendering()

	// 定义计算值
  for (const key in computed) {
		
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

		// 只有在非ssr情况下，定义watch。
    if (!isSSR) {
      // create internal watcher for the computed property.
      watchers[key] = new Watcher(
        vm,
				// 用getter做表达式
        getter || noop,
        noop,
				// 计算值是lazy属性的
        computedWatcherOptions
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
			// 在原型上定义真正的getter和setter。原型上的getter和setter访问实例的_computedWatchers，获取计算好的结果
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
			// 如果计算值命名和data和props重复，给出警告
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}

// 定义计算值，计算值都是定义在原型上
export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
	// 在非ssr环境下需要换成。如果不缓存，不会生成watcher，而是每一次都计算表达式
  const shouldCache = !isServerRendering()
	
	if (typeof userDef === 'function') {
		// 标准形式，计算值是一个函数
		// 如果需要换成，使用createComputedGetter定义getter
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : userDef
    sharedPropertyDefinition.set = noop
  } else {
		// 高级形式，计算值是一个对象，包括get和set
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : userDef.get
      : noop
    sharedPropertyDefinition.set = userDef.set
      ? userDef.set
      : noop
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

// 定义getter，用一个新的watch代替原有getter()，这样原有getter运行完会生成一个结果值，并且这个表达式会依赖心创建的watch。
// 只有getter产生watch，setter由用户自动改变数据源更新
function createComputedGetter (key) {
	// 返回一个计算好的getter
  return function computedGetter () {
		// 从缓存的watch中取出watch
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
			// 如果还未计算，立刻计算，因为watch是lazy的，所以第一次访问是未计算值的
      if (watcher.dirty) {
        watcher.evaluate()
      }
			
			// 调用depend，让缓存的值依赖此depend
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}

// 初始化方法
function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      if (methods[key] == null) {
        warn(
          `Method "${key}" has an undefined value in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
			
			// 如果方法和props重名，发出警告
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
			// 方法名禁止用_和$开头，因为_是系统私有命名空间，$是系统公有命名空间，防止冲突。不过公有应该对外开放才对？？？？？？？？？？？？
      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
		
		// 注意方法不是绑定在原型上，而是实例上面
    vm[key] = methods[key] == null ? noop : bind(methods[key], vm)
  }
}

// 初始化watch
function initWatch (vm: Component, watch: Object) {
  for (const key in watch) {
    const handler = watch[key]
		// 如果是一个数组，表示一个watch注册了很多cb，一个个创建
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

// 创建watch
function createWatcher (
  vm: Component,
  keyOrFn: string | Function,
  handler: any,
  options?: Object
) {
	// 如果handle是一个对象，真正的cb是handler函数，否则其极速handler函数
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
	
	// 如果handler是一个字符串，表示回调是一个vm的函数。vm已经执行了initMethods？？？
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
	// 确保handler是一个函数。使用vm原型上的watch初始化真正的watcher
  return vm.$watch(keyOrFn, handler, options)
}

// 初始化$data和$props。
// 对外暴露的props和data定义在原型上，通过这些getter去取$props和$data里面的同名值，而$props和$data也定义在原型上，在通过getter取_props的值。这样的好处是props定义在原型上面，而$props可以对用户暴露
// 对外包暴露的data，定义在实例上面，通过
export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {}
  dataDef.get = function () { return this._data }
  const propsDef = {}
  propsDef.get = function () { return this._props }
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function (newData: Object) {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
		// props不可用修改
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
	
	// 在原型上定义$data和$props的getter和setter
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

	// 在原型上定影set和del函数
  Vue.prototype.$set = set
  Vue.prototype.$delete = del

	// 真正的定义watch的地方
  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this,
		
		// 如果cb是一个对象，先由createWatcher格式化，然后在createWatcher再调用$watch初始化
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
		// 用户注册的watch，一定是user
    options.user = true
		
		// 用一个watcher对象，实现监听
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      cb.call(vm, watcher.value)
    }
		
		// 返回一个销毁函数
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}
