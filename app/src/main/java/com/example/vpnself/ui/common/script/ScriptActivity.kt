package com.example.vpnself.ui.common.script

import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.vpnself.script.AutoBuyAccessibilityService
import com.example.vpnself.script.PermissionManager
import com.example.vpnself.ui.theme.VPNSelfTheme

class ScriptActivity : ComponentActivity() {
    
    private lateinit var permissionManager: PermissionManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        permissionManager = PermissionManager(this)
        
        setContent {
            VPNSelfTheme {
                ScriptScreen()
            }
        }
    }
    
    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    fun ScriptScreen() {
        var isAccessibilityEnabled by remember { mutableStateOf(permissionManager.isAccessibilityServiceEnabled()) }
        var isOverlayEnabled by remember { mutableStateOf(permissionManager.canDrawOverlays()) }
        var scriptStatus by remember { mutableStateOf("未启动") }
        var capturedApis by remember { mutableStateOf<List<String>>(emptyList()) }
        
        val context = LocalContext.current
        
        // 定期更新状态
        LaunchedEffect(Unit) {
            while (true) {
                isAccessibilityEnabled = permissionManager.isAccessibilityServiceEnabled()
                isOverlayEnabled = permissionManager.canDrawOverlays()
                scriptStatus = AutoBuyAccessibilityService.instance?.getScriptStatus() ?: "服务未启动"
                capturedApis = AutoBuyAccessibilityService.instance?.getCapturedApis()?.toList() ?: emptyList()
                kotlinx.coroutines.delay(1000)
            }
        }
        
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { 
                        Text(
                            text = "抢购脚本",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        ) 
                    }
                )
            }
        ) { paddingValues ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 权限状态卡片
                item {
                    PermissionStatusCard(
                        isAccessibilityEnabled = isAccessibilityEnabled,
                        isOverlayEnabled = isOverlayEnabled,
                        onRequestAccessibility = {
                            requestAccessibilityPermission()
                        },
                        onRequestOverlay = {
                            requestOverlayPermission()
                        }
                    )
                }
                
                // 脚本控制卡片
                item {
                    ScriptControlCard(
                        scriptStatus = scriptStatus,
                        isEnabled = isAccessibilityEnabled && isOverlayEnabled,
                        onStartScript = {
                            AutoBuyAccessibilityService.instance?.startScript()
                            Toast.makeText(context, "脚本已启动", Toast.LENGTH_SHORT).show()
                        },
                        onStopScript = {
                            AutoBuyAccessibilityService.instance?.stopScript()
                            Toast.makeText(context, "脚本已停止", Toast.LENGTH_SHORT).show()
                        }
                    )
                }
                
                // API监控卡片
                item {
                    ApiMonitorCard(capturedApis = capturedApis)
                }
                
                // 使用说明卡片
                item {
                    InstructionCard()
                }
            }
        }
    }
    
    @Composable
    fun PermissionStatusCard(
        isAccessibilityEnabled: Boolean,
        isOverlayEnabled: Boolean,
        onRequestAccessibility: () -> Unit,
        onRequestOverlay: () -> Unit
    ) {
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "权限状态",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // 无障碍服务权限
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("无障碍服务")
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = if (isAccessibilityEnabled) "已启用" else "未启用",
                            color = if (isAccessibilityEnabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                        )
                        if (!isAccessibilityEnabled) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Button(
                                onClick = onRequestAccessibility,
                                modifier = Modifier.height(32.dp)
                            ) {
                                Text("开启", fontSize = 12.sp)
                            }
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // 悬浮窗权限
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("悬浮窗权限")
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = if (isOverlayEnabled) "已启用" else "未启用",
                            color = if (isOverlayEnabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                        )
                        if (!isOverlayEnabled) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Button(
                                onClick = onRequestOverlay,
                                modifier = Modifier.height(32.dp)
                            ) {
                                Text("开启", fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }
    
    @Composable
    fun ScriptControlCard(
        scriptStatus: String,
        isEnabled: Boolean,
        onStartScript: () -> Unit,
        onStopScript: () -> Unit
    ) {
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "脚本控制",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                Text(
                    text = "状态: $scriptStatus",
                    fontSize = 14.sp
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = onStartScript,
                        enabled = isEnabled && scriptStatus != "运行中",
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("开始抢购")
                    }
                    
                    Button(
                        onClick = onStopScript,
                        enabled = isEnabled && scriptStatus == "运行中",
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error
                        )
                    ) {
                        Text("停止抢购")
                    }
                }
            }
        }
    }
    
    @Composable
    fun ApiMonitorCard(capturedApis: List<String>) {
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "API监控 (${capturedApis.size})",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                if (capturedApis.isEmpty()) {
                    Text(
                        text = "暂无捕获的API",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    capturedApis.takeLast(5).forEach { api ->
                        Text(
                            text = api,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(vertical = 2.dp)
                        )
                    }
                    if (capturedApis.size > 5) {
                        Text(
                            text = "...",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
    
    @Composable
    fun InstructionCard() {
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "使用说明",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                val instructions = listOf(
                    "1. 首先开启无障碍服务和悬浮窗权限",
                    "2. 打开微信小程序的抢购页面",
                                         "3. 点击开始抢购启动脚本",
                    "4. 脚本会自动监控API接口并执行抢购",
                    "5. 通过悬浮窗可以随时控制脚本状态",
                    "6. 脚本会每隔500ms进行一次检测和操作"
                )
                
                instructions.forEach { instruction ->
                    Text(
                        text = instruction,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(vertical = 2.dp)
                    )
                }
            }
        }
    }
    
    private fun requestAccessibilityPermission() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        startActivity(intent)
        Toast.makeText(this, "请在设置中开启无障碍服务", Toast.LENGTH_LONG).show()
    }
    
    private fun requestOverlayPermission() {
        val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
        intent.data = Uri.parse("package:$packageName")
        startActivity(intent)
        Toast.makeText(this, "请允许显示悬浮窗", Toast.LENGTH_LONG).show()
    }
} 