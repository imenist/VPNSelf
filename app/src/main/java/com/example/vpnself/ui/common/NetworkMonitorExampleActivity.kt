package com.example.vpnself.ui.common

import android.os.Bundle
import android.util.Log
import android.webkit.WebView
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.activity.compose.setContent
import com.example.vpnself.R
import com.example.vpnself.script.NetworkMonitor
import com.example.vpnself.ui.theme.VPNSelfTheme

/**
 * 网络监控示例Activity
 * 展示如何使用NetworkMonitor来捕获API请求
 */
class NetworkMonitorExampleActivity : AppCompatActivity() {
    
    companion object {
        private const val TAG = "NetworkMonitorExample"
    }
    
    private lateinit var networkMonitor: NetworkMonitor
    private var capturedRequests by mutableStateOf<List<NetworkMonitor.CapturedRequest>>(emptyList())
    private var statusMessage by mutableStateOf("初始化中...")
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        initNetworkMonitor()
        
        setContent {
            VPNSelfTheme {
                NetworkMonitorScreen()
            }
        }
    }
    
    private fun initNetworkMonitor() {
        networkMonitor = NetworkMonitor(this)
        
        // 设置API捕获回调
        networkMonitor.setOnApiCapturedCallback { request ->
            runOnUiThread {
                capturedRequests = networkMonitor.getCapturedRequests()
                statusMessage = "捕获到新的API请求: ${request.method} ${request.url}"
                Log.d(TAG, "捕获API: ${request.method} ${request.url}")
            }
        }
        
        // 设置库存发现回调
        networkMonitor.setOnStockFoundCallback { hasStock ->
            runOnUiThread {
                statusMessage = if (hasStock) "发现有库存!" else "暂无库存"
                Log.d(TAG, "库存状态: $hasStock")
            }
        }
        
        statusMessage = "网络监控器已初始化完成"
    }
    
    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    fun NetworkMonitorScreen() {
        Scaffold(
            topBar = {
                TopAppBar(title = { Text("网络监控 API 捕获") })
            }
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp)
            ) {
                // 状态显示
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = "监控状态",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = statusMessage,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // 操作按钮
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { showWebViewExample() },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("打开示例WebView")
                    }
                    
                    Button(
                        onClick = { clearData() },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("清除数据")
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // 统计信息
                Card(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = "捕获统计",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("总请求数: ${capturedRequests.size}")
                        Text("库存API: ${networkMonitor.getStockCheckApis().size}")
                        Text("购买API: ${networkMonitor.getPurchaseApis().size}")
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // 请求列表
                Card(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = "捕获的API请求",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        LazyColumn(
                            modifier = Modifier.heightIn(max = 300.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(capturedRequests.takeLast(10)) { request ->
                                RequestItem(request = request)
                            }
                        }
                    }
                }
            }
        }
    }
    
    @Composable
    fun RequestItem(request: NetworkMonitor.CapturedRequest) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(
                modifier = Modifier.padding(12.dp)
            ) {
                Text(
                    text = "${request.method} ${request.url}",
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 2
                )
                Text(
                    text = "时间: ${java.text.SimpleDateFormat("HH:mm:ss").format(java.util.Date(request.timestamp))}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (request.isStockApi || request.isPurchaseApi) {
                    Text(
                        text = when {
                            request.isStockApi -> "库存API"
                            request.isPurchaseApi -> "购买API"
                            else -> ""
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
    
    private fun showWebViewExample() {
        // 创建一个简单的WebView示例
        val webView = WebView(this)
        
        // 使用NetworkMonitor配置WebView
        networkMonitor.configureWebView(webView)
        
        // 加载一个测试页面（可以替换为您的小程序URL）
        val testHtml = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>API测试页面</title>
                <meta charset="utf-8">
            </head>
            <body>
                <h1>网络监控测试</h1>
                <button onclick="testXHR()">测试 XMLHttpRequest</button>
                <button onclick="testFetch()">测试 Fetch API</button>
                <button onclick="testPurchase()">测试购买按钮</button>
                
                <script>
                function testXHR() {
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', 'https://jsonplaceholder.typicode.com/posts/1');
                    xhr.onreadystatechange = function() {
                        if (xhr.readyState === 4) {
                            console.log('XHR响应:', xhr.responseText);
                        }
                    };
                    xhr.send();
                }
                
                function testFetch() {
                    fetch('https://jsonplaceholder.typicode.com/users/1')
                        .then(response => response.json())
                        .then(data => console.log('Fetch响应:', data));
                }
                
                function testPurchase() {
                    fetch('https://jsonplaceholder.typicode.com/posts', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({title: 'purchase', body: '购买商品', userId: 1})
                    })
                    .then(response => response.json())
                    .then(data => console.log('购买响应:', data));
                }
                </script>
            </body>
            </html>
        """.trimIndent()
        
        webView.loadData(testHtml, "text/html", "UTF-8")
        
        // 这里应该显示WebView，但为了简化示例，我们只是记录日志
        statusMessage = "WebView示例已创建，请查看日志输出"
        Log.d(TAG, "WebView示例已创建并配置完成")
    }
    
    private fun clearData() {
        capturedRequests = emptyList()
        statusMessage = "已清除所有捕获的数据"
    }
} 