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
    password_or_vibrate_conf,
    password_setting_conf,
    timeout_sleep_time_conf,
    timeout_sleep_wait_time_conf,
    special_confirm_delay_conf,
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
var password_or_vibrate = password_or_vibrate_conf || "震动(不设置密码)";
var password_setting = parseInt(password_setting_conf) || 123456;
var timeout_sleep_time = parseInt(timeout_sleep_time_conf) || 3 * 60 * 10000;
var timeout_sleep_wait_time = parseInt(timeout_sleep_wait_time_conf) || 15000;
var special_confirm_delay = parseInt(special_confirm_delay_conf) || 1750;

// 快速模式配置 - 减少各种延迟时间
var fast_mode = true; // 默认启用快速模式
var fast_mode_main_loop_delay = fast_mode ? 5 : 10; // 主循环延迟
var fast_mode_stop_delay = fast_mode ? 10 : 20; // 停止时延迟
var fast_mode_check_interval = fast_mode ? 5 : 10; // 检查间隔
var fast_mode_selection_delay = fast_mode ? 0 : 50; // 选择后延迟

// 刷新相关配置
var refresh_on_prepare_sale = true; // 是否在准备发售状态下自动刷新
var max_refresh_attempts = 50; // 最大刷新尝试次数
var refresh_attempt_count = 0; // 当前刷新尝试次数
var start_time = 0;

console.info('[欢迎使用]  抢购脚本');
console.warn('目前的购买方案为: ', purchase_type);
console.warn('目前的抢购数量为: ', purchase_count);
console.warn('目前的抢购规格为: ', specs);
console.info('🚀[规格识别] 支持动态规格识别：单个/整盒/整端');
console.info('🚀[新功能] 已添加"距离开售时间还剩00:00"状态检测');
console.info('🚀[新功能] 自动下拉刷新功能已启用(仅在小程序内部)');
console.info('🚀[新功能] 刷新后立即检测"立即购买"按钮');
console.info('🚀[新功能] 最大刷新次数限制: ' + max_refresh_attempts + '次');
console.info('🚀[新功能] 快速模式已启用 - 优化库存刷新启动速度');
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
    <vertical id="main_window" w="200" padding="6">
        <text id="param_summary" text="参数加载中..." textColor="#888888" textSize="11sp" marginBottom="8" maxLines="4" gravity="left" />
        <horizontal>
            <button id="move_start" text="长按移动" bg="#ffffff" w="80" h="45" visibility="visible" marginBottom="8" />
        </horizontal>
        <button id="settings" text="设置" bg="#000000" color="#ffffff" w="80" h="45" marginBottom="8" />
        <horizontal>
            <button id="start" text="开始" bg="#E83828" w="80" visibility="visible"/>
            <button id="end" text="停止" bg="#444444" w="80" visibility="gone" />
        </horizontal >
    </vertical>
);

w.main_window.attr('alpha', main_window_alpha);

// 检查本地是否有配置文件（如config.json），有则隐藏设置按钮
let configFileExists = false;
try {
    let configPath = files.join(files.cwd(), 'config.json');
    if (files.exists(configPath)) {
        configFileExists = true;
    }
} catch (e) {
    configFileExists = false;
}

if (configFileExists) {
    w.settings.attr('visibility', 'gone');
} else {
    w.settings.attr('visibility', 'visible');
}

function updateParamSummary() {
    let summary =
        "配送: " + purchase_type + " | " +
        "规格: " + specs + " | " +
        "数量: " + purchase_count + "\n" +
        "刷新: " + refresh_delay + "ms | " +
        "随机: " + random_refresh_delay_lower + "-" + random_refresh_delay_upper + "ms\n" +
        "最大时长: " + max_refresh_time + "min | " +
        "振动: " + vibrate_time + "ms";
    w.param_summary.setText(summary);
}

// 初始化时显示一次
updateParamSummary();

function start() {
    script_status = 1;
    start_time = new Date().getTime();
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

// 长按500ms移动，点击固定（无setAdjustEnabled，不出现四角符号）
let moveStartPressTimer = null;
let moveStartPressed = false;
let moveStartLongPressed = false;
let startX = 0, startY = 0, windowX = 0, windowY = 0;

w.move_start.setOnTouchListener(function(view, event) {
    switch (event.getAction()) {
        case event.ACTION_DOWN:
            moveStartPressed = true;
            moveStartLongPressed = false;
            startX = event.getRawX();
            startY = event.getRawY();
            windowX = w.getX();
            windowY = w.getY();
            moveStartPressTimer = setTimeout(function() {
                if (moveStartPressed) {
                    moveStartLongPressed = true;
                }
            }, 500);
            return true;
        case event.ACTION_MOVE:
            if (moveStartLongPressed) {
                let dx = event.getRawX() - startX;
                let dy = event.getRawY() - startY;
                w.setPosition(windowX + dx, windowY + dy);
            }
            return true;
        case event.ACTION_UP:
        case event.ACTION_CANCEL:
            moveStartPressed = false;
            if (moveStartPressTimer) {
                clearTimeout(moveStartPressTimer);
            }
            // 松开时保存位置
            if (moveStartLongPressed) {
                var x = w.getX();
                var y = w.getY();
                storage.put('floaty_position_x', x);
                storage.put('floaty_position_y', y);
                console.warn("[提示] 悬浮窗位置已记录");
            }
            return true;
    }
    return false;
});

w.settings.click(function () {
    'ui';
    dialogs.singleChoice('选择配送方式', ['送到家', '到店取', '来回刷'], ['送到家', '到店取', '来回刷'].indexOf(purchase_type))
    .then(function(deliveryIdx) {
        if (deliveryIdx < 0) return;
        purchase_type = ['送到家', '到店取', '来回刷'][deliveryIdx];
        updateParamSummary();
        dialogs.singleChoice('选择购买规格', ['单个', '整盒'], ['单个', '整盒'].indexOf(specs))
        .then(function(specsIdx) {
            if (specsIdx < 0) return;
            specs = ['单个', '整盒'][specsIdx];
            updateParamSummary();
            dialogs.rawInput('请输入购买数量', purchase_count.toString())
            .then(function(count) {
                if (parseInt(count) > 0) purchase_count = parseInt(count);
                updateParamSummary();
                dialogs.rawInput('库存刷新间隔时间(ms)', refresh_delay.toString())
                .then(function(delay) {
                    if (parseInt(delay) > 0) refresh_delay = parseInt(delay);
                    updateParamSummary();
                    dialogs.rawInput('库存刷新额外最小随机间隔(ms)', random_refresh_delay_lower.toString())
                    .then(function(rmin) {
                        if (parseInt(rmin) > 0) random_refresh_delay_lower = parseInt(rmin);
                        updateParamSummary();
                        dialogs.rawInput('库存刷新额外最大随机间隔(ms)', random_refresh_delay_upper.toString())
                        .then(function(rmax) {
                            if (parseInt(rmax) > 0) random_refresh_delay_upper = parseInt(rmax);
                            updateParamSummary();
                            dialogs.rawInput('库存刷新最大时长(分钟, 0为不限)', max_refresh_time.toString())
                            .then(function(maxr) {
                                if (!isNaN(parseFloat(maxr))) max_refresh_time = parseFloat(maxr);
                                updateParamSummary();
                                dialogs.rawInput('支付页面振动时长(ms)', vibrate_time.toString())
                                .then(function(vib) {
                                    if (parseInt(vib) > 0) vibrate_time = parseInt(vib);
                                    updateParamSummary();
                                    dialogs.rawInput('支付密码（如需自动输入）', password_setting.toString())
                                    .then(function(pwd) {
                                        if (pwd) password_setting = pwd;
                                        updateParamSummary();
                                        toast('参数设置完成！');
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
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
    console.info("check_current_page_tree");
    if (!current_webview) {
        return { header: header_text, status: "no_webview" };
    }
    if (header_text === "确认订单") {
        console.info("确认订单");
        return { header: header_text, status: "confirm_and_pay" };
    } else if (header_text === "访问异常，请稍后重试") {
        console.info("访问异常，请稍后重试");
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

        // 检查是否有"立即购买"按钮
        var buyNowElement = current_webview.findOne(text("立即购买").algorithm('DFS'));
        if (buyNowElement) {
            return { header: header_text, status: "info_page" };
        }

        // 检查是否有"距离开售时间还剩00:00"文字
        var prepareSaleElement = current_webview.findOne(textMatches("距离开售时间还剩\\d{2}:\\d{2}").algorithm('DFS'));
        if (prepareSaleElement) {
            return { header: header_text, status: "prepare_sale" };
        }

        return { header: header_text, status: "default" };
    } else {
        return { header: header_text, status: "default" };
    }
}

// 添加下拉刷新功能
function performPullRefresh(webview) {
    if (!webview) {
        console.warn("[错误] WebView为空，无法执行下拉刷新");
        return false;
    }
    
    try {
        console.info("[操作] 开始执行下拉刷新");
        
        // 获取WebView的边界
        var bounds = webview.bounds();
        var centerX = bounds.centerX();
        
        // 确保在WebView内部进行下拉刷新
        // 从WebView内部上方30%的位置开始，向下拖拽到60%的位置
        var webviewHeight = bounds.height();
        var startY = bounds.top + (webviewHeight * 0.2); // 从WebView顶部30%的位置开始
        var endY = bounds.top + (webviewHeight * 0.8); // 拖拽到WebView 60%的位置
        
        console.info("[操作] 下拉刷新坐标 - 起始: (" + centerX + ", " + startY + "), 结束: (" + centerX + ", " + endY + ")");
        
        // 执行下拉手势
        swipe(centerX, startY, centerX, endY, 600);
        
        console.info("[操作] 下拉刷新手势已执行");
        sleep(3000); // 等待刷新完成
        
        return true;
    } catch (e) {
        console.error("[错误] 下拉刷新失败: " + e.message);
        return false;
    }
}

// 添加替代的滚动刷新方法
function performScrollRefresh(webview) {
    if (!webview) {
        console.warn("[错误] WebView为空，无法执行滚动刷新");
        return false;
    }
    
    try {
        console.info("[操作] 开始执行滚动刷新");
        
        // 获取WebView的边界
        var bounds = webview.bounds();
        var centerX = bounds.centerX();
        var webviewHeight = bounds.height();
        
        // 确保在WebView内部进行滚动操作
        var topPos = bounds.top + (webviewHeight * 0.4); // WebView 40%位置
        var centerPos = bounds.top + (webviewHeight * 0.5); // WebView 50%位置
        var bottomPos = bounds.top + (webviewHeight * 0.6); // WebView 60%位置
        
        console.info("[操作] 滚动刷新坐标 - 中心: (" + centerX + ", " + centerPos + ")");
        
        // 执行轻微的上下滚动动作来触发刷新
        swipe(centerX, centerPos, centerX, topPos, 300);
        sleep(150);
        swipe(centerX, topPos, centerX, bottomPos, 400);
        sleep(300);
        swipe(centerX, bottomPos, centerX, centerPos, 300);
        
        console.info("[操作] 滚动刷新已执行");
        sleep(600);
        
        return true;
    } catch (e) {
        console.error("[错误] 滚动刷新失败: " + e.message);
        return false;
    }
}

// 添加多种刷新方法的组合
function performRefreshActions(webview) {
    console.info("[操作] 开始执行刷新操作");

    var refreshSuccess = false;

    // 方法1: 下拉刷新
    if (!refreshSuccess) {
        refreshSuccess = performPullRefresh(webview);
    }

    // 方法2: 如果下拉刷新失败，尝试滚动刷新
    if (!refreshSuccess) {
        refreshSuccess = performScrollRefresh(webview);
    }

    // 方法3: 如果都失败，尝试点击页面中心进行刷新
    if (!refreshSuccess) {
        try {
            console.info("[操作] 尝试点击页面中心进行刷新");
            var bounds = webview.bounds();
            var centerX = bounds.centerX();
            var centerY = bounds.top + (bounds.height() * 0.5); // WebView中心位置
            
            console.info("[操作] 点击刷新坐标: (" + centerX + ", " + centerY + ")");
            click(centerX, centerY);
            sleep(500);
            refreshSuccess = true;
        } catch (e) {
            console.error("[错误] 点击刷新失败: " + e.message);
        }
    }

    return refreshSuccess;
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

// 等待密码键盘出现并输入密码的函数
function waitAndInputPassword(password) {
    console.info("[密码输入] 开始等待微信支付密码键盘出现...");
    
    var maxWaitTime = 15000; // 最大等待15秒
    var startTime = Date.now();
    var coordinates = null;
    
    // 循环等待直到找到足够的数字按钮
    while (Date.now() - startTime < maxWaitTime) {
        // 检查脚本状态，如果被暂停则退出
        if (script_status == 0) {
            console.info("[密码输入] 脚本已暂停，退出密码输入");
            return false;
        }
        
        coordinates = getPasswordKeyboardCoordinates();
        
        if (coordinates && Object.keys(coordinates).length >= 9) {
            console.info("[密码输入] 已找到足够的数字按钮，开始输入密码...");
            break;
        }
        
        console.info("[密码输入] 等待密码键盘出现... 已等待 " + Math.round((Date.now() - startTime) / 1000) + " 秒");
        sleep(1000); // 等待1秒后重试
    }
    
    // 再次检查脚本状态
    if (script_status == 0) {
        console.info("[密码输入] 脚本已暂停，退出密码输入");
        return false;
    }
    
    if (!coordinates || Object.keys(coordinates).length < 9) {
        console.error("[密码输入] 等待超时或未找到足够的数字按钮");
        return false;
    }
    
    // 输入用户设置的密码
    console.info("[密码输入] 开始输入密码: " + password);
    
    for (var i = 0; i < password.length; i++) {
        // 在每次输入前检查脚本状态
        if (script_status == 0) {
            console.info("[密码输入] 脚本已暂停，停止密码输入");
            return false;
        }
        
        var digit = password.charAt(i);
        var coord = coordinates[digit];
        
        if (coord) {
            console.info("[密码输入] 点击数字 " + digit + " 坐标: (" + coord.x + ", " + coord.y + ")");
            click(coord.x, coord.y);
            sleep(300); // 每次点击间隔300ms
        } else {
            console.error("[密码输入] 未找到数字 " + digit + " 的坐标");
            return false;
        }
    }
    
    console.info("[密码输入] 密码输入完成！");
    
    // 在点击确认前检查脚本状态
    if (script_status == 0) {
        console.info("[密码输入] 脚本已暂停，跳过确认按钮点击");
        return false;
    }
    
    // 可选：自动点击确认按钮
    sleep(500);
    var confirmButton = text("确认").findOne(1000);
    if (!confirmButton) {
        confirmButton = text("完成").findOne(1000);
    }
    if (!confirmButton) {
        confirmButton = desc("确认").findOne(1000);
    }
    if (!confirmButton) {
        confirmButton = desc("完成").findOne(1000);
    }
    
    if (confirmButton) {
        console.info("[密码输入] 找到确认按钮，自动点击确认");
        confirmButton.click();
    } else {
        console.info("[密码输入] 未找到确认按钮，需要手动确认");
    }
    
    return true;
}

// 获取微信支付密码键盘坐标的函数
function getPasswordKeyboardCoordinates() {
    try {
        console.info("[测试] 开始搜索数字键盘坐标...");
        
        // 查找数字1到9的坐标
        var numberCoordinates = {};
        var foundNumbers = [];
        
        // 遍历数字1到9
        for (var i = 1; i <= 9; i++) {
            // 检查脚本状态，如果被暂停则退出
            if (script_status == 0) {
                console.info("[密码坐标] 脚本已暂停，退出密码键盘坐标搜索");
                return null;
            }
            
            var numberText = i.toString();
            
            // 尝试多种方法查找数字按钮
            var numberButton = null;
            
            // 方法1: 直接查找文本
            numberButton = text(numberText).findOne(200);
            if (!numberButton) {
                // 方法2: 查找描述
                numberButton = desc(numberText).findOne(200);
            }
            if (!numberButton) {
                // 方法3: 查找包含数字的TextView
                numberButton = className("android.widget.TextView").text(numberText).findOne(200);
            }
            if (!numberButton) {
                // 方法4: 查找包含数字的Button
                numberButton = className("android.widget.Button").text(numberText).findOne(200);
            }
            if (!numberButton) {
                // 方法5: 查找包含数字的ImageView（某些键盘可能用图片）
                numberButton = className("android.widget.ImageView").desc(numberText).findOne(200);
            }
            if (!numberButton) {
                // 方法6: 查找包含数字的LinearLayout
                numberButton = className("android.widget.LinearLayout").desc(numberText).findOne(200);
            }
            if (!numberButton) {
                // 方法7: 使用正则表达式查找
                numberButton = textMatches(".*" + numberText + ".*").findOne(200);
            }
            if (!numberButton) {
                // 方法8: 查找clickable元素
                numberButton = clickable(true).text(numberText).findOne(200);
            }
            if (!numberButton) {
                // 方法9: 查找RelativeLayout
                numberButton = className("android.widget.RelativeLayout").desc(numberText).findOne(200);
            }
            if (!numberButton) {
                // 方法10: 查找FrameLayout
                numberButton = className("android.widget.FrameLayout").desc(numberText).findOne(200);
            }
            
            if (numberButton) {
                var bounds = numberButton.bounds();
                var centerX = bounds.centerX();
                var centerY = bounds.centerY();
                
                numberCoordinates[numberText] = {
                    x: centerX,
                    y: centerY,
                    left: bounds.left,
                    top: bounds.top,
                    right: bounds.right,
                    bottom: bounds.bottom
                };
                
                foundNumbers.push(numberText);
                console.info("[搜索成功] 找到数字 " + numberText + " 坐标: (" + centerX + ", " + centerY + ")");
            } else {
                // 如果特定数字找不到，记录详细信息
                console.warn("[搜索失败] 未找到数字 " + numberText + " 的按钮");
            }
        }
        
        // 也尝试查找数字0
        // 检查脚本状态，如果被暂停则退出
        if (script_status == 0) {
            console.info("[密码坐标] 脚本已暂停，退出密码键盘坐标搜索");
            return null;
        }
        
        var zeroButton = null;
        zeroButton = text("0").findOne(200);
        if (!zeroButton) {
            zeroButton = desc("0").findOne(200);
        }
        if (!zeroButton) {
            zeroButton = className("android.widget.TextView").text("0").findOne(200);
        }
        if (!zeroButton) {
            zeroButton = className("android.widget.Button").text("0").findOne(200);
        }
        if (!zeroButton) {
            zeroButton = className("android.widget.ImageView").desc("0").findOne(200);
        }
        if (!zeroButton) {
            zeroButton = className("android.widget.LinearLayout").desc("0").findOne(200);
        }
        if (!zeroButton) {
            zeroButton = textMatches(".*0.*").findOne(200);
        }
        if (!zeroButton) {
            zeroButton = clickable(true).text("0").findOne(200);
        }
        if (!zeroButton) {
            zeroButton = className("android.widget.RelativeLayout").desc("0").findOne(200);
        }
        if (!zeroButton) {
            zeroButton = className("android.widget.FrameLayout").desc("0").findOne(200);
        }
        
        if (zeroButton) {
            var bounds = zeroButton.bounds();
            var centerX = bounds.centerX();
            var centerY = bounds.centerY();
            
            numberCoordinates["0"] = {
                x: centerX,
                y: centerY,
                left: bounds.left,
                top: bounds.top,
                right: bounds.right,
                bottom: bounds.bottom
            };
            
            foundNumbers.push("0");
            console.info("[搜索成功] 找到数字 0 坐标: (" + centerX + ", " + centerY + ")");
        } else {
            console.warn("[搜索失败] 未找到数字 0 的按钮");
        }
        
        // 只有当找到足够的数字时才输出详细信息
        if (foundNumbers.length >= 9) {
            console.info("[密码坐标] 成功找到 " + foundNumbers.length + " 个数字按钮: " + foundNumbers.join(", "));
            
            // 输出所有坐标信息
            for (var i = 1; i <= 9; i++) {
                // 检查脚本状态，如果被暂停则退出
                if (script_status == 0) {
                    console.info("[密码坐标] 脚本已暂停，退出坐标信息输出");
                    return null;
                }
                
                var digit = i.toString();
                if (numberCoordinates[digit]) {
                    var coord = numberCoordinates[digit];
                    console.info("[密码坐标] 数字 " + digit + " 坐标: (" + coord.x + ", " + coord.y + ")");
                }
            }
            if (numberCoordinates["0"]) {
                var coord = numberCoordinates["0"];
                console.info("[密码坐标] 数字 0 坐标: (" + coord.x + ", " + coord.y + ")");
            }
            
            // 查找删除按钮和确认按钮
            var deleteButton = text("删除").findOne(200);
            if (!deleteButton) {
                deleteButton = desc("删除").findOne(200);
            }
            if (!deleteButton) {
                deleteButton = text("←").findOne(200);
            }
            if (!deleteButton) {
                deleteButton = desc("←").findOne(200);
            }
            
            if (deleteButton) {
                var bounds = deleteButton.bounds();
                console.info("[密码坐标] 删除按钮坐标: (" + bounds.centerX() + ", " + bounds.centerY() + ")");
            }
            
            var confirmButton = text("确认").findOne(200);
            if (!confirmButton) {
                confirmButton = text("完成").findOne(200);
            }
            if (!confirmButton) {
                confirmButton = desc("确认").findOne(200);
            }
            if (!confirmButton) {
                confirmButton = desc("完成").findOne(200);
            }
            
            if (confirmButton) {
                var bounds = confirmButton.bounds();
                console.info("[密码坐标] 确认按钮坐标: (" + bounds.centerX() + ", " + bounds.centerY() + ")");
            }
        }
        
        return numberCoordinates;
        
    } catch (e) {
        console.error("[密码输入] 获取密码键盘坐标时发生错误: " + e.message);
        return null;
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
        refresh_attempt_count = 0; // 重置刷新尝试次数
        sleep(fast_mode_stop_delay); // 使用快速模式停止延迟
        continue;
    }
    // log("===start===")
    sleep(fast_mode_main_loop_delay); // 使用快速模式主循环延迟
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
            
            // 判断是否需要输入密码
            if (password_or_vibrate === "震动(不设置密码)") {
                console.info("[密码设置] 选择了震动模式，不自动输入密码");
            } else {
                console.info("[密码设置] 选择了自动输入密码模式，密码: " + password_setting);
                console.info("[密码输入] 开始等待微信支付密码键盘...");
                waitAndInputPassword(password_setting.toString());
            }
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
                    // 检查是否有"立即购买"按钮
                    var buyNowBtn = current_webview.findOne(text("立即购买").algorithm('DFS'));
                    if (buyNowBtn) {
                        buyNowBtn.click();
                        console.info("[操作] 点击立即购买按钮");
                        sleep(500);
                    } else {
                        // 如果没有立即购买按钮，检查是否有"距离开售时间还剩00:00"状态
                        var prepareSaleBtn = current_webview.findOne(textMatches("距离开售时间还剩\\d{2}:\\d{2}").algorithm('DFS'));

                        if (prepareSaleBtn) {
                            refresh_attempt_count++;
                            console.warn("[状态] 商品尚未发售，执行刷新操作 (第" + refresh_attempt_count + "次)");

                            // 检查刷新次数限制
                            if (refresh_attempt_count >= max_refresh_attempts) {
                                console.warn("[通知] 已达到最大刷新次数(" + max_refresh_attempts + ")，停止刷新");
                                script_status = 0;
                                ui.post(() => {
                                    w.end.attr('visibility', 'gone');
                                    w.start.attr('visibility', 'visible');
                                });
                                break;
                            }

                            performRefreshActions(current_webview);

                            // 刷新完成后立即检测是否有"立即购买"按钮
                            console.info("[检测] 刷新完成，立即检测是否有'立即购买'按钮");

                            // 等待页面加载完成
                            sleep(1000);

                            // 重新获取当前webview
                            var updated_webview = get_current_webview_fast(current_node);
                            if (updated_webview) {
                                var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                                if (buyNowBtn) {
                                    console.warn("[成功] 🎉 检测到'立即购买'按钮，商品已发售！");
                                    console.info("[操作] 立即点击购买按钮");
                                    buyNowBtn.click();

                                    // 重置刷新计数
                                    refresh_attempt_count = 0;

                                    // 等待页面跳转
                                    sleep(500);
                                    break;
                                } else {
                                    console.info("[检测] 暂未发现'立即购买'按钮，继续等待");
                                }
                            }
                        } else {
                            // 如果没有找到任何识别的按钮，检查是否有"距离开售时间还剩00:00"
                            var prepareSaleBtn = current_webview.findOne(textMatches("距离开售时间还剩\\d{2}:\\d{2}").algorithm('DFS'));

                            if (prepareSaleBtn) {
                                console.info("[检测] 发现倒计时文字，商品尚未发售，等待500ms后再次检测");
                                sleep(500);

                                // 重新获取当前webview，检查是否有"立即购买"按钮
                                var updated_webview = get_current_webview_fast(current_node);
                                if (updated_webview) {
                                    var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                                    if (buyNowBtn) {
                                        console.warn("[成功] 🎉 等待期间检测到'立即购买'按钮，商品已发售！");
                                        console.info("[操作] 立即点击购买按钮");
                                        buyNowBtn.click();

                                        // 重置刷新计数
                                        refresh_attempt_count = 0;

                                        // 等待页面跳转
                                        sleep(500);
                                        break;
                                    }
                                }
                            }

                            // 如果没有找到任何识别的按钮，进行刷新
                            console.info("[操作] 未识别到购买按钮，执行刷新操作");
                            performRefreshActions(current_webview);

                            // 刷新完成后立即检测是否有"立即购买"按钮
                            sleep(1000);
                            var updated_webview = get_current_webview_fast(current_node);
                            if (updated_webview) {
                                var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                                if (buyNowBtn) {
                                    console.warn("[成功] 🎉 检测到'立即购买'按钮，商品已发售！");
                                    console.info("[操作] 立即点击购买按钮");
                                    buyNowBtn.click();

                                    // 重置刷新计数
                                    refresh_attempt_count = 0;

                                    // 等待页面跳转
                                    sleep(500);
                                    break;
                                } else {
                                    console.info("[检测] 暂未发现'立即购买'按钮，继续等待");
                                }
                            }
                        }
                    }
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
        case "prepare_sale":
            submit_flag = false;
            ignore_next_purchase_page_flag = false;

            // 检查刷新次数限制
            if (refresh_attempt_count >= max_refresh_attempts) {
                console.warn("[通知] 已达到最大刷新次数(" + max_refresh_attempts + ")，停止刷新");
                script_status = 0;
                ui.post(() => {
                    w.end.attr('visibility', 'gone');
                    w.start.attr('visibility', 'visible');
                });
                break;
            }

                        console.warn("[状态] 检测到准备发售状态，商品尚未正式发售 (第" + (refresh_attempt_count + 1) + "次检查)");

            // 检查是否有"距离开售时间还剩00:00"文字
            var prepareSaleBtn = current_webview.findOne(textMatches("距离开售时间还剩\\d{2}:\\d{2}").algorithm('DFS'));
            
            if (prepareSaleBtn) {
                refresh_attempt_count++;
                
                console.info("[操作] 发现'距离开售时间还剩00:00'文字，先等待500ms检测是否有'立即购买'按钮 (第" + refresh_attempt_count + "次)");
                
                // 在刷新之前先等待500ms，检测是否有"立即购买"按钮出现
                console.info("[等待] 等待500ms检测是否有'立即购买'按钮出现...");
                sleep(500);
                
                // 重新获取当前webview，检查是否有"立即购买"按钮
                var updated_webview = get_current_webview_fast(current_node);
                if (updated_webview) {
                    var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                    if (buyNowBtn) {
                        console.warn("[成功] 🎉 等待期间检测到'立即购买'按钮，商品已发售！");
                        console.info("[操作] 立即点击购买按钮，跳过刷新操作");
                        buyNowBtn.click();
                        
                        // 重置刷新计数
                        refresh_attempt_count = 0;
                        rebuy_flag = false;
                        
                        // 等待页面跳转
                        sleep(500);
                        break;
                    }
                }
                
                // 如果没有检测到"立即购买"按钮，才进行刷新操作
                console.info("[检测] 500ms内未检测到'立即购买'按钮，开始执行刷新操作");
                
                if (refresh_on_prepare_sale) {
                    performRefreshActions(current_webview);
                    
                    // 刷新完成后立即检测是否有"立即购买"按钮
                    console.info("[检测] 刷新完成，立即检测是否有'立即购买'按钮");
                    
                    // 等待页面加载完成
                    sleep(1000);
                    
                    // 重新获取当前webview（可能已经更新）
                    var updated_webview_after_refresh = get_current_webview_fast(current_node);
                    if (updated_webview_after_refresh) {
                        var buyNowBtn = updated_webview_after_refresh.findOne(text("立即购买").algorithm('DFS'));
                        if (buyNowBtn) {
                            console.warn("[成功] 🎉 刷新后检测到'立即购买'按钮，商品已发售！");
                            console.info("[操作] 立即点击购买按钮");
                            buyNowBtn.click();
                            
                            // 重置刷新计数
                            refresh_attempt_count = 0;
                            rebuy_flag = false;
                            
                            // 等待页面跳转
                            sleep(500);
                            break;
                        } else {
                            console.info("[检测] 刷新后暂未发现'立即购买'按钮，继续等待");
                        }
                    }
                } else {
                    console.info("[配置] 准备发售状态刷新已禁用，仅等待");
                }
                
                // 等待一段时间后再检查
                sleep(refresh_delay);
            } else {
                // 如果没有找到相关按钮，可能页面已经改变，重新检测
                console.info("[操作] 未找到发售状态按钮，可能页面已更新或商品已发售");
                
                // 立即检测是否有"立即购买"按钮
                var buyNowBtn = current_webview.findOne(text("立即购买").algorithm('DFS'));
                if (buyNowBtn) {
                    console.warn("[成功] 🎉 检测到'立即购买'按钮，商品已发售！");
                    console.info("[操作] 立即点击购买按钮");
                    buyNowBtn.click();
                    
                    // 重置刷新计数
                    refresh_attempt_count = 0;
                    rebuy_flag = false;
                    
                    // 等待页面跳转
                    sleep(500);
                    break;
                }
                
                refresh_attempt_count = 0; // 重置刷新计数
                sleep(200);
            }
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
                // 优化的并行识别和点击逻辑
                console.info("[并行选择] 开始同时识别购买方式和规格...");
                
                // 并行查找购买方式和规格的相关元素
                var purchase_type_btn = null;
                var specs_btn = null;
                var purchase_found_method = "";
                var specs_found_method = "";
                
                // 快速扫描页面中的所有相关元素
                console.info("[并行选择] 开始快速扫描页面元素...");
                var allElements = current_webview.find(className("android.view.View").algorithm('DFS'));
                var purchase_elements = [];
                var specs_elements = [];
                
                for (var i = 0; i < allElements.length; i++) {
                    var element = allElements[i];
                    try {
                        var elementText = element.text();
                        if (elementText) {
                            // 检查购买方式元素
                            if (purchase_type != '来回刷' && (elementText.includes(purchase_type) || elementText.includes("送到家") || elementText.includes("到店取"))) {
                                purchase_elements.push({
                                    text: elementText,
                                    element: element,
                                    clickable: element.clickable()
                                });
                            }
                            
                            // 检查规格元素
                            if (elementText.includes("单个") || elementText.includes("整盒") || elementText.includes("整端") || elementText.includes("盲盒")) {
                                specs_elements.push({
                                    text: elementText,
                                    element: element,
                                    clickable: element.clickable()
                                });
                            }
                        }
                    } catch (e) {
                        // 忽略错误
                    }
                }
                
                console.info("[并行选择] 扫描完成 - 购买方式元素: " + purchase_elements.length + " 个, 规格元素: " + specs_elements.length + " 个");
                
                // 并行处理购买方式选择
                if (purchase_type != '来回刷') {
                    console.info("[并行选择] 处理购买方式: " + purchase_type);
                    
                    // 方法1: 从扫描结果中快速匹配
                    for (var i = 0; i < purchase_elements.length; i++) {
                        var element = purchase_elements[i];
                        if (element.text.includes(purchase_type)) {
                            purchase_type_btn = element.element;
                            purchase_found_method = "扫描匹配";
                            console.info("[并行选择] 购买方式扫描匹配成功: " + element.text);
                            break;
                        }
                    }
                    
                    // 方法2: 如果扫描没找到，使用传统方法
                    if (!purchase_type_btn) {
                        purchase_type_btn = current_webview.findOne(text(purchase_type).algorithm('DFS'));
                        if (purchase_type_btn) {
                            purchase_found_method = "精确匹配";
                        } else {
                            purchase_type_btn = current_webview.findOne(textStartsWith(purchase_type).algorithm('DFS'));
                            if (purchase_type_btn) {
                                purchase_found_method = "模糊匹配";
                            }
                        }
                    }
                }
                
                // 并行处理规格选择
                console.info("[并行选择] 处理规格: " + specs);
                
                // 确定规格关键词
                var specs_keywords = [];
                if (specs === "单个") {
                    specs_keywords = ["单个", "盲盒"];
                } else if (specs === "整端(整盒x个)") {
                    specs_keywords = ["整盒", "整端"];
                } else {
                    specs_keywords = [specs];
                }
                
                // 方法1: 从扫描结果中快速匹配
                for (var i = 0; i < specs_elements.length; i++) {
                    var element = specs_elements[i];
                    for (var j = 0; j < specs_keywords.length; j++) {
                        var keyword = specs_keywords[j];
                        if (element.text.includes(keyword)) {
                            specs_btn = element.element;
                            specs_found_method = "扫描匹配";
                            console.info("[并行选择] 规格扫描匹配成功: " + element.text);
                            break;
                        }
                    }
                    if (specs_btn) break;
                }
                
                // 方法2: 如果扫描没找到，使用传统方法
                if (!specs_btn) {
                    for (var i = 0; i < specs_keywords.length; i++) {
                        var keyword = specs_keywords[i];
                        specs_btn = current_webview.findOne(text(keyword).algorithm('DFS'));
                        if (specs_btn) {
                            specs_found_method = "精确匹配";
                            break;
                        }
                        specs_btn = current_webview.findOne(textMatches(".*" + keyword + ".*").algorithm('DFS'));
                        if (specs_btn) {
                            specs_found_method = "包含匹配";
                            break;
                        }
                    }
                }
                
                // 并行执行点击操作
                console.info("[并行选择] 开始执行点击操作...");
                
                // 点击购买方式
                if (purchase_type_btn && purchase_type != '来回刷') {
                    console.info("[并行选择] 点击购买方式，匹配方式: " + purchase_found_method);
                    try {
                        purchase_type_btn.click();
                        console.info("[并行选择] 购买方式点击成功");
                        log("已选择购买方式：" + purchase_type + " (匹配方式: " + purchase_found_method + ")");
                    } catch (e) {
                        console.error("[并行选择] 购买方式点击失败: " + e.message);
                        try {
                            var bounds = purchase_type_btn.bounds();
                            click(bounds.centerX(), bounds.centerY());
                            console.info("[并行选择] 购买方式坐标点击成功");
                        } catch (e2) {
                            console.error("[并行选择] 购买方式坐标点击也失败: " + e2.message);
                        }
                    }
                } else if (purchase_type != '来回刷') {
                    console.warn("[并行选择] 未找到购买方式按钮: " + purchase_type);
                }
                
                // 点击规格
                if (specs_btn) {
                    console.info("[并行选择] 点击规格，匹配方式: " + specs_found_method);
                    try {
                        specs_btn.click();
                        console.info("[并行选择] 规格点击成功");
                        log("已选择规格：" + specs + " (匹配方式: " + specs_found_method + ")");
                    } catch (e) {
                        console.error("[并行选择] 规格点击失败: " + e.message);
                        try {
                            var bounds = specs_btn.bounds();
                            click(bounds.centerX(), bounds.centerY());
                            console.info("[并行选择] 规格坐标点击成功");
                        } catch (e2) {
                            console.error("[并行选择] 规格坐标点击也失败: " + e2.message);
                        }
                    }
                } else {
                    console.warn("[并行选择] 未找到规格按钮: " + specs);
                }
                
                // 立即开始库存刷新，零延迟启动
                var selectionEndTime = new Date().getTime();
                console.info("[并行选择] 选择操作完成，立即开始库存刷新");
                
                // 异步处理通知按钮点击，不阻塞主流程
                if (auto_click_notification) {
                    setTimeout(function() {
                        clickNotifyBtn();
                    }, 5); // 进一步减少异步延迟
                }
                
                var refreshTimeStart = new Date();
                var current_selection = "到店取";
                
                // 立即开始查找确定按钮，零延迟
                var confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
                var refreshStartTime = new Date().getTime();
                console.info("[性能] 库存刷新循环启动时间: " + refreshStartTime + "ms");
                
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
                                sleep(fast_mode_check_interval); // 使用快速模式检查间隔
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
                                var current_time = new Date().getTime();
                                if (current_time - start_time > timeout_sleep_time) {
                                    timeout_flag = true;
                                    console.warn("已超过3分钟未识别到确认按钮，执行暂停操作");
                                    console.warn("等待15秒后重新开始...");
                                    sleep(timeout_sleep_wait_time); // 等待15秒
                                    start_time = new Date().getTime();
                                    break;
                                }
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
                    // 优化刷新延迟计算
                    var random_delay = 0;
                    if (enable_random_delay_conf) {
                        random_delay = Math.floor(Math.random() * (random_refresh_delay_upper - random_refresh_delay_lower + 1)) + random_refresh_delay_lower;
                    }

                    var sleepTarget = refresh_delay + random_delay;
                    
                    // 在等待前先快速检查一次确定按钮
                    confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
                    if (confirm_btn) break;
                    
                    sleep(sleepTarget);
                    
                    // 等待后再次检查确定按钮
                    confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
                    if (confirm_btn) break;

                    purchase_count_label = current_webview.findOne(text("数量").algorithm('DFS'));
                    if (!purchase_count_label) {
                        break;
                    }

                    console.info("[注意] 库存刷新耗时: ", sleepTarget, "ms");

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