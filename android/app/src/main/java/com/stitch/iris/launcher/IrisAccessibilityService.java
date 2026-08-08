package com.stitch.iris.launcher;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.os.Build;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import java.util.List;

public class IrisAccessibilityService extends AccessibilityService {

    private static final String TAG = "IrisAccessibilityService";
    private static IrisAccessibilityService instance;
    private static final int GESTURE_SWIPE_THRESHOLD = 100;
    private float touchStartX = 0;
    private float touchStartY = 0;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;
        // Track window content changes for recents screenshots
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            try {
                CharSequence pkg = event.getPackageName();
                if (pkg != null && !pkg.toString().equals(getPackageName())) {
                    broadcastWindowChanged(pkg.toString());
                }
            } catch (Exception e) {
                Log.e(TAG, "Error tracking window change", e);
            }
        }
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Accessibility service interrupted");
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        Log.d(TAG, "IRIS Accessibility Service connected");

        AccessibilityServiceInfo info = getServiceInfo();
        if (info == null) {
            info = new AccessibilityServiceInfo();
        }
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED | AccessibilityEvent.TYPE_VIEW_CLICKED;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.notificationTimeout = 100;
        info.flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS |
                     AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS |
                     AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
        setServiceInfo(info);
    }

    @Override
    public void onDestroy() {
        instance = null;
        super.onDestroy();
    }

    public static IrisAccessibilityService getInstance() {
        return instance;
    }

    public void performGlobalActionCompat(int action) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            performGlobalAction(action);
        }
    }

    public void takeScreenshotCompat() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            takeScreenshot(
                android.view.Display.DEFAULT_DISPLAY,
                getMainExecutor(),
                new TakeScreenshotCallback() {
                    @Override
                    public void onSuccess(ScreenshotResult result) {
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                android.graphics.Bitmap bitmap = android.graphics.Bitmap.wrapHardwareBuffer(
                                    result.getHardwareBuffer(),
                                    result.getColorSpace()
                                );
                                if (bitmap != null) {
                                    broadcastScreenshot(bitmap);
                                    bitmap.recycle();
                                }
                            }

                        } catch (Exception e) {
                            Log.e(TAG, "Error processing screenshot", e);
                        }
                    }

                    @Override
                    public void onFailure(int errorCode) {
                        Log.e(TAG, "Screenshot failed with error code: " + errorCode);
                    }
                }
            );
        }
    }

    public AccessibilityNodeInfo findNodeByText(String text) {
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null) return null;
        List<AccessibilityNodeInfo> nodes = rootNode.findAccessibilityNodeInfosByText(text);
        if (nodes != null && !nodes.isEmpty()) {
            return nodes.get(0);
        }
        return null;
    }

    public void clickNode(AccessibilityNodeInfo node) {
        if (node != null) {
            node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
        }
    }

    private void broadcastWindowChanged(String packageName) {
        try {
            LauncherPlugin.onWindowChanged(packageName);
        } catch (Exception e) {
            Log.e(TAG, "Error notifying window change", e);
        }
    }

    private void broadcastScreenshot(android.graphics.Bitmap bitmap) {
        try {
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 40, baos);
            byte[] bytes = baos.toByteArray();
            String base64 = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP);
            LauncherPlugin.onScreenshotCaptured(base64);
        } catch (Exception e) {
            Log.e(TAG, "Error notifying screenshot", e);
        }
    }
}
