package com.example.vpnself.ui.common.history

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vpnself.script.NetworkMonitor
import com.example.vpnself.script.NetworkMonitorManager

/**
 * @Author： hejunxi
 * @Date: 2025/6/9
 **/
class HistoryActivity : ComponentActivity() {

    companion object {
        fun start(context: Context) {
            val intent = Intent(context, HistoryActivity::class.java)
            context.startActivity(intent)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            HistoryScreen(
                onBackPressed = { finish() }
            )
        }
    }
    
    override fun onResume() {
        super.onResume()
        // 刷新数据，确保获取到最新的NetworkMonitor日志
        NetworkMonitorManager.getCurrentInstance()?.let { networkMonitor ->
            // 触发ViewModel更新
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    modifier: Modifier = Modifier,
    viewModel: HistoryViewModel = viewModel(),
    onBackPressed: () -> Unit
) {
    // 在Compose中重新初始化数据连接和定期刷新
    LaunchedEffect(Unit) {
        viewModel.loadRealTimeData()
        
        // 定期刷新历史记录，确保能看到最新的会话
        while (true) {
            kotlinx.coroutines.delay(2000) // 每2秒刷新一次
            viewModel.refreshHistory()
        }
    }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("抓包历史") },
                navigationIcon = {
                    IconButton(onClick = onBackPressed) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "返回")
                    }
                }
            )
        }
    ) { paddingValues ->
        val captureHistory by viewModel.captureHistory.collectAsState()
        val selectedSession by viewModel.selectedSession.collectAsState()
        val currentLogs by viewModel.currentLogs.collectAsState()
        var showCurrentLogs by remember { mutableStateOf(false) }
        var showSelectedSession by remember { mutableStateOf(false) }
        
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // 显示当前实时日志的按钮
            if (currentLogs.isNotEmpty()) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .clickable { showCurrentLogs = !showCurrentLogs },
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "🔴 当前抓包会话",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                            Text(
                                text = "${currentLogs.size}条实时日志",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                        Text(
                            text = if (showCurrentLogs) "▼" else "▶",
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
            }
            
            // 当前会话日志显示区域
            if (showCurrentLogs) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .heightIn(max = 300.dp)
                ) {
                    LazyColumn(
                        modifier = Modifier.padding(8.dp),
                        verticalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        items(currentLogs.takeLast(100)) { logEntry ->
                            LogItem(logEntry = logEntry, isCompact = false)
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
            }
            
            // 选中会话的详细信息
            selectedSession?.let { session ->
                if (showSelectedSession) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                            .heightIn(max = 400.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Column {
                            // 会话详情头部
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp)
                                    .clickable { showSelectedSession = false },
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "📊 ${session.sessionName}",
                                        style = MaterialTheme.typography.titleMedium
                                    )
                                    Text(
                                        text = "${session.logs.size}条日志 • ${session.requestCount}个请求 • ${session.duration}秒",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                Text(
                                    text = "✕",
                                    style = MaterialTheme.typography.titleLarge,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            
                            Divider()
                            
                            // 会话日志列表
                            LazyColumn(
                                modifier = Modifier.padding(8.dp),
                                verticalArrangement = Arrangement.spacedBy(2.dp)
                            ) {
                                items(session.logs) { logEntry ->
                                    LogItem(logEntry = logEntry, isCompact = true)
                                }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
            
            // 历史会话列表
            if (captureHistory.isNotEmpty()) {
                Text(
                    text = "📚 历史抓包会话",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
            
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(captureHistory) { session ->
                    SessionItemCard(
                        session = session,
                        onClick = { 
                            viewModel.onHistoryItemClick(session)
                            showSelectedSession = true
                        }
                    )
                }
                
                // 如果没有历史记录，显示提示
                if (captureHistory.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = "📝",
                                    style = MaterialTheme.typography.headlineLarge
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "暂无抓包记录",
                                    style = MaterialTheme.typography.titleMedium
                                )
                                Text(
                                    text = "在首页点击\"开始抓包\"来创建第一条记录",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun LogItem(logEntry: NetworkMonitor.LogEntry, isCompact: Boolean = true) {
    val levelColor = when (logEntry.level) {
        NetworkMonitor.LogLevel.SUCCESS -> Color(0xFF4CAF50)
        NetworkMonitor.LogLevel.ERROR -> Color(0xFFE53935)
        NetworkMonitor.LogLevel.DEBUG -> Color(0xFF2196F3)
        NetworkMonitor.LogLevel.INFO -> Color(0xFF757575)
    }
    
    val levelIcon = when (logEntry.level) {
        NetworkMonitor.LogLevel.SUCCESS -> "✅"
        NetworkMonitor.LogLevel.ERROR -> "❌"
        NetworkMonitor.LogLevel.DEBUG -> "🔍"
        NetworkMonitor.LogLevel.INFO -> "ℹ️"
    }
    
    val backgroundColor = when (logEntry.level) {
        NetworkMonitor.LogLevel.SUCCESS -> Color(0xFF4CAF50).copy(alpha = 0.1f)
        NetworkMonitor.LogLevel.ERROR -> Color(0xFFE53935).copy(alpha = 0.1f)
        NetworkMonitor.LogLevel.DEBUG -> Color(0xFF2196F3).copy(alpha = 0.1f)
        NetworkMonitor.LogLevel.INFO -> MaterialTheme.colorScheme.surface
    }
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 1.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isCompact) 1.dp else 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(if (isCompact) 8.dp else 12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.Top,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = levelIcon,
                    fontSize = if (isCompact) 12.sp else 14.sp,
                    modifier = Modifier.padding(end = 8.dp)
                )
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = logEntry.message,
                        fontSize = if (isCompact) 12.sp else 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = levelColor
                    )
                    
                    if (logEntry.details != null) {
                        Text(
                            text = logEntry.details,
                            fontSize = if (isCompact) 10.sp else 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                }
                
                Text(
                    text = logEntry.timestamp.substringAfter(" "), // 只显示时间部分
                    fontSize = if (isCompact) 9.sp else 10.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontFamily = FontFamily.Monospace
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SessionItemCard(
    session: NetworkMonitor.CaptureSession,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // 头部信息
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "📊 ${session.sessionName}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "会话时长: ${session.duration}秒",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                Icon(
                    imageVector = Icons.Default.KeyboardArrowRight,
                    contentDescription = "查看详情",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // 统计信息
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                StatItem(
                    icon = "📋",
                    label = "日志",
                    value = "${session.logs.size}条"
                )
                StatItem(
                    icon = "🌐",
                    label = "请求",
                    value = "${session.requestCount}个"
                )
                StatItem(
                    icon = "📤",
                    label = "上传",
                    value = "${session.uploadBytes}B"
                )
                StatItem(
                    icon = "📥",
                    label = "下载", 
                    value = "${session.downloadBytes}B"
                )
            }
        }
    }
}

@Composable
fun StatItem(
    icon: String,
    label: String,
    value: String
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = icon,
            fontSize = 16.sp
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}