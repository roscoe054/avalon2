/*********************************************************************
 *                           依赖调度系统                             *
 **********************************************************************/
//检测两个对象间的依赖关系
var dependencyDetection = (function () {
    var outerFrames = []
    var currentFrame
    return {
        begin: function (binding) {
            //accessorObject为一个拥有callback的对象
            outerFrames.push(currentFrame)
            currentFrame = binding
        },
        end: function () {
            currentFrame = outerFrames.pop()
        },
        collectDependency: function (array) {
            if (currentFrame) {
                //被dependencyDetection.begin调用
                currentFrame.callback(array)
            }
        }
    };
})()
//将绑定对象注入到其依赖项的订阅数组中
var roneval = /^on$/

function returnRandom() {
    return new Date() - 0
}

avalon.injectBinding = function (binding) {

    binding.handler = binding.handler || directives[binding.type].update || noop
    binding.update = function () {

        if (!binding.evaluator) {
            parseExpr(binding.expr, binding.vmodels, binding)
        }
        try {
            dependencyDetection.begin({
                callback: function (array) {
                    injectDependency(array, binding)
                }
            })

            var valueFn = roneval.test(binding.type) ? returnRandom : binding.evaluator
            //console.log(valueFn+"")
            var value = valueFn.apply(0, binding.args)
          

            if (binding.type === "duplex") {
                value() //ms-duplex进行依赖收集
            }

            dependencyDetection.end()
            if (binding.signature) {
                var xtype = avalon.type(value)
                if (xtype !== "array" && xtype !== "object") {
                    throw Error("warning:" + binding.expr + "只能是对象或数组")
                }
                binding.xtype = xtype
                // 让非监数组与对象也能渲染到页面上
                var vtrack = getProxyIds(binding.proxies || [], xtype)
                var mtrack = value.$track || (xtype === "array" ? createTrack(value.length) :
                        Object.keys(value))

                binding.track = mtrack
                if (vtrack !== mtrack.join(";")) {
                    binding.handler.call(binding, value, binding.oldValue)
                    binding.oldValue = 1
                }
            } else {
                if (binding.oldValue !== value) {
                    binding.handler.call(binding, value, binding.oldValue)
                    binding.oldValue = value
                }
            }
        } catch (e) {
            delete binding.evaluator
            log("warning:exception throwed in [avalon.injectBinding] ", e)
            var node = binding.element
            if (node && node.nodeType === 3) {
                node.nodeValue = openTag + (binding.oneTime ? "::" : "") + binding.expr + closeTag
            }
        }

    }
    binding.update()

}


//将依赖项(比它高层的访问器或构建视图刷新函数的绑定对象)注入到订阅者数组
function injectDependency(list, binding) {
    if (binding.oneTime)
        return
    if (list && avalon.Array.ensure(list, binding) && binding.element) {
        injectDisposeQueue(binding, list)
    }
}


function getProxyIds(a, isArray) {
    var ret = []
    for (var i = 0, el; el = a[i++]; ) {
        ret.push(isArray ? el.$id : el.$key)
    }
    return ret.join(";")
}
