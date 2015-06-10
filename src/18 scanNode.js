//避免使用firstChild，nextSibling，previousSibling等属性，一是提高速度，二是兼容VTree
function scanNodeList(parent, vmodels) {
    var nodes = avalon.slice(parent.childNodes)
    scanNodeArray(nodes, vmodels, parent.getAttribute("data-vid"))
}
//function scanNodeList(parent, vmodels) {
//    var node = parent.firstChild
//    while (node) {
//        var nextNode = node.nextSibling
//        scanNode(node, node.nodeType, vmodels)
//        node = nextNode
//    }
//}
//ms-if --> <!--v-if-->
//ms-if-loop --> <!--v-if-->
//ms-include --> <!--v-include123123--><!--v-include123123:end-->
//
//{{expr}} --> <!--v-text123213:expr--><!--v-text123213:expr:end-->
//{{expr|html}} --> <!--v-thtml123213:expr--><!--v-text123213:expr:end-->
function scanNodeArray(nodes, vmodels, pid) {
    var bindings = []
    var firstChild = nodes[0] || {}
    var isVirtual = firstChild.isVirtual == true
    var doc = isVirtual ? VDOC : DOC //使用何种文档对象来创建各种节点
    var inDom = firstChild.parentNode && firstChild.parentNode.nodeType === 1
    var nodeIndex = 0, parent, skipHtml = false
    for (var i = 0, node; node = nodes[i]; i++) {
        switch (node.nodeType) {
            case 1:
                if (!skipHtml) {
                    nodeIndex++
                }
                break
            case 3:
                if (!skipHtml && rexpr.test(node.nodeValue)) {
                    var tokens = scanExpr(node.nodeValue)
                    var generatePlaceholders = false
                    outerLoop:
                            for (var t = 0, token; token = tokens[t++]; ) {
                        if (token.expr) {
                            generatePlaceholders = true
                            break outerLoop
                        }
                    }
                    if (generatePlaceholders) {//如果要生成占位用的注释节点
                        parent = parent || node.parentNode
                        pid = pid || buildVTree(parent)
                        var fragment = doc.createDocumentFragment()
                        for (t = 0; token = tokens[t++]; ) {
                            if (token.expr) {
                                var signature = "v-" + token.type + pid + "." + nodeIndex++
                                token.signature = signature
                                signature += ":" + token.value + (token.filters ? "|" + token.filters.join("|") : "")
                                var start = doc.createComment(signature)
                                var end = doc.createComment(signature + ":end")
                                token.element = end
                                bindings.push(token)
                                fragment.appendChild(start)
                                fragment.appendChild(end)
                            } else {
                                fragment.appendChild(doc.createTextNode(token.value))
                            }
                        }
                        parent.replaceChild(fragment, node)
                    }
                }
                break
            case 8:
                var nodeValue = node.nodeValue //如果后端渲染时已经生成好注释节点
                if (!skipHtml && rvtext.test(nodeValue)) {
                    //<b data-vid=".1.0">1</b><!-v-html><b>2</b><!--v-html:end><b data-vid=".1.1">3</b>
                    nodeIndex++
                    var content = nodeValue.replace(rvtext, function (a) {
                        signature = a
                        return ""
                    })
                    token = getToken(content)
                    token.element = node
                    token.signature = signature
                    token.type = nodeValue.indexOf("v-text") === 0 ? "text" : "html"
                    if (token.type === "html") {
                        skipHtml = nodeValue + ":end"
                    }
                    bindings.push(token)
                } else if (nodeValue === skipHtml) {
                    skipHtml = false
                }
                break
        }
    }

    if (bindings.length) {
        if (!isVirtual && inDom) { //如果是扫描真实DOM树，那么我们需要在虚拟DOM树复制这一部分节点
            vparent = VTree.queryVID(parent.getAttribute("data-vid"))
            vparent.childNodes.length = 0
            nodeIndex = 0
            skipHtml = false
            for (i = 0, node; node = parent.childNodes[i]; i++) {
                switch (node.nodeType) {
                    case 1:
                        if (!skipHtml) {
                            var vid = pid + "." + nodeIndex++
                            node.setAttribute("data-vid", vid)
                        }
                        var vnode = VDOC.createElement(node.tagName, vparent)
                        vnode.vid = vid
                        break
                    case 3:
                        vnode = VDOC.createTextNode(node.nodeValue)
                        vparent.appendChild(vnode)
                        break
                    case 8:
                        var nodeValue = node.nodeValue
                        if (!skipHtml && rvtext.test(nodeValue)) {
                            nodeIndex++
                            if (nodeValue.indexOf("v-html") === 0) {
                                skipHtml = nodeValue + ":end"
                            }
                        } else if (nodeValue === skipHtml) {
                            skipHtml = false
                        }
                        vnode = VDOC.createComment(nodeValue)
                        vparent.appendChild(vnode)
                        break

                }
            }
            executeBindings(bindings, vmodels)
        }
    }
    for (i = 0; node = nodes[i++]; ) {
        scanElement(node, node.nodeType, vmodels)
    }
}
function scanElement(node, nodeType, vmodels) {
    if (nodeType === 1) {
        if (node.isVirtual) {
            scanVTag(node, vmodels)
        } else {
            scanTag(node, vmodels) //扫描元素节点
        }
        if (node.msCallback) {
            node.msCallback()
            node.msCallback = void 0
        }
    }
}
var rvtext = /^v\-[a-z]+[\.\d]+/
//实现一个能选择文本节点的选择器
// tagName, vid@8