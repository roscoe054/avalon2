

bindingHandlers.attr = function (data, vmodels) {
    var text = data.value.trim(),
            simple = true
    if (text.indexOf(openTag) > -1 && text.indexOf(closeTag) > 2) {
        simple = false
        if (rexpr.test(text) && RegExp.rightContext === "" && RegExp.leftContext === "") {
            simple = true
            text = RegExp.$1
        }
    }
    data.handlerName = "attr" 
    parseExprProxy(text, vmodels, data, (simple ? 0 : scanExpr(data.value)))
}

bindingExecutors.attr = function (val, elem, data) {
    var method = data.type,
            attrName = data.param
    var vnode = addVnodeToData(elem, data)
    if (method === "css") {
        vnode.style[attrName] = val
        vnode.addTask("css")
    } else if (method === "attr") {
        // ms-attr-class="xxx" vm.xxx="aaa bbb ccc"将元素的className设置为aaa bbb ccc
        // ms-attr-class="xxx" vm.xxx=false  清空元素的所有类名
        // ms-attr-name="yyy"  vm.yyy="ooo" 为元素设置name属性
        vnode.props[attrName] = val
        vnode.addTask("attr")
    } else if(method === "include"){
        includeExecutor(val, elem, data)
    } else {
        if (!root.hasAttribute && typeof val === "string" && (method === "src" || method === "href")) {
            val = val.replace(/&amp;/g, "&") //处理IE67自动转义的问题
        }
        vnode.props[method] = val
        vnode.addTask("attr")
    }
}

//这几个指令都可以使用插值表达式，如ms-src="aaa/{{b}}/{{c}}.html"
"title,alt,src,value,css,href".replace(rword, function (name) {
    bindingHandlers[name] = bindingHandlers.attr
})
