function scanTag(elem, vmodels, node) {
    //扫描顺序  ms-skip(0) --> ms-important(1) --> ms-controller(2) --> ms-if(10) --> ms-repeat(100)
    //--> ms-if-loop(110) --> ms-attr(970) ...--> ms-each(1400)-->ms-with(1500)--〉ms-duplex(2000)垫后
    var a = elem.getAttribute("ms-skip")
    //#360 在旧式IE中 Object标签在引入Flash等资源时,可能出现没有getAttributeNode,innerHTML的情形
    if (!elem.getAttributeNode) {
        return log("warning " + elem.tagName + " no getAttributeNode method")
    }
    var b = elem.getAttributeNode("ms-important")
    var c = elem.getAttributeNode("ms-controller")
    if (typeof a === "string") {
        return
    } else if (node = b || c) {
        var newVmodel = avalon.vmodels[node.value]
        if (!newVmodel) {
            return
        }
        //ms-important不包含父VM，ms-controller相反
        vmodels = node === b ? [newVmodel] : [newVmodel].concat(vmodels)
        var name = node.name
        elem.removeAttribute(name) //removeAttributeNode不会刷新[ms-controller]样式规则
        avalon(elem).removeClass(name)
        createSignalTower(elem, newVmodel)
    }
    var uiName = isWidget(elem)
    if(uiName && avalon.libraries[uiName]){
       var widgetName = elem.localName ? elem.localName.replace(uiName+":","") :elem.nodeName
       var name = uiName+":"+camelize(widgetName)
       if(avalon.components[name]){
           
           
       }else{
          componentQueue.push({
              name:name,
              element: elem
          })
       }
       
    }

    scanAttr(elem, vmodels) //扫描特性节点
}
var componentQueue = []
avalon.libraries = []
avalon.library = function (name, opts) {
    if (DOC.namespaces) {
        DOC.namespaces.add(name, 'http://www.w3.org/1999/xlink');
    }
    avalon.libraries[name] = avalon.mix(opts, {
        init: noop,
        dispose: noop
    })
}

avalon.components = {}
avalon.component = function (name, opts) {
    if(name.indexOf(":") === -1){
        throw "error"
    }
    avalon.components[name] = new Component(name, opts)

}


function isWidget(el) { //如果为自定义标签,返回UI库的名字
    return el.scopeName ? el.scopeName : el.localName.split(":")[0]
}
// 处理所有在ready过程中的 元素
// 全局init
// 获取模板
// 获取配置对象
// init回调
// 创建VM
// 渲染
// 遇到子组件挂起 +1
// 子组件渲染完  -1
// 渲染完毕   调用ready回调
// fire avalon.component.watch 
// 移除  调用dispose回调
function Component (name, opts){
    this.name = name
    this._template = opts.template
    this.template = this.updateTemplate(this._template)
    
}

/*
https://hacks.mozilla.org/2015/06/the-state-of-web-components/
 * 
 * 
 */