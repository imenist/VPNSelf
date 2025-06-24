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
    
    // API分类
    private val stockCheckApis = mutableSetOf<String>()
    private val purchaseApis = mutableSetOf<String>()
    private val userTokens = mutableMapOf<String, String>()
    
    // 回调接口
    private var onStockFoundCallback: ((Boolean) -> Unit)? = null
    private var onApiCapturedCallback: ((CapturedRequest) -> Unit)? = null
    
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
        val isStockApi: Boolean = false,
        val isPurchaseApi: Boolean = false,
        val hasStock: Boolean? = null
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
        Log.d(TAG, "网络监控器初始化完成")
    }
    
    /**
     * 创建用于注入的JavaScript代码
     */
    fun getInjectionScript(): String {
        return """
            (function() {
                console.log('抢购脚本网络监控已注入');
                
                // 保存原始的网络请求方法
                const originalXHR = window.XMLHttpRequest;
                const originalFetch = window.fetch;
                
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
                        return originalOpen.call(this, method, url, async, user, password);
                    };
                    
                    xhr.setRequestHeader = function(header, value) {
                        requestHeaders[header] = value;
                        return XMLHttpRequest.prototype.setRequestHeader.call(this, header, value);
                    };
                    
                    xhr.send = function(body) {
                        requestBody = body || '';
                        
                        this.addEventListener('readystatechange', function() {
                            if (this.readyState === 4) {
                                try {
                                    NetworkMonitor.onNetworkRequest(
                                        requestMethod,
                                        requestUrl,
                                        JSON.stringify(requestHeaders),
                                        requestBody,
                                        this.responseText,
                                        this.status
                                    );
                                } catch(e) {
                                    console.error('网络监控错误:', e);
                                }
                            }
                        });
                        
                        return originalSend.call(this, body);
                    };
                    
                    return xhr;
                };
                
                // Hook Fetch API
                window.fetch = function(url, options = {}) {
                    const method = options.method || 'GET';
                    const headers = options.headers || {};
                    const body = options.body || '';
                    
                    return originalFetch.call(this, url, options)
                        .then(response => {
                            // 克隆响应以便读取
                            const clonedResponse = response.clone();
                            
                            clonedResponse.text().then(responseText => {
                                try {
                                    NetworkMonitor.onNetworkRequest(
                                        method,
                                        url,
                                        JSON.stringify(headers),
                                        body,
                                        responseText,
                                        response.status
                                    );
                                } catch(e) {
                                    console.error('Fetch监控错误:', e);
                                }
                            });
                            
                            return response;
                        });
                };
                
                // 监听按钮点击
                document.addEventListener('click', function(event) {
                    const target = event.target;
                    const text = target.textContent || target.innerText || '';
                    
                    if (text.includes('买') || text.includes('购') || text.includes('抢')) {
                        NetworkMonitor.onButtonClick(text, target.className || '');
                    }
                }, true);
                
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
                // 限制捕获的请求数量，防止内存溢出
                if (capturedRequests.size > 50) {
                    val oldestKey = capturedRequests.keys.minOrNull()
                    oldestKey?.let { capturedRequests.remove(it) }
                }
                
                val headers = parseHeaders(headersJson)
                val request = CapturedRequest(
                    id = "${apiCallCount.incrementAndGet()}",
                    method = method,
                    url = url,
                    headers = headers,
                    requestBody = requestBody.take(500), // 限制请求体大小
                    responseBody = responseBody.take(1000), // 限制响应体大小
                    timestamp = System.currentTimeMillis()
                )
                
                // 分析请求类型
                analyzeRequest(request)
                
                // 存储请求
                capturedRequests[request.id] = request
                
                // 触发回调
                onApiCapturedCallback?.invoke(request)
                
                Log.d(TAG, "捕获网络请求: ${request.method} ${request.url}")
                
            } catch (e: Exception) {
                Log.e(TAG, "处理网络请求失败: ${e.message}")
            }
        }
        
        @JavascriptInterface
        fun onButtonClick(buttonText: String, className: String) {
            Log.d(TAG, "按钮点击: $buttonText, 类名: $className")
        }
        

    }
    
    /**
     * 分析请求类型和内容
     */
    private fun analyzeRequest(request: CapturedRequest) {
        val url = request.url.lowercase()
        val responseBody = request.responseBody
        
        // 判断是否为库存查询API
        if (isStockCheckApi(url, responseBody)) {
            stockCheckApis.add(request.url)
            request.copy(isStockApi = true, hasStock = parseStockInfo(responseBody))
        }
        
        // 判断是否为购买API
        if (isPurchaseApi(url, request.requestBody)) {
            purchaseApis.add(request.url)
            request.copy(isPurchaseApi = true)
        }
        
        // 提取用户token
        extractUserToken(request.headers)
    }
    
    /**
     * 判断是否为库存查询API
     */
    private fun isStockCheckApi(url: String, responseBody: String): Boolean {
        val stockKeywords = listOf("stock", "inventory", "available", "quantity", "库存", "余量")
        val urlContainsStock = stockKeywords.any { url.contains(it) }
        val responseContainsStock = stockKeywords.any { responseBody.contains(it) }
        
        return urlContainsStock || responseContainsStock
    }
    
    /**
     * 判断是否为购买API
     */
    private fun isPurchaseApi(url: String, requestBody: String): Boolean {
        val purchaseKeywords = listOf("buy", "purchase", "order", "cart", "购买", "下单", "添加")
        val urlContainsPurchase = purchaseKeywords.any { url.contains(it) }
        val bodyContainsPurchase = purchaseKeywords.any { requestBody.contains(it) }
        
        return urlContainsPurchase || bodyContainsPurchase
    }
    
    /**
     * 解析库存信息
     */
    private fun parseStockInfo(responseBody: String): Boolean {
        return try {
            val jsonElement = JsonParser.parseString(responseBody)
            
            if (jsonElement.isJsonObject) {
                val jsonObject = jsonElement.asJsonObject
                
                // 常见的库存字段
                val stockFields = listOf("stock", "available", "inventory", "quantity", "inStock")
                
                for (field in stockFields) {
                    if (jsonObject.has(field)) {
                        val stockValue = jsonObject.get(field)
                        if (stockValue.isJsonPrimitive) {
                            val primitive = stockValue.asJsonPrimitive
                            if (primitive.isBoolean) {
                                return primitive.asBoolean
                            } else if (primitive.isNumber) {
                                return primitive.asInt > 0
                            }
                        }
                    }
                }
            }
            
            // 如果没有找到明确的库存字段，检查文本内容
            !responseBody.contains("缺货") && 
            !responseBody.contains("售完") && 
            !responseBody.contains("无库存") &&
            !responseBody.contains("\"stock\":0") &&
            !responseBody.contains("\"available\":false")
            
        } catch (e: Exception) {
            Log.e(TAG, "解析库存信息失败: ${e.message}")
            false
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
     * 清除所有捕获的数据
     */
    fun clearData() {
        capturedRequests.clear()
        stockCheckApis.clear()
        purchaseApis.clear()
        userTokens.clear()
        apiCallCount.set(0)
    }
} 