import type { Config } from '../src/core/config'
import type VNode from '../src/core/vdom/vnode'
import type Watcher from '../src/core/observer/watcher'

// Vue、控件、Vue的extend子类的模型。
declare interface Component {
  // constructor information
  static cid: number;
	// 当前控件的自身的options
  static options: Object;
  // 生成子类
  static extend: (options: Object) => Function;
	// 父类的options，如const A = Vue.extend({});const B = A.extend({}); 则 Vue.options === A.superOptions A.options === B.superOptions。该函数主要目的是为了用于缓存从超类获得的配置，这样可以确认超类配置是否会改变，如果超类的属性发生变化，表示需要重新生成options
  static superOptions: Object;
	// 父类调用extend时候传的options。extend函数会在该options里面创建一个_Ctor，用于缓存创建好的子类
  static extendOptions: Object;
	// options的原始值的克隆。因为options是可以根据mixin等注册的资源而改变，sealedOptions保存Vue.extend的原始值，方便当需要生成options使用。因为sealedOptions和options保存的
  static sealedOptions: Object;
	// 超类的引用，let A = Vue.extend({}). A.super === Vue
  static super: Class<Component>;
	
  // assets
	// Vue及其Vue.extend子类的注册全局控件、指令、过滤器的方法。注册后父类访问不到，但是子类可以访问。
	// 因为注册的信息全部保存到options里面。子类可以用过super不断mergeOptions，从而获得父类注册的资源。而父类的option因为mergeOptions不到子类的options，所有访问不到子类注册的资源
  static directive: (id: string, def?: Function | Object) => Function | Object | void;
  static component: (id: string, def?: Class<Component> | Object) => Class<Component>;
  static filter: (id: string, def?: Function) => Function | void;

  // public properties
	// 公有api，详见https://vuejs.org/v2/api/
	// 当前component对象控制的Element对象
  $el: any; // so that we can attach __vue__ to it
	// 一个data的根对象，是一个ob对象，当前component的data集合。如this.$set(this, 'xxx', xxx)应该写成this.$set(this.$data, 'xxx', xxx)
  $data: Object;
	// 当前的props对象，是一个ob对象，当前component的props集合
  $props: Object;
	// 当前控件的options。不是初始化的原始options，而是与构造器（包括构造器的父类）、extends继承的控件、mixin等合并后的options
  $options: ComponentOptions;
	// 父component对象
  $parent: Component | void;
	// 根component，component树的根
  $root: Component;
	// 子component对象
  $children: Array<Component>;
	// 当前控件的ref，可能是一个component对象，也可能是一个Element对象
  $refs: { [key: string]: Component | Element | Array<Component | Element> | void };
	// 当前component的slot集合
  $slots: { [key: string]: Array<VNode> };
	// 当前当前component的scoped slot的集合
  $scopedSlots: { [key: string]: () => VNodeChildren };
	// 当前component的虚拟node
  $vnode: VNode; // the placeholder node for the component in parent's render tree
	// 当前component的attrs中不在props里面的attrs集合。注意
  $attrs: { [key: string] : string };
	// 当前component的被绑定的事件监听器集合
  $listeners: { [key: string]: Function | Array<Function> };
	// 当前是否是服务器渲染
  $isServer: boolean;

  // public methods
	// 手动mount方法
  $mount: (el?: Element | string, hydrating?: boolean) => Component;
	// 强制执行render
  $forceUpdate: () => void;
	// 销毁
  $destroy: () => void;
	// 同Vue.set
  $set: <T>(target: Object | Array<T>, key: string | number, val: T) => T;
	// 同Vue.delete
  $delete: <T>(target: Object | Array<T>, key: string | number) => void;
	// 同Vue.watch
  $watch: (expOrFn: string | Function, cb: Function, options?: Object) => Function;
	// 对当前component对象监听事件
  $on: (event: string | Array<string>, fn: Function) => Component;
	// 对当前component对象监听事件，但是触发一次自定off
  $once: (event: string, fn: Function) => Component;
	// 对当前component对象解除监听事件
  $off: (event?: string | Array<string>, fn?: Function) => Component;
	// 报告触发了event事件
  $emit: (event: string, ...args: Array<mixed>) => Component;
  // 一次异步更新结束
	$nextTick: (fn: Function) => void | Promise<*>;
  // 根据Component对象（也可以是其标签）创建虚拟node
	$createElement: (tag?: string | Component, data?: Object, children?: VNodeChildren) => VNode;

  // private properties
	// 私有
	// 当前component的id,不重复
  _uid: number;
	// 当前component的名字，如果控件有名字是控件名？？？
  _name: string; // this only exists in dev mode
	// 是否是vue的实例或者是Component的实例
  _isVue: true;
	// 当前实例对象的引用
  _self: Component;
	// ？？
  _renderProxy: Component;
	// ？？
  _renderContext: ?Component;
	// 控件自身的watcher，用于收集render函数表达式的依赖，同时更新render表达式。该watch如果update，表示vnode要重新生成，patch要再执行一遍
  _watcher: Watcher;
  // 用户自定义的watcher
  _watchers: Array<Watcher>;
	// 计算值的watcher的缓存，会用一个watch缓存、监听计算值的值。
  _computedWatchers: { [key: string]: Watcher };
	// 
  _data: Object;
	// 
	_props: Object;
	// 保存事件，是一个{name: string: fn[]}
  _events: Object;
	// 
  _inactive: boolean | null;
	// 
  _directInactive: boolean;
	// 是否已经mount完成，第一次update称为mount，之后称为update ？？？？？？？
  _isMounted: boolean;
	// 是否处于者已经销毁完成
  _isDestroyed: boolean;
	// 是否处于正在销毁中或者已经销毁完成
  _isBeingDestroyed: boolean;
	// 最新一次渲染的vnode
  _vnode: ?VNode; // self root node
	// 使用有生命周期方法，
  _hasHookEvent: boolean;
	// 一个私有属性，用于保存provid。初始化inject的时候，会递归查找父控件实例的_provided属性
  _provided: ?Object;

  // private methods

  // lifecycle
	// 生命周期方法
	// vue真正的初始化过程，构造函数调用这个
  _init: Function;
	// 将控件绑定到真实DOM上面的，只有root的component才需要执行这个方法
  _mount: (el?: Element | void, hydrating?: boolean) => Component;
	// 通知重新渲染的函数
  _update: (vnode: VNode, hydrating?: boolean) => void;

  // rendering
	// 渲染函数，不是options那个render，是加工后的
  _render: () => VNode;


  __patch__: (
    a: Element | VNode | void,
    b: VNode,
    hydrating?: boolean,
    removeOnly?: boolean,
    parentElm?: any,
    refElm?: any
  ) => any;

  // createElement
	// 编译后使用的工具函数，为了能够方便编译后的render函数体积，这些函数命名比较短

  // _c is internal that accepts `normalizationType` optimization hint
  _c: (
    vnode?: VNode,
    data?: VNodeData,
    children?: VNodeChildren,
    normalizationType?: number
  ) => VNode | void;
	
  // renderStatic
  _m: (index: number, isInFor?: boolean) => VNode | VNodeChildren;
  // markOnce
  _o: (vnode: VNode | Array<VNode>, index: number, key: string) => VNode | VNodeChildren;
  // toString 字符串函数
  _s: (value: mixed) => string;
  // text to VNode
  _v: (value: string | number) => VNode;
  // toNumber 转数组函数
  _n: (value: string) => number | string;
  // empty vnode
  _e: () => VNode;
  // loose equal
  _q: (a: mixed, b: mixed) => boolean;
  // loose indexOf
  _i: (arr: Array<mixed>, val: mixed) => number;
  // resolveFilter
  _f: (id: string) => Function;
  // renderList 列表渲染
  _l: (val: mixed, render: Function) => ?Array<VNode>;
  // renderSlot slot渲染
  _t: (name: string, fallback: ?Array<VNode>, props: ?Object) => ?Array<VNode>;
  // apply v-bind object
  _b: (data: any, tag: string, value: any, asProp: boolean, isSync?: boolean) => VNodeData;
  // apply v-on object 
  _g: (data: any, value: any) => VNodeData;
  // check custom keyCode
  _k: (eventKeyCode: number, key: string, builtInAlias?: number | Array<number>, eventKeyName?: string) => ?boolean;
  // resolve scoped slots
  _u: (scopedSlots: ScopedSlotsData, res?: Object) => { [key: string]: Function };

  // SSR specific
  _ssrNode: Function;
  _ssrList: Function;
  _ssrEscape: Function;
  _ssrAttr: Function;
  _ssrAttrs: Function;
  _ssrDOMProps: Function;
  _ssrClass: Function;
  _ssrStyle: Function;

  // allow dynamic method registration
  [key: string]: any
};
