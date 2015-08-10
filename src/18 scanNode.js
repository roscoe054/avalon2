function scanNodeList(parent, vmodels) {
    var nodes = avalon.slice(parent.childNodes)
    scanNodeArray(nodes, vmodels)
}
var renderedCallbacks = []
function scanNodeArray(nodes, vmodels) {
    for (var i = 0, node; node = nodes[i++]; ) {
        switch (node.nodeType) {
            case 1:
                scanTag(node, vmodels) //扫描元素节点
                if (renderedCallbacks.length) {
                    while (fn = renderedCallbacks.pop()) {
                        fn.call(node)
                    }
                }
                
                var elem = node
                if (elem.parentNode && elem.parentNode.nodeType === 1) {
                    var uiName = isWidget(elem)
                    if (uiName && avalon.libraries[uiName]) {
                        var widgetName = elem.localName ? elem.localName.replace(uiName + ":", "") : elem.nodeName
                        var name = uiName + ":" + camelize(widgetName)
                        // elem.parentNode.repalceChild(placeholder, elem)
                        componentQueue.push({
                            name: name,
                            element: elem,
                            widget: widgetName,
                            vmodels: vmodels
                        })
                        if (avalon.components[name]) {
                            avalon.clearHTML(elem)
                            avalon.component(name)
                        }
                    }
                }
                break
            case 3:
                if (rexpr.test(node.nodeValue)) {
                    scanText(node, vmodels, i) //扫描文本节点
                }
                break
        }
    }

}

avalon.component = function (name, opts) {
    if (opts) {
        avalon.components[name] = avalon.mix(opts, {
            defaults: {},
            constructOption: function () {
            
                return avalon.mix.apply(null, arguments)
            },
            init: noop,
            dispose: noop
        })
    }
    for (var i = 0, obj; obj = componentQueue[i];i++ ) {
        if (name === obj.name) {
            componentQueue.splice(i, 1)
            i--
           
            var widget = obj.widget
            var elemOpts = avalon.getWidgetData(obj.element, widget)
            var vmOpts = getOptionsFromVM(obj.vmodels, obj.element.getAttribute("options") || widget)
            var parentDefinition
            if (obj.parentClass) {
                var parentClass = avalon.components[obj.parentClass]
                if (parentClass) {
                    parentDefinition = parentClass.constructOption(obj.defaults, vmOpts, elemOpts)
                }
            }
            var componentDefinition = avalon.components[name].constructOption(parentDefinition || obj.defaults,
                    vmOpts, elemOpts)
            //   componentDefinition.     
                    //  $skipArray: [ "template", "widgetElement", "rootElement"],
                    componentDefinition.$id = generateID(widget)
            var vm = avalon.define(componentDefinition)
            console.log(vm)
            // opts.

        }
    }
}


function getOptionsFromVM(vmodels, pre) {
    if (pre) {
        for (var i = 0, v; v = vmodels[i++]; ) {
            if (v.hasOwnProperty(pre) && typeof v[pre] === "object") {
                var vmOptions = v[pre]
                return vmOptions.$model || vmOptions
                break
            }
        }
    }
    return {}
}


var componentQueue = []
avalon.libraries = []
avalon.components = {}

avalon.library = function (name, opts) {
    if (DOC.namespaces) {
        DOC.namespaces.add(name, 'http://www.w3.org/1999/xlink');
    }
    avalon.libraries[name] = avalon.mix(opts, {
        init: noop,
        dispose: noop
    })
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

