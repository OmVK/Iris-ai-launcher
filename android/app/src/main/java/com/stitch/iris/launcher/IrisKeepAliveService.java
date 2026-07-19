package com.stitch.iris.launcher;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class IrisKeepAliveService extends Service {
    private static final String TAG = "IrisKeepAlive";
    private static final String CHANNEL_ID = "IrisKeepAliveChannel";
    private static final int NOTIFICATION_ID = 999;
    private PowerManager.WakeLock mWakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        acquireWakeLock();
    }

    private void acquireWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                mWakeLock = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "IrisKeepAlive::BackgroundLock"
                );
            // Short timeout to minimize battery drain; service restarts itself
            mWakeLock.acquire(5 * 60 * 1000L); // 5 minutes
            Log.d(TAG, "WakeLock acquired (5 min timeout)");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to acquire WakeLock", e);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Iris System Keep-Alive",
                NotificationManager.IMPORTANCE_MIN
        );
        channel.setDescription("Keeps Iris launcher process alive in background");
        channel.setShowBadge(false);
        channel.enableLights(false);
        channel.enableVibration(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) {
            releaseWakeLock();
            stopSelf();
            return START_NOT_STICKY;
        }

        // Reacquire WakeLock on each restart to keep it alive
        acquireWakeLock();

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("IRIS")
                .setContentText("System core active")
                .setSmallIcon(android.R.drawable.ic_menu_info_details)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setOngoing(true)
                .setSilent(true)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        Log.d(TAG, "KeepAlive service started as foreground");

        return START_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        Log.d(TAG, "Task removed, scheduling restart");
        scheduleRestart();
    }

    private void scheduleRestart() {
        try {
            Intent restartIntent = new Intent(getApplicationContext(), IrisKeepAliveService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(restartIntent);
            } else {
                startService(restartIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to restart from onTaskRemoved", e);
        }
    }

    @Override
    public void onDestroy() {
        releaseWakeLock();
        Log.d(TAG, "KeepAlive service destroyed");
        super.onDestroy();
    }

    private void releaseWakeLock() {
        try {
            if (mWakeLock != null && mWakeLock.isHeld()) {
                mWakeLock.release();
                mWakeLock = null;
                Log.d(TAG, "WakeLock released");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to release WakeLock", e);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
