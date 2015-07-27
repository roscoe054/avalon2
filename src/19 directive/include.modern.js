var rnoscripts = /<noscript.*?>(?:[\s\S]+?)<\/noscript>/img
var rnoscriptText = /<noscript.*?>([\s\S]+?)<\/noscript>/im

var getXHR = function () {
    return new window.XMLHttpRequest() // jshint ignore:line
}

var templatePool = avalon.templateCache = {}

function getTemplateNodes(binding, id, text) {
    var div = binding.templateCache && binding.templateCache[id]
    if (div) {
        var dom = avalonFragment.cloneNode(false),
            firstChild
        while (firstChild = div.firstChild) {
            dom.appendChild(firstChild)
        }
        return dom
    }
    return avalon.parseHTML(text)
}
avalon.directive("include", {
    init: directives.attr.init,
    update: function (val) {
        var binding = this
        var elem = this.element
        var vmodels = binding.vmodels
        var rendered = binding.includeRendered
        var loaded = binding.includeLoaded
        var replace = binding.includeReplace
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
            var lastID = binding.includeLastID
            if (binding.templateCache && lastID && lastID !== val) {
                var lastTemplate = binding.templateCache[lastID]
                if (!lastTemplate) {
                    lastTemplate = binding.templateCache[lastID] = DOC.createElement("div")
                    ifGroup.appendChild(lastTemplate)
                }
            }
            binding.includeLastID = val
            while (true) {
                var node = binding.start.nextSibling
                if (node && node !== binding.end) {
                    target.removeChild(node)
                    if (lastTemplate)
                        lastTemplate.appendChild(node)
                } else {
                    break
                }
            }
            var dom = getTemplateNodes(binding, val, text)
            var nodes = avalon.slice(dom.childNodes)
            target.insertBefore(dom, binding.endInclude)
            scanNodeArray(nodes, vmodels)
        }

        if (binding.param === "src") {
            if (typeof templatePool[val] === "string") {
                avalon.nextTick(function () {
                    scanTemplate(templatePool[val])
                })
            } else if (Array.isArray(templatePool[val])) { //#805 防止在循环绑定中发出许多相同的请求
                templatePool[val].push(scanTemplate)
            } else {
                var xhr = getXHR()
                xhr.onload = function () {
                    var text = xhr.responseText
                    for (var f = 0, fn; fn = templatePool[val][f++];) {
                        fn(text)
                    }
                    templatePool[val] = text
                }
                templatePool[val] = [scanTemplate]
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
                avalon.nextTick(function () {
                    scanTemplate(el.value || el.innerText || el.innerHTML)
                })
            }
        }
    }
})
