var keyMap = {}
var keys = ["break,case,catch,continue,debugger,default,delete,do,else,false",
    "finally,for,function,if,in,instanceof,new,null,return,switch,this",
    "throw,true,try,typeof,var,void,while,with", /* 关键字*/
    "abstract,boolean,byte,char,class,const,double,enum,export,extends",
    "final,float,goto,implements,import,int,interface,long,native",
    "package,private,protected,public,short,static,super,synchronized",
    "throws,transient,volatile", /*保留字*/
    "arguments,let,yield,undefined"].join(",")
keys.replace(/\w+/g, function (a) {
    keyMap[a] = true
})
var rbracket = /\[(['"]?)([^'"]+)\1\]/
var isIdentifierStart = function (ch) {
    return (ch === 36) || (ch === 95) || // `$` and `_`
            (ch >= 65 && ch <= 90) || // A...Z
            (ch >= 97 && ch <= 122); // a...z
}
function replaceText(str, start, $1, $2) {
    return str.slice(0, start) + "." + str.slice(start).replace("[" + $1 + "]", $2)
}
function parser(input) {
    //静态依赖分析器
    var i = 0
    var wordStart = 0
    var words = {}
    var endString = ""

    var bracketIndex = []
    var isSkip = false


    var getWordContent = function (isWildcard) {
        if (wordStart < 0)
            return
        var wordEnd = i
        var content = input.slice(wordStart, wordEnd)
        var key = wordStart + "-" + (wordEnd - 1)
        words[key] = content
        if (keyMap[content] && input.charAt(wordStart - 1) !== ".") {
            delete words[key]
        }

        if (isWildcard) {
            words[wordStart] = "*"
        }
        wordStart = -1
    }


    var getBracketContent = function (sub) {
        var bracketStart = bracketIndex.pop()
        var bracketEnd = sub ? i - 1 : i
        var content = input.slice(bracketStart, bracketEnd)

        try {
            /* jshint ignore:start */
            var execText = Function("return " + content)()
            /* jshint ignore:end */

            execText += ''
            input = replaceText(input, bracketStart - 1, content, execText)
            i = bracketStart + execText.length - 1
            //这个是字符串,不应该放上去
            words[bracketStart + "-" + i] = execText

            state = "word"
            wordStart = -1
        } catch (e) {
            input = replaceText(input, bracketStart - 1, content, "*")
            i = bracketStart
            words[bracketStart] = "*"

            state = "word"
            wordStart = -1
        }
    }
    var state = "unknown"//初始状态
    var states = {
        "unknown": function () {
            if (isIdentifierStart(ch)) {
                state = "word"
                wordStart = i
            } else if (ch === 34 || ch === 39) {//如果遇到 ' "
                state = "string"
                endString = ch

            } else if (ch === 93) {// 遇到]
                getBracketContent()
            }
        },
        "word": function () {
            if (/\B/.test(cw)) {
                state = "unknown"
                //去掉.与[两边的空白
                input = input.slice(0, i) +
                        input.slice(i).replace(/\s*(\.|\[)\s*/, function (a, b) {
                    return b
                })
                cw = input.charAt(i)
                if (ch === 46) {//如果遇到 .
                    state = "dot"
                    getWordContent()
                    words[i] = "."
                } else if (ch === 91) {// 如果遇到[
                    words[i] = "."
                    getWordContent()
                    bracketIndex.push(i + 1)//先进后出
                } else if (ch === 93) {// 如果遇到]
                    if (wordStart > 0) {
                        getWordContent(true)
                    } else {
                        getBracketContent(true)
                    }
                } else {//如果遇到~!#^&*(){}<>/空白
                    getWordContent()
                }

            }
        },
        "dot": function () {
            state = "unknown"
            //如果是0-9, *, 或是标识符
            if (ch >= 48 && ch <= 57 || ch === 42 || isIdentifierStart(ch)) {//0-9 
                state = "word"
                wordStart = i
            }
        },
        "string": function () {
            if (isSkip) {
                isSkip = false //跳过当前字符的检测
            } else {
                if (ch === 92) {//如果遇到\\
                    isSkip = true
                }
                if (ch === endString) {//如果遇到 " '
                    state = "unknown"
                }
            }
        }
    };
    do {
        var ch = input.charCodeAt(i)
        if (ch !== ch) { //void 0 --> NaN
            getWordContent()
            break
        }
        var cw = input.charAt(i)

        states[state]()
        i++
    } while (true);

    var sorted = []
    for (i in words) {
        var value = words[i]
        var arr = i.split("-")

        sorted.push({
            first: ~~arr[0],
            last: ~~arr[1] || ~~arr[0],
            text: value
        })
    }
    sorted.sort(function (a, b) {
        return a.first - b.first
    })


    var map = {}
    do {
        var next = sorted.shift()
        if (!next) {
            break
        }
        var ok = true
        loop:
                for (i in map) {
            arr = i.split("-")
            if (Number(arr[1]) + 1 === next.first) {

                map[arr[0] + "-" + next.last] = map[i] + next.text
                delete map[i]
                ok = false
                break loop
            }
        }
        if (ok) {
            map[next.first + "-" + next.last] = next.text
        }

    } while (1);
    var result = []
    var uniq = {}
    for (i in map) {
        var v = map[i]
        if (!uniq[v]) {
            uniq[v] = true
            result.push(v)
        }
    }
    return result
}
function addAssign(vars, vmodel, name, binding) {
    var ret = [],
            prefix = " = " + name + "."
    for (var i = vars.length, prop; prop = vars[--i]; ) {
        var arr = prop.split("."), a
        var first = arr[0]
        while (a = arr.shift()) {
            if (vmodel.hasOwnProperty(a)) {
                ret.push(first + prefix + first)
                binding.observers.push({
                    v: vmodel,
                    p: prop
                })

                vars.splice(i, 1)
            }
        }
    }
    return ret
}
function parseExpr(expr, vmodels, binding) {
    if (binding.filters && !binding._filters) {
        binding._filters = parseFilter(binding.filters)
    }
    var vars = parser(expr)
    var expose = new Date() - 0
    var assigns = []
    var names = []
    var args = []
    binding.observers = []
    for (var i = 0, sn = vmodels.length; i < sn; i++) {
        if (vars.length) {
            var name = "vm" + expose + "_" + i
            names.push(name)
            args.push(vmodels[i])
            assigns.push.apply(assigns, addAssign(vars, vmodels[i], name, binding))
        }
    }
    binding.args = args
    if (!assigns.length) {
        assigns.push("fix" + expose)
    }
    if (binding.type === "duplex") {
        var nameOne = {}
        assigns.forEach(function (a) {
            var arr = a.split("=")
            nameOne[arr[0].trim()] = arr[1].trim()
        })
        expr = expr.replace(/[\$\w]+/, function (a) {
            return nameOne[a] ? nameOne[a] : a
        })
        /* jshint ignore:start */
        var fn2 = Function.apply(noop, names.concat("'use strict';" +
                "return function(vvv){" + expr + " = vvv\n}\n"))
        /* jshint ignore:end */

        binding.setter = fn2.apply(fn2, binding.args)
    }

    if (binding.type === "on") { //事件绑定
        if (expr.indexOf("(") === -1) {
            expr += ".call(this, $event)"
        } else {
            expr = expr.replace("(", ".call(this,")
        }
        names.push("$event")
        expr = "\nreturn " + expr + ";" //IE全家 Function("return ")出错，需要Function("return ;")
        var lastIndex = expr.lastIndexOf("\nreturn")
        var header = expr.slice(0, lastIndex)
        var footer = expr.slice(lastIndex)
        expr = header + "\n" + footer
    } else {
        expr = "\nreturn " + expr + ";" //IE全家 Function("return ")出错，需要Function("return ;")
    }
    /* jshint ignore:start */
    var fn = Function.apply(noop, names.concat("'use strict';\nvar " +
            assigns.join(",\n") + expr))
    /* jshint ignore:end */

    return fn

}
//========

function stringifyExpr(code) {
    var hasExpr = rexpr.test(code) //比如ms-class="width{{w}}"的情况
    if (hasExpr) {
        var array = scanExpr(code)
        if (array.length === 1) {
            return array[0].expr
        }
        return array.map(function (el) {
            return el.type ? "(" + el.expr + ")" : quote(el.expr)
        }).join(" + ")
    } else {
        return code
    }
}
//parseExpr的智能引用代理

function parseExprProxy(code, scopes, data) {
    avalon.log("parseExprProxy方法即将被废弃")
    parseExpr(code, scopes, data)
    if (data.evaluator) {
        data.handler = bindingExecutors[data.handlerName || data.type]
        avalon.injectBinding(data)
    }
}


var rthimRightParentheses = /\)\s*$/
var rthimOtherParentheses = /\)\s*\|/g
var rquoteFilterName = /\|\s*([$\w]+)/g
var rpatchBracket = /"\s*\["/g
var rthimLeftParentheses = /"\s*\(/g
function parseFilter(filters) {
    filters = filters
            .replace(rthimRightParentheses, "")//处理最后的小括号
            .replace(rthimOtherParentheses, function () {//处理其他小括号
                return "],|"
            })
            .replace(rquoteFilterName, function (a, b) { //处理|及它后面的过滤器的名字
                return "[" + quote(b)
            })
            .replace(rpatchBracket, function () {
                return '"],["'
            })
            .replace(rthimLeftParentheses, function () {
                return '",'
            }) + "]"
    /* jshint ignore:start */
    return  Function("return [" + filters + "]")()
    /* jshint ignore:end */

}