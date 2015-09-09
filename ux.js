
var startTime = new Date - 0
var core = {
    ie: window.VBArray,
    cookieEnabled: navigator.cookieEnabled,
    colorDepth: window.screen.colorDepth || 0,
    mix: function (a, b) {
        for (var i in b) {
            a[i] = b[i]
        }
    },
    setCookie: function (name, val, options) {
        var opt = options || {};
        var enc = opt.encode || encodeURIComponent;
        var pairs = [name + '=' + enc(val)];

        if (null != opt.maxAge) {
            var maxAge = opt.maxAge - 0;
            if (isNaN(maxAge))
                throw new Error('maxAge should be a Number')
            pairs.push('Max-Age=' + maxAge);
        }
        if (opt.domain)
            pairs.push('Domain=' + opt.domain);
        if (opt.path)
            pairs.push('Path=' + opt.path);
        if (opt.expires)
            pairs.push('Expires=' + opt.expires.toUTCString());
        if (opt.httpOnly)
            pairs.push('HttpOnly');
        if (opt.secure)
            pairs.push('Secure');
        document.cookie = pairs.join(";")
    },
    getCookie: function (a) {
        return (a = RegExp("(^| )" + a + "=([^;]*)(;|$)").exec(document.cookie)) ? a[2] : null
    },
    getUUID: function () {
        //http://wiki.corp.qunar.com/pages/viewpage.action?pageId=33264945#%E9%85%92%E5%BA%97%E7%BB%9F%E8%AE%A1-%E6%97%A5%E5%BF%97%E8%A7%84%E8%8C%83-%E4%BC%9A%E8%AF%9DCookie%E8%AE%B0%E5%BD%95%E8%A7%84%E8%8C%83
        return Math.floor(Math.random() * 256).toString(16).toUpperCase()
    },
    getMousePosition: function (a) {
        a = a || window.event;
        var b = document.documentElement.scrollLeft || document.body.scrollLeft,
                c = document.documentElement.scrollTop || document.body.scrollTop;
        return {
            x: a.pageX || a.clientX + b,
            y: a.pageY || a.clientY + c
        }
    },
    getPageContentSize: function () {
        return {
            w: document.body.scrollWidth,
            h: document.body.scrollHeight
        }
    },
    getProtocol: function () {
        return "https:" == document.location.protocol ? " https://" : " http://"
    },
    getReferrer: function () {
        var a = "";
        try {
            a = window.top.document.referrer
        } catch (b) {
            try {
                a = window.parent.document.referrer
            } catch (c) {
                a = ""
            }
        }
        "" === a && (a = document.referrer);
        return a
    },
    getTarget: function (e) {
        var target = e.target || e.srcElement
        return target.nodeType === 3 ? target.parentNode : target
    },
    addEvent: function (a, b, c) {
        a.addEventListener ? a.addEventListener(b, c, !1) : a.attachEvent && a.attachEvent("on" + b, c)
    },
    getParams: function (a) {
        var href = a || locacton.search
        var result = {}, param = /([^?=&]+)=([^&]+)/ig, match;
        while ((match = param.exec(href)) != null) {
            result[match[1]] = match[2];
        }
        return result;
    },
    report: function (location, opts) {

    },
    //用于定时提交在线时间,单位ms
    enableStayTime: function (a) {
        var interval = false
        if (typeof a === "true") {
            var interval = 3000
        }
        if (typeof a === "number") {
            interval = a
        }
        if (interval) {
            setInterval(function () {
                var time = now - startTime
                core.report()
            })
        }
    },
    //上报用户点击指定的元素
    clickElement: function (key, value) {
        core.addEvent(document, "click", function (e) {
            var el = core.getTarget(e)
            if (el.getAttribute(key) === value) {
                core.report()
            }
        })
    }
};



(function () {
    var store = {
    }
    //http://wojodesign.com/full-browser-support-for-localstorage-without-cookies/
    //http://mathiasbynens.be/notes/localstorage-pattern
    var name = "test" + (new Date - 0), localStorageName = "localStorage", storage
    var supportLocalStorage = false;
    try {
        localStorage.setItem(name, "mass");
        localStorage.removeItem(name);
        supportLocalStorage = true;
    } catch (e) {
    }

    if (supportLocalStorage) {
        storage = localStorage;
        core.mix(store, {//重写
            set: function (key, val) {
                if (val === void 0) {
                    return store.remove(key)
                }
                storage.setItem(key, val)
                return val
            },
            get: function (key) {
                return storage.getItem(key)
            },
            remove: function (key) {
                storage.removeItem(key)
            }

        })


    } else if (document.documentElement.addBehavior) {
        var storageOwner,
                storageContainer
        //由于＃userData的存储仅适用于特定的路径，
        //我们需要以某种方式关联我们的数据到一个特定的路径。我们选择/favicon.ico作为一个非常安全的目标，
        //因为所有的浏览器都发出这个URL请求，而且这个请求即使是404也不会有危险。
        //我们可以通过一个ActiveXObject(htmlfle)对象的文档来干这事。
        //(参见:http://msdn.microsoft.com/en-us/library/aa752574(v = VS.85). aspx)
        //因为iframe的访问规则允许直接访问和操纵文档中的元素，即使是404。
        //这文档可以用来代替当前文档（这被限制在当前路径）执行＃userData的存储。
        try {
            var scriptTag = 'script'
            storageContainer = new ActiveXObject('htmlfile')
            storageContainer.open()
            storageContainer.write('<' + scriptTag + '>document.w=window</' + scriptTag + '><iframe src="/favicon.ico"></iframe>')
            storageContainer.close()
            storageOwner = storageContainer.w.frames[0].document
            storage = storageOwner.createElement('div')
        } catch (e) {
            storage = document.createElement('div')
            storageOwner = document.body
        }
        function withIEStorage(storeFunction) {
            return function () {
                var args = Array.prototype.slice.call(arguments, 0)
                args.unshift(storage)
                //  http://msdn.microsoft.com/en-us/library/ms531081(v=VS.85).aspx
                //  http://msdn.microsoft.com/en-us/library/ms531424(v=VS.85).aspx
                storageOwner.appendChild(storage)
                storage.addBehavior('#default#userData')
                storage.load(localStorageName)
                var result = storeFunction.apply(store, args)
                try {
                    storageOwner.removeChild(storage)
                } catch (e) {
                }
                return result
            }
        }
        // In IE7, keys may not contain special chars. See all of https://github.com/marcuswestin/store.js/issues/40
        var forbiddenCharsRegex = new RegExp("[!\"#$%&'()*+,/\\\\:;<=>?@[\\]^`{|}~]", "g")
        function ieKeyFix(key) {
            return key.replace(/^d/, '___$&').replace(forbiddenCharsRegex, '___')
        }
        core.mix(store, {//重写
            set: withIEStorage(function (storage, key, val) {
                key = ieKeyFix(key)
                if (val === void 0) {
                    return store.remove(key)
                }
                storage.setAttribute(key, val + "")
                storage.save(localStorageName)
                return val
            }),
            get: withIEStorage(function (storage, key) {
                key = ieKeyFix(key)
                return storage.getAttribute(key)
            }),
            remove: withIEStorage(function (storage, key) {
                key = ieKeyFix(key)
                storage.removeAttribute(key)
                storage.save(localStorageName)
            })

        })
    }


    try {
        store.set(localStorageName, localStorageName)
        if (store.get(localStorageName) != localStorageName) {
            store.disabled = true
        }
        store.remove(localStorageName);
    } catch (e) {
        store.disabled = true
    }
    core.store = store
})()

var colseTime = core.store.set("colseTime")
if (colseTime) {
    core.store.remove("colseTime")
    core.report()
}


core.addEvent("window", "beforeunload", function () {
    core.store.set("colseTime", new Date - startTime)
})






// http://wiki.corp.qunar.com/pages/viewpage.action?pageId=4360522
// 这里好像不用发
//var uv = core.getCookie("QN1") || core.getCookie("_q") || core.getCookie("QunarGlobal")


//http://www.th7.cn/web/js/201408/52524.shtml
//http://blog.csdn.net/drifterj/article/details/9770533
//pagerid, elementid, type(是点击,还是调用了某方法,还是加载时间,domReady时间,停留时间)
// http://www.arvato-systems.com.cn/website-analysis-digital-marketing-optimization/ibm-coremetrics/functions/