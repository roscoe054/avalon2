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

                var elem = node

                if (!elem.msResolved && elem.parentNode && elem.parentNode.nodeType === 1) {

                    var library = isWidget(elem)

                    if (library && avalon.libraries[library]) {
                        var widget = elem.localName ? elem.localName.replace(library + ":", "") : elem.nodeName
                        var fullName = library + ":" + camelize(widget)
                        componentQueue.push({
                            library: library,
                            element: elem,
                            fullName: fullName,
                            widget: widget,
                            vmodels: vmodels,
                            name: "widget"
                        })
                        if (avalon.components[fullName]) {
                            //   avalon.clearHTML(elem)
                            avalon.component(fullName)
                        }
                    }
                }
                if (node.msHasEvent) {
                    avalon.fireDom(node, "datasetchanged", {
                        bubble: node.msHasEvent
                    })
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
var componentHooks = {
    $construct: function () {
        return avalon.mix.apply(null, arguments)
    },
    $ready: noop,
    $init: noop,
    $dispose: noop,
    $childReady: noop,
    $container: null,
    $replace: false,
    $extends: null,
    $$template: function (str) {
        return str
    }
}


avalon.components = {}
avalon.component = function (name, opts) {
    if (opts) {
        avalon.components[name] = avalon.mix({}, componentHooks, opts)
    }
    for (var i = 0, obj; obj = componentQueue[i]; i++) {
        if (name === obj.fullName) {
            componentQueue.splice(i, 1)
            i--;

            (function (host, hooks, elem, widget) {

                var dependencies = 1
                var library = host.library
                var global = avalon.libraries[library]
                //===========收集各种配置=======
                //从vmodels中得到业务数据
                var vmOpts = getOptionsFromVM(host.vmodels, elem.getAttribute("configs") || host.fullName)
                //从element的data-pager-xxx辅助指令中得到该组件的专有数据
                var elemOpts = avalon.getWidgetData(elem, widget)
                var parentDefinition
                if (hooks.$extends) {
                    var parentHooks = avalon.components[hooks.$extends]
                    if (parentHooks) {
                        parentDefinition = parentHooks.$construct({}, hooks, vmOpts)
                    }
                }
                var componentDefinition = avalon.components[name].$construct({},
                        parentDefinition || hooks, vmOpts, elemOpts)

                componentDefinition.$refs = {}
                componentDefinition.$id = elem.getAttribute("identifier") || generateID(widget)


                //==========构建VM=========
                var vmodel = avalon.define(componentDefinition) || {}
                elem.msResolved = 1
                vmodel.$init(vmodel)
                global.$init(vmodel)
                var nodes = elem.childNodes
                //收集插入点
                var slots = {}, snode
                for (var s = 0, el; el = nodes[s++]; ) {
                    var type = el.nodeType === 1 && el.getAttribute("slot") || componentDefinition.$slot
                    if (type) {
                        if (slots[type]) {
                            slots[type].push(el)
                        } else {
                            slots[type] = [el]
                        }
                    }
                }
                avalon.clearHTML(elem)
                elem.innerHTML = vmodel.$$template(vmodel.$template)

                for (s in slots) {
                    if (vmodel.hasOwnProperty(s)) {
                        var ss = slots[s]
                        if (ss.length) {
                            var fragment = avalonFragment.cloneNode(true)
                            for (var ns = 0; snode = ss[ns++]; ) {
                                fragment.appendChild(snode)
                            }
                            vmodel[s] = fragment
                        }
                        slots[s] = null
                    }
                }
                slots = null
                var child = elem.firstChild
                if (vmodel.$replace) {
                    child = elem.firstChild
                    elem.parentNode.replaceChild(child, elem)
                    child.msResolved = 1
                    elem = host.element = child
                }
                if (vmodel.$container) {
                    vmodel.$container.appendChild(elem)
                }
                avalon.fireDom(elem.parentNode, "datasetchanged", {dependency: 1, library: library, vm: vmodel})
                var removeFn = avalon.bind(elem, "datasetchanged", function (e) {
                    if (isFinite(e.dependency) && e.library === library) {
                        dependencies += e.dependency
                        if (vmodel !== e.vm) {
                            vmodel.$refs[e.vm.$id] = e.vm
                            vmodel.$childReady(vmodel)
                            global.$childReady(vmodel)
                            e.stopPropagation()
                        }
                    }

                    if (dependencies === 0) {
                        vmodel.$ready(vmodel)
                        global.$ready(vmodel)
                        avalon.unbind(elem, "datasetchanged", removeFn)
                        //==================
                        host.rollback = function () {
                            try {
                                vmodel.$dispose(vmodel)
                                global.$dispose(vmodel)
                            } catch (e) {
                            }
                            delete avalon.vmodels[vmodel.$id]
                        }
                        injectDisposeQueue(host, widgetList)
                        if (window.chrome) {
                            elem.addEventListener("DOMNodeRemovedFromDocument", function () {
                                setTimeout(rejectDisposeQueue)
                            })
                        }

                    }
                })
                avalon.scan(elem, [vmodel].concat(host.vmodels))

                avalon.vmodels[vmodel.$id] = vmodel
                if (!elem.childNodes.length) {
                    avalon.fireDom(elem, "datasetchanged", {dependency: -1, library: library, vm: vmodel})
                } else {
                    renderedCallbacks.push(function () {
                        avalon.fireDom(elem, "datasetchanged", {dependency: -1, library: library, vm: vmodel})
                    })
                }


            })(obj, avalon.components[name], obj.element, obj.widget)// jshint ignore:line


        }
    }
}

avalon.fireDom = function (elem, type, opts) {
    if (DOC.createEvent) {
        var hackEvent = DOC.createEvent("Events");
        hackEvent.initEvent(type, true, true, opts)
        avalon.mix(hackEvent, opts)

        elem.dispatchEvent(hackEvent)
    } else if(root.contains(elem)){//IE6-8触发事件必须保证在DOM树中,否则报"SCRIPT16389: 未指明的错误"
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
        DOC.namespaces.add(name, 'http://www.w3.org/1999/xhtml');
    }
    avalon.libraries[name] = avalon.mix({
        $init: noop,
        $childReady: noop,
        $ready: noop,
        $dispose: noop
    }, opts || {})
}

avalon.library("ms")

function isWidget(el) { //如果为自定义标签,返回UI库的名字
    if (el.scopeName) {
        return el.scopeName
    }
    var fullName = el.localName
    var index = fullName && fullName.indexOf(":")
    if (index > 0) {
        return fullName.slice(0, index)
    }
}
//各种MVVM框架在大型表格下的性能测试
// https://github.com/RubyLouvre/avalon/issues/859

