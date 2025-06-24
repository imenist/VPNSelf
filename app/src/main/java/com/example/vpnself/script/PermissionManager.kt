package com.example.vpnself.script

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.provider.Settings
import android.text.TextUtils
import android.view.accessibility.AccessibilityManager

class PermissionManager(private val context: Context) {
    
    /**
     * 检查无障碍服务是否已启用
     */
    fun isAccessibilityServiceEnabled(): Boolean {
        val accessibilityManager = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        )
        
        if (enabledServices.isNullOrEmpty()) {
            return false
        }
        
        val serviceName = "${context.packageName}/${AutoBuyAccessibilityService::class.java.name}"
        val colonSplitter = TextUtils.SimpleStringSplitter(':')
        colonSplitter.setString(enabledServices)
        
        while (colonSplitter.hasNext()) {
            val componentName = colonSplitter.next()
            if (componentName.equals(serviceName, ignoreCase = true)) {
                return true
            }
        }
        
        return false
    }
    
    /**
     * 检查悬浮窗权限是否已启用
     */
    fun canDrawOverlays(): Boolean {
        return Settings.canDrawOverlays(context)
    }
    
    /**
     * 检查所有必要权限是否已启用
     */
    fun areAllPermissionsGranted(): Boolean {
        return isAccessibilityServiceEnabled() && canDrawOverlays()
    }
    
    /**
     * 获取无障碍服务信息
     */
    fun getAccessibilityServiceInfo(): AccessibilityServiceInfo? {
        val accessibilityManager = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
        val enabledServices = accessibilityManager.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
        
        val serviceName = AutoBuyAccessibilityService::class.java.name
        
        for (service in enabledServices) {
            if (service.resolveInfo.serviceInfo.name == serviceName) {
                return service
            }
        }
        
        return null
    }
} 