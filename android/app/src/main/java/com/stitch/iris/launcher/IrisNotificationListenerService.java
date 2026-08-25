package com.stitch.iris.launcher;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public class IrisNotificationListenerService extends NotificationListenerService {

    private static final String TAG = "IrisNotificationService";
    public static final String ACTION_NOTIFICATION_UPDATED = "com.stitch.iris.launcher.NOTIFICATION_UPDATED";
    public static final String PREFS_NAME = "iris_launcher_prefs";
    public static final String KEY_LOCKED_PACKAGES = "locked_packages_set";
    private static IrisNotificationListenerService instance;

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        instance = this;
        Log.d(TAG, "Notification Listener Connected");
        cancelAllVaultNotificationsNow();
        broadcastUpdate();
    }

    @Override
    public void onListenerDisconnected() {
        super.onListenerDisconnected();
        instance = null;
    }

    private Set<String> getLockedPackages() {
        Set<String> pkgs = LauncherPlugin.getVaultPackages();
        if (pkgs != null && !pkgs.isEmpty()) {
            return pkgs;
        }
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            return prefs.getStringSet(KEY_LOCKED_PACKAGES, Collections.emptySet());
        } catch (Exception e) {
            Log.e(TAG, "Error reading locked packages from prefs", e);
            return Collections.emptySet();
        }
    }

    private boolean isPackageLocked(String pkg) {
        if (pkg == null) return false;
        Set<String> locked = getLockedPackages();
        return locked != null && locked.contains(pkg);
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            String pkg = sbn.getPackageName();
            if (pkg != null && isPackageLocked(pkg)) {
                cancelNotification(sbn.getKey());
                try {
                    cancelNotification(sbn.getPackageName(), sbn.getTag(), sbn.getId());
                } catch (Exception ignored) {}
                Log.d(TAG, "BLOCKED and cancelled notification for locked app: " + pkg);
                return;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking vault packages in onNotificationPosted", e);
        }
        broadcastUpdate();
    }

    public void cancelVaultNotification(String packageId) {
        try {
            StatusBarNotification[] active = getActiveNotifications();
            if (active == null) return;
            for (StatusBarNotification sbn : active) {
                if (packageId != null && packageId.equals(sbn.getPackageName())) {
                    cancelNotification(sbn.getKey());
                    try {
                        cancelNotification(sbn.getPackageName(), sbn.getTag(), sbn.getId());
                    } catch (Exception ignored) {}
                    Log.d(TAG, "Cancelled notification for locked app: " + packageId);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling vault notification", e);
        }
    }

    public void cancelAllVaultNotificationsNow() {
        try {
            Set<String> vaultPkgs = getLockedPackages();
            if (vaultPkgs == null || vaultPkgs.isEmpty()) return;
            StatusBarNotification[] active = getActiveNotifications();
            if (active == null) return;
            for (StatusBarNotification sbn : active) {
                String pkg = sbn.getPackageName();
                if (pkg != null && vaultPkgs.contains(pkg)) {
                    cancelNotification(sbn.getKey());
                    try {
                        cancelNotification(sbn.getPackageName(), sbn.getTag(), sbn.getId());
                    } catch (Exception ignored) {}
                    Log.d(TAG, "Cancelled locked app notification from: " + pkg);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling all vault notifications", e);
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        broadcastUpdate();
    }

    public static IrisNotificationListenerService getInstance() {
        return instance;
    }

    public JSONArray getActiveNotificationsJson() {
        JSONArray jsonArray = new JSONArray();
        try {
            StatusBarNotification[] activeNotifications = getActiveNotifications();
            if (activeNotifications != null) {
                Set<String> lockedPkgs = getLockedPackages();
                for (StatusBarNotification sbn : activeNotifications) {
                    if (!sbn.isClearable()) continue;

                    String pkg = sbn.getPackageName();
                    if (pkg != null && lockedPkgs != null && lockedPkgs.contains(pkg)) {
                        cancelNotification(sbn.getKey());
                        continue;
                    }

                    JSONObject obj = new JSONObject();
                    obj.put("id", sbn.getId());
                    obj.put("key", sbn.getKey());
                    obj.put("packageId", sbn.getPackageName());
                    obj.put("postTime", sbn.getPostTime());

                    Notification notification = sbn.getNotification();
                    if (notification != null && notification.extras != null) {
                        String title = notification.extras.getString(Notification.EXTRA_TITLE, "");
                        CharSequence textSeq = notification.extras.getCharSequence(Notification.EXTRA_TEXT);
                        String text = textSeq != null ? textSeq.toString() : "";
                        
                        if (title.isEmpty() && text.isEmpty()) continue;

                        obj.put("title", sanitizePii(title));
                        obj.put("text", sanitizePii(text));
                    }
                    jsonArray.put(obj);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting active notifications", e);
        }
        return jsonArray;
    }

    public static String sanitizePii(String input) {
        if (input == null || input.isEmpty()) return "";
        // 1. Scrub OTPs & authentication codes
        String sanitized = input.replaceAll("(?i)\\b(?:otp|code|pin|verification|auth|password|passcode)\\s*[:=-]?\\s*\\d{4,8}\\b", "[PROTECTED_OTP]");
        // 2. Scrub standalone 6-digit verification codes
        sanitized = sanitized.replaceAll("\\b\\d{3}[-\\s]\\d{3}\\b", "[SECURE_CODE]");
        // 3. Scrub credit card / payment account sequences
        sanitized = sanitized.replaceAll("\\b(?:\\d[ -]*?){13,19}\\b", "[CONFIDENTIAL_ACCOUNT]");
        // 4. Scrub email addresses
        sanitized = sanitized.replaceAll("(?i)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", "[REDACTED_EMAIL]");
        // 5. Scrub international phone numbers
        sanitized = sanitized.replaceAll("(?i)(\\+?\\d{1,3}[- .]?)?\\(?\\d{3}\\)?[- .]?\\d{3}[- .]?\\d{4}", "[REDACTED_PHONE]");
        // 6. Scrub crypto addresses (Ethereum / Bitcoin)
        sanitized = sanitized.replaceAll("\\b0x[a-fA-F0-9]{40}\\b", "[CRYPTO_ADDR]");
        sanitized = sanitized.replaceAll("\\b(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}\\b", "[CRYPTO_ADDR]");
        // 7. Scrub UPI IDs
        sanitized = sanitized.replaceAll("(?i)[a-zA-Z0-9.\\-_]{2,256}@[a-zA-Z]{2,64}", "[UPI_HANDLE]");
        return sanitized;
    }

    public void dismissNotification(String key) {
        try {
            cancelNotification(key);
            broadcastUpdate();
        } catch (Exception e) {
            Log.e(TAG, "Failed to dismiss notification", e);
        }
    }

    private void broadcastUpdate() {
        LauncherPlugin.onNotificationChanged();
    }
}
