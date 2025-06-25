package com.example.vpnself.ui.common.home

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.vpnself.ui.common.history.HistoryActivity
import com.example.vpnself.ui.common.script.ScriptActivity

class HomeActivity : ComponentActivity() {
    private lateinit var viewModel: HomeViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        viewModel = HomeViewModel()
        setContent {
            HomeScreen(viewModel = viewModel)
        }
    }


}

@Composable
fun HomeScreen(
    modifier: Modifier = Modifier,
    viewModel: HomeViewModel
) {
    val context = LocalContext.current
    val isCapturing by viewModel.isCapturing.collectAsState()
    val trafficStats by viewModel.trafficStats.collectAsState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "总览",
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(bottom = 24.dp)
        )

        // 按钮区域
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // 第一行按钮
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                Button(
                    onClick = { 
                        if (isCapturing) {
                            viewModel.stopCapture(context)
                        } else {
                            viewModel.startCapture(context)
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isCapturing) Color(0xFFE53935) else Color(0xFFE65100)
                    )
                ) {
                    Text(if (isCapturing) "停止抓包" else "开始抓包")
                }

                Button(
                    onClick = {
                        viewModel.navigateToCaptureHistory(context)
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF2196F3)
                    )
                ) {
                    Text("抓包历史")
                }
            }
            
            // 第二行按钮 - 抢购脚本
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                Button(
                    onClick = {
                        val intent = Intent(context, ScriptActivity::class.java)
                        context.startActivity(intent)
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF4CAF50)
                    )
                ) {
                    Text("抢购脚本")
                }
            }
        }

        // 流量统计区域
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp),
        ) {
            Column(
                modifier = Modifier
                    .padding(16.dp)
                    .fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceAround
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("上传流量")
                        Text("${trafficStats.uploadBytes} Byte")
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("下载流量")
                        Text("${trafficStats.downloadBytes} Byte")
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("请求数")
                        Text("${trafficStats.requestCount}")
                    }
                }
            }
        }
    }
}