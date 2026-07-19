package com.stitch.iris.launcher;

import android.app.Notification;
import android.content.Intent;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

public class IrisNotificationListenerService extends NotificationListenerService {

    private static final String TAG = "IrisNotificationService";
    public static final String ACTION_NOTIFICATION_UPDATED = "com.stitch.iris.launcher.NOTIFICATION_UPDATED";
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

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            String pkg = sbn.getPackageName();
            if (pkg != null && LauncherPlugin.getVaultPackages().contains(pkg)) {
                cancelNotification(sbn.getKey());
                return;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking vault packages", e);
        }
        broadcastUpdate();
    }

    public void cancelVaultNotification(String packageId) {
        try {
            StatusBarNotification[] active = getActiveNotifications();
            if (active == null) return;
            for (StatusBarNotification sbn : active) {
                if (packageId.equals(sbn.getPackageName())) {
                    cancelNotification(sbn.getKey());
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling vault notification", e);
        }
    }

    private void cancelAllVaultNotificationsNow() {
        try {
            java.util.Set<String> vaultPkgs = LauncherPlugin.getVaultPackages();
            if (vaultPkgs == null || vaultPkgs.isEmpty()) return;
            StatusBarNotification[] active = getActiveNotifications();
            if (active == null) return;
            for (StatusBarNotification sbn : active) {
                String pkg = sbn.getPackageName();
                if (pkg != null && vaultPkgs.contains(pkg)) {
                    cancelNotification(sbn.getKey());
                    Log.d(TAG, "Cancelled vault notification from: " + pkg);
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
                for (StatusBarNotification sbn : activeNotifications) {
                    if (!sbn.isClearable()) continue;

                    String pkg = sbn.getPackageName();
                    if (pkg != null && LauncherPlugin.getVaultPackages().contains(pkg)) {
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

                        obj.put("title", title);
                        obj.put("text", text);
                    }
                    jsonArray.put(obj);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting active notifications", e);
        }
        return jsonArray;
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
