import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// 创建vue的构造函数，这是整个vueapi的入口。options为什么没有flow是类型定义？？？
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
	
	// 和jq一样，核心的构造函数是init，不同的是。jq的$是工厂函数，而init是构造函数；vue的Vue是构造函数，init是扩展实例函数
  this._init(options)
}

// 定义了Vue原型和静态方法
initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
