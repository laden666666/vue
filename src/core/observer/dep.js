/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
// dep定义了依赖收集，记录一个watch执行时候，依赖了哪些其他watch。
export default class Dep {
  // 目标的Watch，当Watch计算expOrFn时候，会收集调用了dep对象的depend方法的Watch，从而确定一个watcher依赖哪些watcher
  static target: ?Watcher;
	// 由uid生成
  id: number;
  // target依赖其他Watch的列表，列表中的watch均依赖于target
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  // 增加target依赖的watch，在执行depend时候，会将当前dep放入栈顶watch的deps中，在其addDep方法中会回调addSub方法
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  // 移除target依赖的watch
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  // 为全局的dep栈栈顶的收集依赖，栈顶的dep对应的watch会收集所有的执行了depend方法的dep，将其仿保存在他的dep列表中
  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  // 当target发生变化的时候，通知所有依赖他的Watch
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
// 将观察者Watcher实例赋值给全局的Dep.target，然后触发render操作时，会通过getter调用依赖属性的dep对象的depend方法，凡是调用过depend方法的对象会被保存到该watcher的dep列表中。在对象被修改出发setter操作的时候dep会调用subs中的Watcher实例的update方法进行渲染。
Dep.target = null

// 存储targent的堆，因为运行表达式其实的是对一个依赖树的遍历，因此将正在执行表达式的对象压入栈中，等遍历完就可以知道整个表达式的依赖关系
// 如A B C都是响应式数据，其中表示expA依赖expB和A的getter、expB依赖expC和B的getter，expC依赖C的getter。因为getter不依赖其他数据，因为只需要dep而不需要watcher。当执行expA时，先将expA压入栈，expA和A的getter的dep.depend触发，因expA的Watch对象在栈顶，会收集expA依赖A和expB，然后会将expB放入栈顶，依次类推
// 因此整个依赖树的确定就是一个数的深度优先查找，表达式是节点，响应式数据的getter是叶子节点，当遍历到表达式时候会将该表达式的watcher压入栈中继续遍历该表达的子树
const targetStack = []

// 压入一个watcher在全局watcher栈栈顶
export function pushTarget (_target: Watcher) {
  if (Dep.target) targetStack.push(Dep.target)
  Dep.target = _target
}

// 弹出栈顶的watcher
export function popTarget () {
  Dep.target = targetStack.pop()
}
