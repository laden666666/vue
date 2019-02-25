/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    //如果已经安装了，直接返回
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    if (installedPlugins.indexOf(plugi n) > -1) {
      return this
    }

    // additional parameters
    const args = toArray(arguments, 1)
    args.unshift(this)
		
		// 如果插件有install方法，用init方法初始化插件。否则如果插件本身是函数，用该插件函数初始化。插件是函数的情况还是比较多，比如vue-router等
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args)
    }
		
		// 将初始化后插件保存起来，避免多层次初始化
    installedPlugins.push(plugin)
    return this
  }
}
