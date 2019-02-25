/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { warn, extend, mergeOptions } from '../util/index'
import { defineComputed, proxy } from '../instance/state'

export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  // Vue的cid永远为0
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   */
  // 使用基础 Vue 构造器，创建一个“子类”。参数是一个包含组件选项的对象。代替使用new Vue创建实例，测试用例开发时候最适合使用。这相当于继承
	// 创建好子类后，会生成子类的extendOptions里面创建一个_Ctor字段，用于保存extend生成的子类。当再次创建时候，从_Ctor中取出创建的子类
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    const Super = this
    const SuperId = Super.cid
    // _Ctor的要保存SuperId，因为同一个extendOptions给不同Vue及其子类创建出的新的子类是不同的
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

		// 如果extendOptions未命名，用父类的名字
    const name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production') {
      if (!/^[a-zA-Z][\w-]*$/.test(name)) {
        warn(
          'Invalid component name: "' + name + '". Component names ' +
          'can only contain alphanumeric characters and the hyphen, ' +
          'and must start with a letter.'
        )
      }
    }

    // 生成子类，这里是用的类似于派生组合继承
    const Sub = function VueComponent (options) {
      // 仍然是调用原型上定义的初始化方法
      this._init(options)
    }
		
		// 让子类原型继承父类，这里是派生继承，避免创建父类的实例
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub
		
		// 创建子类cid，这个是给vue识别是vue的子类还是工厂函数用的。同时给每一个子类命名id
    Sub.cid = cid++
		
		// 用父类和用户传入的extendOptions生成子类
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
		
		// 给子类的super赋值
    Sub['super'] = Super


		
    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    if (Sub.options.props) {
      initProps(Sub)
    }
    if (Sub.options.computed) {
      initComputed(Sub)
    }

		// 将父类的静态方法覆盖子类，注意不是所用vue的静态方法都会覆盖子类
    // allow further extension/mixin/plugin usage
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

		// 同样把父类注册资源的方法覆盖子类
    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
		
		// 子类如果有名字，把子类自身注册到全局，方便递归调用
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub
    }

		// 把父类当前的options放到superOptions，这样以后从父类获取options可以判断出来父类是否有修改，如果有重新生成options
    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    // Vue的配置
    Sub.superOptions = Super.options
    // 用户扩展配置
    Sub.extendOptions = extendOptions
    // 克隆的Vue的配置，用于存储当前Vue配置。当options可能改变，sealedOptions方便未来重新生成options
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor
    cachedCtors[SuperId] = Sub
    return Sub
  }
}

// props的getter和setter都在原型上面，而保存的值是在_props中
function initProps (Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}

function initComputed (Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
