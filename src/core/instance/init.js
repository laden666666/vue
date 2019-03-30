/* @flow */

/**
 * vue真正的初始化，被vue的构造函数调用
 */
import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

//vue实例的id的种子
let uid = 0

// 在Vue原型上面定义_init
export function initMixin (Vue: Class<Component>) {
  // _init是vue原型上的私有方法，是vue真正的实例化方法。相当于jq的init方法
  // _init会定义_uid，初始化事件、Provide、render、Injections等等，还会执行beforeCreate和created两个生命周期
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
		// 当前的Vue（VueComponent）的实例id
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      // 在非生产环境并且启用了performance的情况下，用performance的mark获取运行时间，记录控件的创建和结束时间
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
		// _isVue应该是一个证明当对象是一个Vue（VueComponent）的实例，相当于vm instanseof Vue
    vm._isVue = true
		
    // merge options
		// _isComponent
		// ？？？？？？？？？？？？？？？？
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
			// 优化内部组件实例化，因为动态选项合并非常缓慢，并且没有内部组件选项需要特殊处理。
      initInternalComponent(vm, options)
    } else {
			// 使用mergeOptions合并options。将构造器保存的默认配置（包括vue.extend继承的配置），和用户初始化配置合并
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
			// 如果是非生产模式，会用一个proxy代理vm，用于提示访问的属性名没有在vm上面定义的情况。仅在支持proxy语法时候这样提示
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
		
    // expose real self
		// 定义私有变量_self
    vm._self = vm
		// 初始化生命周期
    initLifecycle(vm)
		// 初始化事件
    initEvents(vm)
		// 定义_c和$createElement。以及$attrs和$listeners
    initRender(vm)
		// beforeCreate里面，没有定义如ico和props、data等内容，仅定义了事件，生命周期（不定义也用不了beforeCreate）等内容
    callHook(vm, 'beforeCreate')
		// 初始化ioc
    initInjections(vm) // resolve injections before data/props
		// 初始化计算值，data，watch，方法等内容
    initState(vm)
		// 获取Provide
    initProvide(vm) // resolve provide after data/props
		// 全部初始化完成，调用created
    callHook(vm, 'created')

    /* istanbul ignore if */
		// 在非生产环境下，打印性能标记
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

		// 将vm mount到el上面
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  opts.parent = options.parent
  opts.propsData = options.propsData
  opts._parentVnode = options._parentVnode
  opts._parentListeners = options._parentListeners
  opts._renderChildren = options._renderChildren
  opts._componentTag = options._componentTag
  opts._parentElm = options._parentElm
  opts._refElm = options._refElm
  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

// 从Vue或子类的类（函数）获取options。Ctor是vue的或vue的vue.extend定义的子类
export function resolveConstructorOptions (Ctor: Class<Component>) {
	// 子类自身配置
  let options = Ctor.options
	
	// 如果有超类，递归将所有超类的配置合并
  if (Ctor.super) {
		// 获取超类的options
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
		
		// 如果缓存的options不等于缓存的options，说明超类的options已经修改，需要重新生成超类的options。并将新的superOptions保存
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
			// 获取变化的内容，需要注意两点。1
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
				// 将变化的值保存到extendsoptions中，为什么？？？？
				// 为了下次再创建提升性能？？？？
				// 但是在extend时候变化是不合并到extendsoptions中，仅在父类的options变化时候才合并，为什么？？？？
        extend(Ctor.extendOptions, modifiedOptions)
      }
			// 将合并的值保存到options里面。注意options的地址改变了
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
			// 如果options有name，把name保存，用于递归控件解析的时候用
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

// latest已经不是最新的options，将latest中，和sealed不同的地方取出来，然后保存到modified中返回。
function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const extended = Ctor.extendOptions
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = dedupe(latest[key], extended[key], sealed[key])
    }
  }
  return modified
}

// options的合并，将extended和sealed合并到latest里面。
// 可以将latest、extended、sealed中不是数组的转为数组，并最终合并
function dedupe (latest, extended, sealed) {
  // compare latest and sealed to ensure lifecycle hooks won't be duplicated
  // between merges
  if (Array.isArray(latest)) {
    const res = []
    sealed = Array.isArray(sealed) ? sealed : [sealed]
    extended = Array.isArray(extended) ? extended : [extended]
    for (let i = 0; i < latest.length; i++) {
      // push original options and not sealed options to exclude duplicated options
      if (extended.indexOf(latest[i]) >= 0 || sealed.indexOf(latest[i]) < 0) {
        res.push(latest[i])
      }
    }
    return res
  } else {
    return latest
  }
}
