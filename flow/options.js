//系统控件的配置，不是用户配置
declare type InternalComponentOptions = {
  // 用于标记options是InternalComponentOptions还是一个一般的options。使用InternalComponentOptions创建component实例要比普通的option效率高，普通的option需要进行处理才能转换为InternalComponentOptions
  _isComponent: true;
	// 
  parent: Component;
  propsData: ?Object;
  _parentVnode: VNode;
  _parentListeners: ?Object;
  _renderChildren: ?Array<VNode>;
  _componentTag: ?string;
  _parentElm: ?Node;
  _refElm: ?Node;
  render?: Function;
  staticRenderFns?: Array<Function>
};

type InjectKey = string | Symbol;

// 用户的控件配置
declare type ComponentOptions = {
  // 只有根可以传data，子控件传Function
  data: Object | Function | void;
	// 定义props
  props?: { [key: string]: PropOptions };
	// 定义传给props的东西，主要是给new Vue时候传的
  propsData?: ?Object;
	// 计算值
  computed?: {
    [key: string]: Function | {
      get?: Function;
      set?: Function;
      cache?: boolean
    }
  };
	// 方法
  methods?: { [key: string]: Function };
	// 监听器
  watch?: { [key: string]: Function | string };

  // DOM
  el?: string | Element;
	// 模板
  template?: string;
	// render函数
  render: (h: () => VNode) => VNode;
	// 渲染失败函数
  renderError?: (h: () => VNode, err: Error) => VNode;

  // 在 render 函数中编译模板字符串。只在独立构建时有效
  staticRenderFns?: Array<() => VNode>;

  // lifecycle
	// 生命周期方法
  beforeCreate?: Function;
  created?: Function;
  beforeMount?: Function;
  mounted?: Function;
  beforeUpdate?: Function;
  updated?: Function;
  activated?: Function;
  deactivated?: Function;
  beforeDestroy?: Function;
  destroyed?: Function;
  errorCaptured?: () => boolean | void;

  // assets
	// 指令
  directives?: { [key: string]: Object };
	// 控件
  components?: { [key: string]: Class<Component> };
  // ????????????????????
  transitions?: { [key: string]: Object };
	// 过滤器
  filters?: { [key: string]: Function };

  // context
	// 依赖注入相关
  provide?: { [key: string | Symbol]: any } | () => { [key: string | Symbol]: any };
  inject?: { [key: string]: InjectKey | { from?: InjectKey, default?: any }} | Array<string>;

  // component v-model customization
	// vmode相关
  model?: {
    prop?: string;
    event?: string;
  };

  // misc
  parent?: Component;
	// mixin
  mixins?: Array<Object>;
	// 控件名component._name，如果没有会用SFC的文件名代替，否则显示控件在components组成的名字，都没有显示匿名
  name?: string;
	// 继承
  extends?: Class<Component> | Object;
  // 定义代替{{}}的字符，这个选项只在完整构建版本中的浏览器内编译时可用
  delimiters?: [string, string];
  // 当设为 true 时，将会保留且渲染模板中的 HTML 注释。默认行为是舍弃它们。
  comments?: boolean;
	// 是否集成html的props，这将影响$attr获得的内容
  inheritAttrs?: boolean;

	// private
  // 这些私有属性是用户不可配置的，将他们保存到options里面值得商榷
  //用于标记options是InternalComponentOptions还是一个一般的options。使用InternalComponentOptions创建component实例要比普通的option效率高，普通的option需要进行处理才能转换为InternalComponentOptions。例如普通的options必须配置template或者render的任意一项，如果配了template，会被编译成render；而InternalComponentOptions必须配置render，不可用配置template
  _isComponent?: true;
  //将propsOption的props名字以数组的形式保存起来，如props:{name: {type: String, default: ''}}，则_propKeys值为['name']。这样便于后续快速遍历props的名字 C
  _propKeys?: Array<string>;
  //父节点的vnode对象，具体做什么？？？？？？？？？？
  _parentVnode?: VNode;
  //父节点的listener对象，具体做什么？？？？？？？？？？
  _parentListeners?: ?Object;
  //render模块渲染时候使用，具体做什么？？？？？？？？？？？
  _renderChildren?: ?Array<VNode>;
  //模块的标签名
  _componentTag: ?string;
  //????????????
  _scopeId: ?string;
  //初始化自己的vue，如果window上存在多个版本的vue，使用_base可以知道是哪个版本的vue初始化的自己
  _base: Class<Component>;
  //父控件的dom节点？？？？？？？？？？？？？？
  _parentElm: ?Node;
  //当前的控件实例的node节点
  _refElm: ?Node;
};


declare type PropOptions = {
  type: Function | Array<Function> | null;
  default: any;
  required: ?boolean;
  validator: ?Function;
}
