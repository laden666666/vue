/* @flow */

// 响应式数据有4要素： 表达式、数据源、观察者、依赖
// 表达式必须是纯函数，仅依赖其他表达式和数据源组成，因此也可以看成一个数据源
// 只有数据源可以变化，他们是一个对象（数组），当对象的值变化了，数据源就认为变化了
// 数据源（表达式）可以被依赖，可以被观察。当表达式执行的时候，可以获取依赖图（该表达式依赖哪些其他表达式或者数据源，最终会形成几个有向无环图），数据源变化的时候，会被观察者观察到，然后通知依赖，然后由依赖通知其他表达式，其他表达式会重新就算，如果值变了也认为是变化了，会继续向上通知
// 我们可以用几个有向无环图表示这个依赖关系，边是依赖指向被依赖，没有依赖其他节点就算数据源，有依赖其他节点的就是表达式，每个节点有个观察者，数据源和表达式都应该有观察者。

// vue没有完全按照我上述分析做，observer中仅定义了Watch，Dep两个对象，表示这4要素的观察者和依赖。
// 只有表达式有Watch，数据源没有watch，如果想观察数据源需要在定义一个表达式去观察。
// 同时只有Watch和数据源存在一个Dep对象，Dep仅会引用该数据源（表达式）依赖的数据源（表达式的watch）的Dep对象，而不保存依赖该数据源（表达式）或其Dep对象，这样是为了单向引用，方便垃圾回收，移除内存泄漏的风险，因为所有的Dep都保存到数据源和表达式的Watch上面了，会和表达式和数据源一起回收，同时不会阻止依赖他的表达式及其Watch和Dep回收，但是会阻止他依赖的表达式及数据源的Dep回收。

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * By default, when a reactive property is set, the new value is
 * also converted to become reactive. However when passing down props,
 * we don't want to force conversion because the value may be a nested value
 * under a frozen data structure. Converting it would defeat the optimization.
 */
// 监听一个对象，并将变化的值保存到dep中。对于普通对象，就是创建getter和setter，对于数组对象，用arrayMethods重写其数组方法，实现对齐监听？？？

// 一个响应式状态
export const observerState = {
	shouldConvert: true
}

 /**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
*/
// 响应式对象的响应工具函数，用一个Observer实例负责对一个对象或者数组监听。
// Observer里面有一个dep，该dep监听每一个子属性的变化
export class Observer {
	// 被观察对象的引用
  value: any;
	// value的dep，为什么value也需要dep？我猜是做watch的
  dep: Dep;
	// ？？？？？
  vmCount: number; // number of vms that has this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
		// 将Observer对象放到其__ob__中
    def(value, '__ob__', this)
		
		// 对该对象的所有属性做getter和setter，并递归将子对象也做Observer处理
    if (Array.isArray(value)) {
      const augment = hasProto
        ? protoAugment
        : copyAugment
      augment(value, arrayMethods, arrayKeys)
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }

  /**
   * Walk through each property and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
	// 递归给对象做响应式处理
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]])
    }
  }

  /**
   * Observe a list of Array items.
   */
  // 为数组内的对象做可响应式处理
	observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 */
// ？？？？？？？ 为了浏览器兼容这么写的，而且还没实现？？
function protoAugment (target, src: Object, keys: any) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
// 获取一个对象的Observer对象。如果该对象还不是响应书对象，会将这个普通对象变为一个响应式对象，并将Observer保存到value的__ob__属性中，方便下次获取
export function observe (value: any, asRootData: ?boolean): Observer | void {
	// 如果不是对象，或者是vnode对象，不处理
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void,
	
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
		// 如果已经处理过了就不再处理了
    ob = value.__ob__
  } else if (
    observerState.shouldConvert &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
		// 满足几个条件才可以做响应式处理
		// 1.未被处理过，如果进行过observe，就不再重新处理了
		// 2.value必须是对象类型，如对象或者数组。而且必须是可以扩展的，如果是freeze或者是不可修改的是无法通过
		// 3.服务器渲染不需要处理吗？对ssr不熟悉所有不理解为什么要这么做？？？？？？
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
// 给对象的某个属性做响应式处理，与Obsever不同，该方法仅是给属性做响应式处理。Obsever是给所有属性（数组除外）做响应式处理，内部也调用defineReactive
// 例如data返回的是一个对象，vue会将data对象里面的值依次赋给实例，赋值时候使用的是defineReactive方法。而data对象里面的对象属性做响应式处理，是defineReactive里面调用，注意每一个defineReactive都会定义一个dep，obj不产生Observer（shallow为true除外），observe会产生一个Observer，所有属性都用Observer的dep
// 另外defineReactive产生的dep在闭包里面，应该无法增加watch做sub。也证实了我在target里面的推论
export function defineReactive (
  // 做响应式的对象
  obj: Object,
	// 该对象做响应值的属性
  key: string,
	// 属性的原始值
  val: any,
	// 自定义的set，应该是计算值的set用法等使用，或者提示用赋值语句
  customSetter?: ?Function,
	// 如果属性发生变化，是否通知obj的sub。默认是不通知，什么情况下通知呢？我猜只有watch里的deep情况吧？
  shallow?: boolean
) {
	// 给每一个属性定义一个dep
  const dep = new Dep()

  // 获取属性的描述对象，如果属性是不可修改的，就放弃将其设置为响应式对象
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
	// 缓存原始getter和setter
  const getter = property && property.get
  const setter = property && property.set

  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
			// 如果用getter 使用getter获取值，否则使用原始值获取
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
						// 因为数组的索引没做响应式对象，因此需要将数组的每一个元素关联上
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
			// 如果用getter 使用getter获取值，否则使用原始值获取
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
			// 如果和当前值没有变化，就return
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
			
			// 如果有setter，就用setter赋值，否则直接改变原始值
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      childOb = !shallow && observe(newVal)
			
			// 通知所有依赖此值的watch，执行update，使其更新
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
// 赋值，如果该属性不是可观察属性，创建成可观察属性
export function set (target: Array<any> | Object, key: any, val: any): any {
	// 如果是数组直接替换，不过数组本身不是可观察怎么办？貌似不做处理。。。
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
	
	// 如果target已经存在key属性，直接赋值，同问如果key属性不是可观察怎么办？应该是必须是可观察，否则无效，不会把已经存在的不可观察属性变成可观察属性
  if (hasOwn(target, key)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__,
	// 注意对象不能是 Vue 实例，或者 Vue 实例的根数据对象。
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
	
	// 只有有ob才会走defineReactive，那对于没有ob场景，是不会定义可观察属性的
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
// 删除一个可观察属性
export function del (target: Array<any> | Object, key: any) {
	// 如果是数组，调用splice就行，因为数组的索引并不是可响应式属性
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
	
	// 这里不用observe取出ob吗？也许是怕observe取会没有__ob__的对象给自动创建一个吧
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
	
	// 如果target么有key这个属性，直接返回（getter也没有）
  if (!hasOwn(target, key)) {
    return
  }
	
  delete target[key]
	
  if (!ob) {
    return
  }
	
	// 删除掉target的key属性，包括getter。这里有个问题，key这个属性的dep会被调用吗？从代码来看是不会调用
	// 举个例子
	// 	data: {
	// 			a: 1,
	// 			b: {
	// 					c: 1
	// 			}
	// 	},
	// 	computed: {
	// 			exp1(){
	// 					return this.a
	// 			},
	// 			exp2(){
	// 					return this.b.c
	// 			},
	// 	methods: {
	// 			clickA(){
	// 					this.$delete(this, 'a')
	// 			},
	// 			clickC(){
	// 					this.$delete(this.b, 'c')
	// 			},
	//  }
	// 执行clickA，exp1不会重新渲染，因为此时没有ob，而a的dep藏在闭包中，无法通知他。执行clickC，通过执行ob的notify，会告知exp2重新渲染。
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
// 调用数组里面的一个的depend，因为数组没有get，所以必须使用手动通知，而且无法确定index。
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
