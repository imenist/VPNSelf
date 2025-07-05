package com.example.vpnself.script

import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.util.Log
import android.widget.Toast

/**
 * 服务助手类
 * 用于检查和启动必要的系统服务
 */
object ServiceHelper {
    
    private const val TAG = "ServiceHelper"
    
    /**
     * 检查无障碍服务是否已启动
     */
    fun checkAccessibilityService(context: Context): Boolean {
        val permissionManager = PermissionManager(context)
        return permissionManager.isAccessibilityServiceEnabled()
    }
    
    /**
     * 引导用户启动无障碍服务
     */
    fun guideToEnableAccessibilityService(context: Context) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
            
            Toast.makeText(
                context,
                "请在无障碍服务中找到「VPNSelf」并启用\n" +
                "启用后返回应用即可使用抢购功能",
                Toast.LENGTH_LONG
            ).show()
            
            Log.i(TAG, "已引导用户到无障碍服务设置页面")
        } catch (e: Exception) {
            Log.e(TAG, "无法打开无障碍服务设置页面: ${e.message}")
            Toast.makeText(
                context,
                "无法打开设置页面，请手动进入：\n设置 -> 无障碍 -> VPNSelf",
                Toast.LENGTH_LONG
            ).show()
        }
    }
    
    /**
     * 检查悬浮窗权限
     */
    fun checkOverlayPermission(context: Context): Boolean {
        val permissionManager = PermissionManager(context)
        return permissionManager.canDrawOverlays()
    }
    
    /**
     * 引导用户启动悬浮窗权限
     */
    fun guideToEnableOverlayPermission(context: Context) {
        try {
            val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
            
            Toast.makeText(
                context,
                "请允许「VPNSelf」显示在其他应用上层",
                Toast.LENGTH_LONG
            ).show()
            
            Log.i(TAG, "已引导用户到悬浮窗权限设置页面")
        } catch (e: Exception) {
            Log.e(TAG, "无法打开悬浮窗权限设置页面: ${e.message}")
            Toast.makeText(
                context,
                "无法打开设置页面，请手动进入：\n设置 -> 应用管理 -> VPNSelf -> 权限",
                Toast.LENGTH_LONG
            ).show()
        }
    }
    
    /**
     * 检查所有必要权限
     */
    fun checkAllPermissions(context: Context): ServiceStatus {
        val accessibilityEnabled = checkAccessibilityService(context)
        val overlayEnabled = checkOverlayPermission(context)
        val serviceRunning = AutoBuyAccessibilityService.instance != null
        
        return ServiceStatus(
            accessibilityEnabled = accessibilityEnabled,
            overlayEnabled = overlayEnabled,
            serviceRunning = serviceRunning
        )
    }
    
    /**
     * 获取服务状态描述
     */
    fun getServiceStatusDescription(context: Context): String {
        val status = checkAllPermissions(context)
        
        return when {
            status.isAllReady() -> "✅ 所有服务已就绪"
            !status.accessibilityEnabled -> "⚠️ 需要启用无障碍服务"
            !status.overlayEnabled -> "⚠️ 需要启用悬浮窗权限"
            !status.serviceRunning -> "⚠️ 无障碍服务未运行"
            else -> "❌ 服务状态异常"
        }
    }
    
    /**
     * 尝试修复服务问题
     */
    fun tryFixServices(context: Context) {
        val status = checkAllPermissions(context)
        
        when {
            !status.accessibilityEnabled -> {
                guideToEnableAccessibilityService(context)
            }
            !status.overlayEnabled -> {
                guideToEnableOverlayPermission(context)
            }
            !status.serviceRunning -> {
                Toast.makeText(
                    context,
                    "无障碍服务权限已授予，但服务未启动\n请重启应用或重新启用无障碍服务",
                    Toast.LENGTH_LONG
                ).show()
            }
            else -> {
                Toast.makeText(
                    context,
                    "服务状态正常",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }
    
    /**
     * 服务状态数据类
     */
    data class ServiceStatus(
        val accessibilityEnabled: Boolean,
        val overlayEnabled: Boolean,
        val serviceRunning: Boolean
    ) {
        fun isAllReady(): Boolean {
            return accessibilityEnabled && overlayEnabled && serviceRunning
        }
    }
} 