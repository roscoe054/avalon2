//ms-include绑定已由ms-attr绑定实现
bindingHandlers.include = bindingHandlers.attr
bindingExecutors.include = function (val, elem, data) {
    var vmodels = data.vmodels
    if (!data.signature) {
        //保持回调到data
        data.includeRendered = getBindingCallback(elem, "data-include-rendered", vmodels)
        data.includeLoaded = getBindingCallback(elem, "data-include-loaded", vmodels)
        var replace = data.includeReplace = !!avalon(elem).data("includeReplace")
        var parent = replace ? elem.parentNode : elem
        if (avalon(elem).data("includeCache")) {
            data.templateCache = {}
        }
        //下面的逻辑与html绑定差不多
        var signature = data.signature = generateID("v-include")
        var start = DOC.createComment(signature)
        var end = DOC.createComment(signature + ":end")
        if (replace) {
            parent.insertBefore(start, elem)
            parent.replaceChild(end, elem)
            data.element = end
        } else {
            avalon.clearHTML(parent)
            parent.appendChild(start)
            parent.appendChild(end)
        }
    }

    var vmodels = data.vmodels
    var rendered = data.includeRendered
    var loaded = data.includeLoaded
    var replace = data.includeReplace
    var target = replace ? elem.parentNode : elem


    var scanTemplate = function (text) {
        if (loaded) {
            var newText = loaded.apply(target, [text].concat(vmodels))
            if (typeof newText === "string")
                text = newText
        }
        if (rendered) {
            checkScan(target, function () {
                rendered.call(target)
            }, NaN)
        }

        var lastID = data.includeLastID //上次的ID
       
        if (data.templateCache && lastID && lastID !== val) {
            var lastTemplate = data.templateCache[lastID]
            if (!lastTemplate) { //上一次的内容没有被缓存，就创建一个DIV，然后在[移除两个注释节点间的节点]进行收集
                lastTemplate = data.templateCache[lastID] = DOC.createElement("div")
                ifGroup.appendChild(lastTemplate)
            }
        }

        data.includeLastID = val
        //获取注释节点
        var comments = []
        for (var i = 0, el; el = elem.childNodes[i++]; ) {
            if (el.nodeType === 8 && el.nodeValue.indexOf(data.signature) === 0) {
                comments.push(el)
            }
        }
        //移除两个注释节点间的节点
        while (true) {
            var node = comments[0].nextSibling
            if (node && node !== comments[1]) {
                target.removeChild(node)
                if (lastTemplate)
                    lastTemplate.appendChild(node)
            } else {
                break
            }
        }
        var dom = getTemplateNodes(data, val, text)
        var nodes = avalon.slice(dom.childNodes)
        target.insertBefore(dom, comments[1])
        scanNodeArray(nodes, vmodels)
    }
    if (data.param === "src") {
        if (typeof cacheTmpls[val] === "string") {
            avalon.nextTick(function () {
                scanTemplate(cacheTmpls[val])
            })
        } else if (Array.isArray(cacheTmpls[val])) { //#805 防止在循环绑定中发出许多相同的请求
            cacheTmpls[val].push(scanTemplate)
        } else {
            var xhr = getXHR()
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    var s = xhr.status
                    if (s >= 200 && s < 300 || s === 304 || s === 1223) {
                        var text = xhr.responseText
                        for (var f = 0, fn; fn = cacheTmpls[val][f++]; ) {
                            fn(text)
                        }
                        cacheTmpls[val] = text
                    }
                }
            }
            cacheTmpls[val] = [scanTemplate]
            xhr.open("GET", val, true)
            if ("withCredentials" in xhr) {
                xhr.withCredentials = true
            }
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest")
            xhr.send(null)
        }
    } else {
        //IE系列与够新的标准浏览器支持通过ID取得元素（firefox14+）
        //http://tjvantoll.com/2012/07/19/dom-element-references-as-global-variables/
        var el = val && val.nodeType === 1 ? val : DOC.getElementById(val)
        if (el) {
            if (el.tagName === "NOSCRIPT" && !(el.innerHTML || el.fixIE78)) { //IE7-8 innerText,innerHTML都无法取得其内容，IE6能取得其innerHTML
                xhr = getXHR() //IE9-11与chrome的innerHTML会得到转义的内容，它们的innerText可以
                xhr.open("GET", location, false) //谢谢Nodejs 乱炖群 深圳-纯属虚构
                xhr.send(null)
                //http://bbs.csdn.net/topics/390349046?page=1#post-393492653
                var noscripts = DOC.getElementsByTagName("noscript")
                var array = (xhr.responseText || "").match(rnoscripts) || []
                var n = array.length
                for (var i = 0; i < n; i++) {
                    var tag = noscripts[i]
                    if (tag) { //IE6-8中noscript标签的innerHTML,innerText是只读的
                        tag.style.display = "none" //http://haslayout.net/css/noscript-Ghost-Bug
                        tag.fixIE78 = (array[i].match(rnoscriptText) || ["", "&nbsp;"])[1]
                    }
                }
            }
            avalon.nextTick(function () {
                scanTemplate(el.fixIE78 || el.value || el.innerText || el.innerHTML)
            })
        }
    }

}

var rnoscripts = /<noscript.*?>(?:[\s\S]+?)<\/noscript>/img
var rnoscriptText = /<noscript.*?>([\s\S]+?)<\/noscript>/im

var getXHR = function () {
    return new (window.XMLHttpRequest || ActiveXObject)("Microsoft.XMLHTTP") // jshint ignore:line
}

var cacheTmpls = avalon.templateCache = {}

function getTemplateNodes(data, id, text) {
    var div = data.templateCache && data.templateCache[id]
    if (div) {
        var dom = DOC.createDocumentFragment(),
                firstChild
        while (firstChild = div.firstChild) {
            dom.appendChild(firstChild)
        }
        return dom
    }
    return avalon.parseHTML(text)
}