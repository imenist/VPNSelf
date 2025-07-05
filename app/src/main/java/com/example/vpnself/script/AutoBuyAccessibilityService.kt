package com.example.vpnself.script

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.accessibilityservice.AccessibilityService.GestureResultCallback
import android.content.Intent
import android.graphics.Path
import android.graphics.Rect
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebChromeClient
import android.webkit.ConsoleMessage
import android.widget.Toast
import androidx.annotation.RequiresApi
import kotlinx.coroutines.*
import java.util.concurrent.atomic.AtomicBoolean
import java.io.File
import java.io.FileWriter
import java.text.SimpleDateFormat
import java.util.*
import com.google.gson.GsonBuilder
import com.google.gson.JsonParser

class AutoBuyAccessibilityService : AccessibilityService() {
    
    companion object {
        private const val TAG = "AutoBuyService"
        var instance: AutoBuyAccessibilityService? = null
        private const val WECHAT_PACKAGE = "com.tencent.mm"
        private const val CLICK_INTERVAL = 500L // 500ms间隔
        
        // 添加调试开关
        private const val DEBUG_ENABLED = true
        
        // 添加辅助方法来统一日志输出
        private fun logDebug(message: String) {
            if (DEBUG_ENABLED) {
                Log.d("location", message)
                Log.d(TAG, message)
            }
        }
        
        private fun logInfo(message: String) {
            Log.d("location", message)
            Log.i(TAG, message)
        }
        
        private fun logError(message: String) {
            Log.e("location", message)
            Log.e(TAG, message)
        }
    }
    
    private val handler = Handler(Looper.getMainLooper())
    private val isRunning = AtomicBoolean(false)
    private val isCapturing = AtomicBoolean(false)
    private val networkMonitor by lazy { NetworkMonitor(this) }
    private var webView: WebView? = null
    private var lastApiCall: String? = null
    private var capturedApis = mutableSetOf<String>()
    private var learnedPurchaseApi: String? = null
    
    // 性能优化标记
    private var isJsInjected = AtomicBoolean(false)
    private var lastEventTime = 0L
    private val eventThrottleMs = 500L // 事件节流，500ms内只处理一次
    
    // 脚本配置
    private var targetButtonTexts = listOf("按个买", "购买", "立即购买", "抢购")
    private var refreshButtonTexts = listOf("按箱买", "刷新")
    private var clickInterval = CLICK_INTERVAL
    
    // 新增：目标按钮坐标捕获配置
    private var targetCoordinateButtons = listOf("确认信息并支付", "就是这家", "到店取")
    private var capturedCoordinates = mutableMapOf<String, Rect>()
    
    // 增强的目标按钮检测
    private var enhancedTargetButtons = listOf(
        "确认信息并支付", "确认信息并支付", "确认订单并支付", 
        "就是这家", "就是这家店", "确认这家店",
        "到店取", "到店自取", "到店取餐"
    )
    
    // 自动点击统计
    private var autoClickStats = mutableMapOf<String, Int>()
    private var lastClickTime = 0L
    private val clickCooldown = 1000L // 1秒冷却时间，防止重复点击
    
    // "到店取"按钮专用监控
    private var daodiequButtonState = false // 记录"到店取"按钮的上一次状态
    private var daodiequLastCheckTime = 0L
    private val daodiequCheckInterval = 500L // 500ms检查一次"到店取"按钮状态
    
    // 协程作用域，用于替代GlobalScope
    private val serviceScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    
    override fun onCreate() {
        super.onCreate()
        instance = this
        PerformanceMonitor.enable()
        
        // 初始化并注册NetworkMonitor到管理器
        val networkMonitorInstance = NetworkMonitorManager.getInstance(this)
        
        initWebView()
        logInfo("抢购脚本服务已启动")
        
        // 添加服务启动日志到抓包历史
        try {
            networkMonitorInstance.addLog(
                NetworkMonitor.LogLevel.INFO,
                "🚀 抢购脚本服务已启动",
                "服务时间: ${SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())}\n" +
                "包名: ${packageName}\n" +
                "版本: ${packageManager.getPackageInfo(packageName, 0).versionName}"
            )
        } catch (e: Exception) {
            logError("无法添加服务启动日志: ${e.message}")
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        instance = null
        stopScript()
        serviceScope.cancel() // 取消所有协程
        handler.post {
            webView?.destroy()
        }
        logInfo("抢购脚本服务已销毁")
    }
    
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        event?.let { handleAccessibilityEvent(it) }
    }
    
    override fun onInterrupt() {
        logInfo("无障碍服务中断")
        stopScript()
    }
    
    private fun initWebView() {
        handler.post {
            try {
                webView = WebView(this).apply {
                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        allowFileAccess = true
                        allowContentAccess = true
                    }
                    addJavascriptInterface(networkMonitor.NetworkJavaScriptInterface(), "NetworkMonitor")
                    
                    // 添加Console日志接口
                    addJavascriptInterface(ConsoleJavaScriptInterface(), "Console")
                    
                    // 开启远程调试 - 可以在Chrome DevTools中查看console.log
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                        WebView.setWebContentsDebuggingEnabled(true)
                    }
                    
                    // 设置WebViewClient拦截console消息
                    webChromeClient = object : WebChromeClient() {
                        override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                            consoleMessage?.let { msg ->
                                val level = when (msg.messageLevel()) {
                                    ConsoleMessage.MessageLevel.ERROR -> "ERROR"
                                    ConsoleMessage.MessageLevel.WARNING -> "WARNING"
                                    ConsoleMessage.MessageLevel.DEBUG -> "DEBUG"
                                    else -> "INFO"
                                }
                                logInfo("🌐 WebView Console [$level]: ${msg.message()} (${msg.sourceId()}:${msg.lineNumber()})")
                            }
                            return true
                        }
                    }
                }
                logInfo("WebView初始化完成，远程调试已开启")
            } catch (e: Exception) {
                logError("WebView初始化失败: ${e.message}")
            }
        }
    }
    
    private fun handleAccessibilityEvent(event: AccessibilityEvent) {
        if (event.packageName != WECHAT_PACKAGE) return
        
        // 记录性能数据
        PerformanceMonitor.recordAccessibilityEvent()
        
        // 事件节流：防止频繁触发导致性能问题
        val currentTime = System.currentTimeMillis()
        if (currentTime - lastEventTime < eventThrottleMs) {
            return
        }
        lastEventTime = currentTime
        
        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                // 检测小程序页面
                serviceScope.launch {
                    checkMiniProgramPage()
                }
            }
            AccessibilityEvent.TYPE_VIEW_CLICKED -> {
                // 监听点击事件，用于注入JS
                if (!isJsInjected.get()) {
                    injectJavaScript()
                }
            }
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                // 页面内容变化时检查是否需要重新注入JS
                if (isRunning.get() && !isJsInjected.get()) {
                    injectJavaScript()
                }
                // 新增：如果正在抓包，捕获目标按钮坐标
                if (isCapturing.get()) {
                    captureTargetButtonCoordinates()
                }
            }
        }
    }
    
    private fun checkMiniProgramPage() {
        val rootNode = rootInActiveWindow ?: return
        
        // 检查是否在小程序页面
        if (isMiniProgramPage(rootNode)) {
            logInfo("检测到小程序页面")
            if (isRunning.get()) {
                startAutoBuyProcess()
            }
        }
    }
    
    private fun isMiniProgramPage(node: AccessibilityNodeInfo): Boolean {
        // 通过页面特征判断是否为目标小程序页面
        return findNodeByTexts(node, targetButtonTexts) != null ||
               findNodeByTexts(node, refreshButtonTexts) != null
    }
    
    private fun injectJavaScript() {
        if (isJsInjected.compareAndSet(false, true)) {
            PerformanceMonitor.recordJavaScriptInjection()
            val jsCode = networkMonitor.getInjectionScript()
            
            handler.post {
                try {
                    webView?.evaluateJavascript(jsCode) { result ->
                        logInfo("基础JavaScript注入完成: $result")
                        
                        // 注入HTTP层面的按钮点击脚本
                        injectButtonClickScript()
                    }
                } catch (e: Exception) {
                    logError("JavaScript注入失败: ${e.message}")
                    isJsInjected.set(false) // 重置标记，允许重试
                }
            }
        }
    }
    
    /**
     * 🚀 注入HTTP层面的按钮点击脚本
     */
    private fun injectButtonClickScript() {
        logInfo("🚀 开始注入HTTP层面按钮点击脚本")
        
        val buttonClickScript = networkMonitor.getButtonClickInjectionScript()
        
        handler.post {
            try {
                webView?.evaluateJavascript(buttonClickScript) { result ->
                    logInfo("🎯 HTTP层面按钮点击脚本注入完成: $result")
                    
                    // 显示成功通知
                    Toast.makeText(this, "🎯 HTTP按钮点击脚本已注入", Toast.LENGTH_LONG).show()
                    
                    // 添加到抓包历史
                    try {
                        val networkMonitor = NetworkMonitorManager.getCurrentInstance()
                        networkMonitor?.addLog(
                            NetworkMonitor.LogLevel.SUCCESS,
                            "🚀 HTTP按钮点击脚本注入成功",
                            "脚本已注入到WebView，开始监控和自动点击'到店取'按钮\n注入时间: ${SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault()).format(Date())}"
                        )
                    } catch (e: Exception) {
                        logError("无法添加注入成功记录: ${e.message}")
                    }
                }
            } catch (e: Exception) {
                logError("🚀 HTTP按钮点击脚本注入失败: ${e.message}")
                
                handler.post {
                    Toast.makeText(this, "❌ HTTP按钮点击脚本注入失败", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    /**
     * 🎯 手动注入HTTP按钮点击脚本
     */
    fun manualInjectButtonClickScript() {
        logInfo("🎯 手动触发HTTP按钮点击脚本注入")
        injectButtonClickScript()
    }
    
    fun startCapture() {
        if (isCapturing.compareAndSet(false, true)) {
            logInfo("开始API抓包")
            Toast.makeText(this, "API抓包已启动，请手动操作小程序", Toast.LENGTH_SHORT).show()
            
            // 重置学习的API
            learnedPurchaseApi = null
            
            // 设置网络监控回调 - 学习模式
            networkMonitor.setOnApiCapturedCallback { request ->
                // 分析是否为购买API
                if (isPurchaseRequest(request)) {
                    learnedPurchaseApi = request.id
                    logInfo("学习到购买API: ${request.method} ${request.url}")
                    Toast.makeText(this, "已学习购买接口！", Toast.LENGTH_SHORT).show()
                    
                    // 通知悬浮窗更新
                    sendBroadcast(Intent("com.example.vpnself.PURCHASE_API_LEARNED"))
                }
                
                // 通知悬浮窗更新API数量
                sendBroadcast(Intent("com.example.vpnself.API_CAPTURED").apply {
                    putExtra("api", "${request.method} ${request.url}")
                    putExtra("response", request.responseBody)
                })
            }
            
            // 启动悬浮窗
            startFloatingWindow()
            
            // 注入JS监听网络请求
            injectJavaScript()
            
            // 在抓包模式下也监控"到店取"按钮
            serviceScope.launch {
                while (isCapturing.get()) {
                    withContext(Dispatchers.Main) {
                        monitorDaodiequButton()
                    }
                    delay(500) // 每500ms检查一次
                }
            }
        }
    }
    
    fun stopCapture() {
        if (isCapturing.compareAndSet(true, false)) {
            logInfo("停止API抓包")
            Toast.makeText(this, "API抓包已停止", Toast.LENGTH_SHORT).show()
        }
    }
    
    fun startScript() {
        if (isRunning.compareAndSet(false, true)) {
            logInfo("开始执行抢购脚本")
            Toast.makeText(this, "抢购脚本已启动", Toast.LENGTH_SHORT).show()
            
            // 立即检查并点击目标按钮
            serviceScope.launch {
                withContext(Dispatchers.Main) {
                    checkAndClickTargetButtons()
                }
            }
            
            // 设置网络监控回调 - 抢购模式
            networkMonitor.setOnStockFoundCallback { hasStock ->
                if (hasStock) {
                    logInfo("发现库存，准备抢购")
                    // 自动执行抢购逻辑
                    serviceScope.launch {
                        try {
                            // 优先使用学习到的购买API
                            if (learnedPurchaseApi != null) {
                                val success = networkMonitor.replayRequest(learnedPurchaseApi!!)
                                if (success?.isSuccessful == true) {
                                    logInfo("抢购成功！")
                                    handler.post {
                                        Toast.makeText(this@AutoBuyAccessibilityService, "抢购成功！", Toast.LENGTH_SHORT).show()
                                    }
                                } else {
                                    logInfo("API重放失败，尝试UI操作")
                                    withContext(Dispatchers.Main) {
                                        startAutoBuyProcess()
                                    }
                                }
                            } else {
                                // 回退到UI操作
                                withContext(Dispatchers.Main) {
                                    startAutoBuyProcess()
                                }
                            }
                        } catch (e: Exception) {
                            logError("抢购过程出错: ${e.message}")
                        }
                    }
                }
            }
            
            // 启动悬浮窗
            startFloatingWindow()
            
            // 注入JS监听网络请求
            injectJavaScript()
            
            // 开始自动库存检查和按钮检测
            serviceScope.launch {
                try {
                    networkMonitor.autoCheckStock()
                } catch (e: Exception) {
                    logError("库存检查出错: ${e.message}")
                }
            }
            
            // 开始定期检查目标按钮
            serviceScope.launch {
                while (isRunning.get()) {
                    withContext(Dispatchers.Main) {
                        checkAndClickTargetButtons()
                        // 专门监控"到店取"按钮
                        monitorDaodiequButton()
                    }
                    delay(500) // 每500ms检查一次，提高响应速度
                }
            }
            
            // 定期输出性能统计
            serviceScope.launch {
                while (isRunning.get()) {
                    delay(30000) // 每30秒输出一次
                    PerformanceMonitor.logStats()
                }
            }
        }
    }
    
    fun stopScript() {
        if (isRunning.compareAndSet(true, false)) {
            logInfo("停止执行抢购脚本")
            
            // 输出最终统计
            if (autoClickStats.isNotEmpty()) {
                logInfo("=== 自动点击统计报告 ===")
                autoClickStats.forEach { (buttonText, count) ->
                    logInfo("「$buttonText」: $count 次")
                }
                logInfo("总点击次数: ${autoClickStats.values.sum()}")
                logInfo("========================")
                
                // 添加到抓包历史
                try {
                    val networkMonitor = NetworkMonitorManager.getCurrentInstance()
                    val statsReport = autoClickStats.entries.joinToString("\n") { "「${it.key}」: ${it.value} 次" }
                    networkMonitor?.addLog(
                        NetworkMonitor.LogLevel.INFO,
                        "📊 自动点击统计报告",
                        "$statsReport\n总点击次数: ${autoClickStats.values.sum()}"
                    )
                } catch (e: Exception) {
                    logError("无法添加统计报告到抓包历史: ${e.message}")
                }
            }
            
            Toast.makeText(this, "抢购脚本已停止", Toast.LENGTH_SHORT).show()
        }
    }
    
    fun stopAll() {
        isRunning.set(false)
        isCapturing.set(false)
        
        // 重置JS注入状态
        isJsInjected.set(false)
        
        // 清空统计信息
        autoClickStats.clear()
        lastClickTime = 0L
        
        // 重置"到店取"按钮状态
        daodiequButtonState = false
        daodiequLastCheckTime = 0L
        
        // 停止悬浮窗
        stopFloatingWindow()
        
        logInfo("所有功能已停止")
        logInfo("到店取按钮监控已重置")
    }
    
    private fun startAutoBuyProcess() {
        if (!isRunning.get()) return
        
        serviceScope.launch {
            try {
                withContext(Dispatchers.Main) {
                    val rootNode = rootInActiveWindow ?: return@withContext
                    
                    // 先尝试点击"按个买"按钮
                    val buyButton = findNodeByTexts(rootNode, listOf("按个买"))
                    if (buyButton?.isClickable == true) {
                        performClick(buyButton)
                    }
                }
                
                delay(200) // 等待接口调用
                
                withContext(Dispatchers.Main) {
                    val rootNode = rootInActiveWindow ?: return@withContext
                    
                    // 检查购买按钮是否可用
                    val purchaseButton = findNodeByTexts(rootNode, listOf("购买", "立即购买", "抢购"))
                    if (purchaseButton?.isEnabled == true) {
                        performClick(purchaseButton)
                        logInfo("成功点击购买按钮")
                        return@withContext
                    }
                    
                    // 如果购买按钮不可用，点击刷新按钮
                    val refreshButton = findNodeByTexts(rootNode, refreshButtonTexts)
                    if (refreshButton?.isClickable == true) {
                        performClick(refreshButton)
                    }
                }
                
                // 继续循环
                delay(clickInterval)
                if (isRunning.get()) {
                    startAutoBuyProcess()
                }
                
            } catch (e: Exception) {
                logError("抢购过程出错: ${e.message}")
                delay(clickInterval)
                if (isRunning.get()) {
                    startAutoBuyProcess()
                }
            }
        }
    }
    
    private fun findNodeByTexts(node: AccessibilityNodeInfo, texts: List<String>): AccessibilityNodeInfo? {
    // 检查当前节点
    val nodeText = node.text?.toString() ?: ""
    val contentDesc = node.contentDescription?.toString() ?: ""
    val className = node.className?.toString() ?: ""
    
    for (text in texts) {
        // 精确匹配或包含匹配
        if (nodeText.equals(text, ignoreCase = true) || 
            contentDesc.equals(text, ignoreCase = true) ||
            nodeText.contains(text, ignoreCase = true) || 
            contentDesc.contains(text, ignoreCase = true)) {
            
            logDebug("找到匹配节点: text='$nodeText', desc='$contentDesc', class='$className'")
            logDebug("节点信息: clickable=${node.isClickable}, enabled=${node.isEnabled}, visible=${node.isVisibleToUser}")
            
            return node
        }
    }
    
    // 递归检查子节点
    for (i in 0 until node.childCount) {
        val child = node.getChild(i) ?: continue
        val result = findNodeByTexts(child, texts)
        if (result != null) {
            child.recycle()
            return result
        }
        child.recycle()
    }
    
    return null
}

/**
 * 分析页面上下文，确保在正确的环境中操作
 */
private fun analyzePageContext(rootNode: AccessibilityNodeInfo): String {
    val contextTexts = mutableListOf<String>()
    
    // 收集页面中的文本信息
    collectTextsFromNode(rootNode, contextTexts, 5) // 只收集前5层的文本
    
    val allText = contextTexts.joinToString(" ")
    logDebug("页面文本片段: ${allText.take(200)}")
    
    return when {
        allText.contains("微信", ignoreCase = true) -> "微信环境"
        allText.contains("小程序", ignoreCase = true) -> "微信小程序"
        allText.contains("支付", ignoreCase = true) && 
        allText.contains("确认", ignoreCase = true) -> "支付页面"
        allText.contains("订单", ignoreCase = true) -> "订单页面"
        else -> "未知环境"
    }
}

/**
 * 递归收集节点中的文本
 */
private fun collectTextsFromNode(node: AccessibilityNodeInfo, texts: MutableList<String>, maxDepth: Int) {
    if (maxDepth <= 0) return
    
    val nodeText = node.text?.toString()
    val contentDesc = node.contentDescription?.toString()
    
    if (!nodeText.isNullOrBlank()) texts.add(nodeText)
    if (!contentDesc.isNullOrBlank()) texts.add(contentDesc)
    
    // 递归检查子节点
    for (i in 0 until node.childCount) {
        val child = node.getChild(i)
        if (child != null) {
            collectTextsFromNode(child, texts, maxDepth - 1)
            child.recycle()
        }
    }
}
    
    private fun performClick(node: AccessibilityNodeInfo): Boolean {
        val nodeText = node.text?.toString() ?: ""
        val rect = Rect()
        node.getBoundsInScreen(rect)
        val centerX = rect.centerX()
        val centerY = rect.centerY()
        
        logDebug("准备点击节点: text='$nodeText', 坐标=($centerX, $centerY)")
        
        // 尝试多种点击方式
        var success = false
        
        // 方法1: 标准节点点击
        if (node.isClickable) {
            logDebug("尝试方法1: 标准节点点击")
            success = node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            logDebug("方法1结果: $success")
        }
        
        // 方法2: 如果节点点击失败，尝试点击父节点
        if (!success && node.parent != null) {
            logDebug("尝试方法2: 点击父节点")
            val parent = node.parent
            if (parent.isClickable) {
                success = parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                logDebug("方法2结果: $success")
            }
        }
        
        // 方法3: 坐标点击
        if (!success) {
            logDebug("尝试方法3: 坐标点击 ($centerX, $centerY)")
            success = performGestureClick(centerX.toFloat(), centerY.toFloat())
            logDebug("方法3结果: $success")
        }
        
        // 方法4: 尝试稍微偏移的坐标点击
        if (!success) {
            logDebug("尝试方法4: 偏移坐标点击")
            val offsetX = centerX + 10
            val offsetY = centerY + 10
            success = performGestureClick(offsetX.toFloat(), offsetY.toFloat())
            logDebug("方法4结果: $success (偏移坐标: $offsetX, $offsetY)")
        }
        
        logDebug("最终点击结果: $success")
        return success
    }
    
    /**
     * 强制点击方法，忽略按钮的可点击状态
     */
    private fun performForceClick(node: AccessibilityNodeInfo, buttonText: String): Boolean {
        val nodeText = node.text?.toString() ?: ""
        val rect = Rect()
        node.getBoundsInScreen(rect)
        val centerX = rect.centerX()
        val centerY = rect.centerY()
        
        logInfo("=== 强制点击按钮: $buttonText ===")
        logInfo("按钮文本: '$nodeText'")
        logInfo("按钮坐标: ($centerX, $centerY)")
        logInfo("按钮状态: 可点击=${node.isClickable}, 启用=${node.isEnabled}, 可见=${node.isVisibleToUser}")
        
        var success = false
        
        // 方法1: 强制节点点击（忽略可点击状态）
        try {
            logInfo("尝试方法1: 强制节点点击")
            success = node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            logInfo("方法1结果: $success")
        } catch (e: Exception) {
            logError("方法1异常: ${e.message}")
        }
        
        // 方法2: 尝试点击父节点
        if (!success && node.parent != null) {
            try {
                logInfo("尝试方法2: 点击父节点")
                val parent = node.parent
                logInfo("父节点状态: 可点击=${parent.isClickable}, 启用=${parent.isEnabled}")
                success = parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                logInfo("方法2结果: $success")
            } catch (e: Exception) {
                logError("方法2异常: ${e.message}")
            }
        }
        
        // 方法3: 强制坐标点击
        if (!success) {
            try {
                logInfo("尝试方法3: 强制坐标点击 ($centerX, $centerY)")
                success = performGestureClick(centerX.toFloat(), centerY.toFloat())
                logInfo("方法3结果: $success")
            } catch (e: Exception) {
                logError("方法3异常: ${e.message}")
            }
        }
        
        // 方法4: 多次坐标点击
        if (!success) {
            try {
                logInfo("尝试方法4: 多次坐标点击")
                for (i in 1..3) {
                    val clickResult = performGestureClick(centerX.toFloat(), centerY.toFloat())
                    logInfo("第${i}次点击结果: $clickResult")
                    if (clickResult) {
                        success = true
                        break
                    }
                    Thread.sleep(100) // 等待100ms
                }
            } catch (e: Exception) {
                logError("方法4异常: ${e.message}")
            }
        }
        
        // 方法5: 尝试不同的坐标点击
        if (!success) {
            try {
                logInfo("尝试方法5: 多个坐标点击")
                val coordinates = listOf(
                    Pair(centerX, centerY),
                    Pair(centerX - 10, centerY),
                    Pair(centerX + 10, centerY),
                    Pair(centerX, centerY - 10),
                    Pair(centerX, centerY + 10)
                )
                
                for ((x, y) in coordinates) {
                    val clickResult = performGestureClick(x.toFloat(), y.toFloat())
                    logInfo("坐标($x, $y)点击结果: $clickResult")
                    if (clickResult) {
                        success = true
                        break
                    }
                    Thread.sleep(50)
                }
            } catch (e: Exception) {
                logError("方法5异常: ${e.message}")
            }
        }
        
        logInfo("强制点击最终结果: $success")
        logInfo("==============================")
        return success
    }
    
    /**
     * 尝试替代点击策略
     */
    private fun attemptAlternativeClick(node: AccessibilityNodeInfo, buttonText: String, centerX: Int, centerY: Int) {
        logInfo("=== 尝试替代点击策略: $buttonText ===")
        
        var success = false
        
        // 策略1: 尝试点击所有子节点
        try {
            logInfo("策略1: 尝试点击子节点")
            for (i in 0 until node.childCount) {
                val child = node.getChild(i)
                if (child != null) {
                    val childText = child.text?.toString() ?: ""
                    logInfo("尝试点击子节点$i: '$childText'")
                    
                    val clickResult = child.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    logInfo("子节点$i 点击结果: $clickResult")
                    
                    if (clickResult) {
                        success = true
                        logInfo("子节点$i 点击成功！")
                        break
                    }
                    child.recycle()
                }
            }
        } catch (e: Exception) {
            logError("策略1异常: ${e.message}")
        }
        
        // 策略2: 尝试点击兄弟节点
        if (!success && node.parent != null) {
            try {
                logInfo("策略2: 尝试点击兄弟节点")
                val parent = node.parent
                for (i in 0 until parent.childCount) {
                    val sibling = parent.getChild(i)
                    if (sibling != null && sibling != node) {
                        val siblingText = sibling.text?.toString() ?: ""
                        if (siblingText.contains(buttonText, ignoreCase = true)) {
                            logInfo("尝试点击兄弟节点$i: '$siblingText'")
                            
                            val clickResult = sibling.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                            logInfo("兄弟节点$i 点击结果: $clickResult")
                            
                            if (clickResult) {
                                success = true
                                logInfo("兄弟节点$i 点击成功！")
                                break
                            }
                        }
                        sibling.recycle()
                    }
                }
            } catch (e: Exception) {
                logError("策略2异常: ${e.message}")
            }
        }
        
        // 策略3: 尝试长按操作
        if (!success) {
            try {
                logInfo("策略3: 尝试长按操作")
                val longClickResult = node.performAction(AccessibilityNodeInfo.ACTION_LONG_CLICK)
                logInfo("长按结果: $longClickResult")
                success = longClickResult
            } catch (e: Exception) {
                logError("策略3异常: ${e.message}")
            }
        }
        
        // 策略4: 尝试焦点点击
        if (!success) {
            try {
                logInfo("策略4: 尝试焦点点击")
                node.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
                Thread.sleep(100)
                val focusClickResult = node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                logInfo("焦点点击结果: $focusClickResult")
                success = focusClickResult
            } catch (e: Exception) {
                logError("策略4异常: ${e.message}")
            }
        }
        
        // 策略5: 模拟双击
        if (!success) {
            try {
                logInfo("策略5: 模拟双击")
                val doubleClickResult1 = performGestureClick(centerX.toFloat(), centerY.toFloat())
                Thread.sleep(100)
                val doubleClickResult2 = performGestureClick(centerX.toFloat(), centerY.toFloat())
                logInfo("双击结果: $doubleClickResult1 & $doubleClickResult2")
                success = doubleClickResult1 || doubleClickResult2
            } catch (e: Exception) {
                logError("策略5异常: ${e.message}")
            }
        }
        
        if (success) {
            logInfo("替代点击策略成功！")
            
            // 更新统计
            autoClickStats[buttonText] = (autoClickStats[buttonText] ?: 0) + 1
            val totalClicks = autoClickStats.values.sum()
            
            // 显示Toast通知
            handler.post {
                Toast.makeText(this, "替代策略成功点击：$buttonText", Toast.LENGTH_SHORT).show()
            }
        } else {
            logError("所有替代点击策略都失败了")
        }
        
        logInfo("===============================")
    }
    
    /**
     * 诊断按钮状态问题
     */
    private fun diagnoseButtonState(node: AccessibilityNodeInfo, buttonText: String) {
        logInfo("=== 按钮状态诊断: $buttonText ===")
        
        val nodeText = node.text?.toString() ?: ""
        val contentDesc = node.contentDescription?.toString() ?: ""
        val className = node.className?.toString() ?: ""
        
        logInfo("按钮基本信息:")
        logInfo("  文本: '$nodeText'")
        logInfo("  描述: '$contentDesc'")
        logInfo("  类名: '$className'")
        
        logInfo("按钮状态:")
        logInfo("  可点击: ${node.isClickable}")
        logInfo("  启用: ${node.isEnabled}")
        logInfo("  可见: ${node.isVisibleToUser}")
        logInfo("  可聚焦: ${node.isFocusable}")
        logInfo("  已选中: ${node.isSelected}")
        logInfo("  已选定: ${node.isChecked}")
        
        val rect = Rect()
        node.getBoundsInScreen(rect)
        logInfo("按钮位置:")
        logInfo("  屏幕坐标: (${rect.left}, ${rect.top}) - (${rect.right}, ${rect.bottom})")
        logInfo("  中心坐标: (${rect.centerX()}, ${rect.centerY()})")
        logInfo("  大小: ${rect.width()} x ${rect.height()}")
        
        logInfo("节点层次:")
        logInfo("  子节点数: ${node.childCount}")
        val parent = node.parent
        if (parent != null) {
            logInfo("  父节点: ${parent.className}")
            logInfo("  父节点可点击: ${parent.isClickable}")
            logInfo("  父节点启用: ${parent.isEnabled}")
        } else {
            logInfo("  父节点: 无")
        }
        
        // 分析为什么按钮不可点击
        logInfo("问题分析:")
        when {
            !node.isClickable && !node.isEnabled -> {
                logInfo("  ⚠️ 按钮既不可点击也未启用 - 可能被程序禁用")
            }
            !node.isClickable && node.isEnabled -> {
                logInfo("  ⚠️ 按钮已启用但不可点击 - 可能是装饰性元素")
            }
            node.isClickable && !node.isEnabled -> {
                logInfo("  ⚠️ 按钮可点击但未启用 - 可能暂时禁用")
            }
            !node.isVisibleToUser -> {
                logInfo("  ⚠️ 按钮对用户不可见 - 可能被遮挡或在屏幕外")
            }
            rect.width() == 0 || rect.height() == 0 -> {
                logInfo("  ⚠️ 按钮大小为0 - 可能未正确布局")
            }
            else -> {
                logInfo("  ✅ 按钮状态正常，应该可以点击")
            }
        }
        
        // 检查子节点状态
        if (node.childCount > 0) {
            logInfo("子节点状态:")
            for (i in 0 until minOf(node.childCount, 5)) { // 只检查前5个子节点
                val child = node.getChild(i)
                if (child != null) {
                    val childText = child.text?.toString() ?: ""
                    logInfo("  子节点$i: '$childText', 可点击=${child.isClickable}, 启用=${child.isEnabled}")
                    child.recycle()
                }
            }
        }
        
        logInfo("建议的点击策略:")
        logInfo("  1. 强制坐标点击 (${rect.centerX()}, ${rect.centerY()})")
        logInfo("  2. 尝试点击父节点")
        logInfo("  3. 尝试点击子节点")
        logInfo("  4. 多次点击尝试")
        logInfo("  5. 长按操作")
        
        logInfo("============================")
    }
    
    /**
     * 创建按钮诊断信息
     */
    private fun createButtonDiagnosis(node: AccessibilityNodeInfo, buttonText: String): Map<String, Any> {
        val diagnosis = mutableMapOf<String, Any>()
        
        val nodeText = node.text?.toString() ?: ""
        val contentDesc = node.contentDescription?.toString() ?: ""
        val className = node.className?.toString() ?: ""
        
        diagnosis["buttonText"] = buttonText
        diagnosis["nodeText"] = nodeText
        diagnosis["contentDescription"] = contentDesc
        diagnosis["className"] = className
        
        // 状态信息
        diagnosis["isClickable"] = node.isClickable
        diagnosis["isEnabled"] = node.isEnabled
        diagnosis["isVisible"] = node.isVisibleToUser
        diagnosis["isFocusable"] = node.isFocusable
        diagnosis["isSelected"] = node.isSelected
        diagnosis["isChecked"] = node.isChecked
        
        // 位置信息
        val rect = Rect()
        node.getBoundsInScreen(rect)
        diagnosis["bounds"] = mapOf(
            "left" to rect.left,
            "top" to rect.top,
            "right" to rect.right,
            "bottom" to rect.bottom,
            "centerX" to rect.centerX(),
            "centerY" to rect.centerY(),
            "width" to rect.width(),
            "height" to rect.height()
        )
        
        // 层次信息
        diagnosis["childCount"] = node.childCount
        val parent = node.parent
        if (parent != null) {
            diagnosis["parentClassName"] = parent.className?.toString() ?: ""
            diagnosis["parentClickable"] = parent.isClickable
            diagnosis["parentEnabled"] = parent.isEnabled
        }
        
        // 问题分析
        val issues = mutableListOf<String>()
        val suggestions = mutableListOf<String>()
        
        when {
            !node.isClickable && !node.isEnabled -> {
                issues.add("按钮既不可点击也未启用 - 可能被程序禁用")
                suggestions.add("尝试强制坐标点击")
                suggestions.add("尝试点击父节点")
            }
            !node.isClickable && node.isEnabled -> {
                issues.add("按钮已启用但不可点击 - 可能是装饰性元素")
                suggestions.add("尝试强制坐标点击")
                suggestions.add("检查子节点是否可点击")
            }
            node.isClickable && !node.isEnabled -> {
                issues.add("按钮可点击但未启用 - 可能暂时禁用")
                suggestions.add("等待按钮启用")
                suggestions.add("尝试强制点击")
            }
            !node.isVisibleToUser -> {
                issues.add("按钮对用户不可见 - 可能被遮挡或在屏幕外")
                suggestions.add("检查页面滚动")
                suggestions.add("尝试坐标点击")
            }
            rect.width() == 0 || rect.height() == 0 -> {
                issues.add("按钮大小为0 - 可能未正确布局")
                suggestions.add("检查父节点")
                suggestions.add("检查页面加载状态")
            }
            else -> {
                issues.add("按钮状态正常")
                suggestions.add("标准点击应该有效")
            }
        }
        
        diagnosis["issues"] = issues
        diagnosis["suggestions"] = suggestions
        
        // 子节点信息
        val children = mutableListOf<Map<String, Any>>()
        for (i in 0 until minOf(node.childCount, 5)) {
            val child = node.getChild(i)
            if (child != null) {
                val childInfo = mapOf(
                    "index" to i,
                    "text" to (child.text?.toString() ?: ""),
                    "className" to (child.className?.toString() ?: ""),
                    "isClickable" to child.isClickable,
                    "isEnabled" to child.isEnabled
                )
                children.add(childInfo)
                child.recycle()
            }
        }
        diagnosis["children"] = children
        
        return diagnosis
    }
    
    /**
     * 🎯 改进的手势点击方法
     */
    private fun performGestureClick(x: Float, y: Float): Boolean {
        return try {
            logInfo("🖱️ 执行手势点击: ($x, $y)")
            
            val path = Path().apply { moveTo(x, y) }
            val gesture = GestureDescription.Builder()
                .addStroke(GestureDescription.StrokeDescription(path, 0, 100))
                .build()
            
            val result = dispatchGesture(gesture, null, null)
            logInfo("🖱️ 手势点击结果: $result")
            
            // 添加短暂延迟确保手势完成
            Thread.sleep(100)
            
            result
        } catch (e: Exception) {
            logError("🖱️ 手势点击失败: ${e.message}")
            false
        }
    }
    
    /**
     * 🎯 强化手势点击 - 使用更复杂的手势模拟
     */
    private fun performAdvancedGestureClick(x: Float, y: Float): Boolean {
        return try {
            logInfo("🖱️ 执行强化手势点击: ($x, $y)")
            
            // 创建更复杂的手势：按下->停留->释放
            val path = Path().apply { 
                moveTo(x, y)
                lineTo(x + 1, y + 1) // 微小移动，模拟真实手势
                lineTo(x, y)
            }
            
            val gesture = GestureDescription.Builder()
                .addStroke(GestureDescription.StrokeDescription(path, 0, 150)) // 更长的持续时间
                .build()
            
            val result = dispatchGesture(gesture, object : GestureResultCallback() {
                override fun onCompleted(gestureDescription: GestureDescription?) {
                    logInfo("🖱️ 强化手势完成")
                }
                
                override fun onCancelled(gestureDescription: GestureDescription?) {
                    logInfo("🖱️ 强化手势被取消")
                }
            }, null)
            
            logInfo("🖱️ 强化手势点击结果: $result")
            
            Thread.sleep(200) // 更长的延迟
            
            result
        } catch (e: Exception) {
            logError("🖱️ 强化手势点击失败: ${e.message}")
            false
        }
    }
    
    /**
     * 🎯 多次手势点击 - 连续执行多次手势
     */
    private fun performMultipleGestureClicks(x: Float, y: Float, count: Int = 3): Boolean {
        logInfo("🖱️ 执行多次手势点击: ($x, $y) 次数: $count")
        
        var anySuccess = false
        
        for (i in 1..count) {
            try {
                logInfo("🖱️ 第${i}次手势点击开始")
                
                val path = Path().apply { 
                    moveTo(x, y)
                    // 添加微小的随机偏移，模拟真实点击
                    val offsetX = x + (Math.random() * 4 - 2).toFloat()
                    val offsetY = y + (Math.random() * 4 - 2).toFloat()
                    lineTo(offsetX, offsetY)
                }
                
                val gesture = GestureDescription.Builder()
                    .addStroke(GestureDescription.StrokeDescription(path, 0, 120))
                    .build()
                
                val result = dispatchGesture(gesture, null, null)
                logInfo("🖱️ 第${i}次手势点击结果: $result")
                
                if (result) {
                    anySuccess = true
                }
                
                Thread.sleep(150) // 每次点击间隔150ms
                
            } catch (e: Exception) {
                logError("🖱️ 第${i}次手势点击失败: ${e.message}")
            }
        }
        
        logInfo("🖱️ 多次手势点击完成，任一成功: $anySuccess")
        return anySuccess
    }
    
    /**
     * 🎯 JS注入点击 - 通过JavaScript直接点击页面元素
     */
    private fun performJavaScriptClick(x: Float, y: Float, buttonText: String): Boolean {
        return try {
            logInfo("🌐 执行JS注入点击: ($x, $y) 按钮: $buttonText")
            
            // 构造JavaScript点击代码
            val jsCode = """
                (function() {
                    // 重写console.log以便Android端能够拦截
                    if (typeof Console !== 'undefined') {
                        console.log = function(msg) { Console.log(msg); };
                        console.error = function(msg) { Console.error(msg); };
                        console.warn = function(msg) { Console.warn(msg); };
                        console.info = function(msg) { Console.info(msg); };
                        console.debug = function(msg) { Console.debug(msg); };
                    }
                    
                    console.log('🌐 开始JS点击: $buttonText');
                    
                    // 方法1: 通过坐标点击
                    try {
                        var element = document.elementFromPoint($x, $y);
                        if (element) {
                            console.log('🌐 找到坐标元素: ' + element.tagName + ' ' + element.textContent);
                            element.click();
                            console.log('🌐 坐标点击执行完成');
                            return true;
                        }
                    } catch(e) {
                        console.log('🌐 坐标点击失败: ' + e.message);
                    }
                    
                    // 方法2: 通过文本查找元素
                    try {
                        var allElements = document.getElementsByTagName('*');
                        for (var i = 0; i < allElements.length; i++) {
                            var el = allElements[i];
                            if (el.textContent && el.textContent.includes('$buttonText')) {
                                console.log('🌐 找到文本元素: ' + el.tagName + ' ' + el.textContent);
                                el.click();
                                console.log('🌐 文本点击执行完成');
                                return true;
                            }
                        }
                    } catch(e) {
                        console.log('🌐 文本点击失败: ' + e.message);
                    }
                    
                    // 方法3: 模拟触摸事件
                    try {
                        var touchEvent = new TouchEvent('touchstart', {
                            bubbles: true,
                            cancelable: true,
                            touches: [{
                                clientX: $x,
                                clientY: $y,
                                pageX: $x,
                                pageY: $y
                            }]
                        });
                        document.dispatchEvent(touchEvent);
                        
                        var touchEndEvent = new TouchEvent('touchend', {
                            bubbles: true,
                            cancelable: true
                        });
                        document.dispatchEvent(touchEndEvent);
                        
                        console.log('🌐 触摸事件执行完成');
                        return true;
                    } catch(e) {
                        console.log('🌐 触摸事件失败: ' + e.message);
                    }
                    
                    // 方法4: 模拟鼠标点击事件
                    try {
                        var mouseEvent = new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            clientX: $x,
                            clientY: $y
                        });
                        document.dispatchEvent(mouseEvent);
                        console.log('🌐 鼠标事件执行完成');
                        return true;
                    } catch(e) {
                        console.log('🌐 鼠标事件失败: ' + e.message);
                    }
                    
                    return false;
                })();
            """.trimIndent()
            
            // 在主线程中执行JavaScript
            var jsResult = false
            handler.post {
                webView?.evaluateJavascript(jsCode) { result ->
                    logInfo("🌐 JS点击执行结果: $result")
                    jsResult = result == "true"
                }
            }
            
            // 等待JavaScript执行完成
            Thread.sleep(500)
            
            logInfo("🌐 JS注入点击完成，结果: $jsResult")
            return jsResult
            
        } catch (e: Exception) {
            logError("🌐 JS注入点击失败: ${e.message}")
            false
        }
    }
    
    private fun startFloatingWindow() {
        try {
            val intent = Intent(this, FloatingWindowService::class.java)
            startService(intent)
            logInfo("悬浮窗服务启动请求已发送")
        } catch (e: Exception) {
            logError("启动悬浮窗失败: ${e.message}")
            handler.post {
                Toast.makeText(this, "悬浮窗启动失败，请检查权限", Toast.LENGTH_LONG).show()
            }
        }
    }
    
    fun ensureFloatingWindow() {
        if (!isFloatingWindowShowing()) {
            startFloatingWindow()
        }
    }
    
    private fun isFloatingWindowShowing(): Boolean {
        // 通过广播检查悬浮窗是否在运行
        return try {
            val intent = Intent("com.example.vpnself.CHECK_FLOATING_WINDOW")
            sendBroadcast(intent)
            true
        } catch (e: Exception) {
            false
        }
    }
    
    private fun stopFloatingWindow() {
        val intent = Intent(this, FloatingWindowService::class.java)
        stopService(intent)
    }
    
    fun getScriptStatus(): String {
        return when {
            isRunning.get() -> "抢购中"
            isCapturing.get() -> "抓包中"
            else -> "已停止"
        }
    }
    
    fun getCaptureStatus(): String {
        return if (isCapturing.get()) "抓包中" else "未抓包"
    }
    
    fun isScriptRunning(): Boolean = isRunning.get()
    
    fun isCapturingActive(): Boolean = isCapturing.get()
    
    fun hasLearnedPurchaseApi(): Boolean = learnedPurchaseApi != null
    
    fun getCapturedApis(): Set<String> {
        return networkMonitor.getCapturedRequests().map { "${it.method} ${it.url}" }.toSet()
    }
    
    /**
     * 判断是否为购买请求
     * 通过URL、请求体、响应内容来识别
     */
    private fun isPurchaseRequest(request: NetworkMonitor.CapturedRequest): Boolean {
        val url = request.url.lowercase()
        val requestBody = request.requestBody.lowercase()
        val responseBody = request.responseBody.lowercase()
        
        // 购买相关的关键词
        val purchaseKeywords = listOf(
            "buy", "purchase", "order", "cart", "checkout", "pay",
            "购买", "下单", "支付", "结算", "加入购物车", "立即购买",
            "addcart", "addtocart", "createorder", "submitorder"
        )
        
        // 检查URL是否包含购买关键词
        val urlMatch = purchaseKeywords.any { keyword ->
            url.contains(keyword)
        }
        
        // 检查请求体是否包含购买相关参数
        val bodyMatch = purchaseKeywords.any { keyword ->
            requestBody.contains(keyword)
        } || requestBody.contains("quantity") || requestBody.contains("amount")
        
        // 检查响应是否包含订单相关信息
        val responseMatch = responseBody.contains("orderid") || 
                           responseBody.contains("order_id") ||
                           responseBody.contains("订单") ||
                           responseBody.contains("success") && bodyMatch
        
        val isPurchase = urlMatch || (bodyMatch && request.method.equals("POST", ignoreCase = true))
        
        if (isPurchase) {
            logInfo("识别到购买请求: ${request.method} ${request.url}")
            logInfo("匹配原因 - URL: $urlMatch, Body: $bodyMatch, Response: $responseMatch")
        }
        
        return isPurchase
    }
    
    /**
     * 捕获目标按钮坐标
     */
    private fun captureTargetButtonCoordinates() {
        try {
            val rootNode = rootInActiveWindow ?: return
            
            // 遍历所有目标按钮文本
            targetCoordinateButtons.forEach { buttonText ->
                val buttonNode = findNodeByTexts(rootNode, listOf(buttonText))
                if (buttonNode != null) {
                    val rect = Rect()
                    buttonNode.getBoundsInScreen(rect)
                    
                    // 检查是否是新的坐标（避免重复输出）
                    val previousRect = capturedCoordinates[buttonText]
                    if (previousRect == null || !previousRect.equals(rect)) {
                        capturedCoordinates[buttonText] = rect
                        logButtonCoordinates(buttonText, rect)
                    }
                    
                    buttonNode.recycle()
                }
            }
        } catch (e: Exception) {
            logError("捕获按钮坐标时出错: ${e.message}")
        }
    }
    
    /**
     * 检查并自动点击目标按钮
     */
    private fun checkAndClickTargetButtons() {
        val currentTime = System.currentTimeMillis()
        
        // 检查冷却时间
        if (currentTime - lastClickTime < clickCooldown) {
            logDebug("冷却中，跳过检查 (剩余: ${clickCooldown - (currentTime - lastClickTime)}ms)")
            return
        }
        
        val rootNode = rootInActiveWindow
        if (rootNode == null) {
            logDebug("无法获取根节点，跳过按钮检查")
            return
        }
        
            logDebug("开始检查目标按钮...")
    
    // 首先检查是否在正确的页面环境
    val pageContext = analyzePageContext(rootNode)
    logDebug("页面上下文: $pageContext")
    
    // 如果不在微信环境中，跳过检查
    if (!pageContext.contains("微信") && !pageContext.contains("小程序")) {
        logDebug("不在微信小程序环境中，跳过按钮检查")
        return
    }
    
    // 按优先级检查按钮（移除break逻辑，让所有按钮都能被检查）
    val priorityButtons = listOf("确认信息并支付", "就是这家", "到店取")
    var clickedAny = false
        
        for (buttonText in priorityButtons) {
            // 移除if (clickedAny) break，让所有按钮都能被检查
            
            logDebug("正在查找按钮: $buttonText")
            
            // 查找按钮
            val buttonNode = findNodeByTexts(rootNode, listOf(buttonText))
            
            if (buttonNode != null) {
                logDebug("找到按钮: $buttonText")
                logDebug("按钮可点击: ${buttonNode.isClickable}")
                logDebug("按钮启用: ${buttonNode.isEnabled}")
                logDebug("按钮可见: ${buttonNode.isVisibleToUser}")
                
                // 获取按钮坐标信息
                val rect = Rect()
                buttonNode.getBoundsInScreen(rect)
                val centerX = rect.centerX()
                val centerY = rect.centerY()
                
                logDebug("按钮坐标: ($centerX, $centerY)")
                
                // 如果按钮状态不正常，进行详细诊断
                if (!buttonNode.isClickable || !buttonNode.isEnabled) {
                    diagnoseButtonState(buttonNode, buttonText)
                }
                
                // 强制尝试点击，忽略按钮的可点击状态
                // 这是为了应对按钮被动态设置为不可点击但实际上可以点击的情况
                logInfo("强制尝试点击按钮: $buttonText (忽略可点击状态)")
                
                val clickSuccess = performForceClick(buttonNode, buttonText)
                
                if (clickSuccess) {
                    clickedAny = true
                    lastClickTime = currentTime
                    
                    // 更新统计
                    autoClickStats[buttonText] = (autoClickStats[buttonText] ?: 0) + 1
                    val totalClicks = autoClickStats.values.sum()
                    
                    // 记录到location日志
                    logInfo("=== 自动点击按钮 ===")
                    logInfo("按钮文本: $buttonText")
                    logInfo("点击坐标: ($centerX, $centerY)")
                    logInfo("点击时间: ${SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault()).format(Date())}")
                    logInfo("点击结果: 成功")
                    logInfo("本按钮点击次数: ${autoClickStats[buttonText]}")
                    logInfo("总点击次数: $totalClicks")
                    logInfo("==================")
                    
                    // 添加到抓包历史
                    try {
                        val networkMonitor = NetworkMonitorManager.getCurrentInstance()
                        networkMonitor?.addLog(
                            NetworkMonitor.LogLevel.SUCCESS,
                            "🎯 自动点击按钮: $buttonText",
                            "坐标: ($centerX, $centerY)\n时间: ${SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault()).format(Date())}\n本按钮点击次数: ${autoClickStats[buttonText]}\n总点击次数: $totalClicks"
                        )
                    } catch (e: Exception) {
                        logError("无法添加点击记录到抓包历史: ${e.message}")
                    }
                    
                    // 显示Toast通知
                    handler.post {
                        Toast.makeText(this, "已自动点击：$buttonText (第${autoClickStats[buttonText]}次)", Toast.LENGTH_SHORT).show()
                    }
                    
                    // 发送广播通知悬浮窗
                    sendBroadcast(Intent("com.example.vpnself.BUTTON_AUTO_CLICKED").apply {
                        putExtra("button_text", buttonText)
                        putExtra("center_x", centerX)
                        putExtra("center_y", centerY)
                        putExtra("click_time", System.currentTimeMillis())
                        putExtra("click_count", autoClickStats[buttonText] ?: 0)
                        putExtra("total_clicks", totalClicks)
                    })
                    
                } else {
                    logError("强制点击按钮失败: $buttonText")
                    // 尝试额外的点击策略
                    attemptAlternativeClick(buttonNode, buttonText, centerX, centerY)
                }
            } else {
                logDebug("未找到按钮: $buttonText")
            }
        }
        
        if (!clickedAny) {
            logDebug("本次检查未找到任何可点击的目标按钮")
        }
        
        logDebug("按钮检查完成")
    }
    
        /**
     * 专门监控"到店取"按钮状态 - 激进模式：持续点击
     */
    private fun monitorDaodiequButton() {
        val currentTime = System.currentTimeMillis()
        
        // 检查是否到了下次检查时间
        if (currentTime - daodiequLastCheckTime < daodiequCheckInterval) {
            return
        }
        daodiequLastCheckTime = currentTime
        
        val rootNode = rootInActiveWindow
        if (rootNode == null) {
            logDebug("无法获取根节点，跳过到店取按钮检查")
            return
        }
        
        // 查找"到店取"按钮
        val daodiequNode = findNodeByTexts(rootNode, listOf("到店取"))
        
        if (daodiequNode != null) {
            val isClickable = daodiequNode.isClickable
            val isEnabled = daodiequNode.isEnabled
            val isVisible = daodiequNode.isVisibleToUser
            
            // 获取按钮坐标
            val rect = Rect()
            daodiequNode.getBoundsInScreen(rect)
            val centerX = rect.centerX()
            val centerY = rect.centerY()
            
            // 输出按钮状态到logcat和toast
            logInfo("🔍 到店取按钮状态监控:")
            logInfo("  可点击: $isClickable")
            logInfo("  启用: $isEnabled") 
            logInfo("  可见: $isVisible")
            logInfo("  坐标: ($centerX, $centerY)")
            logInfo("  🚀 激进模式：无论状态如何都尝试点击！")
            
            // 🚀 激进模式：无论状态如何都尝试点击
            val clickSuccess = performAggressiveClick(daodiequNode, "到店取", centerX, centerY)
            
            if (clickSuccess) {
                logInfo("✅ 到店取按钮点击成功！")
                
                // 更新统计
                autoClickStats["到店取"] = (autoClickStats["到店取"] ?: 0) + 1
                val totalClicks = autoClickStats.values.sum()
                
                // 显示成功Toast
                handler.post {
                    Toast.makeText(this, "✅ 到店取按钮点击成功！(第${autoClickStats["到店取"]}次)", Toast.LENGTH_LONG).show()
                }
                
                // 记录成功日志
                logInfo("=== 到店取按钮自动点击成功 ===")
                logInfo("点击坐标: ($centerX, $centerY)")
                logInfo("点击时间: ${SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault()).format(Date())}")
                logInfo("按钮状态: 可点击=$isClickable, 启用=$isEnabled, 可见=$isVisible")
                logInfo("本按钮点击次数: ${autoClickStats["到店取"]}")
                logInfo("总点击次数: $totalClicks")
                logInfo("===============================")
                
                // 添加到抓包历史
                try {
                    val networkMonitor = NetworkMonitorManager.getCurrentInstance()
                    networkMonitor?.addLog(
                        NetworkMonitor.LogLevel.SUCCESS,
                        "🎯 到店取按钮自动点击成功",
                        "激进模式点击\n坐标: ($centerX, $centerY)\n时间: ${SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault()).format(Date())}\n按钮状态: 可点击=$isClickable, 启用=$isEnabled, 可见=$isVisible\n点击次数: ${autoClickStats["到店取"]}"
                    )
                } catch (e: Exception) {
                    logError("无法添加到店取点击记录到抓包历史: ${e.message}")
                }
                
            } else {
                logError("❌ 到店取按钮点击失败")
                
                // 定期显示失败Toast（每10次失败显示一次，避免过多通知）
                val failCount = autoClickStats["到店取-失败"] ?: 0
                autoClickStats["到店取-失败"] = failCount + 1
                
                if (failCount % 10 == 0) {
                    handler.post {
                        Toast.makeText(this, "❌ 到店取按钮点击失败 ${failCount}次", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            
            daodiequNode.recycle()
        } else {
            // 没有找到"到店取"按钮
            logDebug("未找到到店取按钮")
        }
    }
     
     /**
      * 深度分析节点结构
      */
     private fun analyzeNodeStructure(node: AccessibilityNodeInfo, depth: Int = 0, maxDepth: Int = 3): String {
         val indent = "  ".repeat(depth)
         val nodeText = node.text?.toString() ?: ""
         val contentDesc = node.contentDescription?.toString() ?: ""
         val className = node.className?.toString() ?: ""
         val viewId = node.viewIdResourceName ?: ""
         
         val nodeInfo = StringBuilder()
         nodeInfo.append("${indent}📍 层级$depth: $className\n")
         nodeInfo.append("${indent}   文本: '$nodeText'\n")
         nodeInfo.append("${indent}   描述: '$contentDesc'\n")
         nodeInfo.append("${indent}   ID: '$viewId'\n")
         nodeInfo.append("${indent}   可点击: ${node.isClickable}\n")
         nodeInfo.append("${indent}   启用: ${node.isEnabled}\n")
         nodeInfo.append("${indent}   可见: ${node.isVisibleToUser}\n")
         nodeInfo.append("${indent}   可聚焦: ${node.isFocusable}\n")
         nodeInfo.append("${indent}   已选中: ${node.isSelected}\n")
         nodeInfo.append("${indent}   已勾选: ${node.isChecked}\n")
         
         val rect = Rect()
         node.getBoundsInScreen(rect)
         nodeInfo.append("${indent}   坐标: (${rect.left},${rect.top})-(${rect.right},${rect.bottom})\n")
         nodeInfo.append("${indent}   中心: (${rect.centerX()},${rect.centerY()})\n")
         nodeInfo.append("${indent}   大小: ${rect.width()}x${rect.height()}\n")
         nodeInfo.append("${indent}   子节点数: ${node.childCount}\n")
         
         // 递归分析子节点
         if (depth < maxDepth) {
             for (i in 0 until node.childCount) {
                 val child = node.getChild(i)
                 if (child != null) {
                     nodeInfo.append(analyzeNodeStructure(child, depth + 1, maxDepth))
                     child.recycle()
                 }
             }
         }
         
         return nodeInfo.toString()
     }
     
     /**
      * 查找所有包含指定文本的节点
      */
     private fun findAllNodesWithText(rootNode: AccessibilityNodeInfo, targetText: String): List<AccessibilityNodeInfo> {
         val foundNodes = mutableListOf<AccessibilityNodeInfo>()
         
         fun searchNode(node: AccessibilityNodeInfo) {
             val nodeText = node.text?.toString() ?: ""
             val contentDesc = node.contentDescription?.toString() ?: ""
             
             if (nodeText.contains(targetText, ignoreCase = true) || 
                 contentDesc.contains(targetText, ignoreCase = true)) {
                 foundNodes.add(node)
             }
             
             // 递归搜索子节点
             for (i in 0 until node.childCount) {
                 val child = node.getChild(i)
                 if (child != null) {
                     searchNode(child)
                     // 注意：这里不回收child，因为要保留在foundNodes中
                 }
             }
         }
         
         searchNode(rootNode)
         return foundNodes
     }
     
     /**
      * 增强的到店取按钮检查，包含详细的节点分析
      */
     fun analyzeAndCheckDaodiequButton() {
         serviceScope.launch {
             withContext(Dispatchers.Main) {
                 val rootNode = rootInActiveWindow
                 if (rootNode == null) {
                     logInfo("⚠️ 无法获取根节点")
                     return@withContext
                 }
                 
                 logInfo("🔍 === 开始深度分析到店取按钮 ===")
                 
                 // 查找所有包含"到店取"的节点
                 val daodiequNodes = findAllNodesWithText(rootNode, "到店取")
                 
                 if (daodiequNodes.isEmpty()) {
                     logInfo("❌ 未找到任何包含'到店取'的节点")
                     
                     // 输出整个页面的前3层节点结构
                     logInfo("📋 页面节点结构分析:")
                     logInfo(analyzeNodeStructure(rootNode, 0, 3))
                     
                     handler.post {
                         Toast.makeText(this@AutoBuyAccessibilityService, "未找到到店取按钮", Toast.LENGTH_SHORT).show()
                     }
                     return@withContext
                 }
                 
                 logInfo("✅ 找到 ${daodiequNodes.size} 个包含'到店取'的节点")
                 
                 // 分析每个找到的节点
                 daodiequNodes.forEachIndexed { index, node ->
                     logInfo("🎯 === 分析第${index + 1}个到店取节点 ===")
                     
                     // 详细分析该节点及其周围结构
                     val nodeAnalysis = analyzeNodeStructure(node, 0, 2)
                     logInfo("节点详细信息:\n$nodeAnalysis")
                     
                     // 分析父节点
                     val parent = node.parent
                     if (parent != null) {
                         logInfo("🔼 父节点分析:")
                         val parentAnalysis = analyzeNodeStructure(parent, 0, 1)
                         logInfo("$parentAnalysis")
                     }
                     
                     // 尝试多种点击方式
                     logInfo("🖱️ 尝试点击第${index + 1}个节点...")
                     val success = tryMultipleClickStrategies(node, "到店取-${index + 1}")
                     
                     if (success) {
                         logInfo("✅ 第${index + 1}个节点点击成功！")
                         handler.post {
                             Toast.makeText(this@AutoBuyAccessibilityService, "到店取按钮点击成功！", Toast.LENGTH_LONG).show()
                         }
                     } else {
                         logInfo("❌ 第${index + 1}个节点点击失败")
                     }
                     
                     logInfo("=====================================")
                 }
                 
                 // 清理节点
                 daodiequNodes.forEach { it.recycle() }
                 
                 logInfo("🔍 === 到店取按钮深度分析完成 ===")
             }
         }
     }
     
     /**
      * 尝试多种点击策略
      */
     private fun tryMultipleClickStrategies(node: AccessibilityNodeInfo, buttonText: String): Boolean {
         val rect = Rect()
         node.getBoundsInScreen(rect)
         val centerX = rect.centerX()
         val centerY = rect.centerY()
         
         var success = false
         
         // 策略1: 直接节点点击
         try {
             logInfo("策略1: 直接节点点击")
             success = node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
             logInfo("策略1结果: $success")
         } catch (e: Exception) {
             logError("策略1异常: ${e.message}")
         }
         
         // 策略2: 父节点点击
         if (!success && node.parent != null) {
             try {
                 logInfo("策略2: 父节点点击")
                 val parent = node.parent
                 success = parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                 logInfo("策略2结果: $success (父节点可点击: ${parent.isClickable})")
             } catch (e: Exception) {
                 logError("策略2异常: ${e.message}")
             }
         }
         
         // 策略3: 坐标点击（中心点）
         if (!success) {
             try {
                 logInfo("策略3: 坐标点击 ($centerX, $centerY)")
                 success = performGestureClick(centerX.toFloat(), centerY.toFloat())
                 logInfo("策略3结果: $success")
             } catch (e: Exception) {
                 logError("策略3异常: ${e.message}")
             }
         }
         
         // 策略4: 多点坐标点击
         if (!success) {
             try {
                 logInfo("策略4: 多点坐标点击")
                 val coordinates = listOf(
                     Pair(centerX, centerY),
                     Pair(rect.left + rect.width()/4, centerY),
                     Pair(rect.right - rect.width()/4, centerY),
                     Pair(centerX, rect.top + rect.height()/4),
                     Pair(centerX, rect.bottom - rect.height()/4)
                 )
                 
                 for ((x, y) in coordinates) {
                     val clickResult = performGestureClick(x.toFloat(), y.toFloat())
                     logInfo("坐标($x, $y)点击结果: $clickResult")
                     if (clickResult) {
                         success = true
                         break
                     }
                     Thread.sleep(100)
                 }
             } catch (e: Exception) {
                 logError("策略4异常: ${e.message}")
             }
         }
         
         // 策略5: 长按尝试
         if (!success) {
             try {
                 logInfo("策略5: 长按尝试")
                 success = node.performAction(AccessibilityNodeInfo.ACTION_LONG_CLICK)
                 logInfo("策略5结果: $success")
             } catch (e: Exception) {
                 logError("策略5异常: ${e.message}")
             }
         }
         
         return success
     }
     
     /**
      * 手动检查"到店取"按钮状态（可供外部调用）
      */
     fun checkDaodiequButtonStatus() {
         serviceScope.launch {
             withContext(Dispatchers.Main) {
                 val rootNode = rootInActiveWindow
                 if (rootNode == null) {
                     logInfo("⚠️ 无法获取根节点，无法检查到店取按钮状态")
                     handler.post {
                         Toast.makeText(this@AutoBuyAccessibilityService, "无法获取页面信息", Toast.LENGTH_SHORT).show()
                     }
                     return@withContext
                 }
                 
                 // 查找"到店取"按钮
                 val daodiequNode = findNodeByTexts(rootNode, listOf("到店取"))
                 
                 if (daodiequNode != null) {
                     val isClickable = daodiequNode.isClickable
                     val isEnabled = daodiequNode.isEnabled
                     val isVisible = daodiequNode.isVisibleToUser
                     val currentButtonState = isClickable && isEnabled && isVisible
                     
                     // 获取按钮坐标
                     val rect = Rect()
                     daodiequNode.getBoundsInScreen(rect)
                     val centerX = rect.centerX()
                     val centerY = rect.centerY()
                     
                     // 输出详细状态
                     logInfo("=== 手动检查到店取按钮状态 ===")
                     logInfo("按钮位置: ($centerX, $centerY)")
                     logInfo("可点击: $isClickable")
                     logInfo("启用: $isEnabled")
                     logInfo("可见: $isVisible")
                     logInfo("综合状态: $currentButtonState")
                     logInfo("===============================")
                     
                     // 显示Toast
                     val statusText = if (currentButtonState) "✅可点击" else "❌不可点击"
                     val detailText = "可点击:$isClickable 启用:$isEnabled 可见:$isVisible"
                     
                     handler.post {
                         Toast.makeText(this@AutoBuyAccessibilityService, 
                             "到店取按钮状态: $statusText\n$detailText\n坐标: ($centerX, $centerY)", 
                             Toast.LENGTH_LONG).show()
                     }
                     
                     // 如果状态为可点击，询问是否立即点击
                     if (currentButtonState) {
                         handler.post {
                             Toast.makeText(this@AutoBuyAccessibilityService, 
                                 "到店取按钮可点击！如果需要可启动脚本自动点击", 
                                 Toast.LENGTH_LONG).show()
                         }
                     }
                     
                     daodiequNode.recycle()
                 } else {
                     logInfo("⚠️ 未找到到店取按钮")
                     handler.post {
                         Toast.makeText(this@AutoBuyAccessibilityService, "未找到到店取按钮", Toast.LENGTH_SHORT).show()
                     }
                 }
             }
         }
     }
     
     /**
      * 🚀 新激进点击方法：完全避开Android无障碍点击，使用JS注入和强化手势
      * 
      * 新点击机制说明：
      * 1. JS注入点击 - 直接通过JavaScript操作页面元素
      * 2. 基础手势点击 - 标准手势模拟
      * 3. 强化手势点击 - 复杂手势模拟
      * 4. 多次手势点击 - 连续多次手势
      * 5. 多点坐标手势 - 按钮区域内多个位置
      * 6. 长时间手势 - 更长持续时间
      * 7. 随机偏移手势 - 模拟真实手指点击
      * 8. 快速连击手势 - 高频点击
      */
     private fun performAggressiveClick(node: AccessibilityNodeInfo, buttonText: String, centerX: Int, centerY: Int): Boolean {
         logInfo("🚀 === 开始新激进点击：$buttonText ===")
         logInfo("目标坐标: ($centerX, $centerY)")
         logInfo("按钮状态: 可点击=${node.isClickable}, 启用=${node.isEnabled}, 可见=${node.isVisibleToUser}")
         logInfo("⚠️ 完全避开node.performAction，使用JS注入和手势点击")
         
         var success = false
         
         // 🎯 策略1: JS注入点击（优先级最高）
         if (!success) {
             try {
                 logInfo("📌 策略1: JS注入点击")
                 success = performJavaScriptClick(centerX.toFloat(), centerY.toFloat(), buttonText)
                 logInfo("策略1结果: $success")
                 if (success) {
                     logInfo("✅ JS注入点击成功！")
                     return true
                 }
             } catch (e: Exception) {
                 logError("策略1异常: ${e.message}")
             }
         }
         
         // 🎯 策略2: 基础手势点击
         if (!success) {
             try {
                 logInfo("📌 策略2: 基础手势点击")
                 success = performGestureClick(centerX.toFloat(), centerY.toFloat())
                 logInfo("策略2结果: $success")
                 if (success) {
                     logInfo("✅ 基础手势点击成功！")
                     return true
                 }
             } catch (e: Exception) {
                 logError("策略2异常: ${e.message}")
             }
         }
         
         // 🎯 策略3: 强化手势点击
         if (!success) {
             try {
                 logInfo("📌 策略3: 强化手势点击")
                 success = performAdvancedGestureClick(centerX.toFloat(), centerY.toFloat())
                 logInfo("策略3结果: $success")
                 if (success) {
                     logInfo("✅ 强化手势点击成功！")
                     return true
                 }
             } catch (e: Exception) {
                 logError("策略3异常: ${e.message}")
             }
         }
         
         // 🎯 策略4: 多次手势点击
         if (!success) {
             try {
                 logInfo("📌 策略4: 多次手势点击")
                 success = performMultipleGestureClicks(centerX.toFloat(), centerY.toFloat(), 3)
                 logInfo("策略4结果: $success")
                 if (success) {
                     logInfo("✅ 多次手势点击成功！")
                     return true
                 }
             } catch (e: Exception) {
                 logError("策略4异常: ${e.message}")
             }
         }
         
         // 🎯 策略5: 多点坐标手势点击
         if (!success) {
             try {
                 logInfo("📌 策略5: 多点坐标手势点击")
                 val rect = Rect()
                 node.getBoundsInScreen(rect)
                 
                 val coordinates = listOf(
                     Pair(centerX, centerY), // 中心点
                     Pair(rect.left + rect.width()/4, centerY), // 左侧1/4处
                     Pair(rect.right - rect.width()/4, centerY), // 右侧1/4处
                     Pair(centerX, rect.top + rect.height()/3), // 上方1/3处
                     Pair(centerX, rect.bottom - rect.height()/3) // 下方1/3处
                 )
                 
                 for ((i, pair) in coordinates.withIndex()) {
                     val (x, y) = pair
                     logInfo("  尝试手势坐标${i+1}: ($x, $y)")
                     val clickResult = performGestureClick(x.toFloat(), y.toFloat())
                     logInfo("  手势坐标${i+1}结果: $clickResult")
                     if (clickResult) {
                         success = true
                         logInfo("✅ 多点坐标手势成功！位置: ($x, $y)")
                         return true
                     }
                     Thread.sleep(100) // 短暂延迟
                 }
             } catch (e: Exception) {
                 logError("策略5异常: ${e.message}")
             }
         }
         
         // 🎯 策略6: 长时间手势点击
         if (!success) {
             try {
                 logInfo("📌 策略6: 长时间手势点击")
                 success = performLongGestureClick(centerX.toFloat(), centerY.toFloat(), 300)
                 logInfo("策略6结果: $success")
                 if (success) {
                     logInfo("✅ 长时间手势点击成功！")
                     return true
                 }
             } catch (e: Exception) {
                 logError("策略6异常: ${e.message}")
             }
         }
         
         // 🎯 策略7: 随机偏移手势点击
         if (!success) {
             try {
                 logInfo("📌 策略7: 随机偏移手势点击")
                 for (i in 1..5) {
                     val offsetX = centerX + (Math.random() * 20 - 10).toInt() // ±10像素随机偏移
                     val offsetY = centerY + (Math.random() * 20 - 10).toInt()
                     logInfo("  随机偏移点击${i}: ($offsetX, $offsetY)")
                     val clickResult = performGestureClick(offsetX.toFloat(), offsetY.toFloat())
                     logInfo("  随机偏移${i}结果: $clickResult")
                     if (clickResult) {
                         success = true
                         logInfo("✅ 随机偏移手势成功！")
                         return true
                     }
                     Thread.sleep(80)
                 }
             } catch (e: Exception) {
                 logError("策略7异常: ${e.message}")
             }
         }
         
         // 🎯 策略8: 快速连击手势
         if (!success) {
             try {
                 logInfo("📌 策略8: 快速连击手势")
                 for (i in 1..5) {
                     logInfo("  快速连击第${i}次")
                     val clickResult = performGestureClick(centerX.toFloat(), centerY.toFloat())
                     logInfo("  连击${i}结果: $clickResult")
                     if (clickResult) {
                         success = true
                         logInfo("✅ 快速连击手势成功！")
                         return true
                     }
                     Thread.sleep(30) // 很短的延迟，模拟快速点击
                 }
             } catch (e: Exception) {
                 logError("策略8异常: ${e.message}")
             }
         }
         
         // 🎯 策略9: 组合JS + 手势
         if (!success) {
             try {
                 logInfo("📌 策略9: 组合JS + 手势")
                 // 先执行JS点击
                 performJavaScriptClick(centerX.toFloat(), centerY.toFloat(), buttonText)
                 Thread.sleep(100)
                 // 再执行手势点击
                 success = performGestureClick(centerX.toFloat(), centerY.toFloat())
                 logInfo("策略9结果: $success")
                 if (success) {
                     logInfo("✅ 组合JS + 手势成功！")
                     return true
                 }
             } catch (e: Exception) {
                 logError("策略9异常: ${e.message}")
             }
         }
         
         // 🎯 策略10: 最后疯狂尝试 - 所有方法组合
         if (!success) {
             try {
                 logInfo("📌 策略10: 最后疯狂尝试")
                 // JS点击
                 performJavaScriptClick(centerX.toFloat(), centerY.toFloat(), buttonText)
                 Thread.sleep(50)
                 // 多次手势
                 performMultipleGestureClicks(centerX.toFloat(), centerY.toFloat(), 2)
                 Thread.sleep(50)
                 // 强化手势
                 success = performAdvancedGestureClick(centerX.toFloat(), centerY.toFloat())
                 logInfo("策略10结果: $success")
                 if (success) {
                     logInfo("✅ 最后疯狂尝试成功！")
                     return true
                 }
             } catch (e: Exception) {
                 logError("策略10异常: ${e.message}")
             }
         }
         
         logInfo("💥 所有新点击策略都失败了！")
         logInfo("🚀 === 新激进点击完成：$buttonText ===")
         return false
     }
     
     /**
      * 执行长时间手势点击
      */
     private fun performLongGestureClick(x: Float, y: Float, duration: Long): Boolean {
         return try {
             val path = android.graphics.Path()
             path.moveTo(x, y)
             
             val gestureDescription = GestureDescription.Builder()
                 .addStroke(GestureDescription.StrokeDescription(path, 0, duration))
                 .build()
             
             dispatchGesture(gestureDescription, null, null)
             true
         } catch (e: Exception) {
             logError("长时间手势点击异常: ${e.message}")
             false
         }
     }
     
     /**
      * 手动执行激进点击"到店取"按钮
      */
     fun performAggressiveClickOnDaodiequButton() {
         logInfo("🚀 === 手动触发激进点击到店取按钮 ===")
         
         serviceScope.launch {
             withContext(Dispatchers.Main) {
                 val rootNode = rootInActiveWindow
                 if (rootNode == null) {
                     logError("⚠️ 无法获取根节点")
                     handler.post {
                         Toast.makeText(this@AutoBuyAccessibilityService, "无法获取页面信息", Toast.LENGTH_SHORT).show()
                     }
                     return@withContext
                 }
                 
                 // 查找"到店取"按钮
                 val daodiequNode = findNodeByTexts(rootNode, listOf("到店取"))
                 
                 if (daodiequNode != null) {
                     // 获取按钮坐标
                     val rect = Rect()
                     daodiequNode.getBoundsInScreen(rect)
                     val centerX = rect.centerX()
                     val centerY = rect.centerY()
                     
                     logInfo("🎯 找到到店取按钮，开始激进点击")
                     logInfo("按钮坐标: ($centerX, $centerY)")
                     logInfo("按钮状态: 可点击=${daodiequNode.isClickable}, 启用=${daodiequNode.isEnabled}, 可见=${daodiequNode.isVisibleToUser}")
                     
                     // 执行激进点击
                     val clickSuccess = performAggressiveClick(daodiequNode, "到店取-手动", centerX, centerY)
                     
                     if (clickSuccess) {
                         logInfo("✅ 手动激进点击成功！")
                         
                         // 更新统计
                         autoClickStats["到店取-手动"] = (autoClickStats["到店取-手动"] ?: 0) + 1
                         
                         handler.post {
                             Toast.makeText(this@AutoBuyAccessibilityService, "✅ 到店取按钮激进点击成功！", Toast.LENGTH_LONG).show()
                         }
                         
                         // 添加到抓包历史
                         try {
                             val networkMonitor = NetworkMonitorManager.getCurrentInstance()
                             networkMonitor?.addLog(
                                 NetworkMonitor.LogLevel.SUCCESS,
                                 "🎯 手动激进点击成功",
                                 "按钮: 到店取\n坐标: ($centerX, $centerY)\n时间: ${SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault()).format(Date())}\n触发方式: 手动激进点击"
                             )
                         } catch (e: Exception) {
                             logError("无法添加手动激进点击记录: ${e.message}")
                         }
                         
                     } else {
                         logError("❌ 手动激进点击失败")
                         
                         handler.post {
                             Toast.makeText(this@AutoBuyAccessibilityService, "❌ 到店取按钮激进点击失败", Toast.LENGTH_LONG).show()
                         }
                     }
                     
                     daodiequNode.recycle()
                 } else {
                     logError("❌ 未找到到店取按钮")
                     
                     handler.post {
                         Toast.makeText(this@AutoBuyAccessibilityService, "未找到到店取按钮", Toast.LENGTH_SHORT).show()
                     }
                 }
             }
         }
     }
     
     /**
      * 测试新点击系统
      */
     fun testNewClickSystem() {
         logInfo("🧪 === 开始测试新点击系统 ===")
         
         serviceScope.launch {
             withContext(Dispatchers.Main) {
                 val rootNode = rootInActiveWindow
                 if (rootNode == null) {
                     logInfo("⚠️ 无法获取根节点")
                     return@withContext
                 }
                 
                 // 查找"到店取"按钮
                 val daodiequNode = findNodeByTexts(rootNode, listOf("到店取"))
                 
                 if (daodiequNode != null) {
                     val rect = Rect()
                     daodiequNode.getBoundsInScreen(rect)
                     val centerX = rect.centerX()
                     val centerY = rect.centerY()
                     
                     logInfo("🎯 找到到店取按钮，开始测试新点击系统")
                     
                     // 测试1: JS注入点击
                     logInfo("🧪 测试1: JS注入点击")
                     performJavaScriptClick(centerX.toFloat(), centerY.toFloat(), "到店取")
                     
                     Thread.sleep(500)
                     
                     // 测试2: 基础手势点击
                     logInfo("🧪 测试2: 基础手势点击")
                     performGestureClick(centerX.toFloat(), centerY.toFloat())
                     
                     Thread.sleep(500)
                     
                     // 测试3: 强化手势点击
                     logInfo("🧪 测试3: 强化手势点击")
                     performAdvancedGestureClick(centerX.toFloat(), centerY.toFloat())
                     
                     Thread.sleep(500)
                     
                     // 测试4: 多次手势点击
                     logInfo("🧪 测试4: 多次手势点击")
                     performMultipleGestureClicks(centerX.toFloat(), centerY.toFloat(), 2)
                     
                     handler.post {
                         Toast.makeText(this@AutoBuyAccessibilityService, "新点击系统测试完成！", Toast.LENGTH_LONG).show()
                     }
                     
                     daodiequNode.recycle()
                 } else {
                     logInfo("❌ 未找到到店取按钮，无法测试")
                     handler.post {
                         Toast.makeText(this@AutoBuyAccessibilityService, "未找到到店取按钮", Toast.LENGTH_SHORT).show()
                     }
                 }
             }
         }
         
         logInfo("🧪 === 新点击系统测试完成 ===")
     }
     
     /**
      * 测试"到店取"按钮监控功能
      */
     fun testDaodiequMonitoring() {
         logInfo("🧪 开始测试到店取按钮监控功能")
         
         // 立即检查一次按钮状态
         checkDaodiequButtonStatus()
         
         // 重置监控状态
         daodiequButtonState = false
         daodiequLastCheckTime = 0L
         
         // 手动触发一次监控
         serviceScope.launch {
             withContext(Dispatchers.Main) {
                 monitorDaodiequButton()
             }
         }
         
         logInfo("🧪 到店取按钮监控测试完成")
         
         handler.post {
             Toast.makeText(this, "到店取按钮监控测试完成，请查看日志", Toast.LENGTH_SHORT).show()
         }
     }
     
     /**
      * 输出按钮坐标到日志
      */
    private fun logButtonCoordinates(buttonText: String, rect: Rect) {
        val centerX = rect.centerX()
        val centerY = rect.centerY()
        
        // 使用 "location" 作为 logcat 的 tag
        logInfo("=== 按钮坐标捕获 ===")
        logInfo("按钮文本: $buttonText")
        logInfo("坐标区域: left=${rect.left}, top=${rect.top}, right=${rect.right}, bottom=${rect.bottom}")
        logInfo("中心坐标: x=$centerX, y=$centerY")
        logInfo("按钮大小: width=${rect.width()}, height=${rect.height()}")
        logInfo("==================")
        
        // 将按钮坐标信息添加到抓包历史中
        try {
            val networkMonitor = NetworkMonitorManager.getCurrentInstance()
            if (networkMonitor != null) {
                val coordinateDetails = "坐标区域: left=${rect.left}, top=${rect.top}, right=${rect.right}, bottom=${rect.bottom}\n" +
                                      "中心坐标: x=$centerX, y=$centerY\n" +
                                      "按钮大小: width=${rect.width()}, height=${rect.height()}"
                
                networkMonitor.addLog(
                    NetworkMonitor.LogLevel.SUCCESS,
                    "📍 按钮坐标捕获: $buttonText",
                    coordinateDetails
                )
                
                logInfo("按钮坐标已保存到抓包历史: $buttonText")
            } else {
                logError("NetworkMonitor实例不存在，无法保存按钮坐标到抓包历史")
            }
        } catch (e: Exception) {
            logError("保存按钮坐标到抓包历史时出错: ${e.message}")
        }
        
        // 捕获页面JavaScript代码并保存到文件
        capturePageJavaScript(buttonText, centerX, centerY)
        
        // 也可以通过Toast显示（可选）
        handler.post {
            Toast.makeText(this, "捕获到按钮「$buttonText」坐标: ($centerX, $centerY)", Toast.LENGTH_SHORT).show()
        }
        
        // 发送广播通知悬浮窗更新
        sendBroadcast(Intent("com.example.vpnself.BUTTON_COORDINATE_CAPTURED").apply {
            putExtra("button_text", buttonText)
            putExtra("center_x", centerX)
            putExtra("center_y", centerY)
            putExtra("left", rect.left)
            putExtra("top", rect.top)
            putExtra("right", rect.right)
            putExtra("bottom", rect.bottom)
        })
    }
    
    /**
     * 捕获页面JavaScript代码并保存到文件
     */
    private fun capturePageJavaScript(buttonText: String, centerX: Int, centerY: Int) {
        // 不使用WebView，直接从AccessibilityNodeInfo获取页面内容
        serviceScope.launch(Dispatchers.IO) {
            try {
                val pageContent = capturePageContentFromAccessibility(buttonText, centerX, centerY)
                savePageContentToFile(buttonText, pageContent)
                analyzePageContent(buttonText, pageContent)
            } catch (e: Exception) {
                logError("获取页面内容失败: ${e.message}")
            }
        }
    }
    
    /**
     * 从AccessibilityNodeInfo获取页面内容
     */
    @RequiresApi(Build.VERSION_CODES.O)
    private fun capturePageContentFromAccessibility(buttonText: String, centerX: Int, centerY: Int): String {
        val rootNode = rootInActiveWindow
        if (rootNode == null) {
            return createEmptyPageContent(buttonText, centerX, centerY, "无法获取根节点")
        }
        
        val pageInfo = mutableMapOf<String, Any>()
        pageInfo["pageTitle"] = "微信小程序页面"
        pageInfo["pageUrl"] = "wechat://miniprogram"
        pageInfo["buttonInfo"] = mapOf(
            "text" to buttonText,
            "centerX" to centerX,
            "centerY" to centerY,
            "timestamp" to java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.getDefault()).format(java.util.Date())
        )
        
        // 收集页面所有文本内容
        val allTexts = mutableListOf<String>()
        val allNodes = mutableListOf<Map<String, Any>>()
        
        collectPageContent(rootNode, allTexts, allNodes, 0, 10) // 最多收集10层
        
        pageInfo["pageHTML"] = buildHtmlFromNodes(allNodes, allTexts, pageInfo)
        pageInfo["allTexts"] = allTexts
        pageInfo["nodeCount"] = allNodes.size
        pageInfo["textCount"] = allTexts.size
        
        // 收集按钮信息
        val buttons = mutableListOf<Map<String, Any>>()
        collectButtons(rootNode, buttons)
        pageInfo["buttons"] = buttons
        
        // 收集输入框信息
        val inputs = mutableListOf<Map<String, Any>>()
        collectInputs(rootNode, inputs)
        pageInfo["inputs"] = inputs
        
        // 收集可点击元素信息
        val clickables = mutableListOf<Map<String, Any>>()
        collectClickables(rootNode, clickables)
        pageInfo["clickables"] = clickables
        
        // 页面结构分析
        val pageStructure = analyzePageStructure(rootNode)
        pageInfo["pageStructure"] = pageStructure
        
        // 目标按钮诊断
        val targetButtonDiagnosis = mutableListOf<Map<String, Any>>()
        val targetButtons = listOf("确认信息并支付", "就是这家", "到店取")
        targetButtons.forEach { targetText ->
            val targetNode = findNodeByTexts(rootNode, listOf(targetText))
            if (targetNode != null) {
                val diagnosis = createButtonDiagnosis(targetNode, targetText)
                targetButtonDiagnosis.add(diagnosis)
                targetNode.recycle()
            }
        }
        pageInfo["targetButtonDiagnosis"] = targetButtonDiagnosis
        
        return com.google.gson.GsonBuilder().setPrettyPrinting().create().toJson(pageInfo)
    }
    
    /**
     * 创建空页面内容
     */
    private fun createEmptyPageContent(buttonText: String, centerX: Int, centerY: Int, reason: String): String {
        val pageInfo = mapOf(
            "pageTitle" to "获取失败",
            "pageUrl" to "unknown",
            "buttonInfo" to mapOf(
                "text" to buttonText,
                "centerX" to centerX,
                "centerY" to centerY,
                "timestamp" to java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.getDefault()).format(java.util.Date())
            ),
            "pageHTML" to "<html><head><title>获取失败</title></head><body><p>$reason</p></body></html>",
            "error" to reason
        )
        
        return com.google.gson.GsonBuilder().setPrettyPrinting().create().toJson(pageInfo)
    }
    
    /**
     * 递归收集页面内容
     */
    private fun collectPageContent(node: AccessibilityNodeInfo, allTexts: MutableList<String>, allNodes: MutableList<Map<String, Any>>, depth: Int, maxDepth: Int) {
        if (depth > maxDepth) return
        
        try {
            val nodeText = node.text?.toString() ?: ""
            val contentDesc = node.contentDescription?.toString() ?: ""
            val className = node.className?.toString() ?: ""
            
            // 收集文本内容
            if (nodeText.isNotBlank()) {
                allTexts.add(nodeText)
            }
            if (contentDesc.isNotBlank() && contentDesc != nodeText) {
                allTexts.add(contentDesc)
            }
            
            // 收集节点信息
            val rect = android.graphics.Rect()
            node.getBoundsInScreen(rect)
            
            val nodeInfo = mutableMapOf<String, Any>()
            nodeInfo["text"] = nodeText
            nodeInfo["contentDescription"] = contentDesc
            nodeInfo["className"] = className
            nodeInfo["bounds"] = mapOf(
                "left" to rect.left,
                "top" to rect.top,
                "right" to rect.right,
                "bottom" to rect.bottom
            )
            nodeInfo["isClickable"] = node.isClickable
            nodeInfo["isEnabled"] = node.isEnabled
            nodeInfo["isVisible"] = node.isVisibleToUser
            nodeInfo["depth"] = depth
            nodeInfo["childCount"] = node.childCount
            
            if (nodeText.isNotBlank() || contentDesc.isNotBlank() || node.isClickable) {
                allNodes.add(nodeInfo)
            }
            
            // 递归处理子节点
            for (i in 0 until node.childCount) {
                val child = node.getChild(i)
                if (child != null) {
                    collectPageContent(child, allTexts, allNodes, depth + 1, maxDepth)
                    child.recycle()
                }
            }
        } catch (e: Exception) {
            logError("收集节点内容时出错: ${e.message}")
        }
    }
    
    /**
     * 从节点信息构建HTML
     */
    private fun buildHtmlFromNodes(nodes: List<Map<String, Any>>, allTexts: List<String>, pageInfo: MutableMap<String, Any>): String {
        val html = StringBuilder()
        html.append("<!DOCTYPE html>\n")
        html.append("<html>\n")
        html.append("<head>\n")
        html.append("    <title>微信小程序页面</title>\n")
        html.append("    <meta charset=\"utf-8\">\n")
        html.append("    <style>\n")
        html.append("        .node { margin: 5px; padding: 10px; border: 2px solid #ccc; border-radius: 5px; }\n")
        html.append("        .clickable { background-color: #e6f3ff; border-color: #0066cc; }\n")
        html.append("        .clickable.disabled { background-color: #fff2cc; border-color: #ffb300; }\n")
        html.append("        .enabled { background-color: #f0f8f0; border-color: #4caf50; }\n")
        html.append("        .text-content { font-weight: bold; font-size: 14px; }\n")
        html.append("        .node-info { font-size: 12px; color: #666; line-height: 1.4; }\n")
        html.append("        .summary { background-color: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 20px; }\n")
        html.append("        .all-texts { background-color: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px; }\n")
        html.append("        .node-structure { background-color: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }\n")
        html.append("        .target-button-diagnosis { background-color: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-top: 20px; }\n")
        html.append("        .diagnosis-item { margin: 10px 0; padding: 15px; background-color: #f9f9f9; border-radius: 5px; }\n")
        html.append("        .status-summary { font-size: 14px; margin: 10px 0; font-weight: bold; }\n")
        html.append("        .coordinates { font-size: 13px; margin: 8px 0; color: #666; }\n")
        html.append("        .issues { margin: 10px 0; }\n")
        html.append("        .suggestions { margin: 10px 0; }\n")
        html.append("        .children-info { margin: 10px 0; font-size: 12px; }\n")
        html.append("        .issues ul, .suggestions ul, .children-info ul { margin: 5px 0; padding-left: 20px; }\n")
        html.append("        .issues li, .suggestions li, .children-info li { margin: 3px 0; }\n")
        html.append("        h1, h2 { color: #333; }\n")
        html.append("        h3 { color: #444; margin: 0 0 10px 0; }\n")
        html.append("        ul { max-height: 300px; overflow-y: auto; }\n")
        html.append("    </style>\n")
        html.append("</head>\n")
        html.append("<body>\n")
        html.append("    <h1>微信小程序页面结构</h1>\n")
        html.append("    <div class=\"summary\">\n")
        html.append("        <p>节点总数: ${nodes.size}</p>\n")
        html.append("        <p>文本总数: ${allTexts.size}</p>\n")
        html.append("        <p>捕获时间: ${java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())}</p>\n")
        html.append("    </div>\n")
        
        // 添加所有文本内容
        html.append("    <div class=\"all-texts\">\n")
        html.append("        <h2>页面所有文本内容</h2>\n")
        html.append("        <ul>\n")
        allTexts.forEach { text ->
            html.append("            <li>${escapeHtml(text)}</li>\n")
        }
        html.append("        </ul>\n")
        html.append("    </div>\n")
        
        // 添加节点结构
        html.append("    <div class=\"node-structure\">\n")
        html.append("        <h2>页面节点结构</h2>\n")
        nodes.forEach { node ->
            val isClickable = node["isClickable"] as Boolean
            val isEnabled = node["isEnabled"] as Boolean
            val isVisible = node["isVisible"] as Boolean
            
            val cssClass = when {
                isClickable && isEnabled -> "node clickable"
                isClickable && !isEnabled -> "node clickable disabled"
                !isClickable && isEnabled -> "node enabled"
                else -> "node"
            }
            
            html.append("        <div class=\"$cssClass\">\n")
            
            val text = node["text"] as String
            val contentDesc = node["contentDescription"] as String
            val className = node["className"] as String
            
            if (text.isNotBlank()) {
                html.append("            <div class=\"text-content\">文本: ${escapeHtml(text)}</div>\n")
                
                // 特别标记目标按钮
                val targetButtons = listOf("确认信息并支付", "就是这家", "到店取")
                if (targetButtons.any { text.contains(it, ignoreCase = true) }) {
                    html.append("            <div style=\"color: red; font-weight: bold;\">🎯 目标按钮!</div>\n")
                }
            }
            if (contentDesc.isNotBlank()) {
                html.append("            <div class=\"text-content\">描述: ${escapeHtml(contentDesc)}</div>\n")
            }
            
            html.append("            <div class=\"node-info\">\n")
            html.append("                类名: ${escapeHtml(className)}<br>\n")
            
            // 突出显示按钮状态
            val clickableStatus = if (isClickable) "<span style='color: green;'>✅ 可点击</span>" else "<span style='color: red;'>❌ 不可点击</span>"
            val enabledStatus = if (isEnabled) "<span style='color: green;'>✅ 启用</span>" else "<span style='color: red;'>❌ 禁用</span>"
            val visibleStatus = if (isVisible) "<span style='color: green;'>✅ 可见</span>" else "<span style='color: red;'>❌ 不可见</span>"
            
            html.append("                $clickableStatus<br>\n")
            html.append("                $enabledStatus<br>\n")
            html.append("                $visibleStatus<br>\n")
            html.append("                深度: ${node["depth"]}<br>\n")
            html.append("                子节点数: ${node["childCount"]}<br>\n")
            val bounds = node["bounds"] as Map<String, Any>
            html.append("                位置: (${bounds["left"]}, ${bounds["top"]}) - (${bounds["right"]}, ${bounds["bottom"]})<br>\n")
            html.append("                中心坐标: (${(bounds["left"] as Int + bounds["right"] as Int) / 2}, ${(bounds["top"] as Int + bounds["bottom"] as Int) / 2})\n")
            html.append("            </div>\n")
            html.append("        </div>\n")
        }
        html.append("    </div>\n")
        
        // 添加目标按钮诊断信息
        if (pageInfo.containsKey("targetButtonDiagnosis")) {
            val diagnosisList = pageInfo["targetButtonDiagnosis"] as List<Map<String, Any>>
            if (diagnosisList.isNotEmpty()) {
                html.append("    <div class=\"target-button-diagnosis\">\n")
                html.append("        <h2>🎯 目标按钮诊断报告</h2>\n")
                
                diagnosisList.forEach { diagnosis ->
                    val buttonText = diagnosis["buttonText"] as String
                    val isClickable = diagnosis["isClickable"] as Boolean
                    val isEnabled = diagnosis["isEnabled"] as Boolean
                    val isVisible = diagnosis["isVisible"] as Boolean
                    val issues = diagnosis["issues"] as List<String>
                    val suggestions = diagnosis["suggestions"] as List<String>
                    val bounds = diagnosis["bounds"] as Map<String, Any>
                    
                    val statusColor = when {
                        isClickable && isEnabled -> "#4caf50"  // 绿色
                        !isClickable || !isEnabled -> "#f44336"  // 红色
                        else -> "#ff9800"  // 橙色
                    }
                    
                    html.append("        <div class=\"diagnosis-item\" style=\"border-left: 4px solid $statusColor;\">\n")
                    html.append("            <h3>$buttonText</h3>\n")
                    
                    // 状态摘要
                    html.append("            <div class=\"status-summary\">\n")
                    val clickableIcon = if (isClickable) "✅" else "❌"
                    val enabledIcon = if (isEnabled) "✅" else "❌"
                    val visibleIcon = if (isVisible) "✅" else "❌"
                    html.append("                <span>$clickableIcon 可点击: $isClickable</span> | \n")
                    html.append("                <span>$enabledIcon 启用: $isEnabled</span> | \n")
                    html.append("                <span>$visibleIcon 可见: $isVisible</span>\n")
                    html.append("            </div>\n")
                    
                    // 坐标信息
                    html.append("            <div class=\"coordinates\">\n")
                    html.append("                <strong>坐标:</strong> (${bounds["centerX"]}, ${bounds["centerY"]}) | \n")
                    html.append("                <strong>大小:</strong> ${bounds["width"]} x ${bounds["height"]}\n")
                    html.append("            </div>\n")
                    
                    // 问题分析
                    if (issues.isNotEmpty()) {
                        html.append("            <div class=\"issues\">\n")
                        html.append("                <strong>问题分析:</strong>\n")
                        html.append("                <ul>\n")
                        issues.forEach { issue ->
                            html.append("                    <li>${escapeHtml(issue)}</li>\n")
                        }
                        html.append("                </ul>\n")
                        html.append("            </div>\n")
                    }
                    
                    // 建议方案
                    if (suggestions.isNotEmpty()) {
                        html.append("            <div class=\"suggestions\">\n")
                        html.append("                <strong>建议方案:</strong>\n")
                        html.append("                <ul>\n")
                        suggestions.forEach { suggestion ->
                            html.append("                    <li>${escapeHtml(suggestion)}</li>\n")
                        }
                        html.append("                </ul>\n")
                        html.append("            </div>\n")
                    }
                    
                    // 子节点信息
                    val children = diagnosis["children"] as List<Map<String, Any>>
                    if (children.isNotEmpty()) {
                        html.append("            <div class=\"children-info\">\n")
                        html.append("                <strong>子节点状态:</strong>\n")
                        html.append("                <ul>\n")
                        children.forEach { child ->
                            val childText = child["text"] as String
                            val childClickable = child["isClickable"] as Boolean
                            val childEnabled = child["isEnabled"] as Boolean
                            val childIcon = if (childClickable && childEnabled) "✅" else "❌"
                            html.append("                    <li>$childIcon ${escapeHtml(childText.take(20))}: 可点击=$childClickable, 启用=$childEnabled</li>\n")
                        }
                        html.append("                </ul>\n")
                        html.append("            </div>\n")
                    }
                    
                    html.append("        </div>\n")
                }
                
                html.append("    </div>\n")
            }
        }
        
        html.append("</body>\n")
        html.append("</html>\n")
        
        return html.toString()
    }
    
    /**
     * 转义HTML特殊字符
     */
    private fun escapeHtml(text: String): String {
        return text.replace("&", "&amp;")
                  .replace("<", "&lt;")
                  .replace(">", "&gt;")
                  .replace("\"", "&quot;")
                  .replace("'", "&#39;")
    }
    
    /**
     * 收集按钮信息
     */
    private fun collectButtons(node: AccessibilityNodeInfo, buttons: MutableList<Map<String, Any>>) {
        try {
            val nodeText = node.text?.toString() ?: ""
            val contentDesc = node.contentDescription?.toString() ?: ""
            val className = node.className?.toString() ?: ""
            
            // 判断是否为按钮
            if (node.isClickable && (nodeText.isNotBlank() || contentDesc.isNotBlank())) {
                val rect = android.graphics.Rect()
                node.getBoundsInScreen(rect)
                
                val buttonInfo = mapOf(
                    "text" to nodeText,
                    "contentDescription" to contentDesc,
                    "className" to className,
                    "centerX" to rect.centerX(),
                    "centerY" to rect.centerY(),
                    "bounds" to mapOf(
                        "left" to rect.left,
                        "top" to rect.top,
                        "right" to rect.right,
                        "bottom" to rect.bottom
                    )
                )
                buttons.add(buttonInfo)
            }
            
            // 递归处理子节点
            for (i in 0 until node.childCount) {
                val child = node.getChild(i)
                if (child != null) {
                    collectButtons(child, buttons)
                    child.recycle()
                }
            }
        } catch (e: Exception) {
            logError("收集按钮信息时出错: ${e.message}")
        }
    }
    
    /**
     * 收集输入框信息
     */
    @RequiresApi(Build.VERSION_CODES.O)
    private fun collectInputs(node: AccessibilityNodeInfo, inputs: MutableList<Map<String, Any>>) {
        try {
            val className = node.className?.toString() ?: ""
            
            // 判断是否为输入框
            if (node.isEditable || className.contains("EditText", ignoreCase = true)) {
                val rect = android.graphics.Rect()
                node.getBoundsInScreen(rect)
                
                val inputInfo = mapOf(
                    "text" to (node.text?.toString() ?: ""),
                    "hint" to (node.hintText?.toString() ?: ""),
                    "className" to className,
                    "isEditable" to node.isEditable,
                    "bounds" to mapOf(
                        "left" to rect.left,
                        "top" to rect.top,
                        "right" to rect.right,
                        "bottom" to rect.bottom
                    )
                )
                inputs.add(inputInfo)
            }
            
            // 递归处理子节点
            for (i in 0 until node.childCount) {
                val child = node.getChild(i)
                if (child != null) {
                    collectInputs(child, inputs)
                    child.recycle()
                }
            }
        } catch (e: Exception) {
            logError("收集输入框信息时出错: ${e.message}")
        }
    }
    
    /**
     * 收集可点击元素信息
     */
    private fun collectClickables(node: AccessibilityNodeInfo, clickables: MutableList<Map<String, Any>>) {
        try {
            if (node.isClickable) {
                val rect = android.graphics.Rect()
                node.getBoundsInScreen(rect)
                
                val clickableInfo = mapOf(
                    "text" to (node.text?.toString() ?: ""),
                    "contentDescription" to (node.contentDescription?.toString() ?: ""),
                    "className" to (node.className?.toString() ?: ""),
                    "centerX" to rect.centerX(),
                    "centerY" to rect.centerY(),
                    "bounds" to mapOf(
                        "left" to rect.left,
                        "top" to rect.top,
                        "right" to rect.right,
                        "bottom" to rect.bottom
                    )
                )
                clickables.add(clickableInfo)
            }
            
            // 递归处理子节点
            for (i in 0 until node.childCount) {
                val child = node.getChild(i)
                if (child != null) {
                    collectClickables(child, clickables)
                    child.recycle()
                }
            }
        } catch (e: Exception) {
            logError("收集可点击元素信息时出错: ${e.message}")
        }
    }
    
    /**
     * 分析页面结构
     */
    private fun analyzePageStructure(node: AccessibilityNodeInfo): Map<String, Any> {
        val structure = mutableMapOf<String, Any>()
        
        try {
            // 统计各种类型的节点
            val nodeStats = mutableMapOf<String, Int>()
            val textStats = mutableMapOf<String, Int>()
            
            countNodeTypes(node, nodeStats, textStats)
            
            structure["nodeTypeStats"] = nodeStats
            structure["textLengthStats"] = textStats
            structure["totalDepth"] = calculateMaxDepth(node, 0)
            
            // 页面特征分析
            val features = mutableListOf<String>()
            val allTexts = mutableListOf<String>()
            collectTextsFromNode(node, allTexts, 10)
            
            val allText = allTexts.joinToString(" ")
            
            when {
                allText.contains("支付", ignoreCase = true) -> features.add("支付页面")
                allText.contains("购买", ignoreCase = true) -> features.add("购买页面")
                allText.contains("订单", ignoreCase = true) -> features.add("订单页面")
                allText.contains("购物车", ignoreCase = true) -> features.add("购物车页面")
                allText.contains("登录", ignoreCase = true) -> features.add("登录页面")
            }
            
            structure["pageFeatures"] = features
            
        } catch (e: Exception) {
            logError("分析页面结构时出错: ${e.message}")
            structure["error"] = e.message!!
        }
        
        return structure
    }
    
    /**
     * 统计节点类型
     */
    private fun countNodeTypes(node: AccessibilityNodeInfo, nodeStats: MutableMap<String, Int>, textStats: MutableMap<String, Int>) {
        try {
            val className = node.className?.toString() ?: "Unknown"
            val simpleClassName = className.substringAfterLast('.')
            nodeStats[simpleClassName] = (nodeStats[simpleClassName] ?: 0) + 1
            
            val text = node.text?.toString() ?: ""
            if (text.isNotBlank()) {
                val lengthRange = when {
                    text.length <= 5 -> "1-5字符"
                    text.length <= 10 -> "6-10字符"
                    text.length <= 20 -> "11-20字符"
                    text.length <= 50 -> "21-50字符"
                    else -> "50+字符"
                }
                textStats[lengthRange] = (textStats[lengthRange] ?: 0) + 1
            }
            
            // 递归处理子节点
            for (i in 0 until node.childCount) {
                val child = node.getChild(i)
                if (child != null) {
                    countNodeTypes(child, nodeStats, textStats)
                    child.recycle()
                }
            }
        } catch (e: Exception) {
            logError("统计节点类型时出错: ${e.message}")
        }
    }
    
    /**
     * 计算最大深度
     */
    private fun calculateMaxDepth(node: AccessibilityNodeInfo, currentDepth: Int): Int {
        var maxDepth = currentDepth
        
        try {
            for (i in 0 until node.childCount) {
                val child = node.getChild(i)
                if (child != null) {
                    val childDepth = calculateMaxDepth(child, currentDepth + 1)
                    maxDepth = maxOf(maxDepth, childDepth)
                    child.recycle()
                }
            }
        } catch (e: Exception) {
            logError("计算最大深度时出错: ${e.message}")
        }
        
        return maxDepth
    }
    
    /**
     * 将页面内容保存到文件
     */
    private fun savePageContentToFile(buttonText: String, pageContent: String) {
        try {
            // 创建文件名（包含时间戳和按钮名称）
            val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
            val sanitizedButtonText = buttonText.replace("[^a-zA-Z0-9\\u4e00-\\u9fa5]".toRegex(), "_")
            val fileName = "page_capture_${sanitizedButtonText}_${timestamp}.html"
            
            // 使用外部存储目录，用户可以访问
            val pageDir = File(getExternalFilesDir(null), "captured_pages")
            if (!pageDir.exists()) {
                val created = pageDir.mkdirs()
                logInfo("创建页面目录: ${pageDir.absolutePath}, 结果: $created")
            }
            
            val pageFile = File(pageDir, fileName)
            logInfo("准备保存页面文件: ${pageFile.absolutePath}")
            
            // 从JSON中提取HTML内容
            val jsonObj = com.google.gson.JsonParser.parseString(pageContent).asJsonObject
            val htmlContent = jsonObj.get("pageHTML")?.asString ?: ""
            
            // 写入HTML文件
            FileWriter(pageFile).use { writer ->
                writer.write(htmlContent)
            }
            
            // 同时保存JSON文件
            val jsonFileName = "page_data_${sanitizedButtonText}_${timestamp}.json"
            val jsonFile = File(pageDir, jsonFileName)
            FileWriter(jsonFile).use { writer ->
                writer.write(pageContent)
            }
            
            // 记录到日志
            logInfo("页面HTML已保存到文件: ${pageFile.absolutePath}")
            logInfo("页面JSON已保存到文件: ${jsonFile.absolutePath}")
            logInfo("HTML文件大小: ${pageFile.length()} 字节")
            logInfo("JSON文件大小: ${jsonFile.length()} 字节")
            
            // 添加到抓包历史
            try {
                val networkMonitor = NetworkMonitorManager.getCurrentInstance()
                networkMonitor?.addLog(
                    NetworkMonitor.LogLevel.SUCCESS,
                    "📄 页面内容已保存: $buttonText",
                    "HTML文件: ${pageFile.name}\nJSON文件: ${jsonFile.name}\n路径: ${pageDir.absolutePath}"
                )
            } catch (e: Exception) {
                logError("无法添加页面保存记录到抓包历史: ${e.message}")
            }
            
        } catch (e: Exception) {
            logError("保存页面内容失败: ${e.message}")
            logError("错误堆栈: ${e.stackTraceToString()}")
        }
    }
    
    /**
     * 分析页面内容并输出关键信息到logcat
     */
    private fun analyzePageContent(buttonText: String, pageContent: String) {
        try {
            logInfo("=== 页面内容分析报告: $buttonText ===")
            
            val jsonObj = com.google.gson.JsonParser.parseString(pageContent).asJsonObject
            
            logInfo("页面标题: ${jsonObj.get("pageTitle")?.asString}")
            logInfo("页面URL: ${jsonObj.get("pageUrl")?.asString}")
            
            val nodeCount = jsonObj.get("nodeCount")?.asInt ?: 0
            val textCount = jsonObj.get("textCount")?.asInt ?: 0
            logInfo("节点总数: $nodeCount")
            logInfo("文本总数: $textCount")
            
            // 分析按钮
            val buttons = jsonObj.getAsJsonArray("buttons")
            logInfo("按钮数量: ${buttons?.size() ?: 0}")
            
            // 分析输入框
            val inputs = jsonObj.getAsJsonArray("inputs")
            logInfo("输入框数量: ${inputs?.size() ?: 0}")
            
            // 分析可点击元素
            val clickables = jsonObj.getAsJsonArray("clickables")
            logInfo("可点击元素数量: ${clickables?.size() ?: 0}")
            
            // 分析页面特征
            val pageStructure = jsonObj.getAsJsonObject("pageStructure")
            val features = pageStructure?.getAsJsonArray("pageFeatures")
            if (features != null && features.size() > 0) {
                val featureList = mutableListOf<String>()
                for (i in 0 until features.size()) {
                    featureList.add(features[i].asString)
                }
                logInfo("页面特征: ${featureList.joinToString(", ")}")
            }
            
            logInfo("=== 页面内容分析报告结束 ===")
            
        } catch (e: Exception) {
            logError("页面内容分析失败: ${e.message}")
        }
    }
    
    /**
     * 获取已捕获的按钮坐标
     */
    fun getCapturedCoordinates(): Map<String, Rect> {
        return capturedCoordinates.toMap()
    }
    
    /**
     * 清空已捕获的坐标
     */
    fun clearCapturedCoordinates() {
        capturedCoordinates.clear()
        logInfo("已清空捕获的按钮坐标")
    }
    
    /**
     * 获取已保存的JS文件列表
     */
    fun getSavedJavaScriptFiles(): List<File> {
        return try {
            val jsDir = File(filesDir, "captured_js")
            if (jsDir.exists() && jsDir.isDirectory) {
                jsDir.listFiles()?.filter { it.isFile && it.name.endsWith(".txt") }?.sortedByDescending { it.lastModified() } ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            logError("获取JS文件列表失败: ${e.message}")
            emptyList()
        }
    }
    
    /**
     * 清空所有保存的JS文件
     */
    fun clearSavedJavaScriptFiles() {
        try {
            val jsDir = File(getExternalFilesDir(null), "captured_js")
            if (!jsDir.exists()) {
                logInfo("JS文件目录不存在，无需清理")
                return
            }
            
            val files = jsDir.listFiles()
            var deletedCount = 0
            
            files?.forEach { file ->
                if (file.isFile) {
                    if (file.delete()) {
                        deletedCount++
                        logInfo("已删除: ${file.name}")
                    } else {
                        logError("删除失败: ${file.name}")
                    }
                }
            }
            
            logInfo("已清空 $deletedCount 个JS文件")
            
            // 通知用户
            handler.post {
                Toast.makeText(this, "已清空 $deletedCount 个JS文件", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            logError("清空JS文件失败: ${e.message}")
        }
    }
    
         /**
      * JavaScript Console接口 - 用于拦截console.log输出
      */
     inner class ConsoleJavaScriptInterface {
         @JavascriptInterface
         fun log(message: String) {
             logInfo("🌐 JavaScript Console.log: $message")
         }
         
         @JavascriptInterface
         fun error(message: String) {
             logError("🌐 JavaScript Console.error: $message")
         }
         
         @JavascriptInterface
         fun warn(message: String) {
             logInfo("🌐 JavaScript Console.warn: $message")
         }
         
         @JavascriptInterface
         fun info(message: String) {
             logInfo("🌐 JavaScript Console.info: $message")
         }
         
         @JavascriptInterface
         fun debug(message: String) {
             logDebug("🌐 JavaScript Console.debug: $message")
         }
     }
     
     /**
      * 输出已保存JS文件的信息到日志
      */
     fun logSavedJavaScriptFiles() {
        try {
            val jsDir = File(getExternalFilesDir(null), "captured_js")
            if (!jsDir.exists()) {
                logInfo("JS文件目录不存在: ${jsDir.absolutePath}")
                return
            }
            
            val files = jsDir.listFiles()?.filter { it.isFile && it.name.endsWith(".txt") }
            
            if (files.isNullOrEmpty()) {
                logInfo("暂无保存的JS文件")
                logInfo("JS文件目录: ${jsDir.absolutePath}")
            } else {
                logInfo("=== 已保存的JS文件列表 ===")
                logInfo("总数: ${files.size}")
                logInfo("目录: ${jsDir.absolutePath}")
                
                files.forEachIndexed { index, file ->
                    val sizeKB = String.format("%.1f", file.length() / 1024.0)
                    val lastModified = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date(file.lastModified()))
                    logInfo("${index + 1}. ${file.name}")
                    logInfo("   路径: ${file.absolutePath}")
                    logInfo("   大小: ${sizeKB}KB")
                    logInfo("   修改时间: $lastModified")
                    logInfo("   --------")
                }
            }
            
            logInfo("========================")
        } catch (e: Exception) {
            logError("列出JS文件失败: ${e.message}")
        }
    }
    
    /**
     * 获取自动点击统计信息
     */
    fun getAutoClickStats(): Map<String, Int> {
        return autoClickStats.toMap()
    }
    
    /**
     * 清空自动点击统计
     */
    fun clearAutoClickStats() {
        autoClickStats.clear()
        lastClickTime = 0L
        logInfo("已清空自动点击统计")
        Toast.makeText(this, "已清空自动点击统计", Toast.LENGTH_SHORT).show()
    }
    
    /**
     * 输出当前自动点击统计到日志
     */
    fun logAutoClickStats() {
        if (autoClickStats.isEmpty()) {
            logInfo("暂无自动点击统计数据")
            return
        }
        
        logInfo("=== 当前自动点击统计 ===")
        autoClickStats.forEach { (buttonText, count) ->
            logInfo("「$buttonText」: $count 次")
        }
        logInfo("总点击次数: ${autoClickStats.values.sum()}")
        logInfo("========================")
    }

}