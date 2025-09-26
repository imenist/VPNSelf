// 文档地址：https://docs.hamibot.com/
var scriptCode = "25.10.1J";
auto.waitFor()
var has_been_started = false;
var groupMessageListenerStarted = false; // 已在群内的消息监听是否已启动
var lastWeChatMsgSignature = ""; // 上次最新消息签名（用于判重）
var groupMsgContainerCount = -1; // 群聊消息容器上次的数量（用于size对比）
var lastContainerCount = -1; // 记录上一次的容器数量，用于检测变化
var noContainerRetryCount = 0; // 记录连续找不到容器的次数
var noContainerRetryCountbjz = 0; // 记录连续找不到容器的次数
var lastMiniProgramCaption = null; // 记录最近一次的小程序文案(biq)，用于对比是否变化
var isProcessingNotification = false; // 防止通知点击重复执行
var notificationListenerActive = true; // 通知监听器是否激活
// auto.setMode('fast')
// auto.setFlags(['findOnUiThread']);
//console.error("[无障碍] 状态正常");

// 获取并显示屏幕尺寸信息
var screenWidth = device.width;
var screenHeight = device.height;
var monitorShopNameMax = null; //最高优先级监听商店名称
var globalNotificationText = null; // 存储通知文本，用于门店选择跳过逻辑
var skipStoreSelection = false; // 全局标志：是否跳过门店选择

const {
    delivery,
    refresh_mode_conf,
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
    debug_mode_conf,
    main_window_alpha_conf,
    ignore_ack_click_delay_conf,
    ignore_ack_click_confirm_delay_conf,
    sku_result_toast_conf,
    script_start_immediately_conf,
    script_pause_when_success_conf,
    vibrate_time_conf,
    password_or_vibrate_conf,
    password_setting_conf,
    timeout_sleep_wait_time_conf,
    special_confirm_delay_conf,
    hide_sleep_time_conf,
    select_index_conf,
    anti_rebound_mode, //防回弹设置
    order_submission_mode,
    successful_data_conf,//成功数据隐藏设置
    monitoring_group_name,//监控群名
    monitor_content_conf,//监控内容
    monitoring_shop_name_conf,//监控点名
    purchase_reduced_conf,//购买数量减少设置
} = hamibot.env;
const { onFrnameeeTrial } = hamibot.plan;
// 获取Hamibot设备信息
function getHamibotDeviceInfo() {
    try {
        // 获取设备基本信息
        var deviceInfo = {
            brand: device.brand || "未知品牌",
            model: device.model || "未知型号",
        };

        // 获取Hamibot特定信息
        var hamibotInfo = {
            deviceName: hamibot.robotName || "未知设备名" // 使用 hamibot.robotName
        };

        return {
            device: deviceInfo,
            hamibot: hamibotInfo
        };
    } catch (e) {
        console.error("获取设备信息失败: " + e.message);
        return null;
    }
}
// 用于gitpop加密
function jvVerify() {
    try {
      if (!hamibot.env.JWT_TOKEN) return;
      let response = http.get('https://jv.hamibot.cn/v1/verify/jv1_1at0ar3pUDx0yzTMpgNbhUwV8672hQDN', {
        headers: {
          Authorization: 'Bearer ' + hamibot.env.JWT_TOKEN,
        },
      });
      return response.statusCode === 200;
    } catch (e) {}
  }

  let verified = jvVerify();
  if (!verified) {
    toastLog("GIT POP版本已过期，请更新最新版本");
  }else{
    toastLog('GIT POP');
  }

// 查找第5个TextView并打印的函数
function findAndPrintFifthTextView(current_node) {
    try {
        var updated_webview = get_current_webview_fast(current_node);
        if (updated_webview) {
            var textViews = updated_webview.find(className("android.widget.TextView").algorithm('DFS'));
            if (textViews.length >= 5) {
                var fifthTextView = textViews[4]; // 第5个TextView (索引为4)
                var fifthText = fifthTextView.text();
            } else {}
        } else {
            console.info("无法获取当前webview");
        }
    } catch (e) {}
}


var textViewInfoAdded = false;// 标记是否已经添加过TextView信息

// 获取指定索引的TextView文本并存储到全局变量
function getSpecificTextViews(current_node) {
    try {
        if (textViewInfoAdded) {
            return;
        }
        var updated_webview = get_current_webview_fast(current_node);
        if (updated_webview) {
            var textViews = updated_webview.find(className("android.widget.TextView").algorithm('DFS'));
            var originalInfo = globalTextViewInfo.slice();
            globalTextViewInfo = [];
            for (var i = 0; i < originalInfo.length; i++) {
                globalTextViewInfo.push(originalInfo[i]);
            }
            var orderDetailIndex = -1;
            var targetTexts = [];
            for (var i = 0; i < textViews.length; i++) {
                try {
                    var textView = textViews[i];
                    var textContent = textView.text() || "";

                    if (textContent === "订单详情") {
                        orderDetailIndex = i;
                        break;
                    }
                } catch (e) {
                }
            }
            if (orderDetailIndex !== -1) {
                var firstIndex;
                if (purchase_type === '到店取') {
                    firstIndex = 1; // 到店取：获取索引1的textView
                } else if (purchase_type === '送到家') {
                    firstIndex = orderDetailIndex + 6;
                    if (firstIndex < textViews.length) {
                        try {
                            var checkTextView = textViews[firstIndex];
                            var checkText = checkTextView.text() || "";
                            if (checkText !== "配送方式快递配送") {
                                firstIndex = -1;
                            }
                        } catch (e) {
                            firstIndex = -1;
                        }
                    } else {
                        firstIndex = -1;
                    }
                }
                if (firstIndex < textViews.length) {
                    try {
                        var firstTextView = textViews[firstIndex];
                        var firstText = firstTextView.text() || "";
                        targetTexts.push(firstText);
                    } catch (e) {
                        targetTexts.push("");
                    }
                } else {
                    targetTexts.push("");
                }
                for (var j = 1; j <= 3; j++) {
                    var targetIndex = orderDetailIndex + j;
                    if (targetIndex < textViews.length) {
                        try {
                            var targetTextView = textViews[targetIndex];
                            var targetText = targetTextView.text() || "";
                            targetTexts.push(targetText);
                        } catch (e) {
                            targetTexts.push("");
                        }
                    } else {
                        targetTexts.push("");
                    }
                }
                for (var k = 0; k < targetTexts.length; k++) {
                    globalTextViewInfo.push(targetTexts[k]);
                }
            } else {
                for (var i = 0; i < 4; i++) {
                    globalTextViewInfo.push("网络异常获取失败");
                }
            }
            textViewInfoAdded = true;// 标记已经添加过TextView信息
        } else {
            console.warn("[TextView信息] 无法获取webview，无法提取TextView信息");
        }
    } catch (e) {
        console.error("[TextView信息] 提取TextView信息时发生错误: " + e.message);
    }
}



// 默认隐藏控制台，除非明确设置为显示
if (hide_console_conf) {
    console.hide();
} else if(!hide_console_conf){
    console.show();
}
var script_status = 0;


// VARS
var globalTextViewInfo = [];// 全局变量：存储指定TextView的文本信息 [TextView[1], TextView[8], TextView[9], TextView[10]]
var purchase_type = delivery || "到店取";
var refresh_mode = refresh_mode_conf || "智能刷"; // 刷新模式：智能刷，切换刷，页面刷
var purchase_count = parseInt(purchase_count_conf) || 1;
var specs = specs_conf || "单个";
var spec_selection = 2; // 选择规格变量，默认值为2
var refresh_delay = parseInt(delay_conf) || 600;
var select_index = parseInt(select_index_conf) || 1; // 选择索引配置，1代表第一个选项，2代表第二个选项，以此类推
var extra_delay = parseInt(extra_delay_conf) || 0;
var max_refresh_time = parseFloat(max_refresh_time_conf) || 0;
var auto_click_notification = auto_click_notification_conf || false;
var random_refresh_delay_lower = Math.max(parseInt(random_delay_lower_conf) || 10, 1);
var random_refresh_delay_upper = Math.max(parseInt(random_delay_upper_conf) || 50, 1);
var main_window_alpha = Math.min(Math.max(parseFloat(main_window_alpha_conf) || 1.0, 0.0), 1.0);
var ignore_ack_click_delay = parseInt(ignore_ack_click_delay_conf) || 200;
var ignore_ack_click_confirm_delay = parseInt(ignore_ack_click_confirm_delay_conf) || 800;
var last_double_confirm_time = 0;
var last_confirm_time = Date.now();
var vibrate_time = (vibrate_time_conf !== null && vibrate_time_conf !== undefined && vibrate_time_conf !== '' && !isNaN(parseInt(vibrate_time_conf))) ? parseInt(vibrate_time_conf) : 3000;
var password_or_vibrate = password_or_vibrate_conf || "震动(不设置密码)";
var password_setting = parseInt(password_setting_conf) || 123456;
var timeout_sleep_wait_time = parseInt(timeout_sleep_wait_time_conf) || 0;
var special_confirm_delay = parseInt(special_confirm_delay_conf) || 400;
var pattern_choice = "抢购模式"; // 抢购模式，兑换模式，盒机模式
var hide_sleep_time = parseFloat(hide_sleep_time_conf) || 0;
var order_submission_mode_conf = order_submission_mode || "普通模式";
var exchange_points = 5000; // 兑换积分，默认5000
var keyword_text = ""; // 关键词，默认为空
var monitor_content = monitor_content_conf || "小程序";//监控内容
var monitoring_shop_name = monitoring_shop_name_conf;//监控商店内容

// 检查内容是否包含监控关键词
// 检测文本中是否包含【】并设置purchase_type
// function detectAndSetPurchaseType(text) {
//     try {
//         if (!text) return;

//         // 模糊检查是否包含【】
//         var hasBrackets = /【.*?】/.test(text);

//         if (hasBrackets) {
//             purchase_type = "到店取";
//         } else {
//             purchase_type = "送到家";
//         }
//     } catch (e) {
//         log("检测配送方式失败: " + e.message);
//     }
// }

function containsMonitorContent(text) {
    if (!text || !monitor_content) return false;
    // 必须包含的关键词（AND逻辑）
    var requiredKeywords = ["小程序"];

    // 检查是否包含所有必需关键词
    for (var i = 0; i < requiredKeywords.length; i++) {
        if (!text.includes(requiredKeywords[i])) {
            return false;
        }
    }

    // 按"/"分割监控内容（OR逻辑）
    var keywords = monitor_content.split("/");

    // 检查文本是否包含任一关键词（使用模糊匹配）
    for (var i = 0; i < keywords.length; i++) {
        var keyword = keywords[i].trim();
        if (keyword) {
            // log("[调试] 检查关键词: " + keyword + " 在文本: " + text);
            if (isFlexibleMatch(text, keyword)) {
                log("[触发] 关键词：" + keyword );
                // 检测并设置配送方式
                // detectAndSetPurchaseType(text);
                return true;
            }
        }
    }
    return false;
}

// 定时器配置 - 脚本自动结束时间（分钟）
var script_auto_exit_time_conf = hamibot.env.script_auto_exit_time_conf;
var script_auto_exit_time = parseInt(script_auto_exit_time_conf) || 1440; // 默认1440分钟（24小时）后自动退出
var script_start_time = 0; // 脚本启动时间戳
var last_timer_display_minute = 0; // 上次显示定时器信息的时间（分钟）

// 快速模式配置 - 减少各种延迟时间
var fast_mode = true; // 默认启用快速模式
var fast_mode_main_loop_delay = fast_mode ? 5 : 10; // 主循环延迟
var fast_mode_stop_delay = fast_mode ? 10 : 20; // 停止时延迟
var fast_mode_check_interval = fast_mode ? 5 : 10; // 检查间隔
var fast_mode_selection_delay = fast_mode ? 0 : 50; // 选择后延迟

// 刷新相关配置
var confirmButtonExecuted = false; //标记是否已执行确认按钮逻辑
var refresh_on_prepare_sale = true; // 是否在准备发售状态下自动刷新
var max_refresh_attempts = 50; // 最大刷新尝试次数
var refresh_attempt_count = 0; // 当前刷新尝试次数
var start_time = 0;
var purchasee_pagee_count = 0;
var selectionEndTime = null; // 选择操作结束时间

// === 支付线程执行计数器 ===
var confirm_positioning_value = null;
var paymentThreadStartTime = 0;

var wechatNotificationListener = null;

var cached_confirm_info_coords = null; // 缓存"确认信息并支付"按钮坐标
var cached_double_confirm_coords = null; // 缓存"确认无误"按钮坐标
var cached_double_exactly_coords = null; // 缓存"就是这家"按钮坐标
var cached_confirm_pay_coords = null; // 缓存"确认支付"按钮坐标
var calibration_status = {
    confirm_info: false,
    double_confirm: false,
    double_exactly: false,
    confirm_pay: false
};
// 添加点击状态跟踪，确保顺序点击
var confirmInfoClicked = false;
var doubleConfirmClicked = false;

// 预计算坐标对象
var precomputedCoords = {
    confirm_info: { x: 0, y: 0 },
    double_confirm: { x: 0, y: 0 },
    double_exactly: { x: 0, y: 0 },
    confirm_pay: { x: 0, y: 0 }
};

//console.info('[欢迎使用]  抢购脚本');
console.error('目前的购买方案为: ', purchase_type);
console.error('目前的抢购数量为: ', purchase_count);
console.error('目前的抢购规格为: ', specs);
console.error('库存刷新时间: ', refresh_delay + "ms");
console.error('确认信息并支付点击后等待时间: ', ignore_ack_click_delay + "ms");
console.error('就是这家/确认无误点击后等待时间: ', ignore_ack_click_confirm_delay + "ms");
console.error('确定按钮点击后等待时间: ', special_confirm_delay + "ms");
//if (onFreeTrial) {
//    console.error('目前为免费试用版, 功能受到限制，如果觉得好用请重新订阅后再次购买!');
//    console.error('在试用期间, 刷新速度的配置选项将无效, 固定为2000ms(2秒)');
//    refresh_delay = 2000;
//} else {
//    console.error('您目前使用的是本脚本的付费版, 功能将不会受到限制!');
//    console.error('非常感谢您的支持! 目前脚本将全速运行!');
//    console.error("有任何问题或功能建议，欢迎您发工单");
//}

// === 初始化坐标缓存系统 ===
//console.info('[坐标缓存] 正在加载已保存的坐标...');
loadCoordinatesFromStorage();
// 初始化时检查校准状态
// if (!calibration_status.confirm_info || !calibration_status.double_confirm || !calibration_status.double_exactly) {
//     // 只显示弹窗提示，用户点击确定即可
//     dialogs.alert('校准提示', '请先完成按钮校准后再启动脚本\n\n请在脚本中点击  【设置】 ，并找到  【校准按钮】  点击，并按照文字信息对应页面按钮逐一校准');
// }

var storage = storages.create('GITPOP');
var w = floaty.window(
    <vertical id="main_window" w="56" h="352">
<img id="custom_image" src="https://i.imgs.ovh/2025/08/11/EXg6O.jpeg" w="56" h="14" marginBottom="3"/>
<button id="info_box" text="智能刷" bg="#80000000" color="#ffffff" w="56" h="25" marginBottom="8" textSize="10sp" padding="0" gravity="center" />
<button id="pattern_choice_btn" text={pattern_choice} bg="#FF8C00" color="#ffffff" w="56" h="45" marginBottom="8" textSize="12sp" />
<button id="delivery_type" text={purchase_type} bg="#0f57f7" color="#ffffff" w="56" h="45" marginBottom="8" textSize="12sp" />
<button id="spec_selection_btn" text="选择规格" bg="#FF9800" color="#ffffff" w="56" h="45" marginBottom="8" textSize="12sp" visibility="gone" />
<button id="purchase_count_btn" text={"数量: " + purchase_count} bg="#752092" color="#ffffff" w="56" h="45" marginBottom="8" textSize="12sp" />
<button id="settings" text="设置" bg="#000000" color="#ffffff" w="56" h="45" marginBottom="8" textSize="12sp" />
<button id="consume_points_btn" text="消耗积分" bg="#FF6B6B" color="#ffffff" w="56" h="45" marginBottom="8" textSize="12sp" visibility="gone" />
<button id="total_amount_btn" text="商品词" bg="#000000" color="#ffffff" w="56" h="45" marginBottom="8" textSize="12sp" visibility="gone" />
<horizontal>
<button id="start" text="开始" bg="#E83828" w="56" h="45" visibility="visible" textSize="12sp"/>
<button id="end" text="停止" bg="#f9ca5e" w="56" h="45" visibility="gone" textSize="12sp" />
</horizontal >
</vertical>
);

ui.post(() => {
    w.main_window.attr('alpha', main_window_alpha);
});

// 圆角按钮工具与初始化
function dp(value) {
    return Math.floor(value * (context.getResources().getDisplayMetrics().density));
}
function setRoundedBg(view, colorHex, radiusDp) {
    try {
        var drawable = new android.graphics.drawable.GradientDrawable();
        drawable.setColor(colors.parseColor(colorHex));
        drawable.setCornerRadius(dp(radiusDp || 6));
        view.setBackground(drawable);
    } catch (e) {}
}
// 初始化所有按钮为圆角背景
setRoundedBg(w.info_box, '#80000000', 6);
setRoundedBg(w.pattern_choice_btn, '#FF8C00', 6);
setRoundedBg(w.delivery_type, (purchase_type === '送到家') ? '#E83828' : '#0f57f7', 6);
setRoundedBg(w.spec_selection_btn, '#FF9800', 6);
setRoundedBg(w.purchase_count_btn, '#752092', 6);
setRoundedBg(w.settings, '#000000', 6);
setRoundedBg(w.consume_points_btn, '#FF6B6B', 6);
setRoundedBg(w.total_amount_btn, '#000000', 6);
setRoundedBg(w.start, '#E83828', 6);
setRoundedBg(w.end, '#f9ca5e', 6);

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

ui.post(() => {
    if (configFileExists) {
        w.settings.attr('visibility', 'gone');
    } else {
        w.settings.attr('visibility', 'visible');
    }
});

function updateParamSummary() {
    try {
        let display_count = purchase_count;
        if (typeof purchase_count === 'number' && purchase_count > 99) {
            display_count = '99+';
        }
        ui.post(() => {
            w.delivery_type.setText(purchase_type);
            w.purchase_count_btn.setText('件数: ' + display_count);
        });
        return;
    } catch (e) {

    }
}

function updateInfoBox() {
    try {
        // 根据当前模式显示不同内容
        ui.post(() => {
            if (pattern_choice === '兑换模式') {
                // 兑换模式：显示兑换积分
                w.info_box.setText(exchange_points.toString());
            } else if (pattern_choice === '盒机模式') {
                // 盒机模式：显示盒机状态
                w.info_box.setText("盒机模式");
            } else {
                // 抢购模式：显示刷新模式状态
                w.info_box.setText(refresh_mode);
            }
        });
    } catch (e) {
        console.error("[信息框更新] 更新失败: " + e.message);
    }
}

// 统一的UI同步函数，确保所有模式切换时UI状态正确
function syncUIForMode() {
    try {
        ui.post(() => {
            // 先隐藏所有可能显示的按钮
            w.info_box.attr('visibility', 'gone');
            w.pattern_choice_btn.attr('visibility', 'gone');
            w.delivery_type.attr('visibility', 'gone');
            w.settings.attr('visibility', 'gone');
            w.purchase_count_btn.attr('visibility', 'gone');
            w.consume_points_btn.attr('visibility', 'gone');
            w.total_amount_btn.attr('visibility', 'gone');
            w.spec_selection_btn.attr('visibility', 'gone');

            // 根据当前模式显示对应的按钮
            if (pattern_choice === '抢购模式') {
                // 抢购模式：显示info_box, pattern_choice_btn, delivery_type, purchase_count_btn, settings
                w.info_box.attr('visibility', 'visible');
                w.pattern_choice_btn.attr('visibility', 'visible');
                w.delivery_type.attr('visibility', 'visible');
                w.purchase_count_btn.attr('visibility', 'visible');
                w.settings.attr('visibility', 'visible');
                w.consume_points_btn.attr('visibility', 'gone');
                w.total_amount_btn.attr('visibility', 'gone');
                w.spec_selection_btn.attr('visibility', 'gone');

                // 设置窗口高度
                w.main_window.attr('h', '308');

                // 更新信息框
                w.info_box.setText(refresh_mode);

            } else if (pattern_choice === '兑换模式') {
                // 兑换模式：显示info_box, pattern_choice_btn, purchase_count_btn, consume_points_btn
                w.info_box.attr('visibility', 'visible');
                w.pattern_choice_btn.attr('visibility', 'visible');
                w.purchase_count_btn.attr('visibility', 'visible');
                w.consume_points_btn.attr('visibility', 'visible');
                w.total_amount_btn.attr('visibility', 'gone');
                w.spec_selection_btn.attr('visibility', 'gone');
                w.delivery_type.attr('visibility', 'gone');
                w.settings.attr('visibility', 'gone');

                // 设置窗口高度
                w.main_window.attr('h', '255');

                // 更新信息框
                w.info_box.setText(exchange_points.toString());

            } else if (pattern_choice === '盒机模式') {
                // 盒机模式：显示info_box, pattern_choice_btn, spec_selection_btn, purchase_count_btn, total_amount_btn
                w.info_box.attr('visibility', 'visible');
                w.pattern_choice_btn.attr('visibility', 'visible');
                w.spec_selection_btn.attr('visibility', 'visible');
                w.purchase_count_btn.attr('visibility', 'visible');
                w.total_amount_btn.attr('visibility', 'visible');
                w.delivery_type.attr('visibility', 'gone');
                w.settings.attr('visibility', 'gone');
                w.consume_points_btn.attr('visibility', 'gone');

                // 设置窗口高度：14(图片) + 3(边距) + 25(info_box) + 8(边距) + 45(pattern_choice_btn) + 8(边距) + 45(spec_selection_btn) + 8(边距) + 45(purchase_count_btn) + 8(边距) + 45(total_amount_btn) + 8(边距) + 45(开始按钮) = 300
                w.main_window.attr('h', '308');

                // 更新信息框
                w.info_box.setText("盒机模式");
            }
        });
    } catch (e) {
        console.error("[UI同步] 同步失败: " + e.message);
    }
}


function updateStorage() {
    // 确认信息并支付点击后等待时间
    var s_ignore_ack_click_delay = storage.get("s_ignore_ack_click_delay");
    if (s_ignore_ack_click_delay !== null && s_ignore_ack_click_delay !== undefined && s_ignore_ack_click_delay !== '') {
        ignore_ack_click_delay = parseInt(s_ignore_ack_click_delay);
        console.info("[本地读取参数更] 确认信息并支付点击后等待时间: " + ignore_ack_click_delay + "ms");
    }

    // 就是这家/确认无误点击后等待时间
    var s_ignore_ack_click_confirm_delay = storage.get("s_ignore_ack_click_confirm_delay");
    if (s_ignore_ack_click_confirm_delay !== null && s_ignore_ack_click_confirm_delay !== undefined && s_ignore_ack_click_confirm_delay !== '') {
        ignore_ack_click_confirm_delay = parseInt(s_ignore_ack_click_confirm_delay);
        console.info("[本地读取参数更新] 就是这家/确认无误点击后等待时间: " + ignore_ack_click_confirm_delay + "ms");
    }
    // 确定按钮后等待时间的本地读取
    var s_special_confirm_delay = storage.get("s_special_confirm_delay");
    if (s_special_confirm_delay !== null && s_special_confirm_delay !== undefined && s_special_confirm_delay !== '') {
        special_confirm_delay = parseInt(s_special_confirm_delay);
        console.info("[本地读取参数更新] 确定按钮后点击后等待时间: " + special_confirm_delay + "ms");
    }

    // 检查并加载确认信息按钮坐标到全局变量
    cached_confirm_info_coords = storage.get("confirm_info_btn_coords");
    if (cached_confirm_info_coords) {
//        console.info('[坐标系统] 已加载确认信息按钮坐标: (' + cached_confirm_info_coords.x + ', ' + cached_confirm_info_coords.y + ')');
    } else {
//        console.info('[坐标系统] 暂无存储的确认信息按钮坐标，首次识别时将自动存储');
    }

    // 检查并加载确认无误按钮坐标到全局变量
    cached_double_confirm_coords = storage.get("double_confirm_btn_coords");
    if (cached_double_confirm_coords) {
//        console.info('[坐标系统] 已加载确认无误按钮坐标: (' + cached_double_confirm_coords.x + ', ' + cached_double_confirm_coords.y + ')');
    } else {
//        console.info('[坐标系统] 暂无存储的确认无误按钮坐标，首次识别时将自动存储');
    }

        // 检查并加载按钮坐标到全局变量
        cached_double_exactly_coords = storage.get("double_exactly_btn_coords");
        if (cached_double_exactly_coords) {
    //        console.info('[坐标系统] 已加载就是这家按钮坐标: (' + cached_double_exactly_coords.x + ', ' + cached_double_exactly_coords.y + ')');
        } else {
    //        console.info('[坐标系统] 暂无存储的就是这家按钮坐标，首次识别时将自动存储');
        }

    // 所有参数加载完成后，检查是否需要自动启动
    if (script_start_immediately_conf) {
        // 使用ui.post确保UI操作在UI线程中执行
        ui.post(() => {
            start();
            console.error("[自动启动] 脚本已自动启动");
        });
    }
}
var deviceInfo = getHamibotDeviceInfo();
//var globalTextViewInfo = [special_confirm_delay, ignore_ack_click_delay, ignore_ack_click_confirm_delay, deviceInfo.hamibot.deviceName, deviceInfo.device.brand, deviceInfo.device.model];

// 初始化时显示一次，延迟确保悬浮窗完全加载
updateParamSummary();
updateInfoBox();
//存储storage
updateStorage();

// 根据当前模式设置正确的UI状态
syncUIForMode();

// 初始化定时器 - 脚本自带功能，用户无需知道
if (script_auto_exit_time > 0) {
    //console.info("[定时器] 脚本将在 " + script_auto_exit_time + " 分钟后自动退出");
    // 记录脚本启动时间
    script_start_time = new Date().getTime();
}

function start() {
    has_been_started = false;
    // 检查校准状态
    // if (!calibration_status.confirm_info || !calibration_status.double_confirm || !calibration_status.double_exactly) {
    //     // 停止脚本
    //     script_status = 0;

    //     // 先显示弹窗提示，等待用户点击确定后再执行后续操作
    //     dialogs.alert('校准提示', '❌ 检测到按钮坐标未校准，请先完成按钮校准后再启动脚本')
    //         .then(function() {
    //             // 用户点击确定后，自动打开设置菜单中的校准按钮子菜单
    //             var items = Object.keys(settingsConfig);
    //             var calibrateButtonIndex = items.indexOf('校准按钮');
    //             if (calibrateButtonIndex >= 0) {
    //                 var selectedItem = items[calibrateButtonIndex];
    //                 var config = settingsConfig[selectedItem];
    //                 showSubmenuSetting(selectedItem, config);
    //             } else {
    //                 // 如果找不到校准按钮，则显示普通设置菜单
    //                 showSettingsMenu();
    //             }
    //         })
    //         .catch(function() {
    //             // 如果弹窗被取消，也执行相同的操作
    //             var items = Object.keys(settingsConfig);
    //             var calibrateButtonIndex = items.indexOf('校准按钮');
    //             if (calibrateButtonIndex >= 0) {
    //                 var selectedItem = items[calibrateButtonIndex];
    //                 var config = settingsConfig[selectedItem];
    //                 showSubmenuSetting(selectedItem, config);
    //             } else {
    //                 // 如果找不到校准按钮，则显示普通设置菜单
    //                 showSettingsMenu();
    //             }
    //         });

    //     return;
    // }

    script_status = 1;
    start_time = new Date().getTime();
    script_start_time = new Date().getTime(); // 记录脚本启动时间用于定时器
    if (script_start_immediately_conf) {
        startOnNotification();
    }
    // 初始化globalTextViewInfo数组
    globalTextViewInfo = [refresh_mode, order_submission_mode_conf, refresh_delay, special_confirm_delay, ignore_ack_click_delay, ignore_ack_click_confirm_delay, deviceInfo.hamibot.deviceName, deviceInfo.device.brand, deviceInfo.device.model];

    // 使用ui.post确保UI操作在UI线程中执行
    ui.post(() => {
        w.end.attr('visibility', 'visible');

        // 显示定时器信息
        if (script_auto_exit_time > 0) {
            //console.info("[定时器] 脚本将在 " + script_auto_exit_time + " 分钟后自动退出");
        }
        // 启动时只显示必要的按钮：custom_image, info_box, end
        w.start.attr('visibility', 'gone');
        w.pattern_choice_btn.attr('visibility', 'gone');
        w.delivery_type.attr('visibility', 'gone');
        w.purchase_count_btn.attr('visibility', 'gone');
        w.settings.attr('visibility', 'gone');
        w.consume_points_btn.attr('visibility', 'gone');
        w.total_amount_btn.attr('visibility', 'gone');
        w.spec_selection_btn.attr('visibility', 'gone');
        w.info_box.attr('visibility', 'visible');

        // 设置info_box的文本内容为当前模式
        w.info_box.setText(pattern_choice);

        // 调整main_window高度为14+3+25+8+45=95 (custom_image + margin + info_box + margin + end按钮)
        w.main_window.attr('h', '95');
    });

    if (!verified) {
        toastLog("GIT POP版本已过期，请更新最新版本");
    }
}

function stop() {
    // 先更新UI，避免阻塞
    try {
        // 使用ui.post确保UI操作在UI线程中执行
        ui.post(() => {
            // 停止时根据模式显示不同按钮
            w.end.attr('visibility', 'gone');
            w.start.attr('visibility', 'visible');
            w.pattern_choice_btn.attr('visibility', 'visible');
            w.info_box.attr('visibility', 'visible');

            // 使用统一的UI同步函数确保所有按钮状态正确
            syncUIForMode();
        });

        // 清空globalTextViewInfo数组
        globalTextViewInfo = [];
        events.removeAllTouchListeners();
        // 禁用通知监听器
        notificationListenerActive = false;
        has_been_started = false;
        groupMessageListenerStarted = false; // 重置群内监听状态


    } catch (e) {}

    // 最后设置脚本状态，避免在UI更新过程中被主循环检测到
    script_status = 0;
    // 重置定时器
    script_start_time = 0;
    last_timer_display_minute = 0;
    confirmButtonExecuted = false; // 标记是否已执行确认按钮逻辑
    purchasee_pagee_count = 0;
    textViewInfoAdded = false; // 重置TextView信息添加标记
    confirmInfoClicked = false; // 重置确认信息并支付按钮点击状态
    doubleConfirmClicked = false; // 重置确认无误/就是这家按钮点击状态
    confirmBtnEnterCount = 0; // 回流计数器
}

w.start.click(function () {
    start();
    console.error("[状态] 抢购脚本启动");
});

w.end.click(function () {
    stop();
    console.error("[状态] 抢购脚本停止");
});

// 添加配送方式按钮点击事件
w.delivery_type.click(function () {
    if (purchase_type === '到店取') {
        purchase_type = '送到家';
    } else {
        purchase_type = '到店取';
    }
    // 使用ui.post确保UI操作在UI线程中执行
    ui.post(() => {
        w.delivery_type.setText(purchase_type);
        if (purchase_type === '送到家') {
            setRoundedBg(w.delivery_type, '#E83828', 6); // 红色
        } else {
            setRoundedBg(w.delivery_type, '#0f57f7', 6); // 蓝色
        }
    });
    toast('配送方式已切换为: ' + purchase_type);
});

// 添加模式切换按钮点击事件
w.pattern_choice_btn.click(function () {
    // 模式循环切换：抢购模式 → 兑换模式 → 盒机模式 → 抢购模式
    if (pattern_choice === '抢购模式') {
        pattern_choice = '兑换模式';
    } else if (pattern_choice === '兑换模式') {
        pattern_choice = '盒机模式';
    } else {
        pattern_choice = '抢购模式';
    }

    // 更新按钮文本和颜色
    ui.post(() => {
        w.pattern_choice_btn.setText(pattern_choice);

        // 根据模式设置不同的颜色
        if (pattern_choice === '抢购模式') {
            setRoundedBg(w.pattern_choice_btn, '#FF8C00', 6); // 橙色
        } else if (pattern_choice === '兑换模式') {
            setRoundedBg(w.pattern_choice_btn, '#FF6B6B', 6); // 红色
        } else if (pattern_choice === '盒机模式') {
            setRoundedBg(w.pattern_choice_btn, '#9B59B6', 6); // 紫色
        }
    });

    // 使用统一的UI同步函数确保所有按钮状态正确
    syncUIForMode();

    // 显示切换提示
    toast('已切换到' + pattern_choice);
});

// 添加消耗积分按钮点击事件
w.consume_points_btn.click(function () {
    dialogs.rawInput('请输入兑换积分', exchange_points.toString())
    .then(function(inputValue) {
        if (inputValue !== null && inputValue !== '') {
            var num = parseInt(inputValue);
            if (num > 0) {
                exchange_points = num;
                storage.put('s_exchange_points', exchange_points);
                toast('兑换积分已设置为: ' + num);
                console.info("[兑换积分更新] 兑换积分: " + exchange_points);

                // 如果当前是兑换模式，立即更新info_box显示
                if (pattern_choice === '兑换模式') {
                    updateInfoBox();
                }
            } else {
                toast('请输入有效的数字');
            }
        }
    });
});



// 初始化时设置按钮颜色
if (purchase_type === '送到家') {
    setRoundedBg(w.delivery_type, '#E83828', 6);
} else {
    setRoundedBg(w.delivery_type, '#0f57f7', 6);
}



// 添加购买数量按钮点击事件
w.purchase_count_btn.click(function () {
    dialogs.rawInput('请输入购买数量', purchase_count.toString())
        .then(function(inputValue) {
            if (inputValue !== null && inputValue !== '') {
                var num = parseInt(inputValue);
                if (num > 0) {
                    purchase_count = num;
                    updateParamSummary();
                    toast('购买数量已设置为: ' + num);
                } else {
                    toast('请输入有效的数字');
                }
            }
        });
});

// 添加关键词按钮点击事件
w.total_amount_btn.click(function () {
    dialogs.rawInput('请输入关键词', keyword_text)
        .then(function(inputValue) {
            if (inputValue !== null && inputValue !== '') {
                keyword_text = inputValue;
                w.total_amount_btn.setText("关键词");
                toast('关键词已设置为: ' + keyword_text);
            } else if (inputValue === '') {
                keyword_text = "";
                w.total_amount_btn.setText("关键词");
                toast('关键词已清空');
            }
        });
});

// 添加选择规格按钮点击事件
w.spec_selection_btn.click(function () {
    // 使用简单的数字输入形式
    dialogs.rawInput("选择购买规格（数字）1为单个，2为整端（默认），特殊款为选择框排列填写数字", spec_selection)
        .then(function(inputValue) {
            if (inputValue !== null && inputValue !== '') {
                var numValue = parseInt(inputValue);
                // 检查是否为有效数字
                if (isNaN(numValue) || inputValue !== numValue.toString()) {
                    // 输入非数字，恢复默认值
                    spec_selection = 2;
                    w.spec_selection_btn.setText("规格: " + spec_selection);
                    console.error('输入格式错误，已恢复默认值: ' + spec_selection);
                } else if (numValue > 0) {
                    spec_selection = numValue;
                    w.spec_selection_btn.setText("规格: " + spec_selection);
                    console.info('购买规格已设置为: ' + spec_selection);
                } else {
                    // 输入0或负数，恢复默认值
                    spec_selection = 2;
                    w.spec_selection_btn.setText("规格: " + spec_selection);
                    console.error('请输入大于0的数字，已恢复默认值: ' + spec_selection);
                }
            }
        });
});

// 长按500ms移动功能已合并到info_box中

// 为info_box添加触摸功能（仅长按移动窗口）
var isInterfaceHidden = false; // 标记界面是否已隐藏（供custom_image使用）

// 移动窗口相关变量（长按500ms移动窗口）
var moveStartPressed = false;
var moveStartLongPressed = false;
var moveStartPressTimer = null;
var startX = 0, startY = 0, windowX = 0, windowY = 0;

w.info_box.setOnTouchListener(function(view, event) {
    switch (event.getAction()) {
        case event.ACTION_DOWN:
            moveStartPressed = true;
            moveStartLongPressed = false;
            startX = event.getRawX();
            startY = event.getRawY();
            windowX = w.getX();
            windowY = w.getY();

            // 设置长按定时器（500毫秒）
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
            // 清除定时器
            if (moveStartPressTimer) {
                clearTimeout(moveStartPressTimer);
                moveStartPressTimer = null;
            }

            // 保存位置（如果是长按移动）
            if (moveStartLongPressed) {
                var x = w.getX();
                var y = w.getY();
                storage.put('floaty_position_x', x);
                storage.put('floaty_position_y', y);
            }

            moveStartPressed = false;
            return true;
    }
    return false;
});

// move_start的触摸功能已合并到info_box中

// 为custom_image添加触摸功能（短按隐藏界面，长按移动窗口，长按恢复界面）
var customImagePressTime = 0;
var customImagePressed = false;
var customImageLongPressed = false;
var customImagePressTimer = null;
var customImageStartX = 0, customImageStartY = 0, customImageWindowX = 0, customImageWindowY = 0;

w.custom_image.setOnTouchListener(function(view, event) {
    switch (event.getAction()) {
        case event.ACTION_DOWN:
            customImagePressed = true;
            customImageLongPressed = false;
            customImagePressTime = Date.now();
            customImageStartX = event.getRawX();
            customImageStartY = event.getRawY();
            customImageWindowX = w.getX();
            customImageWindowY = w.getY();

            // 设置长按定时器（500毫秒）
            customImagePressTimer = setTimeout(function() {
                if (customImagePressed) {
                    customImageLongPressed = true;
                }
            }, 500);
            return true;

        case event.ACTION_MOVE:
            if (customImageLongPressed) {
                let dx = event.getRawX() - customImageStartX;
                let dy = event.getRawY() - customImageStartY;
                w.setPosition(customImageWindowX + dx, customImageWindowY + dy);
            }
            return true;

        case event.ACTION_UP:
        case event.ACTION_CANCEL:
            // 清除定时器
            if (customImagePressTimer) {
                clearTimeout(customImagePressTimer);
                customImagePressTimer = null;
            }

            if (customImagePressed) {
                var pressDuration = Date.now() - customImagePressTime;

                if (!isInterfaceHidden) {
                    // 界面未隐藏时，短按隐藏
                    if (pressDuration < 250 && !customImageLongPressed) {
                        // 隐藏所有按钮，只保留图片、info_box和开始/停止按钮
                        ui.post(() => {
                            w.info_box.attr('visibility', 'visible');
                            w.info_box.setText(pattern_choice); // 显示当前模式
                            w.pattern_choice_btn.attr('visibility', 'gone');
                            w.delivery_type.attr('visibility', 'gone');
                            w.purchase_count_btn.attr('visibility', 'gone');
                            w.settings.attr('visibility', 'gone');
                            w.consume_points_btn.attr('visibility', 'gone');
                            w.total_amount_btn.attr('visibility', 'gone');
                            w.spec_selection_btn.attr('visibility', 'gone');

                            // 调整窗口高度，只保留图片、info_box和开始/停止按钮
                            w.main_window.attr('h', '95'); // 14(图片) + 3(边距) + 25(info_box) + 8(边距) + 45(按钮)
                        });

                        isInterfaceHidden = true;
                        toast('UI界面已折叠，长按LOGO展开');
                    }
                } else {
                    // 界面已隐藏时，长按恢复
                    if (pressDuration < 250 && !customImageLongPressed) {
                        // 使用统一的UI同步函数恢复界面
                        syncUIForMode();

                        isInterfaceHidden = false;
                        toast('UI界面已展开');
                    }
                }
            }

            // 保存位置（如果是长按移动）
            if (customImageLongPressed) {
                var x = w.getX();
                var y = w.getY();
                storage.put('floaty_position_x', x);
                storage.put('floaty_position_y', y);
            }

            customImagePressed = false;
            return true;
    }
    return false;
});

// 设置项配置
var settingsConfig = {
    '订单提交模式': {
        type: 'choice',
        options: ['普通模式', '狂暴模式'],
        value: () => order_submission_mode_conf,
        setValue: (val) => {
            order_submission_mode_conf = val;
            storage.put('s_order_submission_mode', order_submission_mode_conf);
            console.info("[模式更新] 订单提交模式:" + val);
}
},
    '刷新模式': {
    type: 'choice',
    options: ['智能刷', '切换刷','页面刷'],
    value: () => refresh_mode,
    setValue: (val) => {
    refresh_mode = val;
    storage.put('s_refresh_mode', refresh_mode);
    console.info("[模式更新] 刷新模式:" + val);
    updateInfoBox();
}
},
    '购买规格': {
    type: 'choice',
    options: ['单个', '整端'],
    value: () => specs,
    setValue: (val) => {
    specs = val;
    storage.put('s_specs', specs);
    console.info("[规格更新] 购买规格:" + val);
}
},
    '特殊款选项': {
    type: 'input',
    inputType: 'text',
    value: () => select_index.toString(),
    setValue: (val) => {
    if (val) {
    select_index = parseInt(val);
    storage.put('s_select_index', select_index);
}
    console.info("[选项更新] 特殊款选项: " + val);
}
},
    '库存刷新间隔(ms)': {
    type: 'input',
    inputType: 'number',
    value: () => refresh_delay.toString(),
    setValue: (val) => {
    var num = parseInt(val);
    var min = 300; // 最小值限制
    if (isNaN(num) || num < min) {
        num = min;
        toast('最低设置值为' + min + 'ms');
    }
    refresh_delay = num;
    storage.put('s_refresh_delay', num);
    console.info("[参数更新] 库存刷新间隔:" + num + "ms");
}
},
    '确认信息并支付点击后等待时间(ms)': {
    type: 'input',
    inputType: 'number',
    value: () => ignore_ack_click_delay.toString(),
    setValue: (val) => {
    var num = parseInt(val);
    var min = 100; // 最小值限制
    if (isNaN(num) || num < min) {
        num = min;
        toast('最低设置值为' + min + 'ms');
    }
    ignore_ack_click_delay = num;
    storage.put('s_ignore_ack_click_delay', num);
    console.error("[本地参数更新(优先本地)] 确认支付等待时间:" + num + "ms");
}
},
    '确认无误/就是这家点击后等待时间(ms)': {
    type: 'input',
    inputType: 'number',
    value: () => ignore_ack_click_confirm_delay.toString(),
    setValue: (val) => {
    var num = parseInt(val);
    var min = 150; // 最小值限制
    if (isNaN(num) || num < min) {
        num = min;
        toast('最低设置值为' + min + 'ms');
    }
    ignore_ack_click_confirm_delay = num;
    storage.put('s_ignore_ack_click_confirm_delay', num);
    console.error("[本地参数更新(优先本地)] 确认无误/就是这家等待时间:" + num + "ms");
}
},
    '点击确定按钮点击后等待时间(ms)': {
    type: 'input',
    inputType: 'number',
    value: () => special_confirm_delay.toString(),
    setValue: (val) => {
    var num = parseInt(val);
    var min = 200; // 最小值限制
    if (isNaN(num) || num < min) {
        num = min;
        toast('最低设置值为' + min + 'ms');
    }
    special_confirm_delay = num;
    storage.put('s_special_confirm_delay', num);
    console.error("[本地参数更新(优先本地)] 点击确定按钮后等待时间:" + num + "ms");
}
},
    '支付密码': {
        type: 'input',
        inputType: 'text',
        value: () => password_setting.toString(),
        setValue: (val) => {
        if (password_or_vibrate === "震动(不设置密码)") {
            toast("请在控制台选择自动输入密码后再设置");
            return; // 当设置为震动模式时不执行密码设置
        }
        if (val) {
        password_setting = parseInt(val);
        storage.put('s_password_setting', '******');
    }
        console.info("[参数更新] 支付密码" );
    }
},
    // '校准按钮': {
    //     type: 'submenu',
    //     description: '校准各种按钮的坐标',
    //     submenu: function() {
    //         var submenuItems = {};

    //         // 动态生成菜单项名称
    //         var confirmInfoName = calibration_status.confirm_info ? '校准[确认信息并支付]按钮✔️' : '校准[确认信息并支付]按钮❌';
    //         var doubleExactlyName = calibration_status.double_exactly ? '校准[就是这家]按钮✔️' : '校准[就是这家]按钮❌';
    //         var doubleConfirmName = calibration_status.double_confirm ? '校准[确认无误]按钮✔️' : '校准[确认无误]按钮❌';
    //         // var confirmName = calibration_status.confirm ? '校准[确定]按钮✔️' : '校准[确定]按钮❌';

    //         submenuItems[confirmInfoName] = {
    //             type: 'action',
    //             description: '定位"确认信息并支付"按钮坐标',
    //             action: function() {
    //                 toast('请导航到订单确认页面，然后点击确定');
    //                 threads.start(() => {
    //                     calibrateButton('确认信息并支付', 'confirm_info');
    //                 });
    //             }
    //         };

    //         submenuItems[doubleExactlyName] = {
    //             type: 'action',
    //             description: '定位"就是这家"按钮坐标',
    //             action: function() {
    //                 toast('请导航到地址确认页面，然后点击确定');
    //                 threads.start(() => {
    //                     calibrateButton('就是这家', 'double_exactly');
    //                 });
    //             }
    //         };

    //         submenuItems[doubleConfirmName] = {
    //             type: 'action',
    //             description: '定位"确认无误"按钮坐标',
    //             action: function() {
    //                 toast('请导航到地址确认页面，然后点击确定');
    //                 threads.start(() => {
    //                     calibrateButton('确认无误', 'double_confirm');
    //                 });
    //             }
    //         };
    //         return submenuItems;
    //     }
    // },
    '隐藏脚本': {
        type: 'action',
        description: '隐藏悬浮窗一段时间',
        action: function() {
            w.main_window.attr('visibility', 'gone');
            toast("隐藏脚本"+ hide_sleep_time * 60 * 1000 + "分钟");
            setTimeout(function() {
                w.main_window.attr('visibility', 'visible');
            }, hide_sleep_time * 60 * 1000);
        }
    },
};

// 显示设置菜单（二级页面）
function showSettingsMenu() {
    var items = Object.keys(settingsConfig);

    // 根据password_or_vibrate的值过滤设置项
    if (password_or_vibrate === "震动(不设置密码)") {
        items = items.filter(function(item) {
            return item !== '支付密码';
        });
    }

    dialogs.select("请选择设置项", items)
        .then(function(itemIdx) {
            if (itemIdx < 0) return;
            var selectedItem = items[itemIdx];
            var config = settingsConfig[selectedItem];
            // 处理不同类型的设置项
            if (config.type === 'choice') {
                showChoiceSetting(selectedItem, config);
            } else if (config.type === 'input') {
                showInputSetting(selectedItem, config);
            } else if (config.type === 'action') {
                showActionSetting(selectedItem, config);
            } else if (config.type === 'submenu') {
                showSubmenuSetting(selectedItem, config);
            }
        });
}

// 处理选择类型设置（三级页面）
function showChoiceSetting(itemName, config, callback) {
    var currentIdx = config.options.indexOf(config.value());
    dialogs.singleChoice(itemName, config.options, currentIdx)
        .then(function(selectedIdx) {
            if (selectedIdx >= 0) {
                config.setValue(config.options[selectedIdx]);
                updateParamSummary();
                toast(itemName + ' 已设置为: ' + config.options[selectedIdx]);
            }
            // 设置完成后根据是否有回调函数决定返回路径
            if (callback && typeof callback === 'function') {
                callback();
            } else {
                showSettingsMenu();
            }
        });
}

// 处理输入类型设置（三级页面）
function showInputSetting(itemName, config, callback) {
    var currentValue = config.value();
    var prompt = '请输入 ' + itemName;
    if (config.inputType === 'number') {
        prompt += ' (数字)';
    }

    dialogs.rawInput(prompt, currentValue)
        .then(function(inputValue) {
            if (inputValue !== null && inputValue !== '') {
                try {
                    config.setValue(inputValue);
                    updateParamSummary();
                    toast(itemName + ' 已设置为: ' + inputValue);
                } catch (e) {
                    toast('设置失败: ' + e.message);
                }
            }
            // 设置完成后根据是否有回调函数决定返回路径
            if (callback && typeof callback === 'function') {
                callback();
            } else {
                showSettingsMenu();
            }
        });
}

// 处理操作类型设置（三级页面）
function showActionSetting(itemName, config, callback) {
    try {
        config.action();
        //console.info("[设置操作] " + itemName + " 执行成功");
        // 执行成功后根据是否有回调函数决定返回路径
        if (callback && typeof callback === 'function') {
            callback();
        }
    } catch (e) {
        toast('操作执行失败: ' + e.message);
        //console.error("[设置操作] " + itemName + " 执行失败: " + e.message);
        // 如果执行失败，则返回设置菜单
        if (callback && typeof callback === 'function') {
            callback();
        } else {
            showSettingsMenu();
        }
    }
}

// 处理子菜单类型设置（三级页面）
function showSubmenuSetting(itemName, config) {
    // 处理动态生成的子菜单
    var submenuItems;
    if (typeof config.submenu === 'function') {
        submenuItems = config.submenu();
    } else {
        submenuItems = config.submenu;
    }

    var submenuKeys = Object.keys(submenuItems);
    dialogs.select(itemName, submenuKeys)
        .then(function(subItemIdx) {
            if (subItemIdx < 0) {
                // 返回上级菜单
                showSettingsMenu();
                return;
            }
            var selectedSubItem = submenuKeys[subItemIdx];
            var subConfig = submenuItems[selectedSubItem];

            // 处理子菜单中的不同类型
            if (subConfig.type === 'choice') {
                showChoiceSetting(selectedSubItem, subConfig, function() {
                    // 操作完成后直接关闭设置菜单
                    return;
                });
            } else if (subConfig.type === 'input') {
                showInputSetting(selectedSubItem, subConfig, function() {
                    // 操作完成后直接关闭设置菜单
                    return;
                });
            } else if (subConfig.type === 'action') {
                showActionSetting(selectedSubItem, subConfig, function() {
                    // 操作完成后直接关闭设置菜单
                    return;
                });
            }
        });
}

// === 坐标校准系统 (参考 JS_hongzhong.js) ===

// 更新预计算坐标
function updatePrecomputedCoords() {
    if (cached_confirm_info_coords && cached_confirm_info_coords.length >= 4) {
        precomputedCoords.confirm_info.x = cached_confirm_info_coords[0] + (cached_confirm_info_coords[2] - cached_confirm_info_coords[0]) / 2;
        precomputedCoords.confirm_info.y = cached_confirm_info_coords[1] + (cached_confirm_info_coords[3] - cached_confirm_info_coords[1]) / 2;
    }
    if (cached_double_confirm_coords && cached_double_confirm_coords.length >= 4) {
        precomputedCoords.double_confirm.x = cached_double_confirm_coords[0] + (cached_double_confirm_coords[2] - cached_double_confirm_coords[0]) / 2;
        precomputedCoords.double_confirm.y = cached_double_confirm_coords[1] + (cached_double_confirm_coords[3] - cached_double_confirm_coords[1]) / 2;
    }
    if (cached_double_exactly_coords && cached_double_exactly_coords.length >= 4) {
        precomputedCoords.double_exactly.x = cached_double_exactly_coords[0] + (cached_double_exactly_coords[2] - cached_double_exactly_coords[0]) / 2;
        precomputedCoords.double_exactly.y = cached_double_exactly_coords[1] + (cached_double_exactly_coords[3] - cached_double_exactly_coords[1]) / 2;
    }
    if (cached_confirm_pay_coords && cached_confirm_pay_coords.length >= 4) {
        precomputedCoords.confirm_pay.x = cached_confirm_pay_coords[0] + (cached_confirm_pay_coords[2] - cached_confirm_pay_coords[0]) / 2;
        precomputedCoords.confirm_pay.y = cached_confirm_pay_coords[1] + (cached_confirm_pay_coords[3] - cached_confirm_pay_coords[1]) / 2;
    }

    //console.info('[坐标缓存] 预计算坐标已更新');
   // console.info('[坐标缓存] 确认信息并支付: (' + precomputedCoords.confirm_info.x + ', ' + precomputedCoords.confirm_info.y + ')');
   // console.info('[坐标缓存] 确认无误: (' + precomputedCoords.double_confirm.x + ', ' + precomputedCoords.double_confirm.y + ')');
    //console.info('[坐标缓存] 就是这家: (' + precomputedCoords.double_exactly.x + ', ' + precomputedCoords.double_exactly.y + ')');
}

// 校准按钮坐标 (通用函数)
// function calibrateButton(buttonTextArray, buttonType) {
//     //console.info('[坐标校准] 开始定位按钮: ' + JSON.stringify(buttonTextArray) + ', 类型: ' + buttonType);

//     try {
//         var targetElement = null;
//         var foundText = '';

//         // 支持数组形式的按钮文本
//         if (Array.isArray(buttonTextArray)) {
//             for (var i = 0; i < buttonTextArray.length; i++) {
//                 targetElement = className('android.widget.TextView').text(buttonTextArray[i]).findOne(3000);
//                 if (targetElement) {
//                     foundText = buttonTextArray[i];
//                     break;
//                 }
//             }
//         } else {
//             targetElement = className('android.widget.TextView').text(buttonTextArray).findOne(3000);
//             foundText = buttonTextArray;
//         }

//         if (targetElement) {
//             var bounds = targetElement.bounds();
//             var coords = [bounds.left, bounds.top, bounds.right, bounds.bottom];

//             if (buttonType === 'confirm_info') {
//                 cached_confirm_info_coords = coords;
//                 calibration_status.confirm_info = true;
//             } else if (buttonType === 'double_confirm') {
//                 cached_double_confirm_coords = coords;
//                 calibration_status.double_confirm = true;
//             } else if (buttonType === 'double_exactly') {
//                 cached_double_exactly_coords = coords;
//                 calibration_status.double_exactly = true;
//             }
//             updatePrecomputedCoords();

//             // 如果是确定按钮，强制设置Y坐标为屏幕高度的91%
//             // if (buttonType === 'confirm') {
//             //     precomputedCoords.confirm.y = screenHeight * 0.91;
//             // }

//             console.info('[按钮校准] "' + foundText + '" 按钮定位成功');
//             toast('"' + foundText + '" 按钮定位成功');

//             // 保存到本地存储
//             saveCoordinatesToStorage();

//         } else {
//             var displayText = Array.isArray(buttonTextArray) ? buttonTextArray.join('或') : buttonTextArray;
//             console.warn('[按钮校准] 未找到 "' + displayText + '" 按钮');
//             toast('未找到 "' + displayText + '" 按钮，请确保在正确页面');
//         }
//     } catch (e) {
//         console.error('[按钮校准] 定位按钮时发生错误: ' + e);
//         toast('定位失败: ' + e);
//     }
// }

// 保存坐标到本地存储
function saveCoordinatesToStorage() {
    try {
        if (cached_confirm_info_coords) {
            storages.create("coordinate_cache").put("confirm_info_coords", JSON.stringify(cached_confirm_info_coords));
        }
        if (cached_double_confirm_coords) {
            storages.create("coordinate_cache").put("double_confirm_coords", JSON.stringify(cached_double_confirm_coords));
        }
        if (cached_double_exactly_coords) {
            storages.create("coordinate_cache").put("double_exactly_coords", JSON.stringify(cached_double_exactly_coords));
        }
        if (cached_confirm_pay_coords) {
            storages.create("coordinate_cache").put("confirm_pay_coords", JSON.stringify(cached_confirm_pay_coords));
        }
        storages.create("coordinate_cache").put("calibration_status", JSON.stringify(calibration_status));
        console.info('[校准缓存] 已存储');
    } catch (e) {
        console.error('[校准缓存] 存储失败: ' + e);
    }
}

// 从本地存储加载坐标
function loadCoordinatesFromStorage() {
    try {
        var storage = storages.create("coordinate_cache");

        var confirmInfoCoordsStr = storage.get("confirm_info_coords");
        if (confirmInfoCoordsStr) {
            cached_confirm_info_coords = JSON.parse(confirmInfoCoordsStr);
        }

        var doubleConfirmCoordsStr = storage.get("double_confirm_coords");
        if (doubleConfirmCoordsStr) {
            cached_double_confirm_coords = JSON.parse(doubleConfirmCoordsStr);
        }

        var doubleExactlyCoordsStr = storage.get("double_exactly_coords");
        if (doubleExactlyCoordsStr) {
            cached_double_exactly_coords = JSON.parse(doubleExactlyCoordsStr);
        }

        var confirmPayCoordsStr = storage.get("confirm_pay_coords");
        if (confirmPayCoordsStr) {
            cached_confirm_pay_coords = JSON.parse(confirmPayCoordsStr);
        }

        var calibrationStatusStr = storage.get("calibration_status");
        if (calibrationStatusStr) {
            calibration_status = JSON.parse(calibrationStatusStr);
        }

        updatePrecomputedCoords();
        //console.info('[校准缓存] 已从存储加载');

    } catch (e) {
        console.warn('[校准缓存] 加载失败: ' + e);
    }
}

// 使用坐标快速点击
function clickByCoordinates(buttonType) {
    try {
        var x, y;
        if (buttonType === 'confirm_info' && calibration_status.confirm_info) {
            x = precomputedCoords.confirm_info.x;
            y = precomputedCoords.confirm_info.y;
            //console.info('[坐标点击] 使用缓存坐标点击信息并支付按钮: (' + x + ', ' + y + ')');
        } else if (buttonType === 'double_confirm' && calibration_status.double_confirm) {
            x = precomputedCoords.double_confirm.x;
            y = precomputedCoords.double_confirm.y;
            //console.info('[坐标点击] 使用缓存坐标点击确认无误按钮: (' + x + ', ' + y + ')');
        } else if (buttonType === 'double_exactly' && calibration_status.double_exactly) {
            x = precomputedCoords.double_exactly.x;
            y = precomputedCoords.double_exactly.y;
           // console.info('[坐标点击] 使用缓存坐标点击就是这家按钮: (' + x + ', ' + y + ')');
        } else if (buttonType === 'confirm_pay' && calibration_status.confirm_pay) {
            x = precomputedCoords.confirm_pay.x;
            y = precomputedCoords.confirm_pay.y;
           // console.info('[坐标点击] 使用缓存坐标点击确认支付按钮: (' + x + ', ' + y + ')');
        } else {
           // console.warn('[坐标点击] 坐标未校准，无法使用坐标点击: ' + buttonType);
            return false;
        }
        press(x, y, 20); // 使用20ms的短按
        return true;

    } catch (e) {
        console.error('[点击] 缓存点击失败: ' + e);
        return false;
    }
}

// 灵活匹配函数：忽略大小写和中间任意字符
function isFlexibleMatch(text, keyword) {
    if (!text || !keyword) return false;

    var lowerText = text.toLowerCase();
    var lowerKeyword = keyword.toLowerCase();

    // 如果keyword为空，返回false
    if (lowerKeyword.length === 0) return false;

    // 转义正则表达式特殊字符
    var escapedKeyword = lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 将转义后的keyword的每个字符用.*?连接，形成正则表达式
    // .*? 表示非贪婪匹配任意字符
    var regexPattern = escapedKeyword.split('').join('.*?');
    var regex = new RegExp(regexPattern);

    // 首先尝试精确匹配（包含空格和标点）
    if (regex.test(lowerText)) {
        return true;
    }

    // 如果精确匹配失败，尝试去除空格和标点符号后匹配
    var cleanKeyword = lowerKeyword.replace(/[\s·•\-—–、，。！？：；（）【】《》「」『』〈〉〔〕〖〗〘〙〚〛]/g, '');
    var cleanText = lowerText.replace(/[\s·•\-—–、，。！？：；（）【】《》「」『』〈〉〔〕〖〗〘〙〚〛]/g, '');

    if (cleanKeyword.length > 0) {
        var cleanEscapedKeyword = cleanKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var cleanRegexPattern = cleanEscapedKeyword.split('').join('.*?');
        var cleanRegex = new RegExp(cleanRegexPattern);

        return cleanRegex.test(cleanText);
    }

    return false;
}

// 兜底：当常规路径无法从微信消息容器定位到小程序时，
// 尝试基于通知文本在整页扫描并点击疑似小程序文案
function findClickableInAncestors(node) {
    try {
        var cur = node;
        while (cur) {
            if (cur.clickable && cur.clickable()) {
                return cur;
            }
            cur = cur.parent();
        }
    } catch (e) {}
    return null;
}

function extractTargetTitleFromNotifText(notifText) {
    try {
        if (!notifText) return null;
        if (notifText.indexOf("[小程序]") !== -1) {
            var idx = notifText.indexOf("[小程序]");
            var tail = notifText.substring(idx + "[小程序]".length);
            tail = (tail || "").replace(/^[\s:：\-\u3000]+/, '').trim();
            if (tail) return tail;
        }
    } catch (e) {}
    return null;
}

function findContainerForNode(node, maxHops) {
    try {
        var cur = node;
        var hops = 0;
        while (cur && hops < (maxHops || 6)) {
            var cls = cur.className && cur.className();
            if (cls === "android.widget.LinearLayout" || cls === "android.widget.FrameLayout" || cls === "android.widget.RelativeLayout") {
                if (cur.childCount && cur.childCount() > 0) return cur;
            }
            cur = cur.parent();
            hops++;
        }
    } catch (e) {}
    return null;
}

function fallbackClickMiniProgramFromNotificationText(notifText, rootNode) {
    try {
        var targetTitle = extractTargetTitleFromNotifText(notifText);

        // 优先策略：直接在全局 TextView 中查找与 targetTitle 匹配的文本
        if (targetTitle) {
            var tvs = className("android.widget.TextView").find();
            var best = null;
            var bestScore = -1;
            for (var i = 0; i < tvs.length; i++) {
                try {
                    var tv = tvs[i];
                    var t = (tv.text() || '').trim();
                    if (!t) continue;
                    var score = -1;
                    if (t.indexOf(targetTitle) !== -1 || targetTitle.indexOf(t) !== -1) {
                        score = 2;
                    } else if (isFlexibleMatch(t, targetTitle)) {
                        score = 1;
                    }
                    if (score > bestScore) {
                        bestScore = score;
                        best = tv;
                    }
                } catch (e) {}
            }
            if (best && bestScore >= 1) {
                var clickableNode = best.findOne(clickable(true)) || findClickableInAncestors(best);
                if (clickableNode) {
                    try {
                        var container = findContainerForNode(best, 8) || best.parent();
                        if (container) {
                            recordLastMiniProgramCaption([container], rootNode);
                        }
                    } catch (e) {}
                    sleep(200);
                    log("[操作] 点击小程序链接2");
                    clickableNode.click();
                    return;
                } else {
                    // 记录文案
                    try {
                        var container = findContainerForNode(best, 8) || best.parent();
                        if (container) {
                            recordLastMiniProgramCaption([container], rootNode);
                        }
                    } catch (e) {}
                    sleep(200);
                    var b = best.bounds();
                    log("[操作] 点击小程序链接3");
                    click(b.centerX(), b.centerY());
                    return;
                }
            }
        }

        // 备选策略：根据 “小程序” 锚点推断邻近文案并点击
        var anchors = className("android.widget.TextView").textContains("小程序").find();
        if (anchors && anchors.length > 0) {
            // 选择屏幕上最后出现的锚点（更可能是最新消息）
            var anchor = anchors[anchors.length - 1];
            var container = findContainerForNode(anchor, 8) || anchor.parent();
            if (container) {
                // 在容器内寻找最可能作为文案的 TextView（排除包含“小程序”的自身）
                var cTvs = container.find(className("android.widget.TextView").algorithm('DFS'));
                var caption = null;
                for (var j = cTvs.length - 1; j >= 0; j--) {
                    try {
                        var tv2 = cTvs[j];
                        var txt2 = (tv2.text() || '').trim();
                        if (txt2 && txt2.indexOf("小程序") === -1) {
                            caption = tv2;
                            break;
                        }
                    } catch (e) {}
                }
                var clickTarget = container.findOne(clickable(true)) || findClickableInAncestors(caption || container) || caption || container;
                if (clickTarget) {
                    // 记录文案
                    try {
                        recordLastMiniProgramCaption([container]);
                    } catch (e) {}
                    sleep(200);
                    if (clickTarget.click) {
                        log("[操作] 点击小程序链接4");
                        clickTarget.click();
                    } else {
                        var bb = clickTarget.bounds();
                        log("[操作] 点击小程序链接5");
                        click(bb.centerX(), bb.centerY());
                    }
                    return;
                }
            }
        }

        var clickX = Math.floor(screenWidth * 0.5);  // x50%
        var clickY = Math.floor(screenHeight * 0.8); // y80%
        log("[操作] 点击小程序链接(备用)");
        click(clickX, clickY);

    } catch (e) {
        console.error("[点击] 点击小程序链接失败: " + e);
        return;
    }
    return;
}

function getLatestWeChatMessage() {
    try {
        // 确保在微信界面
        if (currentPackage() !== "com.tencent.mm") {
            return { success: false, rootNode: null };
        }


        // 获取当前页面的根节点
        var rootNode = className("android.widget.FrameLayout").findOne(1000);
        if (!rootNode) {
            return { success: false, rootNode: null };
        }

        var messageContainers = rootNode.find(className("android.widget.LinearLayout").id("bjy"));
        if (!messageContainers || messageContainers.length === 0) {
            return { success: false, rootNode: rootNode };
        }

        // 记录最后一条小程序文案
        recordLastMiniProgramCaption(messageContainers,rootNode);

        // 如果只有一个，直接使用
        var latestMessage = null;
        if (messageContainers.length === 1) {
            latestMessage = messageContainers[0];
        } else {
            // 如果有多个，直接选择最后一个
            latestMessage = messageContainers[messageContainers.length - 1];
        }

        if (!latestMessage) {
            log("消息获取错误");
            return { success: false, rootNode: rootNode };
        }

        sleep(200);
        // 获取消息的坐标信息
        var clickableChild = latestMessage.findOne(clickable(true));
        if (clickableChild) {
            log("[操作] 点击小程序链接");
            clickableChild.click();
            return { success: true, rootNode: rootNode };
        }

        return { success: false, rootNode: rootNode };

    } catch (e) {
        log("点击微信消息失败: " + e.message);
        return { success: false, rootNode: null };

    }
}

// 提取消息容器中“小程序”的文案（标题）
function getMiniProgramCaptionFromContainer(container, curRoot) {
    try {
        if (!container) return null;

        var textViews = container.find(className("android.widget.TextView").id("com.tencent.mm:id/biq"));
        if (!textViews || textViews.length === 0) return null;
        var lastTextView = textViews[textViews.length - 1];
        if (lastTextView) {
            var txt = (lastTextView.text() || '').trim();
            if (txt) {
                // 在提取小程序文案时，检查biu TextView是否为"泡泡马特"
                try {
                    var biuTextViews = curRoot.find(className("android.widget.TextView").id("com.tencent.mm:id/biu").algorithm('DFS'));
                    if (biuTextViews && biuTextViews.length > 0) {
                        var lastBiuTextView = biuTextViews[biuTextViews.length - 1];
                        if (lastBiuTextView) {
                            var biuText = lastBiuTextView.text() || "";
                            var trimmedBiuText = biuText.trim();
                            if (trimmedBiuText !== "泡泡玛特") {
                                return null;
                            }
                        }
                    }
                } catch (biuError) {
                    log("[小程序检测] 检查biu TextView时出错: " + biuError.message);
                    return null;
                }

                // 检查最后一个TextView且文案包含【】字符，则设置跳过门店选择标志
                if (txt.includes('【') && txt.includes('】')) {
                   // console.info("[操作] 检测小程序有门店地址，跳过门店选择" );
                    skipStoreSelection = true;
                }else{
                    skipStoreSelection = false;
                }
                return txt;
            }
        }
        return null;
    } catch (e) {
        log("[小程序检测] getMiniProgramCaptionFromContainer函数出错: " + e.message);
        return null;
    }
}

// 在进入群页面时记录最后一条小程序文案
function recordLastMiniProgramCaption(containers, curRoot) {
    try {
        if (!containers || containers.length === 0) return;
        var last = containers[containers.length - 1];
        if (!last) return;
        var caption = getMiniProgramCaptionFromContainer(last, curRoot);
        if (caption) {
            lastMiniProgramCaption = caption;
          log("[群内监听] 初始小程序文案记录: " + caption);
        } else {
            lastMiniProgramCaption = null;
        }
    } catch (e) {}
}
// 检查通知权限是否可用
function checkNotificationPermission() {
    try {
        // 检查是否有通知监听权限
        // 通过尝试访问通知服务来检查权限
        if (typeof events !== 'undefined' && events.observeNotification) {
            return true;
        }
        return false;
    } catch (e) {
        console.error("通知权限检查失败: " + e.message);
        return false;
    }
}

function startOnNotification () {
    //通知消息内容监听
    notificationListenerActive = true;

    try {
        // 检查通知权限
        if (!checkNotificationPermission()) {
            console.error("通知权限未开启，无法监听通知消息");
            toastLog("请开启通知读取权限以使用消息监听功能");
            notificationListenerActive = false;
            return;
        }

        events.observeNotification();
        events.onNotification(function (notification) {
          if (!notificationListenerActive) return;
          printNotification(notification);
        });

        console.info("通知监听已启动");
    } catch (e) {
        toastLog("通知监听启动失败，请检查权限设置");
        notificationListenerActive = false;
    }


    function printNotification (notification) {
      // 微信监听
      if (notification.getPackageName() == "com.tencent.mm") {
        if (notification.getTitle() != null) {
          // 标题
          let title = notification.getTitle()
          // 文本
          let text = notification.getText()

          // 检测停止关键词
          if (title === monitoring_group_name && text) {
            var stopKeywords = ["暂停", "stop", "停止", "停", "关闭小程序", "关闭", "返回", "退出", "退出小程序","结束", "x", "1"];
            var monitorShopKeyWord = ["门店"];

            for (var i = 0; i < stopKeywords.length; i++) {
              var keyword = stopKeywords[i];
              var isMatch = false;
                if (keyword === "1") {
                  isMatch = text === "1" || /^.+:\s1$/.test(text);
                } else {
                isMatch = text.includes(keyword);
              }

              if (isMatch) {
                home();
                rebuy_flag = false;
                confirmButtonExecuted = false;
                purchasee_pagee_count = 0;
                return;
              }
            }

            for (var i = 0; i < monitorShopKeyWord.length; i++) {
                var keyword = monitorShopKeyWord[i];
                var isMatch = false;
                isMatch = text.includes(keyword);
                log("检测 关键词: " + keyword + " 是否匹配: " + isMatch);
                log("text:" + text);
                if (isMatch) {
                  var keywordIndex = text.indexOf(keyword);
                  var monitorShopName = text.substring(keywordIndex + keyword.length);
                  monitorShopNameMax = monitorShopName;
                  log("找到最高优先级监听商店名称:" + monitorShopName);
                  return;
                }
              }
          }

          // 消息推送
          if (title === monitoring_group_name && containsMonitorContent(text) && !has_been_started) {
            isProcessingNotification = true;
            // 存储通知文本到全局变量，用于门店选择跳过逻辑
            globalNotificationText = text;
            try {
                setTimeout(function() {
                    // 使用线程执行，避免阻塞通知回调
                    if (device.isScreenOn() === false) {
                            log("[操作] 检测到屏幕未亮屏，先亮屏并解锁");
                            device.wakeUp();
                            sleep(300); // 等待屏幕点亮

                            // 向上滑动解锁
                            var screenHeight = device.height;
                            var screenWidth = device.width;
                            var startY = screenHeight * 0.8;
                            var endY = screenHeight * 0.2;
                            var centerX = screenWidth / 2;

                            swipe(centerX, startY, centerX, endY, 300);
                            sleep(500); // 等待解锁完成
                            log("[操作] 屏幕解锁完成");
                        }
                  },2000); // 等待页面加载

                notification.click();
                log("[操作] 点击消息栏");
                // 使用setTimeout替代sleep，避免阻塞UI线程
                setTimeout(function() {
                  // 使用线程执行，避免阻塞通知回调
                  threads.start(function() {
                    var result = getLatestWeChatMessage();
                    if (!result.success) {
                        fallbackClickMiniProgramFromNotificationText(text, result.rootNode);
                    }
                    isProcessingNotification = false;
                  });
                }, 1500); // 等待页面加载

            } catch (e) {
                console.error("点击消息栏失败: " + e.message);
                groupMessageListenerStarted = false;
                isProcessingNotification = false; // 异常情况下也要重置标志
            }
            }
        }
      }
    }
  }

  function checkIfInWechatMainScreen(headerTextView) {
        try {
        //    log("checkIfInWechatMainScreen");


            // 检查selected状态
            if (!headerTextView.selected()) {
                return false;
            }


            // 简单直接：滚动+定位+点击
            var target = id("kbq").className("android.view.View").text(monitoring_group_name).findOne(1000);
            if (!target) return false;
            if (target) {
                log("[点击操作]点击"+monitoring_group_name+"群聊");
                var targetParent = target.parent();
                if (!targetParent) return false;
                var targetParentClassName = targetParent.className();
                while(targetParentClassName != "android.widget.ListView" && targetParent){
                    target = targetParent;
                    targetParent = targetParent.parent();
                    if (!targetParent) break;
                    targetParentClassName = targetParent.className();
                }
                target.click()
                sleep(500);
                return true;
            }
            return true;
        } catch(e) {
        }
        return false;
  }

  function checkIfInWeChatGroup() {

    try {
        if (script_status == 0) {
            return false;
         }
         if (isProcessingNotification) {
            return;
         }
    //    log("checkIfInWeChatGroup");
        if (currentPackage() != "com.tencent.mm") {
            groupMessageListenerStarted = false;
            return;
        }
            // 检查头部文字：ID为icon_tv，文本为"微信"，且selected状态为true
        var headerTextView = id("icon_tv").className("android.widget.TextView").text("微信").findOne(200);
        if (headerTextView) {
            var entered = checkIfInWechatMainScreen(headerTextView);
            if (entered){
                 sleep(800);
            }
            return false;
        }


        if (groupMessageListenerStarted) {
            return true;
        }

        var rootNode = className("android.widget.FrameLayout").findOne(200);
        if (!rootNode) {
            return false;
        }

        var titleView = className("android.widget.EditText").findOne(200);
        if (!titleView) {
            var speakButton = className("android.widget.ImageButton").id("bjz").findOne(200);
            if (!speakButton) {
                return false;
            }
        }

        var containersInit = rootNode.find(className("android.widget.TextView").id("com.tencent.mm:id/biq"));
        if (!containersInit) {
                 return false;
        }
        groupMsgContainerCount = containersInit.length; // 记录但不作为判定依据
        try { recordLastMiniProgramCaption(containersInit, rootNode); } catch (e) {}
        //         }
        //     }
        // }


        groupMessageListenerStarted = true;
        lastContainerCount = -1; // 重置容器数量记录
        noContainerRetryCount = 0; // 重置重试计数
        noContainerRetryCountbjz = 0;
        threads.start(function () {
            try {
                while (groupMessageListenerStarted && !has_been_started && script_status == 1) {
                    sleep(500);
                    // log("threads start");
                    // 检查是否有通知处理正在进行中，避免冲突
                    if (isProcessingNotification) {
                        sleep(200);
                        continue;
                    }

                    var curRoot = className("android.widget.FrameLayout").findOne(1000);
                    if (!curRoot) {
                        sleep(400);
                        continue;
                    }
                    var stillInGroup = className("android.widget.EditText").findOne(400);
                    if (!stillInGroup) {
                        var speakButton = className("android.widget.ImageButton").id("bjz").findOne(400);
                        if (!speakButton) {
                            noContainerRetryCountbjz++;
                            // log("noContainerRetryCountbjz:"+noContainerRetryCountbjz);
                            if (noContainerRetryCountbjz >= 5) {
                                log("[检测] 不在微信群聊界面");
                                if (currentPackage() == "com.tencent.mm") {
                                    back();
                                    sleep(1000);
                                    break;
                                }
                                groupMessageListenerStarted = false;
                                // 重置重试计数
                                noContainerRetryCountbjz = 0;
                                break;
                            }

                        sleep(200);
                        continue;
                        }
                    } else {
                        // 找到容器了，重置重试计数
                        noContainerRetryCountbjz = 0;
                    }
                    var containers = curRoot.find(className("android.widget.TextView").id("com.tencent.mm:id/biq"));
                    if (!containers) {
                        continue;
                    }
                    var scrolled = false;
                    // 2. 找最后一个小程序文案TextView (id="com.tencent.mm:id/biq")
                    var currentCaption = null;
                    if (containers && containers.length > 0) {
                        var latestContainer = containers[containers.length - 1];
                        currentCaption = getMiniProgramCaptionFromContainer(latestContainer, curRoot);
                    }

                    // 3. 如果小程序文案发生变化，设置scrolled = true（门店检测只做记录）
                    if (currentCaption && currentCaption !== lastMiniProgramCaption) {
                        scrolled = true;
                        log("[检测] 检测到泡泡马特小程序文案变化: 旧文案='" + lastMiniProgramCaption + "' -> 新文案='" + currentCaption + "'");
                        var allTextViews = curRoot.find(className("android.widget.TextView").algorithm('DFS'));
                        var hasStoreAddress = false;
                        if (allTextViews && allTextViews.length > 0) {
                            var last4TextViews = allTextViews.slice(-4);
                            for (var i = 0; i < last4TextViews.length; i++) {
                                var textView = last4TextViews[i];
                                if (textView && textView.id() === "com.tencent.mm:id/bkl") {
                                    var storeText = textView.text() || "";
                                    if (storeText.indexOf("门店") !== -1) {
                                        hasStoreAddress = true;
                                        var kw = "门店";
                                        var pos = storeText.indexOf(kw);
                                        if (pos !== -1) {
                                            var monitorShopName = storeText.substring(pos + kw.length).trim();
                                            // 去掉可能的分隔符号
                                            monitorShopName = monitorShopName.replace(/^[:：\s]+/, "");
                                            if (monitorShopName && monitorShopName.length > 0) {
                                                monitorShopNameMax = monitorShopName;
                                                log("[群内监听] 找到最高优先级监听商店名称:" + monitorShopName);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (hasStoreAddress) {
                            log("[检测] 同时检测到门店地址，已记录门店信息");
                        }
                    }
                    // 处理新消息（小程序文案变化时触发点击）
                    if (scrolled) {
                        sleep(500);
                        var latest = containers[containers.length - 1];

                        try {
                            // 检查最新消息是否包含监控内容
                            var containsContent = false;
                            var text = latest.text() || "";

                            // 按"/"分割监控内容（OR逻辑）
                            var keywords = monitor_content.split("/");
                            // 如果数组只有"小程序"这一个元素，直接设置containsContent=true
                            if (keywords.length === 1 && keywords[0].trim() === "小程序") {
                                containsContent = true;
                            } else {
                                // 否则进行关键词匹配
                                for (var i = 0; i < keywords.length; i++) {
                                    var keyword = keywords[i].trim();
                                    if (keyword) {
                                        // 直接检查TextView文本是否匹配关键词
                                        if (text && isFlexibleMatch(text, keyword)) {
                                            containsContent = true;
                                            break;
                                        }
                                    }
                                }
                            }

                            if (!containsContent) {
                                log("[群内监听] 最新消息不包含监控内容，跳过点击");
                            } else {
                                // 检查是否有通知栏处理正在进行中
                                if (!isProcessingNotification) {
                                    var newCaption = getMiniProgramCaptionFromContainer(latest, curRoot);
                                    if (newCaption && lastMiniProgramCaption && newCaption === lastMiniProgramCaption) {
                                        console.log("[消息监听] 小程序链接没变化，不做点击操作");
                                        continue;
                                    } else {
                                        var target = latest.findOne(clickable(true)) || latest;
                                        var bb = target.bounds();
                                        click(bb.centerX(), bb.centerY());
                                        console.info("[消息监听] 已点击小程序消息，等待页面跳转...");
                                        // 点击后等待页面跳转，避免循环卡死
                                        sleep(2000);

                                        // 检查是否已跳转到小程序页面
                                        if (has_been_started) {
                                            break;
                                        }

                                        if (newCaption) {
                                            lastMiniProgramCaption = newCaption;
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            log("[门店检测] 点击操作出错: " + e.message);
                        }

                        // 记录最新消息的小程序文案
                        try {
                            recordLastMiniProgramCaption(containers, curRoot);
                        } catch (e) {
                            log("[群内监听] 记录小程序文案失败: " + e.message);
                        }
                    }


                    groupMsgContainerCount = containers.length;
                    lastContainerCount = containers.length; // 更新全局容器数量记录

                    // 重置检测标志
                    scrolled = false;
                    // shouldRecord = false;

                    sleep(200);
                }
            } catch (e) {
            } finally {
                groupMessageListenerStarted = false;
            }
        });
        return true;
    }catch(e) {
    }
  }



//点击x关闭方式来刷新
function pageCloseRefresh() {

    var random_delay = Math.floor(Math.random() * (random_refresh_delay_upper - random_refresh_delay_lower + 1)) + random_refresh_delay_lower;
    var sleepTarget = refresh_delay + random_delay;


    sleep(sleepTarget - 100);
    console.info("[注意] 库存刷新耗时1 ",sleepTarget,"ms");

    confirm_btn = current_webview.findOne(text("确定").algorithm('DFS'));
    if (confirm_btn) {
        return true; // 返回true表示找到确定按钮，需要跳出循环
    }


    // lastPageCloseRefreshTime = currentTime;
   // console.info("开始搜索关闭按钮...");
    // 第一步：找到indexInParent=2的android.view.View容器
    // 重新获取最新的webview和Image元素
    var updated_webview = get_current_webview_fast(current_node);
    if (!updated_webview) {
        console.warn("无法获取最新的页面元素");
        return true;
    }

    // 查找所有android.widget.Image元素
    var allImages = updated_webview.find(className("android.widget.Image").algorithm('DFS'));
    //console.info("找到Image总数量: " + allImages.length);

    var targetImage = null;
    var targetDepth = 23; // 目标深度

    // 遍历所有Image元素，找到depth为23的
    for (var i = 0; i < allImages.length; i++) {
        try {
            var image = allImages[i];
            if (image) {
                // 计算当前Image的深度
                var depth = 0;
                var parent = image.parent();
                while (parent) {
                    depth++;
                    parent = parent.parent();
                    if (!parent) break; // 防止无限循环
                }

                // 检查是否为目标深度
                if (depth === targetDepth) {
                    var bounds = image.bounds();
                    //console.info("找到depth为" + targetDepth + "的Image[" + i + "] 坐标:(" + bounds.centerX() + "," + bounds.centerY() + ")");
                    targetImage = image;
                    break;
                }
            }
        } catch (e) {
            // 忽略错误
        }
    }

    sleep(100);
    confirm_btn = updated_webview.findOne(text("确定").algorithm('DFS'));
    if (confirm_btn) {
        return true; // 返回true表示找到确定按钮，需要跳出循环
    }
    // 点击找到的Image
    try {
       // console.info("点击depth为" + targetDepth + "的Image");
        targetImage.click();
        //console.info("✅ 成功点击目标Image");
    } catch (e) {
       // console.error("点击目标Image失败: " + e.message);
    }

    // 等待页面加载
    sleep(100);


    // 查找立即购买按钮
    var buyNowBtn = current_webview.findOne(text("立即购买").algorithm('DFS'));
    if (!buyNowBtn) {
      //  console.warn("[页面刷] 未找到'立即购买'按钮，退出");
        return false;
    }


   // console.info("[页面刷] 获取并缓存'立即购买'按钮坐标: (" + cached_buy_now_coords.x + ", " + cached_buy_now_coords.y + ")");


    var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
        if (buyNowBtn) {
            // 记录按钮坐标


            buyNowBtn.click();
           // console.info("点击立即购买按钮");
            //sleep(400);
    }


    confirm_btn = updated_webview.findOne(text("确定").algorithm('DFS'));
    if (confirm_btn) {
        return true; // 返回true表示找到确定按钮，需要跳出循环
    }

    return false; // 返回false表示正常执行完成，继续循环
}

// 计算坐标位置相似度的辅助函数
function calculatePositionSimilarity(bounds, refLeft, refTop, refRight, refBottom) {
    // 计算中心点距离
    var centerX = bounds.centerX();
    var centerY = bounds.centerY();
    var refCenterX = (refLeft + refRight) / 2;
    var refCenterY = (refTop + refBottom) / 2;

    var distance = Math.sqrt(Math.pow(centerX - refCenterX, 2) + Math.pow(centerY - refCenterY, 2));

    // 计算尺寸相似度
    var width = bounds.width();
    var height = bounds.height();
    var refWidth = refRight - refLeft;
    var refHeight = refBottom - refTop;

    var widthRatio = Math.min(width, refWidth) / Math.max(width, refWidth);
    var heightRatio = Math.min(height, refHeight) / Math.max(height, refHeight);
    var sizeScore = (widthRatio + heightRatio) / 2;

    // 综合得分（距离越近，尺寸越相似，得分越高）
    var maxDistance = 200; // 最大允许距离
    var distanceScore = Math.max(0, (maxDistance - distance) / maxDistance);

    return (distanceScore * 0.7 + sizeScore * 0.3); // 位置权重70%，尺寸权重30%
}


w.settings.click(function () {
    'ui';
    showSettingsMenu();
});
// 抽离为独立函数：获取 Vika 数据并输出 data 字段
function getVitaData() {
    threads.start(function () {
        try {
            var url = "https://vika.cn/fusion/v1/datasheets/dstfMa5gx3VpqvmEok/records?viewId=viwCefELqh8e1";
            var headers = {
                Authorization: 'Bearer ' + 'uskPiOPXQAIDWMvVPY1atST'
            };
            // GET 请求
            var resp = http.get(url, { headers: headers });
            if (!resp) {
                console.error('[上传] 请求无响应');
                return;
            }
            var status = resp.statusCode;
            if (status !== 200) {
                var errStr = '';
                try { errStr = resp.body.string(); } catch (e) {}
                console.error('[上传] HTTP状态: ' + status + ' 响应: ' + errStr);
                return;
            }
            var bodyStr = resp.body.string();
            var json = null;
            try { json = JSON.parse(bodyStr); } catch (e) {
                console.error('[上传] 解析JSON失败: ' + e);
                console.error('[上传] 原始响应: ' + bodyStr);
                return;
            }
            if (json && json.data) {
                console.info('[上传] 数据 data:');
                console.info(JSON.stringify(json.data));
            } else {
                console.warn('[上传] 返回无 data 字段: ' + bodyStr);
            }
        } catch (e) {
            console.error('[上传] 请求异常: ' + e);
        }
    });
}

// 设置数据到 Vika（POST 一条记录）
function setVitaData() {
    threads.start(function () {
        try {
            var url = "https://vika.cn/fusion/v1/datasheets/dstfMa5gx3VpqvmEok/records";
            var headers = {
                Authorization: 'Bearer ' + 'uskPiOPXQAIDWMvVPY1atST',
                'Content-Type': 'application/json'
            };

            // 时间戳（毫秒）
            function nowTimestamp() {
                return Date.now();
            }

            var payload = {
                records: [
                    {
                        fields: {
                            "设备名称": globalTextViewInfo[6],
                            "设备品牌": globalTextViewInfo[7],
                            "设备型号": globalTextViewInfo[8],
                            "购买门店": globalTextViewInfo[9],
                            "商品名称": globalTextViewInfo[10],
                            "商品价格": globalTextViewInfo[11],
                            "购买数量": globalTextViewInfo[12],
                            "版本号": scriptCode,
                            "下单时间": nowTimestamp(),
                            "配置方式": (successful_data_conf === true || successful_data_conf === "true") ? "用户选择隐藏数据" : (("刷新模式："+ "\n" + globalTextViewInfo[0]) + "\n" + ("订单提交模式："+ "\n" + globalTextViewInfo[1]) + "\n" + ("库存刷新间隔："+ "\n" + globalTextViewInfo[2]) + "\n" + ("确认后时间："+ "\n" + globalTextViewInfo[3]) + "\n" + ("确认信息后时间："+ "\n" + globalTextViewInfo[4]) + "\n" + ("这家/无误后时间："+ "\n" + globalTextViewInfo[5]))
                        }
                    }
                ]
            };

            var resp = null;
            try {
                // 优先使用 postJson（若可用）
                if (typeof http.postJson === 'function') {
                    resp = http.postJson(url, payload, { headers: { Authorization: headers.Authorization } });
                } else {
                    // 退化到通用 request
                    resp = http.request({
                        method: 'POST',
                        url: url,
                        headers: headers,
                        body: JSON.stringify(payload)
                    });
                }
            } catch (e) {
                // 再次退化尝试
                resp = http.request({
                    method: 'POST',
                    url: url,
                    headers: headers,
                    body: JSON.stringify(payload)
                });
            }

            if (!resp) {
                //console.error('[上传] POST 无响应');
                return;
            }
            var status = resp.statusCode;
            var bodyStr = '';
            try { bodyStr = resp.body.string(); } catch (e) {}
            if (status !== 200 && status !== 201) {
               // console.error('[上传] POST 状态: ' + status + ' 响应: ' + bodyStr);
                return;
            }
            var json = null;
            try { json = JSON.parse(bodyStr); } catch (e) {
                //console.error('[上传] POST 响应解析失败: ' + e);
                //console.error('[上传] 原始响应: ' + bodyStr);
                return;
            }
            console.info('[上传] 已上传SUCCESS记录');
            //console.info('[上传] 响应: ' + JSON.stringify(json));
        } catch (e) {
            //console.error('[上传] POST 异常: ' + e);
        }
    });
}
// 计算窗口位置：右侧贴边，顶部25%位置
var uiWidth = 56; // UI宽度
var posX = storage.get('floaty_position_x');
var posY = storage.get('floaty_position_y');
var defaultX = screenWidth  - uiWidth*3; // 右侧贴边，预留UI宽度
var defaultY = Math.floor(screenHeight * 0.25); // 顶部25%位置

// 检查保存的位置是否有效，如果无效则使用默认位置
if (typeof posX === 'number' && typeof posY === 'number' && posX >= 0 && posX + uiWidth <= screenWidth && posY >= 0 && posY <= screenHeight) {
    w.setPosition(posX, posY);
} else {
    w.setPosition(defaultX, defaultY);
}

function clickNotifyBtn() {
    var btn = className("android.widget.TextView").text("到货通知").findOne(20);
    if (btn) {
        console.warn("已点击到货通知按钮");
        btn.click();
        sleep(50);
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
            if (child.childCount() != 0) {
                maxOrder = order;
                highestOrderChild = child;
            }
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

// 检测微信支付相关元素的综合函数
function detectWeChatPayment() {
    try {
        // 微信支付相关的关键词列表
        var wechatPaymentKeywords = [
            "微信支付", "微信付款", "微信", "支付", "付款", "确认支付", "立即支付",
            "请输入支付密码", "支付密码", "密码", "确认", "完成", "取消",
            "支付金额", "金额", "元", "￥", "¥",
            "指纹支付", "面容支付", "密码支付",
            "支付成功", "支付失败", "支付中", "正在支付"
        ];

        // 方法1: 检测文本内容
        for (var i = 0; i < wechatPaymentKeywords.length; i++) {
            var keyword = wechatPaymentKeywords[i];

            // 使用多种选择器查找文本
            var textElement = text(keyword).findOne(50);
            if (textElement) {
                console.info("[支付检测] 找到微信支付相关文本: " + keyword);
                return true;
            }

            // 使用描述查找
            var descElement = desc(keyword).findOne(50);
            if (descElement) {
                console.info("[支付检测] 找到微信支付相关描述: " + keyword);
                return true;
            }

            // 使用TextView类查找
            var textViewElement = className("android.widget.TextView").text(keyword).findOne(50);
            if (textViewElement) {
                console.info("[支付检测] 找到微信支付相关TextView: " + keyword);
                return true;
            }

            // 使用Button类查找
            var buttonElement = className("android.widget.Button").text(keyword).findOne(50);
            if (buttonElement) {
                console.info("[支付检测] 找到微信支付相关Button: " + keyword);
                return true;
            }
        }

        // 方法2: 检测数字键盘（支付密码键盘）
        var numberKeyboard = text("1").findOne(50) && text("2").findOne(50) && text("3").findOne(50) &&
                           text("4").findOne(50) && text("5").findOne(50) && text("6").findOne(50) &&
                           text("7").findOne(50) && text("8").findOne(50) && text("9").findOne(50) &&
                           text("0").findOne(50);
        if (numberKeyboard) {
            console.info("[支付检测] 检测到数字键盘（可能是支付密码键盘）");
            return true;
        }

        // 方法3: 检测特定布局或容器
        var paymentContainer = className("android.widget.LinearLayout").desc("支付").findOne(50) ||
                             className("android.widget.RelativeLayout").desc("支付").findOne(50) ||
                             className("android.widget.FrameLayout").desc("支付").findOne(50);
        if (paymentContainer) {
            console.info("[支付检测] 检测到支付相关容器");
            return true;
        }

        // 方法4: 检测图片描述（如果支付相关文字是图片形式）
        var paymentImage = className("android.widget.ImageView").desc("支付").findOne(50) ||
                          className("android.widget.ImageView").desc("微信").findOne(50) ||
                          className("android.widget.ImageView").desc("付款").findOne(50);
        if (paymentImage) {
            console.info("[支付检测] 检测到支付相关图片");
            return true;
        }

        // 方法5: 检测页面标题或头部
        var pageTitle = className("android.widget.TextView").textMatches(".*支付.*").findOne(50) ||
                       className("android.widget.TextView").textMatches(".*微信.*").findOne(50) ||
                       className("android.widget.TextView").textMatches(".*付款.*").findOne(50);
        if (pageTitle) {
            console.info("[支付检测] 检测到支付相关页面标题");
            return true;
        }

        // 方法6: 检测可点击的支付相关元素
        var clickablePayment = clickable(true).textMatches(".*支付.*").findOne(50) ||
                              clickable(true).descMatches(".*支付.*").findOne(50) ||
                              clickable(true).textMatches(".*确认.*").findOne(50) ||
                              clickable(true).descMatches(".*确认.*").findOne(50);
        if (clickablePayment) {
            console.info("[支付检测] 检测到可点击的支付相关元素");
            return true;
        }

        // 方法7: 检测金额显示（通常支付页面会显示金额）
        var amountDisplay = className("android.widget.TextView").textMatches(".*[0-9]+\\.[0-9]{2}.*").findOne(50) ||
                           className("android.widget.TextView").textMatches(".*￥[0-9]+.*").findOne(50) ||
                           className("android.widget.TextView").textMatches(".*¥[0-9]+.*").findOne(50);
        if (amountDisplay) {
            console.info("[支付检测] 检测到金额显示");
            return true;
        }

        console.info("[支付检测] 未检测到微信支付相关元素");
        return false;

    } catch (e) {
        console.error("[支付检测] 检测过程中发生错误: " + e.message);
        return false;
    }
}

function get_webview_parent_node() {
    try {
        var webview_parent_node = className('android.widget.RelativeLayout').algorithm('BFS').findOne(100);
        if (!webview_parent_node) {
            return null;
        }
        var parent1 = webview_parent_node.parent();
        if (!parent1) {
            return null;
        }
        var parent2 = parent1.parent();
        if (!parent2) {
            return null;
        }
        return parent2;
    } catch (e) {
        console.error("[get_webview_parent_node] 获取webview父节点失败: " + e.message);
        return null;
    }
}

function clickButton(button) {
    var bounds = button.bounds();
    var centerX = bounds.centerX();
    var centerY = bounds.centerY();
    click(centerX, centerY);
}

function get_current_node(webview_parent_node) {
    // 添加null检查
    if (!webview_parent_node) {
        return null;
    }

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

function get_points_exchange_node(webview_parent_node) {
    // 添加null检查
    if (!webview_parent_node) {
        return null;
    }

    var count = webview_parent_node.childCount();
    if (count == 0) {
        return null;
    }

    // 严格检查：只有在确认是积分兑换页面时才返回节点
    var targetNode = null;

    // 遍历所有子节点，寻找积分兑换相关的特征
    for (var i = 0; i < count; i++) {
        var child = webview_parent_node.child(i);
        if (!child) continue;

        // 检查是否有积分兑换相关的特征
        if (hasPointsExchangeFeatures(child)) {
            targetNode = child;
            break;
        }
    }

    // 如果没有找到特定特征，返回null（不使用默认逻辑）
    // 这样可以避免在其他页面误触发积分兑换模式
    if (!targetNode) {
        return null;
    }

    return targetNode;
}

// 新增：检查节点是否包含积分兑换特征
function hasPointsExchangeFeatures(node) {
    if (!node) return false;

    try {
        // 更精确的积分兑换页面检测
        // 检查是否有"会员权益"标题（这是积分兑换页面的唯一标识）
        var memberRightsTitle = node.findOne(text("会员权益").algorithm('DFS'));
        if (memberRightsTitle) {
            return true;
        }

        // 检查子节点
        var childCount = node.childCount();
        for (var i = 0; i < childCount; i++) {
            var child = node.child(i);
            if (hasPointsExchangeFeatures(child)) {
                return true;
            }
        }

        return false;
    } catch (e) {
        return false;
    }
}

// 新增：积分兑换页面的WebView获取函数
function get_points_exchange_webview(current_node) {
    if (!current_node) {
        return null;
    }

    // 首先尝试使用通用的WebView查找方法
    var webview = current_node.findOne(className('android.webkit.WebView').algorithm('DFS'));
    if (webview) {
        return webview;
    }

    // 如果通用方法失败，尝试积分兑换特定的查找逻辑
    return findPointsExchangeWebView(current_node);
}

// 新增：积分兑换特定的WebView查找逻辑
function findPointsExchangeWebView(current_node) {
    if (!current_node) {
        return null;
    }

    // 这里需要根据积分兑换页面的实际结构来实现
    // 可能需要遍历不同的层级结构

    var childCount = current_node.childCount();
    for (var i = 0; i < childCount; i++) {
        var child = current_node.child(i);
        if (!child) continue;

        // 检查是否是WebView
        if (child.className() === 'android.webkit.WebView') {
            return child;
        }

        // 递归检查子节点
        var webview = findPointsExchangeWebView(child);
        if (webview) {
            return webview;
        }
    }

    return null;
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

    if (!drawing_order_2_child || drawing_order_2_child.childCount() < 1) {
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
//收藏列表
function traverseAndPrintAllElements(current_webview) {
    if (!current_webview) {
        console.log("No webview provided");
        return 0;
    }
    // 检查是否设置了关键词
    if (!keyword_text || keyword_text === "") {
        log("没有设置关键词");
        return;
    }
    // 查找className为android.webkit.WebView的元素
    var webviewElement = current_webview.findOne(className('android.webkit.WebView'));
    if (!webviewElement) {
        var productlist = current_webview.findOne(text("商品列表").algorithm('DFS'));
        if(productlist){
            productlist.click();
            return;
        }
        console.log("No android.webkit.WebView element found");
        return;
    }

    // 获取WebView元素的子元素数量
    var childCount = webviewElement.childCount();

    // 先统计所有android.view.View元素
    var allViews = [];
    for (var i = 0; i < childCount; i++) {
        var child = webviewElement.child(i);
        if (child && child.className() === 'android.view.View') {
            allViews.push(child);
        }
    }


    // 遍历第2个到最后一个android.view.View
    var foundAndClicked = false; // 添加标志变量防止重复执行
    for (var i = 1; i < allViews.length && !foundAndClicked; i++) {
        var currentView = allViews[i];
        // 检查该View下是否有android.view.View子元素
        var viewChildCount = currentView.childCount();
        var hasViewChild = false;

        for (var j = 0; j < viewChildCount && !foundAndClicked; j++) {
            var viewChild = currentView.child(j);
            if (viewChild && viewChild.className() === 'android.view.View') {
                var subViewChildCount = viewChild.childCount();
                for (var k = 0; k < subViewChildCount && !foundAndClicked; k++) {
                    var subViewChild = viewChild.child(k);
                    if (subViewChild && subViewChild.className() === 'android.view.View') {
                        var deepChildCount = subViewChild.childCount();
                        if (deepChildCount === 1) {
                            for (var l = 0; l < subViewChildCount && !foundAndClicked; l++) {
                                var siblingChild = viewChild.child(l);
                                if (siblingChild && siblingChild.className() === 'android.widget.TextView') {
                                    var textContent = siblingChild.text();
                                    if (textContent && keyword_text && isFlexibleMatch(textContent, keyword_text)) {
                                        siblingChild.click(); // 点击找到的元素
                                        foundAndClicked = true; // 设置标志变量
                                        log("点击商品词: " + keyword_text);
                                        sleep(400);
                                        return; // 立即退出所有for循环并return
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    // 如果遍历完所有元素都没有找到关键词，则提示用户
    if (!foundAndClicked) {
        log("请添加商品至收藏列表");
    }
    return;
}


// 抽盒机页面
function check_prize_box_page_tree(header_text, current_webview) {
     console.info("check_prize_box_page_tree");

     if (!current_webview) {
         return { header: header_text, status: "no_webview" };
     }
    if(header_text == "收藏列表"){
        return{header: header_text, status: "favoriteslist" }
    }else if (header_text == "" || header_text === "no_header") {
        var startTime = Date.now();
        var header_text = current_webview.findOne(text("确认订单").algorithm('DFS'));
        if (header_text) {
            return { header: header_text, status: "confirm_and_pay" };
        }
        var select_box_pay_button = find_select_box_pay_button(current_webview);
        if (select_box_pay_button) {
            return { header: header_text, status: "withdraw" };
        }
        var button_parent = find_Prize_box_button_parent(current_webview);
        if (button_parent && button_parent.text() == "立即购买") {
            return { header: header_text, status: "purchase" };
        }
        if(button_parent && button_parent.text() != "立即购买"){
            return { header: header_text, status: "purchase_refresh" };
        }
        if (Date.now() - startTime > 20) {
            return { header: header_text, status: "default" };
        }
        // 检查是否有"立即购买"按钮
        var info_page_last_button = find_Prize_box_last_button(current_webview);
        if(info_page_last_button && info_page_last_button.text() == "立即购买"){
            return { header: header_text, status: "info_page" };
        }
        if(info_page_last_button && info_page_last_button.text() != "立即购买" && !info_page_last_button.text().match(/.*开售.*/)){
            return { header: header_text, status: "refresh" };
        }
        var prepareSaleElement = current_webview.findOne(text("即将开售00:00").algorithm('DFS'));
        if (prepareSaleElement) {
            return { header: header_text, status: "prepare_sale" };
        }

        var select_box_last_button = find_select_box_last_button(current_webview);
        if (select_box_last_button && (select_box_last_button.text() == "立即选盒" || select_box_last_button.text() == "一次抽多盒")) {
            return { header: header_text, status: "withdraw_and_pay" };
        }
        if (select_box_last_button && (select_box_last_button.text() != "立即选盒" || select_box_last_button.text() != "一次抽多盒")) {
            return { header: header_text, status: "back" };
        }
        return { header: header_text, status: "default" };
     }

     // 其他所有页面都直接点击积分商品
     return { header: header_text, status: "default" };
 }
// 积分兑换页面
function check_points_exchange_page_tree(header_text, current_webview) {
    // console.info("check_points_exchange_page_tree");

     if (!current_webview) {
         return { header: header_text, status: "no_webview" };
     }
     if (header_text === "确认订单" || header_text === "访问异常，请稍后重试") {
         return { header: header_text, status: "confirm_and_pay" };
     } else if (header_text == "" || header_text === "会员权益") {
         var exchange_points_btn = current_webview.findOne(text("领取积分").algorithm('DFS'));
         if (exchange_points_btn) {
             return { header: header_text, status: "exchange_points" };
         }
         return { header: header_text, status: "points_exchange_home" };
     }

     // 其他所有页面都直接点击积分商品
     return { header: header_text, status: "default" };
 }
// 小程序页面
function check_current_page_tree(header_text, current_webview) {
//   console.info("check_current_page_tree")
    if (!current_webview) {
        return { header: header_text, status: "no_webview" };
    }
    if (header_text === "确认订单" || header_text === "访问异常，请稍后重试") {
        return { header: header_text, status: "confirm_and_pay" };
    } else if (header_text == "" || header_text != "no_header") {
        var startTime = Date.now();
        var button_parent = find_button_parent(current_webview);
        if (button_parent) {
            return { header: header_text, status: "purchase" };
        }

        if (Date.now() - startTime > 20) {
            return { header: header_text, status: "default" };
        }

        // 检查是否有"立即购买"按钮
        var info_page_last_button = find_info_page_last_button(current_webview);
        if (info_page_last_button && info_page_last_button.text() == "立即购买") {
           // rebuy_flag = false;
            return { header: header_text, status: "info_page" };
        }

        // 检查是否有"距离开售时间还剩00:00"文字
        var prepareSaleElement = current_webview.findOne(text("距离开售时间还剩00:00").algorithm('DFS'));
        if (prepareSaleElement) {
            return { header: header_text, status: "prepare_sale" };
        }

        var hidden_confirm_btn = current_webview.findOne(text("确认信息并支付").algorithm('DFS'));
        if (hidden_confirm_btn) {
            return { header: header_text, status: "confirm_and_pay" };
        }

        if (className('android.widget.TextView').text('自提门店列表').exists()){
           //console.info("自提门店列表");
           return { header: header_text, status: "back" };
        }
        return { header: header_text, status: "default" };
    } else {
        return { header: header_text, status: "default" };
    }
}




// 添加多种刷新方法的组合
function performRefreshActions(webview) {
    try {
        var initialBounds = webview.bounds();
        var initialCenterX = initialBounds.centerX();
        var initialCenterY = initialBounds.centerY();
        var startY = initialCenterY - 200;
        var endY = initialCenterY + 700;

        // 使用多点手势实现更流畅的下拉
        var points = [];
        var steps = 20; // 增加手势点数
        for (var i = 0; i <= steps; i++) {
            var progress = i / steps;
            var currentY = startY + (endY - startY) * progress;
            points.push([initialCenterX, currentY]);
        }

        gesture(800, points); // 增加手势持续时间
        sleep(1000);

        console.info("[操作] 下拉库存刷新中.....");
        return true;
        } catch (e) {
        console.error("[错误] 下拉刷新执行失败: " + e.message);
        return false;
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

    var number_text = current_webview.findOne(className("android.widget.TextView").textMatches(".*数量.*").algorithm('DFS'));
    var idx_num_text = number_text.indexInParent()
    var parent_view = number_text.parent()
    var minus_btn = parent_view.child(idx_num_text + 1);
    var number_count_text = parent_view.child(idx_num_text + 2);
    var plus_btn = parent_view.child(idx_num_text + 3);
    var current = parseInt(number_count_text.text());
    if (script_status == 0) {
        return false;
    }
    if (isNaN(current)) {
        console.warn("无法处理购买数量: " + number_count_text.text());
        return;
    }
    var current = parseInt(number_count_text.text());
    if (current === target) {
        console.warn("当前已满足购买数量要求: " + current);
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
            return false;
        }

        coordinates = getPasswordKeyboardCoordinates();

        if (coordinates && Object.keys(coordinates).length >= 9) {
            break;
        }


        sleep(1000); // 等待1秒后重试
    }

    // 再次检查脚本状态
    if (script_status == 0) {
        return false;
    }

    if (!coordinates || Object.keys(coordinates).length < 9) {
        console.error("等待超时或未找到密码键盘");
        return false;
    }

    // 输入用户设置的密码

    for (var i = 0; i < password.length; i++) {
        // 在每次输入前检查脚本状态
        if (script_status == 0) {
            return false;
        }

        var digit = password.charAt(i);
        var coord = coordinates[digit];

        if (coord) {
            click(coord.x, coord.y);
            sleep(300); // 每次点击间隔300ms
        } else {
            return false;
        }
    }

    console.info("[密码输入] 密码输入完成！");


    // 在点击确认前检查脚本状态
    if (script_status == 0) {
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
        confirmButton.click();
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
                console.error("[状态] 抢购脚本停止");
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

            } else {
                // 如果特定数字找不到，记录详细信息
            }
        }

        // 也尝试查找数字0
        // 检查脚本状态，如果被暂停则退出
        if (script_status == 0) {
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
        }
        // 只有当找到足够的数字时才输出详细信息
        if (foundNumbers.length >= 9) {

            // 输出所有坐标信息
            for (var i = 1; i <= 9; i++) {
                // 检查脚本状态，如果被暂停则退出
                if (script_status == 0) {
                    return null;
                }

                var digit = i.toString();
                if (numberCoordinates[digit]) {
                    var coord = numberCoordinates[digit];
                }
            }
            if (numberCoordinates["0"]) {
                var coord = numberCoordinates["0"];
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
            }
        }

        return numberCoordinates;

    } catch (e) {
        return null;
    }
}

function find_info_page_last_button(current_webview) {
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

    if (!last_view) {
        if (debug_mode_conf) {
            log("Cannot find last view.");
            log("last_view is null");
        }
        return null;
    }

    if (last_view.childCount() != 1 && last_view.childCount() != 2) {
        if (debug_mode_conf) {
            log("last_view error: " + last_view.childCount());
        }
        return null;
    }

    var last_child = last_view.child(last_view.childCount() - 1); // get last child of last_view
    if (!last_child || last_child.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child is null or not android.view.View");
        }
        return null;
    }

    // get last child of last_child
    // make sure it has at least one child
    if (last_child.childCount() < 1) {
        if (debug_mode_conf) {
            log("last_child does not have at least one child");
        }
        return null;
    }
    // get last child of last_child
    var last_child_last_child = last_child.child(last_child.childCount() - 1);
    if (!last_child_last_child || last_child_last_child.className() !== "android.widget.TextView") {
        if (debug_mode_conf) {
            log("last_child_last_child is null or not android.widget.TextView");
        }
        return null;
    }

    return last_child_last_child;
}

function find_button_parent(current_webview) {
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

    if (!last_view) {
        if (debug_mode_conf) {
            log("Cannot find last view.");
            log("last_view is null");
        }
        sleep(30);
        return null;
    }
    // always check for childCount before accessing children
    // make sure it has two children
    if (last_view.childCount() < 2) {
        if (debug_mode_conf) {
            log("last_view has less than 2 children");
        }
        return null;
    }
    // get the last child of last_view, and make sure it is view
    var last_child = last_view.child(last_view.childCount() - 1);
    if (!last_child || last_child.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child is null or not android.view.View");
        }
        return null;
    }
    // make sure it only has one child
    if (last_child.childCount() != 1) {
        if (debug_mode_conf) {
            log("last_child does not have exactly 1 child");
        }
        return null;
    }
    // make the last_child its 0 child
    var last_child_0 = last_child.child(0);
    if (!last_child_0 || last_child_0.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child_0 is null or not android.view.View");
        }
        return null;
    }
    // make sure it only has one child
    if (last_child_0.childCount() != 1) {
        if (debug_mode_conf) {
            log("last_child_0 does not have exactly 1 child");
        }
        return null;
    }
    var last_child_0_0 = last_child_0.child(0);
    if (!last_child_0_0 || last_child_0_0.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child_0_0 is null or not android.view.View");
        }
        return null;
    }
    // make sure it has three children and the last one is a view
    if (last_child_0_0.childCount() != 3) {
        if (debug_mode_conf) {
            log("last_child_0_0 does not have exactly 3 children");
        }
        return null;
    }
    var last_child_0_0_2 = last_child_0_0.child(2);
    if (!last_child_0_0_2 || last_child_0_0_2.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child_0_0_2 is null or not android.view.View");
        }
        return null;
    }
    return last_child_0_0_2;
}

function find_confirm_btn(current_webview) {
    var last_child_0_0_2 = find_button_parent(current_webview);
    if (!last_child_0_0_2) {
        return null;
    }

    // if last_child_0_0_2 has one child, get it, check for null and make see if its text is "确定", if it is return that child, otherwise return null
    if (last_child_0_0_2.childCount() == 1) {
        var child = last_child_0_0_2.child(0);
        if (child && child.text() == "确定") {
            return child;
        }
    }
    return null;
}
function find_Prize_box_last_button(current_webview) {
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

    if (!last_view) {
        if (debug_mode_conf) {
            log("Cannot find last view.");
            log("last_view is null");
        }
        return null;
    }

    if (last_view.childCount() != 1 && last_view.childCount() != 2) {
        if (debug_mode_conf) {
            log("last_view error: " + last_view.childCount());
        }
        return null;
    }
    var last_child = last_view.child(last_view.childCount() - 1);
    if (!last_child || last_child.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child is null or not android.view.View");
        }
        return null;
    }
    // make sure it only has one child
    if (last_child.childCount() != 1) {
        if (debug_mode_conf) {
            log("last_child does not have exactly 1 child");
        }
        return null;
    }
    var last_child_0 = last_child.child(0);
    if (!last_child_0 || last_child_0.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child_0 is null or not android.view.View");
        }
        return null;
    }
    // make sure it only has one child
    if (last_child_0.childCount() != 1) {
        if (debug_mode_conf) {
            log("last_child_0 does not have exactly 1 child");
        }
        return null;
    }
    var last_child_0_0 = last_child_0.child(0);
    if (!last_child_0_0 || last_child_0_0.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child_0_0 is null or not android.view.View");
        }
        return null;
    }

    var last_child_last_child = last_child_0_0.child(last_child_0_0 .childCount() - 1);
    if (!last_child_last_child || last_child_last_child.className() !== "android.widget.Button") {
        if (debug_mode_conf) {
            log("last_child_last_child is null or not android.widget.TextView");
        }
        return null;
    }

    return last_child_last_child;
}
function find_Prize_box_button_parent(current_webview) {
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

    if (!last_view) {
        if (debug_mode_conf) {
            log("Cannot find last view.");
            log("last_view is null");
        }
        sleep(30);
        return null;
    }
    if (last_view.childCount() != 1 && last_view.childCount() != 2) {
        if (debug_mode_conf) {
            log("last_view error: " + last_view.childCount());
        }
        return null;
    }
    var last_child = last_view.child(last_view.childCount() - 1);
    if (!last_child || last_child.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child is null or not android.view.View");
        }
        return null;
    }
    if (last_child.childCount() != 1) {
        if (debug_mode_conf) {
        log("last_child does not have exactly 1 child");
        }
        return null;
    }
    var last_child_0 = last_child.child(0);
    if (!last_child_0 || last_child_0.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child_0 is null or not android.view.View");
        }
        return null;
    }
    // make sure it only has one child
    if (last_child_0.childCount() != 2) {
        if (debug_mode_conf) {
            log("last_child_0 does not have exactly 1 child");
        }
        return null;
    }
    var last_child_0_0 = last_child_0.child(0);
    if (!last_child_0_0 || last_child_0_0.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child_0_0 is null or not android.view.View");
        }
        return null;
    }
    if (last_child_0_0.childCount() != 3) {
        if (debug_mode_conf) {
            log("last_child_0_0 does not have exactly 1 child");
        }
        return null;
    }
    var last_child_0_0_2 = last_child_0_0.child(2);
    if (!last_child_0_0_2 || last_child_0_0_2.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child_0_0_2 is null or not android.view.View");
        }
        return null;
    }

        var last_child_0_0_0_2 = last_child_0_0_2.child(0);
        if (!last_child_0_0_0_2 || last_child_0_0_0_2.className() !== "android.widget.Button") {
            if (debug_mode_conf) {
                log("last_child_0_0_0_2 is null or not android.widget.Button");
            }
            return null;
        }
        return last_child_0_0_0_2;
    }

function find_select_box_pay_button(current_webview) {
    var last_view = null;
    var childCount = current_webview.childCount();
    var viewCount = 0;
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
            viewCount++;
            if (viewCount === 1) { // 找到倒数第二个
                last_view = child;
                break;
            }
        }
    }

    if (!last_view) {
        if (debug_mode_conf) {
            log("Cannot find last view.");
            log("last_view is null");
        }
        return null;
    }

    if (last_view.childCount() < 2) {
        if (debug_mode_conf) {
            log("last_view has less than 2 children");
        }
        return null;
    }

    var last_child = last_view.child(last_view.childCount() - 1);
    if (!last_child || last_child.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child is null or not android.view.View");
        }
        return null;
    }
    // make the last_child its last child
    var last_child_0 = last_child.child(last_child.childCount() - 1);
    if (!last_child_0 || last_child_0.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child_0 is null or not android.view.View");
        }
        return null;
    }
    var last_child_0_0 = last_child_0.child(last_child_0.childCount() - 1);
    if (!last_child_0_0 || last_child_0_0.className() !== "android.view.View") {
        if (debug_mode_conf) {
            log("last_child_0_0 is null or not android.view.View");
        }
        return null;
    }

    var last_child_0_0_0 = last_child_0_0.child(last_child_0_0.childCount() - 1);
    if (!last_child_0_0_0 || last_child_0_0_0.className() !== "android.widget.Button") {
        if (debug_mode_conf) {
            log("last_child_0_0_0 is null or not android.widget.Button");
        }
        return null;
    }
    return last_child_0_0_0;
}

function find_select_box_last_button(current_webview) {
    var last_view = null;
    var childCount = current_webview.childCount();
    for (var i = childCount - 2; i >= 0; i--) {
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

    if (!last_view) {
        if (debug_mode_conf) {
            log("Cannot find last view.");
            log("last_view is null");
        }
        sleep(30);
        return null;
    }

    if (last_view.childCount() != 2 && last_view.childCount() != 3) {
        if (debug_mode_conf) {
            log("last_view error: " + last_view.childCount());
        }
        return null;
    }

    var first_child = last_view.child(0); // get first child of last_view
    if (!first_child || first_child.className() !== "android.widget.TextView") {
        if (debug_mode_conf) {
            log("last_child is null or not android.widget.TextView");
        }
        return null;
    }
    return first_child;
}

function is_empty_stock(current_webview) {
    var last_child_0_0_2 = find_button_parent(current_webview);
    if (!last_child_0_0_2) {
        return null;
    }

    // if last_child_0_0_2 has one child, get it, check for null and make see if its text is "确定", if it is return that child, otherwise return null
    if (last_child_0_0_2.childCount() >= 2) {
        return true;
    } else if (last_child_0_0_2.childCount() == 1) {
        var child = last_child_0_0_2.child(0);
        if (child && child.text() == "该渠道暂不发售") {
            return true;
        }
    }
    return false;
}

// STATE VARIABLES - These need to be reset when script_status = 0
var rebuy_flag = false;
var submit_flag = false;
var confirm_btn_retry_count = 0;
var ignore_next_purchase_page_flag = false;
var has_entered_confirm_and_pay = false; // 标记是否进入过confirm_and_pay状态
var confirmInfoClicked = false; // 跟踪确认信息并支付按钮点击状态
var doubleConfirmClicked = false; // 跟踪确认无误/就是这家按钮点击状态
var confirmBtnEnterCount = 0; //回流计数器

var dc_streak = 0;
var payment_page_confirm_btn_retry_count = 0;
var tried_clicked_confirm_to_pay_page_count = 0;

var defaultInterval = 150;

var submited_refresh_flag = false;
var submited_refresh_count = 0;

function safeClickByText(_0x222437,_0x407a0d){
    var _0xb64220=_0x222437.text(_0x407a0d).findOne(500);
    if(_0xb64220){
        _0xb64220.click();
        return true;
    }
    return false;
}

function startPaymentProcess() {

            // 1. 优先使用坐标点击 "确认信息并支付" 按钮（极速模式）
            if (calibration_status.confirm_info) {
                clickByCoordinates('confirm_info');
                console.error("[点击] 确认信息并支付1");
                confirmInfoClicked = true;
                doubleConfirmClicked = false;
                sleep(ignore_ack_click_delay);

            }
            // 根据购买类型选择不同的确认按钮
            if (purchase_type === '送到家') {
                if (calibration_status.double_confirm) {
                    clickByCoordinates('double_confirm');
                    doubleConfirmClicked = true;
                    confirmInfoClicked = false;
                    console.info("[点击] 确认无误1");
                }
            } else if (purchase_type === '到店取') {
                if (calibration_status.double_exactly) {
                    clickByCoordinates('double_exactly');
                    doubleConfirmClicked = true;
                    confirmInfoClicked = false;
                    console.info("[点击] 就是这家1");
                }
            }
            //sleep(ignore_ack_click_confirm_delay + 100);


            // 标记是否进入了while循环
            // 添加重试计数器
            var confirmInfoRetryCount = 0;
            var doubleConfirmRetryCount = 0;
            if(order_submission_mode_conf == "狂暴模式"){
            while (className('android.widget.TextView').text('确认订单').exists() == true) {
                // 检查是否被要求停止
                if (script_status == 0) {
                    rebuy_flag = false;
                    submit_flag = false;
                    dc_streak = 0;
                    confirmButtonExecuted = false; // 重置确认按钮执行标志
                    purchasee_pagee_count = 0;
                    confirmBtnEnterCount = 0;
                    confirmInfoClicked = false; // 重置确认信息并支付按钮点击状态
                    doubleConfirmClicked = false; // 重置确认无误/就是这家按钮点击状态
                    break;
                }
                // 使用findOne()替代exists()，提高识别速度
            if(!confirmInfoClicked){
                var confirmInfoBtn = className('android.widget.TextView').text('确认信息并支付').findOne(20);
                if(confirmInfoBtn){
                    if (!calibration_status.confirm_info) {
                        var bounds = confirmInfoBtn.bounds();
                        var coords = [bounds.left, bounds.top, bounds.right, bounds.bottom];
                        cached_confirm_info_coords = coords;
                        calibration_status.confirm_info = true;
                        updatePrecomputedCoords();
                        saveCoordinatesToStorage();
                        console.info("[记录坐标] 确认信息并支付按钮坐标已记录并保存到本地");
                    }
                    safeClickByText(className('android.widget.TextView'),'确认信息并支付');
                    console.error("[点击] 确认信息并支付2");
                    confirmInfoClicked = true;
                    doubleConfirmClicked = false;
                } else {
                    if(confirmInfoRetryCount < 2){
                        confirmInfoRetryCount++;
                      //  log("确认信息并支付:"+confirmInfoRetryCount);
                        sleep(100);
                        continue;
                    } else {
                        if(className('android.widget.TextView').text('我知道了').exists()==true){
                        safeClickByText(className('android.widget.TextView'),'我知道了');
                        }else{
                            back();
                        }
                        break;
                    }
                }
            }

                var currentConfirmOrder = className('android.widget.TextView').text('确认订单').findOne(50);
                if (!currentConfirmOrder) {
                    break;
                }
                sleep(50);

                 if(confirmInfoClicked && !doubleConfirmClicked) {
                    if(purchase_type === '到店取') {
                        var homeBtn = className('android.widget.TextView').text('就是这家').findOne(200);
                        if(homeBtn) {
                            if (!calibration_status.double_exactly) {
                                var bounds = homeBtn.bounds();
                                var coords = [bounds.left, bounds.top, bounds.right, bounds.bottom];
                                cached_double_exactly_coords = coords;
                                calibration_status.double_exactly = true;
                                updatePrecomputedCoords();
                                saveCoordinatesToStorage();
                                console.info("[记录坐标] 就是这家按钮坐标已记录并保存到本地");
                            }
                            //console.info('二次确认：点击\'就是这家\'按钮');
                            safeClickByText(className('android.widget.TextView'),'就是这家');
                            console.info("[点击] 就是这家2");
                            doubleConfirmClicked = true;
                            confirmInfoClicked = false;
                        } else {
                            //console.info('二次确认：未找到\'就是这家\'按钮');
                            if(doubleConfirmRetryCount < 2){
                                doubleConfirmRetryCount++;
                               // log(doubleConfirmRetryCount);
                                continue;
                            } else {
                                if(className('android.widget.TextView').text('我知道了').exists()==true){
                                    safeClickByText(className('android.widget.TextView'),'我知道了');
                                    }else{
                                        back();
                                    }
                                break;
                            }
                        }
                    } else if(purchase_type === '送到家') {
                        var confirmBtn = className('android.widget.TextView').text('确认无误').findOne(200);
                        if(confirmBtn) {
                            if (!calibration_status.double_confirm) {
                                var bounds = confirmBtn.bounds();
                                var coords = [bounds.left, bounds.top, bounds.right, bounds.bottom];
                                cached_double_confirm_coords = coords;
                                calibration_status.double_confirm = true;
                                updatePrecomputedCoords();
                                saveCoordinatesToStorage();
                                console.info("[记录坐标] 确认无误按钮坐标已记录并保存到本地");
                            }
                            //console.info('二次确认：点击\'确认无误\'按钮');
                            safeClickByText(className('android.widget.TextView'),'确认无误');
                            console.info("[点击] 确认无误2");
                            doubleConfirmClicked = true;
                            confirmInfoClicked = false;
                        } else {
                            //console.info('二次确认：未找到\'确认无误\'按钮');
                            if(doubleConfirmRetryCount < 2){
                                doubleConfirmRetryCount++;
                                continue;
                            } else {
                                if(className('android.widget.TextView').text('我知道了').exists()==true){
                                    safeClickByText(className('android.widget.TextView'),'我知道了');
                                    }else{
                                        back();
                                    }
                                break;
                            }
                        }
                    }
                }

            var currentConfirmOrder = className('android.widget.TextView').text('确认订单').findOne(180);
                    if (!currentConfirmOrder) {
                      //  console.info("[页面变化] 检测到确认订单页面已消失，退出循环");
                        break;
                    }
                    sleep(100);
        }
        sleep(50);
            }else{
                sleep(ignore_ack_click_confirm_delay -50);
                while (className('android.widget.TextView').text('确认订单').exists() == true) {
                    if (script_status == 0) {
                        rebuy_flag = false;
                        submit_flag = false;
                        dc_streak = 0;
                        confirmButtonExecuted = false; // 重置确认按钮执行标志
                        purchasee_pagee_count = 0;
                        confirmBtnEnterCount = 0;
                        confirmInfoClicked = false; // 重置确认信息并支付按钮点击状态
                        doubleConfirmClicked = false; // 重置确认无误/就是这家按钮点击状态
                        break;
                    }
                if(!confirmInfoClicked){
                    var confirmInfoBtn = className('android.widget.TextView').text('确认信息并支付').findOne(200);
                    if(confirmInfoBtn){
                        safeClickByText(className('android.widget.TextView'),'确认信息并支付');
                        if (!calibration_status.confirm_info) {
                            var bounds = confirmInfoBtn.bounds();
                            var coords = [bounds.left, bounds.top, bounds.right, bounds.bottom];
                            cached_confirm_info_coords = coords;
                            calibration_status.confirm_info = true;
                            updatePrecomputedCoords();
                            saveCoordinatesToStorage();
                            console.info("[记录坐标] 确认信息并支付按钮坐标已记录并保存到本地");
                        }
                        console.error("[点击] 确认信息并支付2");
                        confirmInfoClicked = true;
                        doubleConfirmClicked = false;
                        sleep(ignore_ack_click_delay - 100);
                    } else {
                        if(confirmInfoRetryCount < 2){
                            confirmInfoRetryCount++;
                       //   log("确认信息并支付:"+confirmInfoRetryCount);
                            sleep(100);
                            continue;
                        } else {
                            if(className('android.widget.TextView').text('我知道了').exists()==true){
                                safeClickByText(className('android.widget.TextView'),'我知道了');
                                }else{
                                    back();
                                }
                            break;
                        }
                    }
                }
                    var currentConfirmOrder = className('android.widget.TextView').text('确认订单').findOne(100);
                    if (!currentConfirmOrder) {
                      //  console.info("[页面变化] 检测到确认订单页面已消失，退出循环");
                        break;
                    }
                    sleep(100);
                     if(confirmInfoClicked && !doubleConfirmClicked) {
                        if(purchase_type === '到店取') {
                            var homeBtn = className('android.widget.TextView').text('就是这家').findOne(200);
                            if(homeBtn) {
                                if (!calibration_status.double_exactly) {
                                    var bounds = homeBtn.bounds();
                                    var coords = [bounds.left, bounds.top, bounds.right, bounds.bottom];
                                    cached_double_exactly_coords = coords;
                                    calibration_status.double_exactly = true;
                                    updatePrecomputedCoords();
                                    saveCoordinatesToStorage();
                                    console.info("[记录坐标] 就是这家按钮坐标已记录并保存到本地");
                                }
                                safeClickByText(className('android.widget.TextView'),'就是这家');
                                console.info("[点击] 就是这家2");
                                doubleConfirmClicked = true;
                                confirmInfoClicked = false;
                                sleep(ignore_ack_click_confirm_delay - 50);
                            } else {
                                //console.info('二次确认：未找到\'就是这家\'按钮');
                                if(doubleConfirmRetryCount < 2){
                                    doubleConfirmRetryCount++;
                                    //log("就是这家2:"+doubleConfirmRetryCount);
                                    continue;
                                } else {
                                    if(className('android.widget.TextView').text('我知道了').exists()==true){
                                        safeClickByText(className('android.widget.TextView'),'我知道了');
                                        }
                                    break;
                                }
                            }
                        } else if(purchase_type === '送到家') {
                            var confirmBtn = className('android.widget.TextView').text('确认无误').findOne(200);
                            if(confirmBtn) {
                                if (!calibration_status.double_confirm) {
                                    var bounds = confirmBtn.bounds();
                                    var coords = [bounds.left, bounds.top, bounds.right, bounds.bottom];
                                    cached_double_confirm_coords = coords;
                                    calibration_status.double_confirm = true;
                                    saveCoordinatesToStorage();
                                    updatePrecomputedCoords();
                                    console.info("[记录坐标] 确认无误按钮坐标已记录并保存到本地");
                                }
                                safeClickByText(className('android.widget.TextView'),'确认无误');
                                console.info("[点击] 确认无误2");
                                doubleConfirmClicked = true;
                                confirmInfoClicked = false;
                                sleep(ignore_ack_click_confirm_delay - 50);
                            } else {
                                //console.info('二次确认：未找到\'确认无误\'按钮');
                                if(doubleConfirmRetryCount < 2){
                                    doubleConfirmRetryCount++;

                                    continue;
                                } else {
                                    if(className('android.widget.TextView').text('我知道了').exists()==true){
                                        safeClickByText(className('android.widget.TextView'),'我知道了');
                                        }
                                    break;
                                }
                            }
                        }
                    }
                    // 检查页面是否真的发生了变化
                    var currentConfirmOrder = className('android.widget.TextView').text('确认订单').findOne(200);
                    if (!currentConfirmOrder) {
                     //   console.info("[页面变化] 检测到确认订单页面已消失，退出循环");
                        break;
                    }
                    sleep(200);
                }
                sleep(50);
            }
            if (!className('android.widget.TextView').text('确认订单').exists()) {
                // 检查是否找不到webview_parent_node（通常表示进入了支付页面）
                var webview_parent_node = get_webview_parent_node();
                if (!webview_parent_node) {
                    // 新增：检测微信支付相关元素
                    if (detectWeChatPayment()) {
                        submit_flag = true;
                        console.info("[支付线程] 检测到支付标志 - 进入支付状态");
                    }
                }
            }
    }

    // 检查是否进入微信支付页面 - 支付线程完成后触发
    if (submit_flag) {
        setVitaData(); //上传数据
        console.error("[页面检测] 当前处于支付页面");
        console.warn("[通知] 中单!中单！ 请及时支付以免错过!");
        if (vibrate_time > 0) {
            device.vibrate(vibrate_time);
        }

        // 判断是否需要输入密码
        if (password_or_vibrate === "震动(不设置密码)") {
            console.info("[密码设置] 选择了震动模式，不自动输入密码");
        } else {
            console.info("[密码输入] 开始等待微信支付密码键盘...");
            waitAndInputPassword(password_setting.toString());
        }
        submit_flag = false;
        if (script_pause_when_success_conf) {
            script_status = 0;
            // 使用ui.post确保UI操作在UI线程中执行
            ui.post(() => {
                stop();
            });
        }
    }

var shouldBreak = false; // 标志变量控制是否跳出主循环

while (true) {

    // 定时器检查 - 如果设置了自动结束时间且已超时，则退出脚本
    if (script_auto_exit_time > 0 && script_start_time > 0) {
        var current_time = new Date().getTime();
        var elapsed_minutes = (current_time - script_start_time) / (1000 * 60);
        var remaining_minutes = script_auto_exit_time - elapsed_minutes;

        // 每5分钟显示一次剩余时间，避免重复显示
        var current_minute = Math.floor(elapsed_minutes);
        if (current_minute % 5 === 0 && current_minute > 0 && current_minute <= script_auto_exit_time && current_minute !== last_timer_display_minute) {
            //console.info("[定时器] 脚本已运行 " + current_minute + " 分钟，剩余 " + Math.floor(remaining_minutes) + " 分钟");
            last_timer_display_minute = current_minute;
        }

        if (elapsed_minutes >= script_auto_exit_time) {
           // console.warn("[定时器] 脚本运行时间已达到 " + script_auto_exit_time + " 分钟，自动退出");
            // 使用ui.post确保UI操作在UI线程中执行
            ui.post(() => {
                stop();
            });
            // 等待UI更新完成后退出
            sleep(1000);
            exit();
        }
    }

    if (script_status == 0) {
        // Reset ALL state variables to ensure clean restart
        rebuy_flag = false;
        submit_flag = false;
        ignore_next_purchase_page_flag = false;
        dc_streak = 0;
        last_double_confirm_time = 0;
        last_confirm_time = 0;
        confirm_btn_retry_count = 0;
        payment_page_confirm_btn_retry_count = 0;
        tried_clicked_confirm_to_pay_page_count = 0;
        confirmInfoClicked = false; // 重置确认信息并支付按钮点击状态
        doubleConfirmClicked = false; // 重置确认无误/就是这家按钮点击状态
        submited_refresh_flag = false;
        submited_refresh_count = 0;
        purchasee_pagee_count = 0;
        confirmBtnEnterCount = 0;
        confirm_positioning_value = null;
        textViewInfoAdded = false; // 重置TextView信息添加标记
        shouldBreak = false; // 重置跳出标志

        // 使用更长的延迟，减少CPU占用
        sleep(100);
        continue;
    }

    sleep(100); // 使用快速模式主循环延迟
    // console.time("get_webview_parent_node");
    var webview_parent_node = get_webview_parent_node();
    if (!webview_parent_node) {
        if (debug_mode_conf) {
         log("Cannot find webview parent node.");
        }
        // 支付页面检测和密码输入逻辑 - 不受支付线程影响
        var had_submit_flag = false;
        if (submit_flag) {
            setVitaData(); //数据
            had_submit_flag = true;
            submit_flag = false;
            console.error("[页面检测] 当前处于支付页面");
            console.warn("[通知] 中单!中单！ 请及时支付以免错过!");
            if (vibrate_time > 0) {
                device.vibrate(vibrate_time);
            }
            // 判断是否需要输入密码
            if (password_or_vibrate === "震动(不设置密码)") {
                console.info("[密码设置] 选择了震动模式，不自动输入密码");
            } else {
                console.info("[密码输入] 开始等待微信支付密码键盘...");
                waitAndInputPassword(password_setting.toString());
            }
        }
        // 当检测不到webview时，不要停止脚本，继续尝试检测
        // 只有在成功处理了支付页面后才考虑停止
        if (had_submit_flag && script_pause_when_success_conf) {
           script_status = 0;
           // 使用ui.post确保UI操作在UI线程中执行
           ui.post(() => {
               stop();
           });
        } else {
           continue;
        }
    }
    // console.timeEnd("get_webview_parent_node");
    // console.time("get_current_node");
    var current_node = get_current_node(webview_parent_node);
    if (!current_node) {
        has_been_started = false;
         if (debug_mode_conf) {
            log("Cannot find current node.");
         }
        continue;
    }

        // 检查模式选择，使用独立的逻辑
        if(pattern_choice === '抢购模式'){
            handFlashSaleMode();
            continue;
        }
        else if (pattern_choice === '兑换模式') {
            // 兑换模式独立逻辑
            has_been_started = true;
            handleExchangeMode();
            continue;
        }
        else if (pattern_choice === '盒机模式') {
            // 盒机模式独立逻辑
            has_been_started = true;
            handprizeBoxMode();
            continue;
        }
}
// 处理点击积分商品
function handleClickPoints(webview, node) {
    // 首先查找"立即兑换"按钮
    var exchangeBtn = className('android.widget.TextView').text('立即兑换').findOne(10);
    if (exchangeBtn) {
        console.info("[积分兑换] 找到立即兑换按钮，直接点击");
        exchangeBtn.click();
        sleep(150);
        handlePointsExchangeButtons();
        return;
    }

    // 如果找不到"立即兑换"按钮，执行原有的积分商品查找逻辑
    var pointsText = exchange_points.toString();
    var pointsElement = webview.findOne(className("android.widget.TextView").text(pointsText).algorithm('DFS'));
    if (pointsElement) {
        pointsElement.click();
        console.info("[积分兑换] 点击商品，积分: " + pointsText);
      //  sleep(special_confirm_delay+200);
        // 点击积分商品后，直接处理页面上的按钮
        handlePointsExchangeButtons();
    } else {
        console.warn("[积分兑换] 未找到对应 "+ pointsText + "积分商品");
        // 在积分兑换模式下，直接使用传入的webview重新查找，避免结构不匹配问题
        try {
            // 重新查找积分商品
            var retryPointsElement = webview.findOne(className("android.widget.TextView").text(pointsText).algorithm('DFS'));
            if (retryPointsElement) {
                retryPointsElement.click();
                console.info("[积分兑换] 重新查找后找到积分商品，点击成功: " + pointsText);
                handlePointsExchangeButtons();
            } else {
                console.error("[积分兑换] 重新查找后仍未找到积分商品(" + pointsText + ")");
            }
        } catch (e) {
            console.error("[积分兑换] 重新查找积分商品时发生错误: " + e.message);
        }
    }
}

// 处理积分兑换按钮的统一函数
function handlePointsExchangeButtons() {

    // 快速检查"立即兑换"按钮（减少等待时间）

    var confirm_btn =  className('android.widget.TextView').text('立即兑换').findOne(10);
            if (!confirm_btn) {
                // 检查是否有"立即购买"按钮
                var arrivalNoticeBtn = className('android.widget.TextView').text('到货通知').findOne(50);
                if (arrivalNoticeBtn) {
                    var bounds = arrivalNoticeBtn.bounds();
                    press(bounds.centerX(), bounds.centerY(), 50);
                    console.info("[积分兑换] 点击到货通知");
                    back();
                    return;
                }
                back();
                return;
            }else{
                var bounds = confirm_btn.bounds();
                press(bounds.centerX(), bounds.centerY(), 50);
                console.info("[积分兑换] 点击立即兑换");
                sleep(150);
                if(purchase_count > 1){
                    // 在积分兑换页面中查找数量控件并调整数量
                    var purchase_count_text = className('android.widget.TextView').text('数量').findOne(100);
                    if (purchase_count_text) {
                        var idx_num_text = purchase_count_text.indexInParent();
                        var parent_view = purchase_count_text.parent();
                        if (parent_view) {
                            sleep(100);
                            var minus_btn = parent_view.child(idx_num_text + 1);
                            var number_count_text = parent_view.child(idx_num_text + 2);
                            var plus_btn = parent_view.child(idx_num_text + 3);

                            if (minus_btn && number_count_text && plus_btn) {
                                var current = parseInt(number_count_text.text());
                                if (!isNaN(current) && current !== purchase_count) {
                                    if (current > purchase_count) {
                                        var diff = current - purchase_count;
                                        for (var i = 0; i < diff; i++) {
                                            minus_btn.click();
                                            sleep(10);
                                        }
                                    } else {
                                        var diff = purchase_count - current;
                                        for (var i = 0; i < diff; i++) {
                                            plus_btn.click();
                                            sleep(10);
                                        }
                                    }
                                    log("已满足购买数量要求: ", purchase_count);
                                }
                            }
                        }
                    }
                }
                var confirmBtn = className('android.widget.Button').text('确定').findOne(500);
                if (confirmBtn) {
                    confirmBtn.click();
                    console.info("[积分兑换] 点击确定按钮");
                    sleep(250);
                    return;
                }
            }

}

// 处理确认订单页面
function handleConfirmOrder() {
    if (calibration_status.confirm_info) {
        clickByCoordinates('confirm_info');
          console.error("[点击] 确认信息并支付1");
        sleep(ignore_ack_click_delay);
    }
    // 根据购买类型选择不同的确认按钮
    if (calibration_status.double_confirm) {
        clickByCoordinates('double_confirm');
        console.info("[点击] 确认无误1");
    }
    //sleep(ignore_ack_click_confirm_delay + 100);

    // 添加点击状态跟踪，确保顺序点击

    // 标记是否进入了while循环
    // 添加重试计数器
    var confirmInfoRetryCount = 0;
    var doubleConfirmRetryCount = 0;
    sleep(ignore_ack_click_confirm_delay -50);
    while (className('android.widget.TextView').text('确认订单').exists() == true) {
        if (script_status == 0) {
            rebuy_flag = false;
            submit_flag = false;
            dc_streak = 0;
            confirmButtonExecuted = false; // 重置确认按钮执行标志
            purchasee_pagee_count = 0;
            confirmBtnEnterCount = 0;
            confirmInfoClicked = false; // 重置确认信息并支付按钮点击状态
            doubleConfirmClicked = false; // 重置确认无误/就是这家按钮点击状态
            break;
        }
        var confirmInfoBtn = className('android.widget.TextView').text('确认信息并支付').findOne(200);
        if(confirmInfoBtn && !confirmInfoClicked){
            safeClickByText(className('android.widget.TextView'),'确认信息并支付');
            console.error("[点击] 确认信息并支付2");
            confirmInfoClicked = true;
            doubleConfirmClicked = false;
            sleep(ignore_ack_click_delay-100);
        } else {
            if(confirmInfoRetryCount < 2){
                confirmInfoRetryCount++;
           //   log("确认信息并支付:"+confirmInfoRetryCount);
                sleep(100);
                continue;
            } else {
                if(className('android.widget.TextView').text('我知道了').exists()==true){
                    safeClickByText(className('android.widget.TextView'),'我知道了');
                    }else{
                        back();
                    }
                break;
            }
        }
        var currentConfirmOrder = className('android.widget.TextView').text('确认订单').findOne(100);
        if (!currentConfirmOrder) {
          //  console.info("[页面变化] 检测到确认订单页面已消失，退出循环");
            break;
        }
        sleep(100);
         if(confirmInfoClicked && !doubleConfirmClicked) {

                var confirmBtn = className('android.widget.TextView').text('确认无误').findOne(200);
                if(confirmBtn) {
                    //console.info('二次确认：点击\'确认无误\'按钮');
                    safeClickByText(className('android.widget.TextView'),'确认无误');
                    console.info("[点击] 确认无误2");
                    doubleConfirmClicked = true;
                    confirmInfoClicked = false;
                    sleep(ignore_ack_click_confirm_delay-50);
                } else {
                    //console.info('二次确认：未找到\'确认无误\'按钮');
                    if(doubleConfirmRetryCount < 2){
                        doubleConfirmRetryCount++;

                        continue;
                    } else {
                        if(className('android.widget.TextView').text('我知道了').exists()==true){
                            safeClickByText(className('android.widget.TextView'),'我知道了');
                            }
                        break;
                    }
                }
            }
        // 检查页面是否真的发生了变化

        var currentConfirmOrder = className('android.widget.TextView').text('确认订单').findOne(200);
        if (!currentConfirmOrder) {
         //   console.info("[页面变化] 检测到确认订单页面已消失，退出循环");
            break;
        }
        sleep(200);
    }
    if (className('android.widget.TextView').text('支付成功').exists()) {
        setVitaData(); //上传数据
    }
    sleep(50);
    }

// 处理积分不足情况
function handleInsufficientPoints(webview) {
    console.error("[积分兑换] 检测到积分不足，停止脚本");

    // 停止脚本
    script_status = 0;
    confirmBtnEnterCount = 0; // 重置回流计数器
    ui.post(() => {
        w.end.attr('visibility', 'gone');
        w.start.attr('visibility', 'visible');
    });

    // 显示提示
    toast("积分不足，脚本已停止");
    console.warn("[积分兑换] 脚本已停止，请检查积分余额");
}

// 抢购模式
function handFlashSaleMode() {
       // console.timeEnd("get_current_node");
    // console.time("get_header_text");
    var webview_parent_node = get_webview_parent_node();
    if (!webview_parent_node) {
        if (debug_mode_conf) {
         log("Cannot find webview parent node.");
        }
        return;
    }
    // console.time("get_current_node");
    var current_node = get_current_node(webview_parent_node);
    if (!current_node) {
        if (debug_mode_conf) {
            log("Cannot find current node.");
        }
        return;
    }
    // console.timeEnd("get_current_node");

    // console.time("get_header_text");
    var header_text = get_header_text(current_node);
    // console.timeEnd("get_header_text");

    // console.time("get_current_webview");
    var current_webview = get_current_webview_fast(current_node);
    if (!current_webview) {
        if (!groupMessageListenerStarted && script_start_immediately_conf) {
            checkIfInWeChatGroup();
        }
        has_been_started = false;
        // if (currentPackage() == "com.tencent.mm" && !isProcessingNotification) {
        //     groupMessageListenerStarted = false;
        // }
        if (debug_mode_conf) {
            log("Cannot find current webview.");
        }
        return;
    }
    // console.timeEnd("get_current_webview");

    // console.time("check_current_page_tree");
    var page_info = check_current_page_tree(header_text, current_webview);
    // console.timeEnd("check_current_page_tree");
    if (debug_mode_conf) {
        log("Header: " + page_info.header + ", Status: " + page_info.status);
    }
    has_been_started = true;
    isProcessingNotification = false;
    switch (page_info.status) {
        case "confirm_and_pay":
          //  log("confirm_and_pay");
        tried_clicked_confirm_to_pay_page_count = 0;
        var ignore_next_purchase_page_flag = false;
        rebuy_flag = true;
        has_entered_confirm_and_pay = true; // 标记已进入confirm_and_pay状态
        if (!current_webview) {
            if (debug_mode_conf) {
                log("Cannot find current webview.");
            }
            sleep(10);
            break;
        }

        // 获取指定TextView的文本信息并存储到全局变量
        getSpecificTextViews(current_node);
        //setVitaData(); //上传数据
        startPaymentProcess();
        break;

        case "info_page":
           // log("info_page");
        submit_flag = false;
        ignore_next_purchase_page_flag = false;
        // 只有在非页面刷模式下才重置页面计数，页面刷模式需要保持purchasee_pagee_count=1
        if (refresh_mode != "页面刷") {
            purchasee_pagee_count = 0; // 重置页面计数，确保重新进入时能执行选择操作
        }

        // 查找第5个TextView并打印
        findAndPrintFifthTextView(current_node);
        if (!rebuy_flag) {
            sleep(100);
            var updated_webview = get_current_webview_fast(current_node);
            var confirm_btn = updated_webview.findOne(text("确定").algorithm('DFS'));
            if (!confirm_btn) {
                // 检查是否有"立即购买"按钮
                var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                if (buyNowBtn) {
                    buyNowBtn.click();
                    console.info("点击立即购买按钮");
                    sleep(400);
                }  else {
                    // 如果没有坐标记录，使用文本查找并记录坐标
                    var buyNowBtn = updated_webvieww.findOne(text("立即购买").algorithm('DFS'));
                    if (buyNowBtn) {
                        buyNowBtn.click();
                        console.info("点击立即购买按钮");
                        sleep(400);
                    } else {
                        // 如果没有立即购买按钮，检查是否有"距离开售时间还剩00:00"状态
                        var prepareSaleBtn = current_webview.findOne(text("距离开售时间还剩00:00").algorithm('DFS'));

                        if (prepareSaleBtn) {
                            refresh_attempt_count++;
                            console.warn("[状态] 商品尚未发售，执行刷新操作 (第" + refresh_attempt_count + "次)");

                            // 检查刷新次数限制
                            if (refresh_attempt_count >= max_refresh_attempts) {
                                console.warn("[通知] 已达到最大刷新次数(" + max_refresh_attempts + ")，停止刷新");
                                script_status = 0;
                                confirmBtnEnterCount = 0; // 重置回流计数器
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
                                    console.warn("[检测] 检测到'立即购买'按钮，商品已发售！");
                                    console.info("立即点击购买按钮");
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
                            var prepareSaleBtn = current_webview.findOne(text("距离开售时间还剩00:00").algorithm('DFS'));

                            if (prepareSaleBtn) {
                                console.info("[检测] 发现倒计时文字，商品尚未发售，等待500ms后再次检测");
                                sleep(500);

                                // 重新获取当前webview，检查是否有"立即购买"按钮
                                var updated_webview = get_current_webview_fast(current_node);
                                if (updated_webview) {
                                    var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                                    if (buyNowBtn) {
                                        console.warn("[检测] 等待期间检测到'立即购买'按钮，商品已发售！");
                                        console.info("立即点击购买按钮");
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
                            console.info("未识别到购买按钮，执行刷新操作");
                            performRefreshActions(current_webview);

                            // 刷新完成后立即检测是否有"立即购买"按钮
                            sleep(1000);
                            var updated_webview = get_current_webview_fast(current_node);
                            if (updated_webview) {
                                var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                                if (buyNowBtn) {
                                    console.warn("[检测] 检测到'立即购买'按钮，商品已发售！");
                                    console.info("立即点击购买按钮");
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
                var confirm_btn = className('android.widget.TextView').text('确定').findOne(20);
                if (!confirm_btn) {
                    rebuy_flag = false;
                }
                sleep(150);
            }
        }

        break;


        case "prepare_sale":
        submit_flag = false;
        ignore_next_purchase_page_flag = false;

        // 检查刷新次数限制
        if (refresh_attempt_count >= max_refresh_attempts) {
            console.warn("[通知] 已达到最大刷新次数(" + max_refresh_attempts + ")，停止刷新");
            script_status = 0;
            confirmBtnEnterCount = 0; // 重置回流计数器
            ui.post(() => {
                w.end.attr('visibility', 'gone');
                w.start.attr('visibility', 'visible');
            });
            break;
        }

        // 检查是否有"距离开售时间还剩00:00"文字
        var prepareSaleBtn = current_webview.findOne(text("距离开售时间还剩00:00").algorithm('DFS'));

        if (prepareSaleBtn) {
            refresh_attempt_count++;

            console.info("发现'距离开售时间还剩00:00'文字，先等待500ms检测是否有'立即购买'按钮 (第" + refresh_attempt_count + "次)");

            // 在刷新之前先等待500ms，检测是否有"立即购买"按钮出现
            console.info("[等待] 等待500ms检测是否有'立即购买'按钮出现...");
            sleep(500);

            // 重新获取当前webview，检查是否有"立即购买"按钮
            var updated_webview = get_current_webview_fast(current_node);
            if (updated_webview) {
                var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                if (buyNowBtn) {
                    console.warn("[成功] 🎉 等待期间检测到'立即购买'按钮，商品已发售！");
                    console.info("立即点击购买按钮，跳过刷新操作");
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
                        console.info("立即点击购买按钮");
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
            console.info("未找到发售状态按钮，可能页面已更新或商品已发售");

            // 立即检测是否有"立即购买"按钮
            var buyNowBtn = current_webview.findOne(text("立即购买").algorithm('DFS'));
            if (buyNowBtn) {
                console.warn("[成功] 🎉 检测到'立即购买'按钮，商品已发售！");
                console.info("立即点击购买按钮");
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
          //  log("purchase");
        if (ignore_next_purchase_page_flag) {
            ignore_next_purchase_page_flag = false;
            break;
        }
        // 重新获取最新的webview
        var updated_webview = get_current_webview_fast(current_node);
        if (!updated_webview) {
            console.warn("无法获取最新的页面元素");
            break;
        }
        submit_flag = false;
        rebuy_flag = false;
        dc_streak = 0;
        // 检查是否已经执行过确认按钮逻辑，如果是则跳过选择操作

        if (!rebuy_flag && !confirmButtonExecuted) {
            // 优化的并行识别和点击逻辑
            //console.info("[并行选择] 开始同时识别购买方式和规格...");
            if(purchasee_pagee_count == 0){
            // 并行查找购买方式和规格的相关元素
            var purchase_type_btn = null;
            var specs_btn = null;
            var purchase_found_method = "";
            var specs_found_method = "";

            // 快速扫描页面中的所有相关元素
            //console.info("[并行选择] 开始快速扫描页面元素...");
            var allElements = current_webview.find(className("android.view.View").algorithm('DFS'));
            var purchase_elements = [];
            var specs_elements = [];

            // 方法1: 直接使用选择器查找，而不是遍历View元素
//                console.info("=== 尝试直接选择器查找方法 ===");

            // 查找所有TextView元素
            var textViews = current_webview.find(className("android.widget.TextView").algorithm('DFS'));
//                console.info("找到TextView数量: " + textViews.length);

            for (var i = 0; i < allElements.length; i++) {
                var element = allElements[i];
                try {
                    var elementText = element.text();
                    if (elementText) {
                        // 检查购买方式元素
                        if (elementText.includes(purchase_type) || elementText.includes("送到家") || elementText.includes("到店取")) {
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
            var buttons = current_webview.find(className("android.widget.Button").algorithm('DFS'));
            //console.info("找到Button数量: " + buttons.length);

            for (var i = 0; i < buttons.length; i++) {
                try {
                    var btn = buttons[i];
                    var btnText = btn.text();
                    //console.info("Button[" + (i+1) + "] 文本: '" + (btnText || "") + "'");

                    if (btnText) {
                        // 检查购买方式
                        if (btnText.includes(purchase_type) || btnText.includes("送到家") || btnText.includes("到店取")) {
                            purchase_elements.push({
                                text: btnText,
                                element: btn,
                                clickable: btn.clickable()
                            });
                        }
                        // 检查规格
                        if (btnText.includes("单个") || btnText.includes("整盒") || btnText.includes("整端") || btnText.includes("盲盒")) {
                            specs_elements.push({
                                text: btnText,
                                element: btn,
                                clickable: btn.clickable()
                            });
                        }
                    }
                } catch (e) {
                    // 忽略错误
                }
            }



            var selectElements = []; // 存储"选择**"元素信息
            var buyMethodIndex = -1; // "购买方式"的索引
            var selectSpecIndex = -1; // "选择规格"的索引
            var selectOptionsToClick = []; // 存储需要点击的选择项

            // 1. 找到所有"选择**"元素和关键元素的位置
            for (var i = 0; i < textViews.length; i++) {
                try {
                    var tv = textViews[i];
                    var tvText = tv.text();

                    if (tvText) {
                        // 匹配"选择**"模式
                        if (tvText.startsWith("选择")) {
                            selectElements.push({
                                    index: i,
                                    text: tvText,
                                    element: tv
                            });
                            //    console.info("找到选择元素[" + i + "]: " + tvText);
                        }

                        // 找到"购买方式"
                        if (tvText === "购买方式") {
                            buyMethodIndex = i;
                            //    console.info("找到购买方式[" + i + "]: " + tvText);
                        }

                        // 找到"选择规格"
                        if (tvText === "选择规格") {
                            selectSpecIndex = i;
                            //   console.info("找到选择规格[" + i + "]: " + tvText);
                        }
                    }
                } catch (e) {
                    // 忽略错误
                }
            }

            // 2. 为每个"选择**"元素创建spec_select数组
            for (var i = 0; i < selectElements.length; i++) {
                var selectElement = selectElements[i];
                var selectIndex = selectElement.index;
                var currentSelectNumber = i + 1; // 当前是第几个"选择**"区域
//                    console.info("分析第" + currentSelectNumber + "个选择元素: " + selectElement.text + " (索引:" + selectIndex + ")");

                //找到在当前"选择**"下面且最靠近的"购买方式"或"选择规格"
                var nearestEndIndex = -1;
                var endElementText = "";

                // 检查"购买方式"是否在下面且更近
                if (buyMethodIndex > selectIndex) {
                    nearestEndIndex = buyMethodIndex;
                    endElementText = "购买方式";
                }

                // 检查"选择规格"是否在下面且更近
                if (selectSpecIndex > selectIndex) {
                    if (nearestEndIndex === -1 || selectSpecIndex < nearestEndIndex) {
                        nearestEndIndex = selectSpecIndex;
                        endElementText = "选择规格";
                    }
                }

                if (nearestEndIndex !== -1) {
//                       console.info("找到最近的结束元素: " + endElementText + " (索引:" + nearestEndIndex + ")");

                    // 创建spec_select数组，只包含中间的选项元素（排除开始和结束元素）
                    var spec_select = [];
                    for (var j = selectIndex + 1; j < nearestEndIndex; j++) {
                        try {
                            var element = textViews[j];
                            var elementText = element.text();
                            if (elementText && elementText.trim().length > 0) {
                                spec_select.push({
                                    index: j,
                                    text: elementText,
                                    element: element,
                                    arrayIndex: spec_select.length + 1 // 从1开始的数组索引
                                });
                            }
                        } catch (e) {
                            // 忽略错误
                        }
                    }

//                        console.info("=== 第" + currentSelectNumber + "个选择区域: " + selectElement.text + " 的选项元素 ===");
                    for (var k = 0; k < spec_select.length; k++) {
//                            console.info("  选项[" + spec_select[k].arrayIndex + "] " + spec_select[k].text + " (TextView索引:" + spec_select[k].index + ")");
                    }
//                        console.info("=== 共 " + spec_select.length + " 个选项 ===");

                    // 记录需要点击的选择项，不立即点击
                    if (select_index > 0 && select_index <= spec_select.length) {
                        var targetOption = spec_select[select_index - 1]; // 数组从0开始，但配置从1开始
                        selectOptionsToClick.push({
                                selectArea: selectElement.text,
                                selectAreaNumber: currentSelectNumber,
                                optionText: targetOption.text,
                                element: targetOption.element,
                                optionIndex: select_index
                        });
//                            console.info("📋 记录待点击: 第" + currentSelectNumber + "个选择区域(" + selectElement.text + ")中的第" + select_index + "个选项 - " + targetOption.text);
                    } else if (select_index > 0) {
//                            console.warn("配置的选项索引 " + select_index + " 超出范围，第" + currentSelectNumber + "个选择区域(" + selectElement.text + ")只有 " + spec_select.length + " 个选项");
                    }

                } else {
//                        console.info("未找到在第" + currentSelectNumber + "个选择区域(" + selectElement.text + ")下面的购买方式或选择规格");
                }
            }

            //console.info("[并行选择] 扫描完成 - 购买方式元素: " + purchase_elements.length + " 个, 规格元素: " + specs_elements.length + " 个");

            // 并行处理购买方式选择
            if (refresh_mode == "智能刷" || refresh_mode == "切换刷" || refresh_mode == "页面刷") {
                console.info("[并行选择] 处理购买方式: " + purchase_type);

                // 方法1: 从扫描结果中快速匹配
                for (var i = 0; i < purchase_elements.length; i++) {
                    var element = purchase_elements[i];
                    if (element.text.includes(purchase_type)) {
                        purchase_type_btn = element.element;
                        purchase_found_method = "扫描匹配";
                        //console.info("[并行选择] 购买方式扫描匹配成功: " + element.text);
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
            //console.info("[并行选择] 处理规格: " + specs);

            // 确定规格关键词
            var specs_keywords = [];
            if (specs === "单个") {
                specs_keywords = ["单个", "盲盒"];
            } else if (specs === "整端") {
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
                    //console.info("[并行选择] 规格扫描匹配成功: " + element.text);
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
            //console.info("[并行选择] 开始执行点击操作...");

            // 点击选择项
//                console.info("需要点击的选择项数量: " + selectOptionsToClick.length);
            for (var i = 0; i < selectOptionsToClick.length; i++) {
                var selectOption = selectOptionsToClick[i];
                //console.info("[并行选择] 点击选择项: 第" + selectOption.selectAreaNumber + "个选择区域(" + selectOption.selectArea + ")中的第" + selectOption.optionIndex + "个选项 - " + selectOption.optionText);
                try {
                    selectOption.element.click();
//                        console.info("[并行选择] 选择项点击成功: " + selectOption.optionText);
                } catch (e) {
                    console.error("[并行选择] 选择项点击失败: " + selectOption.optionText + ", 错误: " + e.message);
                    try {
                        var bounds = selectOption.element.bounds();
                        click(bounds.centerX(), bounds.centerY());
                        console.info("[并行选择] 选择项坐标点击成功: " + selectOption.optionText);
                    } catch (e2) {
//                            console.error("[并行选择] 选择项坐标点击也失败: " + selectOption.optionText + ", 错误: " + e2.message);
                    }
                }
            }
            // 点击购买方式
            if (purchase_type_btn) {
                //console.info("[并行选择] 点击购买方式，匹配方式: " + purchase_found_method);
                try {
                    purchase_type_btn.click();
                    //console.info("[并行选择] 购买方式点击成功");
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
            } else if (purchase_type != "切换刷") {
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
            sleep(200);
            if(purchase_type == "到店取"){
                // 检查通知文本或小程序文案是否包含【】字符，如果包含则跳过门店选择
                var shouldSkipStoreSelection = false;
                var skipReason = "";
                if (globalNotificationText && globalNotificationText.includes('【') && globalNotificationText.includes('】')) {
                    shouldSkipStoreSelection = true;
                    skipReason = "通知文本包含【】字符";
                } else if (skipStoreSelection) {
                    shouldSkipStoreSelection = true;
                    skipReason = "小程序文案包含【】字符";
                }

                if (shouldSkipStoreSelection) {
                    console.info("[操作] 检测到" + skipReason + "，跳过门店选择");
                    skipStoreSelection = false;
                } else {
                    var store_btn = className('android.widget.TextView').text('选择门店').findOne(20);
            if (store_btn) {
                store_btn.click();
                console.info("[操作] 点击选择门店");
                var monitoringShopRaw = (monitoring_shop_name || "").toString().trim();
                if (monitorShopNameMax != null) {
                    monitoringShopRaw = monitorShopNameMax.trim();
                }
                if (!monitoringShopRaw) {
                    console.warn("[操作] 无法选择门店，脚本暂停");
                    back();
                    script_status = 0;
                    ui.post(() => {
                        stop();
                    });
                    toast("未选定对应门店。");
                }
                break; // 跳出当前代码块
            }else{
                // 在purchase_type_btn下方查找第一个深度为25的TextView
                if (purchase_type_btn) {
                    try {
                        var purchaseTypeBounds = purchase_type_btn.bounds();
                        var targetTextView = current_webview.find(className("android.widget.TextView").depth(25).algorithm('DFS'));

                        if (targetTextView) {
                            // 查找在purchase_type_btn下方的第一个TextView
                            var monitoringShopRaw = (monitoring_shop_name || "").toString().trim();
                            if (monitorShopNameMax != null) {
                                monitoringShopRaw = monitorShopNameMax;
                            }
                                if (!monitoringShopRaw) {
                                    console.info("[操作] 未设置门店名，跳过门店选择");
                                    shouldBreak = false;
                                } else {
                                        var shopNames = monitoringShopRaw.split('/').map(name => name.trim());
                                            for (var k = 0; k < targetTextView.length; k++) {
                                                try {
                                                    var tv = targetTextView[k];
                                                    var tvBounds = tv.bounds();

                                                    // 检查TextView是否在purchase_type_btn下方
                                                    if (tvBounds.top > purchaseTypeBounds.bottom) {
                                                        var tvText = tv.text();
                                                        var isTargetShop = false;
                                                        for (var m = 0; m < shopNames.length; m++) {
                                                            if (tvText.includes(shopNames[m])) {
                                                                isTargetShop = true;
                                                                break;
                                                            }
                                                        }
                                                        if (!isTargetShop) {
                                                                tv.click();
                                                                console.info("[操作] 门店与设定门店不相符，点击重新选择门店");
                                                                sleep(400);
                                                                shouldBreak = true; // 设置跳出标志
                                                                break; // 立即跳出for循环
                                                        } else {
                                                            console.info("[操作] 已是设定门店之一，跳过门店选择");
                                                            break; // 跳出for循环
                                                        }
                                                    }
                                                } catch (e) {
                                                    console.error("[操作] 处理出错: " + e.message);
                                                }
                                            }
                                        }
                        } else {
                            console.warn("[错误] 未找到门店信息");
                        }
                    } catch (e) {
                        console.error("[错误] 获取位置失败: " + e.message);
                    }
                } else {
                    console.warn("[错误] 无法选择门店地址");
                }
                if (shouldBreak) {
                    break;
                }
            }
                } // 闭合else语句，对应跳过门店选择的else分支
        }
            // 立即开始库存刷新，零延迟启动
            selectionEndTime = new Date().getTime();
            console.info("[并行选择] 选择操作完成，立即开始库存刷新");
            sleep(200);
            // 同步处理通知按钮点击，避免与库存刷新循环冲突
            if (auto_click_notification) {
                clickNotifyBtn(); // 改为同步执行，避免线程冲突

            }
        }
        var refreshTimeStart = new Date();
        var current_selection = null;
        var random_delay = Math.floor(Math.random() * (random_refresh_delay_upper - random_refresh_delay_lower + 1)) + random_refresh_delay_lower;
        if (enable_random_delay_conf) {
            random_delay = 0;
        }
        var sleepTarget = refresh_delay + random_delay;

            // 立即开始查找确定按钮，零延迟
            var confirm_btn = className('android.widget.TextView').text('确定').findOne(20);

            while (!confirm_btn && !rebuy_flag) {
                // max duration logic
                if (max_refresh_time > 0) {
                    var currentTime = new Date();
                    if ((currentTime - refreshTimeStart) > 1000 * 60 * max_refresh_time) {
                        if (timeout_sleep_wait_time == 0) {
                            script_status = 0;
                            confirmBtnEnterCount = 0; // 重置回流计数器
                            ui.post(() => {
                                w.end.attr('visibility', 'gone');
                                w.start.attr('visibility', 'visible');
                            });
                            var seconds = parseFloat((max_refresh_time * 60).toFixed(2));
                            console.warn("[通知] 超过设定的库存最大连续刷新时长[", max_refresh_time, "]分钟", "，脚本已停止");
                        } else {
                            console.warn("[通知] 超过设定的库存最大连续刷新时长[", max_refresh_time, "]分钟", "，已设定睡眠时间:"+timeout_sleep_wait_time+"秒，脚本已暂停");
                            sleep(timeout_sleep_wait_time * 1000);
                            console.warn("[通知] 脚本暂停时间已过，脚本恢复");
                            refreshTimeStart = new Date();
                        }
                    }
                }
                // script stop logic
                if (script_status == 0) {
                    rebuy_flag = false;
                    submit_flag = false;
                    dc_streak = 0;
                    confirmButtonExecuted = false; // 重置确认按钮执行标志
                    purchasee_pagee_count = 0;
                    confirmBtnEnterCount = 0;
                    confirmInfoClicked = false; // 重置确认信息并支付按钮点击状态
                    doubleConfirmClicked = false; // 重置确认无误/就是这家按钮点击状态
                    break;
                }
                var check_start_time = new Date().getTime();
                var purchase_btn = updated_webview.findOne(text("立即购买").algorithm('DFS'));

                // refresh logic
                if (purchase_btn) {
                    confirm_btn = className('android.widget.TextView').text('确定').findOne(20);
                    if (confirm_btn) {
                        break;
                    }
                    // safe stock check logic
                    if (refresh_mode == "切换刷") {
                        var sold_out = updated_webview.findOne(text("已售罄").algorithm('DFS'));
                        var refresh_retry = 0;
                        var timeout_flag = false;
                        console.error("正在判断库存情况...");
                        while (!sold_out) {
                            refresh_retry++;
                            if (refresh_retry > 30) {
                                timeout_flag = true;
                                break;
                            }
                            sold_out = updated_webview.findOne(text("已售罄").algorithm('DFS'));
                            if (sold_out) {
                                break;
                            }
                            sleep(fast_mode_check_interval); // 使用快速模式检查间隔
                            confirm_btn = className('android.widget.TextView').text('确定').findOne(20);
                            if (confirm_btn) {
                                break;
                            }
                            if (script_status == 0) {
                                rebuy_flag = false;
                                submit_flag = false;
                                dc_streak = 0;
                                confirmBtnEnterCount = 0;
                                confirmButtonExecuted = false; // 重置确认按钮执行标志
                                purchasee_pagee_count = 0;
                                confirmInfoClicked = false; // 重置确认信息并支付按钮点击状态
                                doubleConfirmClicked = false; // 重置确认无误/就是这家按钮点击状态
                                break;
                            }
                        }
                        if (sold_out) {
                            console.warn("已售罄");
                        } else if (confirm_btn) {
                            console.warn("有库存");
                        }
                    }
                        if (refresh_mode == "智能刷") {
                            if (!rebuy_flag) {
                                purchase_btn.click();
                            }
                        } else if(refresh_mode == "切换刷"){
                            if (purchase_type == '到店取') {
                                current_selection = '送到家';
                                var target_btn = updated_webview.findOne(text(current_selection).algorithm('DFS'));
                                if (target_btn) {
                                    target_btn.click();
                                    log("[点击]" + current_selection);
                                    sleep(300);
                                    current_selection = '到店取';
                                    target_btn = updated_webview.findOne(text(current_selection).algorithm('DFS'));
                                    if (target_btn) {
                                        target_btn.click();
                                        log("[点击]" + current_selection);
                                        console.info("[注意] 库存刷新耗时: ", sleepTarget, "ms");
                                        sleep(sleepTarget);
                                    }
                                }
                            } else {
                                current_selection = '到店取';
                                var target_btn = updated_webview.findOne(text(current_selection).algorithm('DFS'));
                                if (target_btn) {
                                    target_btn.click();
                                    log("[点击]" + current_selection);
                                    sleep(300);
                                    current_selection = '送到家';
                                    target_btn = updated_webview.findOne(text(current_selection).algorithm('DFS'));
                                    if (target_btn) {
                                        target_btn.click();
                                        log("[点击]" + current_selection);
                                        console.info("[注意] 库存刷新耗时: ", sleepTarget, "ms");
                                        sleep(sleepTarget);
                                    }
                                }
                            }
                        }else if(refresh_mode == "页面刷"){
                            rebuy_flag = true;
                                //pageCloseRefresh();
                                purchasee_pagee_count = 1;
                                while (true) {
                                    // 检查脚本状态
                                    if (script_status == 0) {
                                        //console.info("[页面刷] 脚本已停止，退出刷新循环");
                                        break;
                                    }
                                    // 执行页面刷新
                                    var refreshResult = pageCloseRefresh();
                                    // 如果pageCloseRefresh返回true，说明找到了确定按钮，跳出循环
                                    if (refreshResult === true) {
                                        break;
                                    }
                                }
                    }

                }
                confirm_btn = updated_webview.findOne(text("确定").algorithm('DFS'));
                if (confirm_btn) {
                    break;
                }
                if(refresh_mode == "智能刷"){
                    console.info("[注意] 库存刷新耗时: ", sleepTarget + 50, "ms");
                    sleep(sleepTarget);

                }


                // 在等待前先快速检查一次确定按钮
                confirm_btn = updated_webview.findOne(text("确定").algorithm('DFS'));
                if (confirm_btn) {
                    break;
                }

                var purchase_count_label = updated_webview.findOne(text("数量").algorithm('DFS'));
                if (!purchase_count_label) {
                    break;
                }

                confirm_btn = find_confirm_btn(current_webview);
                if (confirm_btn) {
                    break;
                }
                if (sku_result_toast_conf) {
                    click_plus_btn(updated_webview);
                }

            }
            if (script_status == 0) {
                rebuy_flag = false;
                submit_flag = false;
                dc_streak = 0;
                confirmButtonExecuted = false; // 重置确认按钮执行标志
                purchasee_pagee_count = 0;
                confirmBtnEnterCount = 0;
                confirmInfoClicked = false; // 重置确认信息并支付按钮点击状态
                doubleConfirmClicked = false; // 重置确认无误/就是这家按钮点击状态
                break;
            }
            if(purchase_count > 1){
                var purchase_count_text = updated_webview.findOne(text("数量").algorithm('DFS'));
                if (purchase_count_text) {
                    satisfyPurchaseCount(updated_webview, purchase_count);
                    log("已满足购买数量要求: ", purchase_count);
                }
            }
        }
        //var updated_webview = get_current_webview_fast(current_node);
        // 记录确认按钮查找开始时间
        var confirmButtonSearchStartTime = new Date().getTime();
        confirm_btn = find_confirm_btn(current_webview);
        if (confirm_btn) {
                confirmBtnEnterCount++;
                if (confirmBtnEnterCount === 2 && purchase_reduced_conf) {
                    if(purchase_count > 1){
                        var purchase_count_text = updated_webview.findOne(text("数量").algorithm('DFS'));
                        if (purchase_count_text) {
                            satisfyPurchaseCount(updated_webview, 1);
                            console.info("[回流功能] 已将数量调整到1");
                        }
                    }
                }
                if (confirmButtonSearchStartTime - paymentThreadStartTime >= 2000){
                    if (!rebuy_flag) {
                        var now = new Date().getTime();
                        var elapsed = now - last_confirm_time;
                        if (elapsed >= 450) {
                            if (tried_clicked_confirm_to_pay_page_count >= 2) {
                                clickButton(confirm_btn);
                                console.info("[操作] 点击确定按钮1");
                                tried_clicked_confirm_to_pay_page_count = 0;
                            } else {
                                var now = new Date().getTime();
                                var elapsed = now - last_confirm_time;
                                if (elapsed >= 450) {
                                    last_confirm_time = now;
                                    confirm_btn.click();
                                    console.info("[操作] 点击确定按钮");
                                }
                                tried_clicked_confirm_to_pay_page_count++;
                            }
                            last_confirm_time = now;
                            rebuy_flag = true;
                            ignore_next_purchase_page_flag = true;
                            confirmButtonExecuted = true;
                            sleep(special_confirm_delay - 100);

                            // 记录支付线程启动时间
                            if(anti_rebound_mode){
                                paymentThreadStartTime = new Date().getTime();
                            }
                            break;
                        }
                    }
                } else {
                    console.warn("[等待] 防止反复被打回，延迟确定按键点击时间");
                    sleep(800);
                    if (tried_clicked_confirm_to_pay_page_count >= 2) {
                        console.info("[操作] 点击确定按钮");
                        clickButton(confirm_btn);
                        tried_clicked_confirm_to_pay_page_count = 0;
                        if (debug_mode_conf) {
                            console.error("clicked confirm_btn (physical click)");
                        }
                    } else {
                        var now = new Date().getTime();
                        var elapsed = now - last_confirm_time;
                        if (elapsed >= 450) {
                            last_confirm_time = now;
                            console.info("[操作] 点击确定按钮2");
                            confirm_btn.click();
                        }
                        tried_clicked_confirm_to_pay_page_count++;
                    }
                    sleep(special_confirm_delay - 100);

                    // 记录支付线程启动时间
                    paymentThreadStartTime = new Date().getTime();
                    rebuy_flag = true;
                    ignore_next_purchase_page_flag = true;

                }
                            // 确认按钮逻辑执行完毕，设置标志防止重复执行选择操作
            confirmButtonExecuted = true;
            //console.info("[状态设置] 确认按钮逻辑执行完毕，设置标志防止重复执行选择操作");
            sleep(50 + extra_delay);
        } else {
                confirm_btn_retry_count++;
                if (confirm_btn_retry_count >= 10) {
                    confirm_btn_retry_count = 0;
                    rebuy_flag = false;
                    submit_flag = false;
                    dc_streak = 0;
                    ignore_next_purchase_page_flag = false;
                    sleep(20);
                    break;
                }
            }
        break;
        case "purchase_ready":
            sleep(200);
            var updated_webview = get_current_webview_fast(current_node);
            confirm_btn = updated_webview.findOne(text("确定").algorithm('DFS'));
            if (!confirm_positioning_value) {
                confirm_btn.click();
                confirm_positioning_value = [confirm_btn.bounds().centerX(),confirm_btn.bounds().centerY()];
                console.info("[操作] 点击确定按钮");
            } else {
                press(confirm_positioning_value[0],confirm_positioning_value[1],50);
                console.info("[操作] 点击确定按钮1");
            }
            sleep(special_confirm_delay + 50);

        break;
        case "back":
            // 只有在进入过confirm_and_pay状态后才执行back操作，防止误操作
            if (has_entered_confirm_and_pay) {
                back();
                break;
            }

                // 查找id为city-box的android.view.View并点击
                var imagesDepth21 = current_webview.find(className("android.widget.TextView").depth(21).algorithm('DFS'));
                    if (imagesDepth21 && imagesDepth21.length > 0) {
                        try {

                        var img = imagesDepth21[0];
                        var ib = img.click();
                        sleep(400);




                        // 依据监控门店名称解析店名与城市前缀（为空则暂停并提示）
                        var monitoringShopRaw = (monitoring_shop_name || "").toString().trim();
                        var shopNames = monitoringShopRaw.length > 0 ? monitoringShopRaw.split('/').map(name => name.trim()) : [];
                        if (monitorShopNameMax != null) {
                            shopNames = [monitorShopNameMax.toString().trim()];
                        }

                        // 现在shopNames始终是数组，统一处理逻辑


                        // 从shopNames数组中随机选择一个门店名进行点击
                        if (shopNames.length > 0) {
                            var randomIndex = Math.floor(Math.random() * shopNames.length);
                            var selectedShopName = shopNames[randomIndex];
                            var cityPrefix = "";
                            try {
                                var idxShi = selectedShopName.indexOf("市");
                                if (idxShi > 0) {
                                    cityPrefix = selectedShopName.substring(0, idxShi);
                                } else {
                                    cityPrefix = selectedShopName.slice(0, 2);
                                }
                            } catch (e) {
                                cityPrefix = selectedShopName.slice(0, 2);
                            }
                            var selectedShopNamecount = 0; // 门店选择重试计数器
                            var webview_parent_node = get_webview_parent_node();
                            var curent_node = get_current_node(webview_parent_node);
                            var update_view = get_current_webview_fast(curent_node);

                            // 第一步：先找到"搜索"textview
                            var textViews = update_view.find(className("android.widget.TextView").algorithm('DFS'));
                            var foundSearchText = false;

                            for (var i = 0; i < textViews.length; i++) {
                                try {
                                    var textView = textViews[i];
                                    var textContent = textView.text();

                                    // 检查是否找到"搜索"textview
                                    if (textContent && textContent.includes("搜索")) {
                                        foundSearchText = true;
                                        console.info("[验证] 已进入城市列表页面，找到搜索");
                                        break;
                                    }
                                } catch (e) {
                                    // 忽略单个TextView的错误
                                }
                            }

                            if (!foundSearchText) {
                                console.warn("[验证] 未找到搜索框，尝试点击img进入城市列表页面");
                                try {
                                    var img = imagesDepth21[0];
                                    img.click();
                                    console.info("[操作] 点击img进入城市列表页面");
                                    sleep(400);

                                    // 重新获取页面视图
                                    webview_parent_node = get_webview_parent_node();
                                    curent_node = get_current_node(webview_parent_node);
                                    update_view = get_current_webview_fast(curent_node);

                                    // 重新查找"搜索"textview
                                    var retryTextViews = update_view.find(className("android.widget.TextView").algorithm('DFS'));
                                    var retryFoundSearchText = false;

                                    for (var retry = 0; retry < retryTextViews.length; retry++) {
                                        try {
                                            var retryTextView = retryTextViews[retry];
                                            var retryTextContent = retryTextView.text();

                                            if (retryTextContent && retryTextContent.includes("搜索")) {
                                                retryFoundSearchText = true;
                                                console.info("[验证] 重新找到搜索框");
                                                break;
                                            }
                                        } catch (e) {
                                            // 忽略错误
                                        }
                                    }

                                    if (!retryFoundSearchText) {
                                        console.warn("[验证] 点击img后仍未找到搜索框，跳过当前循环");
                                        break; // 跳过当前循环，尝试下一个城市
                                    }
                                } catch (e) {
                                    console.error("[操作] 点击img失败: " + e.message);
                                    break; // 跳过当前循环，尝试下一个城市
                                }
                            }

                            // 第二步：查找城市前缀的模糊匹配并点击
                            var cityTextViews = update_view.find(className("android.widget.TextView").algorithm('DFS'));
                            var foundCity = false;

                            for (var i = 0; i < cityTextViews.length; i++) {
                                try {
                                    var textView = cityTextViews[i];
                                    var textContent = textView.text();

                                    // 检查textContent是否包含城市前缀
                                    if (textContent && textContent.includes(cityPrefix)) {
                                        textView.click();
                                        console.info("[操作] 选择门店所在城市" );
                                        foundCity = true;


                                        sleep(400);
                                        webview_parent_node = get_webview_parent_node();
                                        curent_node = get_current_node(webview_parent_node);
                                        update_view = get_current_webview_fast(curent_node);

                                        // 第二步：查找完整店名的TextView并点击
                                        var textViews2 = update_view.find(className("android.widget.TextView").algorithm('DFS'));
                                        var foundShop = false;

                                        for (var j = 0; j < textViews2.length; j++) {
                                            try {
                                                var textView2 = textViews2[j];
                                                var text2 = textView2.text();

                                                if (text2 && isFlexibleMatch(text2, selectedShopName)) {
                                                    textView2.click();
                                                    console.info("[操作] 选择门店 " + text2);
                                                    foundShop = true;
                                                    monitorShopNameMax = null;//点击门店完成 最高优先级监听 置空
                                                    selectedShopNamecount = 0;
                                                    break;
                                                }
                                            } catch (e) {
                                                // 忽略单个TextView的错误
                                            }
                                        }

                                        // 二步匹配：若完整店名未命中，则移除城市名前缀（含可选“市”）后再匹配
                                        if (!foundShop) {
                                            try {
                                                var altName = (selectedShopName || "").trim();
                                                if (altName && cityPrefix && altName.indexOf(cityPrefix) === 0) {
                                                    altName = altName.substring(cityPrefix.length);
                                                    if (altName.length > 0 && altName.charAt(0) === "市") {
                                                        altName = altName.substring(1);
                                                    }
                                                }
                                                altName = altName.replace(/^[\s:：\-]+/, "").trim();

                                                for (var j2 = 0; j2 < textViews2.length; j2++) {
                                                    try {
                                                        var tv2b = textViews2[j2];
                                                        var t2b = tv2b.text();
                                                        if (t2b && isFlexibleMatch(t2b, altName)) {
                                                            tv2b.click();
                                                            console.info("[操作] 选择门店 " + t2b);
                                                            foundShop = true;
                                                            monitorShopNameMax = null;
                                                            selectedShopNamecount = 0;
                                                            break;
                                                        }
                                                    } catch (e6) {}
                                                }
                                            } catch (e5) {}
                                        }

                                        if (!foundShop) {
                                            console.warn("[操作] 未找到" + selectedShopName);
                                            if(selectedShopNamecount <= 0){
                                                selectedShopNamecount++
                                                continue;

                                            }
                                        }
                                        purchasee_pagee_count = 1;
                                        // 点击后等待400ms
                                        sleep(400);
                                        // 立即开始库存刷新，零延迟启动
                                        selectionEndTime = new Date().getTime();
                                        console.info("[并行选择] 选择操作完成，立即开始库存刷新");
                                        sleep(200);
                                        // 同步处理通知按钮点击，避免与库存刷新循环冲突
                                        if (auto_click_notification) {
                                            clickNotifyBtn(); // 改为同步执行，避免线程冲突
                                        }
                                        monitorShopNameMax = null; //点击门店完成 最高优先级监听 置空
                                        break; // 找到并点击后跳出循环
                                    }
                                } catch (e) {
                                    // 忽略单个TextView的错误
                                }
                            }

                            if (!foundCity) {
                                console.warn("[操作] 未找到门店所在城市，正在重试操作");
                                var webview_parent_node = get_webview_parent_node();
                                var curent_node = get_current_node(webview_parent_node);
                                var update_view = get_current_webview_fast(curent_node);
                                var imagesDepth20 = update_view.find(className("android.widget.ImageView").depth(20).algorithm('DFS'));
                                if (imagesDepth20.length > 0) {
                                    var img = imagesDepth20[0];
                                    img.click();
                                    sleep(400);
                                }
                            }
                        } else {
                            console.warn("[操作] 没有找到设定门店，无法选择门店，脚本暂停");
                            back();
                            script_status = 0;
                            ui.post(() => {
                                stop();
                            });
                            toast("未选定对应门店。");
                             break;
                        }

                    } catch (e) {
                        console.error("[操作] 点击失败: " + e.message);
                    }
                }
            break;
        case "default":
            // Default logic
            //console.info("default");
            break;
        case "no_webview":
            log("No current webview found");
        break;
        default:
            log("Unknown status: ");
        break;
    }
    // 在页面状态切换时重置hasClickedConfirmAndPay
}

// 兑换模式
function handleExchangeMode() {
    // 获取webview父节点
    var webview_parent_node = get_webview_parent_node();
    if (!webview_parent_node) {
        sleep(100);
        return;
    }

    // 获取积分兑换节点
    var points_exchange_node = get_points_exchange_node(webview_parent_node);
    if (!points_exchange_node) {
        sleep(500);
        return;
    }

    // 获取积分兑换页面的WebView
    var current_webview = get_points_exchange_webview(points_exchange_node);
    if (!current_webview) {
        sleep(100);
        return;
    }

    has_been_started = true;

    // 使用积分兑换专用的页面状态检测
    var general_node = get_current_node(webview_parent_node);
    var header_text = get_header_text(general_node);

    var page_info = check_points_exchange_page_tree(header_text, current_webview);

    if (debug_mode_conf) {
        log("[兑换模式] Status: " + page_info.status);
    }

    // 处理积分兑换的各种状态
    switch (page_info.status) {

        case "exchange_points":
            handleClickPoints(current_webview, points_exchange_node);
            break;
        case "confirm_and_pay":
            getSpecificTextViews(general_node);
            handleConfirmOrder();
            break;
        case "default":
            // Default logic
            //console.info("default");
            break;
        default:
            break;
    }
}

//盒机模式
function handprizeBoxMode() {
    // 获取webview父节点
    var webview_parent_node = get_webview_parent_node();
    if (!webview_parent_node) {
        if (debug_mode_conf) {
            log("Cannot find webview parent node.");
        }
        return;
    }

    // 获取当前节点
    var current_node = get_current_node(webview_parent_node);
    if (!current_node) {
        log("Cannot find current node.");
        return;
    }

    // 获取当前页面的WebView
    var current_webview = get_current_webview_fast(current_node);
    if (!current_webview) {
        if (debug_mode_conf) {
        log("Cannot find current webview.");
        }
        return;
    }

    has_been_started = true;

    // 获取页面头部信息
    var header_text = get_header_text(current_node);
    var page_info = check_prize_box_page_tree(header_text, current_webview);


   // log("Header: " + page_info.header + ", Status: " + page_info.status);

    switch (page_info.status) {
        case "purchase":
            // 盒机模式：处理选择规格和购买数量逻辑
            var selectSpecIndex = -1; // "选择规格"的索引
            var purchaseCountIndex = -1; // "购买数量"的索引
            var updated_webview = get_current_webview_fast(current_node);
            // 获取所有TextView元素
            var textViews = updated_webview.find(className("android.widget.TextView").algorithm('DFS'));

            // 单次遍历查找目标元素
            for (var i = 0; i < textViews.length; i++) {
                try {
                    var tvText = textViews[i].text();
                    if (tvText) {
                        // 找到"选择规格"（模糊匹配）
                        if (selectSpecIndex === -1 && tvText.indexOf("选择规格") !== -1) {
                            selectSpecIndex = i;
                        }
                        // 找到"购买数量"（模糊匹配）
                        if (purchaseCountIndex === -1 && tvText.indexOf("购买数量") !== -1) {
                            purchaseCountIndex = i;
                        }
                        // 如果两个都找到了，提前退出循环
                        if (selectSpecIndex !== -1 && purchaseCountIndex !== -1) {
                            break;
                        }
                            }
                        } catch (e) {
                            // 忽略错误
                        }
                    }

            // 根据spec_selection变量选择点击TextView
            if (selectSpecIndex !== -1 && purchaseCountIndex !== -1 && spec_selection > 0) {
                var textViewCount = purchaseCountIndex - selectSpecIndex - 1;

                if (textViewCount > 0) {
                    var targetIndex = spec_selection <= textViewCount
                        ? selectSpecIndex + spec_selection
                        : purchaseCountIndex - 1;

                    try {
                        var targetElement = textViews[targetIndex];
                        var targetText = targetElement.text();
                        targetElement.click();
                        console.info("[盒机模式] 点击 " + targetText);
                } catch (e) {
                        // 忽略错误
                    }
                }
            }
            sleep(200);
            if(purchase_count > 1){
                var purchase_count_text = updated_webview.findOne(textMatches(".*数量.*").algorithm('DFS'));
                if (purchase_count_text) {
                    satisfyPurchaseCount(updated_webview, purchase_count);
                    log("已满足购买数量要求: ", purchase_count);
                }
            }
            var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                if (buyNowBtn) {
                    buyNowBtn.click();
                    console.info("点击立即购买按钮");
                    sleep(special_confirm_delay - 100);
                    break;
                }
            var buyNowBtn = updated_webview.findOne(text("到货通知").algorithm('DFS'));
            if(buyNowBtn){
                buyNowBtn.click();
                console.info("点击到货通知按钮");
                sleep(400);
                back();
                }
            break;
        case "info_page":
            log("info_page");
            var updated_webview = get_current_webview_fast(current_node);
            var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                if (buyNowBtn) {
                    buyNowBtn.click();
                    console.info("点击立即购买按钮");
                    sleep(400);
                }  else {
                    var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                    if (buyNowBtn) {
                        buyNowBtn.click();
                        console.info("点击立即购买按钮");
                        sleep(400);
                    } else {
                        // 如果没有立即购买按钮，检查是否有"距离开售时间还剩00:00"状态
                        var prepareSaleBtn = current_webview.findOne(text("即将开售00:00").algorithm('DFS'));

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
                                    console.warn("[检测] 检测到'立即购买'按钮，商品已发售！");
                                    console.info("立即点击购买按钮");
                                    buyNowBtn.click();

                                    // 重置刷新计数
                                    refresh_attempt_count = 0;

                                    // 等待页面跳转
                                    sleep(400);
                                    break;
                                } else {
                                    console.info("[检测] 暂未发现'立即购买'按钮，继续等待");
                                }
                            }
                        } else {
                            // 如果没有找到任何识别的按钮，检查是否有"距离开售时间还剩00:00"
                            var prepareSaleBtn = current_webview.findOne(text("即将开售00:00").algorithm('DFS'));

                            if (prepareSaleBtn) {
                                console.info("[检测] 发现倒计时文字，商品尚未发售，等待500ms后再次检测");
                                sleep(500);

                                // 重新获取当前webview，检查是否有"立即购买"按钮
                                var updated_webview = get_current_webview_fast(current_node);
                                if (updated_webview) {
                                    var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                                    if (buyNowBtn) {
                                        console.warn("[检测] 等待期间检测到'立即购买'按钮，商品已发售！");
                                        console.info("立即点击购买按钮");
                                        buyNowBtn.click();

                                        // 重置刷新计数
                                        refresh_attempt_count = 0;

                                        // 等待页面跳转
                                        sleep(400);
                                        break;
                                    }
                                }
                            }

                            // 如果没有找到任何识别的按钮，进行刷新
                            console.info("未识别到购买按钮，执行刷新操作");
                            performRefreshActions(current_webview);

                            // 刷新完成后立即检测是否有"立即购买"按钮
                            sleep(500);
                            var updated_webview = get_current_webview_fast(current_node);
                            if (updated_webview) {
                                var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                                if (buyNowBtn) {
                                    console.warn("[检测] 检测到'立即购买'按钮，商品已发售！");
                                    console.info("立即点击购买按钮");
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
            break;
        case "prepare_sale":
                submit_flag = false;
                ignore_next_purchase_page_flag = false;

                // 检查刷新次数限制
                if (refresh_attempt_count >= max_refresh_attempts) {
                    console.warn("[通知] 已达到最大刷新次数(" + max_refresh_attempts + ")，停止刷新");
                    script_status = 0;
                    confirmBtnEnterCount = 0; // 重置回流计数器
                    ui.post(() => {
                        w.end.attr('visibility', 'gone');
                        w.start.attr('visibility', 'visible');
                    });
                    break;
                }

                // 检查是否有"距离开售时间还剩00:00"文字
                var prepareSaleBtn = current_webview.findOne(text("即将开售00:00").algorithm('DFS'));

                if (prepareSaleBtn) {
                    refresh_attempt_count++;

                    console.info("发现'即将开售00:00'文字，先等待500ms检测是否有'立即购买'按钮 (第" + refresh_attempt_count + "次)");

                    // 在刷新之前先等待500ms，检测是否有"立即购买"按钮出现
                    console.info("[等待] 等待500ms检测是否有'立即购买'按钮出现...");
                    sleep(500);

                    // 重新获取当前webview，检查是否有"立即购买"按钮
                    var updated_webview = get_current_webview_fast(current_node);
                    if (updated_webview) {
                        var buyNowBtn = updated_webview.findOne(text("立即购买").algorithm('DFS'));
                        if (buyNowBtn) {
                            console.warn("[成功] 🎉 等待期间检测到'立即购买'按钮，商品已发售！");
                            console.info("立即点击购买按钮，跳过刷新操作");
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
                                console.info("立即点击购买按钮");
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
                    console.info("未找到发售状态按钮，可能页面已更新或商品已发售");

                    // 立即检测是否有"立即购买"按钮
                    var buyNowBtn = current_webview.findOne(text("立即购买").algorithm('DFS'));
                    if (buyNowBtn) {
                        console.warn("[成功] 🎉 检测到'立即购买'按钮，商品已发售！");
                        console.info("立即点击购买按钮");
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
        case "purchase_refresh":
            var selectSpecIndex = -1; // "选择规格"的索引
            var purchaseCountIndex = -1; // "购买数量"的索引
            var updated_webview = get_current_webview_fast(current_node);
            // 获取所有TextView元素
            var textViews = updated_webview.find(className("android.widget.TextView").algorithm('DFS'));

            // 单次遍历查找目标元素
            for (var i = 0; i < textViews.length; i++) {
                try {
                    var tvText = textViews[i].text();
                    if (tvText) {
                        // 找到"选择规格"（模糊匹配）
                        if (selectSpecIndex === -1 && tvText.indexOf("选择规格") !== -1) {
                            selectSpecIndex = i;
                        }
                        // 找到"购买数量"（模糊匹配）
                        if (purchaseCountIndex === -1 && tvText.indexOf("购买数量") !== -1) {
                            purchaseCountIndex = i;
                        }
                        // 如果两个都找到了，提前退出循环
                        if (selectSpecIndex !== -1 && purchaseCountIndex !== -1) {
                            break;
                        }
                    }
                } catch (e) {
                    // 忽略错误
                }
            }

            // 根据spec_selection变量选择点击TextView
            if (selectSpecIndex !== -1 && purchaseCountIndex !== -1 && spec_selection > 0) {
                var textViewCount = purchaseCountIndex - selectSpecIndex - 1;

                if (textViewCount > 0) {
                    // 收集有效的TextView和缺货前的TextView
                    var validTextViews = [];
                    var outOfStockPreviousTextViews = []; // 保存缺货前的TextView

                    for (var j = selectSpecIndex + 1; j < purchaseCountIndex; j++) {
                        try {
                            var element = textViews[j];
                            var elementText = element.text();
                            if (elementText && elementText.trim().length > 0) {
                                if (elementText.indexOf("缺货") !== -1) {
                                    // 发现缺货，记录上一个TextView
                                    if (j > selectSpecIndex + 1) {
                                        var previousElement = textViews[j - 1];
                                        var previousText = previousElement.text();
                                        if (previousText && previousText.trim().length > 0) {
                                            outOfStockPreviousTextViews.push({
                                                index: j - 1,
                                                element: previousElement,
                                                text: previousText,
                                                outOfStockText: elementText
                                            });
                                            console.info("[盒机模式] 发现缺货: " + elementText + "，记录上一个TextView: " + previousText);
                                        }
                                    }
                                } else {
                                    // 非缺货的TextView
                                    validTextViews.push({
                                        index: j,
                                        element: element,
                                        text: elementText
                                    });
                                }
                            }
                        } catch (e) {
                            // 忽略错误
                        }
                    }

                    // 如果有缺货前的TextView，优先处理
                    if (outOfStockPreviousTextViews.length > 0) {
                        console.info("[盒机模式] 开始处理缺货前的TextView，共" + outOfStockPreviousTextViews.length + "个");

                        for (var k = 0; k < outOfStockPreviousTextViews.length; k++) {
                            var outOfStockItem = outOfStockPreviousTextViews[k];
                            try {
                                // 重新获取webview和TextView元素，避免元素引用失效
                                var current_webview = get_current_webview_fast(current_node);
                                var current_textViews = current_webview.find(className("android.widget.TextView").algorithm('DFS'));

                                // 根据索引重新获取目标元素
                                var targetIndex = outOfStockItem.index;
                                if (targetIndex >= 0 && targetIndex < current_textViews.length) {
                                    var targetElement = current_textViews[targetIndex];
                                    var targetText = targetElement.text();

                                    // 尝试多种点击方式
                                    var clickSuccess = false;
                                    try {
                                        targetElement.click();
                                        console.info("[盒机模式] 直接点击成功: " + targetText);
                                        clickSuccess = true;
                                    } catch (e1) {
                                        console.info("[盒机模式] 直接点击失败，尝试坐标点击");
                                        try {
                                            var bounds = targetElement.bounds();
                                            click(bounds.centerX(), bounds.centerY());
                                            console.info("[盒机模式] 坐标点击成功: " + targetText);
                                            clickSuccess = true;
                                        } catch (e2) {
                                            console.error("[盒机模式] 坐标点击也失败: " + e2.message);
                                        }
                                    }

                                    // 如果点击成功，检查并点击"到货通知"按钮
                                    if (clickSuccess) {
                                        sleep(400); // 等待页面响应
                                        var notifyBtn = className('android.widget.Button').text('到货通知').findOne(100);
                                        if (notifyBtn) {
                                            try {
                                                var bounds = notifyBtn.bounds();
                                                click(bounds.centerX(), bounds.centerY());
                                                console.info("[盒机模式] 点击到货通知按钮成功");
                                                log("[操作] 点击到货通知");
                                            } catch (e) {
                                                console.error("[盒机模式] 点击到货通知失败: " + e.message);
                                            }
                                        } else {
                                            console.info("[盒机模式] 未找到到货通知按钮");
                                        }
                                    }
                                } else {
                                    console.warn("[盒机模式] 目标索引超出范围: " + targetIndex);
                                }

                                sleep(200);

                            } catch (e) {
                                console.error("[盒机模式] 处理缺货前TextView失败: " + e.message);
                            }
                        }
                    }
                }
            }
            var screenWidth = device.width;
            var screenHeight = device.height;
            var centerX = Math.floor(screenWidth * 0.5);
            var centerY = Math.floor(screenHeight * 0.4);
            click(centerX, centerY);
            log("[操作] 屏幕中心");
            sleep(200);
            var buyNowBtn = className('android.widget.Button').text('到货通知').findOne(100);
            if (buyNowBtn) {
                buyNowBtn.click();
                log("[操作] 点击到货通知");
                sleep(400);
            }
            break;
        case "refresh":
            var buyNowBtn = className('android.widget.Button').text('到货通知').findOne(100);
                if (buyNowBtn) {
                    try {
                        var bounds = buyNowBtn.bounds();
                        click(bounds.centerX(), bounds.centerY());
                        log("[操作] 坐标点击到货通知");
                    } catch (e) {
                        log("[操作] 坐标点击失败: " + e.message);
                    }
                    sleep(400);
                }else{
                    performRefreshActions(current_webview);
                }

            break;
        case "back":
                if (script_status == 0) {
                    rebuy_flag = false;
                    submit_flag = false;
                    dc_streak = 0;
                    confirmButtonExecuted = false; // 重置确认按钮执行标志
                    purchasee_pagee_count = 0;
                    confirmInfoClicked = false; // 重置确认信息并支付按钮点击状态
                    doubleConfirmClicked = false; // 重置确认无误/就是这家按钮点击状态
                    break;
                }
                var buyNowBtn = className('android.widget.TextView').text('一次抽多盒').findOne(20) || className('android.widget.TextView').text('立即选盒').findOne(20);
                if(buyNowBtn){
                    break;
                }
                var buyNowBtn = className('android.widget.TextView').text('到货提醒').findOne(100);
                if (buyNowBtn) {
                    buyNowBtn.click();
                    log("[操作] 点击到货通知");
                }
                var buyNowBtn = className('android.widget.TextView').text('一次抽多盒').findOne(20) || className('android.widget.TextView').text('立即选盒').findOne(20);
                if(buyNowBtn){
                    break;
                }
                back();
                break;
        case "withdraw":
            var updated_webview = get_current_webview_fast(current_node);
            // 点击一次抽多盒选项
            var multiBoxOption = updated_webview.findOne(className("android.widget.Button").textContains("确认上述信息并支付"));
            if (multiBoxOption) {
                log("[操作] 确认上述信息并支付");
                multiBoxOption.click();
            }
            break;
        case "withdraw_and_pay":
            var updated_webview = get_current_webview_fast(current_node);
            // 点击一次抽多盒选项
            var multiBoxOption = updated_webview.findOne(className("android.widget.TextView").text("立即选盒"));
            if (multiBoxOption) {
                log("[操作] 点击立即选盒");
                multiBoxOption.click();
                sleep(100);
            }
            var multiBoxOptionbox = updated_webview.findOne(className("android.widget.TextView").text("一次抽多盒"));
            if (multiBoxOptionbox) {
                    log("[操作] 点击一次抽多盒选项");
                    multiBoxOptionbox.click();
                    sleep(200);
            }

            // 遍历所有android.view.View并分析
            var allViews = updated_webview.find(className("android.view.View").depth(23));
            // 遍历所有深度23的view，查找其子元素中的Image
            for (var i = 0; i < allViews.length; i++) {
                var view = allViews[i];
                var images = view.find(className("android.widget.Image"));
                for (var j = 0; j < images.length; j++) {
                    var image = images[j];
                if (image && image.indexInParent() == 2) {
                    image.click();
                        //sleep(10); // 每次点击后等待一下
                    }
                }
            }
            log("[操作] 选盒完成");
            var latest_webview = get_current_webview_fast(current_node);
            if (!latest_webview) {
                latest_webview = updated_webview;
            }
            var  settleTextView = latest_webview.findOne(className("android.widget.TextView").text("全选").algorithm('DFS'));
            if (settleTextView) {
                var idx_num_text = settleTextView.indexInParent();
                var parent_view = settleTextView.parent();
                if (parent_view && parent_view.childCount() > idx_num_text + 2) {
                    var number_count_text = parent_view.child(idx_num_text + 2);
                    if (number_count_text) {
                log("[操作] 点击去结算按钮");
                        number_count_text.click();
            }
                }
            }
            break;
        case "confirm_and_pay":
            if (calibration_status.confirm_pay) {
                clickByCoordinates('confirm_pay');
                console.error("[点击] 确认支付1");
            }

            while (className('android.widget.TextView').text('确认订单').exists() == true) {
                // 检查是否被要求停止
                if (script_status == 0) {
                    rebuy_flag = false;
                    submit_flag = false;
                    dc_streak = 0;
                    confirmButtonExecuted = false; // 重置确认按钮执行标志
                    purchasee_pagee_count = 0;
                    confirmInfoClicked = false; // 重置确认信息并支付按钮点击状态
                    doubleConfirmClicked = false; // 重置确认无误/就是这家按钮点击状态
                    break;
                }
                var confirmInfoBtn = className('android.widget.TextView').text('确认支付').findOne(20);
                if(confirmInfoBtn){
                    if (!calibration_status.confirm_pay) {
                        var bounds = confirmInfoBtn.bounds();
                        var coords = [bounds.left, bounds.top, bounds.right, bounds.bottom];
                        cached_confirm_pay_coords = coords;
                        calibration_status.confirm_pay = true;
                        updatePrecomputedCoords();
                        saveCoordinatesToStorage();
                        console.info("[记录坐标] 确认支付按钮坐标已记录并保存到本地");
                    }
                    safeClickByText(className('android.widget.TextView'),'确认支付');
                    console.error("[点击] 确认支付2");
                    continue;
                }
            }
            if (!className('android.widget.TextView').text('确认订单').exists()) {
                // 检查是否找不到webview_parent_node（通常表示进入了支付页面）
                var webview_parent_node = get_webview_parent_node();
                if (!webview_parent_node) {
                    // 新增：检测微信支付相关元素
                    if (detectWeChatPayment()) {
                        submit_flag = true;
                        console.info("[支付线程] 检测到支付标志 - 进入支付状态");
                    }
                }
            }
            break;
        case "favoriteslist":
            // 遍历当前页面所有元素并打印
            traverseAndPrintAllElements(current_node,current_webview);
            break;
        case "default":
            // 默认逻辑
            break;
        case "no_webview":
            log("No current webview found");
            break;
        default:
            log("Unknown status: " + page_info.status);
            break;
    }
}
