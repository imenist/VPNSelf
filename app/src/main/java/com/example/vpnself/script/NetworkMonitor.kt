package com.example.vpnself.script

import android.content.Context
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.gson.Gson
import com.google.gson.JsonParser
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

/**
 * 网络监控类，用于拦截和分析小程序的API调用
 * 支持API重放、库存检查、自动下单等功能
 */
class NetworkMonitor(private val context: Context) {
    
    companion object {
        private const val TAG = "NetworkMonitor"
    }
    
    private val gson = Gson()
    private val httpClient = OkHttpClient.Builder().build()
    private val capturedRequests = ConcurrentHashMap<String, CapturedRequest>()
    private val apiCallCount = AtomicInteger(0)
    
    // 新增：内部日志收集
    private val currentSessionLogs = mutableListOf<LogEntry>()
    private val allSessionsHistory = mutableListOf<CaptureSession>()
    private val maxLogEntries = 500 // 增加单次会话日志数量
    private val maxSessions = 50 // 最多保存50个会话
    private val dateFormat = SimpleDateFormat("MM-dd HH:mm:ss.SSS", Locale.getDefault())
    private val sessionDateFormat = SimpleDateFormat("MM-dd HH:mm:ss", Locale.getDefault())
    private var isCapturing = false
    private var captureStartTime = 0L
    private var currentSessionId = ""
    
    // API分类
    private val stockCheckApis = mutableSetOf<String>()
    private val purchaseApis = mutableSetOf<String>()
    private val userTokens = mutableMapOf<String, String>()
    
    // 回调接口
    private var onStockFoundCallback: ((Boolean) -> Unit)? = null
    private var onApiCapturedCallback: ((CapturedRequest) -> Unit)? = null
    private var onLogUpdatedCallback: ((List<LogEntry>) -> Unit)? = null
    
    /**
     * 日志条目数据类
     */
    data class LogEntry(
        val timestamp: String,
        val level: LogLevel,
        val message: String,
        val details: String? = null
    )
    
    enum class LogLevel {
        INFO, DEBUG, ERROR, SUCCESS
    }
    
    /**
     * 捕获的请求数据类
     */
    data class CapturedRequest(
        val id: String,
        val method: String,
        val url: String,
        val headers: Map<String, String>,
        val requestBody: String,
        val responseBody: String,
        val timestamp: Long,
        var isStockApi: Boolean = false,
        var isPurchaseApi: Boolean = false,
        var hasStock: Boolean? = null
    )
    
    /**
     * 库存信息数据类
     */
    data class StockInfo(
        val productId: String,
        val available: Boolean,
        val quantity: Int,
        val price: Double,
        val lastCheckTime: Long
    )
    
    init {
        addLog(LogLevel.INFO, "网络监控器初始化完成", "NetworkMonitor实例已创建，等待开始抓包")
        Log.d(TAG, "网络监控器初始化完成")
    }
    
    /**
     * 添加内部日志
     */
    fun addLog(level: LogLevel, message: String, details: String? = null) {
        synchronized(currentSessionLogs) {
            // 限制当前会话日志数量
            if (currentSessionLogs.size >= maxLogEntries) {
                currentSessionLogs.removeAt(0)
            }
            
            val logEntry = LogEntry(
                timestamp = dateFormat.format(Date()),
                level = level,
                message = message,
                details = details
            )
            
            currentSessionLogs.add(logEntry)
            
            // 触发UI更新回调
            onLogUpdatedCallback?.invoke(currentSessionLogs.toList())
        }
        
        // 同时输出到系统日志
        when (level) {
            LogLevel.INFO -> Log.i(TAG, message + if (details != null) " - $details" else "")
            LogLevel.DEBUG -> Log.d(TAG, message + if (details != null) " - $details" else "")
            LogLevel.ERROR -> Log.e(TAG, message + if (details != null) " - $details" else "")
            LogLevel.SUCCESS -> Log.i(TAG, "✓ $message" + if (details != null) " - $details" else "")
        }
    }
    
    /**
     * 开始抓包
     */
    fun startCapture() {
        isCapturing = true
        captureStartTime = System.currentTimeMillis()
        currentSessionId = "session_${captureStartTime}"
        
        // 清除当前会话数据，但保留历史会话
        clearCurrentSessionData()
        
        addLog(LogLevel.SUCCESS, "🚀 抓包会话已开始", "会话ID: $currentSessionId")
        addLog(LogLevel.INFO, "⏳ 等待WebView加载和脚本注入", "请确保已正确配置WebView")
    }
    
    /**
     * 停止抓包
     */
    fun stopCapture(): CaptureSession {
        isCapturing = false
        val endTime = System.currentTimeMillis()
        val duration = (endTime - captureStartTime) / 1000
        
        addLog(LogLevel.SUCCESS, "🏁 抓包会话已完成", 
            "持续时间: ${duration}秒, 捕获请求: ${capturedRequests.size}个, 日志条目: ${currentSessionLogs.size}个")
        
        // 计算流量统计
        var uploadBytes = 0L
        var downloadBytes = 0L
        capturedRequests.values.forEach { request ->
            uploadBytes += request.requestBody.length
            downloadBytes += request.responseBody.length
        }
        
        val session = CaptureSession(
            sessionId = currentSessionId,
            sessionName = sessionDateFormat.format(Date(captureStartTime)),
            startTime = captureStartTime,
            endTime = endTime,
            duration = duration.toInt(),
            capturedRequests = capturedRequests.values.toList(),
            logs = currentSessionLogs.toList(),
            requestCount = capturedRequests.size,
            uploadBytes = uploadBytes,
            downloadBytes = downloadBytes
        )
        
        // 保存会话到历史记录
        saveSessionToHistory(session)
        
        return session
    }
    
    /**
     * 抓包会话数据类
     */
    data class CaptureSession(
        val sessionId: String,
        val sessionName: String, // 显示名称，如 "05-30 14:32:15"
        val startTime: Long,
        val endTime: Long,
        val duration: Int,
        val capturedRequests: List<CapturedRequest>,
        val logs: List<LogEntry>,
        val requestCount: Int,
        val uploadBytes: Long = 0,
        val downloadBytes: Long = 0
    )

    /**
     * 🚀 创建HTTP层面的按钮点击注入脚本
     */
    fun getButtonClickInjectionScript(): String {
        addLog(LogLevel.INFO, "🚀 准备注入HTTP层面按钮点击脚本", "专门针对'到店取'按钮的持续点击")
        
        return """
            (function() {
                console.log('🎯 === HTTP层面按钮点击注入开始 ===');
                
                // 全局变量
                window.AUTODAODIEQU_ACTIVE = true;
                window.AUTODAODIEQU_CLICK_COUNT = 0;
                window.AUTODAODIEQU_FOUND_BUTTONS = [];
                
                // 🔍 查找"到店取"按钮的多种方法
                function findDaodiequButtons() {
                    const buttons = [];
                    
                    // 方法1: 通过文本内容查找
                    const allElements = document.querySelectorAll('*');
                    allElements.forEach(el => {
                        const text = el.textContent || el.innerText || '';
                        if (text.includes('到店取') || text.includes('到店自取')) {
                            buttons.push({
                                element: el,
                                method: '文本匹配',
                                text: text.trim(),
                                id: el.id || '无ID',
                                className: el.className || '无类名',
                                tagName: el.tagName
                            });
                        }
                    });
                    
                    // 方法2: 通过ID查找
                    const possibleIds = ['daodiequ', 'pickup', 'store-pickup', 'self-pickup'];
                    possibleIds.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) {
                            buttons.push({
                                element: el,
                                method: 'ID匹配',
                                text: el.textContent || el.innerText || '',
                                id: el.id,
                                className: el.className || '无类名',
                                tagName: el.tagName
                            });
                        }
                    });
                    
                    // 方法3: 通过类名查找
                    const possibleClasses = ['daodiequ', 'pickup', 'btn-pickup', 'store-pickup'];
                    possibleClasses.forEach(className => {
                        const elements = document.getElementsByClassName(className);
                        Array.from(elements).forEach(el => {
                            buttons.push({
                                element: el,
                                method: '类名匹配',
                                text: el.textContent || el.innerText || '',
                                id: el.id || '无ID',
                                className: el.className,
                                tagName: el.tagName
                            });
                        });
                    });
                    
                    // 方法4: 通过属性查找
                    const elementsWithData = document.querySelectorAll('[data-action*="pickup"], [data-type*="pickup"], [data-text*="到店"]');
                    elementsWithData.forEach(el => {
                        buttons.push({
                            element: el,
                            method: '属性匹配',
                            text: el.textContent || el.innerText || '',
                            id: el.id || '无ID',
                            className: el.className || '无类名',
                            tagName: el.tagName
                        });
                    });
                    
                    // 去重
                    const uniqueButtons = [];
                    const seen = new Set();
                    buttons.forEach(btn => {
                        const key = btn.element.outerHTML;
                        if (!seen.has(key)) {
                            seen.add(key);
                            uniqueButtons.push(btn);
                        }
                    });
                    
                    return uniqueButtons;
                }
                
                // 🖱️ 执行点击的多种方法
                function performClick(button) {
                    const el = button.element;
                    let success = false;
                    
                    console.log('🖱️ 尝试点击按钮:', button.method, button.text);
                    
                    // 点击方法1: 直接click()
                    try {
                        el.click();
                        console.log('✅ 方法1成功: 直接click()');
                        success = true;
                    } catch (e) {
                        console.log('❌ 方法1失败:', e.message);
                    }
                    
                    // 点击方法2: 模拟鼠标事件
                    try {
                        const mouseEvent = new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        });
                        el.dispatchEvent(mouseEvent);
                        console.log('✅ 方法2成功: 鼠标事件');
                        success = true;
                    } catch (e) {
                        console.log('❌ 方法2失败:', e.message);
                    }
                    
                    // 点击方法3: 模拟触摸事件
                    try {
                        const rect = el.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;
                        const centerY = rect.top + rect.height / 2;
                        
                        const touchEvent = new TouchEvent('touchstart', {
                            bubbles: true,
                            cancelable: true,
                            touches: [{
                                clientX: centerX,
                                clientY: centerY,
                                pageX: centerX,
                                pageY: centerY
                            }]
                        });
                        el.dispatchEvent(touchEvent);
                        
                        const touchEndEvent = new TouchEvent('touchend', {
                            bubbles: true,
                            cancelable: true
                        });
                        el.dispatchEvent(touchEndEvent);
                        
                        console.log('✅ 方法3成功: 触摸事件');
                        success = true;
                    } catch (e) {
                        console.log('❌ 方法3失败:', e.message);
                    }
                    
                    // 点击方法4: 模拟键盘事件（如果元素可聚焦）
                    try {
                        if (el.focus) {
                            el.focus();
                            const keyEvent = new KeyboardEvent('keydown', {
                                bubbles: true,
                                cancelable: true,
                                key: 'Enter',
                                code: 'Enter'
                            });
                            el.dispatchEvent(keyEvent);
                            console.log('✅ 方法4成功: 键盘事件');
                            success = true;
                        }
                    } catch (e) {
                        console.log('❌ 方法4失败:', e.message);
                    }
                    
                    // 点击方法5: 查找并点击子元素
                    try {
                        const clickableChildren = el.querySelectorAll('button, a, [onclick], [role="button"]');
                        clickableChildren.forEach(child => {
                            child.click();
                            console.log('✅ 方法5成功: 子元素点击');
                            success = true;
                        });
                    } catch (e) {
                        console.log('❌ 方法5失败:', e.message);
                    }
                    
                    return success;
                }
                
                // 🔄 持续点击逻辑
                function startAutoClick() {
                    console.log('🔄 开始持续点击逻辑');
                    
                    const clickInterval = setInterval(() => {
                        if (!window.AUTODAODIEQU_ACTIVE) {
                            console.log('⏹️ 自动点击已停止');
                            clearInterval(clickInterval);
                            return;
                        }
                        
                        // 重新查找按钮（因为页面可能动态更新）
                        const buttons = findDaodiequButtons();
                        
                        if (buttons.length === 0) {
                            console.log('⏳ 未找到到店取按钮，继续搜索...');
                            return;
                        }
                        
                        console.log('🎯 找到 ' + buttons.length + ' 个到店取按钮');
                        
                        // 尝试点击每个找到的按钮
                        buttons.forEach((button, index) => {
                            setTimeout(() => {
                                performClick(button);
                                window.AUTODAODIEQU_CLICK_COUNT++;
                                
                                // 通知Android端
                                if (window.NetworkMonitor) {
                                    try {
                                        NetworkMonitor.onButtonClick(
                                            '到店取-HTTP注入', 
                                            '点击次数:' + window.AUTODAODIEQU_CLICK_COUNT + ',方法:' + button.method
                                        );
                                    } catch (e) {
                                        console.log('通知Android失败:', e.message);
                                    }
                                }
                                
                                console.log('🎯 点击完成 #' + window.AUTODAODIEQU_CLICK_COUNT + ' - ' + button.method);
                            }, index * 100); // 每个按钮延迟100ms点击
                        });
                        
                    }, 500); // 每500ms检查一次
                }
                
                // 🎯 分析页面DOM结构
                function analyzePage() {
                    console.log('🔍 === 开始分析页面DOM结构 ===');
                    
                    const buttons = findDaodiequButtons();
                    
                    console.log('📊 页面分析结果:');
                    console.log('- 找到按钮数量:', buttons.length);
                    console.log('- 页面URL:', window.location.href);
                    console.log('- 页面标题:', document.title);
                    console.log('- 总元素数量:', document.querySelectorAll('*').length);
                    
                    buttons.forEach((button, index) => {
                        console.log('🔍 按钮 #' + (index + 1) + ':');
                        console.log('  - 查找方法:', button.method);
                        console.log('  - 文本内容:', button.text);
                        console.log('  - 元素ID:', button.id);
                        console.log('  - 类名:', button.className);
                        console.log('  - 标签名:', button.tagName);
                        console.log('  - HTML:', button.element.outerHTML.substring(0, 200) + '...');
                    });
                    
                    window.AUTODAODIEQU_FOUND_BUTTONS = buttons;
                    
                    // 通知Android端分析结果
                    if (window.NetworkMonitor) {
                        try {
                            NetworkMonitor.onButtonClick(
                                'DOM分析完成', 
                                '找到' + buttons.length + '个到店取按钮,URL:' + window.location.href
                            );
                        } catch (e) {
                            console.log('通知Android失败:', e.message);
                        }
                    }
                }
                
                // 🚀 启动流程
                console.log('🚀 启动HTTP层面按钮点击流程');
                
                // 1. 等待页面加载完成
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        setTimeout(() => {
                            analyzePage();
                            startAutoClick();
                        }, 1000);
                    });
                } else {
                    setTimeout(() => {
                        analyzePage();
                        startAutoClick();
                    }, 1000);
                }
                
                // 2. 监听页面变化
                const observer = new MutationObserver(() => {
                    console.log('📝 页面DOM发生变化，重新分析...');
                    setTimeout(analyzePage, 500);
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true
                });
                
                // 3. 提供全局控制方法
                window.stopAutoDaodiequ = function() {
                    window.AUTODAODIEQU_ACTIVE = false;
                    console.log('⏹️ 停止自动点击到店取');
                };
                
                window.startAutoDaodiequ = function() {
                    window.AUTODAODIEQU_ACTIVE = true;
                    startAutoClick();
                    console.log('▶️ 开始自动点击到店取');
                };
                
                window.getAutoDaodiequStatus = function() {
                    return {
                        active: window.AUTODAODIEQU_ACTIVE,
                        clickCount: window.AUTODAODIEQU_CLICK_COUNT,
                        foundButtons: window.AUTODAODIEQU_FOUND_BUTTONS.length
                    };
                };
                
                console.log('🎉 HTTP层面按钮点击注入完成！');
                console.log('💡 使用 window.stopAutoDaodiequ() 停止自动点击');
                console.log('💡 使用 window.getAutoDaodiequStatus() 查看状态');
                
            })();
        """.trimIndent()
    }
    
    /**
     * 创建用于注入的JavaScript代码
     */
    fun getInjectionScript(): String {
        addLog(LogLevel.DEBUG, "准备注入JavaScript监控脚本", "脚本包含XHR和Fetch API拦截")
        
        return """
            (function() {
                console.log('🚀 抢购脚本网络监控开始注入...');
                
                // 保存原始的网络请求方法
                const originalXHR = window.XMLHttpRequest;
                const originalFetch = window.fetch;
                
                console.log('📡 开始Hook XMLHttpRequest...');
                
                // Hook XMLHttpRequest
                window.XMLHttpRequest = function() {
                    const xhr = new originalXHR();
                    const originalOpen = xhr.open;
                    const originalSend = xhr.send;
                    
                    let requestMethod = '';
                    let requestUrl = '';
                    let requestHeaders = {};
                    let requestBody = '';
                    
                    xhr.open = function(method, url, async, user, password) {
                        requestMethod = method;
                        requestUrl = url;
                        console.log('🔄 XHR请求开始:', method, url);
                        return originalOpen.call(this, method, url, async, user, password);
                    };
                    
                    xhr.setRequestHeader = function(header, value) {
                        requestHeaders[header] = value;
                        console.log('📝 XHR设置请求头:', header, '=', value);
                        return XMLHttpRequest.prototype.setRequestHeader.call(this, header, value);
                    };
                    
                    xhr.send = function(body) {
                        requestBody = body || '';
                        console.log('📤 XHR发送请求:', requestMethod, requestUrl, '请求体长度:', requestBody.length);
                        
                        this.addEventListener('readystatechange', function() {
                            if (this.readyState === 4) {
                                try {
                                    console.log('📥 XHR响应接收:', this.status, '响应长度:', this.responseText.length);
                                    if (window.NetworkMonitor) {
                                        console.log('✅ 调用NetworkMonitor.onNetworkRequest');
                                        NetworkMonitor.onNetworkRequest(
                                            requestMethod,
                                            requestUrl,
                                            JSON.stringify(requestHeaders),
                                            requestBody,
                                            this.responseText,
                                            this.status
                                        );
                                    } else {
                                        console.error('❌ NetworkMonitor接口未找到！请检查addJavascriptInterface调用');
                                    }
                                } catch(e) {
                                    console.error('💥 XHR网络监控错误:', e);
                                }
                            }
                        });
                        
                        return originalSend.call(this, body);
                    };
                    
                    return xhr;
                };
                
                console.log('🌐 开始Hook Fetch API...');
                
                // Hook Fetch API
                window.fetch = function(url, options = {}) {
                    const method = options.method || 'GET';
                    const headers = options.headers || {};
                    const body = options.body || '';
                    
                    console.log('🔄 Fetch请求开始:', method, url, '请求体长度:', body.length);
                    
                    return originalFetch.call(this, url, options)
                        .then(response => {
                            console.log('📥 Fetch响应状态:', response.status, response.statusText);
                            
                            // 克隆响应以便读取
                            const clonedResponse = response.clone();
                            
                            clonedResponse.text().then(responseText => {
                                try {
                                    console.log('📥 Fetch响应内容长度:', responseText.length);
                                    if (window.NetworkMonitor) {
                                        console.log('✅ 调用NetworkMonitor.onNetworkRequest (Fetch)');
                                        NetworkMonitor.onNetworkRequest(
                                            method,
                                            url,
                                            JSON.stringify(headers),
                                            body,
                                            responseText,
                                            response.status
                                        );
                                    } else {
                                        console.error('❌ NetworkMonitor接口未找到！请检查addJavascriptInterface调用');
                                    }
                                } catch(e) {
                                    console.error('💥 Fetch监控错误:', e);
                                }
                            }).catch(err => {
                                console.error('💥 读取Fetch响应失败:', err);
                            });
                            
                            return response;
                        })
                        .catch(error => {
                            console.error('💥 Fetch请求失败:', error);
                            throw error;
                        });
                };
                
                console.log('👆 开始监听按钮点击...');
                
                // 监听按钮点击
                document.addEventListener('click', function(event) {
                    const target = event.target;
                    const text = target.textContent || target.innerText || '';
                    
                    console.log('👆 按钮点击:', text);
                    if (window.NetworkMonitor) {
                        NetworkMonitor.onButtonClick(text, target.className || '');
                    }
                }, true);
                
                // 监听所有网络相关事件
                window.addEventListener('beforeunload', function() {
                    console.log('🔄 页面即将卸载');
                });
                
                // 定期检查NetworkMonitor接口是否可用
                let checkCount = 0;
                const checkInterval = setInterval(() => {
                    checkCount++;
                    if (window.NetworkMonitor) {
                        console.log('✅ NetworkMonitor接口检查通过，第' + checkCount + '次检查');
                        clearInterval(checkInterval);
                    } else if (checkCount >= 10) {
                        console.error('❌ NetworkMonitor接口检查失败，已尝试' + checkCount + '次');
                        clearInterval(checkInterval);
                    } else {
                        console.warn('⏳ NetworkMonitor接口暂未就绪，第' + checkCount + '次检查...');
                    }
                }, 500);
                
                console.log('🎉 网络监控脚本注入完成！');
                
            })();
        """.trimIndent()
    }
    
    /**
     * JavaScript接口类
     */
    inner class NetworkJavaScriptInterface {
        @JavascriptInterface
        fun onNetworkRequest(
            method: String,
            url: String,
            headersJson: String,
            requestBody: String,
            responseBody: String,
            statusCode: Int
        ) {
            try {
                addLog(LogLevel.DEBUG, "接收到网络请求", "$method $url (状态码: $statusCode)")
                
                // 限制捕获的请求数量，防止内存溢出
                if (capturedRequests.size > 100) {
                    val oldestKey = capturedRequests.keys.minOrNull()
                    oldestKey?.let { 
                        capturedRequests.remove(it)
                        addLog(LogLevel.DEBUG, "移除最旧的请求", "ID: $it (内存管理)")
                    }
                }
                
                val headers = parseHeaders(headersJson)
                val request = CapturedRequest(
                    id = "${apiCallCount.incrementAndGet()}",
                    method = method,
                    url = url,
                    headers = headers,
                    requestBody = requestBody.take(2000),
                    responseBody = responseBody.take(3000),
                    timestamp = System.currentTimeMillis()
                )
                
                // 分析请求类型（不影响保存）
                analyzeRequest(request)
                
                // 无条件存储所有请求
                capturedRequests[request.id] = request
                
                // 触发回调
                onApiCapturedCallback?.invoke(request)
                
                addLog(LogLevel.SUCCESS, "成功捕获API请求 #${request.id}", 
                    "${request.method} ${request.url} (请求体: ${request.requestBody.length}字符, 响应体: ${request.responseBody.length}字符)")
                
                addLog(LogLevel.INFO, "当前统计", 
                    "总请求: ${capturedRequests.size}, 库存API: ${stockCheckApis.size}, 购买API: ${purchaseApis.size}")
                
            } catch (e: Exception) {
                addLog(LogLevel.ERROR, "处理网络请求失败", "错误: ${e.message}")
            }
        }
        
        @JavascriptInterface
        fun onButtonClick(buttonText: String, className: String) {
            addLog(LogLevel.DEBUG, "按钮点击事件", "文本: '$buttonText', 类名: '$className'")
            
            // 处理HTTP注入的特殊按钮点击
            when {
                buttonText.contains("到店取-HTTP注入") -> {
                    addLog(LogLevel.SUCCESS, "🎯 HTTP注入点击成功", className)
                    
                    // 提取点击次数和方法
                    val clickInfo = className.split(",")
                    val clickCount = clickInfo.find { it.contains("点击次数:") }?.substringAfter("点击次数:") ?: "未知"
                    val method = clickInfo.find { it.contains("方法:") }?.substringAfter("方法:") ?: "未知"
                    
                    Log.i("HTTPInject", "🎯 HTTP注入点击成功！点击次数: $clickCount, 方法: $method")
                }
                
                buttonText.contains("DOM分析完成") -> {
                    addLog(LogLevel.INFO, "🔍 DOM分析完成", className)
                    
                    // 提取按钮数量和URL
                    val parts = className.split(",")
                    val buttonCount = parts.find { it.contains("找到") && it.contains("个到店取按钮") }?.substringBefore("个到店取按钮")?.substringAfter("找到") ?: "0"
                    val url = parts.find { it.contains("URL:") }?.substringAfter("URL:") ?: "未知"
                    
                    Log.i("HTTPInject", "🔍 DOM分析完成！找到 $buttonCount 个到店取按钮，页面URL: $url")
                }
                
                else -> {
                    // 普通按钮点击
                    Log.d("ButtonClick", "普通按钮点击: $buttonText, 类名: $className")
                }
            }
        }
    }
    
    /**
     * 分析请求类型和内容（仅用于分类，不影响保存）
     */
    private fun analyzeRequest(request: CapturedRequest) {
        try {
            val url = request.url.lowercase()
            val responseBody = request.responseBody
            
            // 判断是否为库存查询API
            if (isStockCheckApi(url, responseBody)) {
                stockCheckApis.add(request.url)
                request.isStockApi = true
                request.hasStock = parseStockInfo(responseBody)
                Log.d(TAG, "识别为库存API: ${request.url}, 有库存: ${request.hasStock}")
            }
            
            // 判断是否为购买API
            if (isPurchaseApi(url, request.requestBody)) {
                purchaseApis.add(request.url)
                request.isPurchaseApi = true
                Log.d(TAG, "识别为购买API: ${request.url}")
            }
            
            // 提取用户token
            extractUserToken(request.headers)
            
        } catch (e: Exception) {
            Log.e(TAG, "分析请求失败", e)
        }
    }
    
    /**
     * 判断是否为库存查询API
     */
    private fun isStockCheckApi(url: String, responseBody: String): Boolean {
        val stockKeywords = listOf("stock", "inventory", "available", "quantity", "库存", "余量", "商品", "product")
        val urlContainsStock = stockKeywords.any { url.contains(it) }
        val responseContainsStock = stockKeywords.any { responseBody.contains(it) }
        
        return urlContainsStock || responseContainsStock
    }
    
    /**
     * 判断是否为购买API
     */
    private fun isPurchaseApi(url: String, requestBody: String): Boolean {
        val purchaseKeywords = listOf("buy", "purchase", "order", "cart", "购买", "下单", "添加", "支付", "pay")
        val urlContainsPurchase = purchaseKeywords.any { url.contains(it) }
        val bodyContainsPurchase = purchaseKeywords.any { requestBody.contains(it) }
        
        return urlContainsPurchase || bodyContainsPurchase
    }
    
    /**
     * 解析库存信息
     */
    private fun parseStockInfo(responseBody: String): Boolean {
        return try {
            Log.d(TAG, "开始解析库存信息: ${responseBody.take(200)}")
            
            val jsonElement = JsonParser.parseString(responseBody)
            
            if (jsonElement.isJsonObject) {
                val jsonObject = jsonElement.asJsonObject
                
                // 常见的库存字段
                val stockFields = listOf("stock", "available", "inventory", "quantity", "inStock", "库存", "余量")
                
                for (field in stockFields) {
                    if (jsonObject.has(field)) {
                        val stockValue = jsonObject.get(field)
                        if (stockValue.isJsonPrimitive) {
                            val primitive = stockValue.asJsonPrimitive
                            if (primitive.isBoolean) {
                                val hasStock = primitive.asBoolean
                                Log.d(TAG, "找到库存字段 $field: $hasStock")
                                return hasStock
                            } else if (primitive.isNumber) {
                                val stockCount = primitive.asInt
                                val hasStock = stockCount > 0
                                Log.d(TAG, "找到库存数量字段 $field: $stockCount, 有库存: $hasStock")
                                return hasStock
                            }
                        }
                    }
                }
            }
            
            // 如果没有找到明确的库存字段，检查文本内容
            val hasStock = !responseBody.contains("缺货") && 
                          !responseBody.contains("售完") && 
                          !responseBody.contains("无库存") &&
                          !responseBody.contains("\"stock\":0") &&
                          !responseBody.contains("\"available\":false")
            
            Log.d(TAG, "基于文本内容判断库存: $hasStock")
            hasStock
            
        } catch (e: Exception) {
            Log.e(TAG, "解析库存信息失败", e)
            // 默认返回true，避免过度过滤
            true
        }
    }
    
    /**
     * 提取用户认证token
     */
    private fun extractUserToken(headers: Map<String, String>) {
        headers.forEach { (key, value) ->
            val lowerKey = key.lowercase()
            if (lowerKey.contains("token") || lowerKey.contains("authorization") || lowerKey.contains("cookie")) {
                userTokens[key] = value
            }
        }
    }
    
    /**
     * 解析请求头JSON
     */
    private fun parseHeaders(headersJson: String): Map<String, String> {
        return try {
            val jsonElement = JsonParser.parseString(headersJson)
            if (jsonElement.isJsonObject) {
                val headerMap = mutableMapOf<String, String>()
                jsonElement.asJsonObject.entrySet().forEach { entry ->
                    headerMap[entry.key] = entry.value.asString
                }
                headerMap
            } else {
                emptyMap()
            }
        } catch (e: Exception) {
            Log.e(TAG, "解析请求头失败: ${e.message}")
            emptyMap()
        }
    }
    
    /**
     * 重放API请求
     */
    suspend fun replayRequest(requestId: String): Response? {
        val request = capturedRequests[requestId] ?: return null
        
        return withContext(Dispatchers.IO) {
            try {
                val requestBuilder = Request.Builder().url(request.url)
                
                // 添加请求头
                request.headers.forEach { (key, value) ->
                    requestBuilder.addHeader(key, value)
                }
                
                // 添加请求体
                if (request.requestBody.isNotEmpty()) {
                    val mediaType = "application/json".toMediaType()
                    requestBuilder.method(
                        request.method,
                        request.requestBody.toRequestBody(mediaType)
                    )
                } else {
                    requestBuilder.method(request.method, null)
                }
                
                val response = httpClient.newCall(requestBuilder.build()).execute()
                Log.d(TAG, "重放请求成功: ${request.method} ${request.url}")
                response
                
            } catch (e: IOException) {
                Log.e(TAG, "重放请求失败: ${e.message}")
                null
            }
        }
    }
    
    /**
     * 自动执行库存检查
     */
    suspend fun autoCheckStock(intervalMs: Long = 500) {
        while (true) {
            try {
                // 限制并发请求数量，防止系统过载
                val apis = stockCheckApis.take(3) // 最多同时检查3个API
                apis.forEach { apiUrl ->
                    val lastRequest = capturedRequests.values.find { it.url == apiUrl && it.isStockApi }
                    lastRequest?.let { 
                        try {
                            replayRequest(it.id)?.use { response ->
                                val hasStock = parseStockInfo(response.body?.string() ?: "")
                                if (hasStock) {
                                    onStockFoundCallback?.invoke(true)
                                }
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "库存检查API调用失败: ${e.message}")
                        }
                    }
                }
                delay(intervalMs)
            } catch (e: Exception) {
                Log.e(TAG, "自动库存检查出错: ${e.message}")
                delay(intervalMs * 2) // 出错时延长等待时间
            }
        }
    }
    
    /**
     * 自动执行购买请求
     */
    suspend fun autoPurchase(): Boolean {
        val purchaseRequest = capturedRequests.values.find { it.isPurchaseApi }
        return if (purchaseRequest != null) {
            val response = replayRequest(purchaseRequest.id)
            response?.isSuccessful == true
        } else {
            false
        }
    }
    
    /**
     * 设置库存发现回调
     */
    fun setOnStockFoundCallback(callback: (Boolean) -> Unit) {
        onStockFoundCallback = callback
    }
    
    /**
     * 设置API捕获回调
     */
    fun setOnApiCapturedCallback(callback: (CapturedRequest) -> Unit) {
        onApiCapturedCallback = callback
    }
    
    /**
     * 获取所有捕获的请求
     */
    fun getCapturedRequests(): List<CapturedRequest> {
        return capturedRequests.values.toList()
    }
    
    /**
     * 获取库存查询API列表
     */
    fun getStockCheckApis(): Set<String> {
        return stockCheckApis.toSet()
    }
    
    /**
     * 获取购买API列表
     */
    fun getPurchaseApis(): Set<String> {
        return purchaseApis.toSet()
    }
    
    /**
     * 清除当前会话数据（但保留历史会话）
     */
    private fun clearCurrentSessionData() {
        capturedRequests.clear()
        stockCheckApis.clear()
        purchaseApis.clear()
        userTokens.clear()
        apiCallCount.set(0)
        currentSessionLogs.clear()
        addLog(LogLevel.INFO, "🔄 当前会话数据已清除", "准备开始新的抓包会话")
    }
    
    /**
     * 保存会话到历史记录
     */
    private fun saveSessionToHistory(session: CaptureSession) {
        synchronized(allSessionsHistory) {
            // 限制历史会话数量
            if (allSessionsHistory.size >= maxSessions) {
                allSessionsHistory.removeAt(0)
            }
            allSessionsHistory.add(session)
            addLog(LogLevel.SUCCESS, "💾 会话已保存到历史记录", "会话名称: ${session.sessionName}")
        }
    }
    
    /**
     * 清除所有历史数据（包括当前会话和历史会话）
     */
    fun clearAllData() {
        clearCurrentSessionData()
        allSessionsHistory.clear()
        addLog(LogLevel.INFO, "🗑️ 所有历史数据已清除", "包括当前会话和历史会话")
    }
    
    /**
     * 获取当前会话日志
     */
    fun getCurrentSessionLogs(): List<LogEntry> {
        return synchronized(currentSessionLogs) {
            currentSessionLogs.toList()
        }
    }
    
    /**
     * 获取所有历史会话
     */
    fun getAllSessions(): List<CaptureSession> {
        return synchronized(allSessionsHistory) {
            allSessionsHistory.toList().sortedByDescending { it.startTime }
        }
    }
    
    /**
     * 获取指定会话的详细信息
     */
    fun getSessionById(sessionId: String): CaptureSession? {
        return allSessionsHistory.find { it.sessionId == sessionId }
    }
    
    /**
     * 设置日志更新回调
     */
    fun setOnLogUpdatedCallback(callback: (List<LogEntry>) -> Unit) {
        onLogUpdatedCallback = callback
        // 立即回调当前日志
        callback(getCurrentSessionLogs())
    }
    
    /**
     * 获取抓包状态
     */
    fun isCapturing(): Boolean {
        return isCapturing
    }
    
    /**
     * 获取JavaScript接口实例
     */
    fun getJavaScriptInterface(): NetworkJavaScriptInterface {
        return NetworkJavaScriptInterface()
    }
    
    /**
     * 获取所有捕获的请求的详细信息
     */
    fun getAllRequestsDetails(): String {
        val sb = StringBuilder()
        sb.append("=== 网络请求监控报告 ===\n")
        sb.append("总请求数: ${capturedRequests.size}\n")
        sb.append("库存API数: ${stockCheckApis.size}\n")
        sb.append("购买API数: ${purchaseApis.size}\n")
        sb.append("用户Token数: ${userTokens.size}\n\n")
        
        capturedRequests.values.forEachIndexed { index, request ->
            sb.append("--- 请求 #${index + 1} ---\n")
            sb.append("ID: ${request.id}\n")
            sb.append("方法: ${request.method}\n")
            sb.append("URL: ${request.url}\n")
            sb.append("时间: ${java.util.Date(request.timestamp)}\n")
            sb.append("是否库存API: ${request.isStockApi}\n")
            sb.append("是否购买API: ${request.isPurchaseApi}\n")
            sb.append("请求头数量: ${request.headers.size}\n")
            sb.append("请求体长度: ${request.requestBody.length}\n")
            sb.append("响应体长度: ${request.responseBody.length}\n")
            if (request.isStockApi) {
                sb.append("库存状态: ${request.hasStock}\n")
            }
            sb.append("\n")
        }
        
        return sb.toString()
    }
    
    /**
     * 配置WebView以支持网络监控的辅助方法
     * 这是一个使用示例，请在您的Activity中调用
     */
    fun configureWebView(webView: WebView) {
        try {
            addLog(LogLevel.INFO, "开始配置WebView", "启用JavaScript和相关设置")
            
            // 启用JavaScript
            webView.settings.javaScriptEnabled = true
            webView.settings.domStorageEnabled = true
            webView.settings.allowFileAccess = true
            webView.settings.allowContentAccess = true
            webView.settings.allowFileAccessFromFileURLs = true
            webView.settings.allowUniversalAccessFromFileURLs = true
            
            addLog(LogLevel.DEBUG, "WebView基础设置完成", "JavaScript已启用")
            
            // 添加JavaScript接口
            webView.addJavascriptInterface(getJavaScriptInterface(), "NetworkMonitor")
            addLog(LogLevel.SUCCESS, "JavaScript接口已添加", "接口名称: NetworkMonitor")
            
            // 注入监控脚本
            webView.setWebViewClient(object : android.webkit.WebViewClient() {
                override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                    addLog(LogLevel.INFO, "页面开始加载", "URL: $url")
                }
                
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    addLog(LogLevel.INFO, "页面加载完成", "URL: $url")
                    addLog(LogLevel.DEBUG, "开始注入网络监控脚本", "等待JavaScript执行...")
                    
                    view?.evaluateJavascript(getInjectionScript()) { result ->
                        addLog(LogLevel.SUCCESS, "脚本注入完成", "执行结果: $result")
                    }
                }
                
                override fun onReceivedError(view: WebView?, errorCode: Int, description: String?, failingUrl: String?) {
                    super.onReceivedError(view, errorCode, description, failingUrl)
                    addLog(LogLevel.ERROR, "页面加载出错", "错误码: $errorCode, 描述: $description, URL: $failingUrl")
                }
            })
            
            // 启用Chrome调试
            webView.setWebChromeClient(object : android.webkit.WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                    consoleMessage?.let { msg ->
                        val level = when (msg.messageLevel()) {
                            android.webkit.ConsoleMessage.MessageLevel.ERROR -> LogLevel.ERROR
                            android.webkit.ConsoleMessage.MessageLevel.WARNING -> LogLevel.DEBUG
                            else -> LogLevel.DEBUG
                        }
                        addLog(level, "浏览器控制台", "${msg.message()} (${msg.sourceId()}:${msg.lineNumber()})")
                    }
                    return super.onConsoleMessage(consoleMessage)
                }
            })
            
            addLog(LogLevel.SUCCESS, "WebView配置完成", "网络监控已启用，等待页面加载")
            
        } catch (e: Exception) {
            addLog(LogLevel.ERROR, "配置WebView失败", "错误: ${e.message}")
        }
    }
} 