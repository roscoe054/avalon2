//避免使用firstChild，nextSibling，previousSibling等属性，一是提高速度，二是兼容VTree
function scanNodeList(parent, vmodels) {
    var nodes = avalon.slice(parent.childNodes)
    scanNodeArray(nodes, vmodels)
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
function scanNodeArray(nodes, vmodels) {
    var bindings = []
    var parent = nodes[0] ? nodes[0].parentNode : null
    for (var i = 0, node; node = nodes[i]; i++) {
        if (node.nodeType === 3) {
            if (rexpr.test(node.nodeValue)) {
                var tokens = scanExpr(node.nodeValue)
                var generateSignatures = false
                outerLoop:
                        for (var k = 0, token; token = tokens[k++]; ) {
                    if (token.expr) {
                        generateSignatures = true
                        break outerLoop
                    }
                }
                if (generateSignatures) {
                    var fragment = node.isVirtual ? new VDocumentFragment() : DOC.createDocumentFragment()
                    for (k = 0; token = tokens[k++]; ) {
                        if (token.expr) {
                            var signature = generateID("v-" + token.type)
                            token.signature = signature
                            signature += ":" + token.value + (token.filters ? "|" + token.filters.join("|") : "")
                            var start = node.isVirtual ? new VComment(signature) : DOC.createComment(signature)
                            var end = node.isVirtual ? new VComment(signature + ":end") : DOC.createComment(signature + ":end")
                            token.element = end
                            bindings.push(token)
                            fragment.appendChild(start)
                            fragment.appendChild(end)
                        } else {
                            fragment.appendChild(node.isVirtual ? new VText(token.value) : DOC.createTextNode(token.value))
                        }
                    }
                    parent.replaceChild(fragment, node)
                }
            }
        } else if (node.nodeType === 8) {
            var nodeValue = node.nodeValue
            if (nodeValue.slice(-4) !== ":end" && rvtext.test(nodeValue)) {
                var content = nodeValue.replace(rvtext, function (a) {
                    signature = a
                    return ""
                })
                token = getToken(content)
                token.element = node
                token.signature = signature
                token.type = nodeValue.indexOf("v-text") === 0 ? "text" : "html"
                bindings.push(token)
            }
        }
    }
    if (bindings.length) {
        executeBindings(bindings, vmodels)
    }

    for (var i = 0, node; node = nodes[i++]; ) {
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
var rvtext = /^v-(w+)\d+\:/
//实现一个能选择文本节点的选择器
// tagName, vid@8