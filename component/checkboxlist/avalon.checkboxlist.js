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

    var _interface = function () {}

    avalon.component("oni:checkboxlist", {
        // 内部方法
        _clickOne: _interface,
        _clickAll: _interface,

        // 配置项
        data: [], //@config 所有选项值的集合，通过此数据来渲染初始视图。
        val: [], //@config 选中的checkbox value数组
        all: false, //@config 默认不选中所有选项
        alltext: "全部", //@config 显示"全部"按钮，方便进行全选或者全不选操作,不需要全选操作的话可以设置alltext为""
        type: "", //@config 内置type为week时的data，用户只需配置type为week即可显示周一到周日的选项

        // 回调方法
        onSelect: _interface,

        // 模板
        $template: template,

        $construct: function (aaa, bbb, ccc) {
            var options = avalon.mix(aaa, bbb, ccc)

            if (!options.data.length) {

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
                        break;
                }
                options.data = data
            }

            return options
        },

        $init: function (vm) {
            // data重置时同步val
            vm.$watch("data", function(newData){
                var val = vm.$model.val,
                    newVal = []

                avalon.each(newData, function(i, newItem){
                    var itemData = newItem.$model

                    if(val.indexOf(itemData.value) !== -1){
                        newVal.push(itemData.value)
                    }
                })

                vm.val = newVal
            })
        },

        $ready: function (vm) {

            vm._clickAll = function(e){
                var listData = vm.$model.data,
                    selectedLen = vm.val.length

                if(selectedLen < listData.length){
                    vm.val = []

                    avalon.each(listData, function(i, listItem){
                        vm.val.push(listItem.value)
                    })
                } else{
                    vm.val = []
                }

                setTimeout(function(){
                    vm.onSelect(e, vm.$model.val)
                }, 0)
            }

            vm._clickOne = function(e, index){
                var listData = vm.$model.data

                setTimeout(function(){
                    vm.all = vm.val.length === listData.length
                    vm.onSelect(e, vm.$model.val, index)
                }, 0)
            }

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
