// avalon 1.3.6
/**
 *
 * @cnName 复选框列表
 * @enName checkboxlist
 * @introduce
 *    <p>通过checkboxlist可以方便的实现选框的全选、全不选，并可通过简单配置进行选中操作的回调处理，也可以通过多种方式来提供渲染选项视图所需要的数据</p>
 */
define(["avalon",
    "text!./avalon.checkboxlist.html",
    "css!../style/oniui-common.css",
    "css!./avalon.checkboxlist.css"
], function (avalon, template) {
    var _interface = function () {
    }
    avalon.component("oni:checkboxlist", {
        data: [], //@config 所有选项值的集合，通过此数据来渲染初始视图。可以在组件初始化之前配置data，也可以在异步取得数据之后在配置。当同时配置了data、fetch且在绑定元素内部显示设置了要渲染的checkbox列表，则优先级顺序是：data>fetch>sub elements
        all: false, //@config 默认不选中所有选项
        alltext: "全部", //@config 显示"全部"按钮，方便进行全选或者全不选操作,不需要全选操作的话可以设置alltext为""
        type: "", //@config 内置type为week时的data，用户只需配置type为week即可显示周一到周日的选项 
        /**
         * @config 通过配置fetch来获得要显示的数据，数据格式必须如下所示：
         <pre class="brush:javascript;gutter:false;toolbar:false">
         [
         { text : '文字1' , value : 'w1' } ,
         { text : '文字2' , value : 'w2' } ,
         { text : '文字3' , value : 'w3' } ,
         { text : '文字4' , value : 'w4' }
         ]
         </pre>
         */
        fetch: "",
        $template: template,
        /**
         * @config {Function} 组件面板展开后的回调函数
         * @param data {Array} checkboxlist的选项集合
         * @param checkStatus {Boolean} 选中或者未选中的状态
         * @param target {ElementObj} 触发事件的dom对象的引用
         */
        onSelect: _interface,
        vertical: true, //@config 如果希望选框水平排列则设置vertical为false，默认垂直排列
        duplex: "",
        $construct: function (aaa, bbb, ccc) {
            var options = avalon.mix(aaa, bbb, ccc)

            if (!options.data.length) {

                var fragment = document.createElement("div");
                while (this.firstChild) {
                    fragment.appendChild(this.firstChild);
                }
                switch (options.type) {
                    // 配置了type为week的话，使用组件默认的提供的data
                    case "week":
                        var data = [
                            {text: '周一', value: 'MONDAY'},
                            {text: '周二', value: 'TUESDAY'},
                            {text: '周三', value: 'WEDNESDAY'},
                            {text: '周四', value: 'THURSDAY'},
                            {text: '周五', value: 'FRIDAY'},
                            {text: '周六', value: 'SATURDAY'},
                            {text: '周日', value: 'SUNDAY'}
                        ];
                        break;
                    default:
                        // 既未配置fetch自取data，也没配置type使用默认的data，就需要通过页面提供的html抽取出data
                        var inputs = fragment.getElementsByTagName("input");
                        var data = [];
                        for (var i = 0; i < inputs.length; i++) {
                            var input = inputs[i],
                                li = input.parentNode,
                                txt = "";
                            // 获取离input最近的父级li元素
                            while (li) {
                                if (li.tagName === "LI") {
                                    break;
                                } else {
                                    li = li.parentNode;
                                }
                            }
                            txt = li.textContent || li.innerText;
                            // trim掉li元素中文本两边的空格
                            txt.replace(/^\s+/, "").replace(/\s+$/, "");
                            // 将提取出来的数据保存在data中
                            data.push({
                                text: txt,
                                value: input.value || txt
                            });
                        }
                }

                options.data = data
            }

            options.$template = template.replace("MS_OPTIONS_DUPLEX", options.duplex);

            return options
        },
        _clickOne: _interface,
        _clickAll: _interface,
        $init: function (vm, elem) {

        },
        $ready: function (vm, elem) {
            console.log(elem)
            var ul = elem.getElementsByTagName("ul")[0]
            ul.className += " oni-checkboxlist oni-checkboxlist-list oni-helper-clearfix";
        }

    })


    return avalon;
});
/**
 @links
 [checkboxlist功能全览](avalon.checkboxlist.ex.html)
 [默认配置的checkboxlist组件](avalon.checkboxlist.ex1.html)
 [配置checkboxlist-duplex初始化初始选中的选项，而且可以通过duplex值的改变修正选中项状态](avalon.checkboxlist.ex2.html)
 [checkboxlist组件默认提供了type为week时的data](avalon.checkboxlist.ex3.html)
 [配置checkboxlist-fetch获取用户定义的所有选项值](avalon.checkboxlist.ex4.html)
 [配置onselect回调](avalon.checkboxlist.ex5.html)
 [配置data选项来渲染checkbox](avalon.checkboxlist.ex6.html)
 */
