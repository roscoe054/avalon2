var componentQueue = []
var componentHooks = {
    $construct: function () {
        return avalon.mix.apply(null, arguments)
    },
    $ready: noop,
    $init: noop,
    $dispose: noop,
    $container: null,
    $childReady: noop,
    $replace: false,
    $extend: null,
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
                var global = avalon.libraries[library] || componentHooks

                //===========收集各种配置=======

                var elemOpts = getOptionsFromTag(elem)
                var vmOpts = getOptionsFromVM(host.vmodels, elemOpts.config || host.fullName)
                var $id = elemOpts.$id || elemOpts.identifier || generateID(widget)
                delete elemOpts.config
                delete elemOpts.$id
                delete elemOpts.identifier
                var componentDefinition = {}

                var parentHooks = avalon.components[hooks.$extend]
                if (parentHooks) {
                    avalon.mix(true, componentDefinition, parentHooks)
                    componentDefinition = parentHooks.$construct.call(elem, componentDefinition, {}, {})
                } else {
                    avalon.mix(true, componentDefinition, hooks)
                }
                componentDefinition = avalon.components[name].$construct.call(elem, componentDefinition, vmOpts, elemOpts)

                componentDefinition.$refs = {}
                componentDefinition.$id = $id

                //==========构建VM=========
                var keepSolt = componentDefinition.$slot
                var keepReplace = componentDefinition.$replace
                var keepContainer = componentDefinition.$container
                var keepTemplate = componentDefinition.$template
                delete componentDefinition.$slot
                delete componentDefinition.$replace
                delete componentDefinition.$container
                delete componentDefinition.$template
                delete componentDefinition.$construct

                var vmodel = avalon.define(componentDefinition) || {}
                elem.msResolved = 1
                vmodel.$init(vmodel, elem)
                global.$init(vmodel, elem)
                var nodes = elem.childNodes
                //收集插入点
                var slots = {}, snode

                for (var s = 0, el; el = nodes[s++]; ) {
                    var type = el.nodeType === 1 && el.getAttribute("slot") || keepSolt
                    if (type) {
                        if (slots[type]) {
                            slots[type].push(el)
                        } else {
                            slots[type] = [el]
                        }
                    }
                }


                if (vmodel.$$template) {
                    avalon.clearHTML(elem)
                    elem.innerHTML = vmodel.$$template(keepTemplate)
                }
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
                if (keepReplace) {
                    child = elem.firstChild
                    elem.parentNode.replaceChild(child, elem)
                    child.msResolved = 1
                    elem = host.element = child
                }
                if (keepContainer) {
                    keepContainer.appendChild(elem)
                }
                avalon.fireDom(elem, "datasetchanged",
                        {library: library, vm: vmodel, childReady: 1})
                var children = 0
                var removeFn = avalon.bind(elem, "datasetchanged", function (e) {
                    if (e.childReady && e.library === library) {
                        dependencies += e.childReady
                        if (vmodel !== e.vm) {
                            vmodel.$refs[e.vm.$id] = e.vm
                            if (e.childReady === -1) {
                                children++
                                vmodel.$childReady(vmodel, elem, e)
                            }
                            e.stopPropagation()
                        }
                    }

                    if (dependencies === 0) {
                        var id1 = setTimeout(function () {
                            clearTimeout(id1)
                            vmodel.$ready(vmodel, elem)
                            global.$ready(vmodel, elem)
                        }, children ? Math.max(children * 17, 100) : 17)
                        avalon.unbind(elem, "datasetchanged", removeFn)
                        //==================
                        host.rollback = function () {
                            try {
                                vmodel.$dispose(vmodel, elem)
                                global.$dispose(vmodel, elem)
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

                scanTag(elem, [vmodel].concat(host.vmodels))
                avalon.vmodels[vmodel.$id] = vmodel
                if (!elem.childNodes.length) {
                    avalon.fireDom(elem, "datasetchanged", {library: library, vm: vmodel, childReady: -1})
                } else {
                    var id2 = setTimeout(function () {
                        clearTimeout(id2)
                        avalon.fireDom(elem, "datasetchanged", {library: library, vm: vmodel, childReady: -1})
                    }, 17)
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
    } else if (root.contains(elem)) {//IE6-8触发事件必须保证在DOM树中,否则报"SCRIPT16389: 未指明的错误"
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
        $ready: noop,
        $dispose: noop
    }, opts || {})
}

avalon.library("ms")
/*
broswer  nodeName  scopeName  localName
IE9     ONI:BUTTON oni        button
IE10    ONI:BUTTON undefined  oni:button
IE8     button     oni        undefined
chrome  ONI:BUTTON undefined  oni:button

*/
function isWidget(el) { //如果为自定义标签,返回UI库的名字
    if(el.scopeName && el.scopeName !== "HTML" ){
        return el.scopeName
    }
    var fullName = el.nodeName.toLowerCase() 
    var index = fullName.indexOf(":")
    if (index > 0) {
        return fullName.slice(0, index)
    }
}
//各种MVVM框架在大型表格下的性能测试
// https://github.com/RubyLouvre/avalon/issues/859

