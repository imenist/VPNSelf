package com.example.vpnself.vpn

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import androidx.core.app.NotificationCompat
import com.example.vpnself.ui.common.home.HomeActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.InetSocketAddress
import java.nio.ByteBuffer
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class PacketCaptureService : VpnService() {
    private var vpnInterface: ParcelFileDescriptor? = null
    private val running = AtomicBoolean(false)
    private var vpnJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO)
    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val _trafficStats = MutableStateFlow(TrafficStats())
    val trafficStats: StateFlow<TrafficStats> = _trafficStats

    companion object {
        private const val NOTIFICATION_CHANNEL_ID = "vpn_capture"
        private const val NOTIFICATION_ID = 1
        private const val BUFFER_SIZE = 32767
        private const val MTU = 1500
        private const val VPN_ADDRESS = "10.1.10.1"
        private const val VPN_ROUTE = "0.0.0.0"
    }

    data class TrafficStats(
        val uploadBytes: Long = 0,
        val downloadBytes: Long = 0,
        val requestCount: Int = 0
    )

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return if (intent?.action == "STOP") {
            stopVpn()
            stopSelf()
            START_NOT_STICKY
        } else {
            startVpn()
            START_STICKY
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "VPN Capture Service",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "VPN抓包服务通知"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun showNotification() {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, HomeActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("VPN 抓包服务运行中")
            .setContentText("点击查看详情")
            .setContentIntent(pendingIntent)
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .setOngoing(true)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    private fun startVpn() {
        if (running.get()) return
        running.set(true)
        
        try {
            // 配置VPN接口
            vpnInterface = Builder()
                .setSession("VPNSelf")
                .addAddress(VPN_ADDRESS, 24)
                .addDnsServer("8.8.8.8")
                .addDnsServer("8.8.4.4")
                .addRoute(VPN_ROUTE, 0)
                .allowFamily(android.system.OsConstants.AF_INET)
                .allowFamily(android.system.OsConstants.AF_INET6)
                .setBlocking(true)
                .setMtu(MTU)
                .establish()

            showNotification()
            startCapture()
        } catch (e: Exception) {
            e.printStackTrace()
            running.set(false)
        }
    }

    private fun startCapture() {
        vpnJob = scope.launch {
            try {
                val inputStream = FileInputStream(vpnInterface?.fileDescriptor)
                val outputStream = FileOutputStream(vpnInterface?.fileDescriptor)
                val buffer = ByteBuffer.allocate(BUFFER_SIZE)
                var uploadTotal = 0L
                var downloadTotal = 0L
                var requestCount = 0

                while (running.get()) {
                    // 从VPN接口读取数据
                    val length = inputStream.read(buffer.array())
                    if (length > 0) {
                        // 更新统计信息
                        uploadTotal += length
                        requestCount++

                        // 处理IP包
                        val version = buffer.get(0).toInt() shr 4
                        if (version == 4) { // IPv4
                            val protocol = buffer.get(9).toInt()
                            when (protocol) {
                                6, 17 -> { // TCP or UDP
                                    // 获取目标地址和端口
                                    val destAddress = InetSocketAddress(
                                        "${buffer.get(16)}.${buffer.get(17)}.${buffer.get(18)}.${buffer.get(19)}",
                                        (buffer.get(22).toInt() and 0xFF shl 8) or (buffer.get(23).toInt() and 0xFF)
                                    )

                                    // 将数据包直接写回VPN接口 (不再调用protect)
                                    outputStream.write(buffer.array(), 0, length)
                                }
                            }
                        }

                        // 更新流量统计
                        _trafficStats.value = TrafficStats(
                            uploadBytes = uploadTotal,
                            downloadBytes = downloadTotal,
                            requestCount = requestCount
                        )

                        buffer.clear()
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun stopVpn() {
        running.set(false)
        vpnJob?.cancel()
        vpnInterface?.close()
        vpnInterface = null
        stopForeground(true)
    }

    override fun onDestroy() {
        super.onDestroy()
        stopVpn()
        okHttpClient.dispatcher.executorService.shutdown()
    }
} 