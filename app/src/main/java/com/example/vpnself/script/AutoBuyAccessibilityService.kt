package com.example.vpnself.script

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Path
import android.graphics.Rect
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import kotlinx.coroutines.*
import java.util.concurrent.atomic.AtomicBoolean

class AutoBuyAccessibilityService : AccessibilityService() {
    
    companion object {
        private const val TAG = "AutoBuyService"
        var instance: AutoBuyAccessibilityService? = null
        private const val WECHAT_PACKAGE = "com.tencent.mm"
        private const val CLICK_INTERVAL = 500L // 500ms间隔
    }
    
    private val handler = Handler(Looper.getMainLooper())
    private val isRunning = AtomicBoolean(false)
    private val networkMonitor by lazy { NetworkMonitor(this) }
    private var webView: WebView? = null
    private var lastApiCall: String? = null
    private var capturedApis = mutableSetOf<String>()
    
    // 性能优化标记
    private var isJsInjected = AtomicBoolean(false)
    private var lastEventTime = 0L
    private val eventThrottleMs = 500L // 事件节流，500ms内只处理一次
    
    // 脚本配置
    private var targetButtonTexts = listOf("按个买", "购买", "立即购买", "抢购")
    private var refreshButtonTexts = listOf("按箱买", "刷新")
    private var clickInterval = CLICK_INTERVAL
    
    // 协程作用域，用于替代GlobalScope
    private val serviceScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    
    override fun onCreate() {
        super.onCreate()
        instance = this
        PerformanceMonitor.enable()
        initWebView()
        Log.d(TAG, "抢购脚本服务已启动")
    }
    
    override fun onDestroy() {
        super.onDestroy()
        instance = null
        stopScript()
        serviceScope.cancel() // 取消所有协程
        handler.post {
            webView?.destroy()
        }
        Log.d(TAG, "抢购脚本服务已销毁")
    }
    
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        event?.let { handleAccessibilityEvent(it) }
    }
    
    override fun onInterrupt() {
        Log.d(TAG, "无障碍服务中断")
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
                }
                Log.d(TAG, "WebView初始化完成")
            } catch (e: Exception) {
                Log.e(TAG, "WebView初始化失败: ${e.message}")
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
            }
        }
    }
    
    private fun checkMiniProgramPage() {
        val rootNode = rootInActiveWindow ?: return
        
        // 检查是否在小程序页面
        if (isMiniProgramPage(rootNode)) {
            Log.d(TAG, "检测到小程序页面")
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
                        Log.d(TAG, "JavaScript注入完成: $result")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "JavaScript注入失败: ${e.message}")
                    isJsInjected.set(false) // 重置标记，允许重试
                }
            }
        }
    }
    
    fun startScript() {
        if (isRunning.compareAndSet(false, true)) {
            Log.d(TAG, "开始执行抢购脚本")
            Toast.makeText(this, "抢购脚本已启动", Toast.LENGTH_SHORT).show()
            
            // 设置网络监控回调
            networkMonitor.setOnStockFoundCallback { hasStock ->
                if (hasStock) {
                    Log.d(TAG, "发现库存，准备抢购")
                    // 自动执行抢购逻辑
                    serviceScope.launch {
                        try {
                            if (networkMonitor.getPurchaseApis().isNotEmpty()) {
                                // 使用API重放进行抢购
                                val success = networkMonitor.autoPurchase()
                                if (success) {
                                    Log.d(TAG, "抢购成功！")
                                }
                            } else {
                                // 回退到UI操作
                                withContext(Dispatchers.Main) {
                                    startAutoBuyProcess()
                                }
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "抢购过程出错: ${e.message}")
                        }
                    }
                }
            }
            
            networkMonitor.setOnApiCapturedCallback { request ->
                // 通知悬浮窗更新
                sendBroadcast(Intent("com.example.vpnself.API_CAPTURED").apply {
                    putExtra("api", "${request.method} ${request.url}")
                    putExtra("response", request.responseBody)
                })
            }
            
            // 启动悬浮窗
            startFloatingWindow()
            
            // 注入JS监听网络请求
            injectJavaScript()
            
            // 开始自动库存检查
            serviceScope.launch {
                try {
                    networkMonitor.autoCheckStock()
                } catch (e: Exception) {
                    Log.e(TAG, "库存检查出错: ${e.message}")
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
            Log.d(TAG, "停止执行抢购脚本")
            Toast.makeText(this, "抢购脚本已停止", Toast.LENGTH_SHORT).show()
            
            // 重置JS注入状态
            isJsInjected.set(false)
            
            // 清除网络监控数据
            networkMonitor.clearData()
            
            // 停止悬浮窗
            stopFloatingWindow()
        }
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
                        Log.d(TAG, "成功点击购买按钮")
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
                Log.e(TAG, "抢购过程出错: ${e.message}")
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
        
        for (text in texts) {
            if (nodeText.contains(text) || contentDesc.contains(text)) {
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
    
    private fun performClick(node: AccessibilityNodeInfo): Boolean {
        return if (node.isClickable) {
            node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        } else {
            // 如果节点不可点击，尝试坐标点击
            val rect = Rect()
            node.getBoundsInScreen(rect)
            performGestureClick(rect.centerX().toFloat(), rect.centerY().toFloat())
        }
    }
    
    private fun performGestureClick(x: Float, y: Float): Boolean {
        val path = Path().apply { moveTo(x, y) }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 100))
            .build()
            
        return dispatchGesture(gesture, null, null)
    }
    
    private fun startFloatingWindow() {
        val intent = Intent(this, FloatingWindowService::class.java)
        startService(intent)
    }
    
    private fun stopFloatingWindow() {
        val intent = Intent(this, FloatingWindowService::class.java)
        stopService(intent)
    }
    
    fun getScriptStatus(): String {
        return if (isRunning.get()) "运行中" else "已停止"
    }
    
    fun getCapturedApis(): Set<String> {
        return networkMonitor.getCapturedRequests().map { "${it.method} ${it.url}" }.toSet()
    }
    

} 