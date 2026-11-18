package com.stitch.iris.launcher;

import android.accessibilityservice.AccessibilityService;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.graphics.drawable.GradientDrawable;
import android.hardware.HardwareBuffer;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.util.Log;
import android.util.TypedValue;
import android.view.Display;
import android.view.Gravity;
import android.view.HapticFeedbackConstants;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityNodeInfo;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class IrisFloatingCopilot {

    private static final String TAG = "IrisFloatingCopilot";
    public static final String PREFS_NAME = "iris_copilot_prefs";
    public static final String KEY_ENABLED = "copilot_enabled";
    public static final String KEY_OPACITY = "copilot_opacity";
    public static final String KEY_TIMEOUT_SEC = "copilot_timeout_sec";
    public static final String KEY_SHOW_ON_HOME = "copilot_show_on_home";
    public static final String KEY_PILL_SIZE = "copilot_pill_size";
    public static final String KEY_EDGE_SIDE = "copilot_edge_side";
    public static final String KEY_AUTO_KEYBOARD = "copilot_auto_keyboard";
    public static final String KEY_ONLY_TYPING = "copilot_only_typing";
    public static final String KEY_USER_STYLE = "copilot_user_style";
    public static final String KEY_PERSONA_MODE = "copilot_persona_mode";
    public static final String KEY_USER_BIO = "copilot_user_bio";
    public static final String KEY_CLIPBOARD_TRIGGER = "copilot_clipboard_trigger";
    private static final String KEY_BACKEND = "copilot_backend";
    private static final String KEY_API_KEY = "copilot_api_key";
    private static final String KEY_GEMINI_KEY = "copilot_gemini_key";
    private static final String KEY_GROQ_KEY = "copilot_groq_key";
    private static final String KEY_MODEL = "copilot_model";
    private static final String KEY_GROQ_MODEL = "copilot_groq_model";

    private static final Pattern OTP_PATTERN = Pattern.compile("(?i)(?:otp|code|pin|verification|passcode|auth)[^0-9]{0,20}\\b(\\d{4,8})\\b|\\b(\\d{4,8})\\b[^0-9]{0,20}(?:is your|verification|otp|code)");
    private static final Pattern URL_PATTERN = Pattern.compile("https?://[^\\s\"<>()]+");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
    private static final Pattern PHONE_PATTERN = Pattern.compile("(?:\\+\\d{1,3}[\\s-]?)?(?:\\(\\d{2,4}\\)|\\d{2,4})[\\s.-]?\\d{3,4}[\\s.-]?\\d{3,4}");
    private static final Pattern COMPOSE_INTENT_PATTERN = Pattern.compile("(?i)^(?:write|tell|reply|compose|draft|message|email|say|send|text|let\\s+\\w+\\s+know|ask\\s+\\w+\\s+to)\\b");

    private static IrisFloatingCopilot instance;
    private final AccessibilityService service;
    private final WindowManager windowManager;
    private final Handler mainHandler;
    private final ExecutorService executor;

    private boolean isEnabled = true;
    private int pillOpacity = 55;
    private int timeoutSec = 3;
    private boolean showOnHome = true;
    private String pillSize = "NORMAL";
    private String edgeSide = "RIGHT";
    private boolean autoKeyboard = true;
    private boolean onlyWhenTyping = false;
    private String userStyle = "NATURAL";
    private String personaMode = "AUTO";
    private String userBio = "";
    private boolean clipboardTrigger = true;
    private boolean interviewListenTrigger = false;

    private boolean isPillAttached = false;
    private boolean isCardAttached = false;
    private boolean hasActiveDraft = false;
    private String currentPackage = "";
    private String currentAppLabel = "";
    private String currentScreenMode = "GENERAL";

    private View pillView;
    private TextView pillIconText;
    private GradientDrawable pillBgDrawable;
    private WindowManager.LayoutParams pillParams;
    private View cardView;
    private GradientDrawable cardBgDrawable;
    private WindowManager.LayoutParams cardParams;

    private final Runnable autoHideRunnable = () -> {
        if (!isCardAttached && isPillAttached && pillView != null) {
            pillView.animate().alpha(0f).setDuration(260).withEndAction(this::hidePill).start();
        }
    };

    private TextView cardTitle;
    private TextView modeBadgeView;
    private TextView cardSubTitle;
    private TextView contextPreviewView;
    private HorizontalScrollView entitiesScroll;
    private LinearLayout entitiesBar;
    private LinearLayout quickActionsBar;
    private LinearLayout moreToolsGrid;
    private HorizontalScrollView replyFilterScroll;
    private LinearLayout replyFilterRow;
    private LinearLayout resultsContainer;
    private EditText customQuestionInput;
    private TextView voiceMicBtn;
    private String replyFilter = "AUTO";
    private String lastActiveAction = "REPLY";
    private final List<TextView> replyFilterChipViews = new ArrayList<>();
    private View loadingIndicator;

    private AccessibilityNodeInfo lastTargetInputNode;
    private AccessibilityNodeInfo lastSendButtonNode;
    private String lastExtractedContext = "";
    private String lastAiResponse = "";
    private String lastInternalClipboard = "";
    private String latestExternalClipboard = "";
    private final Set<String> deepScanBuffer = new LinkedHashSet<>();
    private SpeechRecognizer speechRecognizer;
    private boolean isVoiceListening = false;

    public static synchronized void initialize(AccessibilityService service) {
        if (instance == null) {
            instance = new IrisFloatingCopilot(service);
        }
    }

    public static IrisFloatingCopilot getInstance() {
        return instance;
    }

    public static synchronized void destroy() {
        if (instance != null) {
            instance.cleanup();
            instance = null;
        }
    }

    private IrisFloatingCopilot(AccessibilityService service) {
        this.service = service;
        this.windowManager = (WindowManager) service.getSystemService(Context.WINDOW_SERVICE);
        this.mainHandler = new Handler(Looper.getMainLooper());
        this.executor = Executors.newSingleThreadExecutor();

        loadSettingsFromPrefs();
        createPillView();
        createCardView();
        updateVisualStyles();
        registerClipboardTrigger();
    }

    private void registerClipboardTrigger() {
        try {
            ClipboardManager cm = (ClipboardManager) service.getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) {
                cm.addPrimaryClipChangedListener(() -> {
                    if (!isEnabled || !clipboardTrigger) return;
                    try {
                        ClipData clip = cm.getPrimaryClip();
                        if (clip != null && clip.getItemCount() > 0) {
                            CharSequence cs = clip.getItemAt(0).getText();
                            String copied = cs != null ? cs.toString().trim() : "";
                            if (copied.length() > 2 && !copied.equals(lastInternalClipboard)) {
                                latestExternalClipboard = copied;
                                mainHandler.post(this::showPill);
                            }
                        }
                    } catch (Exception ignored) {}
                });
            }
        } catch (Exception ignored) {}
    }

    private void loadSettingsFromPrefs() {
        SharedPreferences prefs = service.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.isEnabled = prefs.getBoolean(KEY_ENABLED, true);
        this.pillOpacity = Math.max(15, Math.min(95, prefs.getInt(KEY_OPACITY, 55)));
        this.timeoutSec = Math.max(0, prefs.getInt(KEY_TIMEOUT_SEC, 3));
        this.showOnHome = prefs.getBoolean(KEY_SHOW_ON_HOME, true);
        this.pillSize = prefs.getString(KEY_PILL_SIZE, "NORMAL");
        this.edgeSide = prefs.getString(KEY_EDGE_SIDE, "RIGHT");
        this.autoKeyboard = prefs.getBoolean(KEY_AUTO_KEYBOARD, true);
        this.onlyWhenTyping = prefs.getBoolean(KEY_ONLY_TYPING, false);
        this.userStyle = prefs.getString(KEY_USER_STYLE, "NATURAL");
        this.personaMode = prefs.getString(KEY_PERSONA_MODE, "AUTO");
        this.userBio = prefs.getString(KEY_USER_BIO, "");
        this.clipboardTrigger = prefs.getBoolean(KEY_CLIPBOARD_TRIGGER, true);
    }

    public void reloadSettings() {
        mainHandler.post(() -> {
            loadSettingsFromPrefs();
            updateVisualStyles();
            if (!isEnabled) {
                hidePill();
                hideCard();
            } else if (currentPackage.equals(service.getPackageName())) {
                if (!showOnHome) {
                    hidePill();
                    hideCard();
                } else {
                    showPill();
                }
            } else if (!currentPackage.isEmpty() && !onlyWhenTyping) {
                showPill();
            }
        });
    }

    private int getPillSizeDp() {
        if ("COMPACT".equalsIgnoreCase(pillSize)) return 36;
        if ("LARGE".equalsIgnoreCase(pillSize)) return 52;
        return 44;
    }

    private void updateVisualStyles() {
        int pillAlpha = (int) (pillOpacity / 100.0f * 255);
        int strokeAlpha = Math.min(255, pillAlpha + 65);
        if (pillBgDrawable != null) {
            pillBgDrawable.setColor(Color.argb(pillAlpha, 2, 6, 23));
            pillBgDrawable.setStroke(dpToPx(1.5f), Color.argb(strokeAlpha, 0, 242, 255));
        }
        int cardOpacity = Math.max(60, Math.min(95, pillOpacity + 28));
        int cardAlpha = (int) (cardOpacity / 100.0f * 255);
        if (cardBgDrawable != null) {
            cardBgDrawable.setColor(Color.argb(cardAlpha, 2, 6, 23));
        }

        if (pillParams != null) {
            int sizePx = dpToPx(getPillSizeDp());
            pillParams.width = sizePx;
            pillParams.height = sizePx;
            if ("LEFT".equalsIgnoreCase(edgeSide)) {
                pillParams.gravity = Gravity.TOP | Gravity.START;
                pillParams.x = dpToPx(12);
            } else if ("RIGHT".equalsIgnoreCase(edgeSide)) {
                pillParams.gravity = Gravity.TOP | Gravity.END;
                pillParams.x = dpToPx(12);
            }
            if (isPillAttached && pillView != null) {
                try {
                    windowManager.updateViewLayout(pillView, pillParams);
                } catch (Exception ignored) {}
            }
        }
        if (pillIconText != null) {
            pillIconText.setTextSize(TypedValue.COMPLEX_UNIT_SP, "COMPACT".equalsIgnoreCase(pillSize) ? 16 : "LARGE".equalsIgnoreCase(pillSize) ? 24 : 20);
        }
    }

    private void scheduleAutoHide() {
        mainHandler.removeCallbacks(autoHideRunnable);
        if (timeoutSec > 0 && !isCardAttached && isPillAttached) {
            mainHandler.postDelayed(autoHideRunnable, timeoutSec * 1000L);
        }
    }

    private void cancelAutoHide() {
        mainHandler.removeCallbacks(autoHideRunnable);
    }

    public void onPackageChanged(String newPackage) {
        if (newPackage == null) return;
        if (!newPackage.equals(this.currentPackage)) {
            deepScanBuffer.clear();
        }
        this.currentPackage = newPackage;
        mainHandler.post(() -> {
            if (!isEnabled || newPackage.equals("com.android.systemui")) {
                hidePill();
                hideCard();
                return;
            }
            boolean isHome = newPackage.equals(service.getPackageName());
            if (isHome) {
                if (!showOnHome) {
                    hidePill();
                    hideCard();
                } else if (!onlyWhenTyping) {
                    showPill();
                }
            } else {
                if (onlyWhenTyping) {
                    hidePill();
                } else {
                    showPill();
                }
            }
        });
    }

    public void onUserInputActive() {
        mainHandler.post(() -> {
            if (!isEnabled) return;
            boolean isHome = currentPackage.equals(service.getPackageName());
            if (isHome && !showOnHome) return;
            showPill();
        });
    }

    public void setEnabled(boolean enabled) {
        this.isEnabled = enabled;
        SharedPreferences prefs = service.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_ENABLED, enabled).apply();
        mainHandler.post(() -> {
            if (!enabled) {
                hidePill();
                hideCard();
            } else if (!currentPackage.isEmpty() && (!currentPackage.equals(service.getPackageName()) || showOnHome)) {
                showPill();
            }
        });
    }

    public boolean isEnabled() {
        return isEnabled;
    }

    public static void syncConfig(Context context, String backend, String apiKey, String model) {
        syncConfig(context, backend, apiKey, null, null, model, null);
    }

    public static void syncConfig(Context context, String backend, String apiKey, String geminiKey, String groqKey, String model) {
        syncConfig(context, backend, apiKey, geminiKey, groqKey, model, null);
    }

    public static void syncConfig(Context context, String backend, String apiKey, String geminiKey, String groqKey, String model, String groqModel) {
        if (context == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        if (backend != null) editor.putString(KEY_BACKEND, backend);
        if (apiKey != null && !apiKey.isEmpty()) editor.putString(KEY_API_KEY, apiKey);
        if (geminiKey != null && !geminiKey.isEmpty()) editor.putString(KEY_GEMINI_KEY, geminiKey);
        if (groqKey != null && !groqKey.isEmpty()) editor.putString(KEY_GROQ_KEY, groqKey);
        if (model != null && !model.isEmpty()) editor.putString(KEY_MODEL, model);
        if (groqModel != null && !groqModel.isEmpty()) editor.putString(KEY_GROQ_MODEL, groqModel);
        editor.apply();
    }

    private int dpToPx(int dp) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, service.getResources().getDisplayMetrics());
    }

    private int dpToPx(float dp) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, service.getResources().getDisplayMetrics());
    }

    private void createPillView() {
        FrameLayout frame = new FrameLayout(service);
        int size = dpToPx(getPillSizeDp());

        pillBgDrawable = new GradientDrawable();
        pillBgDrawable.setShape(GradientDrawable.OVAL);
        pillBgDrawable.setColor(Color.argb((int) (pillOpacity / 100.0f * 255), 2, 6, 23));
        pillBgDrawable.setStroke(dpToPx(1.5f), Color.parseColor("#00F2FF"));
        frame.setBackground(pillBgDrawable);

        pillIconText = new TextView(service);
        pillIconText.setText("◈");
        pillIconText.setTextColor(Color.parseColor("#00F2FF"));
        pillIconText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        pillIconText.setGravity(Gravity.CENTER);
        FrameLayout.LayoutParams textParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
        frame.addView(pillIconText, textParams);

        pillParams = new WindowManager.LayoutParams(
                size, size,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
        );
        pillParams.gravity = "LEFT".equalsIgnoreCase(edgeSide) ? (Gravity.TOP | Gravity.START) : (Gravity.TOP | Gravity.END);
        pillParams.x = dpToPx(12);
        pillParams.y = dpToPx(240);

        frame.setOnTouchListener(new View.OnTouchListener() {
            private int initialX, initialY;
            private float initialTouchX, initialTouchY;
            private long touchStartTime;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        cancelAutoHide();
                        v.animate().cancel();
                        v.setAlpha(1f);
                        initialX = pillParams.x;
                        initialY = pillParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        touchStartTime = System.currentTimeMillis();
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        int dx = (int) (event.getRawX() - initialTouchX);
                        boolean isLeft = (pillParams.gravity & Gravity.HORIZONTAL_GRAVITY_MASK) == Gravity.START;
                        pillParams.x = isLeft ? (initialX + dx) : (initialX - dx);
                        pillParams.y = initialY + (int) (event.getRawY() - initialTouchY);
                        if (isPillAttached) windowManager.updateViewLayout(pillView, pillParams);
                        return true;

                    case MotionEvent.ACTION_UP:
                        long duration = System.currentTimeMillis() - touchStartTime;
                        float diffX = Math.abs(event.getRawX() - initialTouchX);
                        float diffY = Math.abs(event.getRawY() - initialTouchY);

                        if (duration < 300 && diffX < 20 && diffY < 20) {
                            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
                            toggleCard();
                        } else {
                            if (!"FREE".equalsIgnoreCase(edgeSide)) {
                                pillParams.x = dpToPx(12);
                                if (isPillAttached) windowManager.updateViewLayout(pillView, pillParams);
                            }
                            scheduleAutoHide();
                        }
                        return true;
                }
                return false;
            }
        });

        this.pillView = frame;
    }

    private void createCardView() {
        LinearLayout layout = new LinearLayout(service);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(dpToPx(14), dpToPx(8), dpToPx(14), dpToPx(12));

        cardBgDrawable = new GradientDrawable();
        cardBgDrawable.setShape(GradientDrawable.RECTANGLE);
        cardBgDrawable.setCornerRadius(dpToPx(20));
        int cardOpacity = Math.max(60, Math.min(95, pillOpacity + 28));
        cardBgDrawable.setColor(Color.argb((int) (cardOpacity / 100.0f * 255), 2, 6, 23));
        cardBgDrawable.setStroke(dpToPx(1.5f), Color.parseColor("#5500F2FF"));
        layout.setBackground(cardBgDrawable);

        // Top Drag Handle Bar
        LinearLayout dragHandleContainer = new LinearLayout(service);
        dragHandleContainer.setOrientation(LinearLayout.VERTICAL);
        dragHandleContainer.setGravity(Gravity.CENTER_HORIZONTAL);
        dragHandleContainer.setPadding(0, dpToPx(2), 0, dpToPx(6));

        View dragPill = new View(service);
        GradientDrawable dragPillBg = new GradientDrawable();
        dragPillBg.setShape(GradientDrawable.RECTANGLE);
        dragPillBg.setCornerRadius(dpToPx(3));
        dragPillBg.setColor(Color.parseColor("#5500F2FF"));
        dragPill.setBackground(dragPillBg);
        LinearLayout.LayoutParams dragLp = new LinearLayout.LayoutParams(dpToPx(38), dpToPx(4));
        dragHandleContainer.addView(dragPill, dragLp);
        layout.addView(dragHandleContainer);

        // Header Row (Draggable)
        LinearLayout header = new LinearLayout(service);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        cardTitle = new TextView(service);
        cardTitle.setText("◈ IRIS COPILOT");
        cardTitle.setTextColor(Color.parseColor("#00F2FF"));
        cardTitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f);
        cardTitle.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        header.addView(cardTitle, titleLp);

        // Mode Badge Pill (Tap to cycle AUTO -> INTERVIEW -> STUDENT)
        modeBadgeView = new TextView(service);
        modeBadgeView.setText("⚡ AUTO");
        modeBadgeView.setTextColor(Color.BLACK);
        modeBadgeView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 7.5f);
        modeBadgeView.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
        modeBadgeView.setPadding(dpToPx(7), dpToPx(2.5f), dpToPx(7), dpToPx(2.5f));
        GradientDrawable modeBg = new GradientDrawable();
        modeBg.setShape(GradientDrawable.RECTANGLE);
        modeBg.setCornerRadius(dpToPx(6));
        modeBg.setColor(Color.parseColor("#00F2FF"));
        modeBadgeView.setBackground(modeBg);
        modeBadgeView.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            cyclePersonaMode();
        });
        header.addView(modeBadgeView);

        // Refresh / Rescan button
        TextView refreshBtn = new TextView(service);
        refreshBtn.setText("🔄");
        refreshBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12.5f);
        refreshBtn.setPadding(dpToPx(7), dpToPx(4), dpToPx(5), dpToPx(4));
        refreshBtn.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            deepScanBuffer.clear();
            refreshContext();
            Toast.makeText(service, "Screen context resynced", Toast.LENGTH_SHORT).show();
        });
        header.addView(refreshBtn);

        // Close button
        TextView closeBtn = new TextView(service);
        closeBtn.setText("✕");
        closeBtn.setTextColor(Color.parseColor("#88FFFFFF"));
        closeBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15.5f);
        closeBtn.setPadding(dpToPx(5), dpToPx(4), dpToPx(4), dpToPx(4));
        closeBtn.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            hideCard();
        });
        header.addView(closeBtn);
        layout.addView(header);

        // Attach Drag Listener
        View.OnTouchListener cardDragListener = new View.OnTouchListener() {
            private int initialX, initialY;
            private float initialTouchX, initialTouchY;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                if (cardParams == null) return false;
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = cardParams.x;
                        initialY = cardParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        cardParams.x = initialX + (int) (event.getRawX() - initialTouchX);
                        cardParams.y = initialY + (int) (event.getRawY() - initialTouchY);
                        if (isCardAttached && cardView != null) {
                            windowManager.updateViewLayout(cardView, cardParams);
                        }
                        return true;
                }
                return false;
            }
        };
        dragHandleContainer.setOnTouchListener(cardDragListener);
        cardTitle.setOnTouchListener(cardDragListener);

        // Context Subheader
        cardSubTitle = new TextView(service);
        cardSubTitle.setText("Analyzing active screen...");
        cardSubTitle.setTextColor(Color.parseColor("#88FFFFFF"));
        cardSubTitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 8.5f);
        cardSubTitle.setTypeface(android.graphics.Typeface.MONOSPACE);
        cardSubTitle.setPadding(0, dpToPx(2), 0, dpToPx(6));
        cardSubTitle.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            if (contextPreviewView != null) {
                boolean show = contextPreviewView.getVisibility() != View.VISIBLE;
                contextPreviewView.setVisibility(show ? View.VISIBLE : View.GONE);
            }
        });
        layout.addView(cardSubTitle);

        // Collapsible Live Context Preview Box
        contextPreviewView = new TextView(service);
        contextPreviewView.setTextColor(Color.parseColor("#BB00F2FF"));
        contextPreviewView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 8.5f);
        contextPreviewView.setTypeface(android.graphics.Typeface.MONOSPACE);
        contextPreviewView.setPadding(dpToPx(8), dpToPx(6), dpToPx(8), dpToPx(6));
        contextPreviewView.setMaxLines(6);
        GradientDrawable previewBg = new GradientDrawable();
        previewBg.setShape(GradientDrawable.RECTANGLE);
        previewBg.setCornerRadius(dpToPx(8));
        previewBg.setColor(Color.parseColor("#1800F2FF"));
        previewBg.setStroke(dpToPx(1), Color.parseColor("#3300F2FF"));
        contextPreviewView.setBackground(previewBg);
        contextPreviewView.setVisibility(View.GONE);
        LinearLayout.LayoutParams prevLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        prevLp.setMargins(0, 0, 0, dpToPx(6));
        layout.addView(contextPreviewView, prevLp);

        // Smart Detected Entities + Clipboard Bar (Shown only when OTP/URL/Clipboard exists)
        entitiesScroll = new HorizontalScrollView(service);
        entitiesScroll.setHorizontalScrollBarEnabled(false);
        entitiesScroll.setVisibility(View.GONE);
        entitiesBar = new LinearLayout(service);
        entitiesBar.setOrientation(LinearLayout.HORIZONTAL);
        entitiesBar.setPadding(0, 0, 0, dpToPx(6));
        entitiesScroll.addView(entitiesBar);
        layout.addView(entitiesScroll);

        // Clean "Rule of 3" Top Action Bar (2 Primary Context Buttons + ➕ MORE ▾)
        quickActionsBar = new LinearLayout(service);
        quickActionsBar.setOrientation(LinearLayout.HORIZONTAL);
        quickActionsBar.setGravity(Gravity.CENTER_VERTICAL);
        layout.addView(quickActionsBar);

        // Expandable "➕ MORE TOOLS" 2-Column Drawer (Hidden until tapped)
        moreToolsGrid = new LinearLayout(service);
        moreToolsGrid.setOrientation(LinearLayout.VERTICAL);
        moreToolsGrid.setPadding(0, dpToPx(6), 0, dpToPx(2));
        moreToolsGrid.setVisibility(View.GONE);
        buildMoreToolsGrid();
        layout.addView(moreToolsGrid);

        // Single-Row Quick Filter Strip (Shown only when results are displayed)
        replyFilterScroll = new HorizontalScrollView(service);
        replyFilterScroll.setHorizontalScrollBarEnabled(false);
        replyFilterScroll.setPadding(0, dpToPx(6), 0, 0);
        replyFilterScroll.setVisibility(View.GONE);

        replyFilterRow = new LinearLayout(service);
        replyFilterRow.setOrientation(LinearLayout.HORIZONTAL);
        String[][] filters = new String[][]{
                {"AUTO", "✨ 3-Mix"},
                {"YES", "👍 Yes"},
                {"NO", "✋ No"},
                {"LATER", "⏳ Later"},
                {"POLITE", "👔 Polite"},
                {"CASUAL", "😎 Casual"},
                {"SHORT", "⚡ Short"},
                {"DETAILED", "📝 Detailed"}
        };
        replyFilterChipViews.clear();
        for (String[] f : filters) {
            final String fKey = f[0];
            TextView chip = new TextView(service);
            chip.setText(f[1]);
            chip.setTag(fKey);
            chip.setTextSize(TypedValue.COMPLEX_UNIT_SP, 8f);
            chip.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
            chip.setPadding(dpToPx(8), dpToPx(3.5f), dpToPx(8), dpToPx(3.5f));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, dpToPx(5), 0);
            chip.setLayoutParams(lp);
            chip.setOnClickListener(v -> {
                v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
                replyFilter = fKey;
                refreshReplyFilterChips();
                executeAction(lastActiveAction);
            });
            replyFilterChipViews.add(chip);
            replyFilterRow.addView(chip);
        }
        refreshReplyFilterChips();
        replyFilterScroll.addView(replyFilterRow);
        layout.addView(replyFilterScroll);

        // Loading Indicator
        loadingIndicator = new TextView(service);
        ((TextView) loadingIndicator).setText("◈ Computing neural response...");
        ((TextView) loadingIndicator).setTextColor(Color.parseColor("#00F2FF"));
        ((TextView) loadingIndicator).setTextSize(TypedValue.COMPLEX_UNIT_SP, 9.5f);
        ((TextView) loadingIndicator).setTypeface(android.graphics.Typeface.MONOSPACE);
        loadingIndicator.setPadding(0, dpToPx(8), 0, dpToPx(4));
        loadingIndicator.setVisibility(View.GONE);
        layout.addView(loadingIndicator);

        // Results Container (capped at max 260dp height so card scrolls cleanly without overflowing screen)
        ScrollView resultsScroll = new ScrollView(service) {
            @Override
            protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
                int maxHeightPx = dpToPx(260);
                int cappedHeightSpec = MeasureSpec.makeMeasureSpec(maxHeightPx, MeasureSpec.AT_MOST);
                super.onMeasure(widthMeasureSpec, cappedHeightSpec);
            }
        };
        resultsScroll.setVerticalScrollBarEnabled(true);
        resultsContainer = new LinearLayout(service);
        resultsContainer.setOrientation(LinearLayout.VERTICAL);
        resultsContainer.setPadding(0, dpToPx(6), 0, 0);
        resultsScroll.addView(resultsContainer);

        LinearLayout.LayoutParams scrollLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        layout.addView(resultsScroll, scrollLp);

        // Unified Bottom Input Bar: [ Write a message or ask anything... ] [🎙️] [📸] [➤]
        LinearLayout inputBar = new LinearLayout(service);
        inputBar.setOrientation(LinearLayout.HORIZONTAL);
        inputBar.setGravity(Gravity.CENTER_VERTICAL);
        inputBar.setPadding(dpToPx(8), dpToPx(4), dpToPx(6), dpToPx(4));
        GradientDrawable inputBg = new GradientDrawable();
        inputBg.setShape(GradientDrawable.RECTANGLE);
        inputBg.setCornerRadius(dpToPx(14));
        inputBg.setColor(Color.parseColor("#1AFFFFFF"));
        inputBg.setStroke(dpToPx(1), Color.parseColor("#3300F2FF"));
        inputBar.setBackground(inputBg);
        LinearLayout.LayoutParams inputBarLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        inputBarLp.setMargins(0, dpToPx(8), 0, 0);

        customQuestionInput = new EditText(service);
        customQuestionInput.setHint("Write message or ask AI...");
        customQuestionInput.setHintTextColor(Color.parseColor("#66FFFFFF"));
        customQuestionInput.setTextColor(Color.WHITE);
        customQuestionInput.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f);
        customQuestionInput.setBackgroundColor(Color.TRANSPARENT);
        customQuestionInput.setPadding(dpToPx(4), dpToPx(5), dpToPx(4), dpToPx(5));
        customQuestionInput.setSingleLine(true);
        customQuestionInput.setOnTouchListener((v, event) -> {
            if (event.getAction() == MotionEvent.ACTION_DOWN) {
                enableKeyboardFocus();
            }
            return false;
        });
        LinearLayout.LayoutParams editLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        inputBar.addView(customQuestionInput, editLp);

        // 🎙️ Voice Input Button
        voiceMicBtn = new TextView(service);
        voiceMicBtn.setText("🎙️");
        voiceMicBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.5f);
        voiceMicBtn.setPadding(dpToPx(6), dpToPx(4), dpToPx(6), dpToPx(4));
        voiceMicBtn.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            interviewListenTrigger = false;
            toggleVoiceComposeRecognition();
        });
        inputBar.addView(voiceMicBtn);

        // 📸 Vision Screenshot Scan Button
        TextView visionBtn = new TextView(service);
        visionBtn.setText("📸");
        visionBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.5f);
        visionBtn.setPadding(dpToPx(6), dpToPx(4), dpToPx(6), dpToPx(4));
        visionBtn.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            String effMode = !"AUTO".equalsIgnoreCase(personaMode) ? personaMode.toUpperCase() : currentScreenMode;
            performVisionScan(effMode);
        });
        inputBar.addView(visionBtn);

        // ➤ Smart Submit Button (Auto-detects Compose vs Ask)
        TextView sendPromptBtn = new TextView(service);
        sendPromptBtn.setText("➤");
        sendPromptBtn.setTextColor(Color.BLACK);
        sendPromptBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f);
        sendPromptBtn.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
        sendPromptBtn.setPadding(dpToPx(10), dpToPx(5), dpToPx(10), dpToPx(5));
        GradientDrawable sendBtnBg = new GradientDrawable();
        sendBtnBg.setShape(GradientDrawable.RECTANGLE);
        sendBtnBg.setCornerRadius(dpToPx(10));
        sendBtnBg.setColor(Color.parseColor("#00F2FF"));
        sendPromptBtn.setBackground(sendBtnBg);
        sendPromptBtn.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            submitUnifiedInput();
        });
        inputBar.addView(sendPromptBtn);

        layout.addView(inputBar, inputBarLp);

        DisplayMetrics dm = service.getResources().getDisplayMetrics();
        int width = Math.min(dpToPx(352), dm.widthPixels - dpToPx(20));

        cardParams = new WindowManager.LayoutParams(
                width,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                        | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH
                        | WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
        );
        cardParams.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE | WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN;
        cardParams.gravity = Gravity.CENTER;
        cardParams.x = 0;
        cardParams.y = 0;

        layout.setOnTouchListener((v, event) -> {
            if (event.getAction() == MotionEvent.ACTION_OUTSIDE) {
                hideCard();
                return true;
            }
            return false;
        });

        this.cardView = layout;
        rebuildActionPillsForMode("GENERAL");
    }

    private void buildMoreToolsGrid() {
        if (moreToolsGrid == null) return;
        moreToolsGrid.removeAllViews();

        String[][][] rows = new String[][][]{
                {{"🌐 Translate", "TRANSLATE"}, {"📌 Extract Data", "EXTRACT"}},
                {{"🔎 Fact Check", "FACT_CHECK"}, {"📜 Deep Scan", "DEEP_SCAN"}},
                {{"🧠 Solve / MCQ", "STUDENT_SOLVE"}, {"🃏 Flashcards", "STUDENT_FLASHCARDS"}},
                {{"💡 Simplify (ELI5)", "STUDENT_ELI5"}, {"⭐ STAR Story", "INTERVIEW_STAR"}},
                {{"💻 Code Solve", "INTERVIEW_CODE"}, {"✨ Polish Draft", "REWRITE"}}
        };

        for (String[][] rowDef : rows) {
            LinearLayout row = new LinearLayout(service);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setPadding(0, 0, 0, dpToPx(4));
            for (String[] item : rowDef) {
                final String label = item[0];
                final String act = item[1];
                TextView btn = new TextView(service);
                btn.setText(label);
                btn.setTextColor(Color.parseColor("#DDF2FF"));
                btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 8.5f);
                btn.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
                btn.setGravity(Gravity.CENTER);
                btn.setPadding(dpToPx(8), dpToPx(6), dpToPx(8), dpToPx(6));

                GradientDrawable bg = new GradientDrawable();
                bg.setShape(GradientDrawable.RECTANGLE);
                bg.setCornerRadius(dpToPx(10));
                bg.setColor(Color.parseColor("#16FFFFFF"));
                bg.setStroke(dpToPx(1), Color.parseColor("#2800F2FF"));
                btn.setBackground(bg);

                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
                lp.setMargins(dpToPx(2), 0, dpToPx(2), 0);
                btn.setLayoutParams(lp);
                btn.setOnClickListener(v -> {
                    v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
                    moreToolsGrid.setVisibility(View.GONE);
                    if ("DEEP_SCAN".equals(act)) {
                        performDeepScan();
                    } else {
                        executeAction(act);
                    }
                });
                row.addView(btn);
            }
            moreToolsGrid.addView(row);
        }
    }

    private void submitUnifiedInput() {
        if (customQuestionInput == null) return;
        String q = customQuestionInput.getText().toString().trim();
        if (q.isEmpty()) return;
        customQuestionInput.setText("");
        hideSoftKeyboard();
        restoreNotFocusable();

        if (COMPOSE_INTENT_PATTERN.matcher(q).find()) {
            executeAction("COMPOSE:AUTO:" + q);
        } else {
            executeAction("ASK:" + q);
        }
    }

    private void enableKeyboardFocus() {
        if (cardParams == null || customQuestionInput == null) return;
        cardParams.flags &= ~WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
        if (isCardAttached && cardView != null) {
            try { windowManager.updateViewLayout(cardView, cardParams); } catch (Exception ignored) {}
        }
        customQuestionInput.requestFocus();
        if (autoKeyboard) {
            mainHandler.postDelayed(() -> {
                InputMethodManager imm = (InputMethodManager) service.getSystemService(Context.INPUT_METHOD_SERVICE);
                if (imm != null) {
                    imm.showSoftInput(customQuestionInput, InputMethodManager.SHOW_IMPLICIT);
                }
            }, 80);
        }
    }

    private void cyclePersonaMode() {
        if ("AUTO".equalsIgnoreCase(personaMode)) {
            personaMode = "INTERVIEW";
        } else if ("INTERVIEW".equalsIgnoreCase(personaMode)) {
            personaMode = "STUDENT";
        } else {
            personaMode = "AUTO";
        }
        SharedPreferences prefs = service.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_PERSONA_MODE, personaMode).apply();

        if ("INTERVIEW".equalsIgnoreCase(personaMode) && cardParams != null) {
            cardParams.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
            cardParams.x = 0;
            cardParams.y = dpToPx(28);
            if (isCardAttached && cardView != null) {
                try { windowManager.updateViewLayout(cardView, cardParams); } catch (Exception ignored) {}
            }
            Toast.makeText(service, "🎯 INTERVIEW WINGMAN (Camera Teleprompter)", Toast.LENGTH_SHORT).show();
        } else if ("STUDENT".equalsIgnoreCase(personaMode)) {
            Toast.makeText(service, "🎓 STUDENT STUDY & SOLVER MODE", Toast.LENGTH_SHORT).show();
        } else {
            Toast.makeText(service, "⚡ AUTO SMART MODE", Toast.LENGTH_SHORT).show();
        }
        updateModeBadgeAndActions();
    }

    private void updateModeBadgeAndActions() {
        String effectiveMode = !"AUTO".equalsIgnoreCase(personaMode) ? personaMode.toUpperCase() : currentScreenMode;
        if (modeBadgeView != null) {
            GradientDrawable modeBg = new GradientDrawable();
            modeBg.setShape(GradientDrawable.RECTANGLE);
            modeBg.setCornerRadius(dpToPx(6));
            if ("INTERVIEW".equals(effectiveMode)) {
                modeBadgeView.setText("🎯 INTERVIEW");
                modeBg.setColor(Color.parseColor("#10B981"));
            } else if ("STUDENT".equals(effectiveMode)) {
                modeBadgeView.setText("🎓 STUDENT");
                modeBg.setColor(Color.parseColor("#F59E0B"));
            } else {
                modeBadgeView.setText("⚡ " + effectiveMode);
                modeBg.setColor(Color.parseColor("#00F2FF"));
            }
            modeBadgeView.setBackground(modeBg);
        }
        rebuildActionPillsForMode(effectiveMode);
    }

    private void rebuildActionPillsForMode(String mode) {
        if (quickActionsBar == null) return;
        quickActionsBar.removeAllViews();

        if ("INTERVIEW".equals(mode)) {
            quickActionsBar.addView(createActionPill("🎙️ LISTEN Q", true, v -> startInterviewVoiceCatcher()));
            quickActionsBar.addView(createActionPill("🎯 TELEPROMPTER", true, v -> executeAction("INTERVIEW_ANSWER")));
        } else if ("STUDENT".equals(mode)) {
            quickActionsBar.addView(createActionPill("🧠 SOLVE / MCQ", true, v -> executeAction("STUDENT_SOLVE")));
            quickActionsBar.addView(createActionPill("🃏 FLASHCARDS", false, v -> executeAction("STUDENT_FLASHCARDS")));
        } else if ("BROWSER".equals(mode)) {
            quickActionsBar.addView(createActionPill("📝 SUMMARIZE", true, v -> executeAction("SUMMARIZE")));
            quickActionsBar.addView(createActionPill("🧠 SOLVE / EXPLAIN", false, v -> executeAction("STUDENT_SOLVE")));
        } else {
            // CHAT / EMAIL / GENERAL
            quickActionsBar.addView(createActionPill("⚡ SMART REPLY", true, v -> executeAction("REPLY")));
            if (hasActiveDraft) {
                quickActionsBar.addView(createActionPill("✨ POLISH DRAFT", false, v -> executeAction("REWRITE")));
            } else {
                quickActionsBar.addView(createActionPill("🌐 TRANSLATE", false, v -> executeAction("TRANSLATE")));
            }
        }

        // 3rd Button is always the clean ➕ MORE ▾ toggle
        quickActionsBar.addView(createActionPill("➕ MORE ▾", false, v -> {
            if (moreToolsGrid != null) {
                boolean show = moreToolsGrid.getVisibility() != View.VISIBLE;
                moreToolsGrid.setVisibility(show ? View.VISIBLE : View.GONE);
            }
        }));
    }

    private View createActionPill(String title, boolean primary, View.OnClickListener onClick) {
        TextView tv = new TextView(service);
        tv.setText(title);
        tv.setTextColor(primary ? Color.BLACK : Color.parseColor("#DDF2FF"));
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9f);
        tv.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
        tv.setGravity(Gravity.CENTER);
        tv.setPadding(dpToPx(8), dpToPx(6.5f), dpToPx(8), dpToPx(6.5f));

        GradientDrawable pillBg = new GradientDrawable();
        pillBg.setShape(GradientDrawable.RECTANGLE);
        pillBg.setCornerRadius(dpToPx(11));
        pillBg.setColor(Color.parseColor(primary ? "#00F2FF" : "#1800F2FF"));
        pillBg.setStroke(dpToPx(1), Color.parseColor(primary ? "#00F2FF" : "#4400F2FF"));
        tv.setBackground(pillBg);

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        lp.setMargins(dpToPx(2), 0, dpToPx(2), 0);
        tv.setLayoutParams(lp);
        tv.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            onClick.onClick(v);
        });
        return tv;
    }

    private void refreshReplyFilterChips() {
        for (TextView chip : replyFilterChipViews) {
            boolean active = replyFilter.equals(chip.getTag());
            GradientDrawable chipBg = new GradientDrawable();
            chipBg.setShape(GradientDrawable.RECTANGLE);
            chipBg.setCornerRadius(dpToPx(8));
            chipBg.setColor(active ? Color.parseColor("#3300F2FF") : Color.parseColor("#11FFFFFF"));
            chipBg.setStroke(dpToPx(1), active ? Color.parseColor("#00F2FF") : Color.parseColor("#33FFFFFF"));
            chip.setBackground(chipBg);
            chip.setTextColor(active ? Color.parseColor("#00F2FF") : Color.parseColor("#99FFFFFF"));
        }
    }

    private void startInterviewVoiceCatcher() {
        interviewListenTrigger = true;
        toggleVoiceComposeRecognition();
    }

    private void toggleVoiceComposeRecognition() {
        try {
            if (isVoiceListening && speechRecognizer != null) {
                speechRecognizer.stopListening();
                isVoiceListening = false;
                if (voiceMicBtn != null) voiceMicBtn.setText("🎙️");
                return;
            }
            if (!SpeechRecognizer.isRecognitionAvailable(service)) {
                Toast.makeText(service, "Voice recognition not available on this device", Toast.LENGTH_SHORT).show();
                return;
            }
            if (speechRecognizer == null) {
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(service);
                speechRecognizer.setRecognitionListener(new RecognitionListener() {
                    @Override public void onReadyForSpeech(Bundle params) {}
                    @Override public void onBeginningOfSpeech() {}
                    @Override public void onRmsChanged(float rmsdB) {}
                    @Override public void onBufferReceived(byte[] buffer) {}
                    @Override public void onEndOfSpeech() {
                        isVoiceListening = false;
                        if (voiceMicBtn != null) voiceMicBtn.setText("🎙️");
                    }
                    @Override public void onError(int error) {
                        isVoiceListening = false;
                        interviewListenTrigger = false;
                        if (voiceMicBtn != null) voiceMicBtn.setText("🎙️");
                    }
                    @Override
                    public void onResults(Bundle results) {
                        isVoiceListening = false;
                        if (voiceMicBtn != null) voiceMicBtn.setText("🎙️");
                        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if (matches != null && !matches.isEmpty()) {
                            String spoken = matches.get(0).trim();
                            if (!spoken.isEmpty()) {
                                if (interviewListenTrigger) {
                                    interviewListenTrigger = false;
                                    executeAction("INTERVIEW_LISTEN:" + spoken);
                                } else {
                                    hideSoftKeyboard();
                                    restoreNotFocusable();
                                    if (COMPOSE_INTENT_PATTERN.matcher(spoken).find()) {
                                        executeAction("COMPOSE:AUTO:" + spoken);
                                    } else {
                                        executeAction("ASK:" + spoken);
                                    }
                                }
                            }
                        }
                    }
                    @Override public void onPartialResults(Bundle partialResults) {}
                    @Override public void onEvent(int eventType, Bundle params) {}
                });
            }
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            isVoiceListening = true;
            if (voiceMicBtn != null) voiceMicBtn.setText("🔴");
            Toast.makeText(service, interviewListenTrigger ? "🎙️ Listening to Interviewer's Question..." : "🎙️ Speak message to compose or question...", Toast.LENGTH_SHORT).show();
            speechRecognizer.startListening(intent);
        } catch (Exception e) {
            isVoiceListening = false;
            interviewListenTrigger = false;
            if (voiceMicBtn != null) voiceMicBtn.setText("🎙️");
            Toast.makeText(service, "Voice input unavailable", Toast.LENGTH_SHORT).show();
        }
    }

    private void hideSoftKeyboard() {
        if (customQuestionInput != null) {
            InputMethodManager imm = (InputMethodManager) service.getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm != null) {
                imm.hideSoftInputFromWindow(customQuestionInput.getWindowToken(), 0);
            }
        }
    }

    private void restoreNotFocusable() {
        if (cardParams != null && (cardParams.flags & WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE) == 0) {
            cardParams.flags |= WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
            if (isCardAttached && cardView != null) {
                windowManager.updateViewLayout(cardView, cardParams);
            }
        }
    }

    public void showPill() {
        cancelAutoHide();
        if (pillView != null) {
            pillView.animate().cancel();
            pillView.setAlpha(1f);
        }
        if (!isPillAttached && pillView != null) {
            try {
                pillView.setAlpha(0f);
                windowManager.addView(pillView, pillParams);
                isPillAttached = true;
                pillView.animate().alpha(1f).setDuration(180).start();
            } catch (Exception e) {
                Log.e(TAG, "Error adding pill view", e);
            }
        }
        scheduleAutoHide();
    }

    public void hidePill() {
        cancelAutoHide();
        if (isPillAttached && pillView != null) {
            try {
                pillView.animate().cancel();
                windowManager.removeView(pillView);
                isPillAttached = false;
            } catch (Exception e) {
                Log.e(TAG, "Error removing pill view", e);
            }
        }
    }

    public void toggleCard() {
        if (isCardAttached) {
            hideCard();
        } else {
            showCard();
        }
    }

    public void showCard() {
        cancelAutoHide();
        if (!isCardAttached && cardView != null) {
            try {
                refreshContext();
                cardParams.flags |= WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
                windowManager.addView(cardView, cardParams);
                isCardAttached = true;
            } catch (Exception e) {
                Log.e(TAG, "Error adding card view", e);
            }
        }
    }

    public void hideCard() {
        hideSoftKeyboard();
        restoreNotFocusable();
        if (moreToolsGrid != null) moreToolsGrid.setVisibility(View.GONE);
        if (replyFilterScroll != null) replyFilterScroll.setVisibility(View.GONE);
        if (contextPreviewView != null) contextPreviewView.setVisibility(View.GONE);
        if (isCardAttached && cardView != null) {
            try {
                windowManager.removeView(cardView);
                isCardAttached = false;
            } catch (Exception e) {
                Log.e(TAG, "Error removing card view", e);
            }
        }
        scheduleAutoHide();
    }

    private void cleanup() {
        hideCard();
        hidePill();
        if (speechRecognizer != null) {
            try { speechRecognizer.destroy(); } catch (Exception ignored) {}
            speechRecognizer = null;
        }
        executor.shutdownNow();
    }

    private static class SpatialNode implements Comparable<SpatialNode> {
        final String text;
        final Rect bounds;

        SpatialNode(String text, Rect bounds) {
            this.text = text;
            this.bounds = bounds;
        }

        @Override
        public int compareTo(SpatialNode other) {
            int dy = this.bounds.top - other.bounds.top;
            if (Math.abs(dy) > 18) return dy;
            return this.bounds.left - other.bounds.left;
        }
    }

    public static class ScreenContextData {
        public String packageName = "";
        public String appName = "";
        public String screenMode = "GENERAL";
        public List<String> texts = new ArrayList<>();
        public String currentDraft = "";
        public String selectedText = "";
        public AccessibilityNodeInfo inputNode = null;
        public AccessibilityNodeInfo sendNode = null;
        public AccessibilityNodeInfo scrollableNode = null;
        public boolean hasInput = false;
        public Map<String, String> entities = new LinkedHashMap<>();
    }

    private String detectScreenMode(String pkg) {
        if (pkg == null) return "GENERAL";
        String lower = pkg.toLowerCase();
        if (lower.contains("whatsapp") || lower.contains("telegram") || lower.contains("messaging")
                || lower.contains("instagram") || lower.contains("orca") || lower.contains("discord")
                || lower.contains("signal") || lower.contains("snapchat") || lower.contains("viber")
                || lower.contains("line") || lower.contains("wechat") || lower.contains("mms")) {
            return "CHAT";
        }
        if (lower.contains("chrome") || lower.contains("brave") || lower.contains("firefox")
                || lower.contains("browser") || lower.contains("sbrowser") || lower.contains("opera")
                || lower.contains("reddit") || lower.contains("twitter") || lower.contains("edgemobile")) {
            return "BROWSER";
        }
        if (lower.contains("gm") || lower.contains("mail") || lower.contains("outlook")
                || lower.contains("slack") || lower.contains("teams") || lower.contains("docs")
                || lower.contains("notion") || lower.contains("keep")) {
            return "EMAIL";
        }
        return "GENERAL";
    }

    public ScreenContextData extractScreenContext() {
        ScreenContextData data = new ScreenContextData();
        AccessibilityNodeInfo root = service.getRootInActiveWindow();
        if (root == null) return data;

        data.packageName = root.getPackageName() != null ? root.getPackageName().toString() : currentPackage;
        data.appName = resolveAppLabel(data.packageName);
        data.screenMode = detectScreenMode(data.packageName);

        List<SpatialNode> spatialNodes = new ArrayList<>();
        List<AccessibilityNodeInfo> focusedHolder = new ArrayList<>();
        List<AccessibilityNodeInfo> editableHolder = new ArrayList<>();
        List<AccessibilityNodeInfo> sendHolder = new ArrayList<>();
        List<AccessibilityNodeInfo> scrollHolder = new ArrayList<>();
        List<String> selectedHolder = new ArrayList<>();

        traverseTree(root, spatialNodes, focusedHolder, editableHolder, sendHolder, scrollHolder, selectedHolder);

        if (!focusedHolder.isEmpty()) {
            data.inputNode = focusedHolder.get(0);
            data.hasInput = true;
        } else if (!editableHolder.isEmpty()) {
            data.inputNode = editableHolder.get(0);
            data.hasInput = true;
        }

        if (!sendHolder.isEmpty()) {
            data.sendNode = sendHolder.get(0);
        }
        if (!scrollHolder.isEmpty()) {
            data.scrollableNode = scrollHolder.get(0);
        }

        if (!selectedHolder.isEmpty()) {
            data.selectedText = selectedHolder.get(0);
        }

        if (data.inputNode != null) {
            CharSequence cs = data.inputNode.getText();
            data.currentDraft = cs != null ? cs.toString().trim() : "";
        }

        Collections.sort(spatialNodes);
        DisplayMetrics dm = service.getResources().getDisplayMetrics();
        int screenW = dm.widthPixels > 0 ? dm.widthPixels : 1080;
        boolean isChat = "CHAT".equals(data.screenMode);

        StringBuilder fullRawForEntities = new StringBuilder();
        for (SpatialNode sn : spatialNodes) {
            String rawText = sn.text;
            if (!data.currentDraft.isEmpty() && rawText.equals(data.currentDraft)) {
                continue;
            }
            fullRawForEntities.append(rawText).append(" ");

            if (isChat) {
                if (sn.bounds.top < dpToPx(96)) {
                    data.texts.add("[HEADER] " + rawText);
                } else if (sn.bounds.left > screenW * 0.24f && sn.bounds.right > screenW * 0.76f) {
                    data.texts.add("[YOU] " + rawText);
                } else if (sn.bounds.left < screenW * 0.26f && sn.bounds.right < screenW * 0.88f) {
                    data.texts.add("[THEM] " + rawText);
                } else {
                    data.texts.add(rawText);
                }
            } else {
                data.texts.add(rawText);
            }
        }

        extractEntities(fullRawForEntities.toString(), data.entities);
        return data;
    }

    private void performDeepScan() {
        ScreenContextData firstPass = extractScreenContext();
        deepScanBuffer.addAll(firstPass.texts);

        if (firstPass.scrollableNode != null) {
            Toast.makeText(service, "📜 Deep scanning multi-screen content...", Toast.LENGTH_SHORT).show();
            firstPass.scrollableNode.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD);
            mainHandler.postDelayed(() -> {
                ScreenContextData secondPass = extractScreenContext();
                deepScanBuffer.addAll(secondPass.texts);
                refreshContext();
                Toast.makeText(service, "📜 Stitched " + deepScanBuffer.size() + " screen nodes!", Toast.LENGTH_SHORT).show();
            }, 550);
        } else {
            refreshContext();
            Toast.makeText(service, "📜 Buffered " + deepScanBuffer.size() + " screen nodes", Toast.LENGTH_SHORT).show();
        }
    }

    private void extractEntities(String corpus, Map<String, String> out) {
        if (clipboardTrigger && !latestExternalClipboard.isEmpty()) {
            String preview = latestExternalClipboard.length() > 22
                    ? latestExternalClipboard.substring(0, 22) + "…"
                    : latestExternalClipboard;
            out.put("📋 CLIP: " + preview, "__CLIPBOARD__:" + latestExternalClipboard);
        }
        if (corpus == null || corpus.isEmpty()) return;

        Matcher otpM = OTP_PATTERN.matcher(corpus);
        if (otpM.find()) {
            String code = otpM.group(1) != null ? otpM.group(1) : otpM.group(2);
            if (code != null) out.put("🔑 OTP: " + code, code);
        }

        Matcher urlM = URL_PATTERN.matcher(corpus);
        while (urlM.find() && out.size() < 5) {
            String url = urlM.group();
            String shortUrl = url.length() > 22 ? url.substring(0, 22) + "…" : url;
            out.put("🔗 " + shortUrl, url);
        }

        Matcher emailM = EMAIL_PATTERN.matcher(corpus);
        while (emailM.find() && out.size() < 5) {
            String email = emailM.group();
            out.put("📧 " + email, email);
        }
    }

    private void traverseTree(
            AccessibilityNodeInfo node,
            List<SpatialNode> spatialNodes,
            List<AccessibilityNodeInfo> focusedHolder,
            List<AccessibilityNodeInfo> editableHolder,
            List<AccessibilityNodeInfo> sendHolder,
            List<AccessibilityNodeInfo> scrollHolder,
            List<String> selectedHolder
    ) {
        if (node == null || !node.isVisibleToUser()) return;
        if (node.isPassword()) return;

        Rect bounds = new Rect();
        node.getBoundsInScreen(bounds);
        if (bounds.width() <= 0 || bounds.height() <= 0) return;

        if (node.isEditable()) {
            if (node.isFocused() && focusedHolder.isEmpty()) {
                focusedHolder.add(node);
            } else if (editableHolder.isEmpty()) {
                editableHolder.add(node);
            }
        }

        if (node.isScrollable() && scrollHolder.isEmpty() && bounds.height() > dpToPx(180)) {
            scrollHolder.add(node);
        }

        if (node.isClickable() && sendHolder.isEmpty()) {
            CharSequence cd = node.getContentDescription();
            String viewId = node.getViewIdResourceName();
            String cdStr = cd != null ? cd.toString().trim().toLowerCase() : "";
            String idStr = viewId != null ? viewId.toLowerCase() : "";
            if (cdStr.equals("send") || cdStr.equals("send message") || idStr.endsWith("/send") || idStr.endsWith("send_button") || idStr.endsWith("btn_send")) {
                sendHolder.add(node);
            }
        }

        CharSequence text = node.getText();
        if (text != null && text.length() > 0) {
            String s = text.toString().trim();
            int selStart = node.getTextSelectionStart();
            int selEnd = node.getTextSelectionEnd();
            if (selStart >= 0 && selEnd > selStart && selEnd <= s.length() && selectedHolder.isEmpty()) {
                selectedHolder.add(s.substring(selStart, selEnd).trim());
            }
            if (!s.isEmpty() && s.length() > 1 && !containsSpatialText(spatialNodes, s)) {
                spatialNodes.add(new SpatialNode(s, bounds));
            }
        } else {
            CharSequence desc = node.getContentDescription();
            if (desc != null && desc.length() > 0) {
                String s = desc.toString().trim();
                if (!s.isEmpty() && s.length() > 2 && !s.equalsIgnoreCase("send") && !containsSpatialText(spatialNodes, s)) {
                    spatialNodes.add(new SpatialNode(s, bounds));
                }
            }
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            traverseTree(node.getChild(i), spatialNodes, focusedHolder, editableHolder, sendHolder, scrollHolder, selectedHolder);
        }
    }

    private boolean containsSpatialText(List<SpatialNode> list, String text) {
        for (SpatialNode sn : list) {
            if (sn.text.equals(text)) return true;
        }
        return false;
    }

    private void refreshContext() {
        ScreenContextData data = extractScreenContext();
        this.lastTargetInputNode = data.inputNode;
        this.lastSendButtonNode = data.sendNode;
        this.currentAppLabel = data.appName;
        this.hasActiveDraft = data.hasInput && !data.currentDraft.isEmpty();

        this.currentScreenMode = data.screenMode;
        String appLabel = data.appName.toUpperCase();
        cardTitle.setText("◈ IRIS // " + appLabel);
        updateModeBadgeAndActions();

        List<String> combinedTexts = new ArrayList<>();
        if (!deepScanBuffer.isEmpty()) {
            combinedTexts.addAll(deepScanBuffer);
            for (String t : data.texts) {
                if (!combinedTexts.contains(t)) combinedTexts.add(t);
            }
        } else {
            combinedTexts.addAll(data.texts);
        }

        int textCount = combinedTexts.size();
        String sub = (!deepScanBuffer.isEmpty() ? "📜 " + textCount + " stitched nodes" : textCount + " screen nodes");
        if (hasActiveDraft) {
            sub += " • Draft (" + data.currentDraft.length() + "c)";
        }
        sub += " • Inspect ▾";
        cardSubTitle.setText(sub);

        if (entitiesBar != null && entitiesScroll != null) {
            entitiesBar.removeAllViews();
            if (!data.entities.isEmpty()) {
                for (Map.Entry<String, String> entry : data.entities.entrySet()) {
                    TextView chip = new TextView(service);
                    chip.setText(entry.getKey());
                    final String val = entry.getValue();
                    boolean isClip = val.startsWith("__CLIPBOARD__:");
                    chip.setTextColor(Color.parseColor(isClip ? "#7DD3FC" : "#A7F3D0"));
                    chip.setTextSize(TypedValue.COMPLEX_UNIT_SP, 8f);
                    chip.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
                    chip.setPadding(dpToPx(8), dpToPx(3), dpToPx(8), dpToPx(3));
                    GradientDrawable eb = new GradientDrawable();
                    eb.setShape(GradientDrawable.RECTANGLE);
                    eb.setCornerRadius(dpToPx(8));
                    eb.setColor(Color.parseColor(isClip ? "#220284C7" : "#2210B981"));
                    eb.setStroke(dpToPx(1), Color.parseColor(isClip ? "#6638BDF8" : "#6610B981"));
                    chip.setBackground(eb);
                    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                    lp.setMargins(0, 0, dpToPx(5), 0);
                    chip.setLayoutParams(lp);
                    chip.setOnClickListener(v -> {
                        v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
                        if (isClip) {
                            String clipContent = val.substring("__CLIPBOARD__:".length());
                            executeAction("CLIPBOARD_AI:" + clipContent);
                        } else {
                            copyToClipboard(val);
                            Toast.makeText(service, "Copied: " + val, Toast.LENGTH_SHORT).show();
                        }
                    });
                    entitiesBar.addView(chip);
                }
                entitiesScroll.setVisibility(View.VISIBLE);
            } else {
                entitiesScroll.setVisibility(View.GONE);
            }
        }

        StringBuilder sb = new StringBuilder();
        sb.append("Application: ").append(data.appName).append(" (").append(data.packageName).append(") [Mode: ").append(data.screenMode).append("]\n");
        if (!data.selectedText.isEmpty()) {
            sb.append("User Highlighted/Selected Text: \"").append(data.selectedText).append("\"\n");
        }
        if (hasActiveDraft) {
            sb.append("Current Draft in Input Box: \"").append(data.currentDraft).append("\"\n");
        }
        sb.append("Screen Content (ordered top-to-bottom):\n");
        int start = Math.max(0, combinedTexts.size() - 45);
        StringBuilder previewSb = new StringBuilder();
        if (hasActiveDraft) {
            previewSb.append("DRAFT: ").append(data.currentDraft).append("\n---\n");
        }
        for (int i = start; i < combinedTexts.size(); i++) {
            String line = combinedTexts.get(i);
            sb.append("- ").append(line).append("\n");
            if (i >= Math.max(0, combinedTexts.size() - 8)) {
                previewSb.append(line).append("\n");
            }
        }
        this.lastExtractedContext = sb.toString();
        if (contextPreviewView != null) {
            contextPreviewView.setText(previewSb.toString().trim());
        }
        resultsContainer.removeAllViews();
    }

    private String getPersonalStyleDirective() {
        if ("CASUAL_LOWER".equalsIgnoreCase(userStyle)) {
            return " User Personal Style: casual, relaxed lowercase texting without formal punctuation.";
        }
        if ("EXECUTIVE_PRO".equalsIgnoreCase(userStyle)) {
            return " User Personal Style: polished, articulate, executive professional.";
        }
        if ("DIRECT".equalsIgnoreCase(userStyle)) {
            return " User Personal Style: ultra-concise, direct, zero fluff.";
        }
        return "";
    }

    private String getFilterDirective() {
        if ("SHORT".equalsIgnoreCase(replyFilter)) {
            return " Length Requirement: SHORT & BRIEF (1 short sentence or a few words).";
        }
        if ("DETAILED".equalsIgnoreCase(replyFilter)) {
            return " Length Requirement: DETAILED & LONG (thorough, complete, well-explained 2 to 4 sentences).";
        }
        return "";
    }

    private String getUserBioDirective() {
        if (userBio != null && !userBio.trim().isEmpty()) {
            return "\nUser Resume / Study Profile Context: \"" + userBio.trim() + "\"\n";
        }
        return "";
    }

    private String fetchWikipediaFacts(String queryText) {
        try {
            String cleaned = queryText.replaceAll("[^a-zA-Z0-9\\s]", " ").trim();
            String[] words = cleaned.split("\\s+");
            StringBuilder qSb = new StringBuilder();
            for (int i = Math.max(0, words.length - 8); i < words.length; i++) {
                if (words[i].length() > 2) qSb.append(words[i]).append(" ");
            }
            String q = qSb.toString().trim();
            if (q.isEmpty()) return "";
            String urlStr = "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch="
                    + URLEncoder.encode(q, "UTF-8") + "&utf8=&format=json";
            HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
            conn.setConnectTimeout(3500);
            conn.setReadTimeout(3500);
            if (conn.getResponseCode() == 200) {
                JSONObject json = new JSONObject(readStream(conn.getInputStream()));
                JSONObject queryObj = json.optJSONObject("query");
                JSONArray searchArr = queryObj != null ? queryObj.optJSONArray("search") : null;
                if (searchArr != null && searchArr.length() > 0) {
                    StringBuilder facts = new StringBuilder("\n[Live Web Encyclopedia Reference]:\n");
                    for (int i = 0; i < Math.min(2, searchArr.length()); i++) {
                        JSONObject item = searchArr.getJSONObject(i);
                        String title = item.optString("title", "");
                        String snippet = item.optString("snippet", "").replaceAll("<[^>]*>", "");
                        facts.append("- ").append(title).append(": ").append(snippet).append("\n");
                    }
                    return facts.toString();
                }
            }
        } catch (Exception ignored) {}
        return "";
    }

    private void performVisionScan(final String scanMode) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            Toast.makeText(service, "Vision Scan requires Android 11+", Toast.LENGTH_SHORT).show();
            return;
        }
        if (cardView != null) cardView.setVisibility(View.INVISIBLE);
        if (pillView != null) pillView.setVisibility(View.INVISIBLE);

        mainHandler.postDelayed(() -> {
            try {
                service.takeScreenshot(Display.DEFAULT_DISPLAY, executor, new AccessibilityService.TakeScreenshotCallback() {
                    @Override
                    public void onSuccess(AccessibilityService.ScreenshotResult screenshot) {
                        mainHandler.post(() -> {
                            if (cardView != null) cardView.setVisibility(View.VISIBLE);
                            if (pillView != null) pillView.setVisibility(View.VISIBLE);
                            loadingIndicator.setVisibility(View.VISIBLE);
                            resultsContainer.removeAllViews();
                        });
                        try {
                            HardwareBuffer hb = screenshot.getHardwareBuffer();
                            Bitmap hwBitmap = Bitmap.wrapHardwareBuffer(hb, screenshot.getColorSpace());
                            if (hwBitmap != null) {
                                Bitmap swBitmap = hwBitmap.copy(Bitmap.Config.ARGB_8888, false);
                                hwBitmap.recycle();
                                hb.close();

                                int maxW = 960;
                                if (swBitmap.getWidth() > maxW) {
                                    int newH = (int) ((float) swBitmap.getHeight() * maxW / swBitmap.getWidth());
                                    Bitmap scaled = Bitmap.createScaledBitmap(swBitmap, maxW, newH, true);
                                    swBitmap.recycle();
                                    swBitmap = scaled;
                                }
                                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                                swBitmap.compress(Bitmap.CompressFormat.JPEG, 76, baos);
                                swBitmap.recycle();
                                String base64Jpeg = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);

                                String visionPrompt = "INTERVIEW".equals(scanMode)
                                        ? "You are an Interview Wingman. Analyze this screen image (coding challenge, system design diagram, or interview question). Provide: 1) 🎯 SPOKEN APPROACH (2 lines to say out loud), 2) 💻 OPTIMAL SOLUTION / ANSWER, 3) ⚡ COMPLEXITY / KEY POINTS."
                                        : "STUDENT".equals(scanMode)
                                        ? "You are an expert Student Tutor & Exam Solver. Analyze this screen image (math equation, quiz/MCQ, diagram, or lecture slide). Provide: 1) ✅ DIRECT ANSWER at the top, 2) 📐 STEP-BY-STEP EXPLANATION below."
                                        : "Analyze this screen image carefully. Solve any questions/problems shown, extract key text/diagrams, and explain clearly.";

                                String resp = queryGeminiVision(visionPrompt, base64Jpeg);
                                lastAiResponse = resp != null ? resp : "";
                                mainHandler.post(() -> {
                                    loadingIndicator.setVisibility(View.GONE);
                                    displayResults("VISION_SCAN", resp);
                                });
                            }
                        } catch (Exception e) {
                            mainHandler.post(() -> {
                                loadingIndicator.setVisibility(View.GONE);
                                displayError("Vision Scan failed: " + e.getMessage());
                            });
                        }
                    }

                    @Override
                    public void onFailure(int errorCode) {
                        mainHandler.post(() -> {
                            if (cardView != null) cardView.setVisibility(View.VISIBLE);
                            if (pillView != null) pillView.setVisibility(View.VISIBLE);
                            displayError("Screenshot capture failed (code " + errorCode + ")");
                        });
                    }
                });
            } catch (Exception e) {
                if (cardView != null) cardView.setVisibility(View.VISIBLE);
                if (pillView != null) pillView.setVisibility(View.VISIBLE);
            }
        }, 140);
    }

    private String queryGeminiVision(String visionPrompt, String base64Jpeg) throws Exception {
        SharedPreferences prefs = service.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String geminiKey = prefs.getString(KEY_GEMINI_KEY, "");
        if (geminiKey.isEmpty()) geminiKey = prefs.getString(KEY_API_KEY, "");
        if (geminiKey.isEmpty()) {
            throw new Exception("Vision Scan requires a Gemini API key in IRIS Settings");
        }
        String modelId = prefs.getString(KEY_MODEL, "gemini-2.5-flash");
        if (modelId.isEmpty()) modelId = "gemini-2.5-flash";

        URL url = new URL("https://generativelanguage.googleapis.com/v1beta/models/" + modelId + ":generateContent");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("x-goog-api-key", geminiKey.trim());
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(18000);
        conn.setDoOutput(true);

        JSONArray parts = new JSONArray();
        parts.put(new JSONObject().put("text", visionPrompt + "\n\nExtracted Screen Text Context:\n" + lastExtractedContext));
        JSONObject inlineData = new JSONObject();
        inlineData.put("mime_type", "image/jpeg");
        inlineData.put("data", base64Jpeg);
        parts.put(new JSONObject().put("inline_data", inlineData));

        JSONArray contents = new JSONArray();
        contents.put(new JSONObject().put("role", "user").put("parts", parts));
        JSONObject body = new JSONObject().put("contents", contents);

        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.toString().getBytes("UTF-8"));
        }

        int code = conn.getResponseCode();
        if (code == 200) {
            String resp = readStream(conn.getInputStream());
            JSONObject json = new JSONObject(resp);
            JSONArray candidates = json.optJSONArray("candidates");
            if (candidates != null && candidates.length() > 0) {
                JSONObject contentObj = candidates.getJSONObject(0).optJSONObject("content");
                if (contentObj != null) {
                    JSONArray resParts = contentObj.optJSONArray("parts");
                    if (resParts != null && resParts.length() > 0) {
                        return resParts.getJSONObject(0).optString("text", "");
                    }
                }
            }
            return "";
        } else {
            throw new Exception("Gemini Vision HTTP " + code + ": " + readStream(conn.getErrorStream()));
        }
    }

    private void executeAction(String action) {
        if (moreToolsGrid != null) moreToolsGrid.setVisibility(View.GONE);
        loadingIndicator.setVisibility(View.VISIBLE);
        resultsContainer.removeAllViews();

        boolean showFilterRow = "REPLY".equals(action) || "REWRITE".equals(action) || action.startsWith("COMPOSE:");
        if (replyFilterScroll != null) {
            replyFilterScroll.setVisibility(showFilterRow ? View.VISIBLE : View.GONE);
        }
        if (showFilterRow) {
            lastActiveAction = action;
        }

        executor.execute(() -> {
            try {
                String styleDir = getPersonalStyleDirective();
                String lenDir = getFilterDirective();
                String bioDir = getUserBioDirective();
                String systemPrompt = "You are Iris Copilot, a sharp cybernetic AI assistant analyzing an Android app screen. Respond directly, concisely, and naturally without filler words." + styleDir + lenDir;
                String userPrompt = "";

                if (action.startsWith("INTERVIEW_LISTEN:")) {
                    String heardQuestion = action.substring("INTERVIEW_LISTEN:".length());
                    systemPrompt = "You are an elite Live Interview Wingman & Teleprompter. The interviewer just asked a question. Format your response so the candidate can glance at it and speak naturally while maintaining eye contact:\n"
                            + "🎯 OPENING HOOK: (1 strong sentence to start speaking immediately)\n"
                            + "• KEY POINT 1: (concise talking point)\n"
                            + "• KEY POINT 2: (concise talking point)\n"
                            + "• KEY POINT 3: (impact/result talking point)" + lenDir;
                    userPrompt = bioDir + "Interviewer Question: \"" + heardQuestion + "\"\nScreen Context:\n" + lastExtractedContext + "\nGenerate the Teleprompter answer now:";
                } else if ("INTERVIEW_ANSWER".equals(action)) {
                    systemPrompt = "You are an elite Live Interview Wingman & Teleprompter. Based on the interview question or topic visible on screen, format your response for instant eye-contact reading:\n"
                            + "🎯 OPENING HOOK: (1 strong sentence to start speaking immediately)\n"
                            + "• KEY POINT 1: (concise talking point)\n"
                            + "• KEY POINT 2: (concise talking point)\n"
                            + "• KEY POINT 3: (impact/result talking point)" + lenDir;
                    userPrompt = bioDir + lastExtractedContext + "\nGenerate the Teleprompter answer for the active interview question/screen:";
                } else if ("INTERVIEW_STAR".equals(action)) {
                    systemPrompt = "You are an elite Behavioral Interview Coach. Craft a high-impact STAR Method response tailored to the user's background and the screen context:\n"
                            + "📌 SITUATION: (1 line setting the scene)\n"
                            + "🎯 TASK: (1 line on the challenge)\n"
                            + "⚡ ACTION: (2 crisp bullets on what you did)\n"
                            + "🏆 RESULT: (1 line with measurable impact)" + lenDir;
                    userPrompt = bioDir + lastExtractedContext + "\nGenerate a STAR story for this interview context:";
                } else if ("INTERVIEW_CODE".equals(action)) {
                    systemPrompt = "You are a Staff Engineer Interview Wingman. Solve the coding or technical question on screen in 3 clean parts:\n"
                            + "1) 🗣️ WHAT TO SAY ALOUD: (Explain the optimal approach in 2 sentences)\n"
                            + "2) 💻 OPTIMAL CODE / SOLUTION: (Clean, bug-free solution)\n"
                            + "3) ⏱️ COMPLEXITY: (Time & Space Big-O complexity)";
                    userPrompt = lastExtractedContext + "\nSolve the technical/coding question on this screen:";
                } else if ("STUDENT_SOLVE".equals(action)) {
                    systemPrompt = "You are an expert Student Exam & Homework Solver. Analyze the question, multiple-choice problem (MCQ), math equation, or assignment on screen. Format strictly as:\n"
                            + "✅ DIRECT ANSWER: (State the exact correct option/answer immediately at the top)\n\n"
                            + "📐 STEP-BY-STEP EXPLANATION:\n"
                            + "- Step 1: ...\n- Step 2: ..." + lenDir;
                    userPrompt = lastExtractedContext + "\nSolve the question(s) on this screen:";
                } else if ("STUDENT_ELI5".equals(action)) {
                    systemPrompt = "You are an expert Study Tutor. Break down the complex topic or paragraph on this screen so it is effortless to understand:\n"
                            + "💡 SIMPLE ANALOGY: (Explain it like I'm 10 using a real-world analogy)\n"
                            + "🔑 3 EXAM KEY TERMS: (Bullet list of the 3 most important concepts to remember)" + lenDir;
                    userPrompt = lastExtractedContext + "\nSimplify and explain this screen:";
                } else if ("STUDENT_FLASHCARDS".equals(action)) {
                    systemPrompt = "You are an Active Recall Study Coach. Turn the key material on this screen into 3 high-yield study flashcards formatted as:\n"
                            + "🃏 Q1: [Question]\n✅ A1: [Concise Answer]\n\n"
                            + "🃏 Q2: [Question]\n✅ A2: [Concise Answer]\n\n"
                            + "🃏 Q3: [Question]\n✅ A3: [Concise Answer]";
                    userPrompt = lastExtractedContext + "\nCreate 3 study flashcards from this screen:";
                } else if ("REPLY".equals(action)) {
                    String toneInstr;
                    if ("AUTO".equals(replyFilter)) {
                        toneInstr = "Generate 3 distinct replies covering 3 styles in this exact order: "
                                + "1) Short & Casual (quick 1-liner), "
                                + "2) Polite & Balanced (warm and courteous), "
                                + "3) Detailed & Complete (thorough, thoughtful response).";
                    } else {
                        String tDesc = "POLITE".equals(replyFilter) ? "warm, polite, and courteous"
                                : "CASUAL".equals(replyFilter) ? "casual, friendly, and relaxed"
                                : "SHORT".equals(replyFilter) ? "ultra-short and direct (1 quick sentence)"
                                : "DETAILED".equals(replyFilter) ? "detailed, thorough, and well-explained (2-3 sentences)"
                                : "YES".equals(replyFilter) ? "agreeing / saying YES positively"
                                : "NO".equals(replyFilter) ? "politely declining / saying NO"
                                : "LATER".equals(replyFilter) ? "saying you are busy right now and will follow up later"
                                : "natural and context-appropriate";
                        toneInstr = "Generate 3 smart replies all matching this style/stance: " + tDesc + ".";
                    }
                    systemPrompt = "You are Iris Copilot. Based on the screen conversation ([THEM] = incoming messages, [YOU] = user's messages), "
                            + toneInstr + styleDir
                            + " Return ONLY a JSON array of 3 strings: [\"reply1\", \"reply2\", \"reply3\"]. No markdown wrapper, no filler.";
                    userPrompt = lastExtractedContext + "\nGenerate 3 smart replies for the user to send next:";
                } else if ("SUMMARIZE".equals(action)) {
                    systemPrompt = "You are Iris Copilot. Summarize the key information into 3 crisp, high-signal bullet points (- )." + lenDir;
                    userPrompt = lastExtractedContext + "\nSummarize this screen:";
                } else if ("EXTRACT".equals(action)) {
                    systemPrompt = "You are Iris Copilot. Extract all key actionable items, dates/times, tasks, prices, specs, or important facts visible on this screen into a clean, structured bulleted list (- ).";
                    userPrompt = lastExtractedContext + "\nExtract key actionable items and facts from this screen:";
                } else if ("FACT_CHECK".equals(action)) {
                    String wikiContext = fetchWikipediaFacts(lastExtractedContext);
                    systemPrompt = "You are Iris Copilot Fact-Checker. Verify the main claims, topics, or entities visible on this screen using the provided Live Web Encyclopedia Reference and your knowledge. Point out what is accurate, any context needed, and key facts.";
                    userPrompt = lastExtractedContext + wikiContext + "\nFact-check and explain the key claims/topics on this screen:";
                } else if (action.startsWith("CLIPBOARD_AI:")) {
                    String clipText = action.substring("CLIPBOARD_AI:".length());
                    systemPrompt = "You are Iris Copilot. The user copied this text to their clipboard. Provide: 1) A quick summary/explanation or translation if foreign, and 2) 2 smart replies or improved rewrites for it. Return a JSON array of 3 strings: [\"Insight / Translation: ...\", \"Reply/Rewrite 1\", \"Reply/Rewrite 2\"].";
                    userPrompt = "Copied Clipboard Text: \"" + clipText + "\"\nScreen Context:\n" + lastExtractedContext;
                } else if ("TRANSLATE".equals(action)) {
                    systemPrompt = "You are Iris Copilot, a real-time translator. 1) Translate the visible foreign messages/text on screen into clear English. 2) If it's a chat, also provide 2 natural replies in the other person's language (with English translation in parentheses).";
                    userPrompt = lastExtractedContext + "\nTranslate the screen content and suggest translated replies if applicable:";
                } else if ("REWRITE".equals(action)) {
                    systemPrompt = "You are Iris Copilot. Take the user's current draft (or the last message if no draft) and generate 3 improved alternatives: 1. Short & Casual, 2. Polite & Professional, 3. Detailed & Articulate. Return ONLY a JSON array of 3 strings: [\"version1\", \"version2\", \"version3\"].";
                    userPrompt = lastExtractedContext + "\nRewrite this draft:";
                } else if (action.startsWith("REFINE_SHORT:")) {
                    String orig = action.substring("REFINE_SHORT:".length());
                    systemPrompt = "You are Iris Copilot. Rewrite the given message in 2 shorter, punchier variations. Return ONLY a JSON array of 2 strings: [\"short1\", \"short2\"].";
                    userPrompt = "Original message: \"" + orig + "\"\nMake it shorter and punchier:";
                } else if (action.startsWith("REFINE_DETAIL:")) {
                    String orig = action.substring("REFINE_DETAIL:".length());
                    systemPrompt = "You are Iris Copilot. Expand the given message into 2 more detailed, polite, and complete variations. Return ONLY a JSON array of 2 strings: [\"detailed1\", \"detailed2\"].";
                    userPrompt = "Original message: \"" + orig + "\"\nMake it more detailed and complete:";
                } else if ("EXPLAIN".equals(action)) {
                    systemPrompt = "You are Iris Copilot. Explain the core concept, error, message, or content visible on this screen in clear terms." + lenDir;
                    userPrompt = lastExtractedContext + "\nExplain what is on this screen:";
                } else if (action.startsWith("COMPOSE:")) {
                    String rest = action.substring("COMPOSE:".length());
                    int colonIdx = rest.indexOf(':');
                    String instruction = colonIdx > 0 ? rest.substring(colonIdx + 1) : rest;
                    systemPrompt = "You are Iris Copilot, a sharp message composer. Based on the user's instruction and active app/screen context, generate 3 ready-to-send message drafts: 1) Short & Casual, 2) Polite & Balanced, 3) Detailed & Complete." + styleDir + lenDir + " Return ONLY a JSON array of 3 strings: [\"draft1\", \"draft2\", \"draft3\"]. No markdown wrapper, no filler.";
                    userPrompt = lastExtractedContext + "\nCompose a message for this instruction: " + instruction;
                } else if (action.startsWith("ASK:")) {
                    String question = action.substring("ASK:".length());
                    String prevContext = !lastAiResponse.isEmpty() ? "\nPrevious Copilot Response:\n" + lastAiResponse + "\n" : "";
                    userPrompt = lastExtractedContext + prevContext + "\nUser Question: " + question;
                }

                String response = queryLLMDirect(systemPrompt, userPrompt);
                lastAiResponse = response != null ? response : "";
                mainHandler.post(() -> {
                    loadingIndicator.setVisibility(View.GONE);
                    displayResults(action, response);
                });
            } catch (Exception e) {
                Log.e(TAG, "Error executing Copilot AI action", e);
                mainHandler.post(() -> {
                    loadingIndicator.setVisibility(View.GONE);
                    displayError(e.getMessage());
                });
            }
        });
    }

    private void displayResults(String action, String text) {
        resultsContainer.removeAllViews();
        if (text == null || text.trim().isEmpty()) {
            displayError("No response generated");
            return;
        }

        String raw = text.trim();
        List<String> items = new ArrayList<>();

        try {
            int openBracket = raw.indexOf('[');
            int closeBracket = raw.lastIndexOf(']');
            if (openBracket != -1 && closeBracket > openBracket) {
                String jsonPart = raw.substring(openBracket, closeBracket + 1);
                JSONArray arr = new JSONArray(jsonPart);
                for (int i = 0; i < arr.length(); i++) {
                    String item = arr.getString(i).trim();
                    if (!item.isEmpty()) items.add(item);
                }
            }
        } catch (Exception ignored) {}

        boolean expectsSuggestions = "REPLY".equals(action) || "REWRITE".equals(action)
                || action.startsWith("COMPOSE:") || action.startsWith("REFINE_")
                || action.startsWith("CLIPBOARD_AI:");
        if (items.isEmpty() && (expectsSuggestions || raw.contains("\n1."))) {
            String[] lines = raw.split("\n");
            for (String line : lines) {
                String trimmed = line.trim();
                if (trimmed.isEmpty()) continue;
                String cleaned = trimmed.replaceFirst("^(?:\\d+[.)]|[-*•])\\s*", "").replaceAll("^\"|\"$", "").trim();
                if (cleaned.length() > 2) {
                    items.add(cleaned);
                }
            }
        }

        if (!items.isEmpty()) {
            String[] autoBadges = new String[]{"⚡ SHORT & CASUAL", "👔 POLITE & BALANCED", "📝 DETAILED & COMPLETE"};
            for (int i = 0; i < items.size(); i++) {
                String badgeLabel;
                if (("REPLY".equals(action) || "REWRITE".equals(action) || action.startsWith("COMPOSE:"))
                        && "AUTO".equals(replyFilter) && i < autoBadges.length) {
                    badgeLabel = autoBadges[i];
                } else if ("REPLY".equals(action)) {
                    badgeLabel = "STYLE: " + replyFilter;
                } else {
                    badgeLabel = "OPTION #" + (i + 1);
                }
                addSuggestionCard(items.get(i), badgeLabel);
            }
        } else {
            addTextCard(raw);
        }
    }

    private void saveToIrisItemQueue(String key, String content, String label) {
        try {
            SharedPreferences prefs = service.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            JSONArray arr = new JSONArray(prefs.getString(key, "[]"));
            arr.put(content);
            prefs.edit().putString(key, arr.toString()).apply();
            Toast.makeText(service, "✓ Saved to IRIS " + label, Toast.LENGTH_SHORT).show();
        } catch (Exception ignored) {}
    }

    private void addSuggestionCard(String suggestion, String styleBadge) {
        LinearLayout card = new LinearLayout(service);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dpToPx(10), dpToPx(8), dpToPx(10), dpToPx(8));

        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.RECTANGLE);
        bg.setCornerRadius(dpToPx(10));
        bg.setColor(Color.parseColor("#1C00F2FF"));
        bg.setStroke(dpToPx(1), Color.parseColor("#3300F2FF"));
        card.setBackground(bg);

        // Header Row inside card: Style Badge on Left + Primary Actions (⋯, INSERT ↵, SEND ➤) on Right
        LinearLayout topRow = new LinearLayout(service);
        topRow.setOrientation(LinearLayout.HORIZONTAL);
        topRow.setGravity(Gravity.CENTER_VERTICAL);
        topRow.setPadding(0, 0, 0, dpToPx(4));

        TextView badgeTv = new TextView(service);
        badgeTv.setText(styleBadge != null ? styleBadge : "SUGGESTION");
        badgeTv.setTextColor(Color.parseColor("#8800F2FF"));
        badgeTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 7.5f);
        badgeTv.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams badgeLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        topRow.addView(badgeTv, badgeLp);

        // Secondary Drawer (Hidden until ⋯ is tapped)
        final LinearLayout extraRow = new LinearLayout(service);
        extraRow.setOrientation(LinearLayout.HORIZONTAL);
        extraRow.setGravity(Gravity.END | Gravity.CENTER_VERTICAL);
        extraRow.setPadding(0, dpToPx(6), 0, 0);
        extraRow.setVisibility(View.GONE);

        // ⋯ More Toggle
        TextView moreBtn = new TextView(service);
        moreBtn.setText("⋯");
        moreBtn.setTextColor(Color.parseColor("#99FFFFFF"));
        moreBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f);
        moreBtn.setPadding(dpToPx(8), dpToPx(2), dpToPx(8), dpToPx(2));
        moreBtn.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            extraRow.setVisibility(extraRow.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE);
        });
        topRow.addView(moreBtn);

        // INSERT ↵
        TextView injectBtn = new TextView(service);
        injectBtn.setText("INSERT ↵");
        injectBtn.setTextColor(Color.BLACK);
        injectBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 8.5f);
        injectBtn.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
        injectBtn.setPadding(dpToPx(9), dpToPx(3.5f), dpToPx(9), dpToPx(3.5f));
        GradientDrawable btnBg = new GradientDrawable();
        btnBg.setShape(GradientDrawable.RECTANGLE);
        btnBg.setCornerRadius(dpToPx(6));
        btnBg.setColor(Color.parseColor("#00F2FF"));
        injectBtn.setBackground(btnBg);
        injectBtn.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            boolean success = injectText(suggestion);
            Toast.makeText(service, success ? "✓ Inserted into " + (currentAppLabel.isEmpty() ? "app" : currentAppLabel) : "Copied to clipboard (Tap & hold to paste)", Toast.LENGTH_SHORT).show();
            hideCard();
        });
        topRow.addView(injectBtn);

        // SEND ➤ (Shown when Send button is detected on screen)
        if (lastSendButtonNode != null) {
            TextView sendNowBtn = new TextView(service);
            sendNowBtn.setText("SEND ➤");
            sendNowBtn.setTextColor(Color.BLACK);
            sendNowBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 8.5f);
            sendNowBtn.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
            sendNowBtn.setPadding(dpToPx(8), dpToPx(3.5f), dpToPx(8), dpToPx(3.5f));
            GradientDrawable sendBg = new GradientDrawable();
            sendBg.setShape(GradientDrawable.RECTANGLE);
            sendBg.setCornerRadius(dpToPx(6));
            sendBg.setColor(Color.parseColor("#10B981"));
            sendNowBtn.setBackground(sendBg);
            LinearLayout.LayoutParams sendLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            sendLp.setMargins(dpToPx(4), 0, 0, 0);
            sendNowBtn.setLayoutParams(sendLp);
            sendNowBtn.setOnClickListener(v -> {
                v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
                boolean injected = injectText(suggestion);
                hideCard();
                if (injected && lastSendButtonNode != null) {
                    mainHandler.postDelayed(() -> {
                        try {
                            lastSendButtonNode.refresh();
                            lastSendButtonNode.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                        } catch (Exception ignored) {}
                    }, 140);
                }
            });
            topRow.addView(sendNowBtn);
        }

        card.addView(topRow);

        // Suggestion Text (Tap text directly to copy)
        TextView tv = new TextView(service);
        tv.setText(suggestion);
        tv.setTextColor(Color.WHITE);
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        tv.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            copyToClipboard(suggestion);
            Toast.makeText(service, "Copied to clipboard", Toast.LENGTH_SHORT).show();
        });
        card.addView(tv);

        // Populate Secondary Drawer (✂️ Shorter, ➕ Longer, ➕ Task, 📝 Note)
        extraRow.addView(createSecondaryCardAction("✂️ SHORTER", v -> executeAction("REFINE_SHORT:" + suggestion)));
        extraRow.addView(createSecondaryCardAction("➕ LONGER", v -> executeAction("REFINE_DETAIL:" + suggestion)));
        extraRow.addView(createSecondaryCardAction("➕ TASK", v -> saveToIrisItemQueue("copilot_saved_tasks", suggestion, "Tasks")));
        extraRow.addView(createSecondaryCardAction("📝 NOTE", v -> saveToIrisItemQueue("copilot_saved_notes", suggestion, "Notes")));
        card.addView(extraRow);

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, 0, dpToPx(6));
        resultsContainer.addView(card, lp);
    }

    private View createSecondaryCardAction(String label, View.OnClickListener onClick) {
        TextView tv = new TextView(service);
        tv.setText(label);
        tv.setTextColor(Color.parseColor("#BBFFFFFF"));
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 7.5f);
        tv.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
        tv.setPadding(dpToPx(6), dpToPx(3), dpToPx(6), dpToPx(3));
        tv.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            onClick.onClick(v);
        });
        return tv;
    }

    private void addTextCard(String content) {
        LinearLayout card = new LinearLayout(service);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dpToPx(10), dpToPx(8), dpToPx(10), dpToPx(8));

        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.RECTANGLE);
        bg.setCornerRadius(dpToPx(10));
        bg.setColor(Color.parseColor("#15FFFFFF"));
        card.setBackground(bg);

        TextView tv = new TextView(service);
        tv.setText(content);
        tv.setTextColor(Color.parseColor("#EEEEEE"));
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f);
        tv.setLineSpacing(0, 1.2f);
        tv.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            copyToClipboard(content);
            Toast.makeText(service, "Copied to clipboard", Toast.LENGTH_SHORT).show();
        });
        card.addView(tv);

        LinearLayout btnRow = new LinearLayout(service);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);
        btnRow.setGravity(Gravity.END | Gravity.CENTER_VERTICAL);
        btnRow.setPadding(0, dpToPx(6), 0, 0);

        btnRow.addView(createSecondaryCardAction("➕ TASK", v -> saveToIrisItemQueue("copilot_saved_tasks", content, "Tasks")));
        btnRow.addView(createSecondaryCardAction("📝 NOTE", v -> saveToIrisItemQueue("copilot_saved_notes", content, "Notes")));
        btnRow.addView(createSecondaryCardAction("COPY", v -> {
            copyToClipboard(content);
            Toast.makeText(service, "Copied to clipboard", Toast.LENGTH_SHORT).show();
        }));

        TextView insertBtn = new TextView(service);
        insertBtn.setText("INSERT ↵");
        insertBtn.setTextColor(Color.parseColor("#00F2FF"));
        insertBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 8.5f);
        insertBtn.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
        insertBtn.setPadding(dpToPx(6), dpToPx(3), dpToPx(6), dpToPx(3));
        insertBtn.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            boolean success = injectText(content);
            Toast.makeText(service, success ? "✓ Inserted into " + (currentAppLabel.isEmpty() ? "app" : currentAppLabel) : "Copied to clipboard (Tap & hold to paste)", Toast.LENGTH_SHORT).show();
            hideCard();
        });
        btnRow.addView(insertBtn);

        card.addView(btnRow);

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        resultsContainer.addView(card, lp);
    }

    private void displayError(String msg) {
        LinearLayout errCard = new LinearLayout(service);
        errCard.setOrientation(LinearLayout.VERTICAL);
        errCard.setPadding(dpToPx(10), dpToPx(8), dpToPx(10), dpToPx(8));

        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.RECTANGLE);
        bg.setCornerRadius(dpToPx(8));
        bg.setColor(Color.parseColor("#22FF5252"));
        bg.setStroke(dpToPx(1), Color.parseColor("#66FF5252"));
        errCard.setBackground(bg);

        TextView tv = new TextView(service);
        tv.setText(msg != null ? msg : "Unknown error");
        tv.setTextColor(Color.parseColor("#FF8A80"));
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        errCard.addView(tv);

        if (msg != null && (msg.contains("API key") || msg.contains("No API key configured"))) {
            Button openSettingsBtn = new Button(service);
            openSettingsBtn.setText("OPEN IRIS SETTINGS");
            openSettingsBtn.setTextColor(Color.BLACK);
            openSettingsBtn.setBackgroundColor(Color.parseColor("#00F2FF"));
            openSettingsBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9.5f);
            LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dpToPx(32));
            btnLp.setMargins(0, dpToPx(6), 0, 0);
            openSettingsBtn.setLayoutParams(btnLp);
            openSettingsBtn.setOnClickListener(v -> {
                try {
                    Intent intent = new Intent(service, MainActivity.class);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    intent.putExtra("navigate_to", "settings");
                    service.startActivity(intent);
                    hideCard();
                } catch (Exception e) {
                    Log.e(TAG, "Failed to launch settings", e);
                }
            });
            errCard.addView(openSettingsBtn);
        }

        resultsContainer.addView(errCard);
    }

    public boolean injectText(String text) {
        if (text == null) return false;
        copyToClipboard(text);

        AccessibilityNodeInfo target = lastTargetInputNode;
        if (target == null || !target.refresh() || !target.isEditable()) {
            AccessibilityNodeInfo root = service.getRootInActiveWindow();
            if (root != null) {
                target = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
                if (target == null || !target.isEditable()) {
                    List<AccessibilityNodeInfo> fHolder = new ArrayList<>();
                    List<AccessibilityNodeInfo> eHolder = new ArrayList<>();
                    traverseTree(root, new ArrayList<>(), fHolder, eHolder, new ArrayList<>(), new ArrayList<>(), new ArrayList<>());
                    if (!fHolder.isEmpty()) target = fHolder.get(0);
                    else if (!eHolder.isEmpty()) target = eHolder.get(0);
                }
            }
        }

        if (target != null && target.isEditable()) {
            Bundle args = new Bundle();
            args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text);
            boolean ok = target.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
            if (!ok) {
                ok = target.performAction(AccessibilityNodeInfo.ACTION_PASTE);
            }
            return ok;
        }
        return false;
    }

    private void copyToClipboard(String text) {
        try {
            lastInternalClipboard = text != null ? text.trim() : "";
            ClipboardManager cm = (ClipboardManager) service.getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) {
                ClipData clip = ClipData.newPlainText("IRIS Copilot", text);
                cm.setPrimaryClip(clip);
            }
        } catch (Exception ignored) {}
    }

    private String queryLLMDirect(String systemPrompt, String userPrompt) throws Exception {
        SharedPreferences prefs = service.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String backend = prefs.getString(KEY_BACKEND, "GEMINI");
        String apiKey = prefs.getString(KEY_API_KEY, "");
        String geminiKey = prefs.getString(KEY_GEMINI_KEY, "");
        String groqKey = prefs.getString(KEY_GROQ_KEY, "");
        String model = prefs.getString(KEY_MODEL, "gemini-2.5-flash");

        String effectiveKey = apiKey;
        if ("GROQ".equalsIgnoreCase(backend)) {
            if (!groqKey.isEmpty()) effectiveKey = groqKey;
            else if (effectiveKey.isEmpty()) effectiveKey = geminiKey;
        } else {
            if (!geminiKey.isEmpty()) effectiveKey = geminiKey;
            else if (effectiveKey.isEmpty()) effectiveKey = groqKey;
        }

        if (effectiveKey == null || effectiveKey.trim().isEmpty()) {
            throw new Exception("No API key configured in IRIS Settings");
        }

        if ("GROQ".equalsIgnoreCase(backend)) {
            String groqModel = prefs.getString(KEY_GROQ_MODEL, "llama-3.3-70b-versatile");
            try {
                return callGroqDirect(effectiveKey.trim(), groqModel, systemPrompt, userPrompt);
            } catch (Exception firstErr) {
                String fallback = discoverActiveGroqModel(effectiveKey.trim(), groqModel);
                if (fallback != null && !fallback.equals(groqModel)) {
                    prefs.edit().putString(KEY_GROQ_MODEL, fallback).apply();
                    return callGroqDirect(effectiveKey.trim(), fallback, systemPrompt, userPrompt);
                }
                throw firstErr;
            }
        } else {
            String cleanModel = model != null && !model.isEmpty() ? model : "gemini-2.5-flash";
            try {
                return callGeminiDirect(effectiveKey.trim(), cleanModel, systemPrompt, userPrompt);
            } catch (Exception firstErr) {
                String fallback = discoverActiveGeminiModel(effectiveKey.trim(), cleanModel);
                if (fallback != null && !fallback.equals(cleanModel)) {
                    prefs.edit().putString(KEY_MODEL, fallback).apply();
                    return callGeminiDirect(effectiveKey.trim(), fallback, systemPrompt, userPrompt);
                }
                throw firstErr;
            }
        }
    }

    private String callGroqDirect(String apiKey, String modelId, String systemPrompt, String userPrompt) throws Exception {
        URL url = new URL("https://api.groq.com/openai/v1/chat/completions");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Authorization", "Bearer " + apiKey);
        conn.setConnectTimeout(8000);
        conn.setReadTimeout(14000);
        conn.setDoOutput(true);

        JSONObject body = new JSONObject();
        body.put("model", modelId);
        JSONArray messages = new JSONArray();
        messages.put(new JSONObject().put("role", "system").put("content", systemPrompt));
        messages.put(new JSONObject().put("role", "user").put("content", userPrompt));
        body.put("messages", messages);
        body.put("max_tokens", 800);

        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.toString().getBytes("UTF-8"));
        }

        int code = conn.getResponseCode();
        if (code == 200) {
            String resp = readStream(conn.getInputStream());
            JSONObject json = new JSONObject(resp);
            return json.getJSONArray("choices").getJSONObject(0).getJSONObject("message").getString("content");
        } else {
            throw new Exception("Groq HTTP " + code + ": " + readStream(conn.getErrorStream()));
        }
    }

    private String callGeminiDirect(String apiKey, String modelId, String systemPrompt, String userPrompt) throws Exception {
        URL url = new URL("https://generativelanguage.googleapis.com/v1beta/models/" + modelId + ":generateContent");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("x-goog-api-key", apiKey);
        conn.setConnectTimeout(8000);
        conn.setReadTimeout(14000);
        conn.setDoOutput(true);

        JSONObject body = new JSONObject();
        JSONArray contents = new JSONArray();
        contents.put(new JSONObject().put("role", "user").put("parts", new JSONArray().put(new JSONObject().put("text", userPrompt))));
        body.put("contents", contents);
        body.put("systemInstruction", new JSONObject().put("parts", new JSONArray().put(new JSONObject().put("text", systemPrompt))));

        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.toString().getBytes("UTF-8"));
        }

        int code = conn.getResponseCode();
        if (code == 200) {
            String resp = readStream(conn.getInputStream());
            JSONObject json = new JSONObject(resp);
            JSONArray candidates = json.optJSONArray("candidates");
            if (candidates != null && candidates.length() > 0) {
                JSONObject contentObj = candidates.getJSONObject(0).optJSONObject("content");
                if (contentObj != null) {
                    JSONArray parts = contentObj.optJSONArray("parts");
                    if (parts != null && parts.length() > 0) {
                        return parts.getJSONObject(0).optString("text", "");
                    }
                }
            }
            return "";
        } else {
            throw new Exception("Gemini HTTP " + code + ": " + readStream(conn.getErrorStream()));
        }
    }

    private String discoverActiveGeminiModel(String apiKey, String failedModel) {
        try {
            URL url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("x-goog-api-key", apiKey);
            conn.setConnectTimeout(6000);
            conn.setReadTimeout(6000);
            if (conn.getResponseCode() == 200) {
                JSONObject json = new JSONObject(readStream(conn.getInputStream()));
                JSONArray models = json.optJSONArray("models");
                if (models != null) {
                    String bestFlash = null;
                    String bestAny = null;
                    for (int i = 0; i < models.length(); i++) {
                        JSONObject m = models.getJSONObject(i);
                        String rawName = m.optString("name", "").replace("models/", "");
                        JSONArray methods = m.optJSONArray("supportedGenerationMethods");
                        boolean supportsGen = false;
                        if (methods != null) {
                            for (int j = 0; j < methods.length(); j++) {
                                if ("generateContent".equals(methods.getString(j))) {
                                    supportsGen = true;
                                    break;
                                }
                            }
                        }
                        if (!supportsGen || rawName.equals(failedModel) || rawName.contains("embedding")
                                || rawName.contains("imagen") || rawName.contains("tts") || rawName.contains("1.0")) {
                            continue;
                        }
                        if (rawName.equals("gemini-2.5-flash")) return rawName;
                        if (rawName.contains("flash") && bestFlash == null) bestFlash = rawName;
                        if (bestAny == null) bestAny = rawName;
                    }
                    return bestFlash != null ? bestFlash : bestAny;
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String discoverActiveGroqModel(String apiKey, String failedModel) {
        try {
            URL url = new URL("https://api.groq.com/openai/v1/models");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + apiKey);
            conn.setConnectTimeout(6000);
            conn.setReadTimeout(6000);
            if (conn.getResponseCode() == 200) {
                JSONObject json = new JSONObject(readStream(conn.getInputStream()));
                JSONArray data = json.optJSONArray("data");
                if (data != null) {
                    String bestVersatile = null;
                    String bestAny = null;
                    for (int i = 0; i < data.length(); i++) {
                        String id = data.getJSONObject(i).optString("id", "");
                        String lower = id.toLowerCase();
                        if (id.isEmpty() || id.equals(failedModel) || lower.contains("whisper")
                                || lower.contains("guard") || lower.contains("tts") || lower.contains("playai")) {
                            continue;
                        }
                        if (id.equals("llama-3.3-70b-versatile")) return id;
                        if ((lower.contains("versatile") || lower.contains("70b")) && bestVersatile == null) {
                            bestVersatile = id;
                        }
                        if (bestAny == null) bestAny = id;
                    }
                    return bestVersatile != null ? bestVersatile : bestAny;
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String readStream(InputStream is) {
        if (is == null) return "";
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, "UTF-8"))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private String resolveAppLabel(String pkg) {
        if (pkg == null || pkg.isEmpty()) return "App";
        try {
            PackageManager pm = service.getPackageManager();
            ApplicationInfo ai = pm.getApplicationInfo(pkg, 0);
            CharSequence label = pm.getApplicationLabel(ai);
            if (label != null) return label.toString();
        } catch (Exception ignored) {}
        return pkg;
    }
}
