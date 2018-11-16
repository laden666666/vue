/* @flow */

import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError
} from '../util/index'

import type { ISet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
// 对一个表达式的计算，该表达式可能是一个计算值或者是template里面的表达式，也可能是一个响应式的对象的getter。计算表达式的过程中会收集该表达式依赖的其他表达式，这些表达式也封装到一个watch对象中，并进一步封装为dep对象，最终收集的是dep对象
export default class Watcher {
  // 控件实例，每个watch都绑定到一个vue实例上面
  vm: Component;
  // eval表达式
  expression: string;
  // 更新时的回调
  cb: Function;
  // uid
  id: number;
  // 是否深度？？？？？？？？？？？？？？
  deep: boolean;
  // 是否是用户创建的watch，如果是用户创建出错了仅会警告不会抛错
  user: boolean;
  // 是否懒执行，如果立刻执行会马上计算一次value
  lazy: boolean;
  // 是否是异步的？？？
  sync: boolean;
  // ？？？？
  dirty: boolean;
  // 是否激活中？？？
  active: boolean;
  // 当前watcher依赖哪些其他watcher。先收集依赖watcher的dep到这个数组中，再由dep的target就知道依赖的watcher了。
  deps: Array<Dep>;
  // ？？？？
  newDeps: Array<Dep>;
  // deps的id集合，提升查询效率
  depIds: ISet;
  // 应该也是提升newDeps查询效率的
  newDepIds: ISet;
  // 应该是个私有变量，用于计算value，并且可以确定watcher都依赖哪些watcher。
  getter: Function;
  // 上一次计算好的值
  value: any;

  constructor (
    // 必须传入
    vm: Component,
    // 表达式，是函数，或者是一个路径字符串，用于表示监听vm的data例值的名称
    expOrFn: string | Function,
    // 是更新时的回调
    cb: Function,
    options?: Object
  ) {
    this.vm = vm
    // 给一个类增加watcher
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
    } else {
      // 默认都是false
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    // 使用自定义的Set代替浏览器的Set，减少打包的大小
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
	// 如果是表达式的watch，getter等于表达式。如果是响应式对象的watcher，getter等于由属性名生成的属性获取函数
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
	  // 如果因为属性名不合法，就用一个空函数做获取函数
      if (!this.getter) {
        this.getter = function () {}
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    // 如果是延时计算，value的值先不计算出来
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  // 通过getter计算value，计算前会将该watcher压入全局watcher栈栈顶，然后再执行getter计算，这样调用了哪个有watcher属性或表示式，该表示式或属性的watcher的dep就会被栈顶的watch（也就是当前watcher）收集到。该方法应该也是个私有方法
  get () {
    // 先this压入全局的dep栈的栈顶，以便dep收集依赖哪些dep，从而知道该watcher依赖哪些watcher
    pushTarget(this)
    let value
    const vm = this.vm
    try {
		// 调用getter计算value
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
	  // 
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  // 当dep发现依赖于当前watch（在栈顶）时候，会调用当前addDep方法，将穷加入到newDeps中，等待scheduler进一步处理。同时也会把自己放入dep的subs中
  addDep (dep: Dep) {
	//
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  // 更新依赖列表。当重新计算value的时候，先将新发现的依赖放入newDeps中，然后清空原依赖列表，这样就移除了不再依赖的watcher了。最后再将newdeps放入deps中
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
	
	// 交换depIds和newDepIds的实例，避免创建新实例或数据复制，从而提升运行效率 
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  // 当watch依赖的watch改变的时候，其watch会通过update通知该watch，重新计算
  // ???????????????
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
		// 如果是延时计算，会不立刻run，之后evaluate再执行run
      this.dirty = true
    } else if (this.sync) {
		// 如果是同步执行run
      this.run()
    } else {
		// 放入队列中执行
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  // 公有方法，给Scheduler job调用的接口。
  // 该方法调用get计算value，并通过对比value和上一次计算是否发生变化，从而确定是否执行cb
  run () {
	// 只计算active的watch
    if (this.active) {
      const value = this.get()
      if (
        value !== this.value ||
		// ？？？？？？？？？为什么新值计算了就要触发watch？？
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
		// 重点语句：watch触发的策略
        // set new value
		// 触发watch的cb前，先将新值赋给value
        const oldValue = this.value
        this.value = value
		
		// 如果是用户方法，出错要提示
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  // 调用deps列表，使其再一次压入栈顶的deps里面，有什么用？？？？？？？？？？？
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  // 销毁自身
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 */
// 递归遍历一个对象以唤起所有转换的getter，以便将对象内的每个嵌套属性收集为“深度”依赖项
const seenObjects = new Set()
function traverse (val: any) {
  seenObjects.clear()
  _traverse(val, seenObjects)
}

function _traverse (val: any, seen: ISet) {
  let i, keys
  const isA = Array.isArray(val)
  if ((!isA && !isObject(val)) || !Object.isExtensible(val)) {
    return
  }
  if (val.__ob__) {
    const depId = val.__ob__.dep.id
    if (seen.has(depId)) {
      return
    }
    seen.add(depId)
  }
  if (isA) {
    i = val.length
    while (i--) _traverse(val[i], seen)
  } else {
    keys = Object.keys(val)
    i = keys.length
    while (i--) _traverse(val[keys[i]], seen)
  }
}
