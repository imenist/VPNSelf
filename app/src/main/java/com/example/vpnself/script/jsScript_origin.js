// 文档地址：https://docs.hamibot.com/
auto.waitFor()
// auto.setMode('fast')
// auto.setFlags(['findOnUiThread']);
console.error("[无障碍] 状态正常");

const {
    delivery,
    specs_conf,
    purchase_count_conf,
    type_conf,
    extra_delay_conf,
    delay_conf,
    enable_random_delay_conf,
    random_delay_lower_conf,
    random_delay_upper_conf,
    max_refresh_time_conf,
    auto_click_notification_conf,
    hide_console_conf,
    disable_click,
    ack_delay_conf,
    debug_mode_conf,
    ignore_ack_conf,
    main_window_alpha_conf,
    ignore_ack_click_delay_conf,
    sku_result_toast_conf,
    rage_stock_refresh_conf,
    vibrate_time_conf,
    special_confirm_delay_conf
} = hamibot.env;
const { onFreeTrial } = hamibot.plan;

if (!hide_console_conf) {
    console.show()
}
var script_status = 0;
// VARS

var purchase_type = delivery || "到店取";
var purchase_count = parseInt(purchase_count_conf) || 1;
var specs = specs_conf || "单个";
var refresh_delay = parseInt(delay_conf) || 300;
var extra_delay = parseInt(extra_delay_conf) || 0;
var max_refresh_time = parseFloat(max_refresh_time_conf) || 0;
var ack_delay = parseInt(ack_delay_conf) || 0;
var auto_click_notification = auto_click_notification_conf || false;
var random_refresh_delay_lower = Math.max(parseInt(random_delay_lower_conf) || 10, 1);
var random_refresh_delay_upper = Math.max(parseInt(random_delay_upper_conf) || 150, 1);
var main_window_alpha = Math.min(Math.max(parseFloat(main_window_alpha_conf) || 0.9, 0.0), 1.0);
var ignore_ack_click_delay = parseInt(ignore_ack_click_delay_conf) || 200;
var last_double_confirm_time = 0;
var last_confirm_time = 0;
var vibrate_time = parseInt(vibrate_time_conf) || 3000;
var special_confirm_delay = parseInt(special_confirm_delay_conf) || 1750;

console.info('[欢迎使用] Dr. PopMart 抢购脚本');
console.warn('目前的购买方案为: ', purchase_type);
console.warn('目前的抢购数量为: ', purchase_count);
console.warn('目前的抢购规格为: ', specs);
if (onFreeTrial) {
    console.error('目前为免费试用版, 功能受到限制，如果觉得好用请重新订阅后再次购买!');
    console.error('在试用期间, 刷新速度的配置选项将无效, 固定为2000ms(2秒)');
    refresh_delay = 2000;
} else {
    console.error('您目前使用的是本脚本的付费版, 功能将不会受到限制!');
    console.error('非常感谢您的支持! 目前脚本将全速运行!');
    console.error("有任何问题或功能建议，欢迎您发工单");
}

var storage = storages.create('DRP');
var w = floaty.window(
    <vertical id="main_window" bg="#000000" alpha="0.9" w="100">
<text id="title" text="Dr. PopMart" gravity="center" textColor="#66ccff" textStyle="bold" />
<horizontal>
<button id="start" text="运行" bg="#00FFFF" w="100" visibility="visible" />
<button id="end" text="停止" bg="#FF0000" w="100" visibility="gone" />
</horizontal >
<button text="" bg="#111111" w="50" h="10" />
<horizontal>
<button id="type_settings" text="方式" bg="#66ccff" w="50" h="40" />
<button id="number_settings" text="数量" bg="#f0ff0f" w="50" h="40" />
</horizontal>
<button text="" bg="#111111" w="50" h="10" />
<horizontal>
<button id="move_start" text="移动" bg="#f0ff0f" w="100" h="40" visibility="visible" />
<button id="move_end" text="固定" bg="#00FFFF" w="100" h="40" visibility="gone" />
</horizontal>
</vertical>
);

w.main_window.attr('alpha', main_window_alpha);

function start() {
    script_status = 1;
    w.end.attr('visibility', 'visible');
    w.start.attr('visibility', 'gone');
}

function stop() {
    script_status = 0;
    w.end.attr('visibility', 'gone');
    w.start.attr('visibility', 'visible');
}

w.start.click(function () {
    start();
    console.error("[状态] 抢购脚本启动");
});

w.end.click(function () {
    stop();
    console.error("[状态] 抢购脚本停止");
});

w.move_start.click(function () {
    w.setAdjustEnabled(true)
    w.move_start.attr('visibility', 'gone');
    w.move_end.attr('visibility', 'visible');
});

w.move_end.click(function () {
    w.setAdjustEnabled(false)
    w.move_start.attr('visibility', 'visible');
    w.move_end.attr('visibility', 'gone');
    // Save position to storage and warn
    var x = w.getX();
    var y = w.getY();
    storage.put('floaty_position_x', x);
    storage.put('floaty_position_y', y);
    console.warn("[提示] 悬浮窗位置已记录");
});

w.type_settings.click(function () {
    'ui';
    const deliveryOptions = ['送到家', '到店取', '来回刷'];
    var deliveryTypeIdx = deliveryOptions.indexOf(purchase_type);
    dialogs
        .singleChoice('请选择配送方案', deliveryOptions, deliveryTypeIdx)
        .then((i) => {
            switch (i) {
                case 0:
                purchase_type = '送到家';
                break;
                case 1:
                purchase_type = '到店取';
                break;
                case 2:
                purchase_type = '来回刷';
                break;
            }
            console.info('目前的购买方案为: ', purchase_type);
            console.info('如果已在运行状态，请停止后重新运行');
        });
});

w.number_settings.click(function () {
    'ui';
    dialogs.rawInput('请输入购买数量', purchase_count).then((new_purchase_count) => {
        if (parseInt(new_purchase_count) > 0) {
            purchase_count = parseInt(new_purchase_count);
            console.info('目前的购买数量为: ', purchase_count);
            console.info('如果已在运行状态，请停止后重新运行');
        } else {
            console.info('请输入正整数, [', new_purchase_count, ']不符合规范');
        }
    });
});

var posX = storage.get('floaty_position_x');
var posY = storage.get('floaty_position_y');
var defaultX = device.width / 2 + 100;
var defaultY = w.getY() + 100;
if (typeof posX === 'number' && typeof posY === 'number' && posX >= 0 && posX + 100 <= device.width) {
    console.warn("[提示] 悬浮窗位置已读取");
    w.setPosition(posX, posY);
} else {
    w.setPosition(defaultX, defaultY);
}

function clickNotifyBtn() {
    var btn = className("android.widget.TextView").text("到货通知").findOne(100);
    if (btn) {
        console.warn("[操作] 已点击到货通知按钮");
        btn.click();
    }
}

function safeDeepChild(node, depth) {
    let current = node;
    let level = 0;

    while (current != null && level < depth) {
        try {
            current = current.child(0);
        } catch (e) {
            log("Exception at level " + level + ": " + e);
            return null;
        }

        level++;
    }

    return current;
}

function get_webview_parent(input_node) {
    var lastRelative = null;
    var output_node = input_node;

    // Go up 13 levels, keep track of the last RelativeLayout
    for (var i = 0; i < 13; i++) {
        if (output_node == null) break;

        if (output_node.className() === "android.widget.RelativeLayout") {
            lastRelative = output_node;
        }

        if (output_node) {
            output_node = output_node.parent();
        }


    }

    // Go 3 levels up from the last found RelativeLayout
    if (lastRelative != null) {
        output_node = lastRelative;
        for (var i = 0; i < 2; i++) {
            if (output_node == null) break;
            output_node = output_node.parent();
        }

        if (output_node != null) {
            let b = output_node.bounds();
        } else {
            log("Top node is null after going up 3 parents.");
        }
    } else {
        log("No RelativeLayout found in 13 levels.");
    }

    return output_node;
}
function get_header_text(current_node) {
    // Get first child if any
    if (!current_node) {
        return "no_header";
    }
    if (current_node.childCount() === 0) {
        return "no_header";
    }
    var firstChild = current_node.child(0);
    if (!firstChild) {
        return "no_header";
    }

    // Check if child is RelativeLayout
    if (firstChild.className() !== "android.widget.RelativeLayout") {
        return "no_header";
    }

    // Get child with highest drawing order
    var relativeLayoutChildren = firstChild.children();
    if (!relativeLayoutChildren || relativeLayoutChildren.length === 0) {
        return "";
    }

    var maxOrder = 0;
    var highestOrderChild = relativeLayoutChildren[0];
    for (var i = 0; i < relativeLayoutChildren.length; i++) {
        var child = relativeLayoutChildren[i];
        var order = child ? child.drawingOrder() : 0;
        if (order > maxOrder) {
            maxOrder = order;
            highestOrderChild = child;
        }
    }

    // Get first child of highest order child
    if (!highestOrderChild) {
        return "";
    }
    var targetChild = highestOrderChild && highestOrderChild.childCount() > 0 ? highestOrderChild.child(0) : null;
    if (!targetChild) {
        return "";
    }

    // Search for TextView using BFS
    var textView = targetChild.findOne(className('android.widget.TextView').algorithm('BFS'));
    if (!textView) {
        return "";
    }

    return textView.text();
}

function get_webview_parent_node() {
    var webview_parent_node = className('android.widget.RelativeLayout').algorithm('BFS').findOne(100);
    if (!webview_parent_node) {
        return null;
    }
    if (!webview_parent_node.parent()) {
        return null;
    }
    var parent1 = webview_parent_node.parent();
    if (!parent1.parent()) {
        return null;
    }
    webview_parent_node = parent1.parent();
    return webview_parent_node;
}

function get_current_node(webview_parent_node) {
    var count = webview_parent_node.childCount();
    if (count == 0) {
        return null;
    }

    var maxOrder = 0;
    var maxOrderIndex = count - 1;
    var hasZeroOrder = false;

    for (var i = 0; i < count; i++) {
        var child = webview_parent_node.child(i);
        var order = child ? child.drawingOrder() : 0;
        if (order === 0) {
            hasZeroOrder = true;
            break;
        }
        if (order > maxOrder) {
            maxOrder = order;
            maxOrderIndex = i;
        }
    }

    if (hasZeroOrder) {
        return webview_parent_node.child(count - 1);
    }

    return webview_parent_node.child(maxOrderIndex);
}

function get_current_webview(current_node) {
    return current_node.findOne(className('android.webkit.WebView').algorithm('DFS')) || null;
}

function get_current_webview_fast(current_node) {
    if (!current_node) {
        return null;
    }
    if (current_node.childCount() < 1) {
        return null;
    }
    var first_child = current_node.child(0);
    if (!first_child) {
        return null;
    }

    if (first_child.className() !== 'android.widget.RelativeLayout') {
        return null;
    }

    var lowest_order_child = null;
    var lowest_order = Number.MAX_VALUE;
    var child_count = first_child.childCount();

    for (var i = 0; i < child_count; i++) {
        var child = first_child.child(i);
        if (!child) continue;
        var order = child.drawingOrder();
        if (order < lowest_order) {
            lowest_order = order;
            lowest_order_child = child;
        }
    }

    if (!lowest_order_child) {
        return null;
    }
    if (lowest_order_child.childCount() < 1) {
        return null;
    }
    var child1 = lowest_order_child.child(0);
    if (!child1) {
        return null;
    }

    var drawing_order_2_child = null;
    var child1_count = child1.childCount();
    for (var i = 0; i < child1_count; i++) {
        var child = child1.child(i);
        if (!child) continue;
        if (child.drawingOrder() === 2) {
            drawing_order_2_child = child;
            break;
        }
    }

    if (!drawing_order_2_child) {
        return null;
    }
    var deep_child = drawing_order_2_child.child(0);
    if (!deep_child || deep_child.childCount() < 1) {
        return null;
    }
    deep_child = deep_child.child(0);
    if (!deep_child || deep_child.childCount() < 1) {
        return null;
    }
    deep_child = deep_child.child(0);
    if (!deep_child || deep_child.childCount() < 1) {
        return null;
    }
    deep_child = deep_child.child(0);
    if (!deep_child) {
        return null;
    }

    var zero_order_child = null;
    var deep_child_count = deep_child.childCount();
    for (var i = 0; i < deep_child_count; i++) {
        var child = deep_child.child(i);
        if (!child) continue;
        if (child.drawingOrder() === 0) {
            zero_order_child = child;
            break;
        }
    }

    if (!zero_order_child) {
        return null;
    }

    if (zero_order_child.childCount() < 1) {
        return null;
    }
    var zero_order_child2 = zero_order_child.child(0);
    if (!zero_order_child2) {
        return null;
    }

    if (zero_order_child2.className() === 'android.webkit.WebView') {
        return zero_order_child2;
    }

    return null;
}


function check_current_page_tree(header_text, current_webview) {

    if (!current_webview) {
        return { header: header_text, status: "no_webview" };
    }
    if (header_text === "确认订单") {
        return { header: header_text, status: "confirm_and_pay" };
    } else if (header_text === "访问异常，请稍后重试") {
        return { header: header_text, status: "error" };
    } else if (header_text == "") {
        var startTime = Date.now();
        var purchaseTypeElement = current_webview.findOne(text("购买方式").algorithm('DFS'));

        if (purchaseTypeElement) {
            return { header: header_text, status: "purchase" };
        }

        if (Date.now() - startTime > 20) {
            return { header: header_text, status: "default" };
        }

        var buyNowElement = current_webview.findOne(text("立即购买").algorithm('DFS'));

        if (buyNowElement) {
            return { header: header_text, status: "info_page" };
        }

        return { header: header_text, status: "default" };
    } else {
        return { header: header_text, status: "default" };
    }
}

function click_plus_btn(current_webview) {
    if (!current_webview) {
        console.warn("[错误] WebView为空");
        return;
    }

    var number_text = current_webview.findOne(className("android.widget.TextView").text("数量").algorithm('DFS'));
    if (!number_text) {
        return;
    }

    var idx_num_text = number_text.indexInParent();
    var parent_view = number_text.parent();
    if (!parent_view) {
        return;
    }

    if (parent_view.childCount() < idx_num_text + 4) {
        return;
    }

    var plus_btn = parent_view.child(idx_num_text + 3);
    if (!plus_btn) {
        return;
    }

    plus_btn.click();
}
function satisfyPurchaseCount(current_webview, target) {
    var number_text = current_webview.findOne(className("android.widget.TextView").text("数量").algorithm('DFS'));
    var idx_num_text = number_text.indexInParent()
    var parent_view = number_text.parent()
    var minus_btn = parent_view.child(idx_num_text + 1);
    var number_count_text = parent_view.child(idx_num_text + 2);
    var plus_btn = parent_view.child(idx_num_text + 3);
    var current = parseInt(number_count_text.text());
    if (isNaN(current)) {
        console.warn("无法处理购买数量: " + number_count_text.text());
        return;
    }
    var current = parseInt(number_count_text.text());
    if (current === target) {
        console.warn("[操作] 当前已满足购买数量要求: " + current);
        return;
    }
    if (current > target) {
        var diff = current - target;
        for (var i = 0; i < diff; i++) {
            minus_btn.click();
            sleep(10);
        }
    } else {
        var diff = target - current;
        for (var i = 0; i < diff; i++) {
            plus_btn.click();
            sleep(10);
        }
    }
}

// STATE VARIABLES - These need to be reset when script_status = 0
var rebuy_flag = false;
var submit_flag = false;
var confirm_btn_retry_count = 0;
var ignore_next_purchase_page_flag = false;

var dc_streak = 0;

var defaultInterval = 150;

while (true) {
    if (script_status == 0) {
        // Reset ALL state variables to ensure clean restart
        rebuy_flag = false;
        submit_flag = false;
        ignore_next_purchase_page_flag = false;
        dc_streak = 0;
        last_double_confirm_time = 0;
        last_confirm_time = 0;
        confirm_btn_retry_count = 0;
        sleep(100);
        continue;
    }
    // log("===start===")
    sleep(50);
    // console.time("get_webview_parent_node");
    var webview_parent_node = get_webview_parent_node();
    if (!webview_parent_node) {
        if (debug_mode_conf) {
            log("Cannot find webview parent node.");
        }
        if (submit_flag) {
            submit_flag = false;
            console.error("[页面检测] 当前处于支付页面");
            console.warn("[通知] 抢购完成! 祝老板大赚!");
            device.vibrate(vibrate_time);
        }
        continue;
    }
    // console.timeEnd("get_webview_parent_node");

    // console.time("get_current_node");
    var current_node = get_current_node(webview_parent_node);
    if (!current_node) {
        if (debug_mode_conf) {
            log("Cannot find current node.");
        }
        continue;
    }
    // console.timeEnd("get_current_node");

    // console.time("get_header_text");
    var header_text = get_header_text(current_node);
    // console.timeEnd("get_header_text");

    // console.time("get_current_webview");
    var current_webview = get_current_webview_fast(current_node);
    if (!current_webview) {
        if (debug_mode_conf) {
            log("Cannot find current webview.");
        }
        continue;
    }
    // console.timeEnd("get_current_webview");

    // console.time("check_current_page_tree");
    var page_info = check_current_page_tree(header_text, current_webview);
    // console.timeEnd("check_current_page_tree");
    if (debug_mode_conf) {
        log("Header: " + page_info.header + ", Status: " + page_info.status);
    }

    switch (page_info.status) {
        case "confirm_and_pay":
        var ignore_next_purchase_page_flag = false;
        rebuy_flag = true;
        if (!current_webview) {
            if (debug_mode_conf) {
                log("Cannot find current webview.");
            }
            sleep(10);
            break;
        }

        // console.time("find_last_view");
        var last_view = null;
        var childCount = current_webview.childCount();
        for (var i = childCount - 1; i >= 0; i--) {
        try {
            var child = current_webview.child(i);
        } catch (e) {
            break;
        }
        if (!child) {
            break;
        }
        if (child.className() === "android.view.View") {
            last_view = child;
            break;
        }
    }
        // console.timeEnd("find_last_view");

        if (!last_view) {
            if (debug_mode_conf) {
                log("Cannot find last view.");
            }
            sleep(30);
            break;
        }

        // console.time("find_confirm_btn");
        var confirm_btn = null;
        if (last_view.childCount() == 4) {
            var confirm_btn = last_view.child(3);
        }
        // console.timeEnd("find_confirm_btn");
        if (confirm_btn) {
            dc_streak = 0;
            confirm_btn.click();
            if (debug_mode_conf) {
                console.error("clicked confirm_btn");
            }
            // console.error("confirm_btn click");
            sleep(extra_delay);
            break;
        }

        // console.time("find_double_confirm");
        var double_confirm = null;
        if (last_view.childCount() == 2) {
            var second_child = last_view.child(1);
            if (second_child && second_child.className() === "android.view.View") {
                if (second_child.childCount() == 1) {
                    var inner_view = second_child.child(0);
                    if (inner_view && inner_view.className() === "android.view.View") {
                        double_confirm = inner_view.child(inner_view.childCount() - 1);
                    }
                }
            }
        }
        // console.timeEnd("find_double_confirm");
        if (double_confirm) {
            if (dc_streak == 0) {
                // console.error("double_confirm click");
                last_double_confirm_time = new Date().getTime();
                double_confirm.click();
                if (debug_mode_conf) {
                    console.error("clicked double_confirm");
                }
                submit_flag = true;
                dc_streak++;
                sleep(250 + extra_delay);
            } else if (dc_streak >= 10) {
                double_confirm.click();
                if (debug_mode_conf) {
                    console.error("clicked double_confirm");
                }
                submit_flag = true;
                dc_streak = 0;
            } else {
                dc_streak++;
                sleep(20);
            }
            break;
        }


        if (ignore_ack_conf) {
            var acknowledge = current_webview.findOne(text("我知道了").algorithm('DFS'));
        } else {
            var acknowledge = last_view.findOne(text("我知道了").algorithm('DFS'));
        }
        if (acknowledge) {
            if (!ignore_ack_conf) {
                // console.error("click acknowledge");
                acknowledge.click();
                if (debug_mode_conf) {
                    console.error("clicked acknowledge");
                }
                sleep(100 + extra_delay + ack_delay);
            } else {
                var hidden_double_confirm = current_webview.findOne(textMatches(/(确认无误|就是这家)/).algorithm('DFS'));
                if (hidden_double_confirm) {
                    if (dc_streak == 0) {
                        last_double_confirm_time = new Date().getTime();
                        hidden_double_confirm.click();
                        submit_flag = true;
                        dc_streak++;
                        sleep(ignore_ack_click_delay);
                        break;
                    }
                }

                var hidden_confirm_btn = current_webview.findOne(text("确认信息并支付").algorithm('DFS'));
                if (hidden_confirm_btn) {
                    dc_streak = 0;
                    hidden_confirm_btn.click();
                    sleep(ignore_ack_click_delay);
                    submit_flag = false;
                    break;
                }
            }
            submit_flag = false;

            break;
        }




        break;
        case "info_page":
        submit_flag = false;
        ignore_next_purchase_page_flag = false;
        if (!rebuy_flag) {
            sleep(100);
            var confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
            if (!confirm_btn) {
                text("立即购买").click();
                sleep(500);
            }
        } else {
            var confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
            if (!confirm_btn) {
                rebuy_flag = false;
            }
            sleep(150);
        }
        // Acknowledge page logic
        break;
        case "error":
        rebuy_flag = false;
        submit_flag = false;
        log("访问异常，账号被风控。");
        // text("我知道了").click();
        sleep(100);
        break;
        case "purchase":
        if (ignore_next_purchase_page_flag) {
            ignore_next_purchase_page_flag = false;
            break;
        }
        submit_flag = false;
        dc_streak = 0;
        if (!rebuy_flag) {
            var purchase_type_text = current_webview.findOne(text("购买方式").algorithm('DFS'));
            if (purchase_type_text) {
                if (purchase_type != '来回刷') {
                    log("当前可以选择购买方式");
                    var purchase_type_btn = current_webview.findOne(text(purchase_type).algorithm('DFS'));
                    if (purchase_type_btn) {
                        purchase_type_btn.click();
                    }
                    log("已选择购买方式：" + purchase_type);
                    sleep(50);
                }

            }
            var specs_text = current_webview.findOne(text("选择规格").algorithm('DFS'));
            if (specs_text) {
                log("当前可以选择规格");
                var specs_btn = current_webview.findOne(textStartsWith(specs).algorithm('DFS'));
                if (specs_btn) {
                    specs_btn.click();
                }
                log("已选择规格：" + specs);
                sleep(100 + extra_delay);
            }
            if (auto_click_notification) {
                clickNotifyBtn();
            }
            var confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
            var refreshTimeStart = new Date();
            var current_selection = "到店取";
            while (!confirm_btn && !rebuy_flag) {
                // max duration logic
                if (max_refresh_time > 0) {
                    var currentTime = new Date();
                    if ((currentTime - refreshTimeStart) > 1000 * 60 * max_refresh_time) {
                        script_status = 0;
                        ui.post(() => {
                            w.end.attr('visibility', 'gone');
                            w.start.attr('visibility', 'visible');
                        });
                        var seconds = parseFloat((max_refresh_time * 60).toFixed(2));
                        console.warn("[通知] 超过设定的库存最大连续刷新时长[", max_refresh_time, "]分钟(", seconds, "秒) ", "，脚本已停止");
                    }
                }
                // script stop logic
                if (script_status == 0) {
                    rebuy_flag = false;
                    submit_flag = false;
                    dc_streak = 0;
                    break;
                }
                var check_start_time = new Date().getTime();
                var purchase_btn = current_webview.findOne(text("立即购买").algorithm('DFS'));

                // refresh logic
                if (purchase_btn) {
                    confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
                    if (confirm_btn) {
                        break;
                    }
                    // safe stock check logic
                    if (!rage_stock_refresh_conf) {
                        var sold_out = current_webview.findOne(text("已售罄").algorithm('DFS'));
                        var refresh_retry = 0;
                        var timeout_flag = false;
                        console.error("正在判断库存情况...");
                        while (!sold_out) {
                            refresh_retry++;
                            if (refresh_retry > 30) {
                                timeout_flag = true;
                                break;
                            }
                            sold_out = current_webview.findOne(text("已售罄").algorithm('DFS'));
                            if (sold_out) {
                                break;
                            }
                            sleep(20);
                            confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
                            if (confirm_btn) {
                                break;
                            }
                            if (script_status == 0) {
                                rebuy_flag = false;
                                submit_flag = false;
                                dc_streak = 0;
                                break;
                            }
                        }
                        if (sold_out) {
                            console.warn("已售罄");
                        } else if (confirm_btn) {
                            console.warn("有库存");
                        }

                        // refresh logic
                        if (timeout_flag || sold_out) {
                            if (sku_result_toast_conf) {
                                click_plus_btn(current_webview);
                            }
                            if (purchase_type != '来回刷') {
                                if (!rebuy_flag) {
                                    purchase_btn.click();
                                }

                            } else {
                                var current_selection_btn = current_webview.findOne(text(current_selection).algorithm('DFS'));
                                if (current_selection_btn) {
                                    current_selection_btn.click();
                                    if (current_selection == '到店取') {
                                        current_selection = '送到家';
                                    } else {
                                        current_selection = '到店取';
                                    }
                                    sleep(100);
                                }
                            }
                        }
                    } else {
                        if (purchase_type != '来回刷') {
                            if (!rebuy_flag) {
                                purchase_btn.click();
                            }
                        } else {
                            var current_selection_btn = current_webview.findOne(text(current_selection).algorithm('DFS'));
                            if (current_selection_btn) {
                                current_selection_btn.click();
                                if (current_selection == '到店取') {
                                    current_selection = '送到家';
                                } else {
                                    current_selection = '到店取';
                                }
                                sleep(100);
                            }
                        }
                    }

                }

                confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
                if (confirm_btn) {
                    break;
                }
                var random_delay = Math.floor(Math.random() * (random_refresh_delay_upper - random_refresh_delay_lower + 1)) + random_refresh_delay_lower;
                if (!enable_random_delay_conf) {
                    random_delay = 0;
                }

                var sleepTarget = refresh_delay + random_delay;
                sleep(sleepTarget);
                confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
                if (confirm_btn) break;

                purchase_count_label = current_webview.findOne(text("数量").algorithm('DFS'));
                if (!purchase_count_label) {
                    break;
                }

                console.info("[注意] 库存刷新耗时: ", refresh_delay + random_delay, "ms");
                confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
                if (confirm_btn) {
                    break;
                }

            }
            if (script_status == 0) {
                continue;
            }
            var purchase_count_text = current_webview.findOne(text("数量").algorithm('DFS'));
            if (purchase_count_text) {
                satisfyPurchaseCount(current_webview, purchase_count);
                log("已满足购买数量要求: ", purchase_count);
            }
        }

        confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
        // add retry count if not confirm_btn found for like 10 times, then disable the rebuy_flag
        if (confirm_btn) {
            confirm_btn_retry_count = 0;
            if (ignore_ack_conf) {
                var now = new Date().getTime();
                var elapsed = now - last_double_confirm_time;
                if (elapsed >= special_confirm_delay) {
                    console.warn("[等待] 确认按钮点击时间已超过", special_confirm_delay, "ms，点击确认");
                    confirm_btn.click();
                    rebuy_flag = true;
                    ignore_next_purchase_page_flag = true;
                } else {
                    console.warn("[等待] 为防止反复被打回， 等待", special_confirm_delay - elapsed, "ms后点击确认");
                    sleep(special_confirm_delay - elapsed);
                    confirm_btn.click();
                    rebuy_flag = true;
                    ignore_next_purchase_page_flag = true;
                }
            } else {
                var now = new Date().getTime();
                var elapsed = now - last_confirm_time;
                if (elapsed >= 450) {
                    last_confirm_time = now;
                    confirm_btn.click();
                    rebuy_flag = true;
                    ignore_next_purchase_page_flag = true;
                }
                rebuy_flag = true;
                ignore_next_purchase_page_flag = true;
            }
            sleep(150 + extra_delay);
        } else {
            confirm_btn_retry_count++;
            if (confirm_btn_retry_count >= 10) {
                confirm_btn_retry_count = 0;
                rebuy_flag = false;
                submit_flag = false;
                dc_streak = 0;
                ignore_next_purchase_page_flag = false;
                break;
            }
        }
        break;
        case "purchase_ready":
        var confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
        if (confirm_btn) {
            confirm_btn.click();
        }
        sleep(200);
        break;
        case "default":
        // Default logic
        break;
        case "no_webview":
        // log("No current webview found");
        break;
        default:
        // log("Unknown status: " + page_info.status);
        break;
    }
}
