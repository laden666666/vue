/* @flow */

import { mergeOptions } from '../util/index'

export function initMixin (Vue: GlobalAPI) {
	// mixin方法其实就是mergeOptions，集成也是mergeOptions，所以对vue而言，mixin和extend没有本质区别
  Vue.mixin = function (mixin: Object) {
		// vue的mixin是mixin到全局的options里面
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
