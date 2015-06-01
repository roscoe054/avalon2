// bindingHandlers.text 定义在if.js
bindingExecutors.text = function (val, elem, data) {
    val = val == null ? "" : val //不在页面上显示undefined null
    if (elem.nodeType === 3) { //绑定在文本节点上
        if (!data.vnode) {
            var parent = elem.parentNode
            var vid = getUid(parent)
            var vparent = VTree.queryVID(vid)
            var index = getTextOrder(elem, parent)
            data.vnode = vparent.childNodes[index]
        }
        data.vnode.nodeValue = val
//        try { //IE对游离于DOM树外的节点赋值会报错
//            elem.data = val
//        } catch (e) {
    } else { //绑定在特性节点上
       if (!data.vnode) {
            var vid = getUid(elem)
            var velem = VTree.queryVID(vid)
            if(!velem){
                var velem = new VElement(elem, VTree)
                velem.diffContent = true
                data.vnode = velem
            }
        }
         data.vnode.setText(val) 
         globalRender()
//        if ("textContent" in elem) {
//            elem.textContent = val
//        } else {
//            elem.innerText = val
//        }
    }
     globalRender()
}