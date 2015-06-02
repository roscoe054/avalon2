// bindingHandlers.text 定义在if.js
//bindingHandlers.text = function (data, vmodels) {
//    var bigNumber = Number(data.param)
//    var elem = data.element
//    var isAppend = false
//    var maybe = "v-" + data.type + bigNumber
//    if (elem.nodeType === 1 && bigNumber > 1000) {
//        var comments = getSignatures(elem, maybe)
//        isAppend = comments.length
//    }
//    if (!isAppend) {
//        var signature = bigNumber > 1000 ? maybe : generateID("v-" + data.type)
//        data.signature = signature
//        appendSignatures(elem, data, elem.nodeType !== 1)
//    }
//    parseExprProxy(data.value, vmodels, data)
//}

bindingExecutors.text = function (val, elem, data) {
    val = val == null ? "" : val //不在页面上显示undefined null
    var vnode = addVnodeToData(elem, data)
    if (vnode.nodeType === 3) { //绑定在文本节点上
        vnode.nodeValue = val
        vnode.parentNode.addTask("textFilter")
    } else { //绑定在特性节点上
        vnode.setText(val)
        vnode.addTask("text")
    }
}
