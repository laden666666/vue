/* @flow */

import {
  warn,
  nextTick,
  emptyObject,
  handleError,
  defineReactive
} from '../util/index'

import { createElement } from '../vdom/create-element'
import { installRenderHelpers } from './render-helpers/index'
import { resolveSlots } from './render-helpers/resolve-slots'
import VNode, { cloneVNodes, createEmptyVNode } from '../vdom/vnode'

import { isUpdatingChildComponent } from './lifecycle'

// 初始化render,init里面调用。核心是定义$createElement和_c两个创建vnode的方法。
export function initRender (vm: Component) {
	// 初始化必须将vm的vnode清除
  vm._vnode = null // the root of the child tree

  const options = vm.$options
	// _parentVnode？？？？？
  const parentVnode = vm.$vnode = options._parentVnode // the placeholder node in parent tree
  const renderContext = parentVnode && parentVnode.context
  vm.$slots = resolveSlots(options._renderChildren, renderContext)
  vm.$scopedSlots = emptyObject
  // bind the createElement fn to this instance
  // so that we get proper render context inside it.
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // internal version is used by render functions compiled from templates
	// createElement的简写_c，应该是为了节省编译后代码的体积
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
  // normalization is always applied for the public version, used in
  // user-written render functions.
	// 对外暴露的API定义，与_c具体有什么区别？？？？？
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)

  // $attrs & $listeners are exposed for easier HOC creation.
  // they need to be reactive so that HOCs using them are always updated
	// 
  const parentData = parentVnode && parentVnode.data

  /* istanbul ignore else */
	// 定义$attrs和$listeners
  if (process.env.NODE_ENV !== 'production') {
		// $attrs是只读不修改的，但是如果是sync属性的呢？
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$attrs is readonly.`, vm)
    }, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$listeners is readonly.`, vm)
    }, true)
  } else {
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, null, true)
  }
}

export function renderMixin (Vue: Class<Component>) {
	// 初始化渲染使用的工具函数和缩写函数。
  // install runtime convenience helpers
  installRenderHelpers(Vue.prototype)

  Vue.prototype.$nextTick = function (fn: Function) {
    return nextTick(fn, this)
  }

	// 定义原型上的render函数
  Vue.prototype._render = function (): VNode {
    const vm: Component = this,
		
		// 真正的render函数在$option里面，取出render。SFC控件会由vue-loader将template编译成render，否则编译模块会将template编译成render
    const { render, _parentVnode } = vm.$options

		// 只有挂载后，才render子控件
    if (vm._isMounted) {
      // if the parent didn't update, the slot nodes will be the ones from
      // last render. They need to be cloned to ensure "freshness" for this render.
      for (const key in vm.$slots) {
        const slot = vm.$slots[key]
        if (slot._rendered) {
          vm.$slots[key] = cloneVNodes(slot, true /* deep */)
        }
      }
    }

		//scopedslot是从父虚拟dom中获取
    vm.$scopedSlots = (_parentVnode && _parentVnode.data.scopedSlots) || emptyObject

    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
		// ？？？？为什么$vnode等于_parentVnode ？？？
    vm.$vnode = _parentVnode
    // render self
    let vnode
    try {
			// 正常情况下_renderProxy就是vm自己，但是在非生产环境下且支持proxy语法，会调用一个proxy代理vm，用于提示不存在key在vm的情况
      vnode = render.call(vm._renderProxy, vm.$createElement)
    } catch (e) {
			// 如果出现错误，提示错误。
      handleError(e, vm, `render`)
      // return error render result,
      // or previous vnode to prevent render error causing blank component
      /* istanbul ignore else */
			// ？？？？？renderError仅在非生产模式可用？？？
      if (process.env.NODE_ENV !== 'production') {
        if (vm.$options.renderError) {
          try {
            vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
          } catch (e) {
            handleError(e, vm, `renderError`)
            vnode = vm._vnode
          }
        } else {
          vnode = vm._vnode
        }
      } else {
        vnode = vm._vnode
      }
    }
    // return empty vnode in case the render function errored out
		// 如果render返回不是一个vnode，用一个空vnode代替。如果是一个数组，在非生产环境下给出错误提示。因为diff算法的关系，一个控件必须有且仅有一个根元素。
    if (!(vnode instanceof VNode)) {
      if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
        warn(
          'Multiple root nodes returned from render function. Render function ' +
          'should return a single root node.',
          vm
        )
      }
      vnode = createEmptyVNode()
    }
    // set parent
		// 把_parentVnode赋给vnode的节点
    vnode.parent = _parentVnode
    return vnode
  }
}
