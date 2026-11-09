package com.stitch.iris.launcher;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.View;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LauncherPlugin.class);
        registerPlugin(IrisKeystorePlugin.class);
        registerPlugin(IrisGenAIPlugin.class);
        super.onCreate(savedInstanceState);
        
        // Start keep-alive foreground service to prevent process death
        Intent keepAlive = new Intent(this, IrisKeepAliveService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(keepAlive);
        } else {
            startService(keepAlive);
        }

        // Request battery optimization exemption so the OS doesn't kill us
        requestBatteryOptimizationExemption();
        
        // Disable WebView user gesture requirement for audio playback & boost renderer priority
        if (bridge != null && bridge.getWebView() != null) {
            android.webkit.WebView webView = bridge.getWebView();
            webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                webView.setRendererPriorityPolicy(android.webkit.WebView.RENDERER_PRIORITY_IMPORTANT, false);
            }
            webView.setWebViewClient(new com.getcapacitor.BridgeWebViewClient(bridge) {
                @Override
                public android.webkit.WebResourceResponse shouldInterceptRequest(android.webkit.WebView view, android.webkit.WebResourceRequest request) {
                    if (request != null && request.getUrl() != null) {
                        String path = request.getUrl().getPath();
                        if (path != null && path.startsWith("/__iris_icon__/")) {
                            String pkg = path.substring("/__iris_icon__/".length()).trim();
                            byte[] iconBytes = LauncherPlugin.getOrCreateAppIconBytes(MainActivity.this, pkg);
                            if (iconBytes != null && iconBytes.length > 0) {
                                String mime = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R ? "image/webp" : "image/png";
                                java.util.Map<String, String> headers = new java.util.HashMap<>();
                                headers.put("Cache-Control", "public, max-age=604800, immutable");
                                headers.put("Access-Control-Allow-Origin", "*");
                                return new android.webkit.WebResourceResponse(
                                    mime,
                                    null,
                                    200,
                                    "OK",
                                    headers,
                                    new java.io.ByteArrayInputStream(iconBytes)
                                );
                            }
                        }
                    }
                    return super.shouldInterceptRequest(view, request);
                }

                @Override
                public boolean onRenderProcessGone(android.webkit.WebView view, android.webkit.RenderProcessGoneDetail detail) {
                    if (view != null) {
                        view.post(() -> {
                            try {
                                view.reload();
                            } catch (Exception ignored) {}
                        });
                        return true;
                    }
                    return super.onRenderProcessGone(view, detail);
                }
            });
        }
        
        // Enable display cutout mode to draw behind notch (API 28+)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
            
        // Request high refresh rate (120hz / 90hz)
        enforceHighRefreshRate();

        // Enforce ADJUST_PAN to allow WebView to resize with keyboard
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN);

        // Enable Edge-to-Edge Immersive Fullscreen and hide system bars
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            final android.view.WindowInsetsController insetsController = getWindow().getInsetsController();
            if (insetsController != null) {
                insetsController.hide(android.view.WindowInsets.Type.statusBars() | android.view.WindowInsets.Type.navigationBars());
                insetsController.setSystemBarsBehavior(android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }
        


        
        // Allow Android system wallpaper to render behind the WebView
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WALLPAPER);
    }

    private void requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                try {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                } catch (Exception e) {
                    // User may dismiss — that's fine
                }
            }
        }
    }

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        // When system is low on memory, try to keep our services alive
        if (level >= TRIM_MEMORY_UI_HIDDEN) {
            restartKeepAliveService();
        }
    }

    @Override
    public void onLowMemory() {
        super.onLowMemory();
        restartKeepAliveService();
    }

    private void restartKeepAliveService() {
        try {
            Intent keepAlive = new Intent(this, IrisKeepAliveService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(keepAlive);
            } else {
                startService(keepAlive);
            }
        } catch (Exception e) {
            // Background start restrictions may apply on Android 12+
        }
    }

    private void enforceHighRefreshRate() {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                WindowManager.LayoutParams lpRefresh = getWindow().getAttributes();
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                    android.view.Display display = getDisplay();
                    if (display != null) {
                        android.view.Display.Mode[] modes = display.getSupportedModes();
                        float bestRate = 0f;
                        int bestModeId = 0;
                        for (android.view.Display.Mode mode : modes) {
                            if (mode.getRefreshRate() > bestRate) {
                                bestRate = mode.getRefreshRate();
                                bestModeId = mode.getModeId();
                            }
                        }
                        if (bestModeId != 0 && lpRefresh.preferredDisplayModeId != bestModeId) {
                            lpRefresh.preferredDisplayModeId = bestModeId;
                            getWindow().setAttributes(lpRefresh);
                        }
                    }
                } else {
                    lpRefresh.preferredRefreshRate = 120.0f;
                    getWindow().setAttributes(lpRefresh);
                }
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().setRendererPriorityPolicy(android.webkit.WebView.RENDERER_PRIORITY_IMPORTANT, false);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onResume() {
        super.onResume();
        enforceHighRefreshRate();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enforceHighRefreshRate();
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                final android.view.WindowInsetsController insetsController = getWindow().getInsetsController();
                if (insetsController != null) {
                    insetsController.hide(android.view.WindowInsets.Type.statusBars() | android.view.WindowInsets.Type.navigationBars());
                    insetsController.setSystemBarsBehavior(android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                }
            } else {
                getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                );
            }
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        LauncherPlugin.revokeVaultSessionStatic();
    }
}
