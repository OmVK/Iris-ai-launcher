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
    private final android.os.Handler serviceHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    private Runnable continuousScrollRunnable = null;
    private int continuousScrollTicks = 0;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.isPassword()) return;
        if (IrisFloatingCopilot.isScreenLocked(this)) {
            IrisFloatingCopilot copilot = IrisFloatingCopilot.getInstance();
            if (copilot != null) {
                copilot.hideCard();
                copilot.hidePill();
            }
            return;
        }
        int eventType = event.getEventType();
        if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            try {
                CharSequence pkg = event.getPackageName();
                if (pkg != null) {
                    String pkgStr = pkg.toString();
                    if (!pkgStr.equals(getPackageName())) {
                        broadcastWindowChanged(pkgStr);
                    }
                    IrisFloatingCopilot copilot = IrisFloatingCopilot.getInstance();
                    if (copilot != null) {
                        copilot.onPackageChanged(pkgStr);
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Error tracking window change", e);
            }
        } else if (eventType == AccessibilityEvent.TYPE_VIEW_FOCUSED || eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) {
            try {
                IrisFloatingCopilot copilot = IrisFloatingCopilot.getInstance();
                if (copilot != null) {
                    AccessibilityNodeInfo src = event.getSource();
                    if (src != null && src.isEditable()) {
                        copilot.onUserInputActive();
                    }
                }
            } catch (Exception ignored) {}
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
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                | AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
                | AccessibilityEvent.TYPE_VIEW_FOCUSED
                | AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.flags = AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
                | AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
                | AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS;
        info.notificationTimeout = 100;
        setServiceInfo(info);

        try {
            IrisFloatingCopilot.initialize(this);
        } catch (Exception e) {
            Log.e(TAG, "Error initializing floating copilot", e);
        }
    }

    @Override
    public void onDestroy() {
        IrisFloatingCopilot.destroy();
        instance = null;
        super.onDestroy();
    }

    public static IrisAccessibilityService getInstance() {
        return instance;
    }

    public IrisFloatingCopilot.ScreenContextData getCurrentScreenData() {
        IrisFloatingCopilot copilot = IrisFloatingCopilot.getInstance();
        return copilot != null ? copilot.extractScreenContext() : null;
    }

    public boolean injectTextToInput(String text) {
        IrisFloatingCopilot copilot = IrisFloatingCopilot.getInstance();
        return copilot != null && copilot.injectText(text);
    }

    public void setCopilotEnabled(boolean enabled) {
        IrisFloatingCopilot copilot = IrisFloatingCopilot.getInstance();
        if (copilot != null) copilot.setEnabled(enabled);
    }

    public boolean isCopilotEnabled() {
        IrisFloatingCopilot copilot = IrisFloatingCopilot.getInstance();
        return copilot != null && copilot.isEnabled();
    }

    public void performGlobalActionCompat(int action) {
        if (IrisFloatingCopilot.isScreenLocked(this)) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            performGlobalAction(action);
        }
    }

    public boolean performScrollStep(String direction) {
        if (IrisFloatingCopilot.isScreenLocked(this)) return false;
        boolean isUp = "up".equalsIgnoreCase(direction) || "backward".equalsIgnoreCase(direction);
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root != null) {
            AccessibilityNodeInfo scrollable = findScrollableNode(root);
            if (scrollable != null) {
                int act = isUp
                        ? AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
                        : AccessibilityNodeInfo.ACTION_SCROLL_FORWARD;
                if (scrollable.performAction(act)) return true;
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            android.util.DisplayMetrics dm = getResources().getDisplayMetrics();
            int cx = dm.widthPixels / 2;
            int startY = isUp ? (int) (dm.heightPixels * 0.30f) : (int) (dm.heightPixels * 0.74f);
            int endY = isUp ? (int) (dm.heightPixels * 0.74f) : (int) (dm.heightPixels * 0.28f);
            android.graphics.Path path = new android.graphics.Path();
            path.moveTo(cx, startY);
            path.lineTo(cx, endY);
            android.accessibilityservice.GestureDescription.StrokeDescription stroke =
                    new android.accessibilityservice.GestureDescription.StrokeDescription(path, 0, 320);
            android.accessibilityservice.GestureDescription gesture =
                    new android.accessibilityservice.GestureDescription.Builder().addStroke(stroke).build();
            return dispatchGesture(gesture, null, null);
        }
        return false;
    }

    private AccessibilityNodeInfo findScrollableNode(AccessibilityNodeInfo node) {
        if (node == null) return null;
        if (node.isScrollable()) return node;
        int count = node.getChildCount();
        for (int i = 0; i < count; i++) {
            AccessibilityNodeInfo found = findScrollableNode(node.getChild(i));
            if (found != null) return found;
        }
        return null;
    }

    public void startContinuousScroll(String direction, int intervalMs) {
        stopContinuousScroll();
        if (IrisFloatingCopilot.isScreenLocked(this)) return;
        final String dir = (direction == null || direction.isEmpty()) ? "down" : direction;
        final int delayMs = Math.max(900, Math.min(6000, intervalMs));
        continuousScrollTicks = 0;
        performScrollStep(dir);
        continuousScrollRunnable = new Runnable() {
            @Override
            public void run() {
                if (IrisFloatingCopilot.isScreenLocked(IrisAccessibilityService.this) || continuousScrollTicks >= 60) {
                    stopContinuousScroll();
                    return;
                }
                continuousScrollTicks++;
                performScrollStep(dir);
                serviceHandler.postDelayed(this, delayMs);
            }
        };
        serviceHandler.postDelayed(continuousScrollRunnable, delayMs);
    }

    public void stopContinuousScroll() {
        if (continuousScrollRunnable != null) {
            serviceHandler.removeCallbacks(continuousScrollRunnable);
            continuousScrollRunnable = null;
        }
        continuousScrollTicks = 0;
    }

    public void toggleQuickSettingsTile(String[] candidateLabels, java.util.function.Consumer<String> callback) {
        if (IrisFloatingCopilot.isScreenLocked(this)) {
            if (callback != null) callback.accept(null);
            return;
        }
        performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS);
        serviceHandler.postDelayed(() -> {
            String clicked = null;
            if (candidateLabels != null) {
                for (String label : candidateLabels) {
                    clicked = clickElementByText(label);
                    if (clicked != null) break;
                }
            }
            final String finalClicked = clicked;
            serviceHandler.postDelayed(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    performGlobalAction(GLOBAL_ACTION_DISMISS_NOTIFICATION_SHADE);
                } else {
                    performGlobalAction(GLOBAL_ACTION_BACK);
                }
                if (callback != null) callback.accept(finalClicked);
            }, 420);
        }, 560);
    }

    public String clickElementByText(String targetQuery) {
        if (targetQuery == null || targetQuery.trim().isEmpty()) return null;
        if (IrisFloatingCopilot.isScreenLocked(this)) return null;
        String needle = targetQuery.trim().toLowerCase();
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return null;

        AccessibilityNodeInfo[] bestMatch = new AccessibilityNodeInfo[1];
        String[] bestLabel = new String[1];
        int[] bestScore = new int[] { 0 };

        findBestMatchingNode(root, needle, bestMatch, bestLabel, bestScore);

        if (bestMatch[0] == null) return null;
        AccessibilityNodeInfo target = bestMatch[0];
        String matchedText = bestLabel[0] != null ? bestLabel[0] : targetQuery.trim();

        AccessibilityNodeInfo curr = target;
        int depth = 0;
        while (curr != null && depth < 6) {
            if (curr.isClickable()) {
                if (curr.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
                    return matchedText;
                }
            }
            curr = curr.getParent();
            depth++;
        }

        if (target.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
            return matchedText;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            android.graphics.Rect rect = new android.graphics.Rect();
            target.getBoundsInScreen(rect);
            if (rect.width() > 0 && rect.height() > 0 && rect.centerX() > 0 && rect.centerY() > 0) {
                android.graphics.Path path = new android.graphics.Path();
                path.moveTo(rect.centerX(), rect.centerY());
                android.accessibilityservice.GestureDescription.StrokeDescription stroke =
                        new android.accessibilityservice.GestureDescription.StrokeDescription(path, 0, 60);
                android.accessibilityservice.GestureDescription gesture =
                        new android.accessibilityservice.GestureDescription.Builder().addStroke(stroke).build();
                boolean dispatched = dispatchGesture(gesture, null, null);
                if (dispatched) return matchedText;
            }
        }
        return null;
    }

    private void findBestMatchingNode(
            AccessibilityNodeInfo node,
            String needle,
            AccessibilityNodeInfo[] bestMatch,
            String[] bestLabel,
            int[] bestScore
    ) {
        if (node == null || !node.isVisibleToUser()) return;
        CharSequence tSeq = node.getText();
        CharSequence dSeq = node.getContentDescription();
        String t = tSeq != null ? tSeq.toString().trim() : "";
        String d = dSeq != null ? dSeq.toString().trim() : "";
        String candidate = !t.isEmpty() ? t : d;
        if (!candidate.isEmpty()) {
            String lower = candidate.toLowerCase();
            int score = 0;
            if (lower.equals(needle)) {
                score = 100;
            } else if (lower.startsWith(needle) || needle.startsWith(lower)) {
                score = 80;
            } else if (lower.contains(needle)) {
                score = Math.max(40, 75 - Math.min(30, lower.length() - needle.length()));
            }
            if (score > 0 && node.isClickable()) {
                score += 10;
            }
            if (score > bestScore[0]) {
                bestScore[0] = score;
                bestMatch[0] = node;
                bestLabel[0] = candidate;
            }
        }
        int count = node.getChildCount();
        for (int i = 0; i < count; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                findBestMatchingNode(child, needle, bestMatch, bestLabel, bestScore);
            }
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
