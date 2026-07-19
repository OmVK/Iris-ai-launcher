package com.stitch.iris.launcher;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.app.NotificationCompat;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import android.os.Bundle;
import java.util.ArrayList;

public class IrisScreenCaptureService extends Service {
    private static final String TAG = "IrisScreenCapture";
    private static final String CHANNEL_ID = "IrisScreenCaptureChannel";
    private static final int NOTIFICATION_ID = 888;

    private MediaProjectionManager mProjectionManager;
    private MediaProjection mMediaProjection;
    private VirtualDisplay mVirtualDisplay;
    private ImageReader mImageReader;

    private WindowManager mWindowManager;
    private View mFloatingView;
    private TextView mQuestionText;
    private TextView mAnswerText;
    private WindowManager.LayoutParams mFloatingParams;

    private Handler mHandler;
    private volatile boolean isCapturing = false;
    
    // Callbacks to LauncherPlugin
    public static FrameListener frameListener;
    public interface FrameListener {
        void onFrame(String base64Image);
        void onSpeechPartial(String text);
        void onSpeechFinal(String text);
    }

    // Static instance to update text from LauncherPlugin
    public static IrisScreenCaptureService instance;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        mHandler = new Handler(Looper.getMainLooper());
        mProjectionManager = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        createNotificationChannel();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Iris Screen Capture",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(serviceChannel);
        }
    }

    // UI Elements removed for stealth background mode

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Iris Assistant")
                .setContentText("Background Screen Capture Active")
                .setSmallIcon(android.R.drawable.ic_menu_camera)
                .build();

        startForeground(NOTIFICATION_ID, notification);
        
        return START_STICKY;
    }

    private void startProjection(int resultCode, Intent data) {
        mMediaProjection = mProjectionManager.getMediaProjection(resultCode, data);
        if (mMediaProjection == null) return;

        DisplayMetrics metrics = getResources().getDisplayMetrics();
        // Downscale for performance (LLMs don't need 4K)
        int width = metrics.widthPixels / 2;
        int height = metrics.heightPixels / 2;
        int density = metrics.densityDpi;

        // ImageReader for capturing frames
        mImageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2);
        
        mVirtualDisplay = mMediaProjection.createVirtualDisplay("IrisScreen",
                width, height, density,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                mImageReader.getSurface(), null, mHandler);

        isCapturing = true;
        captureLoop();
    }

    private void captureLoop() {
        if (!isCapturing) return;

        Image image = null;
        try {
            image = mImageReader.acquireLatestImage();
            if (image != null) {
                Image.Plane[] planes = image.getPlanes();
                ByteBuffer buffer = planes[0].getBuffer();
                int pixelStride = planes[0].getPixelStride();
                int rowStride = planes[0].getRowStride();
                int rowPadding = rowStride - pixelStride * mImageReader.getWidth();

                Bitmap bitmap = Bitmap.createBitmap(mImageReader.getWidth() + rowPadding / pixelStride,
                        mImageReader.getHeight(), Bitmap.Config.ARGB_8888);
                bitmap.copyPixelsFromBuffer(buffer);
                
                // Crop out the padding
                Bitmap cropped = Bitmap.createBitmap(bitmap, 0, 0, mImageReader.getWidth(), mImageReader.getHeight());
                
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                cropped.compress(Bitmap.CompressFormat.JPEG, 40, bos);
                byte[] bitmapData = bos.toByteArray();
                String base64 = Base64.encodeToString(bitmapData, Base64.NO_WRAP);
                
                bitmap.recycle();
                cropped.recycle();
                
                if (frameListener != null) {
                    frameListener.onFrame(base64);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to capture screen frame", e);
        } finally {
            if (image != null) {
                image.close();
            }
        }

        // Capture 1 frame per second
        mHandler.postDelayed(this::captureLoop, 1000);
    }
    @Override
    public void onDestroy() {
        isCapturing = false;
        if (mHandler != null) {
            mHandler.removeCallbacksAndMessages(null);
        }
        if (mVirtualDisplay != null) {
            try { mVirtualDisplay.release(); } catch (Exception e) { Log.e(TAG, "Failed to release VirtualDisplay", e); }
            mVirtualDisplay = null;
        }
        if (mImageReader != null) {
            try { mImageReader.close(); } catch (Exception e) { Log.e(TAG, "Failed to close ImageReader", e); }
            mImageReader = null;
        }
        if (mMediaProjection != null) {
            try { mMediaProjection.stop(); } catch (Exception e) { Log.e(TAG, "Failed to stop MediaProjection", e); }
            mMediaProjection = null;
        }
        if (mFloatingView != null && mWindowManager != null) {
            try { mWindowManager.removeView(mFloatingView); } catch (Exception e) {}
        }
        instance = null;
        super.onDestroy();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        Log.d(TAG, "Task removed, stopping screen capture service");
        stopSelf();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
