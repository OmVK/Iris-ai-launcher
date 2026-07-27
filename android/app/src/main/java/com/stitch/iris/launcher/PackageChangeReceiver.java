package com.stitch.iris.launcher;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.util.Log;

import org.json.JSONObject;

public class PackageChangeReceiver extends BroadcastReceiver {

    private static final String TAG = "IrisPackageChange";
    public static final String ACTION_PACKAGE_ADDED = "com.stitch.iris.launcher.PACKAGE_ADDED";
    public static final String ACTION_PACKAGE_REMOVED = "com.stitch.iris.launcher.PACKAGE_REMOVED";
    public static final String ACTION_PACKAGE_CHANGED = "com.stitch.iris.launcher.PACKAGE_CHANGED";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getData() == null) return;

        String packageName = intent.getData().getSchemeSpecificPart();
        if (packageName == null || packageName.isEmpty()) return;

        // Ignore our own package
        if (packageName.equals(context.getPackageName())) return;

        String action = intent.getAction();
        if (action == null) return;

        int eventCode = -1;
        String eventType = "UNKNOWN";

        switch (action) {
            case Intent.ACTION_PACKAGE_ADDED:
                eventCode = 0;
                eventType = "ADDED";
                break;
            case Intent.ACTION_PACKAGE_REMOVED:
                eventCode = 1;
                eventType = "REMOVED";
                break;
            case Intent.ACTION_PACKAGE_CHANGED:
                eventCode = 2;
                eventType = "CHANGED";
                break;
            case Intent.ACTION_PACKAGE_REPLACED:
                eventCode = 3;
                eventType = "REPLACED";
                break;
        }

        if (eventCode == -1) return;

        Log.d(TAG, "Package " + eventType + ": " + packageName);

        // Try to get app info
        String appName = packageName;
        try {
            PackageManager pm = context.getPackageManager();
            PackageInfo pkgInfo = pm.getPackageInfo(packageName, 0);
            if (pkgInfo != null && pkgInfo.applicationInfo != null) {
                appName = pkgInfo.applicationInfo.loadLabel(pm).toString();
            }
        } catch (Exception e) {
            // Package may have been uninstalled, use packageId as name
        }

        // Broadcast the event so the Capacitor bridge can receive it
        try {
            Intent broadcastIntent = new Intent();
            broadcastIntent.setAction("com.stitch.iris.launcher.PACKAGE_CHANGE_EVENT");
            broadcastIntent.putExtra("packageName", packageName);
            broadcastIntent.putExtra("appName", appName);
            broadcastIntent.putExtra("eventCode", eventCode);
            broadcastIntent.putExtra("eventType", eventType);
            broadcastIntent.setPackage(context.getPackageName());
            context.sendBroadcast(broadcastIntent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to broadcast package change event", e);
        }

        // Also notify via LauncherPlugin if connected
        try {
            if (LauncherPlugin.getInstance() != null) {
                JSONObject data = new JSONObject();
                data.put("packageName", packageName);
                data.put("appName", appName);
                data.put("eventCode", eventCode);
                data.put("eventType", eventType);
                LauncherPlugin.getInstance().notifyPackageChange(data.toString());
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to notify LauncherPlugin", e);
        }
    }
}
