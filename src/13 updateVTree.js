/* 
 更新到VTree
 */


var updateVTree = {
    text: function (vnode, elem, value, data) {
        if (!vnode.childNodes.length) {
            var array = VNodes(elem.childNodes)
            vnode.appendChild(array)
        } else {
            array = VNodes(elem.childNodes)
            array = collectTextNode(array, vnode.childNodes)
            vnode.childNodes.length = 0
            vnode.appendChild(array)
        }
        fillSignatures(vnode, data, new VText(value))
    }
    //if 直接实现在bindingExecutors.attr
    //css 直接实现在bindingExecutors.attr
    //attr 直接实现在bindingExecutors.attr
    //data 直接实现在bindingExecutors.data 
}

//收集两个注释节点间的文本节点
function collectTextNode(aaa, bbb) {//aaa为新的， bbb为旧的
    var k = false
    var array = []
    while (aaa.length) {
        var neo = aaa.shift()
        array.push(neo)
        if (neo.nodeType === 8 && neo.nodeValue.indexOf("v-text") == 0) {
            k = !k
            if (k) {
                var arr = getSignature(bbb, neo.nodeValue)
                if (arr.length) {
                    array = array.concat(arr)
                }
            }
        } else {
            if (k) {
                array.pop()
            }
        }
    }
    return array
}