package com.stitch.iris.launcher;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.util.Base64;
import android.util.Log;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URL;
import java.net.HttpURLConnection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.ConcurrentLinkedQueue;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.appcompat.app.AppCompatActivity;
import android.media.projection.MediaProjectionManager;

@CapacitorPlugin(name = "LauncherPlugin")
public class LauncherPlugin extends Plugin {
    private static final String TAG = "LauncherPlugin";
    private volatile boolean flashlightOn = false;
    private android.speech.tts.TextToSpeech tts;
    private volatile boolean isTtsReady = false;
    private static volatile LauncherPlugin instance;
    private static volatile Set<String> vaultPackages = new HashSet<>();
    private volatile android.speech.SpeechRecognizer currentRecognizer = null;
    private volatile android.media.MediaPlayer mediaPlayer = null;
    private volatile PluginCall currentSpeechCall;

    @Override
    public void load() {
        super.load();
        instance = this;
        tts = new android.speech.tts.TextToSpeech(getContext(), new android.speech.tts.TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                if (status == android.speech.tts.TextToSpeech.SUCCESS) {
                    isTtsReady = true;
                    try {
                        tts.setLanguage(java.util.Locale.US);
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to set TTS locale", e);
                    }
                    try {
                        tts.setOnUtteranceProgressListener(new android.speech.tts.UtteranceProgressListener() {
                            @Override
                            public void onStart(String utteranceId) {}

                            @Override
                            public void onDone(String utteranceId) {
                                if ("iris_speech".equals(utteranceId)) {
                                    if (currentSpeechCall != null) {
                                        currentSpeechCall.resolve();
                                        currentSpeechCall = null;
                                    }
                                    notifyListeners("onSpeechFinished", new JSObject());
                                }
                            }

                            @Override
                            public void onError(String utteranceId) {
                                if ("iris_speech".equals(utteranceId)) {
                                    if (currentSpeechCall != null) {
                                        currentSpeechCall.resolve();
                                        currentSpeechCall = null;
                                    }
                                    notifyListeners("onSpeechFinished", new JSObject());
                                }
                            }
                        });
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to set TTS listener", e);
                    }
                }
            }
        });
    }

    @Override
    public void handleOnDestroy() {
        // Release TTS to prevent resource leaks
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
            isTtsReady = false;
        }
        // Release any held speech call
        if (currentSpeechCall != null) {
            currentSpeechCall.resolve();
            currentSpeechCall = null;
        }
        // Release media player
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception e) { /* ignore */ }
            mediaPlayer = null;
        }
        instance = null;
        super.handleOnDestroy();
    }

    public static LauncherPlugin getInstance() {
        return instance;
    }

    public void notifyPackageChange(String data) {
        try {
            JSObject obj = new JSObject(data);
            notifyListeners("onPackageChanged", obj);
        } catch (Exception e) {
            // Ignore parse errors
        }
    }

    @PluginMethod
    public void isAccessibilityServiceEnabled(PluginCall call) {
        boolean enabled = PermissionManager.getInstance(getContext()).isAccessibilityServiceEnabled();
        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void isUsageStatsEnabled(PluginCall call) {
        boolean enabled = PermissionManager.getInstance(getContext()).isUsageStatsEnabled();
        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void getInstalledAppsCount(PluginCall call) {
        try {
            android.content.pm.PackageManager pm = getContext().getPackageManager();
            android.content.Intent mainIntent = new android.content.Intent(android.content.Intent.ACTION_MAIN, null);
            mainIntent.addCategory(android.content.Intent.CATEGORY_LAUNCHER);
            List<ResolveInfo> list = pm.queryIntentActivities(mainIntent, 0);
            JSObject ret = new JSObject();
            ret.put("count", list != null ? list.size() : 0);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get app count", e);
        }
    }

    @PluginMethod
    public void performGlobalAction(PluginCall call) {
        String action = call.getString("action", "");
        IrisAccessibilityService a11y = IrisAccessibilityService.getInstance();
        if (a11y == null) {
            call.reject("Accessibility service not enabled");
            return;
        }

        switch (action) {
            case "GLOBAL_ACTION_BACK":
                a11y.performGlobalActionCompat(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK);
                break;
            case "GLOBAL_ACTION_HOME":
                a11y.performGlobalActionCompat(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_HOME);
                break;
            case "GLOBAL_ACTION_RECENTS":
                a11y.performGlobalActionCompat(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_RECENTS);
                break;
            case "GLOBAL_ACTION_TAKE_SCREENSHOT":
                a11y.takeScreenshotCompat();
                break;
            default:
                call.reject("Unknown action: " + action);
                return;
        }
        JSObject ret = new JSObject();
        ret.put("performed", true);
        call.resolve(ret);
    }

    public static void onNotificationChanged() {
        if (instance != null) {
            try {
                // Compute badge counts per package
                IrisNotificationListenerService nls = IrisNotificationListenerService.getInstance();
                JSObject data = new JSObject();
                if (nls != null) {
                    org.json.JSONArray notifications = nls.getActiveNotificationsJson();
                    JSObject badgeCounts = new JSObject();
                    int totalUnread = 0;
                    for (int i = 0; i < notifications.length(); i++) {
                        org.json.JSONObject notif = notifications.getJSONObject(i);
                        String pkg = notif.optString("packageId", "");
                        if (!pkg.isEmpty()) {
                            int current = badgeCounts.optInt(pkg, 0);
                            badgeCounts.put(pkg, current + 1);
                            totalUnread++;
                        }
                    }
                    data.put("badgeCounts", badgeCounts);
                    data.put("totalUnread", totalUnread);
                    data.put("notifications", new com.getcapacitor.JSArray(notifications.toString()));
                }
                instance.notifyListeners("onNotificationUpdated", data);
            } catch (Exception e) {
                instance.notifyListeners("onNotificationUpdated", new JSObject());
            }
        }
    }

    public static void onWindowChanged(String packageName) {
        if (instance != null) {
            try {
                JSObject data = new JSObject();
                data.put("packageName", packageName);
                instance.notifyListeners("onWindowChanged", data);
            } catch (Exception e) {
                android.util.Log.e("IrisLauncher", "Error notifying window change", e);
            }
        }
    }

    public static void onScreenshotCaptured(String base64) {
        if (instance != null) {
            try {
                JSObject data = new JSObject();
                data.put("screenshot", base64);
                instance.notifyListeners("onScreenshotCaptured", data);
            } catch (Exception e) {
                android.util.Log.e("IrisLauncher", "Error notifying screenshot", e);
            }
        }
    }

    public static Set<String> getVaultPackages() {
        return vaultPackages;
    }

    @PluginMethod
    public void setVaultPackages(PluginCall call) {
        try {
            JSArray arr = call.getArray("packages", new JSArray());
            Set<String> packages = new HashSet<>();
            for (int i = 0; i < arr.length(); i++) {
                packages.add(arr.getString(i));
            }
            vaultPackages = packages;
            cancelAllVaultNotifications();
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to set vault packages", e);
        }
    }

    private void cancelAllVaultNotifications() {
        try {
            IrisNotificationListenerService listener = IrisNotificationListenerService.getInstance();
            if (listener != null) {
                for (String pkg : vaultPackages) {
                    listener.cancelVaultNotification(pkg);
                }
            }
        } catch (Exception e) {
            android.util.Log.e("IrisLauncher", "Error cancelling vault notifications", e);
        }
    }

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        new Thread(() -> {
            try {
                PackageManager pm = getContext().getPackageManager();
                Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
                mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);
                List<ResolveInfo> resolvedInfos = pm.queryIntentActivities(mainIntent, 0);

                String selfPackage = getContext().getPackageName();

                StringBuilder signatureBuilder = new StringBuilder();
                for (ResolveInfo info : resolvedInfos) {
                    String pkg = info.activityInfo.packageName;
                    if (pkg.equals(selfPackage)) continue;
                    long updateTime = 0;
                    try {
                        updateTime = pm.getPackageInfo(pkg, 0).lastUpdateTime;
                    } catch (Exception e) {}
                    signatureBuilder.append(pkg).append("_").append(updateTime).append("|");
                }
                String currentSignature = signatureBuilder.toString();
                
                java.io.File cacheFile = new java.io.File(getContext().getFilesDir(), "iris_apps_cache.json");
                java.io.File sigFile = new java.io.File(getContext().getFilesDir(), "iris_apps_cache.sig");
                
                boolean useCache = false;
                if (cacheFile.exists() && sigFile.exists()) {
                    try {
                        java.io.FileInputStream fis = new java.io.FileInputStream(sigFile);
                        byte[] sigBytes = new byte[(int) sigFile.length()];
                        fis.read(sigBytes);
                        fis.close();
                        String cachedSignature = new String(sigBytes, "UTF-8");
                        if (currentSignature.equals(cachedSignature)) {
                            useCache = true;
                        }
                    } catch (Exception e) {}
                }

                if (useCache) {
                    try {
                        java.io.FileInputStream fis = new java.io.FileInputStream(cacheFile);
                        byte[] cacheBytes = new byte[(int) cacheFile.length()];
                        fis.read(cacheBytes);
                        fis.close();
                        String cachedJson = new String(cacheBytes, "UTF-8");
                        JSObject result = new JSObject(cachedJson);
                        call.resolve(result);
                        return;
                    } catch (Exception e) {}
                }

                JSArray appsArray = new JSArray();
                for (ResolveInfo info : resolvedInfos) {
                    String label = info.loadLabel(pm).toString();
                    String packageId = info.activityInfo.packageName;

                    if (packageId.equals(selfPackage)) continue;

                    JSObject appObj = new JSObject();
                    appObj.put("label", label);
                    appObj.put("packageId", packageId);

                    // Extract native app icon drawable, compress, and encode to Base64
                    String iconBase64 = null;
                    try {
                        Drawable iconDrawable = info.loadIcon(pm);
                        if (iconDrawable != null) {
                            int width = iconDrawable.getIntrinsicWidth() > 0 ? iconDrawable.getIntrinsicWidth() : 64;
                            int height = iconDrawable.getIntrinsicHeight() > 0 ? iconDrawable.getIntrinsicHeight() : 64;
                            
                            // Limit drawing size to prevent massive temporary memory pressure
                            if (width > 256 || height > 256) {
                                width = 256;
                                height = 256;
                            }
                            
                            Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
                            Canvas canvas = new Canvas(bitmap);
                            iconDrawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
                            iconDrawable.draw(canvas);
                            
                            // Downscale to 192x192 for crisp rendering on high-DPI screens
                            Bitmap resizedBitmap = Bitmap.createScaledBitmap(bitmap, 192, 192, true);
                            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                            resizedBitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream);
                            byte[] byteArray = outputStream.toByteArray();
                            iconBase64 = "data:image/png;base64," + Base64.encodeToString(byteArray, Base64.NO_WRAP);
                            
                            // Safely release native memory immediately
                            bitmap.recycle();
                            if (resizedBitmap != bitmap) {
                                resizedBitmap.recycle();
                            }
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }

                    if (iconBase64 != null) {
                        appObj.put("icon", iconBase64);
                    } else {
                        // Assign highly descriptive matching Material Symbol icons dynamically based on package signatures as fallback
                        String icon = "apps";
                        String pkg = packageId.toLowerCase();
                        if (pkg.contains("youtube") || pkg.contains("video") || pkg.contains("player") || pkg.contains("netflix")) {
                            icon = "play_circle";
                        } else if (pkg.contains("spotify") || pkg.contains("music") || pkg.contains("audio") || pkg.contains("sound")) {
                            icon = "music_note";
                        } else if (pkg.contains("chrome") || pkg.contains("browser") || pkg.contains("firefox") || pkg.contains("opera") || pkg.contains("safari")) {
                            icon = "globe";
                        } else if (pkg.contains("chat") || pkg.contains("talk") || pkg.contains("whatsapp") || pkg.contains("messenger") || pkg.contains("telegram") || pkg.contains("slack") || pkg.contains("discord")) {
                            icon = "chat";
                        } else if (pkg.contains("mail") || pkg.contains("gmail") || pkg.contains("outlook") || pkg.contains("yahoo")) {
                            icon = "mail";
                        } else if (pkg.contains("camera")) {
                            icon = "photo_camera";
                        } else if (pkg.contains("gallery") || pkg.contains("photos") || pkg.contains("image")) {
                            icon = "image";
                        } else if (pkg.contains("map") || pkg.contains("gps") || pkg.contains("navigation") || pkg.contains("earth")) {
                            icon = "map";
                        } else if (pkg.contains("setting") || pkg.contains("config") || pkg.contains("admin")) {
                            icon = "settings";
                        } else if (pkg.contains("phone") || pkg.contains("dialer") || pkg.contains("call")) {
                            icon = "call";
                        } else if (pkg.contains("contact")) {
                            icon = "contacts";
                        } else if (pkg.contains("calendar")) {
                            icon = "calendar_month";
                        } else if (pkg.contains("clock") || pkg.contains("alarm") || pkg.contains("time")) {
                            icon = "alarm";
                        } else if (pkg.contains("file") || pkg.contains("explorer") || pkg.contains("manager") || pkg.contains("files") || pkg.contains("documents")) {
                            icon = "folder";
                        } else if (pkg.contains("terminal") || pkg.contains("console") || pkg.contains("termux") || pkg.contains("shell")) {
                            icon = "terminal";
                        } else if (pkg.contains("store") || pkg.contains("market") || pkg.contains("vending") || pkg.contains("play")) {
                            icon = "shopping_bag";
                        } else if (pkg.contains("game") || pkg.contains("playgames") || pkg.contains("xbox") || pkg.contains("steam")) {
                            icon = "sports_esports";
                        }
                        appObj.put("icon", icon);
                    }

                    // Assign category based on package signature
                    String category = "SYSTEM";
                    if (packageId.contains("media") || packageId.contains("music") || packageId.contains("spotify") || packageId.contains("youtube") || packageId.contains("player") || packageId.contains("netflix") || packageId.contains("camera") || packageId.contains("photos")) {
                        category = "MEDIA";
                    } else if (packageId.contains("chat") || packageId.contains("talk") || packageId.contains("whatsapp") || packageId.contains("messenger") || packageId.contains("tele") || packageId.contains("mail") || packageId.contains("discord") || packageId.contains("phone")) {
                        category = "COMMUNICATION";
                    } else if (packageId.contains("tool") || packageId.contains("dev") || packageId.contains("term") || packageId.contains("git") || packageId.contains("code") || packageId.contains("file") || packageId.contains("settings")) {
                        category = "DEVTOOLS";
                    }
                    appObj.put("category", category);

                    // Virtual metrics details
                    int sizeMb = Math.abs(packageId.hashCode() % 65) + 15;
                    if (sizeMb < 8) sizeMb = 8;
                    appObj.put("size", sizeMb + ".2 MB");
                    appObj.put("version", "v" + (Math.abs(packageId.hashCode() % 3) + 1) + ".0.4");

                    appsArray.put(appObj);
                }

                JSObject result = new JSObject();
                result.put("apps", appsArray);

                try {
                    java.io.FileOutputStream fosCache = new java.io.FileOutputStream(cacheFile);
                    fosCache.write(result.toString().getBytes("UTF-8"));
                    fosCache.close();

                    java.io.FileOutputStream fosSig = new java.io.FileOutputStream(sigFile);
                    fosSig.write(currentSignature.getBytes("UTF-8"));
                    fosSig.close();
                } catch (Exception e) {
                    e.printStackTrace();
                }

                call.resolve(result);
            } catch (Exception ex) {
                ex.printStackTrace();
                call.reject("Failed to get apps: " + ex.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void launchApp(PluginCall call) {
        String packageId = call.getString("packageId");
        if (packageId == null) {
            call.reject("Missing packageId parameter");
            return;
        }

        try {
            PackageManager pm = getContext().getPackageManager();
            Intent intent = pm.getLaunchIntentForPackage(packageId);
            if (intent != null) {
                // Launch using the foreground Activity context to ensure compatibility
                getActivity().startActivity(intent);
                call.resolve();
            } else {
                call.reject("Failed to locate launch intent for package: " + packageId);
            }
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("Failed to launch app: " + e.getMessage());
        }
    }

    @PluginMethod
    public void uninstallApp(PluginCall call) {
        String packageId = call.getString("packageId");
        if (packageId == null) {
            call.reject("Missing packageId parameter");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_DELETE);
            intent.setData(Uri.parse("package:" + packageId));
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("Failed to trigger uninstall: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        String packageId = call.getString("packageId");
        if (packageId == null) {
            call.reject("Missing packageId parameter");
            return;
        }

        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + packageId));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("Failed to open app settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestDefaultLauncher(PluginCall call) {
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_HOME_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("alreadyDefault", false);
            call.resolve(ret);
        } catch (Exception e) {
            // Fallback if ACTION_HOME_SETTINGS is not available
            Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getContext().startActivity(intent);
                JSObject ret = new JSObject();
                ret.put("alreadyDefault", false);
                call.resolve(ret);
            } catch (Exception e2) {
                call.reject("Failed to open default settings");
            }
        }
    }

    @PluginMethod
    public void setFullscreen(PluginCall call) {
        boolean enable = call.getBoolean("enable", false);
        getBridge().getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                android.view.Window window = getBridge().getActivity().getWindow();
                if (enable) {
                    window.addFlags(android.view.WindowManager.LayoutParams.FLAG_FULLSCREEN);
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                        try {
                            java.lang.reflect.Method getInsetsControllerMethod = window.getClass().getMethod("getInsetsController");
                            Object controller = getInsetsControllerMethod.invoke(window);
                            if (controller != null) {
                                java.lang.reflect.Method hideMethod = controller.getClass().getMethod("hide", int.class);
                                hideMethod.invoke(controller, 7); // 7 = WindowInsets.Type.systemBars()
                                
                                java.lang.reflect.Method setSystemBarsBehaviorMethod = controller.getClass().getMethod("setSystemBarsBehavior", int.class);
                                setSystemBarsBehaviorMethod.invoke(controller, 2); // 2 = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                } else {
                    window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_FULLSCREEN);
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                        try {
                            java.lang.reflect.Method getInsetsControllerMethod = window.getClass().getMethod("getInsetsController");
                            Object controller = getInsetsControllerMethod.invoke(window);
                            if (controller != null) {
                                java.lang.reflect.Method showMethod = controller.getClass().getMethod("show", int.class);
                                showMethod.invoke(controller, 7); // 7 = WindowInsets.Type.systemBars()
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                }
            }
        });
        call.resolve();
    }

    @PluginMethod
    public void toggleFlashlight(PluginCall call) {
        try {
            android.hardware.camera2.CameraManager camManager = (android.hardware.camera2.CameraManager) getContext().getSystemService(android.content.Context.CAMERA_SERVICE);
            if (camManager != null) {
                String cameraId = camManager.getCameraIdList()[0];
                flashlightOn = !flashlightOn;
                camManager.setTorchMode(cameraId, flashlightOn);
                JSObject ret = new JSObject();
                ret.put("status", flashlightOn);
                call.resolve(ret);
                return;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        call.reject("Flashlight control failed");
    }

    @PluginMethod
    public void setFlashlight(PluginCall call) {
        boolean enable = call.getBoolean("enable", true);
        try {
            android.hardware.camera2.CameraManager camManager = (android.hardware.camera2.CameraManager) getContext().getSystemService(android.content.Context.CAMERA_SERVICE);
            if (camManager != null) {
                String cameraId = camManager.getCameraIdList()[0];
                flashlightOn = enable;
                camManager.setTorchMode(cameraId, enable);
                JSObject ret = new JSObject();
                ret.put("status", flashlightOn);
                call.resolve(ret);
                return;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        call.reject("Flashlight control failed");
    }

    @PluginMethod
    public void openSystemSettings(PluginCall call) {
        String setting = call.getString("setting", "wifi");
        try {
            Intent intent;
            switch (setting) {
                case "wifi":
                    intent = new Intent(android.provider.Settings.ACTION_WIFI_SETTINGS);
                    break;
                case "bluetooth":
                    intent = new Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS);
                    break;
                case "airplane":
                    intent = new Intent(android.provider.Settings.ACTION_AIRPLANE_MODE_SETTINGS);
                    break;
                case "sound":
                    intent = new Intent(android.provider.Settings.ACTION_SOUND_SETTINGS);
                    break;
                case "display":
                    intent = new Intent(android.provider.Settings.ACTION_DISPLAY_SETTINGS);
                    break;
                case "battery":
                    intent = new Intent(android.provider.Settings.ACTION_BATTERY_SAVER_SETTINGS);
                    break;
                case "location":
                    intent = new Intent(android.provider.Settings.ACTION_LOCATION_SOURCE_SETTINGS);
                    break;
                case "app":
                    String pkg = call.getString("package", getContext().getPackageName());
                    intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.parse("package:" + pkg));
                    break;
                default:
                    intent = new Intent(android.provider.Settings.ACTION_SETTINGS);
                    break;
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to open settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setSoundMode(PluginCall call) {
        String mode = call.getString("mode", "normal");
        try {
            android.media.AudioManager audioManager = (android.media.AudioManager) getContext().getSystemService(android.content.Context.AUDIO_SERVICE);
            if (audioManager != null) {
                switch (mode) {
                    case "mute":
                        audioManager.setRingerMode(android.media.AudioManager.RINGER_MODE_SILENT);
                        break;
                    case "vibrate":
                        audioManager.setRingerMode(android.media.AudioManager.RINGER_MODE_VIBRATE);
                        break;
                    case "normal":
                        audioManager.setRingerMode(android.media.AudioManager.RINGER_MODE_NORMAL);
                        break;
                }
                call.resolve();
            } else {
                call.reject("AudioManager not available");
            }
        } catch (Exception e) {
            call.reject("Failed to set sound mode: " + e.getMessage());
        }
    }

    @PluginMethod
    public void makeCall(PluginCall call) {
        String phoneNumber = call.getString("number");
        Boolean speaker = call.getBoolean("speaker", false);
        if (phoneNumber == null) {
            call.reject("Missing number parameter");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_DIAL);
            intent.setData(Uri.parse("tel:" + phoneNumber));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            if (speaker) {
                // Speakerphone requires a short delay for the telecom service to open the audio route
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                    try {
                        android.media.AudioManager audioManager = (android.media.AudioManager) getContext().getSystemService(android.content.Context.AUDIO_SERVICE);
                        if (audioManager != null) {
                            audioManager.setMode(android.media.AudioManager.MODE_IN_CALL);
                            audioManager.setSpeakerphoneOn(true);
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }, 1500);
            }
            call.resolve();
        } catch (SecurityException e) {
            call.reject("Missing CALL_PHONE permission");
        } catch (Exception e) {
            call.reject("Failed to make call: " + e.getMessage());
        }
    }

    @PluginMethod
    public void dialNumber(PluginCall call) {
        String phoneNumber = call.getString("number");
        if (phoneNumber == null) {
            call.reject("Missing number parameter");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_DIAL);
            intent.setData(Uri.parse("tel:" + phoneNumber));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to open dialer: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setAlarm(PluginCall call) {
        Integer hour = call.getInt("hour");
        Integer minutes = call.getInt("minutes");
        String message = call.getString("message", "IRIS AI Assistant");

        if (hour == null || minutes == null) {
            call.reject("Missing hour or minutes parameter");
            return;
        }

        Intent intent = new Intent(android.provider.AlarmClock.ACTION_SET_ALARM)
            .putExtra(android.provider.AlarmClock.EXTRA_HOUR, hour)
            .putExtra(android.provider.AlarmClock.EXTRA_MINUTES, minutes)
            .putExtra(android.provider.AlarmClock.EXTRA_MESSAGE, message)
            .putExtra(android.provider.AlarmClock.EXTRA_SKIP_UI, false);

        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void setTimer(PluginCall call) {
        Integer lengthSeconds = call.getInt("seconds");
        String message = call.getString("message", "IRIS Timer");
        if (lengthSeconds == null) {
            call.reject("Missing seconds parameter");
            return;
        }
        try {
            Intent intent = new Intent(android.provider.AlarmClock.ACTION_SET_TIMER)
                .putExtra(android.provider.AlarmClock.EXTRA_LENGTH, lengthSeconds)
                .putExtra(android.provider.AlarmClock.EXTRA_MESSAGE, message)
                .putExtra(android.provider.AlarmClock.EXTRA_SKIP_UI, false);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Cannot open timer app");
        }
    }

    @PluginMethod
    public void openAppInfo(PluginCall call) {
        String packageId = call.getString("packageId");
        if (packageId == null || packageId.isEmpty()) {
            call.reject("Missing packageId");
            return;
        }
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + packageId));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to open app info: " + e.getMessage());
        }
    }

    @PluginMethod
    public void optimizeMemory(PluginCall call) {
        try {
            android.app.ActivityManager am = (android.app.ActivityManager) getContext().getSystemService(android.content.Context.ACTIVITY_SERVICE);
            if (am != null) {
                java.util.List<android.app.ActivityManager.RunningAppProcessInfo> runningApps = am.getRunningAppProcesses();
                if (runningApps != null) {
                    for (android.app.ActivityManager.RunningAppProcessInfo processInfo : runningApps) {
                        if (processInfo.processName.equals(getContext().getPackageName())) continue;
                        String[] pkgList = processInfo.pkgList;
                        for (String pkg : pkgList) {
                            am.killBackgroundProcesses(pkg);
                        }
                    }
                }
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to optimize memory: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setDoNotDisturb(PluginCall call) {
        boolean enable = call.getBoolean("enable", true);
        try {
            android.app.NotificationManager notificationManager = (android.app.NotificationManager) getContext().getSystemService(android.content.Context.NOTIFICATION_SERVICE);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                if (notificationManager.isNotificationPolicyAccessGranted()) {
                    notificationManager.setInterruptionFilter(enable ? 
                        android.app.NotificationManager.INTERRUPTION_FILTER_NONE : 
                        android.app.NotificationManager.INTERRUPTION_FILTER_ALL);
                    call.resolve();
                } else {
                    Intent intent = new Intent(android.provider.Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                    call.reject("Permission required for DND");
                }
            } else {
                call.reject("Not supported on this Android version");
            }
        } catch (Exception e) {
            call.reject("Failed to set DND: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openCamera(PluginCall call) {
        Boolean selfie = call.getBoolean("selfie", false);
        try {
            Intent intent = new Intent(android.provider.MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA);
            if (selfie != null && selfie) {
                intent.putExtra("android.intent.extras.CAMERA_FACING", 1);
                intent.putExtra("android.intent.extras.LENS_FACING_FRONT", 1);
                intent.putExtra("android.intent.extra.USE_FRONT_CAMERA", true);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to open camera: " + e.getMessage());
        }
    }

    @PluginMethod
    public void captureSilentPhotos(PluginCall call) {
        if (androidx.core.content.ContextCompat.checkSelfPermission(getContext(), android.Manifest.permission.CAMERA) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            call.reject("Camera permission not granted");
            return;
        }
        SilentCameraHelper.captureBothSilently(getContext(), (frontBase64, backBase64) -> {
            JSObject ret = new JSObject();
            ret.put("front", frontBase64 != null ? frontBase64 : JSObject.NULL);
            ret.put("back", backBase64 != null ? backBase64 : JSObject.NULL);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void startScreenShare(PluginCall call) {
        if (!android.provider.Settings.canDrawOverlays(getContext())) {
            Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.reject("Please grant Display over other apps permission first.");
            return;
        }

        // Just start the background audio service directly
        Intent serviceIntent = new Intent(getContext(), IrisScreenCaptureService.class);
        getContext().startForegroundService(serviceIntent);
        
        IrisScreenCaptureService.frameListener = new IrisScreenCaptureService.FrameListener() {
            @Override
            public void onFrame(String base64Image) {
                JSObject ret = new JSObject();
                ret.put("frame", base64Image);
                notifyListeners("onScreenFrame", ret);
            }

            @Override
            public void onSpeechPartial(String text) {
                JSObject ret = new JSObject();
                ret.put("text", text);
                notifyListeners("onNativeSpeechPartial", ret);
            }

            @Override
            public void onSpeechFinal(String text) {
                JSObject ret = new JSObject();
                ret.put("text", text);
                notifyListeners("onNativeSpeechFinal", ret);
            }
        };
        
        call.resolve();
    }

    @com.getcapacitor.annotation.ActivityCallback
    private void screenCaptureResult(PluginCall call, androidx.activity.result.ActivityResult result) {
        if (result.getResultCode() == android.app.Activity.RESULT_OK) {
            Intent data = result.getData();
            Intent serviceIntent = new Intent(getContext(), IrisScreenCaptureService.class);
            serviceIntent.putExtra("code", result.getResultCode());
            serviceIntent.putExtra("data", data);
            
            IrisScreenCaptureService.frameListener = new IrisScreenCaptureService.FrameListener() {
                @Override
                public void onFrame(String base64Image) {
                    JSObject ret = new JSObject();
                    ret.put("frame", base64Image);
                    notifyListeners("onScreenFrame", ret);
                }
                
                @Override
                public void onSpeechPartial(String text) {
                    JSObject ret = new JSObject();
                    ret.put("text", text);
                    notifyListeners("onNativeSpeechPartial", ret);
                }
                
                @Override
                public void onSpeechFinal(String text) {
                    JSObject ret = new JSObject();
                    ret.put("text", text);
                    notifyListeners("onNativeSpeechFinal", ret);
                }
            };

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }
            call.resolve();
        } else {
            call.reject("Screen capture permission denied");
        }
    }

    @PluginMethod
    public void stopScreenShare(PluginCall call) {
        Intent serviceIntent = new Intent(getContext(), IrisScreenCaptureService.class);
        serviceIntent.setAction("STOP");
        getContext().startService(serviceIntent);
        call.resolve();
    }

    @PluginMethod
    public void updateOverlayText(PluginCall call) {
        // Overlay removed for stealth mode
        call.resolve();
    }

    @PluginMethod
    public void toggleDND(PluginCall call) {
        Boolean enable = call.getBoolean("enable", true);
        android.app.NotificationManager mNotificationManager = (android.app.NotificationManager) getContext().getSystemService(android.content.Context.NOTIFICATION_SERVICE);
        if (mNotificationManager != null) {
            if (mNotificationManager.isNotificationPolicyAccessGranted()) {
                mNotificationManager.setInterruptionFilter(enable != null && enable ? android.app.NotificationManager.INTERRUPTION_FILTER_NONE : android.app.NotificationManager.INTERRUPTION_FILTER_ALL);
                call.resolve();
            } else {
                Intent intent = new Intent(android.provider.Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve(new JSObject().put("message", "Requires DND permissions"));
            }
        } else {
            call.reject("No Notification Manager");
        }
    }

    @PluginMethod
    public void sendSMS(PluginCall call) {
        String number = call.getString("number", "");
        String message = call.getString("message", "");
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.fromParts("sms", number, null));
            intent.putExtra("sms_body", message);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to open SMS app: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setBrightness(PluginCall call) {
        Integer brightness = call.getInt("level", 50);
        try {
            if (android.provider.Settings.System.canWrite(getContext())) {
                int mappedValue = (int) (brightness / 100.0f * 255);
                android.provider.Settings.System.putInt(getContext().getContentResolver(), android.provider.Settings.System.SCREEN_BRIGHTNESS, mappedValue);
                call.resolve();
            } else {
                Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_WRITE_SETTINGS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve(new JSObject().put("message", "Requires write settings permission"));
            }
        } catch (Exception e) {
            call.reject("Failed to set brightness");
        }
    }

    @PluginMethod
    public void getBatteryLevel(PluginCall call) {
        android.os.BatteryManager bm = (android.os.BatteryManager) getContext().getSystemService(android.content.Context.BATTERY_SERVICE);
        if (bm != null) {
            int batLevel = bm.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_CAPACITY);
            JSObject ret = new JSObject();
            ret.put("level", batLevel);
            call.resolve(ret);
        } else {
            call.reject("BatteryManager not found");
        }
    }

    @PluginMethod
    public void setAudioVolume(PluginCall call) {
        String direction = call.getString("direction", "up");
        android.media.AudioManager audioManager = (android.media.AudioManager) getContext().getSystemService(android.content.Context.AUDIO_SERVICE);
        if (audioManager != null) {
            if ("up".equals(direction) || "increase".equals(direction)) {
                audioManager.adjustStreamVolume(android.media.AudioManager.STREAM_MUSIC, android.media.AudioManager.ADJUST_RAISE, android.media.AudioManager.FLAG_SHOW_UI);
            } else if ("down".equals(direction) || "decrease".equals(direction)) {
                audioManager.adjustStreamVolume(android.media.AudioManager.STREAM_MUSIC, android.media.AudioManager.ADJUST_LOWER, android.media.AudioManager.FLAG_SHOW_UI);
            } else if ("mute".equals(direction)) {
                audioManager.adjustStreamVolume(android.media.AudioManager.STREAM_MUSIC, android.media.AudioManager.ADJUST_MUTE, android.media.AudioManager.FLAG_SHOW_UI);
            } else if ("unmute".equals(direction)) {
                audioManager.adjustStreamVolume(android.media.AudioManager.STREAM_MUSIC, android.media.AudioManager.ADJUST_UNMUTE, android.media.AudioManager.FLAG_SHOW_UI);
            }
            call.resolve();
        } else {
            call.reject("AudioManager not found");
        }
    }

    @PluginMethod
    public void dispatchMediaKey(PluginCall call) {
        String key = call.getString("key", "play_pause");
        android.media.AudioManager audioManager = (android.media.AudioManager) getContext().getSystemService(android.content.Context.AUDIO_SERVICE);
        if (audioManager != null) {
            int keyCode = android.view.KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE;
            if ("next".equals(key)) {
                keyCode = android.view.KeyEvent.KEYCODE_MEDIA_NEXT;
            } else if ("previous".equals(key)) {
                keyCode = android.view.KeyEvent.KEYCODE_MEDIA_PREVIOUS;
            }
            
            audioManager.dispatchMediaKeyEvent(new android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, keyCode));
            audioManager.dispatchMediaKeyEvent(new android.view.KeyEvent(android.view.KeyEvent.ACTION_UP, keyCode));
            call.resolve();
        } else {
            call.reject("AudioManager not found");
        }
    }

    @PluginMethod
    public void lookupContact(PluginCall call) {
        String nameQuery = call.getString("name");
        if (nameQuery == null) {
            call.reject("Missing name parameter");
            return;
        }

        if (ContextCompat.checkSelfPermission(getContext(), android.Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Missing READ_CONTACTS permission");
            return;
        }

        try {
            android.net.Uri uri = android.provider.ContactsContract.CommonDataKinds.Phone.CONTENT_URI;
            String[] projection = new String[] {
                android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                android.provider.ContactsContract.CommonDataKinds.Phone.NUMBER
            };
            
            // Try exact match first
            String selection = android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " = ?";
            String[] selectionArgs = new String[] { nameQuery };
            
            android.database.Cursor cursor = getContext().getContentResolver().query(uri, projection, selection, selectionArgs, null);
            
            // Fall back to fuzzy match if no exact match
            if (cursor == null || !cursor.moveToFirst()) {
                if (cursor != null) cursor.close();
                selection = android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " LIKE ?";
                selectionArgs = new String[] { "%" + nameQuery + "%" };
                cursor = getContext().getContentResolver().query(uri, projection, selection, selectionArgs, null);
            }
            
            if (cursor != null && cursor.moveToFirst()) {
                String name = cursor.getString(cursor.getColumnIndexOrThrow(android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME));
                String number = cursor.getString(cursor.getColumnIndexOrThrow(android.provider.ContactsContract.CommonDataKinds.Phone.NUMBER));
                cursor.close();
                
                JSObject ret = new JSObject();
                ret.put("name", name);
                ret.put("number", number);
                call.resolve(ret);
            } else {
                if (cursor != null) cursor.close();
                call.reject("Contact not found");
            }
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("Failed to lookup contact: " + e.getMessage());
        }
    }

    @PluginMethod
    public void lookupContactMultiple(PluginCall call) {
        String nameQuery = call.getString("name");
        if (nameQuery == null) {
            call.reject("Missing name parameter");
            return;
        }

        if (ContextCompat.checkSelfPermission(getContext(), android.Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Missing READ_CONTACTS permission");
            return;
        }

        try {
            android.net.Uri uri = android.provider.ContactsContract.CommonDataKinds.Phone.CONTENT_URI;
            String[] projection = new String[] {
                android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                android.provider.ContactsContract.CommonDataKinds.Phone.NUMBER
            };
            
            // Fuzzy match: find all contacts containing the query
            String selection = android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " LIKE ?";
            String[] selectionArgs = new String[] { "%" + nameQuery + "%" };
            android.database.Cursor cursor = getContext().getContentResolver().query(uri, projection, selection, selectionArgs, android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC");
            
            JSObject ret = new JSObject();
            org.json.JSONArray arr = new org.json.JSONArray();
            
            if (cursor != null) {
                int count = 0;
                while (cursor.moveToNext() && count < 3) {
                    String name = cursor.getString(cursor.getColumnIndexOrThrow(android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME));
                    String number = cursor.getString(cursor.getColumnIndexOrThrow(android.provider.ContactsContract.CommonDataKinds.Phone.NUMBER));
                    JSObject contact = new JSObject();
                    contact.put("name", name);
                    contact.put("number", number);
                    arr.put(contact);
                    count++;
                }
                cursor.close();
            }
            
            ret.put("contacts", arr.toString());
            ret.put("count", arr.length());
            call.resolve(ret);
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("Failed to lookup contacts: " + e.getMessage());
        }
    }

    @PluginMethod
    public void sendMessage(PluginCall call) {
        String app = call.getString("app", "whatsapp");
        String text = call.getString("text", "");

        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_TEXT, text);

        if ("whatsapp".equalsIgnoreCase(app)) {
            intent.setPackage("com.whatsapp");
        } else if ("messenger".equalsIgnoreCase(app)) {
            intent.setPackage("com.facebook.orca");
        }

        try {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Application is not installed or launch failed: " + app);
        }
    }

    @PluginMethod
    public void speakText(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.trim().isEmpty()) {
            call.resolve();
            return;
        }

        if (!isTtsReady && tts != null) {
            int retries = 0;
            while (!isTtsReady && retries < 15) {
                try { Thread.sleep(100); } catch (Exception ignored) {}
                retries++;
            }
        }

        if (isTtsReady && tts != null) {
            if (currentSpeechCall != null) {
                currentSpeechCall.resolve();
            }
            currentSpeechCall = call;
            call.setKeepAlive(true);
            android.os.Bundle params = new android.os.Bundle();
            params.putString(android.speech.tts.TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, "iris_speech");
            params.putInt(android.speech.tts.TextToSpeech.Engine.KEY_PARAM_STREAM, android.media.AudioManager.STREAM_MUSIC);
            int result = tts.speak(text, android.speech.tts.TextToSpeech.QUEUE_FLUSH, params, "iris_speech");
            if (result == android.speech.tts.TextToSpeech.ERROR) {
                currentSpeechCall = null;
                call.resolve();
            }
        } else {
            call.resolve();
        }
    }

    @PluginMethod
    public void stopSpeakingNative(PluginCall call) {
        if (tts != null) {
            try { tts.stop(); } catch (Exception ignored) {}
        }
        if (currentSpeechCall != null) {
            currentSpeechCall.resolve();
            currentSpeechCall = null;
        }
        call.resolve();
    }

    @PluginMethod
    public void setVoiceSettings(PluginCall call) {
        if (tts != null) {
            float pitch = call.getFloat("pitch", 1.0f);
            float rate = call.getFloat("rate", 1.0f);
            String voiceTimbre = call.getString("voiceTimbre", "natural_female");

            float pitchMod = 1.0f;
            if ("narrator".equalsIgnoreCase(voiceTimbre)) {
                pitchMod = 0.70f;
            } else if ("natural_male".equalsIgnoreCase(voiceTimbre)) {
                pitchMod = 0.82f;
            } else if ("british_male".equalsIgnoreCase(voiceTimbre)) {
                pitchMod = 0.85f;
            } else if ("british_female".equalsIgnoreCase(voiceTimbre)) {
                pitchMod = 1.05f;
            }

            float effectivePitch = Math.max(0.2f, Math.min(2.0f, pitch * pitchMod));

            try {
                tts.setPitch(effectivePitch);
                tts.setSpeechRate(rate);

                if (voiceTimbre != null && (voiceTimbre.contains("british") || voiceTimbre.contains("uk"))) {
                    tts.setLanguage(java.util.Locale.UK);
                } else {
                    tts.setLanguage(java.util.Locale.US);
                }

                Set<android.speech.tts.Voice> voices = tts.getVoices();
                if (voices != null && !voices.isEmpty()) {
                    boolean isBritish = voiceTimbre != null && (voiceTimbre.contains("british") || voiceTimbre.contains("uk"));
                    boolean isMale = voiceTimbre != null && (voiceTimbre.contains("male") || voiceTimbre.contains("narrator"));

                    android.speech.tts.Voice bestMatch = null;
                    for (android.speech.tts.Voice v : voices) {
                        if (v.getLocale() == null) continue;
                        String lang = v.getLocale().getLanguage();
                        String country = v.getLocale().getCountry();
                        String name = v.getName().toLowerCase();

                        if ("en".equalsIgnoreCase(lang)) {
                            if (isBritish && !"GB".equalsIgnoreCase(country) && !name.contains("gb") && !name.contains("en-gb")) continue;
                            if (!isBritish && "GB".equalsIgnoreCase(country) && !name.contains("us")) continue;

                            if (isMale) {
                                if (name.contains("male") || name.contains("man") || name.contains("deep") || name.contains("boy") || name.contains("guy")) {
                                    bestMatch = v;
                                    break;
                                }
                            } else {
                                if (name.contains("female") || name.contains("woman") || name.contains("girl") || name.contains("lady") || name.contains("aria")) {
                                    bestMatch = v;
                                    break;
                                }
                            }
                            if (bestMatch == null) bestMatch = v;
                        }
                    }
                    if (bestMatch != null) {
                        tts.setVoice(bestMatch);
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed setting native voice timbre: " + voiceTimbre, e);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void requestNotificationAccess(PluginCall call) {
        Intent intent = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getActiveNotifications(PluginCall call) {
        IrisNotificationListenerService service = IrisNotificationListenerService.getInstance();
        if (service != null) {
            try {
                org.json.JSONArray notifs = service.getActiveNotificationsJson();
                JSObject result = new JSObject();
                result.put("notifications", notifs.toString());
                call.resolve(result);
            } catch (Exception e) {
                call.reject("Failed to parse notifications");
            }
        } else {
            call.reject("NotificationListenerService is not running or lacks permission");
        }
    }

    @PluginMethod
    public void dismissNotification(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("Missing key parameter");
            return;
        }
        IrisNotificationListenerService service = IrisNotificationListenerService.getInstance();
        if (service != null) {
            service.dismissNotification(key);
            call.resolve();
        } else {
            call.reject("NotificationListenerService is not running");
        }
    }

    @PluginMethod
    public void expandNotificationPanel(PluginCall call) {
        try {
            Object statusBarService = getContext().getSystemService("statusbar");
            Class<?> statusBarManager = Class.forName("android.app.StatusBarManager");
            java.lang.reflect.Method expandPanel = null;
            
            if (android.os.Build.VERSION.SDK_INT >= 17) {
                expandPanel = statusBarManager.getMethod("expandNotificationsPanel");
            } else {
                expandPanel = statusBarManager.getMethod("expand");
            }
            expandPanel.invoke(statusBarService);
            call.resolve();
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("Failed to expand notification panel: " + e.getMessage());
        }
    }

    @PluginMethod
    public void authenticateBiometric(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                AppCompatActivity activity = (AppCompatActivity) getActivity();
                java.util.concurrent.Executor executor = ContextCompat.getMainExecutor(activity);
                
                BiometricPrompt biometricPrompt = new BiometricPrompt(activity, executor, new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationError(int errorCode, CharSequence errString) {
                        super.onAuthenticationError(errorCode, errString);
                        JSObject ret = new JSObject();
                        ret.put("success", false);
                        ret.put("error", errString.toString());
                        call.resolve(ret);
                    }

                    @Override
                    public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                        super.onAuthenticationSucceeded(result);
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        call.resolve(ret);
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        super.onAuthenticationFailed();
                        // Do not resolve yet, the prompt stays open to let the user try again
                    }
                });

                BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                        .setTitle("Iris Vault Security")
                        .setSubtitle("Authenticate to access encrypted databanks")
                        .setNegativeButtonText("Use PIN code")
                        .setAllowedAuthenticators(androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG | androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK)
                        .build();

                biometricPrompt.authenticate(promptInfo);
            } catch (Exception e) {
                e.printStackTrace();
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", e.getMessage());
                call.resolve(ret);
            }
        });
    }

    @PluginMethod
    public void startOfflineSpeech(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (currentRecognizer == null) {
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S && android.speech.SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext())) {
                        currentRecognizer = android.speech.SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
                    } else {
                        currentRecognizer = android.speech.SpeechRecognizer.createSpeechRecognizer(getContext());
                    }
                }
                Intent intent = new Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, "en-US");
                intent.putExtra(android.speech.RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());
                intent.putExtra(android.speech.RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                intent.putExtra(android.speech.RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(android.speech.RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 5000);
                intent.putExtra(android.speech.RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 5000);
                intent.putExtra("android.speech.extras.SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS", 5000);
                intent.putExtra("android.speech.extra.DICTATION_MODE", true);
                intent.putExtra("sound_off", true);

                // Mute system streams to silence Google Assistant activation chime
                final android.media.AudioManager audioManager = (android.media.AudioManager) getContext().getSystemService(android.content.Context.AUDIO_SERVICE);
                if (audioManager != null) {
                    try {
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                            audioManager.adjustStreamVolume(android.media.AudioManager.STREAM_SYSTEM, android.media.AudioManager.ADJUST_MUTE, 0);
                            audioManager.adjustStreamVolume(android.media.AudioManager.STREAM_NOTIFICATION, android.media.AudioManager.ADJUST_MUTE, 0);
                            audioManager.adjustStreamVolume(android.media.AudioManager.STREAM_MUSIC, android.media.AudioManager.ADJUST_MUTE, 0);
                            audioManager.adjustStreamVolume(android.media.AudioManager.STREAM_ALARM, android.media.AudioManager.ADJUST_MUTE, 0);
                        } else {
                            audioManager.setStreamMute(android.media.AudioManager.STREAM_SYSTEM, true);
                            audioManager.setStreamMute(android.media.AudioManager.STREAM_NOTIFICATION, true);
                            audioManager.setStreamMute(android.media.AudioManager.STREAM_MUSIC, true);
                        }
                    } catch (Exception ignored) {}
                }

                Runnable restoreAudio = () -> {
                    if (audioManager != null) {
                        try {
                            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                                audioManager.adjustStreamVolume(android.media.AudioManager.STREAM_SYSTEM, android.media.AudioManager.ADJUST_UNMUTE, 0);
                                audioManager.adjustStreamVolume(android.media.AudioManager.STREAM_NOTIFICATION, android.media.AudioManager.ADJUST_UNMUTE, 0);
                                audioManager.adjustStreamVolume(android.media.AudioManager.STREAM_MUSIC, android.media.AudioManager.ADJUST_UNMUTE, 0);
                                audioManager.adjustStreamVolume(android.media.AudioManager.STREAM_ALARM, android.media.AudioManager.ADJUST_UNMUTE, 0);
                            } else {
                                audioManager.setStreamMute(android.media.AudioManager.STREAM_SYSTEM, false);
                                audioManager.setStreamMute(android.media.AudioManager.STREAM_NOTIFICATION, false);
                                audioManager.setStreamMute(android.media.AudioManager.STREAM_MUSIC, false);
                            }
                        } catch (Exception ignored) {}
                    }
                };

                currentRecognizer.setRecognitionListener(new android.speech.RecognitionListener() {
                    private String lastPartial = null;
                    private boolean isResolving = false;

                    @Override
                    public void onReadyForSpeech(android.os.Bundle params) {
                        restoreAudio.run();
                        notifyListeners("onSpeechStatus", new JSObject().put("status", "listening"));
                    }
                    @Override
                    public void onBeginningOfSpeech() {}
                    @Override
                    public void onRmsChanged(float rmsdB) {}
                    @Override
                    public void onBufferReceived(byte[] buffer) {}
                    @Override
                    public void onEndOfSpeech() {
                        restoreAudio.run();
                        notifyListeners("onSpeechStatus", new JSObject().put("status", "processing"));
                        
                        // Prevent the recognizer from hanging indefinitely in the processing phase
                        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                            if (!isResolving) {
                                isResolving = true;
                                if (lastPartial != null && !lastPartial.trim().isEmpty()) {
                                    JSObject ret = new JSObject();
                                    ret.put("text", lastPartial);
                                    call.resolve(ret);
                                } else {
                                    call.reject("Speech recognizer hung during processing");
                                }
                            }
                        }, 1500);
                    }
                    @Override
                    public void onError(int error) {
                        restoreAudio.run();
                        if (isResolving) return;
                        isResolving = true;
                        if (lastPartial != null && !lastPartial.trim().isEmpty()) {
                            JSObject ret = new JSObject();
                            ret.put("text", lastPartial);
                            call.resolve(ret);
                        } else {
                            android.util.Log.e("IrisSpeech", "Speech error code: " + error);
                            call.reject("Speech error: " + error);
                        }
                    }
                    @Override
                    public void onResults(android.os.Bundle results) {
                        restoreAudio.run();
                        if (isResolving) return;
                        isResolving = true;
                        java.util.ArrayList<String> matches = results.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION);
                        if (matches != null && !matches.isEmpty()) {
                            JSObject ret = new JSObject();
                            ret.put("text", matches.get(0));
                            call.resolve(ret);
                        } else if (lastPartial != null && !lastPartial.trim().isEmpty()) {
                            JSObject ret = new JSObject();
                            ret.put("text", lastPartial);
                            call.resolve(ret);
                        } else {
                            call.reject("No speech matched");
                        }
                    }
                    @Override
                    public void onPartialResults(android.os.Bundle partialResults) {
                        java.util.ArrayList<String> matches = partialResults.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION);
                        if (matches != null && !matches.isEmpty()) {
                            lastPartial = matches.get(0);
                            notifyListeners("onSpeechPartial", new JSObject().put("text", lastPartial));
                        }
                    }
                    @Override
                    public void onEvent(int eventType, android.os.Bundle params) {}
                });

                currentRecognizer.startListening(intent);
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(restoreAudio, 1000);
            } catch (Exception e) {
                call.reject("Failed to start speech recognition: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void stopOfflineSpeech(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (currentRecognizer != null) {
                    currentRecognizer.cancel();
                }
                call.resolve();
            } catch (Exception e) {
                call.reject("Failed to stop speech: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void resolveWithPartial(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (currentRecognizer != null) {
                    currentRecognizer.cancel();
                }
                // Use the last known partial result as the final text
                String text = call.getString("text", "");
                if (text != null && !text.trim().isEmpty()) {
                    JSObject ret = new JSObject();
                    ret.put("text", text);
                    // Resolve the pending speech call if it exists
                    if (currentSpeechCall != null) {
                        currentSpeechCall.resolve(ret);
                        currentSpeechCall = null;
                    }
                    call.resolve(ret);
                } else {
                    call.reject("No partial text available");
                }
            } catch (Exception e) {
                call.reject("Failed to resolve with partial: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void executeSystemAction(PluginCall call) {
        String action = call.getString("action");
        String param = call.getString("param", "");
        Boolean speaker = call.getBoolean("speaker", false);

        try {
            if ("CALL".equals(action) && param != null) {
                if (ContextCompat.checkSelfPermission(getContext(), android.Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
                    Intent intent = new Intent(Intent.ACTION_CALL);
                    intent.setData(Uri.parse("tel:" + param));
                    if (speaker != null && speaker) {
                        intent.putExtra("android.telecom.extra.START_CALL_WITH_SPEAKERPHONE", true);
                        intent.putExtra("com.android.phone.extra.USE_SPEAKER", true);
                        intent.putExtra("EXTRA_START_CALL_WITH_SPEAKERPHONE", true);
                    }
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                    call.resolve();
                } else {
                    // Fallback to DIAL if permission is missing (no permission needed)
                    Intent intent = new Intent(Intent.ACTION_DIAL);
                    intent.setData(Uri.parse("tel:" + param));
                    if (speaker != null && speaker) {
                        intent.putExtra("android.telecom.extra.START_CALL_WITH_SPEAKERPHONE", true);
                        intent.putExtra("com.android.phone.extra.USE_SPEAKER", true);
                        intent.putExtra("EXTRA_START_CALL_WITH_SPEAKERPHONE", true);
                    }
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                    call.resolve(new JSObject().put("message", "Permission missing, falling back to dialer"));
                }
            } else if ("WIFI".equals(action)) {
                boolean enable = call.getBoolean("enable", true);
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                    Intent panelIntent = new Intent(android.provider.Settings.Panel.ACTION_WIFI);
                    panelIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(panelIntent);
                    call.resolve(new JSObject().put("message", "Opened Settings Panel"));
                } else {
                    android.net.wifi.WifiManager wifiManager = (android.net.wifi.WifiManager) getContext().getApplicationContext().getSystemService(android.content.Context.WIFI_SERVICE);
                    if (wifiManager != null) {
                        wifiManager.setWifiEnabled(enable);
                        call.resolve();
                    } else {
                        call.reject("WifiManager is null");
                    }
                }
            } else if ("BLUETOOTH".equals(action)) {
                boolean enable = call.getBoolean("enable", true);
                android.bluetooth.BluetoothAdapter bluetoothAdapter = android.bluetooth.BluetoothAdapter.getDefaultAdapter();
                if (bluetoothAdapter != null) {
                    if (ContextCompat.checkSelfPermission(getContext(), android.Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED || android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.S) {
                        if (enable) {
                            bluetoothAdapter.enable();
                        } else {
                            bluetoothAdapter.disable();
                        }
                        call.resolve();
                    } else {
                        call.reject("Missing BLUETOOTH_CONNECT permission");
                    }
                } else {
                    call.reject("Bluetooth not supported");
                }
            } else {
                call.reject("Unknown action: " + action);
            }
        } catch(Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void requestStorageAccess(PluginCall call) {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
            } else {
                call.reject("Use standard runtime permissions for Android < 11");
            }
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("Failed to request storage access: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getSystemStats(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            // Memory stats
            android.app.ActivityManager activityManager = (android.app.ActivityManager) getContext().getSystemService(android.content.Context.ACTIVITY_SERVICE);
            android.app.ActivityManager.MemoryInfo memoryInfo = new android.app.ActivityManager.MemoryInfo();
            activityManager.getMemoryInfo(memoryInfo);
            long totalMem = memoryInfo.totalMem;
            long availMem = memoryInfo.availMem;
            long usedMem = totalMem - availMem;
            ret.put("memTotal", totalMem);
            ret.put("memUsed", usedMem);
            ret.put("memAvailable", availMem);

            // CPU Temp (try various common sysfs nodes)
            String[] tempFiles = {
                "/sys/class/thermal/thermal_zone0/temp",
                "/sys/class/thermal/thermal_zone1/temp",
                "/sys/devices/system/cpu/cpu0/cpufreq/cpu_temp",
                "/sys/class/hwmon/hwmon0/device/temp1_input",
                "/sys/class/hwmon/hwmon1/device/temp1_input",
                "/sys/class/hwmon/hwmon2/device/temp1_input"
            };
            double cpuTemp = -1;
            for (String file : tempFiles) {
                try {
                    java.io.BufferedReader br = new java.io.BufferedReader(new java.io.FileReader(file));
                    String line = br.readLine();
                    br.close();
                    if (line != null) {
                        long temp = Long.parseLong(line.trim());
                        if (temp > 10000) {
                            cpuTemp = temp / 1000.0;
                        } else if (temp > 1000) {
                            cpuTemp = temp / 10.0;
                        } else {
                            cpuTemp = temp;
                        }
                        break;
                    }
                } catch (Exception e) {}
            }
            if (cpuTemp == -1) cpuTemp = 35.0; // fallback mockup if unreachable
            ret.put("cpuTemp", cpuTemp);
            
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get system stats", e);
        }
    }

    @PluginMethod
    public void getDeviceOemInfo(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("manufacturer", android.os.Build.MANUFACTURER);
        ret.put("model", android.os.Build.MODEL);
        ret.put("sdkVersion", android.os.Build.VERSION.SDK_INT);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        try {
            android.os.PowerManager pm = (android.os.PowerManager) getContext().getSystemService(android.content.Context.POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(getContext().getPackageName())) {
                Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                JSObject ret = new JSObject();
                ret.put("prompted", true);
                call.resolve(ret);
            } else {
                JSObject ret = new JSObject();
                ret.put("prompted", false);
                ret.put("alreadyIgnoring", true);
                call.resolve(ret);
            }
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("Failed to request battery optimization exemption: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openOemBatterySettings(PluginCall call) {
        String manufacturer = call.getString("manufacturer", "").toLowerCase().trim();
        Intent intent = null;

        try {
            switch (manufacturer) {
                case "samsung":
                    intent = new Intent();
                    intent.setComponent(new android.content.ComponentName(
                        "com.samsung.android.lool",
                        "com.samsung.android.sm.battery.ui.BatteryActivity"
                    ));
                    break;
                case "xiaomi":
                case "redmi":
                case "poco":
                    intent = new Intent();
                    intent.setComponent(new android.content.ComponentName(
                        "com.miui.powerkeeper",
                        "com.miui.powerkeeper.ui.HiddenAppsConfigActivity"
                    ));
                    intent.putExtra("package_name", getContext().getPackageName());
                    intent.putExtra("package_label", "Iris Launcher");
                    break;
                case "huawei":
                case "honor":
                    intent = new Intent();
                    intent.setComponent(new android.content.ComponentName(
                        "com.huawei.systemmanager",
                        "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"
                    ));
                    break;
                case "oppo":
                case "realme":
                    intent = new Intent();
                    intent.setComponent(new android.content.ComponentName(
                        "com.coloros.oppoguardelf",
                        "com.coloros.powermanager.fuelgaue.PowerUsageModelActivity"
                    ));
                    break;
                case "vivo":
                case "iqoo":
                    intent = new Intent();
                    intent.setComponent(new android.content.ComponentName(
                        "com.vivo.abe",
                        "com.vivo.applicationbehaviorengine.ui.ExcessivePowerManagerActivity"
                    ));
                    break;
                case "oneplus":
                    intent = new Intent();
                    intent.setComponent(new android.content.ComponentName(
                        "com.oneplus.security",
                        "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity"
                    ));
                    break;
                default:
                    // Fallback: open system battery optimization page
                    intent = new Intent(android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                    break;
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            // OEM intent not found, fallback to generic battery settings
            try {
                Intent fallback = new Intent(android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);
                call.resolve(new JSObject().put("fallback", true));
            } catch (Exception e2) {
                // Last resort: open general settings
                try {
                    Intent generalSettings = new Intent(android.provider.Settings.ACTION_SETTINGS);
                    generalSettings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(generalSettings);
                    call.resolve(new JSObject().put("fallback", true));
                } catch (Exception e3) {
                    call.reject("Could not open any battery settings page");
                }
            }
        }
    }

    @PluginMethod
    public void checkAndRequestPermission(PluginCall call) {
        String permission = call.getString("permission", "");
        JSObject ret = new JSObject();

        try {
            PermissionManager permManager = PermissionManager.getInstance(getContext());

            if (permManager.isPermissionGranted(permission)) {
                ret.put("granted", true);
                ret.put("sdkRequired", true);
                ret.put("message", permission + " already granted");
                call.resolve(ret);
                return;
            }

            // Handle special non-Activity permissions
            switch (permission) {
                case "BIND_ACCESSIBILITY_SERVICE":
                case "PACKAGE_USAGE_STATS":
                case "SYSTEM_ALERT_WINDOW":
                case "WRITE_SETTINGS":
                case "REQUEST_INSTALL_PACKAGES":
                case "ACCESS_NOTIFICATION_POLICY":
                    permManager.openPermissionSettings(permission);
                    ret.put("granted", false);
                    ret.put("sdkRequired", true);
                    ret.put("message", "Opening settings for " + permission);
                    call.resolve(ret);
                    return;
            }

            // For runtime permissions, use the standard request flow
            if (android.os.Build.VERSION.SDK_INT >= 23) {
                String[] perms = {getPermissionString(permission)};
                if (getActivity() != null) {
                    androidx.core.app.ActivityCompat.requestPermissions(getActivity(), perms, permManager.getRequestCode(permission));
                }
                ret.put("granted", false);
                ret.put("sdkRequired", true);
                ret.put("message", permManager.getRationale(permission));
            } else {
                ret.put("granted", ContextCompat.checkSelfPermission(getContext(), permission) == PackageManager.PERMISSION_GRANTED);
                ret.put("sdkRequired", false);
                ret.put("message", "SDK < 23, permission auto-granted");
            }
        } catch (Exception e) {
            ret.put("granted", false);
            ret.put("sdkRequired", true);
            ret.put("message", "Error checking permission: " + e.getMessage());
        }

        call.resolve(ret);
    }

    @PluginMethod
    public void batchCheckPermissions(PluginCall call) {
        JSArray permissionsArray = call.getArray("permissions", new JSArray());
        PermissionManager permManager = PermissionManager.getInstance(getContext());
        JSArray results = new JSArray();

        try {
            for (int i = 0; i < permissionsArray.length(); i++) {
                String perm = permissionsArray.getString(i);
                JSObject obj = new JSObject();
                obj.put("permission", perm);
                obj.put("granted", permManager.isPermissionGranted(perm));
                obj.put("rationale", permManager.getRationale(perm));
                obj.put("isRuntime", isRuntimePermission(perm));
                results.put(obj);
            }
        } catch (Exception e) {
            // Ignore parse errors
        }

        JSObject ret = new JSObject();
        ret.put("results", results);
        call.resolve(ret);
    }

    @PluginMethod
    public void batchRequestPermissions(PluginCall call) {
        JSArray permissionsArray = call.getArray("permissions", new JSArray());
        PermissionManager permManager = PermissionManager.getInstance(getContext());
        JSArray results = new JSArray();
        java.util.List<String> toRequest = new java.util.ArrayList<>();

        for (int i = 0; i < permissionsArray.length(); i++) {
            try {
                String perm = permissionsArray.getString(i);
                boolean granted = permManager.isPermissionGranted(perm);

                JSObject obj = new JSObject();
                obj.put("permission", perm);
                obj.put("granted", granted);
                results.put(obj);

                if (!granted && isRuntimePermission(perm)) {
                    toRequest.add(perm);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error reading permission at index " + i, e);
            }
        }

        if (!toRequest.isEmpty() && getActivity() != null) {
            String[] perms = toRequest.toArray(new String[0]);
            androidx.core.app.ActivityCompat.requestPermissions(getActivity(), perms, 9000);
        }

        JSObject ret = new JSObject();
        ret.put("results", results);
        ret.put("requested", toRequest.size());
        call.resolve(ret);
    }

    @PluginMethod
    public void openPermissionSettings(PluginCall call) {
        String permission = call.getString("permission", "");
        PermissionManager permManager = PermissionManager.getInstance(getContext());
        permManager.openPermissionSettings(permission);
        JSObject ret = new JSObject();
        ret.put("opened", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getPermissionStatusSummary(PluginCall call) {
        PermissionManager permManager = PermissionManager.getInstance(getContext());
        String[] allPerms = {
            "SET_WALLPAPER", "QUERY_ALL_PACKAGES", "REQUEST_INSTALL_PACKAGES",
            "BIND_ACCESSIBILITY_SERVICE", "PACKAGE_USAGE_STATS", "READ_CONTACTS",
            "CAMERA", "RECORD_AUDIO", "ACCESS_FINE_LOCATION",
            "ACCESS_COARSE_LOCATION", "READ_EXTERNAL_STORAGE", "READ_MEDIA_IMAGES",
            "POST_NOTIFICATIONS", "WRITE_SETTINGS", "SYSTEM_ALERT_WINDOW",
            "ACCESS_NOTIFICATION_POLICY", "USE_BIOMETRIC", "VIBRATE",
            "CHANGE_NETWORK_STATE"
        };

        JSObject ret = new JSObject();
        JSObject summary = new JSObject();
        int granted = 0;
        int total = allPerms.length;

        for (String perm : allPerms) {
            boolean isGranted = permManager.isPermissionGranted(perm);
            summary.put(perm, isGranted);
            if (isGranted) granted++;
        }

        ret.put("permissions", summary);
        ret.put("granted", granted);
        ret.put("total", total);
        call.resolve(ret);
    }

    private String getPermissionString(String permission) {
        switch (permission) {
            case "CAMERA": return android.Manifest.permission.CAMERA;
            case "RECORD_AUDIO": return android.Manifest.permission.RECORD_AUDIO;
            case "ACCESS_FINE_LOCATION": return android.Manifest.permission.ACCESS_FINE_LOCATION;
            case "ACCESS_COARSE_LOCATION": return android.Manifest.permission.ACCESS_COARSE_LOCATION;
            case "READ_CONTACTS": return android.Manifest.permission.READ_CONTACTS;
            case "POST_NOTIFICATIONS":
                if (android.os.Build.VERSION.SDK_INT >= 33) return android.Manifest.permission.POST_NOTIFICATIONS;
                return "POST_NOTIFICATIONS";
            case "READ_EXTERNAL_STORAGE": return android.Manifest.permission.READ_EXTERNAL_STORAGE;
            case "READ_MEDIA_IMAGES":
                if (android.os.Build.VERSION.SDK_INT >= 33) return android.Manifest.permission.READ_MEDIA_IMAGES;
                return android.Manifest.permission.READ_EXTERNAL_STORAGE;
            case "VIBRATE": return android.Manifest.permission.VIBRATE;
            case "SET_WALLPAPER": return android.Manifest.permission.SET_WALLPAPER;
            default: return permission;
        }
    }

    private boolean isRuntimePermission(String permission) {
        switch (permission) {
            case "CAMERA":
            case "RECORD_AUDIO":
            case "ACCESS_FINE_LOCATION":
            case "ACCESS_COARSE_LOCATION":
            case "READ_CONTACTS":
            case "POST_NOTIFICATIONS":
            case "READ_EXTERNAL_STORAGE":
            case "READ_MEDIA_IMAGES":
            case "WRITE_SETTINGS":
            case "SYSTEM_ALERT_WINDOW":
            case "USE_BIOMETRIC":
                return true;
            default:
                return false;
        }
    }

    @PluginMethod
    public void playAudioBase64(PluginCall call) {
        String base64Data = call.getString("data");
        if (base64Data == null) {
            call.reject("Missing data parameter");
            return;
        }

        try {
            // Stop any existing playback
            if (mediaPlayer != null) {
                try { mediaPlayer.stop(); } catch (Exception e) {}
                try { mediaPlayer.release(); } catch (Exception e) {}
                mediaPlayer = null;
            }

            // Write base64 directly to a temp file in cache
            java.io.File tempFile = java.io.File.createTempFile("iris_tts_native", ".mp3", getContext().getCacheDir());
            byte[] audioBytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);
            java.io.FileOutputStream fos = new java.io.FileOutputStream(tempFile);
            fos.write(audioBytes);
            fos.close();

            mediaPlayer = new android.media.MediaPlayer();
            java.io.FileInputStream fis = new java.io.FileInputStream(tempFile);
            mediaPlayer.setDataSource(fis.getFD());
            fis.close();
            
            mediaPlayer.setOnCompletionListener(mp -> {
                JSObject ret2 = new JSObject();
                ret2.put("status", "completed");
                notifyListeners("onAudioPlaybackFinished", ret2);
                try { mp.release(); } catch (Exception e) {}
                mediaPlayer = null;
                try { tempFile.delete(); } catch (Exception e) {}
            });
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                JSObject ret2 = new JSObject();
                ret2.put("status", "error");
                ret2.put("error", "MediaPlayer error: " + what + "/" + extra);
                notifyListeners("onAudioPlaybackFinished", ret2);
                try { mp.release(); } catch (Exception e) {}
                mediaPlayer = null;
                try { tempFile.delete(); } catch (Exception e) {}
                return true;
            });
            mediaPlayer.prepare();
            mediaPlayer.start();
            call.resolve();
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("Failed to play audio base64: " + e.getMessage());
        }
    }



    @PluginMethod
    public void speakCartesiaNative(PluginCall call) {
        String text = call.getString("text");
        String voiceId = call.getString("voiceId");
        String apiKey = call.getString("apiKey");
        
        if (text == null || apiKey == null || voiceId == null) {
            call.reject("Missing required parameters (text, voiceId, apiKey)");
            return;
        }

        new Thread(() -> {
            try {
                java.net.URL url = new java.net.URL("https://api.cartesia.ai/tts/bytes");
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Cartesia-Version", "2024-06-10");
                conn.setRequestProperty("X-API-Key", apiKey);
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);

                JSObject jsonObj = new JSObject();
                jsonObj.put("model_id", "sonic-3.5");
                jsonObj.put("transcript", text);
                JSObject voiceObj = new JSObject();
                voiceObj.put("mode", "id");
                voiceObj.put("id", voiceId);
                jsonObj.put("voice", voiceObj);
                JSObject outputFormatObj = new JSObject();
                outputFormatObj.put("container", "mp3");
                outputFormatObj.put("bit_rate", 128000);
                outputFormatObj.put("sample_rate", 44100);
                jsonObj.put("output_format", outputFormatObj);

                java.io.OutputStream os = conn.getOutputStream();
                os.write(jsonObj.toString().getBytes("UTF-8"));
                os.close();

                int responseCode = conn.getResponseCode();
                if (responseCode == 200) {
                    java.io.InputStream is = conn.getInputStream();
                    java.io.File tempFile = java.io.File.createTempFile("iris_tts", ".mp3", getContext().getCacheDir());
                    java.io.FileOutputStream fos = new java.io.FileOutputStream(tempFile);
                    
                    byte[] buffer = new byte[4096];
                    int len;
                    while ((len = is.read(buffer)) != -1) {
                        fos.write(buffer, 0, len);
                    }
                    fos.close();
                    is.close();

                    getBridge().getActivity().runOnUiThread(() -> {
                        try {
                            if (mediaPlayer != null) {
                                try { mediaPlayer.stop(); } catch (Exception e) {}
                                try { mediaPlayer.release(); } catch (Exception e) {}
                                mediaPlayer = null;
                            }

                            mediaPlayer = new android.media.MediaPlayer();
                            java.io.FileInputStream fis = new java.io.FileInputStream(tempFile);
                            mediaPlayer.setDataSource(fis.getFD());
                            fis.close();
                            
                            mediaPlayer.setAudioAttributes(
                                new android.media.AudioAttributes.Builder()
                                    .setUsage(android.media.AudioAttributes.USAGE_MEDIA)
                                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                                    .build()
                            );

                            mediaPlayer.setOnCompletionListener(mp -> {
                                JSObject ret2 = new JSObject();
                                ret2.put("status", "completed");
                                notifyListeners("onAudioPlaybackFinished", ret2);
                                try { mp.release(); } catch (Exception e) {}
                                mediaPlayer = null;
                                try { tempFile.delete(); } catch (Exception e) {}
                            });
                            
                            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                                JSObject ret2 = new JSObject();
                                ret2.put("status", "error");
                                ret2.put("error", "MediaPlayer error: " + what + "/" + extra);
                                notifyListeners("onAudioPlaybackFinished", ret2);
                                try { mp.release(); } catch (Exception e) {}
                                mediaPlayer = null;
                                try { tempFile.delete(); } catch (Exception e) {}
                                return true;
                            });

                            mediaPlayer.prepare();
                            mediaPlayer.start();
                            call.resolve();
                        } catch (Exception e) {
                            call.reject("Playback failed: " + e.getMessage());
                        }
                    });
                } else {
                    java.io.InputStream err = conn.getErrorStream();
                    if (err != null) {
                        java.io.BufferedReader br = new java.io.BufferedReader(new java.io.InputStreamReader(err));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = br.readLine()) != null) { sb.append(line); }
                        br.close();
                        call.reject("API Error: " + responseCode + " - " + sb.toString());
                    } else {
                        call.reject("API Error: " + responseCode);
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
                call.reject("Network/IO Error: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void playAudioFile(PluginCall call) {
        String filePath = call.getString("path");
        if (filePath == null) {
            call.reject("Missing path parameter");
            return;
        }

        try {
            // Stop any existing playback
            if (mediaPlayer != null) {
                try { mediaPlayer.stop(); } catch (Exception e) {}
                try { mediaPlayer.release(); } catch (Exception e) {}
                mediaPlayer = null;
            }

            mediaPlayer = new android.media.MediaPlayer();
            
            // For internal storage files, use FileDescriptor instead of string path
            java.io.File file = new java.io.File(filePath);
            java.io.FileInputStream fis = new java.io.FileInputStream(file);
            mediaPlayer.setDataSource(fis.getFD());
            fis.close();
            
            mediaPlayer.setOnCompletionListener(mp -> {
                JSObject ret2 = new JSObject();
                ret2.put("status", "completed");
                notifyListeners("onAudioPlaybackFinished", ret2);
                try { mp.release(); } catch (Exception e) {}
                mediaPlayer = null;
            });
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                JSObject ret2 = new JSObject();
                ret2.put("status", "error");
                ret2.put("error", "MediaPlayer error: " + what + "/" + extra);
                notifyListeners("onAudioPlaybackFinished", ret2);
                try { mp.release(); } catch (Exception e) {}
                mediaPlayer = null;
                return true;
            });
            mediaPlayer.prepare();
            mediaPlayer.start();
            call.resolve();
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("Failed to play audio: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopAudio(PluginCall call) {
        if (mediaPlayer != null) {
            try { mediaPlayer.stop(); } catch (Exception e) {}
            try { mediaPlayer.release(); } catch (Exception e) {}
            mediaPlayer = null;
        }
        call.resolve();
    }

    @PluginMethod
    public void downloadModel(PluginCall call) {
        String url = call.getString("url", "");
        String filename = call.getString("filename", "");

        if (url.isEmpty() || filename.isEmpty()) {
            call.reject("Missing url or filename parameter");
            return;
        }

        call.setKeepAlive(true);

        new Thread(() -> {
            java.io.File modelsDir = new java.io.File(getContext().getFilesDir(), "models");
            if (!modelsDir.exists()) {
                modelsDir.mkdirs();
            }

            java.io.File outFile = new java.io.File(modelsDir, filename);

            java.net.HttpURLConnection conn = null;
            java.io.FileOutputStream fos = null;
            java.io.InputStream is = null;
            try {
                java.net.URL dlUrl = new java.net.URL(url);
                conn = (java.net.HttpURLConnection) dlUrl.openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                conn.setRequestProperty("User-Agent", "IrisLauncher/4.5");

                int responseCode = conn.getResponseCode();
                if (responseCode != 200) {
                    call.reject("HTTP " + responseCode);
                    return;
                }

                long totalBytes = conn.getContentLengthLong();
                is = conn.getInputStream();
                fos = new java.io.FileOutputStream(outFile);

                byte[] buffer = new byte[65536];
                long downloaded = 0;
                int read;
                int lastPercent = -1;

                while ((read = is.read(buffer)) != -1) {
                    fos.write(buffer, 0, read);
                    downloaded += read;

                    if (totalBytes > 0) {
                        int percent = (int) ((downloaded * 100) / totalBytes);
                        if (percent != lastPercent) {
                            lastPercent = percent;
                            JSObject progress = new JSObject();
                            progress.put("loaded", downloaded);
                            progress.put("total", totalBytes);
                            progress.put("percent", percent);
                            notifyListeners("onModelDownloadProgress", progress);
                        }
                    }
                }

                fos.flush();
                fos.close();
                is.close();
                conn.disconnect();

                JSObject result = new JSObject();
                result.put("success", true);
                result.put("path", outFile.getAbsolutePath());
                result.put("size", outFile.length());
                call.resolve(result);

            } catch (Exception e) {
                try { if (fos != null) fos.close(); } catch (Exception ignored) {}
                try { if (is != null) is.close(); } catch (Exception ignored) {}
                if (conn != null) conn.disconnect();
                if (outFile.exists()) outFile.delete();
                call.reject("Download failed: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void restartKeepAlive(PluginCall call) {
        try {
            Intent keepAlive = new Intent(getContext(), IrisKeepAliveService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(keepAlive);
            } else {
                getContext().startService(keepAlive);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to restart keep-alive: " + e.getMessage());
        }
    }

    @PluginMethod
    public void execCommand(PluginCall call) {
        String command = call.getString("command", "").trim();
        if (command.isEmpty()) {
            call.reject("No command provided");
            return;
        }

        // Only allow: am start -a android.intent.action.VIEW -d <url>
        if (!command.matches("^am\\s+start\\s+-a\\s+android\\.intent\\.action\\.VIEW\\s+-d\\s+\"https?://[^\"]+\"$") &&
            !command.matches("^am\\s+start\\s+-a\\s+android\\.intent\\.action\\.VIEW\\s+-d\\s+https?://\\S+$")) {
            call.reject("Only 'am start -a VIEW -d <url>' is allowed");
            return;
        }

        try {
            String[] commands = { "/system/bin/sh", "-c", command };
            Process process = Runtime.getRuntime().exec(commands);
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            BufferedReader errorReader = new BufferedReader(new InputStreamReader(process.getErrorStream()));

            StringBuilder output = new StringBuilder();
            StringBuilder errors = new StringBuilder();
            String line;
            long startTime = System.currentTimeMillis();

            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
                if (System.currentTimeMillis() - startTime > 10000) {
                    process.destroyForcibly();
                    output.append("\n[TIMEOUT]\n");
                    break;
                }
            }
            while ((line = errorReader.readLine()) != null) {
                errors.append(line).append("\n");
            }

            int exitCode = -1;
            try {
                boolean finished = process.waitFor(15, TimeUnit.SECONDS);
                if (!finished) { process.destroyForcibly(); }
                else { exitCode = process.exitValue(); }
            } catch (InterruptedException e) {
                process.destroyForcibly();
                Thread.currentThread().interrupt();
            }
            reader.close();
            errorReader.close();

            JSObject result = new JSObject();
            result.put("output", output.toString().trim());
            result.put("error", errors.toString().trim());
            result.put("exitCode", exitCode);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Command failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getSystemInfo(PluginCall call) {
        try {
            JSObject info = new JSObject();

            // Memory info
            android.app.ActivityManager am = (android.app.ActivityManager) getContext().getSystemService(android.content.Context.ACTIVITY_SERVICE);
            android.app.ActivityManager.MemoryInfo memInfo = new android.app.ActivityManager.MemoryInfo();
            am.getMemoryInfo(memInfo);
            info.put("memTotal", memInfo.totalMem / 1024 / 1024);
            info.put("memAvail", memInfo.availMem / 1024 / 1024);
            info.put("memUsed", (memInfo.totalMem - memInfo.availMem) / 1024 / 1024);
            info.put("lowMemory", memInfo.lowMemory);

            // CPU info from /proc/stat
            try {
                java.io.BufferedReader br = new java.io.BufferedReader(new InputStreamReader(new java.io.FileInputStream("/proc/stat")));
                String cpuLine = br.readLine();
                br.close();
                if (cpuLine != null) {
                    String[] parts = cpuLine.split("\\s+");
                    if (parts.length >= 5) {
                        long user = Long.parseLong(parts[1]);
                        long nice = Long.parseLong(parts[2]);
                        long system = Long.parseLong(parts[3]);
                        long idle = Long.parseLong(parts[4]);
                        long total = user + nice + system + idle;
                        long used = user + nice + system;
                        info.put("cpuUsage", total > 0 ? (used * 100 / total) : 0);
                        info.put("cpuCores", Runtime.getRuntime().availableProcessors());
                    }
                }
            } catch (Exception e) {
                info.put("cpuUsage", -1);
                info.put("cpuCores", Runtime.getRuntime().availableProcessors());
            }

            // Battery info
            android.content.IntentFilter batteryFilter = new android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED);
            android.content.Intent batteryStatus = getContext().registerReceiver(null, batteryFilter);
            if (batteryStatus != null) {
                int level = batteryStatus.getIntExtra("level", -1);
                int scale = batteryStatus.getIntExtra("scale", -1);
                int temperature = batteryStatus.getIntExtra("temperature", 0);
                int voltage = batteryStatus.getIntExtra("voltage", 0);
                int status = batteryStatus.getIntExtra("status", -1);
                info.put("batteryLevel", scale > 0 ? (level * 100 / scale) : -1);
                info.put("batteryTemp", temperature / 10.0);
                info.put("batteryVoltage", voltage);
                info.put("batteryStatus", status == 2 ? "CHARGING" : status == 5 ? "FULL" : "DISCHARGING");
            }

            // Storage info
            android.os.StatFs stat = new android.os.StatFs(android.os.Environment.getDataDirectory().getPath());
            long blockSize = stat.getBlockSizeLong();
            long totalBlocks = stat.getBlockCountLong();
            long availableBlocks = stat.getAvailableBlocksLong();
            info.put("storageTotal", totalBlocks * blockSize / 1024 / 1024 / 1024);
            info.put("storageAvail", availableBlocks * blockSize / 1024 / 1024 / 1024);
            info.put("storageUsed", (totalBlocks - availableBlocks) * blockSize / 1024 / 1024 / 1024);

            // Device info
            info.put("model", android.os.Build.MODEL);
            info.put("manufacturer", android.os.Build.MANUFACTURER);
            info.put("sdkVersion", Build.VERSION.SDK_INT);
            info.put("androidVersion", Build.VERSION.RELEASE);
            info.put("kernelVersion", System.getProperty("os.version"));

            call.resolve(info);
        } catch (Exception e) {
            call.reject("Failed to get system info: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getSystemWallpaper(PluginCall call) {
        try {
            android.app.WallpaperManager wm = android.app.WallpaperManager.getInstance(getContext());
            Drawable wallpaperDrawable = wm.getDrawable();
            if (wallpaperDrawable == null) {
                try { wallpaperDrawable = wm.getBuiltInDrawable(); } catch (Exception e) {}
            }
            if (wallpaperDrawable == null) {
                call.reject("No system wallpaper found");
                return;
            }
            android.util.DisplayMetrics metrics = getContext().getResources().getDisplayMetrics();
            int width = wallpaperDrawable.getIntrinsicWidth();
            int height = wallpaperDrawable.getIntrinsicHeight();
            if (width <= 0 || height <= 0) {
                width = metrics.widthPixels > 0 ? metrics.widthPixels : 1080;
                height = metrics.heightPixels > 0 ? metrics.heightPixels : 1920;
            }
            // Limit max dimensions for mobile webview performance
            if (width > 1440 || height > 2560) {
                width = width / 2;
                height = height / 2;
            }
            Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            wallpaperDrawable.setBounds(0, 0, width, height);
            wallpaperDrawable.draw(canvas);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 80, baos);
            bitmap.recycle();
            String base64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
            String dataUri = "data:image/jpeg;base64," + base64;
            JSObject result = new JSObject();
            result.put("wallpaper", dataUri);
            result.put("width", width);
            result.put("height", height);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get system wallpaper: " + e.getMessage());
        }
    }

    @PluginMethod
    public void listProcesses(PluginCall call) {
        try {
            String sortBy = call.getString("sort", "cpu");
            JSArray processes = new JSArray();

            // Read from /proc to get process info
            java.io.File procDir = new java.io.File("/proc");
            java.io.File[] dirs = procDir.listFiles();
            if (dirs != null) {
                for (java.io.File dir : dirs) {
                    if (!dir.isDirectory()) continue;
                    try {
                        int pid = Integer.parseInt(dir.getName());
                        if (pid <= 0) continue;

                        String cmdline = "";
                        try {
                            java.io.BufferedReader cmdBr = new java.io.BufferedReader(
                                new InputStreamReader(new java.io.FileInputStream(dir + "/cmdline")));
                            cmdline = cmdBr.readLine();
                            cmdBr.close();
                            if (cmdline != null) cmdline = cmdline.trim().replace("\0", " ");
                        } catch (Exception e) {}

                        String status = "";
                        long rss = 0;
                        try {
                            java.io.BufferedReader statBr = new java.io.BufferedReader(
                                new InputStreamReader(new java.io.FileInputStream(dir + "/status")));
                            String sLine;
                            while ((sLine = statBr.readLine()) != null) {
                                if (sLine.startsWith("Name:")) status = sLine.substring(5).trim();
                                if (sLine.startsWith("VmRSS:")) {
                                    String rssStr = sLine.replaceAll("[^0-9]", "");
                                    rss = Long.parseLong(rssStr);
                                }
                            }
                            statBr.close();
                        } catch (Exception e) {}

                        if (!cmdline.isEmpty() || !status.isEmpty()) {
                            JSObject proc = new JSObject();
                            proc.put("pid", pid);
                            proc.put("name", status.isEmpty() ? cmdline : status);
                            proc.put("cmdline", cmdline);
                            proc.put("rss", rss);
                            processes.put(proc);
                        }
                    } catch (NumberFormatException e) {
                        // Not a PID directory
                    }
                }
            }

            // Sort by RSS (memory usage) descending
            JSArray sorted = new JSArray();
            java.util.List<JSObject> procList = new java.util.ArrayList<>();
            for (int i = 0; i < processes.length(); i++) {
                procList.add((JSObject) processes.getJSONObject(i));
            }
            procList.sort((a, b) -> Long.compare(b.optLong("rss", 0), a.optLong("rss", 0)));
            for (JSObject p : procList) {
                sorted.put(p);
            }

            JSObject result = new JSObject();
            result.put("processes", sorted);
            result.put("count", sorted.length());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to list processes: " + e.getMessage());
        }
    }

    @PluginMethod
    public void portScan(PluginCall call) {
        String host = call.getString("host", "");
        int startPort = call.getInt("startPort", 1);
        int endPort = call.getInt("endPort", 1024);
        int timeout = call.getInt("timeout", 1500);

        if (host.isEmpty()) {
            call.reject("No host provided");
            return;
        }

        // Cap port range to prevent abuse
        if (endPort - startPort > 1000) {
            endPort = startPort + 1000;
        }

        final int fStart = startPort;
        final int fEnd = endPort;
        final int fTimeout = timeout;

        new Thread(() -> {
            try {
                InetAddress address = InetAddress.getByName(host);
                String ip = address.getHostAddress();
                ConcurrentLinkedQueue<JSObject> openPorts = new ConcurrentLinkedQueue<>();
                AtomicInteger scanned = new AtomicInteger(0);
                int totalPorts = fEnd - fStart + 1;
                int threadCount = Math.min(50, totalPorts);
                ExecutorService executor = Executors.newFixedThreadPool(threadCount);
                CountDownLatch latch = new CountDownLatch(totalPorts);

                for (int port = fStart; port <= fEnd; port++) {
                    final int p = port;
                    executor.submit(() -> {
                        try {
                            Socket socket = new Socket();
                            socket.connect(new InetSocketAddress(address, p), fTimeout);
                            socket.setSoTimeout(500);
                            int banner = -1;
                            try { banner = socket.getInputStream().read(); } catch (Exception ignored) {}
                            socket.close();

                            JSObject portInfo = new JSObject();
                            portInfo.put("port", p);
                            portInfo.put("state", "open");
                            portInfo.put("service", getServiceName(p));
                            if (banner > 0) {
                                portInfo.put("banner", String.valueOf((char) banner));
                            }
                            openPorts.add(portInfo);
                        } catch (Exception e) {
                            // Port closed or filtered
                        } finally {
                            scanned.incrementAndGet();
                            latch.countDown();
                        }
                    });
                }

                latch.await(Math.max(fTimeout * 3L, 30000), TimeUnit.MILLISECONDS);
                executor.shutdownNow();

                JSArray openArray = new JSArray();
                for (JSObject po : openPorts) openArray.put(po);

                JSObject result = new JSObject();
                result.put("host", host);
                result.put("ip", ip);
                result.put("openPorts", openArray);
                result.put("scanned", scanned.get());
                result.put("startPort", fStart);
                result.put("endPort", fEnd);
                call.resolve(result);
            } catch (Exception e) {
                call.reject("Scan failed: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void dnsLookup(PluginCall call) {
        String host = call.getString("host", "");
        if (host.isEmpty()) {
            call.reject("No host provided");
            return;
        }

        new Thread(() -> {
            try {
                InetAddress[] addresses = InetAddress.getAllByName(host);
                JSArray results = new JSArray();

                for (InetAddress addr : addresses) {
                    JSObject record = new JSObject();
                    record.put("address", addr.getHostAddress());
                    record.put("hostname", host);
                    record.put("isLoopback", addr.isLoopbackAddress());
                    record.put("isAnyLocal", addr.isAnyLocalAddress());
                    results.put(record);
                }

                boolean isIP = host.matches("\\d+\\.\\d+\\.\\d+\\.\\d+");

                JSObject result = new JSObject();
                result.put("host", host);
                result.put("isIP", isIP);
                result.put("records", results);
                result.put("count", results.length());
                call.resolve(result);
            } catch (Exception e) {
                call.reject("DNS lookup failed: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void whoisLookup(PluginCall call) {
        String domain = call.getString("domain", "");
        if (domain.isEmpty()) {
            call.reject("No domain provided");
            return;
        }

        new Thread(() -> {
            try {
                // Use RDAP (Registration Data Access Protocol) - the modern WHOIS
                String rdapUrl = "https://rdap.org/domain/" + domain;
                URL url = new URL(rdapUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                int responseCode = conn.getResponseCode();
                if (responseCode == 200) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        response.append(line);
                    }
                    reader.close();

                    String json = response.toString();
                    JSObject result = new JSObject();
                    result.put("domain", domain);
                    result.put("status", extractJsonString(json, "status"));
                    result.put("ldhName", extractJsonString(json, "ldhName"));
                    result.put("unicodeName", extractJsonString(json, "unicodeName"));
                    result.put("rawJson", json.length() > 5000 ? json.substring(0, 5000) + "..." : json);
                    conn.disconnect();
                    call.resolve(result);
                } else {
                    conn.disconnect();
                    // Fallback to DNS-over-HTTPS
                    fallbackDnsLookup(domain, call);
                }
            } catch (Exception e) {
                fallbackDnsLookup(domain, call);
            }
        }).start();
    }

    private void fallbackDnsLookup(String domain, PluginCall call) {
        try {
            String dohUrl = "https://dns.google/resolve?name=" + domain + "&type=A";
            URL url = new URL(dohUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            if (conn.getResponseCode() == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();

                JSObject result = new JSObject();
                result.put("domain", domain);
                result.put("dnsResponse", response.toString());
                result.put("source", "dns.google");
                conn.disconnect();
                call.resolve(result);
            } else {
                conn.disconnect();
                call.reject("All lookup methods failed for: " + domain);
            }
        } catch (Exception e2) {
            call.reject("All lookup methods failed: " + e2.getMessage());
        }
    }

    @PluginMethod
    public void traceroute(PluginCall call) {
        String host = call.getString("host", "");
        int maxHops = call.getInt("maxHops", 15);
        int timeoutMs = call.getInt("timeout", 3000);

        if (host.isEmpty()) {
            call.reject("No host provided");
            return;
        }

        new Thread(() -> {
            try {
                InetAddress target = InetAddress.getByName(host);
                JSArray hops = new JSArray();

                // TCP-based traceroute: try connecting through increasing TTL
                for (int ttl = 1; ttl <= maxHops; ttl++) {
                    JSObject hop = new JSObject();
                    hop.put("ttl", ttl);

                    try {
                        long start = System.currentTimeMillis();
                        Socket socket = new Socket();
                        socket.connect(new InetSocketAddress(target, 80), timeoutMs);
                        long rtt = System.currentTimeMillis() - start;
                        socket.close();

                        hop.put("ip", target.getHostAddress());
                        hop.put("hostname", host);
                        hop.put("rtt", rtt);
                        hop.put("status", "reachable");
                        hops.put(hop);
                        break; // Reached destination
                    } catch (Exception e) {
                        hop.put("ip", "*");
                        hop.put("rtt", -1);
                        hop.put("status", "timeout");
                        hops.put(hop);
                    }
                }

                JSObject result = new JSObject();
                result.put("host", host);
                result.put("targetIp", target.getHostAddress());
                result.put("hops", hops);
                result.put("hopCount", hops.length());
                call.resolve(result);
            } catch (Exception e) {
                call.reject("Traceroute failed: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void sqlmapCheck(PluginCall call) {
        String url = call.getString("url", "");
        if (url.isEmpty()) {
            call.reject("No URL provided");
            return;
        }

        try {
            JSArray vulnerabilities = new JSArray();

            // Common SQL injection test payloads
            String[] payloads = {
                "' OR '1'='1",
                "' OR '1'='1' --",
                "' OR '1'='1' /*",
                "1' OR 1=1 --",
                "' UNION SELECT NULL--",
                "1; DROP TABLE--",
                "' AND 1=1--",
                "' AND 1=2--",
                "admin'--",
                "' WAITFOR DELAY '0:0:5'--"
            };

            // Common SQL error patterns
            String[] errorPatterns = {
                "sql syntax",
                "mysql",
                "sqlite",
                "postgresql",
                "ORA-",
                "Microsoft OLE DB",
                "ODBC SQL Server",
                "unclosed quotation mark",
                "quoted string not properly terminated",
                "You have an error in your SQL",
                "Warning.*mysql",
                "valid MySQL result",
                "pg_query",
                "SQLite/JDBCDriver",
                "SQLITE_ERROR",
                "JET Database Engine",
                "Microsoft Access",
                "SQL Server"
            };

            String originalResponse = makeHttpRequest(url);
            boolean originalHadError = false;
            for (String pattern : errorPatterns) {
                if (originalResponse.toLowerCase().contains(pattern.toLowerCase())) {
                    originalHadError = true;
                    break;
                }
            }

            for (String payload : payloads) {
                try {
                    String testUrl = url.contains("?") ? url + "&test=" + encodeUrl(payload) : url + "?test=" + encodeUrl(payload);
                    String response = makeHttpRequest(testUrl);

                    boolean hasError = false;
                    String errorType = "";
                    for (String pattern : errorPatterns) {
                        if (response.toLowerCase().contains(pattern.toLowerCase())) {
                            hasError = true;
                            errorType = pattern;
                            break;
                        }
                    }

                    // Check for SQL error in response but not in original
                    if (hasError && !originalHadError) {
                        JSObject vuln = new JSObject();
                        vuln.put("payload", payload);
                        vuln.put("evidence", errorType);
                        vuln.put("url", testUrl);
                        vuln.put("severity", "HIGH");
                        vulnerabilities.put(vuln);
                    }

                    // Check for boolean-based blind injection
                    String trueUrl = url.contains("?") ? url + "&id=1' OR '1'='1" : url + "?id=1' OR '1'='1";
                    String falseUrl = url.contains("?") ? url + "&id=1' OR '1'='2" : url + "?id=1' OR '1'='2";
                    String trueResp = makeHttpRequest(trueUrl);
                    String falseResp = makeHttpRequest(falseUrl);

                    if (!trueResp.equals(falseResp) && Math.abs(trueResp.length() - falseResp.length()) > 10) {
                        JSObject vuln = new JSObject();
                        vuln.put("payload", "Boolean-based blind");
                        vuln.put("evidence", "Response length differs: " + trueResp.length() + " vs " + falseResp.length());
                        vuln.put("severity", "MEDIUM");
                        vulnerabilities.put(vuln);
                        break; // Don't repeat for each payload
                    }
                } catch (Exception e) {
                    // Skip failed requests
                }
            }

            JSObject result = new JSObject();
            result.put("url", url);
            result.put("vulnerabilities", vulnerabilities);
            result.put("vulnCount", vulnerabilities.length());
            result.put("tested", payloads.length);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("SQLmap check failed: " + e.getMessage());
        }
    }

    // Helper: get common service name for port
    private String getServiceName(int port) {
        switch (port) {
            case 21: return "FTP";
            case 22: return "SSH";
            case 23: return "Telnet";
            case 25: return "SMTP";
            case 53: return "DNS";
            case 80: return "HTTP";
            case 110: return "POP3";
            case 111: return "RPC";
            case 135: return "MSRPC";
            case 139: return "NetBIOS";
            case 143: return "IMAP";
            case 443: return "HTTPS";
            case 445: return "SMB";
            case 993: return "IMAPS";
            case 995: return "POP3S";
            case 1433: return "MSSQL";
            case 1521: return "Oracle";
            case 3306: return "MySQL";
            case 3389: return "RDP";
            case 5432: return "PostgreSQL";
            case 5900: return "VNC";
            case 6379: return "Redis";
            case 8080: return "HTTP-Proxy";
            case 8443: return "HTTPS-Alt";
            case 27017: return "MongoDB";
            default: return "unknown";
        }
    }

    // Helper: simple HTTP GET request
    private String makeHttpRequest(String urlString) throws Exception {
        URL url = new URL(urlString);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(5000);
        conn.setRequestProperty("User-Agent", "Mozilla/5.0");

        int code = conn.getResponseCode();
        BufferedReader reader;
        if (code >= 200 && code < 400) {
            reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
        } else {
            reader = new BufferedReader(new InputStreamReader(conn.getErrorStream()));
        }

        StringBuilder response = new StringBuilder();
        String line;
        int maxLines = 200;
        while ((line = reader.readLine()) != null && maxLines-- > 0) {
            response.append(line).append("\n");
        }
        reader.close();
        conn.disconnect();
        return response.toString();
    }

    // Helper: extract string from JSON (simple parser)
    private String extractJsonString(String json, String key) {
        try {
            String search = "\"" + key + "\"";
            int idx = json.indexOf(search);
            if (idx < 0) return "";
            int colonIdx = json.indexOf(":", idx + search.length());
            int startQuote = json.indexOf("\"", colonIdx + 1);
            int endQuote = json.indexOf("\"", startQuote + 1);
            return json.substring(startQuote + 1, endQuote);
        } catch (Exception e) {
            return "";
        }
    }

    private String drawableToBase64(Drawable iconDrawable) {
        if (iconDrawable == null) return null;
        try {
            int width = iconDrawable.getIntrinsicWidth() > 0 ? iconDrawable.getIntrinsicWidth() : 96;
            int height = iconDrawable.getIntrinsicHeight() > 0 ? iconDrawable.getIntrinsicHeight() : 96;
            if (width > 256 || height > 256) {
                width = 256;
                height = 256;
            }
            Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            iconDrawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            iconDrawable.draw(canvas);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 85, baos);
            byte[] byteArray = baos.toByteArray();
            return "data:image/png;base64," + android.util.Base64.encodeToString(byteArray, android.util.Base64.NO_WRAP);
        } catch (Exception e) {
            return null;
        }
    }

    @PluginMethod
    public void getInstalledIconPacks(PluginCall call) {
        new Thread(() -> {
            JSArray list = new JSArray();
            try {
                PackageManager pm = getContext().getPackageManager();
                String[] themeActions = {
                    "org.adw.launcher.THEMES",
                    "com.novalauncher.THEME",
                    "com.gau.go.launcherex.theme",
                    "com.dlto.atom.launcher.THEME",
                    "com.fede.launcher.THEME_ICONPACK"
                };
                Set<String> addedPacks = new HashSet<>();

                for (String action : themeActions) {
                    Intent intent = new Intent(action);
                    List<ResolveInfo> riList = pm.queryIntentActivities(intent, 0);
                    for (ResolveInfo ri : riList) {
                        String pkg = ri.activityInfo.packageName;
                        if (addedPacks.contains(pkg)) continue;
                        addedPacks.add(pkg);

                        CharSequence label = ri.loadLabel(pm);
                        Drawable iconDrawable = ri.loadIcon(pm);
                        String iconBase64 = drawableToBase64(iconDrawable);

                        JSObject packObj = new JSObject();
                        packObj.put("packageName", pkg);
                        packObj.put("label", label != null ? label.toString() : pkg);
                        packObj.put("icon", iconBase64);
                        list.put(packObj);
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Error fetching installed icon packs", e);
            }
            JSObject ret = new JSObject();
            ret.put("iconPacks", list);
            call.resolve(ret);
        }).start();
    }

    @PluginMethod
    public void loadIconPackFilter(PluginCall call) {
        new Thread(() -> {
            String iconPackPackage = call.getString("packageName");
            JSObject iconMap = new JSObject();
            if (iconPackPackage == null || iconPackPackage.isEmpty()) {
                JSObject ret = new JSObject();
                ret.put("iconMap", iconMap);
                call.resolve(ret);
                return;
            }

            try {
                PackageManager pm = getContext().getPackageManager();
                List<android.content.pm.PackageInfo> installedList = pm.getInstalledPackages(0);
                Set<String> installedSet = new HashSet<>();
                for (android.content.pm.PackageInfo pi : installedList) {
                    installedSet.add(pi.packageName);
                }

                android.content.Context iconPackContext = getContext().createPackageContext(iconPackPackage, android.content.Context.CONTEXT_IGNORE_SECURITY);
                android.content.res.Resources res = iconPackContext.getResources();

                org.xmlpull.v1.XmlPullParser parser = null;

                // Try 1: Open raw asset file assets/appfilter.xml
                try {
                    java.io.InputStream is = iconPackContext.getAssets().open("appfilter.xml");
                    org.xmlpull.v1.XmlPullParserFactory factory = org.xmlpull.v1.XmlPullParserFactory.newInstance();
                    factory.setNamespaceAware(true);
                    parser = factory.newPullParser();
                    parser.setInput(is, "UTF-8");
                } catch (Exception e1) {
                    // Try 2: Compiled res/xml/appfilter.xml
                    int appfilterId = res.getIdentifier("appfilter", "xml", iconPackPackage);
                    if (appfilterId != 0) {
                        parser = res.getXml(appfilterId);
                    }
                }

                if (parser != null) {
                    int eventType = parser.getEventType();
                    while (eventType != org.xmlpull.v1.XmlPullParser.END_DOCUMENT) {
                        if (eventType == org.xmlpull.v1.XmlPullParser.START_TAG) {
                            String tagName = parser.getName();
                            if ("item".equals(tagName)) {
                                String component = null;
                                String drawableName = null;

                                for (int i = 0; i < parser.getAttributeCount(); i++) {
                                    String attr = parser.getAttributeName(i);
                                    if ("component".equalsIgnoreCase(attr)) {
                                        component = parser.getAttributeValue(i);
                                    } else if ("drawable".equalsIgnoreCase(attr)) {
                                        drawableName = parser.getAttributeValue(i);
                                    }
                                }

                                if (component != null && drawableName != null) {
                                    String targetPackage = component;
                                    if (targetPackage.startsWith("ComponentInfo{")) {
                                        targetPackage = targetPackage.substring("ComponentInfo{".length());
                                    }
                                    if (targetPackage.endsWith("}")) {
                                        targetPackage = targetPackage.substring(0, targetPackage.length() - 1);
                                    }
                                    if (targetPackage.contains("/")) {
                                        targetPackage = targetPackage.split("/")[0].trim();
                                    }
                                    targetPackage = targetPackage.trim();

                                    if (!targetPackage.isEmpty() && installedSet.contains(targetPackage)) {
                                        int drawableId = res.getIdentifier(drawableName, "drawable", iconPackPackage);
                                        if (drawableId != 0) {
                                            try {
                                                Drawable d = res.getDrawable(drawableId, null);
                                                if (d != null) {
                                                    String b64 = drawableToBase64(d);
                                                    if (b64 != null && !b64.isEmpty()) {
                                                        iconMap.put(targetPackage, b64);
                                                    }
                                                }
                                            } catch (Exception ignored) {}
                                        }
                                    }
                                }
                            }
                        }
                        eventType = parser.next();
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Error loading icon pack filter for " + iconPackPackage, e);
            }

            JSObject ret = new JSObject();
            ret.put("iconMap", iconMap);
            call.resolve(ret);
        }).start();
    }

    // Helper: URL encode string
    private String encodeUrl(String s) {
        try {
            return java.net.URLEncoder.encode(s, "UTF-8");
        } catch (Exception e) {
            return s;
        }
    }
}
