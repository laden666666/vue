/* @flow */
//该文档定义一个刷新的队列，列如mobx的action，这样可以让Watch的多次改变仅触发一次updated事件

import type Watcher from './watcher'
import config from '../config'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import {
  warn,
  nextTick,
  devtools
} from '../util/index'

export const MAX_UPDATE_COUNT = 100

// Watcher队列，由watch的update将非sync的watch放入该队列中，防止立刻计算，
const queue: Array<Watcher> = []
// 激活的控件实例列表。不是所以就的控件实例都进行观察，仅被激活的控件实例才进行观察
const activatedChildren: Array<Component> = []
// 一个存储WatcherID的map，用于去除，方式一个Watcher被放入queue多次
let has: { [key: number]: ?true } = {}
// 记录一次flush中，一个watch执行的次数，如果超过MAX_UPDATE_COUNT，表示可能出现了死循环
// 貌似仅在开发环境中使用，生产环境死循环就一直死着？？？？
let circular: { [key: number]: number } = {}
// 表示是否等待nexttick，只有在nexttick才做出响应
let waiting = false

// 是否在flush中
let flushing = false
let index = 0

/**
 * Reset the scheduler's state.
 */
// 重置
function resetSchedulerState () {
  index = queue.length = activatedChildren.length = 0
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}

/**
 * Flush both queues and run the watchers.
 */
// flush掉quene
function flushSchedulerQueue () {
  flushing = true
  let watcher, id

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  // Sort queue before flush.
  //在刷新之前排队队列。
  //这保证：
  // 1.组件从父级到子级更新。 （因为父母总是在孩子面前创造）
  // 2.组件的用户创建的观察者在其渲染观察者之前运行（因为在渲染观察者之前创建用户观察者）
  // 3.如果在父组件的观察程序运行期间销毁了组件，可以跳过其观察者。

  // 将queue中保存的wtacher对象根据创建顺序排序，因为uid是递增的，所有后创建的会拍到后面
	// 排序保证了上面的3个情况，而且可以确保不会死循环。
  queue.sort((a, b) => a.id - b.id)

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  // 当flush的过程中，还可以确保死循环可以更快的检查出来
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    id = watcher.id
    has[id] = null
		// run里面会改变数组queue的长度
		// queue里面有render依赖的getter、props、计算值和用户的watch
		// getter、props、计算值理论上都是纯函数，用户的watch却不是，因此用户的watch会改变queue的值，调用栈是watcher.run->watch.cb->dep.notify->watch.update->queueWatcher，在queueWatcher里面会改变queue
		// 注意执行queueWatcher时，flushing为true
    watcher.run()
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
			// 如果某个watcher，在一次flush被多次依赖，就表示这里可能有一个死循环，如果超个MAX_UPDATE_COUNT（100），无论是否是死循环都当死循环处理
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  // 克隆activatedChildren和queue
  const activatedQueue = activatedChildren.slice()
  const updatedQueue = queue.slice()

  resetSchedulerState()

  // call component updated and activated hooks
  // 调用声明周期函数
  callActivatedHooks(activatedQueue)
  callUpdatedHooks(updatedQueue)

  // devtool hook
  /* istanbul ignore if */
  // 通知devtool工具
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

// 更新完成钩子
function callUpdatedHooks (queue) {
  let i = queue.length
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    if (vm._watcher === watcher && vm._isMounted) {
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent (vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks (queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
// 将新的watch压入队列中
export function queueWatcher (watcher: Watcher) {
  const id = watcher.id
  // 使用has去重，防止一个Watcher放入queue多次
  if (has[id] == null) {
    has[id] = true
    if (!flushing) {
      // 如果没在flush中，则直接放入queue
      queue.push(watcher)
    } else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
			// 如果flush中，queue已经根据id排好序了。倒着检索位置，将新值插入queue中
			// 暂时不清楚在flushing时，插入queue中的有没有计算值或render相关的更新，如有那queue做成二叉树效率会不会高些？
      let i = queue.length - 1
      while (i > index && queue[i].id > watcher.id) {
        i--
      }
      queue.splice(i + 1, 0, watcher)
    }
    // queue the flush
    // 当观察者队列发生变化时候，要flush
		// 如果正在flushing，将导致两次flush？？？？？？？？？？？？
    if (!waiting) {
      waiting = true
      // 而且要在异步回调中flush，这样多次pushwatch仅会触发一次flush
      nextTick(flushSchedulerQueue)
    }
  }
}
