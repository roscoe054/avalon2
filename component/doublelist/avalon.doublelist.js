/**
 * @cnName doublelist组件
 * @enName doublelist
 * @introduce
 *  <p> 以左右列表形式展示实现的复选组件，不支持ms-duplex，请在onChange回调里面处理类似ms-duplex逻辑</p>
 */
define(["avalon", "text!./avalon.doublelist.html", "css!./avalon.doublelist.css", "css!../chameleon/oniui-common.css"], function(avalon, template) {
    var _interface = function () {}

    avalon.component("oni:doublelist", {
        // 内部变量
        _leftActiveItems: [],
        _rightActiveItems: [],
        _rightItems: [],

        // 内部方法
        _leftToggleActive: _interface,
        _rightToggleActive: _interface,
        _moveToRight: _interface,
        _moveToLeft: _interface,

        // 配置项
        data: [],

        // 回调方法


        // 模板
        $template: template,

        $construct: function (aaa, bbb, ccc) {
            var options = avalon.mix(aaa, bbb, ccc)

            return options
        },

        $init: function (vm, ele) {

        },

        $ready: function (vm, ele) {
            // 操作待添加区域列表项
            vm._leftToggleActive = function(e, item){
                var ele = avalon(this)

                if(ele.hasClass("oni-state-disabled")){
                    return
                } else if(ele.hasClass("oni-state-active")) {
                    ele.removeClass("oni-state-active")

                    var itemPosition = ""

                    avalon.each(vm._leftActiveItems, function(i, listItem){
                        if(listItem.value === item.value){
                            itemPosition = i
                        }
                    })

                    vm._leftActiveItems.splice(itemPosition, 1)

                } else {
                    avalon.each(vm._leftActiveItems, function(i, listItem){
                        if(listItem.value === item.value){
                            return
                        }
                    })

                    ele.addClass("oni-state-active")
                    vm._leftActiveItems.push(item)
                }

                //console.log(vm.$model._leftActiveItems)
            }

            vm._rightToggleActive = function(e, item){
                var ele = avalon(this)

                if(ele.hasClass("oni-state-active")) {
                    ele.removeClass("oni-state-active")

                    var itemPosition = ""

                    avalon.each(vm._rightActiveItems, function(i, listItem){
                        if(listItem.value === item.value){
                            itemPosition = i
                        }
                    })

                    vm._rightActiveItems.splice(itemPosition, 1)
                } else if(!ele.hasClass("oni-state-disabled")){

                    avalon.each(vm._rightActiveItems, function(i, listItem){
                        if(listItem.value === item.value){
                            return
                        }
                    })

                    ele.addClass("oni-state-active")
                    vm._rightActiveItems.push(item)
                }
            }

            vm._moveToRight = function(){
                debugger
                var activeItems = vm.$model._rightItems.concat(vm.$model._leftActiveItems)

                // copy to right
                vm._rightItems = avalon.mix(true, [], activeItems)

                // delete left
                var notDeletedItems = []
                avalon.each(vm.data, function(i, leftItem){
                    var pos = findObjWithAttr(leftItem, "value", activeItems)

                    if(pos === -1){
                        notDeletedItems.push(leftItem)
                    }
                })

                vm.data = notDeletedItems
                vm._leftActiveItems = []
            }

            vm._moveToLeft = function(){
                var activeItems = vm.$model.data.concat(vm.$model._rightActiveItems)

                // copy to left
                vm.data = avalon.mix(true, [], activeItems)

                // delete right
                var notDeletedItems = []
                avalon.each(vm._rightItems, function(i, rightItem){
                    var pos = findObjWithAttr(rightItem, "value", activeItems)

                    if(pos === -1){
                        notDeletedItems.push(rightItem)
                    }
                })

                vm._rightItems = notDeletedItems
                vm._rightActiveItems = []
            }
        }
    })

    function findObjWithAttr(obj, attr, arr){
        for(var i = 0, len = arr.length; i < len; i++){
            if(obj[attr] === arr[i][attr]){
                return i
            }
        }

        return -1
    }

    return avalon;
})