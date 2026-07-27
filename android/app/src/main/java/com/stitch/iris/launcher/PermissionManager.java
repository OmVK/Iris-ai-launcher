package com.stitch.iris.launcher;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class PermissionManager {

    private static final String TAG = "IrisPermissionManager";
    private static PermissionManager instance;
    private final Context context;
    private final Map<String, PermissionInfo> permissionMap = new HashMap<>();
    private PermissionCallback pendingCallback;

    public interface PermissionCallback {
        void onResult(JSONArray results);
    }

    public static class PermissionInfo {
        public final String permission;
        public final String rationale;
        public final int requestCode;
        public final boolean isRuntime;

        public PermissionInfo(String permission, String rationale, int requestCode, boolean isRuntime) {
            this.permission = permission;
            this.rationale = rationale;
            this.requestCode = requestCode;
            this.isRuntime = isRuntime;
        }
    }

    public static synchronized PermissionManager getInstance(Context context) {
        if (instance == null) {
            instance = new PermissionManager(context.getApplicationContext());
        }
        return instance;
    }

    private PermissionManager(Context context) {
        this.context = context;
        initPermissionMap();
    }

    private void initPermissionMap() {
        // Wallpaper
        put("SET_WALLPAPER", "IRIS needs wallpaper permission to set and manage your home screen background.", 9101, false);
        put("READ_WALLPAPER_INTERNAL", "IRIS reads the current wallpaper to sync themes and colors.", 9102, false);

        // App management
        put("QUERY_ALL_PACKAGES", "IRIS needs to list all installed apps for the app drawer.", 9103, false);
        put("REQUEST_INSTALL_PACKAGES", "IRIS needs install permission to sideload updates when requested.", 9104, false);

        // Boot
        put("RECEIVE_BOOT_COMPLETED", "IRIS starts automatically on boot to remain your default launcher.", 9105, false);

        // Accessibility
        put("BIND_ACCESSIBILITY_SERVICE", "IRIS uses accessibility services for gesture navigation and app usage tracking.", 9106, false);

        // Usage stats
        put("PACKAGE_USAGE_STATS", "IRIS uses usage data to sort apps by frequency.", 9107, false);

        // Contacts & call log
        put("READ_CONTACTS", "IRIS shows your contacts for quick dial and pinned contacts.", 9108, true);
        put("READ_CALL_LOG", "IRIS displays recent calls on pinned contacts.", 9109, true);

        // Haptic
        put("VIBRATE", "IRIS uses vibration for haptic feedback on gestures and taps.", 9110, false);

        // Network
        put("CHANGE_NETWORK_STATE", "IRIS toggles network settings from the quick settings panel.", 9111, false);

        // Runtime permissions
        put("CAMERA", "IRIS uses the camera for silent threat capture and icon scanning.", 9112, true);
        put("RECORD_AUDIO", "IRIS uses the microphone for voice commands and live conversation.", 9113, true);
        put("ACCESS_FINE_LOCATION", "IRIS uses GPS for weather data and location-aware widgets.", 9114, true);
        put("ACCESS_COARSE_LOCATION", "IRIS uses approximate location for weather and local services.", 9115, true);
        put("READ_EXTERNAL_STORAGE", "IRIS reads storage for custom wallpapers and icon packs.", 9116, true);
        put("READ_MEDIA_IMAGES", "IRIS reads your photos for wallpaper import on Android 13+.", 9117, true);
        put("POST_NOTIFICATIONS", "IRIS sends notifications for task reminders and alerts.", 9118, true);

        // Settings / overlay
        put("WRITE_SETTINGS", "IRIS adjusts screen brightness and system settings.", 9119, true);
        put("SYSTEM_ALERT_WINDOW", "IRIS uses overlay for the floating recents panel.", 9120, true);
        put("ACCESS_NOTIFICATION_POLICY", "IRIS integrates with Do Not Disturb for silent hours.", 9121, true);

        // Biometric
        put("USE_BIOMETRIC", "IRIS uses biometric authentication for app lock and vault.", 9122, true);
    }

    private void put(String permission, String rationale, int requestCode, boolean isRuntime) {
        permissionMap.put(permission, new PermissionInfo(permission, rationale, requestCode, isRuntime));
    }

    public boolean isPermissionGranted(String permission) {
        // Special cases
        if ("BIND_ACCESSIBILITY_SERVICE".equals(permission)) {
            return isAccessibilityServiceEnabled();
        }
        if ("PACKAGE_USAGE_STATS".equals(permission)) {
            return isUsageStatsEnabled();
        }
        if ("SYSTEM_ALERT_WINDOW".equals(permission)) {
            return Settings.canDrawOverlays(context);
        }
        if ("WRITE_SETTINGS".equals(permission)) {
            return Settings.System.canWrite(context);
        }
        if ("REQUEST_INSTALL_PACKAGES".equals(permission)) {
            return context.getPackageManager().canRequestPackageInstalls();
        }

        PermissionInfo info = permissionMap.get(permission);
        if (info == null) return false;

        if (!info.isRuntime) {
            return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED;
        }

        String androidPermission = "android.permission." + permission;
        return ContextCompat.checkSelfPermission(context, androidPermission) == PackageManager.PERMISSION_GRANTED;
    }

    public boolean isAccessibilityServiceEnabled() {
        String serviceName = context.getPackageName() + "/" + IrisAccessibilityService.class.getCanonicalName();
        String enabledServices = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (enabledServices != null) {
            return enabledServices.contains(serviceName);
        }
        return false;
    }

    public boolean isUsageStatsEnabled() {
        android.app.usage.UsageStatsManager usm = (android.app.usage.UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
        if (usm != null) {
            long now = System.currentTimeMillis();
            List<android.app.usage.UsageStats> stats = usm.queryUsageStats(android.app.usage.UsageStatsManager.INTERVAL_BEST, now - 1000 * 60, now);
            return stats != null && !stats.isEmpty();
        }
        return false;
    }

    public void checkPermissions(String[] permissions, PermissionCallback callback) {
        this.pendingCallback = callback;
        JSONArray results = new JSONArray();

        for (String perm : permissions) {
            try {
                JSONObject obj = new JSONObject();
                obj.put("permission", perm);
                obj.put("granted", isPermissionGranted(perm));
                obj.put("rationale", getRationale(perm));
                obj.put("isRuntime", permissionMap.containsKey(perm) && permissionMap.get(perm).isRuntime);
                results.put(obj);
            } catch (Exception e) {
                Log.e(TAG, "Error checking permission: " + perm, e);
            }
        }

        if (callback != null) {
            callback.onResult(results);
        }
    }

    public void requestPermissions(String[] permissions, Activity activity, PermissionCallback callback) {
        this.pendingCallback = callback;
        List<String> toRequest = new ArrayList<>();

        for (String perm : permissions) {
            if (!isPermissionGranted(perm)) {
                toRequest.add(perm);
            }
        }

        if (toRequest.isEmpty()) {
            if (callback != null) {
                JSONArray results = new JSONArray();
                for (String perm : permissions) {
                    try {
                        JSONObject obj = new JSONObject();
                        obj.put("permission", perm);
                        obj.put("granted", true);
                        results.put(obj);
                    } catch (Exception e) {
                        Log.e(TAG, "Error creating result", e);
                    }
                }
                callback.onResult(results);
            }
            return;
        }

        // Filter to only runtime permissions that need Activity request
        List<String> runtimePerms = new ArrayList<>();
        for (String perm : toRequest) {
            PermissionInfo info = permissionMap.get(perm);
            if (info != null && info.isRuntime) {
                runtimePerms.add(perm);
            } else {
                // Non-runtime permissions need special intents
                openPermissionSettings(perm);
            }
        }

        if (!runtimePerms.isEmpty()) {
            String[] arr = runtimePerms.toArray(new String[0]);
            ActivityCompat.requestPermissions(activity, arr, 9000);
        }
    }

    public void openPermissionSettings(String permission) {
        try {
            Intent intent;
            switch (permission) {
                case "BIND_ACCESSIBILITY_SERVICE":
                    intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    break;
                case "PACKAGE_USAGE_STATS":
                    intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    break;
                case "SYSTEM_ALERT_WINDOW":
                    intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:" + context.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    break;
                case "WRITE_SETTINGS":
                    intent = new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS,
                            Uri.parse("package:" + context.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    break;
                case "REQUEST_INSTALL_PACKAGES":
                    intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + context.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    break;
                case "ACCESS_NOTIFICATION_POLICY":
                    intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    break;
                default:
                    intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                            Uri.parse("package:" + context.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    break;
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to open settings for permission: " + permission, e);
        }
    }

    public String getRationale(String permission) {
        PermissionInfo info = permissionMap.get(permission);
        return info != null ? info.rationale : "This permission is required for IRIS functionality.";
    }

    public int getRequestCode(String permission) {
        PermissionInfo info = permissionMap.get(permission);
        return info != null ? info.requestCode : 9999;
    }

    public Map<String, Boolean> getPermissionStatusSummary(String[] permissions) {
        Map<String, Boolean> summary = new HashMap<>();
        for (String perm : permissions) {
            summary.put(perm, isPermissionGranted(perm));
        }
        return summary;
    }
}
