(function () {

    /**

     @example

     <!-- beacon.start -->
     (function(){
          window._ba_utm_init = function(GA){
             var w = window || GA;
             w['_ba_utm_l'] = 'aaa';
             w['_ba_utm_s'] = '1';
             w['_ba_utm_ex'] = {
                a : 'xx' ,
                b : 'xx' ,
                c : 'xx' 
             };
          };
          //-- load ga script
          var s = document.createElement('script');
          s.src = 'http://bc.qunar.com/js/ga.min.js';
          var head = document.getElementsByTagName('head');
          if(head&&head[0]) { head[0].appendChild(s); }
      })();
     <!-- beacon.end -->

     参数：
     location - beacon需要的location，若没设置，则固定为e
     _ba_utm_l = 'aaa';

     s - 当前页面在Beacon系统中ID
     _ba_utm_s = '1';

     该参数是init的回调，可以将配置加入其中
     _ba_utm_init = function(GA){}

     ext - 统计扩展参数
     var _ba_utm_ex = {
      a : 'xx' ,
      b : 'xx' ,
      c : 'xx' 
      };
     */

    /*
     # 0.2
     add: 实际可用浏览器分辨率，屏幕分辨率
     add: 如果页面部署了ga但是没有添加sid，需要记录, 记录项为 utnd=1
     add: 如果页面部署了变量 _ba_utm_stp = true, 则不进行初始化调用
     add: 增加全局变量 __GA__，其中可使用 init , clk , send 进行自由调用
     add: __GA__.init，只会被调用一次，由加载时调用或手工调用
     add: __GA__.clk，可以重复调用，location为clk，参数为 object即可以被发送到beacon
     add: __GA__.send，可以自由重复调用，第一个参数为 自定义location ，第二个参数为 object 即可以被发送到beacon
     */

    var getZoom = (function () {
        var ua = navigator.userAgent;
        var isIE6 = /MSIE\s6/.test(ua);
        var isIE7 = /MSIE\s7/.test(ua);
        var isIE = /MSIE/.test(ua);
        var isFF = /Firefox/.test(ua);
        var body = document.body;
        var documentEl = document.documentElement;
        return function () {
            if (isIE6) {
                return 1;
            } else if (isIE7) {
                return (function () {
                    var factor = 1;
                    if (body.getBoundingClientRect) {
                        var rect = body.getBoundingClientRect();
                        var physicalW = rect.right - rect.left;
                        var logicalW = body.offsetWidth;
                        factor = Math.round((physicalW / logicalW) * 100) / 100;
                    }
                    return factor;
                })();
            } else if (isIE) {
                return Math.round(screen.deviceXDPI * 100 / screen.logicalXDPI) / 100;
            } else if (isFF) {
                if (typeof window.devicePixelRatio != 'undefined') {
                    //firefox>17
                    return Math.round(100 * window.devicePixelRatio) / 100;
                } else {
                    //<17的暂不统计，占用户比例0.18%
                    return 0;
                }
            } else {
                if (!window.innerWidth || !window.outerWidth) {
                    //https://code.google.com/p/chromium/issues/detail?id=45852
                    //https://code.google.com/p/chromium/issues/detail?id=180838
                    return 0;
                }
                //chrome  opera blablabla
                var border = 0;
                if (window.outerWidth != screen.width) {
                    //非最大化模式
                    border += 8;//不精确
                }
                if (documentEl.clientHeight < documentEl.scrollHeight) {
                    //有滚动条要+8像素
                    border += 8;
                }
                var val = (window.outerWidth - border) / window.innerWidth;
                return Math.round(val * 100) / 100;
            }
        }
    })();

    var GA = function () {
        this.param = {};
    };

    GA.VERSION = '0.2'

    GA.prototype.cookie = function (key, value, options) {

        if (arguments.length > 1 && String(value) !== "[object Object]") {
            options = options || {};

            if (value === null || value === undefined) {
                options.expires = -1;
            }

            if (typeof options.expires === 'number') {
                var days = options.expires, t = options.expires = new Date();
                t.setDate(t.getDate() + days);
            }

            value = String(value);

            return (document.cookie = [
                encodeURIComponent(key), '=',
                options.raw ? value : encodeURIComponent(value),
                options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
                options.path ? '; path=' + options.path : '; path=/',
                options.domain ? '; domain=' + options.domain : '',
                options.secure ? '; secure' : ''
            ].join(''));
        }

        // key and possibly options given, get cookie...
        options = value || {};
        var result, decode = options.raw ? function (s) {
            return s;
        } : decodeURIComponent;
        return (result = new RegExp('(?:^|; )' + encodeURIComponent(key) + '=([^;]*)').exec(document.cookie)) ? decode(result[1]) : null;

    };

    GA.prototype.add = function (key, value) {
        if (value != null) {
            this.param[key] = value;
        }
    };

    GA.prototype.getHashString = function (key) {
        var uri = window.location.hash.toString();
        var re = new RegExp("" + key + "=([^&?]*)", "ig");
        return ((uri.match(re)) ? decodeURIComponent((uri.match(re)[0].substr(key.length + 1))) : "");
    };

    GA.prototype.getQueryString = function (key) {
        var uri = window.location.search.toString();
        var re = new RegExp("" + key + "=([^&?]*)", "ig");
        return ((uri.match(re)) ? decodeURIComponent((uri.match(re)[0].substr(key.length + 1))) : "");
    };

    GA.prototype.send = function (location) {
        var l = location || this.get_location();
        var img = new Image();
        img.onload = function () {
            img.onload = null;
            img = null;
        };
        img.src = "http://bc.qunar.com/" + l + "?" + this._collect_params();
    };

    GA.prototype._collect_params = function () {
        var s = [];
        var p = this.param;
        for (var k in p) {
            s.push(k + '=' + encodeURIComponent(p[k]));
        }
        return s.join('&');
    };

    GA.prototype.getDomain = function (_domain) {
        return (_domain || "").replace(/^.+\.(.+?\..+)$/, '$1');
    };

    GA.prototype.get_location = function () {
        if (window['_ba_utm_l']) {
            return window['_ba_utm_l'];
        } else {
            return 'e';
        }
    };

    if (window["QNRGA"]) {
        window["QNR_GA"] = GA;
    } else {
        window["QNRGA"] = GA;
    }

    //------------------

    var ga = new GA();

    var inited = false;

    function _baseparams(ga, param) {
        param = param || window;

        //版本号
        ga.add('utmwv', GA.VERSION);
        //当前唯一ID号，防止GIF被缓存
        ga.add('t', Math.random());
        //屏幕分辨率
        ga.add('utmsr', screen.width + "*" + screen.height);
        //浏览器的屏幕的可用宽度和高度
        ga.add('utmasr', screen.availWidth + "*" + screen.availHeight);
        //屏幕的缩放比例
        var zoomVal;
        try {
            zoomVal = getZoom();
            zoomVal = "" + zoomVal;
            if (zoomVal.length > 10) {
                zoomVal = zoomVal.substring(0, 10);
            }
        } catch (e) {
        }
        if (typeof zoomVal != 'undefined') {
            ga.add('utmz', zoomVal);
        }
        //当前页的reference
        ga.add('utmr', document.referrer || "-1");
        //当前页面的URI
        ga.add('utmp', window.location.href.toString());
        //访问域名
        ga.add('utmhn', window.location.host.toString());
        //当前页面在Beacon系统中ID

        ga.add('s', param['_ba_utm_s'] || null);

        //统计扩展参数
        if (param['_ba_utm_ex']) {
            var ex = param['_ba_utm_ex'];
            for (var key in ex) {
                ga.add(key, ex[key]);
            }
        }

    }

    GA.init = function () {

        if (inited) {
            return;
        }
        inited = true;

        //站内外监测cookie
        var _domain = ga.getDomain(document.domain);
        var in_track = ga.getHashString("in_track") || ga.getQueryString("in_track");
        var ex_track = ga.getHashString("ex_track") || ga.getQueryString("ex_track");
        if (in_track) {
            ga.cookie('QN5', in_track, { domain: _domain });
        }
        if (ex_track) {
            ga.cookie('QN6', ex_track, { domain: _domain });
        }

        var cb = window['_ba_utm_init'];
        if (cb && typeof cb == 'function') {
            try {
                cb.apply(ga, [GA]);
            } catch (e) {
            }
        }

        _baseparams(ga);

        ga.baseParam = {};
        for (var k in ga.param) {
            ga.baseParam[k] = ga.param[k];
        }


        if (window['_ba_utm_s']) {
            ga.send();
        } else {
            ga.add('utnd', 1);
            ga.send();
        }
        ga.sended = true;

    };

    GA.send = function (type, options) {
        if (!inited) {
            return;
        }

        ga.param = ga.baseParam || ga.param;
        ga.baseParam = {};
        for (var k in ga.param) {
            ga.baseParam[k] = ga.param[k];
        }
        if (!type || arguments.length != 2) return;

        options = options || {};
        for (var key in options) {
            if ('_ba_utm_ex' == key || '_ba_utm_s' == key || '_ba_utm_l' == key) {
                continue;
            }
            ga.add(key, options[key]);
        }

        _baseparams(ga, options);


        ga.send(type);

    };


    GA.clk = function (options) {
        GA.send('clk', options);
    };

    window['__GA__'] = GA;


    var pageLoadTime = (new Date()).getTime();
    var TIMEOUT = 10000;
    var init = function () {
        if (window["_ba_utm_stp"] == true) return;
        if (window["_ba_utm_l"]) {
            GA.init();
        } else {
            var now = (new Date()).getTime();
            if (now - pageLoadTime > TIMEOUT) {
                GA.init();
            } else {
                setTimeout(function () {
                    init();
                }, 100);
            }
        }
    };
    init();


})();
