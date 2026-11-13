package com.stitch.iris.launcher;

import android.accessibilityservice.AccessibilityService;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.util.Log;
import android.util.TypedValue;
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
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

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
    private static final String KEY_BACKEND = "copilot_backend";
    private static final String KEY_API_KEY = "copilot_api_key";
    private static final String KEY_GEMINI_KEY = "copilot_gemini_key";
    private static final String KEY_GROQ_KEY = "copilot_groq_key";
    private static final String KEY_MODEL = "copilot_model";

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

    private boolean isPillAttached = false;
    private boolean isCardAttached = false;
    private String currentPackage = "";
    private String currentAppLabel = "";

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
    private TextView cardSubTitle;
    private LinearLayout resultsContainer;
    private LinearLayout quickActionsBar;
    private LinearLayout askLayout;
    private LinearLayout toneBar;
    private EditText customQuestionInput;
    private Button askSendBtn;
    private String inputMode = "ASK";
    private String composeTone = "AUTO";
    private final List<TextView> toneChipViews = new ArrayList<>();
    private View loadingIndicator;

    private AccessibilityNodeInfo lastTargetInputNode;
    private String lastExtractedContext = "";

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
        syncConfig(context, backend, apiKey, null, null, model);
    }

    public static void syncConfig(Context context, String backend, String apiKey, String geminiKey, String groqKey, String model) {
        if (context == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        if (backend != null) editor.putString(KEY_BACKEND, backend);
        if (apiKey != null && !apiKey.isEmpty()) editor.putString(KEY_API_KEY, apiKey);
        if (geminiKey != null && !geminiKey.isEmpty()) editor.putString(KEY_GEMINI_KEY, geminiKey);
        if (groqKey != null && !groqKey.isEmpty()) editor.putString(KEY_GROQ_KEY, groqKey);
        if (model != null) editor.putString(KEY_MODEL, model);
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
        layout.setPadding(dpToPx(14), dpToPx(12), dpToPx(14), dpToPx(12));

        cardBgDrawable = new GradientDrawable();
        cardBgDrawable.setShape(GradientDrawable.RECTANGLE);
        cardBgDrawable.setCornerRadius(dpToPx(18));
        int cardOpacity = Math.max(60, Math.min(95, pillOpacity + 28));
        cardBgDrawable.setColor(Color.argb((int) (cardOpacity / 100.0f * 255), 2, 6, 23));
        cardBgDrawable.setStroke(dpToPx(1.5f), Color.parseColor("#4400F2FF"));
        layout.setBackground(cardBgDrawable);

        // Header Row
        LinearLayout header = new LinearLayout(service);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        cardTitle = new TextView(service);
        cardTitle.setText("◈ IRIS COPILOT");
        cardTitle.setTextColor(Color.parseColor("#00F2FF"));
        cardTitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        cardTitle.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        header.addView(cardTitle, titleLp);

        // Refresh / Rescan button
        TextView refreshBtn = new TextView(service);
        refreshBtn.setText("🔄");
        refreshBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        refreshBtn.setPadding(dpToPx(6), dpToPx(4), dpToPx(8), dpToPx(4));
        refreshBtn.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            refreshContext();
            Toast.makeText(service, "Screen context refreshed", Toast.LENGTH_SHORT).show();
        });
        header.addView(refreshBtn);

        // Close button
        TextView closeBtn = new TextView(service);
        closeBtn.setText("✕");
        closeBtn.setTextColor(Color.parseColor("#88FFFFFF"));
        closeBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        closeBtn.setPadding(dpToPx(6), dpToPx(4), dpToPx(4), dpToPx(4));
        closeBtn.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            hideCard();
        });
        header.addView(closeBtn);
        layout.addView(header);

        // Context Subheader
        cardSubTitle = new TextView(service);
        cardSubTitle.setText("Analyzing active screen...");
        cardSubTitle.setTextColor(Color.parseColor("#77FFFFFF"));
        cardSubTitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9.5f);
        cardSubTitle.setTypeface(android.graphics.Typeface.MONOSPACE);
        cardSubTitle.setPadding(0, dpToPx(3), 0, dpToPx(8));
        layout.addView(cardSubTitle);

        // Quick Actions Scroll View
        HorizontalScrollView actionsScroll = new HorizontalScrollView(service);
        actionsScroll.setHorizontalScrollBarEnabled(false);
        quickActionsBar = new LinearLayout(service);
        quickActionsBar.setOrientation(LinearLayout.HORIZONTAL);

        quickActionsBar.addView(createActionPill("⚡ SMART REPLY", v -> executeAction("REPLY")));
        quickActionsBar.addView(createActionPill("✍️ COMPOSE", v -> openInputMode("COMPOSE")));
        quickActionsBar.addView(createActionPill("📝 SUMMARIZE", v -> executeAction("SUMMARIZE")));
        quickActionsBar.addView(createActionPill("✨ REWRITE", v -> executeAction("REWRITE")));
        quickActionsBar.addView(createActionPill("🔍 EXPLAIN", v -> executeAction("EXPLAIN")));
        quickActionsBar.addView(createActionPill("💬 ASK AI", v -> openInputMode("ASK")));

        actionsScroll.addView(quickActionsBar);
        layout.addView(actionsScroll);

        // Ask / Compose Input Area (Hidden by default)
        askLayout = new LinearLayout(service);
        askLayout.setOrientation(LinearLayout.VERTICAL);
        askLayout.setPadding(0, dpToPx(8), 0, 0);
        askLayout.setVisibility(View.GONE);

        // Tone Selector Bar (Shown in COMPOSE mode)
        toneBar = new LinearLayout(service);
        toneBar.setOrientation(LinearLayout.HORIZONTAL);
        toneBar.setPadding(0, 0, 0, dpToPx(6));
        String[] tones = new String[]{"AUTO", "PRO", "CASUAL", "SHORT"};
        toneChipViews.clear();
        for (String t : tones) {
            TextView chip = new TextView(service);
            chip.setText(t);
            chip.setTag(t);
            chip.setTextSize(TypedValue.COMPLEX_UNIT_SP, 8.5f);
            chip.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
            chip.setPadding(dpToPx(8), dpToPx(3), dpToPx(8), dpToPx(3));
            LinearLayout.LayoutParams chipLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            chipLp.setMargins(0, 0, dpToPx(6), 0);
            chip.setLayoutParams(chipLp);
            chip.setOnClickListener(v -> {
                v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
                composeTone = t;
                refreshToneChips();
            });
            toneChipViews.add(chip);
            toneBar.addView(chip);
        }
        refreshToneChips();
        askLayout.addView(toneBar);

        LinearLayout inputRow = new LinearLayout(service);
        inputRow.setOrientation(LinearLayout.HORIZONTAL);

        customQuestionInput = new EditText(service);
        customQuestionInput.setHint("Ask about this screen...");
        customQuestionInput.setHintTextColor(Color.parseColor("#55FFFFFF"));
        customQuestionInput.setTextColor(Color.WHITE);
        customQuestionInput.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        customQuestionInput.setBackgroundColor(Color.parseColor("#22FFFFFF"));
        customQuestionInput.setPadding(dpToPx(10), dpToPx(7), dpToPx(10), dpToPx(7));
        customQuestionInput.setSingleLine(true);
        LinearLayout.LayoutParams editLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        inputRow.addView(customQuestionInput, editLp);

        askSendBtn = new Button(service);
        askSendBtn.setText("ASK");
        askSendBtn.setTextColor(Color.BLACK);
        askSendBtn.setBackgroundColor(Color.parseColor("#00F2FF"));
        askSendBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        askSendBtn.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            String q = customQuestionInput.getText().toString().trim();
            if (!q.isEmpty()) {
                hideSoftKeyboard();
                restoreNotFocusable();
                if ("COMPOSE".equals(inputMode)) {
                    executeAction("COMPOSE:" + composeTone + ":" + q);
                } else {
                    executeAction("ASK:" + q);
                }
            }
        });
        inputRow.addView(askSendBtn);
        askLayout.addView(inputRow);
        layout.addView(askLayout);

        // Loading Indicator
        loadingIndicator = new TextView(service);
        ((TextView) loadingIndicator).setText("◈ Computing neural suggestions...");
        ((TextView) loadingIndicator).setTextColor(Color.parseColor("#00F2FF"));
        ((TextView) loadingIndicator).setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        ((TextView) loadingIndicator).setTypeface(android.graphics.Typeface.MONOSPACE);
        loadingIndicator.setPadding(0, dpToPx(8), 0, dpToPx(4));
        loadingIndicator.setVisibility(View.GONE);
        layout.addView(loadingIndicator);

        // Results Container
        ScrollView resultsScroll = new ScrollView(service);
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

        DisplayMetrics dm = service.getResources().getDisplayMetrics();
        int width = Math.min(dpToPx(350), dm.widthPixels - dpToPx(24));

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

        layout.setOnTouchListener((v, event) -> {
            if (event.getAction() == MotionEvent.ACTION_OUTSIDE) {
                hideCard();
                return true;
            }
            return false;
        });

        this.cardView = layout;
    }

    private View createActionPill(String title, View.OnClickListener onClick) {
        TextView tv = new TextView(service);
        tv.setText(title);
        tv.setTextColor(Color.parseColor("#DDF2FF"));
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9);
        tv.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
        tv.setPadding(dpToPx(10), dpToPx(6), dpToPx(10), dpToPx(6));

        GradientDrawable pillBg = new GradientDrawable();
        pillBg.setShape(GradientDrawable.RECTANGLE);
        pillBg.setCornerRadius(dpToPx(12));
        pillBg.setColor(Color.parseColor("#1800F2FF"));
        pillBg.setStroke(dpToPx(1), Color.parseColor("#4400F2FF"));
        tv.setBackground(pillBg);

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, dpToPx(6), 0);
        tv.setLayoutParams(lp);
        tv.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            onClick.onClick(v);
        });
        return tv;
    }

    private void refreshToneChips() {
        for (TextView chip : toneChipViews) {
            boolean active = composeTone.equals(chip.getTag());
            GradientDrawable chipBg = new GradientDrawable();
            chipBg.setShape(GradientDrawable.RECTANGLE);
            chipBg.setCornerRadius(dpToPx(8));
            chipBg.setColor(active ? Color.parseColor("#3300F2FF") : Color.parseColor("#11FFFFFF"));
            chipBg.setStroke(dpToPx(1), active ? Color.parseColor("#00F2FF") : Color.parseColor("#33FFFFFF"));
            chip.setBackground(chipBg);
            chip.setTextColor(active ? Color.parseColor("#00F2FF") : Color.parseColor("#99FFFFFF"));
        }
    }

    private void openInputMode(String mode) {
        if (askLayout == null || customQuestionInput == null) return;
        boolean sameMode = mode.equals(inputMode);
        boolean currentlyVisible = (askLayout.getVisibility() == View.VISIBLE);

        if (currentlyVisible && sameMode) {
            askLayout.setVisibility(View.GONE);
            hideSoftKeyboard();
            restoreNotFocusable();
            return;
        }

        inputMode = mode;
        boolean isCompose = "COMPOSE".equals(mode);
        if (toneBar != null) toneBar.setVisibility(isCompose ? View.VISIBLE : View.GONE);
        if (askSendBtn != null) askSendBtn.setText(isCompose ? "DRAFT" : "ASK");
        customQuestionInput.setHint(isCompose ? "What to write? (e.g. tell boss 15m late)" : "Ask about this screen...");
        customQuestionInput.setText("");

        askLayout.setVisibility(View.VISIBLE);
        cardParams.flags &= ~WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
        if (isCardAttached) windowManager.updateViewLayout(cardView, cardParams);

        customQuestionInput.requestFocus();
        if (autoKeyboard) {
            mainHandler.postDelayed(() -> {
                InputMethodManager imm = (InputMethodManager) service.getSystemService(Context.INPUT_METHOD_SERVICE);
                if (imm != null) {
                    imm.showSoftInput(customQuestionInput, InputMethodManager.SHOW_IMPLICIT);
                }
            }, 100);
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
        if (askLayout != null) askLayout.setVisibility(View.GONE);
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
        executor.shutdownNow();
    }

    public static class ScreenContextData {
        public String packageName = "";
        public String appName = "";
        public List<String> texts = new ArrayList<>();
        public String currentDraft = "";
        public AccessibilityNodeInfo inputNode = null;
        public boolean hasInput = false;
    }

    public ScreenContextData extractScreenContext() {
        ScreenContextData data = new ScreenContextData();
        AccessibilityNodeInfo root = service.getRootInActiveWindow();
        if (root == null) return data;

        data.packageName = root.getPackageName() != null ? root.getPackageName().toString() : currentPackage;
        data.appName = resolveAppLabel(data.packageName);

        List<AccessibilityNodeInfo> focusedHolder = new ArrayList<>();
        List<AccessibilityNodeInfo> editableHolder = new ArrayList<>();
        traverseTree(root, data.texts, focusedHolder, editableHolder);

        if (!focusedHolder.isEmpty()) {
            data.inputNode = focusedHolder.get(0);
            data.hasInput = true;
        } else if (!editableHolder.isEmpty()) {
            data.inputNode = editableHolder.get(0);
            data.hasInput = true;
        }

        if (data.inputNode != null) {
            CharSequence cs = data.inputNode.getText();
            data.currentDraft = cs != null ? cs.toString().trim() : "";
        }
        return data;
    }

    private void traverseTree(AccessibilityNodeInfo node, List<String> texts, List<AccessibilityNodeInfo> focusedHolder, List<AccessibilityNodeInfo> editableHolder) {
        if (node == null || !node.isVisibleToUser()) return;
        if (node.isPassword()) return; // Privacy protect password fields

        if (node.isEditable()) {
            if (node.isFocused() && focusedHolder.isEmpty()) {
                focusedHolder.add(node);
            } else if (editableHolder.isEmpty()) {
                editableHolder.add(node);
            }
        }

        CharSequence text = node.getText();
        if (text != null && text.length() > 0) {
            String s = text.toString().trim();
            if (!s.isEmpty() && s.length() > 1 && !texts.contains(s)) {
                texts.add(s);
            }
        }
        CharSequence desc = node.getContentDescription();
        if (desc != null && desc.length() > 0) {
            String s = desc.toString().trim();
            if (!s.isEmpty() && s.length() > 2 && !texts.contains(s)) {
                texts.add(s);
            }
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            traverseTree(node.getChild(i), texts, focusedHolder, editableHolder);
        }
    }

    private void refreshContext() {
        ScreenContextData data = extractScreenContext();
        this.lastTargetInputNode = data.inputNode;
        this.currentAppLabel = data.appName;

        String appLabel = data.appName.toUpperCase();
        cardTitle.setText("◈ IRIS // " + appLabel);

        int textCount = data.texts.size();
        String sub = textCount + " screen elements analyzed";
        if (data.hasInput) {
            sub += " • Draft detected (" + (data.currentDraft.isEmpty() ? "empty" : data.currentDraft.length() + " chars") + ")";
        }
        cardSubTitle.setText(sub);

        StringBuilder sb = new StringBuilder();
        sb.append("Application: ").append(data.appName).append(" (").append(data.packageName).append(")\n");
        if (data.hasInput && !data.currentDraft.isEmpty()) {
            sb.append("Current Draft in Input Box: \"").append(data.currentDraft).append("\"\n");
        }
        sb.append("Visible Screen Content:\n");
        int start = Math.max(0, data.texts.size() - 30);
        for (int i = start; i < data.texts.size(); i++) {
            sb.append("- ").append(data.texts.get(i)).append("\n");
        }
        this.lastExtractedContext = sb.toString();
        resultsContainer.removeAllViews();
    }

    private void executeAction(String action) {
        loadingIndicator.setVisibility(View.VISIBLE);
        resultsContainer.removeAllViews();

        executor.execute(() -> {
            try {
                String systemPrompt = "You are Iris Copilot, a sharp cybernetic AI assistant analyzing an Android app screen. Respond directly, concisely, and naturally without filler words.";
                String userPrompt = "";

                if ("REPLY".equals(action)) {
                    systemPrompt = "You are Iris Copilot. Based on the screen conversation, generate 3 highly context-relevant, natural, concise smart replies. Return ONLY a JSON array of 3 strings: [\"reply1\", \"reply2\", \"reply3\"]. No markdown wrapper, no filler.";
                    userPrompt = lastExtractedContext + "\nGenerate 3 smart replies for the current conversation:";
                } else if ("SUMMARIZE".equals(action)) {
                    systemPrompt = "You are Iris Copilot. Summarize the key information visible on this screen into 3 crisp, insightful bullet points. Format with markdown bullets (- ).";
                    userPrompt = lastExtractedContext + "\nSummarize this screen:";
                } else if ("REWRITE".equals(action)) {
                    systemPrompt = "You are Iris Copilot. Take the user's current draft from the screen context and generate 3 improved alternatives: 1. Polished & Professional, 2. Casual & Friendly, 3. Short & Direct. Return ONLY a JSON array of 3 strings: [\"version1\", \"version2\", \"version3\"].";
                    userPrompt = lastExtractedContext + "\nRewrite this draft:";
                } else if ("EXPLAIN".equals(action)) {
                    systemPrompt = "You are Iris Copilot. Explain the core concept, error, message, or content visible on this screen in simple, direct, clear terms in 2-3 sentences.";
                    userPrompt = lastExtractedContext + "\nExplain what is on this screen:";
                } else if (action.startsWith("COMPOSE:")) {
                    String rest = action.substring("COMPOSE:".length());
                    int colonIdx = rest.indexOf(':');
                    String tone = colonIdx > 0 ? rest.substring(0, colonIdx) : "AUTO";
                    String instruction = colonIdx > 0 ? rest.substring(colonIdx + 1) : rest;
                    String toneDesc = "PRO".equals(tone) ? "polished and professional"
                            : "CASUAL".equals(tone) ? "warm, casual, and friendly"
                            : "SHORT".equals(tone) ? "concise and direct"
                            : "natural and fitting for the app";
                    systemPrompt = "You are Iris Copilot, a sharp message composer. Based on the user's instruction, target tone (" + toneDesc + "), and active app/screen context, generate 3 ready-to-send message drafts. Return ONLY a JSON array of 3 strings: [\"draft1\", \"draft2\", \"draft3\"]. No markdown wrapper, no filler.";
                    userPrompt = lastExtractedContext + "\nCompose a message for this instruction: " + instruction;
                } else if (action.startsWith("ASK:")) {
                    String question = action.substring("ASK:".length());
                    userPrompt = lastExtractedContext + "\nUser Question: " + question;
                }

                String response = queryLLMDirect(systemPrompt, userPrompt);
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

        // 1. Try JSON Array parsing
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

        // 2. If JSON parsing found nothing, try line-by-line bullet or numbered list
        if (items.isEmpty() && ("REPLY".equals(action) || "REWRITE".equals(action) || action.startsWith("COMPOSE:") || raw.contains("\n1.") || raw.contains("\n- "))) {
            String[] lines = raw.split("\n");
            for (String line : lines) {
                String trimmed = line.trim();
                if (trimmed.isEmpty()) continue;
                // Strip 1., 2., -, *, etc.
                String cleaned = trimmed.replaceFirst("^(?:\\d+[.)]|[-*•])\\s*", "").replaceAll("^\"|\"$", "").trim();
                if (cleaned.length() > 2) {
                    items.add(cleaned);
                }
            }
        }

        // 3. Render items
        if (!items.isEmpty()) {
            for (String item : items) {
                addSuggestionCard(item);
            }
        } else {
            addTextCard(raw);
        }
    }

    private void addSuggestionCard(String suggestion) {
        LinearLayout card = new LinearLayout(service);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dpToPx(10), dpToPx(8), dpToPx(10), dpToPx(8));

        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.RECTANGLE);
        bg.setCornerRadius(dpToPx(10));
        bg.setColor(Color.parseColor("#1C00F2FF"));
        bg.setStroke(dpToPx(1), Color.parseColor("#3300F2FF"));
        card.setBackground(bg);

        TextView tv = new TextView(service);
        tv.setText(suggestion);
        tv.setTextColor(Color.WHITE);
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        card.addView(tv);

        LinearLayout btnRow = new LinearLayout(service);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);
        btnRow.setGravity(Gravity.END);
        btnRow.setPadding(0, dpToPx(6), 0, 0);

        TextView copyBtn = new TextView(service);
        copyBtn.setText("COPY");
        copyBtn.setTextColor(Color.parseColor("#8800F2FF"));
        copyBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9);
        copyBtn.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
        copyBtn.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));
        copyBtn.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            copyToClipboard(suggestion);
            Toast.makeText(service, "Copied to clipboard", Toast.LENGTH_SHORT).show();
        });
        btnRow.addView(copyBtn);

        TextView injectBtn = new TextView(service);
        injectBtn.setText("INSERT ↵");
        injectBtn.setTextColor(Color.BLACK);
        injectBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9);
        injectBtn.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
        injectBtn.setPadding(dpToPx(10), dpToPx(4), dpToPx(10), dpToPx(4));

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

        btnRow.addView(injectBtn);
        card.addView(btnRow);

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, 0, dpToPx(6));
        resultsContainer.addView(card, lp);
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
        card.addView(tv);

        LinearLayout btnRow = new LinearLayout(service);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);
        btnRow.setGravity(Gravity.END);
        btnRow.setPadding(0, dpToPx(6), 0, 0);

        TextView copyBtn = new TextView(service);
        copyBtn.setText("COPY");
        copyBtn.setTextColor(Color.parseColor("#8800F2FF"));
        copyBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 8.5f);
        copyBtn.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
        copyBtn.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));
        copyBtn.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            copyToClipboard(content);
            Toast.makeText(service, "Copied to clipboard", Toast.LENGTH_SHORT).show();
        });
        btnRow.addView(copyBtn);

        TextView insertBtn = new TextView(service);
        insertBtn.setText("INSERT ↵");
        insertBtn.setTextColor(Color.parseColor("#00F2FF"));
        insertBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 8.5f);
        insertBtn.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
        insertBtn.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));
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
        copyToClipboard(text); // Always copy to clipboard as safe baseline

        AccessibilityNodeInfo target = lastTargetInputNode;
        if (target == null || !target.refresh() || !target.isEditable()) {
            AccessibilityNodeInfo root = service.getRootInActiveWindow();
            if (root != null) {
                target = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
                if (target == null || !target.isEditable()) {
                    List<AccessibilityNodeInfo> fHolder = new ArrayList<>();
                    List<AccessibilityNodeInfo> eHolder = new ArrayList<>();
                    traverseTree(root, new ArrayList<>(), fHolder, eHolder);
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
                // Fallback to accessibility paste action
                ok = target.performAction(AccessibilityNodeInfo.ACTION_PASTE);
            }
            return ok;
        }
        return false;
    }

    private void copyToClipboard(String text) {
        try {
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

        // Dynamic key fallback
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
            URL url = new URL("https://api.groq.com/openai/v1/chat/completions");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + effectiveKey.trim());
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(14000);
            conn.setDoOutput(true);

            JSONObject body = new JSONObject();
            body.put("model", "llama-3.3-70b-versatile");
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
        } else {
            // Default Gemini
            String cleanModel = model != null && !model.isEmpty() ? model : "gemini-2.5-flash";
            URL url = new URL("https://generativelanguage.googleapis.com/v1beta/models/" + cleanModel + ":generateContent");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("x-goog-api-key", effectiveKey.trim());
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
