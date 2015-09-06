function scanAttr(elem, vmodels, match) {
    var scanNode = true
    if (vmodels.length) {
        var attributes = elem.attributes
        var bindings = []
        var msData = {}
        for (var i = 0, attr; attr = attributes[i++]; ) {
            if (match = attr.name.match(rmsAttr)) {
                //如果是以指定前缀命名的
                var type = match[1]
                var param = match[2] || ""
                var value = attr.value
                var name = attr.name
                msData[name] = value
                if (events[type]) {
                    param = type
                    type = "on"
                }
                if (directives[type]) {
                    var binding = {
                        type: type,
                        param: param,
                        element: elem,
                        name: name,
                        expr: value,
                        //chrome与firefox下Number(param)得到的值不一样 #855
                        priority: (directives[type].priority || type.charCodeAt(0) * 10) + (Number(param.replace(/\D/g, "")) || 0)
                    }
                    if (type === "html" || type === "text") {

                        var filters = getToken(value).filters
                        binding.expr = binding.expr.replace(filters, "")
                        binding.filters = filters.replace(rhasHtml, function () {
                            binding.type = "html"
                            binding.group = 1
                            return ""
                        }).trim()
                    } else if (type === "duplex") {
                        var hasDuplex = name
                    } else if (name === "ms-if-loop") {
                        binding.priority += 100
                    }

                    bindings.push(binding)
                    if (type === "widget") {
                        elem.msData = elem.msData || msData
                    }
                }
            }
        }
        if (bindings.length) {
            bindings.sort(bindingSorter)
            var control = elem.type
            if (control && hasDuplex) {
                if (msData["ms-attr-checked"]) {
                    log("warning!" + control + "控件不能同时定义ms-attr-checked与" + hasDuplex)
                }
                if (msData["ms-attr-value"]) {
                    log("warning!" + control + "控件不能同时定义ms-attr-value与" + hasDuplex)
                }
            }
            for (var i = 0, binding; binding = bindings[i]; i++) {
                var type = binding.type
                if (rnoscanAttrBinding.test(type)) {
                    return executeBindings(bindings.slice(0, i + 1), vmodels)
                } else if (scanNode) {
                    scanNode = !rnoscanNodeBinding.test(type)
                }
            }
            executeBindings(bindings, vmodels)
        }
    }
    if (scanNode && !stopScan[elem.tagName] && rbind.test(elem.innerHTML + elem.textContent)) {
        mergeTextNodes && mergeTextNodes(elem)
        scanNodeList(elem, vmodels) //扫描子孙元素
    }
}

var rnoscanAttrBinding = /^if|widget|repeat$/
var rnoscanNodeBinding = /^each|with|html|include$/

var hlmlOne = /^(ms-\S+|on[a-z]+|id|style|class|tabindex)$/
function getOptionsFromTag(elem) {
    var attributes = elem.attributes
    var ret = {}
    for (var i = 0, attr; attr = attributes[i++]; ) {
        if (attr.specified && !hlmlOne.test(attr.name)) {
            ret[camelize(attr.name)] = parseData(attr.value)
        }
    }
    return ret
}