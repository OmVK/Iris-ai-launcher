package com.stitch.iris.launcher;

import android.accessibilityservice.AccessibilityService;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
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
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityNodeInfo;
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
    private static final String PREFS_NAME = "iris_copilot_prefs";
    private static final String KEY_ENABLED = "copilot_enabled";
    private static final String KEY_BACKEND = "copilot_backend";
    private static final String KEY_API_KEY = "copilot_api_key";
    private static final String KEY_MODEL = "copilot_model";

    private static IrisFloatingCopilot instance;
    private final AccessibilityService service;
    private final WindowManager windowManager;
    private final Handler mainHandler;
    private final ExecutorService executor;

    private boolean isEnabled = true;
    private boolean isPillAttached = false;
    private boolean isCardAttached = false;
    private String currentPackage = "";

    private View pillView;
    private WindowManager.LayoutParams pillParams;
    private View cardView;
    private WindowManager.LayoutParams cardParams;

    private TextView cardTitle;
    private TextView cardSubTitle;
    private LinearLayout resultsContainer;
    private LinearLayout quickActionsBar;
    private EditText customQuestionInput;
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

        SharedPreferences prefs = service.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.isEnabled = prefs.getBoolean(KEY_ENABLED, true);

        createPillView();
        createCardView();
    }

    public void onPackageChanged(String newPackage) {
        if (newPackage == null) return;
        this.currentPackage = newPackage;
        mainHandler.post(() -> {
            if (!isEnabled || newPackage.equals(service.getPackageName()) || newPackage.equals("com.android.systemui")) {
                hidePill();
                hideCard();
            } else {
                showPill();
            }
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
            } else if (!currentPackage.equals(service.getPackageName()) && !currentPackage.isEmpty()) {
                showPill();
            }
        });
    }

    public boolean isEnabled() {
        return isEnabled;
    }

    public static void syncConfig(Context context, String backend, String apiKey, String model) {
        if (context == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        if (backend != null) editor.putString(KEY_BACKEND, backend);
        if (apiKey != null) editor.putString(KEY_API_KEY, apiKey);
        if (model != null) editor.putString(KEY_MODEL, model);
        editor.apply();
    }

    private int dpToPx(int dp) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, service.getResources().getDisplayMetrics());
    }

    private void createPillView() {
        FrameLayout frame = new FrameLayout(service);
        int size = dpToPx(44);

        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.OVAL);
        bg.setColor(Color.parseColor("#E6020617")); // dark glass
        bg.setStroke(dpToPx(1), Color.parseColor("#00F2FF")); // glowing cyan
        frame.setBackground(bg);

        TextView iconText = new TextView(service);
        iconText.setText("◈");
        iconText.setTextColor(Color.parseColor("#00F2FF"));
        iconText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        iconText.setGravity(Gravity.CENTER);
        FrameLayout.LayoutParams textParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
        frame.addView(iconText, textParams);

        pillParams = new WindowManager.LayoutParams(
                size, size,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
        );
        pillParams.gravity = Gravity.TOP | Gravity.END;
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
                        initialX = pillParams.x;
                        initialY = pillParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        touchStartTime = System.currentTimeMillis();
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        pillParams.x = initialX - (int) (event.getRawX() - initialTouchX);
                        pillParams.y = initialY + (int) (event.getRawY() - initialTouchY);
                        if (isPillAttached) windowManager.updateViewLayout(pillView, pillParams);
                        return true;

                    case MotionEvent.ACTION_UP:
                        long duration = System.currentTimeMillis() - touchStartTime;
                        float diffX = Math.abs(event.getRawX() - initialTouchX);
                        float diffY = Math.abs(event.getRawY() - initialTouchY);

                        if (duration < 250 && diffX < 15 && diffY < 15) {
                            toggleCard();
                        } else {
                            // Snap to edge
                            pillParams.x = dpToPx(12);
                            if (isPillAttached) windowManager.updateViewLayout(pillView, pillParams);
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

        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.RECTANGLE);
        bg.setCornerRadius(dpToPx(18));
        bg.setColor(Color.parseColor("#F2020617")); // 95% dark
        bg.setStroke(dpToPx(1), Color.parseColor("#3300F2FF"));
        layout.setBackground(bg);

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

        TextView closeBtn = new TextView(service);
        closeBtn.setText("✕");
        closeBtn.setTextColor(Color.parseColor("#88FFFFFF"));
        closeBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        closeBtn.setPadding(dpToPx(8), dpToPx(4), dpToPx(4), dpToPx(4));
        closeBtn.setOnClickListener(v -> hideCard());
        header.addView(closeBtn);
        layout.addView(header);

        // Context Subheader
        cardSubTitle = new TextView(service);
        cardSubTitle.setText("Analyzing active screen...");
        cardSubTitle.setTextColor(Color.parseColor("#66FFFFFF"));
        cardSubTitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9);
        cardSubTitle.setTypeface(android.graphics.Typeface.MONOSPACE);
        cardSubTitle.setPadding(0, dpToPx(2), 0, dpToPx(8));
        layout.addView(cardSubTitle);

        // Quick Actions Scroll View
        HorizontalScrollView actionsScroll = new HorizontalScrollView(service);
        actionsScroll.setHorizontalScrollBarEnabled(false);
        quickActionsBar = new LinearLayout(service);
        quickActionsBar.setOrientation(LinearLayout.HORIZONTAL);

        quickActionsBar.addView(createActionPill("⚡ SMART REPLY", v -> executeAction("REPLY")));
        quickActionsBar.addView(createActionPill("📝 SUMMARIZE", v -> executeAction("SUMMARIZE")));
        quickActionsBar.addView(createActionPill("✨ REWRITE", v -> executeAction("REWRITE")));
        quickActionsBar.addView(createActionPill("💬 ASK AI", v -> toggleAskInput()));

        actionsScroll.addView(quickActionsBar);
        layout.addView(actionsScroll);

        // Ask Input Area (Hidden by default)
        LinearLayout askLayout = new LinearLayout(service);
        askLayout.setOrientation(LinearLayout.HORIZONTAL);
        askLayout.setPadding(0, dpToPx(8), 0, 0);
        askLayout.setVisibility(View.GONE);

        customQuestionInput = new EditText(service);
        customQuestionInput.setHint("Ask about this screen...");
        customQuestionInput.setHintTextColor(Color.parseColor("#44FFFFFF"));
        customQuestionInput.setTextColor(Color.WHITE);
        customQuestionInput.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        customQuestionInput.setBackgroundColor(Color.parseColor("#22FFFFFF"));
        customQuestionInput.setPadding(dpToPx(10), dpToPx(6), dpToPx(10), dpToPx(6));
        LinearLayout.LayoutParams editLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        askLayout.addView(customQuestionInput, editLp);

        Button askSendBtn = new Button(service);
        askSendBtn.setText("ASK");
        askSendBtn.setTextColor(Color.BLACK);
        askSendBtn.setBackgroundColor(Color.parseColor("#00F2FF"));
        askSendBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        askSendBtn.setOnClickListener(v -> {
            String q = customQuestionInput.getText().toString().trim();
            if (!q.isEmpty()) {
                executeAction("ASK:" + q);
            }
        });
        askLayout.addView(askSendBtn);
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
        int width = Math.min(dpToPx(340), dm.widthPixels - dpToPx(32));

        cardParams = new WindowManager.LayoutParams(
                width,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
                PixelFormat.TRANSLUCENT
        );
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
        pillBg.setColor(Color.parseColor("#1500F2FF"));
        pillBg.setStroke(dpToPx(1), Color.parseColor("#4400F2FF"));
        tv.setBackground(pillBg);

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, dpToPx(6), 0);
        tv.setLayoutParams(lp);
        tv.setOnClickListener(onClick);
        return tv;
    }

    private void toggleAskInput() {
        if (customQuestionInput.getParent() instanceof View) {
            View askLayout = (View) customQuestionInput.getParent();
            askLayout.setVisibility(askLayout.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE);
        }
    }

    public void showPill() {
        if (!isPillAttached && pillView != null) {
            try {
                windowManager.addView(pillView, pillParams);
                isPillAttached = true;
            } catch (Exception e) {
                Log.e(TAG, "Error adding pill view", e);
            }
        }
    }

    public void hidePill() {
        if (isPillAttached && pillView != null) {
            try {
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
        if (!isCardAttached && cardView != null) {
            try {
                refreshContext();
                windowManager.addView(cardView, cardParams);
                isCardAttached = true;
            } catch (Exception e) {
                Log.e(TAG, "Error adding card view", e);
            }
        }
    }

    public void hideCard() {
        if (isCardAttached && cardView != null) {
            try {
                windowManager.removeView(cardView);
                isCardAttached = false;
            } catch (Exception e) {
                Log.e(TAG, "Error removing card view", e);
            }
        }
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

        List<AccessibilityNodeInfo> inputHolder = new ArrayList<>();
        traverseTree(root, data.texts, inputHolder);

        if (!inputHolder.isEmpty()) {
            data.inputNode = inputHolder.get(0);
            data.hasInput = true;
            CharSequence cs = data.inputNode.getText();
            data.currentDraft = cs != null ? cs.toString().trim() : "";
        }
        return data;
    }

    private void traverseTree(AccessibilityNodeInfo node, List<String> texts, List<AccessibilityNodeInfo> inputHolder) {
        if (node == null || !node.isVisibleToUser()) return;
        if (node.isPassword()) return; // Privacy protect password fields

        if (node.isEditable() && node.isFocused() && inputHolder.isEmpty()) {
            inputHolder.add(node);
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
            traverseTree(node.getChild(i), texts, inputHolder);
        }
    }

    private void refreshContext() {
        ScreenContextData data = extractScreenContext();
        this.lastTargetInputNode = data.inputNode;

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
            sb.append("Current Draft in Input: \"").append(data.currentDraft).append("\"\n");
        }
        sb.append("Visible Screen Content:\n");
        for (int i = Math.max(0, data.texts.size() - 25); i < data.texts.size(); i++) {
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
                    systemPrompt = "You are Iris Copilot. Based on the screen conversation, generate 3 highly context-relevant, natural, concise smart replies. Return ONLY a JSON array of 3 strings: [\"reply1\", \"reply2\", \"reply3\"]. No markdown, no filler.";
                    userPrompt = lastExtractedContext + "\nGenerate 3 smart replies for the current conversation:";
                } else if ("SUMMARIZE".equals(action)) {
                    systemPrompt = "You are Iris Copilot. Summarize the key information visible on this screen into 3 crisp, insightful bullet points. Format with markdown bullets (- ).";
                    userPrompt = lastExtractedContext + "\nSummarize this screen:";
                } else if ("REWRITE".equals(action)) {
                    systemPrompt = "You are Iris Copilot. Take the user's current draft from the screen context and generate 3 improved alternatives: 1. Polished & Professional, 2. Casual & Friendly, 3. Short & Direct. Return ONLY a JSON array of 3 strings: [\"version1\", \"version2\", \"version3\"].";
                    userPrompt = lastExtractedContext + "\nRewrite this draft:";
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
                    displayError("Query failed: " + e.getMessage());
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

        // Try parsing JSON array for suggestions
        boolean isList = false;
        try {
            String cleanJson = text.trim();
            if (cleanJson.startsWith("```json")) {
                cleanJson = cleanJson.substring(7);
                if (cleanJson.endsWith("```")) cleanJson = cleanJson.substring(0, cleanJson.length() - 3);
            }
            cleanJson = cleanJson.trim();

            if (cleanJson.startsWith("[") && cleanJson.endsWith("]")) {
                JSONArray arr = new JSONArray(cleanJson);
                for (int i = 0; i < arr.length(); i++) {
                    String item = arr.getString(i);
                    addSuggestionCard(item);
                }
                isList = true;
            }
        } catch (Exception ignored) {}

        if (!isList) {
            addTextCard(text);
        }
    }

    private void addSuggestionCard(String suggestion) {
        LinearLayout card = new LinearLayout(service);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dpToPx(10), dpToPx(8), dpToPx(10), dpToPx(8));

        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.RECTANGLE);
        bg.setCornerRadius(dpToPx(10));
        bg.setColor(Color.parseColor("#1A00F2FF"));
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
            boolean success = injectText(suggestion);
            Toast.makeText(service, success ? "Inserted into app" : "Copied to clipboard", Toast.LENGTH_SHORT).show();
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

        TextView copyBtn = new TextView(service);
        copyBtn.setText("COPY TO CLIPBOARD");
        copyBtn.setTextColor(Color.parseColor("#00F2FF"));
        copyBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 8.5f);
        copyBtn.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
        copyBtn.setPadding(0, dpToPx(6), 0, 0);
        copyBtn.setOnClickListener(v -> {
            copyToClipboard(content);
            Toast.makeText(service, "Copied to clipboard", Toast.LENGTH_SHORT).show();
        });
        card.addView(copyBtn);

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        resultsContainer.addView(card, lp);
    }

    private void displayError(String msg) {
        TextView tv = new TextView(service);
        tv.setText(msg);
        tv.setTextColor(Color.parseColor("#FF5252"));
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        tv.setPadding(0, dpToPx(6), 0, 0);
        resultsContainer.addView(tv);
    }

    public boolean injectText(String text) {
        if (text == null) return false;
        copyToClipboard(text); // Always copy as safe fallback

        AccessibilityNodeInfo target = lastTargetInputNode;
        if (target == null || !target.refresh()) {
            AccessibilityNodeInfo root = service.getRootInActiveWindow();
            if (root != null) {
                target = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
            }
        }

        if (target != null && target.isEditable()) {
            Bundle args = new Bundle();
            args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text);
            return target.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
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
        String model = prefs.getString(KEY_MODEL, "gemini-2.5-flash");

        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new Exception("No API key configured in IRIS Settings");
        }

        if ("GROQ".equalsIgnoreCase(backend)) {
            URL url = new URL("https://api.groq.com/openai/v1/chat/completions");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + apiKey.trim());
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(12000);
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
            conn.setRequestProperty("x-goog-api-key", apiKey.trim());
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(12000);
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

