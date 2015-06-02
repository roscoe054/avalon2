// bindingHandlers.text 定义在if.js
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

