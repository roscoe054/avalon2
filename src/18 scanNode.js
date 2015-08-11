function scanNodeList(parent, vmodels) {
    var nodes = avalon.slice(parent.childNodes)
    scanNodeArray(nodes, vmodels)
}
var renderedCallbacks = []

function check(elem){
   return !elem.msResolved && elem.parentNode && elem.parentNode.nodeType === 1
}
function scanNodeArray(nodes, vmodels) {
    for (var i = 0, node; node = nodes[i++]; ) {
        switch (node.nodeType) {
            case 1:
                scanTag(node, vmodels) //扫描元素节点

                var elem = node
         
                if (!elem.msResolved && elem.parentNode && elem.parentNode.nodeType === 1) {
                   
                    var library = isWidget(elem)
                    
                    if (library && avalon.libraries[library]) {
                        var widget = elem.localName ? elem.localName.replace(library + ":", "") : elem.nodeName
                        var fullName = library + ":" + camelize(widget)
                        componentQueue.push({
                            library: library,
                            element: elem,
                            name: fullName,
                            widget: widget,
                            vmodels: vmodels,
                            dependency: 1
                        })
                        if (avalon.components[fullName]) {
                            avalon.clearHTML(elem)
                            avalon.component(fullName)
                        }
                    }
                }
                if (renderedCallbacks.length) {
                    while (fn = renderedCallbacks.pop()) {
                        fn.call(node)
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

var componentQueue = []
var defaults = {
    $construct: function () {
        return avalon.mix.apply(null, arguments)
    },
    $ready: noop,
    $init: noop,
    $dispose: noop,
    $$template: function () {
        return this.$template
    }
}
avalon.components = {}
avalon.component = function (name, opts) {
    if (opts) {
        avalon.components[name] = avalon.mix({}, defaults, opts || {})
    }
    for (var i = 0, obj; obj = componentQueue[i]; i++) {
        if (name === obj.name) {
            componentQueue.splice(i, 1)
            i--;

            (function (host, defaults, elem, widget) {
                var library = host.library
                var global = avalon.libraries[library]
                //===========收集各种配置=======
                var elemOpts = avalon.getWidgetData(elem, widget)
                var vmOpts = getOptionsFromVM(host.vmodels, elem.getAttribute("options") || widget)
                var parentDefinition
                if (host.parentClass) {
                    var parentClass = avalon.components[host.parentClass]
                    if (parentClass) {
                        parentDefinition = parentClass.$construct(defaults, elemOpts)
                    }
                }
                var componentDefinition = avalon.components[name].$construct(parentDefinition || defaults,
                        vmOpts, elemOpts)

                componentDefinition.$id = generateID(widget)
                //==========构建VM=========
                var vm = avalon.define(componentDefinition)
                elem.msResolved = 1
                global.$init(vm)
                elem = componentDefinition.$init(vm) || elem
                var child = avalon.parseHTML(componentDefinition.$$template())
                avalon.clearHTML(elem).appendChild(child)
                if (componentDefinition.$replace) {
                    child = elem.firstChild
                    elem.parentNode.replaceChild(child, elem)
                    child.msResolved = 1
                    elem = child
                }


                avalon.scan(elem, [vm].concat(host.vmodels))
                avalon.fireDom(elem.parentNode, "datasetchanged", {dependency: 1, library: library})
                var removeFn = avalon.bind(elem, "datasetchanged", function (e) {
                    if (isFinite(e.dependency) && e.library === library) {
                        host.dependency += e.dependency
                        e.stopPropagation()
                    }

                    if (host.dependency === 0) {
                        global.$ready(vm)
                        componentDefinition.$ready(vm)
                        avalon.unbind(elem, "datasetchanged", removeFn)
                        //==================

                        host.rollback = function () {
                            try {

                                global.$dispose(vm)
                                componentDefinition.$dispose(vm)

                            } catch (e) {
                            }

                            delete avalon.vmodels[vm.$id]
                        }
                        injectDisposeQueue(host, widgetList)
                        if (window.chrome) {
                            elem.addEventListener("DOMNodeRemovedFromDocument", function () {
                                setTimeout(rejectDisposeQueue)
                            })
                        }




                    }
                })
                if (!elem.childNodes.length) {
                    avalon.fireDom(elem, "datasetchanged", {dependency: -1, library: library})
                } else {
                    renderedCallbacks.push(function () {
                        avalon.fireDom(elem, "datasetchanged", {dependency: -1, library: library})
                    })
                }


            })(obj, avalon.components[name], obj.element, obj.widget)


            // opts.

        }
    }
}

avalon.fireDom = function (elem, type, opts) {
    if (DOC.createEvent) {
        var hackEvent = DOC.createEvent("Events");
        hackEvent.initEvent(type, true, true, opts)
        avalon.mix(hackEvent, opts)

        elem.dispatchEvent(hackEvent)
    } else {
        hackEvent = DOC.createEventObject()
        avalon.mix(hackEvent, opts)
        elem.fireEvent("on" + type, hackEvent)
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


avalon.libraries = []
avalon.library = function (name, opts) {
    if (DOC.namespaces) {
        DOC.namespaces.add(name, 'http://www.w3.org/1999/xlink');
    }
    avalon.libraries[name] = avalon.mix( {
        $init: noop,
        $ready: noop,
        $dispose: noop
    }, opts || {})
}

avalon.library("ms")

function isWidget(el) { //如果为自定义标签,返回UI库的名字
    if(el.scopeName){
        return el.scopeName
    }
    var fullName = el.localName
    var index = fullName && fullName.indexOf(":") 
    if(index > 0){
        return fullName.slice(0, index)
    }
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

