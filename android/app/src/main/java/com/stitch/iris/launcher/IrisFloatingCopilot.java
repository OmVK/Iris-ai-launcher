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
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.SweepGradient;
import android.graphics.drawable.GradientDrawable;
import android.hardware.HardwareBuffer;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.util.Log;
import android.util.TypedValue;
import android.view.Choreographer;
import android.view.Display;
import android.view.Gravity;
import android.view.HapticFeedbackConstants;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityNodeInfo;
import android.view.accessibility.AccessibilityWindowInfo;
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
    public static final String KEY_MEMORY_VAULT = "copilot_long_term_memory_v1";
    public static final String KEY_CONVERSATION_HISTORY = "copilot_conversation_history_v1";

    private static final Pattern OTP_PATTERN = Pattern.compile("(?i)(?:otp|code|pin|verification|passcode|auth)[^0-9]{0,20}\\b(\\d{4,8})\\b|\\b(\\d{4,8})\\b[^0-9]{0,20}(?:is your|verification|otp|code)");
    private static final Pattern URL_PATTERN = Pattern.compile("https?://[^\\s\"<>()]+");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
    private static final Pattern PHONE_PATTERN = Pattern.compile("(?:\\+\\d{1,3}[\\s-]?)?(?:\\(\\d{2,4}\\)|\\d{2,4})[\\s.-]?\\d{3,4}[\\s.-]?\\d{3,4}");
    private static final Pattern COMPOSE_INTENT_PATTERN = Pattern.compile("(?i)^(?:write|tell|reply|compose|draft|message|email|say|send|text|let\\s+\\w+\\s+know|ask\\s+\\w+\\s+to)\\b");
    private static final Pattern CHAT_TIMESTAMP_NOISE_PATTERN = Pattern.compile("(?i)^(?:\\d{1,2}:\\d{2}(?:\\s*[ap]m)?(?:\\s*[✓✔•editedreadseen]*)?|delivered|read|seen|sent|edited|typing\\.{0,3}|online|active\\s+now|last\\s+seen.*|tap\\s+here\\s+for\\s+contact\\s+info.*|end-to-end\\s+encrypted.*|message\\.{0,3}|type\\s+a\\s+message\\.{0,3}|write\\s+a\\s+message\\.{0,3}|reply\\.{0,3}|add\\s+a\\s+caption\\.{0,3}|back|navigate\\s+up|voice\\s+message|emoji|attach|camera|more\\s+options|call|video\\s+call|audio\\s+call|search|mute|pinned\\s+message)$");
    private static final Pattern CHAT_DATE_DIVIDER_PATTERN = Pattern.compile("(?i)^(?:today|yesterday|\\d+\\s+unread\\s+messages?|unread\\s+messages?|new\\s+messages?|monday|tuesday|wednesday|thursday|friday|saturday|sunday|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\s+\\d{1,2}(?:,?\\s+\\d{4})?)$");
    private static final Pattern TOPIC_CLOSURE_PATTERN = Pattern.compile("(?i)^(?:ok(?:ay)?|k+|done|got\\s+it|noted|thanks(?:\\s+a\\s+lot|\\s+bro|\\s+man|\\s+yaar)?|thank\\s+you(?:\\s+so\\s+much)?|thx|tysm|sounds\\s+good|all\\s+good|cool|alright|perfect|great(?:\\s+thanks)?|awesome|nice|sure(?:\\s+thing)?|no\\s+problem|np|welcome|you're\\s+welcome|see\\s+ya|see\\s+you(?:\\s+soon|\\s+later|\\s+tomorrow)?|bye+|good\\s+night|gn|take\\s+care|tc|haan\\s+ok|theek\\s+hai|accha\\s+ok|👍+|🙏+|✅+|👌+|❤️+)[.!\\s👍🙏✅👌]*$");
    private static final Pattern NEW_TOPIC_OPENER_PATTERN = Pattern.compile("(?i)^(?:btw\\b|by\\s+the\\s+way\\b|also\\b|anyway\\b|on\\s+another\\s+note\\b|quick\\s+question\\b|one\\s+more\\s+thing\\b|hey\\b|hi\\b|hello\\b|yo\\b|listen\\b|sun\\b|suno\\b|bhai\\s+ek\\s+baat\\b|good\\s+morning\\b|good\\s+evening\\b|gm\\b|are\\s+you\\s+free\\b|what\\s+are\\s+you\\s+doing\\b|where\\s+are\\s+you\\b).*");
    private static final Pattern TRAILING_TIME_CLEANER = Pattern.compile("\\s+\\d{1,2}:\\d{2}(?:\\s*[aApP][mM])?(?:\\s*[✓✔]+)?$");

    private static IrisFloatingCopilot instance;
    private final AccessibilityService service;
    private final WindowManager windowManager;
    private final Handler mainHandler;
    private final ExecutorService executor;

    private boolean isEnabled = true;
    private int pillOpacity = 55;
    private int timeoutSec = 3;
    private boolean showOnHome = false;
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
    private String lastForegroundAppPackage = "";
    private long lastSystemUiOverlayTimestamp = 0L;
    private String currentAppLabel = "";
    private String currentScreenMode = "GENERAL";

    private View pillView;
    private TextView pillIconText;
    private GradientDrawable pillBgDrawable;
    private WindowManager.LayoutParams pillParams;
    private View cardView;
    private LinearLayout cardInnerLayout;
    private GradientDrawable cardBgDrawable;
    private WindowManager.LayoutParams cardParams;

    private final Runnable autoHideRunnable = () -> {
        if (!isCardAttached && isPillAttached) {
            hidePill();
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
    private android.content.BroadcastReceiver lockStateReceiver;

    // 120Hz In-App Aurora Edge-Glow Screen-Reading Assistant state
    private FrameLayout auroraOverlayRoot;
    private View auroraBorderGlowView;
    private WindowManager.LayoutParams auroraParams;
    private boolean isAuroraAttached = false;
    private int auroraModeState = 0; // 0 = LISTENING, 1 = THINKING, 2 = SPEAKING, 3 = IDLE
    private float auroraVoiceLevel = 0f;
    private TextView auroraStatusBadge;
    private TextView auroraUserTranscriptView;
    private TextView auroraAiResponseView;
    private TextView auroraMicButton;
    private TextView auroraInjectButton;
    private String lastAuroraDraftReply = "";
    private ScreenContextData lastAuroraScreenContext;
    private SpeechRecognizer auroraSpeechRecognizer;
    private boolean isAuroraListening = false;
    private TextToSpeech auroraTts;
    private boolean isAuroraTtsReady = false;
    private int auroraFollowupCount = 0;

    public static boolean isScreenLocked(Context ctx) {
        if (ctx == null) return true;
        try {
            android.app.KeyguardManager km = (android.app.KeyguardManager) ctx.getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) {
                if (km.isKeyguardLocked()) return true;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1 && km.isDeviceLocked()) return true;
            }
            android.os.PowerManager pm = (android.os.PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            if (pm != null && !pm.isInteractive()) return true;
        } catch (Exception ignored) {}
        return false;
    }

    public static synchronized void initialize(AccessibilityService service) {
        if (instance != null && instance.service != service) {
            try {
                instance.cleanup();
            } catch (Exception ignored) {}
            instance = null;
        }
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
        createAuroraOverlayView();
        initAuroraTts();
        updateVisualStyles();
        registerClipboardTrigger();
        registerLockStateReceiver();
    }

    private void registerLockStateReceiver() {
        try {
            lockStateReceiver = new android.content.BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (intent == null || intent.getAction() == null) return;
                    String act = intent.getAction();
                    if (Intent.ACTION_SCREEN_OFF.equals(act) || isScreenLocked(service)) {
                        mainHandler.post(() -> {
                            hideCard();
                            hidePill();
                        });
                    }
                }
            };
            android.content.IntentFilter filter = new android.content.IntentFilter();
            filter.addAction(Intent.ACTION_SCREEN_OFF);
            filter.addAction(Intent.ACTION_SCREEN_ON);
            filter.addAction(Intent.ACTION_USER_PRESENT);
            service.registerReceiver(lockStateReceiver, filter);
        } catch (Exception ignored) {}
    }

    private boolean isTransientSystemOrKeyboardPackage(String pkg) {
        if (pkg == null || pkg.isEmpty()) return true;
        String lower = pkg.toLowerCase();
        return lower.equals("com.android.systemui")
                || lower.contains("inputmethod")
                || lower.contains("honeyboard")
                || lower.contains("gboard")
                || lower.contains("swiftkey")
                || lower.contains("keyboard")
                || lower.contains("cocktailbarservice")
                || lower.contains("permissioncontroller")
                || lower.contains("packageinstaller")
                || lower.contains("biometrics")
                || lower.contains("security.enhancer")
                || lower.equals("android");
    }

    private boolean isBlockedNonCopilotApp(String pkg) {
        if (pkg == null || pkg.isEmpty()) return true;
        if (pkg.equals(service.getPackageName())) return true;
        String lower = pkg.toLowerCase();
        // Launchers & System Utilities
        if (lower.contains("launcher") || lower.contains("miui.home") || lower.contains("systemui")
                || lower.contains("settings") || lower.contains("vending") || lower.contains("galaxyapps")
                || lower.contains("camera") || lower.contains("gallery") || lower.contains("photos")
                || lower.contains("deskclock") || lower.contains(".clock") || lower.contains("calculator")
                || lower.contains("dialer") || lower.contains("incallui") || lower.contains("contacts")
                || lower.contains("myfiles") || lower.contains("filemanager") || lower.contains("weather")
                || lower.contains("authenticator")) {
            return true;
        }
        // Video, Music & Media Streaming Apps
        if (lower.contains("youtube") || lower.contains("spotify") || lower.contains("netflix")
                || lower.contains("avod") || lower.contains("primevideo") || lower.contains("hotstar")
                || lower.contains("jiocinema") || lower.contains("jiobeats") || lower.contains("jiosaavn")
                || lower.contains("gaana") || lower.contains("wynk") || lower.contains("soundcloud")
                || lower.contains("apple.android.music") || lower.contains("shazam") || lower.contains("vlc")
                || lower.contains("videoplayer") || lower.contains("mxtech") || lower.contains("plex")
                || lower.contains("twitch") || lower.contains("tiktok") || lower.contains("musically")) {
            return true;
        }
        // Shopping, E-Commerce, Food Delivery, Ride & Travel Apps
        if (lower.contains("amazon.mshop") || lower.contains("in.amazon") || lower.contains("windowshop")
                || lower.contains("flipkart") || lower.contains("myntra") || lower.contains("meesho")
                || lower.contains("ajio") || lower.contains("nykaa") || lower.contains("tatacliq")
                || lower.contains("ebay") || lower.contains("alibaba") || lower.contains("aliexpress")
                || lower.contains("shein") || lower.contains("temu") || lower.contains("swiggy")
                || lower.contains("zomato") || lower.contains("blinkit") || lower.contains("grofers")
                || lower.contains("zepto") || lower.contains("bigbasket") || lower.contains("dunzo")
                || lower.contains("ubercab") || lower.contains("olacabs") || lower.contains("rapido")
                || lower.contains("makemytrip") || lower.contains("goibibo") || lower.contains("irctc")
                || lower.contains("booking") || lower.contains("airbnb") || lower.contains("apps.maps")
                || lower.contains("waze")) {
            return true;
        }
        // Banking, UPI & Payment Apps
        if (lower.contains("paisa.user") || lower.contains("phonepe") || lower.contains("paytm")
                || lower.contains("bharatpe") || lower.contains("cred") || lower.contains("freecharge")
                || lower.contains("mobikwik") || lower.contains("paypal") || lower.contains("binance")
                || lower.contains("coinbase") || lower.contains("zerodha") || lower.contains("groww")
                || lower.contains("upstox") || lower.contains("bank") || lower.contains("upi")) {
            return true;
        }
        return false;
    }

    private boolean isCopilotTargetApp(String pkg) {
        if (pkg == null || pkg.isEmpty()) return false;
        if (isTransientSystemOrKeyboardPackage(pkg)) return false;
        if (isBlockedNonCopilotApp(pkg)) return false;
        return true;
    }

    private void registerClipboardTrigger() {
        try {
            ClipboardManager cm = (ClipboardManager) service.getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) {
                cm.addPrimaryClipChangedListener(() -> {
                    if (!isEnabled || !clipboardTrigger || isScreenLocked(service)) return;
                    if (!isCopilotTargetApp(currentPackage)) return;
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
        this.showOnHome = false;
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
            } else {
                syncKeyboardState(null, false);
            }
        });
    }

    private int getPillWidthDp() {
        if ("COMPACT".equalsIgnoreCase(pillSize)) return 46;
        if ("LARGE".equalsIgnoreCase(pillSize)) return 64;
        return 54;
    }

    private int getPillHeightDp() {
        if ("COMPACT".equalsIgnoreCase(pillSize)) return 64;
        if ("LARGE".equalsIgnoreCase(pillSize)) return 88;
        return 76;
    }

    private void applyEdgeTabCornerRadii(boolean isLeft) {
        if (pillBgDrawable == null) return;
        pillBgDrawable.setColor(Color.TRANSPARENT);
        pillBgDrawable.setStroke(0, Color.TRANSPARENT);
    }

    private void updateVisualStyles() {
        boolean isLeft = "LEFT".equalsIgnoreCase(edgeSide);
        if (pillBgDrawable != null) {
            applyEdgeTabCornerRadii(isLeft);
        }
        int cardOpacity = Math.max(60, Math.min(95, pillOpacity + 28));
        int cardAlpha = (int) (cardOpacity / 100.0f * 255);
        if (cardBgDrawable != null) {
            cardBgDrawable.setColor(Color.argb(cardAlpha, 4, 8, 22));
            cardBgDrawable.setStroke(dpToPx(0.8f), Color.parseColor("#24FFFFFF"));
        }

        if (pillParams != null) {
            pillParams.width = dpToPx(getPillWidthDp());
            pillParams.height = dpToPx(getPillHeightDp());
            if (isLeft) {
                pillParams.gravity = Gravity.TOP | Gravity.START;
                pillParams.x = 0;
            } else {
                pillParams.gravity = Gravity.TOP | Gravity.END;
                pillParams.x = 0;
            }
            if (isPillAttached && pillView != null) {
                try {
                    windowManager.updateViewLayout(pillView, pillParams);
                } catch (Exception ignored) {}
            }
        }
        if (pillIconText != null) {
            pillIconText.setText(isLeft ? ">" : "<");
            pillIconText.setTextSize(TypedValue.COMPLEX_UNIT_SP, "COMPACT".equalsIgnoreCase(pillSize) ? 24 : "LARGE".equalsIgnoreCase(pillSize) ? 34 : 28);
        }
    }

    private void scheduleAutoHide() {
        mainHandler.removeCallbacks(autoHideRunnable);
    }

    private void cancelAutoHide() {
        mainHandler.removeCallbacks(autoHideRunnable);
    }

    private long lastEditableSignalMs = 0L;
    private long lastImeEventSignalMs = 0L;
    private boolean wasRealImeWindowOpen = false;

    private boolean isKeyboardIdentifier(String str) {
        if (str == null || str.isEmpty()) return false;
        String lower = str.toLowerCase();
        return lower.contains("inputmethod")
                || lower.contains("honeyboard")
                || lower.contains("gboard")
                || lower.contains("swiftkey")
                || lower.contains("keyboard")
                || lower.contains("touchpal")
                || lower.contains("fleksy")
                || lower.contains("kika")
                || lower.contains("latinime");
    }

    private final Runnable keyboardWatchRunnable = new Runnable() {
        @Override
        public void run() {
            if (!isPillAttached && !isCardAttached && (System.currentTimeMillis() - lastEditableSignalMs > 2500L)) {
                return;
            }
            syncKeyboardState(null, false);
            if (isPillAttached || (System.currentTimeMillis() - lastEditableSignalMs <= 2500L)) {
                mainHandler.postDelayed(this, 320L);
            }
        }
    };

    private final Runnable followup120Runnable = () -> syncKeyboardState(null, false);
    private final Runnable followup280Runnable = () -> syncKeyboardState(null, false);
    private final Runnable followup550Runnable = () -> syncKeyboardState(null, false);
    private final Runnable followup950Runnable = () -> syncKeyboardState(null, false);

    private void scheduleFollowupSync() {
        mainHandler.removeCallbacks(followup120Runnable);
        mainHandler.removeCallbacks(followup280Runnable);
        mainHandler.removeCallbacks(followup550Runnable);
        mainHandler.removeCallbacks(followup950Runnable);
        mainHandler.postDelayed(followup120Runnable, 120L);
        mainHandler.postDelayed(followup280Runnable, 280L);
        mainHandler.postDelayed(followup550Runnable, 550L);
        mainHandler.postDelayed(followup950Runnable, 950L);
    }

    public void onAccessibilitySignal(int eventType, String evtPkg, boolean isEditableSignal) {
        long now = System.currentTimeMillis();
        if (evtPkg != null && !evtPkg.isEmpty()) {
            if (isKeyboardIdentifier(evtPkg)) {
                lastImeEventSignalMs = now;
            } else if (!isTransientSystemOrKeyboardPackage(evtPkg) && !evtPkg.equals(service.getPackageName())) {
                if (!evtPkg.equals(this.currentPackage)) {
                    deepScanBuffer.clear();
                }
                this.currentPackage = evtPkg;
                this.lastForegroundAppPackage = evtPkg;
            }
        }
        if (isEditableSignal) {
            lastEditableSignalMs = now;
        }
        syncKeyboardState(evtPkg, isEditableSignal);
        if (eventType != android.view.accessibility.AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED || isEditableSignal) {
            scheduleFollowupSync();
        }
    }

    public void syncKeyboardState(String hintPackage, boolean hasEditableFocusHint) {
        mainHandler.post(() -> {
            if (!isEnabled || isScreenLocked(service)) {
                hidePill();
                hideCard();
                return;
            }

            long now = System.currentTimeMillis();
            if (hasEditableFocusHint) {
                lastEditableSignalMs = now;
            }
            if (hintPackage != null && isKeyboardIdentifier(hintPackage)) {
                lastImeEventSignalMs = now;
            }

            DisplayMetrics dm = service.getResources().getDisplayMetrics();
            int screenHeight = dm.heightPixels > 0 ? dm.heightPixels : 2340;

            boolean realImeWindowOpen = false;
            boolean adjustedAppWindowForIme = false;
            boolean focusedEditableAboveIme = false;
            boolean notificationShadeOpen = false;
            String detectedAppPkg = "";
            Rect imeBounds = new Rect();
            Rect primaryAppBounds = new Rect();
            int appWindowCount = 0;

            if (hintPackage != null && !hintPackage.isEmpty()
                    && !isTransientSystemOrKeyboardPackage(hintPackage)
                    && !hintPackage.equals(service.getPackageName())) {
                detectedAppPkg = hintPackage;
            }

            try {
                List<AccessibilityWindowInfo> windows = service.getWindows();
                if (windows != null) {
                    for (AccessibilityWindowInfo w : windows) {
                        if (w == null) continue;
                        int type = w.getType();
                        Rect wb = new Rect();
                        w.getBoundsInScreen(wb);

                        // Sensor 1: TYPE_INPUT_METHOD window
                        if (type == AccessibilityWindowInfo.TYPE_INPUT_METHOD && wb.height() > dpToPx(50)) {
                            realImeWindowOpen = true;
                            imeBounds.set(wb);
                        }

                        // Sensor 2: Window title matches keyboard (works on API 24+ even when w.getRoot() is null)
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                            CharSequence wTitle = w.getTitle();
                            if (wTitle != null && isKeyboardIdentifier(wTitle.toString()) && wb.height() > dpToPx(50)) {
                                realImeWindowOpen = true;
                                if (imeBounds.isEmpty()) imeBounds.set(wb);
                            }
                        }

                        AccessibilityNodeInfo wRoot = w.getRoot();
                        String wPkg = (wRoot != null && wRoot.getPackageName() != null)
                                ? wRoot.getPackageName().toString()
                                : "";
                        if (!wPkg.isEmpty()) {
                            String lowerWPkg = wPkg.toLowerCase();
                            if (isKeyboardIdentifier(lowerWPkg) && wb.height() > dpToPx(50)) {
                                realImeWindowOpen = true;
                                if (imeBounds.isEmpty()) imeBounds.set(wb);
                            } else if (lowerWPkg.equals("com.android.systemui")
                                    && w.isFocused() && w.isActive()
                                    && wb.top <= dpToPx(10) && wb.height() > (screenHeight * 3 / 4)) {
                                notificationShadeOpen = true;
                            } else if (type == AccessibilityWindowInfo.TYPE_APPLICATION
                                    && !isTransientSystemOrKeyboardPackage(wPkg)) {
                                appWindowCount++;
                                if (!wPkg.equals(service.getPackageName())) {
                                    if (detectedAppPkg.isEmpty() || w.isActive() || w.isFocused()) {
                                        detectedAppPkg = wPkg;
                                    }
                                    if (primaryAppBounds.isEmpty() || w.isActive()) {
                                        primaryAppBounds.set(wb);
                                    }
                                } else if (detectedAppPkg.isEmpty() && (w.isActive() || w.isFocused())) {
                                    detectedAppPkg = wPkg;
                                }
                            }
                        } else if (type == AccessibilityWindowInfo.TYPE_APPLICATION && wb.height() > dpToPx(200)) {
                            appWindowCount++;
                            if (primaryAppBounds.isEmpty()) {
                                primaryAppBounds.set(wb);
                            }
                        }
                    }
                }
            } catch (Exception ignored) {}

            // Sensor 3: Application window bottom compressed by adjustResize keyboard
            if (!realImeWindowOpen && appWindowCount == 1 && !primaryAppBounds.isEmpty()) {
                int bottomGap = screenHeight - primaryAppBounds.bottom;
                if (primaryAppBounds.top < dpToPx(140) && bottomGap > dpToPx(170) && bottomGap < (screenHeight * 2 / 3)) {
                    adjustedAppWindowForIme = true;
                    if (imeBounds.isEmpty()) {
                        imeBounds.set(0, primaryAppBounds.bottom, dm.widthPixels, screenHeight);
                    }
                }
            }

            if (detectedAppPkg.isEmpty()) {
                try {
                    AccessibilityNodeInfo activeRoot = service.getRootInActiveWindow();
                    if (activeRoot != null && activeRoot.getPackageName() != null) {
                        String rootPkg = activeRoot.getPackageName().toString();
                        if (isKeyboardIdentifier(rootPkg)) {
                            realImeWindowOpen = true;
                        } else if (!isTransientSystemOrKeyboardPackage(rootPkg)) {
                            if (!rootPkg.equals(service.getPackageName()) || this.currentPackage.isEmpty()) {
                                detectedAppPkg = rootPkg;
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }

            // Sensor 4: Focused editable input node (O(1) framework lookup)
            Rect focusedEditBounds = new Rect();
            boolean hasFocusedEditableNode = false;
            try {
                AccessibilityNodeInfo focusedInput = service.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
                if (focusedInput != null) {
                    CharSequence fCls = focusedInput.getClassName();
                    boolean isEdit = focusedInput.isEditable()
                            || (fCls != null && fCls.toString().toLowerCase().contains("edittext"));
                    if (isEdit && focusedInput.isVisibleToUser()) {
                        hasFocusedEditableNode = true;
                        focusedInput.getBoundsInScreen(focusedEditBounds);
                        if (focusedInput.getPackageName() != null) {
                            String fPkg = focusedInput.getPackageName().toString();
                            if (!isTransientSystemOrKeyboardPackage(fPkg) && !fPkg.equals(service.getPackageName())) {
                                detectedAppPkg = fPkg;
                            }
                        }
                        int editBottomGap = screenHeight - focusedEditBounds.bottom;
                        if (focusedEditBounds.bottom > dpToPx(120) && editBottomGap > dpToPx(165)) {
                            focusedEditableAboveIme = true;
                            if (imeBounds.isEmpty()) {
                                imeBounds.set(0, focusedEditBounds.bottom + dpToPx(8), dm.widthPixels, screenHeight);
                            }
                        }
                    }
                }
            } catch (Exception ignored) {}

            if (!detectedAppPkg.isEmpty()) {
                if (!detectedAppPkg.equals(this.currentPackage)) {
                    deepScanBuffer.clear();
                }
                this.currentPackage = detectedAppPkg;
                if (!detectedAppPkg.equals(service.getPackageName())) {
                    this.lastForegroundAppPackage = detectedAppPkg;
                }
            } else if ((realImeWindowOpen || hasFocusedEditableNode)
                    && this.currentPackage.equals(service.getPackageName())
                    && !this.lastForegroundAppPackage.isEmpty()) {
                this.currentPackage = this.lastForegroundAppPackage;
            }

            // Sensor 5: Detect transition when real IME window closes so pill hides immediately
            if (realImeWindowOpen) {
                wasRealImeWindowOpen = true;
            } else if (wasRealImeWindowOpen) {
                wasRealImeWindowOpen = false;
                lastEditableSignalMs = 0L;
                lastImeEventSignalMs = 0L;
            }

            boolean recentEditableOrImeSignal =
                    (hasFocusedEditableNode && (now - lastEditableSignalMs < 2200L))
                    || (now - lastImeEventSignalMs < 1400L);

            boolean keyboardActive = realImeWindowOpen
                    || adjustedAppWindowForIme
                    || focusedEditableAboveIme
                    || recentEditableOrImeSignal;

            if (keyboardActive) {
                notificationShadeOpen = false;
            }

            if (notificationShadeOpen || currentPackage.isEmpty() || !isCopilotTargetApp(currentPackage)) {
                hidePill();
                if (notificationShadeOpen || currentPackage.equals(service.getPackageName())) {
                    hideCard();
                }
                return;
            }

            if (keyboardActive) {
                // Dock pill 1 full inch (160dp) higher above the top edge of the open keyboard
                int refTop = imeBounds.top > dpToPx(160)
                        ? imeBounds.top
                        : (focusedEditBounds.top > dpToPx(160) ? focusedEditBounds.top : (screenHeight - dpToPx(310)));
                if (pillParams != null && refTop > dpToPx(160)) {
                    int targetY = Math.max(dpToPx(96), refTop - dpToPx(218));
                    if (Math.abs(pillParams.y - targetY) > dpToPx(8)) {
                        pillParams.y = targetY;
                        if (isPillAttached && pillView != null) {
                            try {
                                windowManager.updateViewLayout(pillView, pillParams);
                            } catch (Exception ignored) {}
                        }
                    }
                }
                showPill();
                mainHandler.removeCallbacks(keyboardWatchRunnable);
                mainHandler.postDelayed(keyboardWatchRunnable, 320L);
            } else {
                // Keyboard is closed: hide the pill immediately (keep card open if user already opened card)
                mainHandler.removeCallbacks(keyboardWatchRunnable);
                hidePill();
                if (hasEditableFocusHint) {
                    scheduleFollowupSync();
                }
            }
        });
    }

    public void onPackageChanged(String newPackage) {
        if (newPackage == null || newPackage.isEmpty()) return;
        if (!isTransientSystemOrKeyboardPackage(newPackage)) {
            if (!newPackage.equals(this.currentPackage)) {
                deepScanBuffer.clear();
            }
            this.currentPackage = newPackage;
            if (!newPackage.equals(service.getPackageName())) {
                this.lastForegroundAppPackage = newPackage;
            }
        } else if (isKeyboardIdentifier(newPackage)) {
            lastImeEventSignalMs = System.currentTimeMillis();
        }
        syncKeyboardState(newPackage, false);
        scheduleFollowupSync();
    }

    public void onUserInputActive() {
        syncKeyboardState(null, true);
    }

    public void onUserInputActive(String eventPackage) {
        syncKeyboardState(eventPackage, true);
    }

    public void setEnabled(boolean enabled) {
        this.isEnabled = enabled;
        SharedPreferences prefs = service.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_ENABLED, enabled).apply();
        mainHandler.post(() -> {
            if (!enabled) {
                hidePill();
                hideCard();
            } else {
                syncKeyboardState(null, false);
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
        if (apiKey != null && !apiKey.isEmpty()) editor.putString(KEY_API_KEY, IrisKeystorePlugin.encryptNative(apiKey));
        if (geminiKey != null && !geminiKey.isEmpty()) editor.putString(KEY_GEMINI_KEY, IrisKeystorePlugin.encryptNative(geminiKey));
        if (groqKey != null && !groqKey.isEmpty()) editor.putString(KEY_GROQ_KEY, IrisKeystorePlugin.encryptNative(groqKey));
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
        frame.setClipChildren(false);
        frame.setClipToPadding(false);
        frame.setBackgroundColor(Color.TRANSPARENT);
        int wPx = dpToPx(getPillWidthDp());
        int hPx = dpToPx(getPillHeightDp());
        boolean isLeft = "LEFT".equalsIgnoreCase(edgeSide);

        pillBgDrawable = new GradientDrawable();
        applyEdgeTabCornerRadii(isLeft);

        pillIconText = new TextView(service);
        pillIconText.setText(isLeft ? ">" : "<");
        pillIconText.setTextColor(Color.parseColor("#00F2FF"));
        pillIconText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 28);
        pillIconText.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
        pillIconText.setShadowLayer(dpToPx(9), 0, 0, Color.parseColor("#EE00F2FF"));
        pillIconText.setGravity(Gravity.CENTER);
        pillIconText.setBackgroundColor(Color.TRANSPARENT);
        FrameLayout.LayoutParams textParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
        frame.addView(pillIconText, textParams);

        pillParams = new WindowManager.LayoutParams(
                wPx, hPx,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
        );
        pillParams.gravity = isLeft ? (Gravity.TOP | Gravity.START) : (Gravity.TOP | Gravity.END);
        pillParams.x = 0;
        pillParams.y = dpToPx(180);

        frame.setOnTouchListener(new View.OnTouchListener() {
            private int initialX, initialY;
            private float initialTouchX, initialTouchY;
            private long touchStartTime;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        cancelAutoHide();
                        v.setAlpha(1f);
                        initialX = pillParams.x;
                        initialY = pillParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        touchStartTime = System.currentTimeMillis();
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        int dx = (int) (event.getRawX() - initialTouchX);
                        boolean leftSide = (pillParams.gravity & Gravity.HORIZONTAL_GRAVITY_MASK) == Gravity.START;
                        pillParams.x = Math.max(0, leftSide ? (initialX + dx) : (initialX - dx));
                        pillParams.y = initialY + (int) (event.getRawY() - initialTouchY);
                        if (isPillAttached) windowManager.updateViewLayout(pillView, pillParams);
                        return true;

                    case MotionEvent.ACTION_UP:
                        long duration = System.currentTimeMillis() - touchStartTime;
                        float diffX = Math.abs(event.getRawX() - initialTouchX);
                        float diffY = Math.abs(event.getRawY() - initialTouchY);

                        if (duration < 300 && diffX < 24 && diffY < 24) {
                            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
                            toggleCard();
                        } else {
                            if (!"FREE".equalsIgnoreCase(edgeSide)) {
                                pillParams.x = 0;
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
        cardBgDrawable.setCornerRadius(dpToPx(22));
        int cardOpacity = Math.max(60, Math.min(95, pillOpacity + 28));
        cardBgDrawable.setColor(Color.argb((int) (cardOpacity / 100.0f * 255), 4, 8, 22));
        cardBgDrawable.setStroke(dpToPx(0.8f), Color.parseColor("#24FFFFFF"));
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
        int innerWidth = Math.min(dpToPx(348), dm.widthPixels - dpToPx(36));

        this.cardInnerLayout = layout;
        FrameLayout cardArena = new FrameLayout(service);
        cardArena.setClipChildren(false);
        cardArena.setClipToPadding(false);
        cardArena.setBackgroundColor(Color.TRANSPARENT);
        cardArena.setPadding(dpToPx(18), dpToPx(24), dpToPx(18), dpToPx(24));

        FrameLayout.LayoutParams innerLp = new FrameLayout.LayoutParams(
                innerWidth,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER
        );
        cardArena.addView(layout, innerLp);

        cardParams = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                        | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH
                        | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
                        | WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
        );
        cardParams.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE | WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN;
        cardParams.gravity = Gravity.CENTER;
        cardParams.x = 0;
        cardParams.y = 0;

        layout.setClickable(true);
        cardArena.setOnClickListener(v -> hideCard());
        cardArena.setOnTouchListener((v, event) -> {
            if (event.getAction() == MotionEvent.ACTION_OUTSIDE) {
                hideCard();
                return true;
            }
            return false;
        });

        this.cardView = cardArena;
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

    private boolean shouldRouteToCompose(String input) {
        if (input == null || input.trim().isEmpty()) return false;
        String q = input.trim();
        if (COMPOSE_INTENT_PATTERN.matcher(q).find()) return true;
        if ("CHAT".equals(currentScreenMode) || "EMAIL".equals(currentScreenMode)) {
            boolean isExplicitAnalysisQuestion = q.matches("(?i)^(?:what|why|how|who|when|where|which|explain|summarize|summary|translate|meaning|define|fact\\s*check|is\\s+this\\s+a?\\s*scam|analyze)\\b.*")
                    || q.endsWith("?");
            return !isExplicitAnalysisQuestion;
        }
        return false;
    }

    private void submitUnifiedInput() {
        if (customQuestionInput == null) return;
        String q = customQuestionInput.getText().toString().trim();
        if (q.isEmpty()) return;
        customQuestionInput.setText("");
        hideSoftKeyboard();
        restoreNotFocusable();

        if (shouldRouteToCompose(q)) {
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
                                    if (shouldRouteToCompose(spoken)) {
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

    private Choreographer.FrameCallback pillSpringCallback = null;
    private Choreographer.FrameCallback cardSpringCallback = null;
    private boolean isCardClosingSpring = false;

    private void stopPillSpring() {
        if (pillSpringCallback != null) {
            try { Choreographer.getInstance().removeFrameCallback(pillSpringCallback); } catch (Exception ignored) {}
            pillSpringCallback = null;
        }
    }

    private void stopCardSpring() {
        if (cardSpringCallback != null) {
            try { Choreographer.getInstance().removeFrameCallback(cardSpringCallback); } catch (Exception ignored) {}
            cardSpringCallback = null;
        }
        isCardClosingSpring = false;
    }

    private void runPillSpring(
            final float startTx, final float targetTx,
            final float startSx, final float targetSx,
            final float startSy, final float targetSy,
            final float initVTx, final float initVSx, final float initVSy
    ) {
        final View target = pillIconText != null ? pillIconText : pillView;
        if (target == null) return;
        stopPillSpring();

        final boolean isLeft = "LEFT".equalsIgnoreCase(edgeSide);
        target.setPivotX(isLeft ? dpToPx(8) : dpToPx(getPillWidthDp() - 8));
        target.setPivotY(dpToPx(getPillHeightDp()) * 0.5f);

        final float[] state = new float[]{
                startTx, targetTx, initVTx,
                startSx, targetSx, initVSx,
                startSy, targetSy, initVSy
        };
        final long[] lastNs = new long[]{0L};

        pillSpringCallback = new Choreographer.FrameCallback() {
            @Override
            public void doFrame(long frameTimeNanos) {
                if (target == null || !isPillAttached) {
                    pillSpringCallback = null;
                    return;
                }
                float dt = lastNs[0] == 0L ? (1f / 120f) : Math.min(0.032f, Math.max(0.001f, (frameTimeNanos - lastNs[0]) / 1_000_000_000f));
                lastNs[0] = frameTimeNanos;

                float step = 1f / 240f;
                float rem = dt;
                final float k = 285f;
                final float c = 13.6f;

                while (rem > 0f) {
                    float h = Math.min(step, rem);
                    rem -= h;

                    float aTx = -k * (state[0] - state[1]) - c * state[2];
                    state[2] += aTx * h;
                    state[0] += state[2] * h;

                    float aSx = -k * (state[3] - state[4]) - c * state[5];
                    state[5] += aSx * h;
                    state[3] += state[5] * h;

                    float aSy = -k * (state[6] - state[7]) - c * state[8];
                    state[8] += aSy * h;
                    state[6] += state[8] * h;
                }

                target.setTranslationX(state[0]);
                target.setScaleX(Math.max(0.15f, Math.min(1.55f, state[3])));
                target.setScaleY(Math.max(0.15f, Math.min(1.55f, state[6])));

                boolean settled =
                        Math.abs(state[0] - state[1]) < 0.25f &&
                        Math.abs(state[3] - state[4]) < 0.004f &&
                        Math.abs(state[6] - state[7]) < 0.004f &&
                        Math.abs(state[2]) < 1.2f &&
                        Math.abs(state[5]) < 0.02f &&
                        Math.abs(state[8]) < 0.02f;

                if (settled) {
                    target.setTranslationX(state[1]);
                    target.setScaleX(state[4]);
                    target.setScaleY(state[7]);
                    pillSpringCallback = null;
                } else {
                    Choreographer.getInstance().postFrameCallback(this);
                }
            }
        };
        Choreographer.getInstance().postFrameCallback(pillSpringCallback);
    }

    private void runCardConnectedSpring(final boolean opening, final Runnable onComplete) {
        final View target = cardInnerLayout != null ? cardInnerLayout : cardView;
        if (target == null) return;
        stopCardSpring();
        isCardClosingSpring = !opening;

        final boolean isLeft = "LEFT".equalsIgnoreCase(edgeSide);
        DisplayMetrics dm = service.getResources().getDisplayMetrics();
        int screenH = dm.heightPixels > 0 ? dm.heightPixels : 2200;
        int cardW = target.getWidth() > 0 ? target.getWidth() : Math.min(dpToPx(348), dm.widthPixels - dpToPx(36));
        int estCardH = target.getHeight() > 0 ? target.getHeight() : dpToPx(320);

        // Compute the exact anchor point on the inner card where the '<' pull-tab lives so the card unfolds directly out of '<'
        int cardTopOnScreen = (screenH - estCardH) / 2;
        int pillCenterYOnScreen = (pillParams != null ? pillParams.y : dpToPx(180)) + dpToPx(getPillHeightDp()) / 2;
        float pivotX = isLeft ? 0f : (float) cardW;
        float pivotY = Math.max(dpToPx(24), Math.min(estCardH - dpToPx(24), pillCenterYOnScreen - cardTopOnScreen));

        target.setPivotX(pivotX);
        target.setPivotY(pivotY);

        float edgeOffsetTx = isLeft ? -dpToPx(44) : dpToPx(44);
        float startTx = opening ? edgeOffsetTx : target.getTranslationX();
        float targetTx = opening ? 0f : edgeOffsetTx;
        float initVTx = opening ? (isLeft ? 1550f : -1550f) : (isLeft ? -950f : 950f);

        float startSx = opening ? 0.08f : target.getScaleX();
        float targetSx = opening ? 1.0f : 0.06f;
        float initVSx = opening ? 7.8f : -4.2f;

        float startSy = opening ? 0.14f : target.getScaleY();
        float targetSy = opening ? 1.0f : 0.10f;
        float initVSy = opening ? 6.6f : -3.8f;

        // Simultaneously animate the '<' pull-tab so it feels physically connected to the unfolding window
        if (isPillAttached && pillView != null) {
            if (opening) {
                float pullInTx = isLeft ? dpToPx(18) : -dpToPx(18);
                runPillSpring(0f, pullInTx, 1.0f, 0.25f, 1.0f, 0.45f, isLeft ? 480f : -480f, -3.5f, -2.5f);
            } else {
                float pullStartTx = isLeft ? dpToPx(16) : -dpToPx(16);
                runPillSpring(pullStartTx, 0f, 0.35f, 1.0f, 0.5f, 1.0f, isLeft ? -520f : 520f, 5.2f, 4.4f);
            }
        }

        final float[] state = new float[]{
                startTx, targetTx, initVTx,
                startSx, targetSx, initVSx,
                startSy, targetSy, initVSy
        };
        final long[] lastNs = new long[]{0L};

        cardSpringCallback = new Choreographer.FrameCallback() {
            @Override
            public void doFrame(long frameTimeNanos) {
                if (target == null || !isCardAttached) {
                    cardSpringCallback = null;
                    isCardClosingSpring = false;
                    return;
                }
                float dt = lastNs[0] == 0L ? (1f / 120f) : Math.min(0.032f, Math.max(0.001f, (frameTimeNanos - lastNs[0]) / 1_000_000_000f));
                lastNs[0] = frameTimeNanos;

                float step = 1f / 240f;
                float rem = dt;
                // Underdamped elastic Hooke's Law spring constants for liquid overshoot & rebound
                final float k = opening ? 265f : 320f;
                final float c = opening ? 13.4f : 18.5f;

                while (rem > 0f) {
                    float h = Math.min(step, rem);
                    rem -= h;

                    float aTx = -k * (state[0] - state[1]) - c * state[2];
                    state[2] += aTx * h;
                    state[0] += state[2] * h;

                    float aSx = -k * (state[3] - state[4]) - c * state[5];
                    state[5] += aSx * h;
                    state[3] += state[5] * h;

                    float aSy = -k * (state[6] - state[7]) - c * state[8];
                    state[8] += aSy * h;
                    state[6] += state[8] * h;
                }

                float curSx = Math.max(0.04f, Math.min(1.22f, state[3]));
                float curSy = Math.max(0.04f, Math.min(1.22f, state[6]));
                float curAlpha = Math.max(0f, Math.min(1f, (curSx - 0.06f) / 0.55f));

                target.setTranslationX(state[0]);
                target.setScaleX(curSx);
                target.setScaleY(curSy);
                target.setAlpha(opening ? Math.max(0.25f, curAlpha) : curAlpha);

                boolean settled = opening
                        ? (Math.abs(state[0] - state[1]) < 0.35f &&
                           Math.abs(state[3] - state[4]) < 0.004f &&
                           Math.abs(state[6] - state[7]) < 0.004f &&
                           Math.abs(state[2]) < 1.5f &&
                           Math.abs(state[5]) < 0.02f &&
                           Math.abs(state[8]) < 0.02f)
                        : (state[3] <= 0.14f || (Math.abs(state[3] - state[4]) < 0.03f));

                if (settled) {
                    if (opening) {
                        target.setTranslationX(0f);
                        target.setScaleX(1f);
                        target.setScaleY(1f);
                        target.setAlpha(1f);
                    }
                    cardSpringCallback = null;
                    isCardClosingSpring = false;
                    if (onComplete != null) onComplete.run();
                } else {
                    Choreographer.getInstance().postFrameCallback(this);
                }
            }
        };
        Choreographer.getInstance().postFrameCallback(cardSpringCallback);
    }

    public void showPill() {
        if (isScreenLocked(service) || !isCopilotTargetApp(currentPackage)) {
            hideCard();
            hidePill();
            return;
        }
        cancelAutoHide();
        if (pillView != null) {
            pillView.setAlpha(1f);
            if (isPillAttached && !pillView.isAttachedToWindow()) {
                isPillAttached = false;
            }
        }
        if (!isPillAttached && pillView != null) {
            try {
                boolean isLeft = "LEFT".equalsIgnoreCase(edgeSide);
                float startTx = isLeft ? -dpToPx(24) : dpToPx(24);
                View target = pillIconText != null ? pillIconText : pillView;
                pillView.setAlpha(1f);
                target.setTranslationX(startTx);
                target.setScaleX(0.35f);
                target.setScaleY(0.55f);
                windowManager.addView(pillView, pillParams);
                isPillAttached = true;
                runPillSpring(startTx, 0f, 0.35f, 1.0f, 0.55f, 1.0f, isLeft ? 580f : -580f, 5.4f, 4.2f);
            } catch (Exception e) {
                if (pillView.isAttachedToWindow()) {
                    isPillAttached = true;
                }
                Log.e(TAG, "Error adding pill view", e);
            }
        } else if (isPillAttached && !isCardAttached && pillSpringCallback == null && pillIconText != null) {
            if (pillIconText.getScaleX() < 0.9f || pillIconText.getScaleY() < 0.9f) {
                pillIconText.setTranslationX(0f);
                pillIconText.setScaleX(1f);
                pillIconText.setScaleY(1f);
            }
        }
        scheduleAutoHide();
    }

    public void hidePill() {
        cancelAutoHide();
        stopPillSpring();
        if (isPillAttached && pillView != null) {
            try {
                windowManager.removeView(pillView);
            } catch (Exception e) {
                Log.e(TAG, "Error removing pill view", e);
            } finally {
                isPillAttached = false;
            }
        }
    }

    public void toggleCard() {
        if (isScreenLocked(service)) {
            hideCard();
            hidePill();
            return;
        }
        if (isCardAttached && !isCardClosingSpring) {
            hideCard();
        } else {
            showCard();
        }
    }

    public void showCard() {
        if (isScreenLocked(service)) {
            hideCard();
            hidePill();
            return;
        }
        cancelAutoHide();
        stopCardSpring();
        if (!isCardAttached && cardView != null) {
            try {
                refreshContext();
                cardParams.flags |= WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
                View target = cardInnerLayout != null ? cardInnerLayout : cardView;
                cardView.setScaleX(1f);
                cardView.setScaleY(1f);
                cardView.setAlpha(1f);
                target.setScaleX(0.08f);
                target.setScaleY(0.14f);
                target.setAlpha(0.25f);
                windowManager.addView(cardView, cardParams);
                isCardAttached = true;
                runCardConnectedSpring(true, null);
            } catch (Exception e) {
                Log.e(TAG, "Error adding card view", e);
            }
        } else if (isCardAttached && cardView != null) {
            runCardConnectedSpring(true, null);
        }
    }

    public void hideCard() {
        hideSoftKeyboard();
        restoreNotFocusable();
        if (moreToolsGrid != null) moreToolsGrid.setVisibility(View.GONE);
        if (replyFilterScroll != null) replyFilterScroll.setVisibility(View.GONE);
        if (contextPreviewView != null) contextPreviewView.setVisibility(View.GONE);
        if (isCardAttached && cardView != null) {
            if (isCardClosingSpring) return;
            runCardConnectedSpring(false, () -> {
                if (isCardAttached && cardView != null) {
                    try {
                        windowManager.removeView(cardView);
                        isCardAttached = false;
                    } catch (Exception e) {
                        Log.e(TAG, "Error removing card view", e);
                    }
                }
            });
        }
        scheduleAutoHide();
    }

    private void cleanup() {
        hideAuroraScreenOverlay();
        hideCard();
        hidePill();
        if (lockStateReceiver != null) {
            try { service.unregisterReceiver(lockStateReceiver); } catch (Exception ignored) {}
            lockStateReceiver = null;
        }
        if (speechRecognizer != null) {
            try { speechRecognizer.destroy(); } catch (Exception ignored) {}
            speechRecognizer = null;
        }
        if (auroraSpeechRecognizer != null) {
            try { auroraSpeechRecognizer.destroy(); } catch (Exception ignored) {}
            auroraSpeechRecognizer = null;
        }
        if (auroraTts != null) {
            try {
                auroraTts.stop();
                auroraTts.shutdown();
            } catch (Exception ignored) {}
            auroraTts = null;
        }
        executor.shutdownNow();
    }

    public static void syncMemoryState(Context context, String memoriesJson, String historyJson) {
        if (context == null) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor ed = prefs.edit();
            if (memoriesJson != null && !memoriesJson.isEmpty()) {
                ed.putString(KEY_MEMORY_VAULT, memoriesJson);
            }
            if (historyJson != null && !historyJson.isEmpty()) {
                ed.putString(KEY_CONVERSATION_HISTORY, historyJson);
            }
            ed.apply();
        } catch (Exception ignored) {}
    }

    public static boolean triggerInAppAuroraAssistant(Context ctx) {
        if (ctx != null && isScreenLocked(ctx)) return false;
        IrisFloatingCopilot copilot = getInstance();
        if (copilot == null) {
            IrisAccessibilityService svc = IrisAccessibilityService.getInstance();
            if (svc != null) {
                initialize(svc);
                copilot = getInstance();
            }
        }
        if (copilot == null) return false;
        final IrisFloatingCopilot activeCopilot = copilot;
        activeCopilot.mainHandler.post(activeCopilot::showAuroraScreenOverlay);
        return true;
    }

    private void initAuroraTts() {
        try {
            auroraTts = new TextToSpeech(service.getApplicationContext(), status -> {
                if (status == TextToSpeech.SUCCESS && auroraTts != null) {
                    try {
                        auroraTts.setLanguage(java.util.Locale.US);
                        auroraTts.setSpeechRate(0.98f);
                        isAuroraTtsReady = true;
                        auroraTts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                            @Override
                            public void onStart(String utteranceId) {
                                mainHandler.post(() -> {
                                    auroraModeState = 2; // SPEAKING
                                    if (auroraStatusBadge != null) {
                                        auroraStatusBadge.setText("✦ IRIS AURORA • Speaking...");
                                    }
                                });
                            }

                            @Override
                            public void onDone(String utteranceId) {
                                mainHandler.post(() -> {
                                    if (!isAuroraAttached) return;
                                    if ("AURORA_GOODBYE".equals(utteranceId)) {
                                        hideAuroraScreenOverlay();
                                        return;
                                    }
                                    // Automatically re-open microphone for multi-turn conversation continuity!
                                    if (auroraFollowupCount < 5) {
                                        auroraFollowupCount++;
                                        auroraModeState = 0;
                                        if (auroraStatusBadge != null) {
                                            auroraStatusBadge.setText("✦ IRIS AURORA • Listening for follow-up...");
                                        }
                                        mainHandler.postDelayed(() -> {
                                            if (isAuroraAttached && auroraModeState != 1) {
                                                startAuroraVoiceListening(true);
                                            }
                                        }, 250L);
                                    } else {
                                        auroraModeState = 3;
                                        if (auroraStatusBadge != null) {
                                            auroraStatusBadge.setText("✦ IRIS AURORA • Tap 🎙️ to continue");
                                        }
                                    }
                                });
                            }

                            @Override
                            public void onError(String utteranceId) {
                                mainHandler.post(() -> {
                                    if (isAuroraAttached) auroraModeState = 3;
                                });
                            }
                        });
                    } catch (Exception ignored) {}
                }
            });
        } catch (Exception ignored) {}
    }

    private void speakAuroraText(String text, String utteranceId) {
        if (text == null || text.trim().isEmpty()) return;
        String cleanSpoken = text
                .replaceAll("\\[\\[[^\\]]*\\]\\]", "")
                .replaceAll("[*_~`#>]", "")
                .trim();
        if (cleanSpoken.isEmpty()) return;
        if (auroraTts != null && isAuroraTtsReady) {
            try {
                auroraModeState = 2;
                Bundle params = new Bundle();
                auroraTts.speak(cleanSpoken, TextToSpeech.QUEUE_FLUSH, params, utteranceId != null ? utteranceId : ("AURORA_TURN_" + System.currentTimeMillis()));
            } catch (Exception ignored) {}
        }
    }

    private void stopAuroraTts() {
        if (auroraTts != null) {
            try { auroraTts.stop(); } catch (Exception ignored) {}
        }
    }

    private void createAuroraOverlayView() {
        auroraOverlayRoot = new FrameLayout(service);
        auroraOverlayRoot.setClipChildren(false);
        auroraOverlayRoot.setClipToPadding(false);
        auroraOverlayRoot.setBackgroundColor(Color.TRANSPARENT);

        // 1. 120Hz Full-Screen Aurora Borealis Perimeter Glow Canvas
        auroraBorderGlowView = new View(service) {
            private final Paint outerBloomPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            private final Paint midAuroraPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            private final Paint innerCorePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            private final Paint rimHighlightPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            private final RectF outerRect = new RectF();
            private final RectF midRect = new RectF();
            private final RectF coreRect = new RectF();
            private final Matrix shaderMatrix = new Matrix();
            private SweepGradient auroraGradient = null;
            private int lastW = 0;
            private int lastH = 0;
            private float phaseDeg = 0f;
            private float pulsePhase = 0f;
            private long lastFrameNs = 0L;
            private boolean animRunning = false;

            private final Choreographer.FrameCallback frameCallback = new Choreographer.FrameCallback() {
                @Override
                public void doFrame(long frameTimeNanos) {
                    if (!isAuroraAttached || !isAttachedToWindow()) {
                        animRunning = false;
                        return;
                    }
                    float dt = lastFrameNs == 0L ? (1f / 120f) : Math.min(0.05f, Math.max(0.001f, (frameTimeNanos - lastFrameNs) / 1_000_000_000f));
                    lastFrameNs = frameTimeNanos;

                    float speedMultiplier = auroraModeState == 1 ? 2.85f : (auroraModeState == 2 ? 1.65f : 1.0f);
                    phaseDeg = (phaseDeg + dt * 115f * speedMultiplier) % 360f;
                    pulsePhase += dt * (auroraModeState == 1 ? 8.5f : (auroraModeState == 2 ? 6.2f : 3.4f));
                    invalidate();
                    Choreographer.getInstance().postFrameCallback(this);
                }
            };

            {
                setLayerType(View.LAYER_TYPE_SOFTWARE, null);
                outerBloomPaint.setStyle(Paint.Style.STROKE);
                outerBloomPaint.setStrokeWidth(dpToPx(28));
                outerBloomPaint.setMaskFilter(new BlurMaskFilter(dpToPx(22), BlurMaskFilter.Blur.NORMAL));

                midAuroraPaint.setStyle(Paint.Style.STROKE);
                midAuroraPaint.setStrokeWidth(dpToPx(13));
                midAuroraPaint.setMaskFilter(new BlurMaskFilter(dpToPx(10), BlurMaskFilter.Blur.NORMAL));

                innerCorePaint.setStyle(Paint.Style.STROKE);
                innerCorePaint.setStrokeWidth(dpToPx(5.5f));
                innerCorePaint.setMaskFilter(new BlurMaskFilter(dpToPx(3.5f), BlurMaskFilter.Blur.NORMAL));

                rimHighlightPaint.setStyle(Paint.Style.STROKE);
                rimHighlightPaint.setStrokeWidth(dpToPx(2.2f));
            }

            @Override
            protected void onAttachedToWindow() {
                super.onAttachedToWindow();
                if (!animRunning) {
                    animRunning = true;
                    lastFrameNs = 0L;
                    Choreographer.getInstance().postFrameCallback(frameCallback);
                }
            }

            @Override
            protected void onDetachedFromWindow() {
                animRunning = false;
                try { Choreographer.getInstance().removeFrameCallback(frameCallback); } catch (Exception ignored) {}
                super.onDetachedFromWindow();
            }

            @Override
            protected void onDraw(Canvas canvas) {
                super.onDraw(canvas);
                int w = getWidth();
                int h = getHeight();
                if (w <= 0 || h <= 0) return;

                if (auroraGradient == null || w != lastW || h != lastH) {
                    lastW = w;
                    lastH = h;
                    int[] colors = new int[]{
                            Color.parseColor("#00F2FF"), // Cyber Cyan
                            Color.parseColor("#2979FF"), // Electric Blue
                            Color.parseColor("#8E24AA"), // Deep Violet
                            Color.parseColor("#FF2A85"), // Neon Magenta
                            Color.parseColor("#00FFB2"), // Emerald Aurora
                            Color.parseColor("#7C4DFF"), // Neural Indigo
                            Color.parseColor("#00F2FF")  // Loop back to Cyber Cyan
                    };
                    auroraGradient = new SweepGradient(w * 0.5f, h * 0.5f, colors, null);
                    outerBloomPaint.setShader(auroraGradient);
                    midAuroraPaint.setShader(auroraGradient);
                    innerCorePaint.setShader(auroraGradient);
                    rimHighlightPaint.setShader(auroraGradient);
                }

                float pulse = 0.5f + 0.5f * (float) Math.sin(pulsePhase);
                float voiceBoost = Math.min(1f, auroraVoiceLevel * 1.4f);
                float cornerR = dpToPx(38);

                shaderMatrix.reset();
                shaderMatrix.setRotate(phaseDeg, w * 0.5f, h * 0.5f);
                auroraGradient.setLocalMatrix(shaderMatrix);

                float dynamicStrokeBoost = 1.0f + 0.28f * pulse + 0.35f * voiceBoost;
                outerBloomPaint.setStrokeWidth(dpToPx(26) * dynamicStrokeBoost);
                outerBloomPaint.setAlpha((int) (145 + 75 * pulse));

                midAuroraPaint.setStrokeWidth(dpToPx(12) * dynamicStrokeBoost);
                midAuroraPaint.setAlpha((int) (195 + 55 * pulse));

                innerCorePaint.setStrokeWidth(dpToPx(5f) * (1.0f + 0.18f * voiceBoost));
                innerCorePaint.setAlpha(245);

                rimHighlightPaint.setAlpha(255);

                float insetOuter = dpToPx(6);
                outerRect.set(insetOuter, insetOuter, w - insetOuter, h - insetOuter);
                canvas.drawRoundRect(outerRect, cornerR, cornerR, outerBloomPaint);

                float insetMid = dpToPx(4);
                midRect.set(insetMid, insetMid, w - insetMid, h - insetMid);
                canvas.drawRoundRect(midRect, cornerR, cornerR, midAuroraPaint);

                float insetCore = dpToPx(2);
                coreRect.set(insetCore, insetCore, w - insetCore, h - insetCore);
                canvas.drawRoundRect(coreRect, cornerR, cornerR, innerCorePaint);
                canvas.drawRoundRect(coreRect, cornerR, cornerR, rimHighlightPaint);
            }
        };
        auroraBorderGlowView.setClickable(false);
        auroraBorderGlowView.setFocusable(false);
        auroraOverlayRoot.addView(auroraBorderGlowView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        // 2. Compact Floating Aurora Glass HUD Capsule at Bottom of Screen
        LinearLayout hudCapsule = new LinearLayout(service);
        hudCapsule.setOrientation(LinearLayout.VERTICAL);
        hudCapsule.setPadding(dpToPx(16), dpToPx(12), dpToPx(16), dpToPx(14));

        GradientDrawable hudBg = new GradientDrawable();
        hudBg.setShape(GradientDrawable.RECTANGLE);
        hudBg.setCornerRadius(dpToPx(24));
        hudBg.setColor(Color.parseColor("#EB060B18"));
        hudBg.setStroke(dpToPx(1.2f), Color.parseColor("#6600F2FF"));
        hudCapsule.setBackground(hudBg);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            hudCapsule.setElevation(dpToPx(18));
        }

        // Top Bar: Status Badge + Insert Reply + Mic + Close
        LinearLayout headerRow = new LinearLayout(service);
        headerRow.setOrientation(LinearLayout.HORIZONTAL);
        headerRow.setGravity(Gravity.CENTER_VERTICAL);

        auroraStatusBadge = new TextView(service);
        auroraStatusBadge.setText("✦ IRIS AURORA • Reading Screen...");
        auroraStatusBadge.setTextColor(Color.parseColor("#00F2FF"));
        auroraStatusBadge.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.5f);
        auroraStatusBadge.setTypeface(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams badgeLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        headerRow.addView(auroraStatusBadge, badgeLp);

        auroraInjectButton = new TextView(service);
        auroraInjectButton.setText("⚡ Insert");
        auroraInjectButton.setTextColor(Color.parseColor("#041019"));
        auroraInjectButton.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f);
        auroraInjectButton.setTypeface(null, android.graphics.Typeface.BOLD);
        auroraInjectButton.setPadding(dpToPx(10), dpToPx(5), dpToPx(10), dpToPx(5));
        GradientDrawable injectBg = new GradientDrawable();
        injectBg.setCornerRadius(dpToPx(12));
        injectBg.setColor(Color.parseColor("#00FFB2"));
        auroraInjectButton.setBackground(injectBg);
        auroraInjectButton.setVisibility(View.GONE);
        LinearLayout.LayoutParams injectLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        injectLp.setMarginEnd(dpToPx(8));
        auroraInjectButton.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            if (!lastAuroraDraftReply.isEmpty()) {
                boolean ok = injectText(lastAuroraDraftReply);
                copyToClipboard(lastAuroraDraftReply);
                Toast.makeText(service, ok ? "⚡ Reply inserted into app!" : "📋 Reply copied to clipboard!", Toast.LENGTH_SHORT).show();
            }
        });
        headerRow.addView(auroraInjectButton, injectLp);

        auroraMicButton = new TextView(service);
        auroraMicButton.setText("🎙️");
        auroraMicButton.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f);
        auroraMicButton.setGravity(Gravity.CENTER);
        auroraMicButton.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));
        GradientDrawable micBg = new GradientDrawable();
        micBg.setCornerRadius(dpToPx(14));
        micBg.setColor(Color.parseColor("#2400F2FF"));
        micBg.setStroke(dpToPx(1), Color.parseColor("#8800F2FF"));
        auroraMicButton.setBackground(micBg);
        LinearLayout.LayoutParams micLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        micLp.setMarginEnd(dpToPx(8));
        auroraMicButton.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            stopAuroraTts();
            auroraFollowupCount = 0;
            startAuroraVoiceListening(false);
        });
        headerRow.addView(auroraMicButton, micLp);

        TextView closeAuroraBtn = new TextView(service);
        closeAuroraBtn.setText("✕");
        closeAuroraBtn.setTextColor(Color.parseColor("#B0BEC5"));
        closeAuroraBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f);
        closeAuroraBtn.setGravity(Gravity.CENTER);
        closeAuroraBtn.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));
        closeAuroraBtn.setOnClickListener(v -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            hideAuroraScreenOverlay();
        });
        headerRow.addView(closeAuroraBtn);
        hudCapsule.addView(headerRow);

        // User Spoken Transcript line
        auroraUserTranscriptView = new TextView(service);
        auroraUserTranscriptView.setText("Speak now — I can read your screen, reply to chats, or remember anything...");
        auroraUserTranscriptView.setTextColor(Color.parseColor("#B2EBF2"));
        auroraUserTranscriptView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12.5f);
        auroraUserTranscriptView.setPadding(0, dpToPx(6), 0, dpToPx(2));
        hudCapsule.addView(auroraUserTranscriptView);

        // AI Spoken Answer line
        auroraAiResponseView = new TextView(service);
        auroraAiResponseView.setTextColor(Color.WHITE);
        auroraAiResponseView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.5f);
        auroraAiResponseView.setPadding(0, dpToPx(4), 0, dpToPx(6));
        auroraAiResponseView.setVisibility(View.GONE);
        hudCapsule.addView(auroraAiResponseView);

        // Quick 1-Tap Screen Action Chips
        HorizontalScrollView chipsScroll = new HorizontalScrollView(service);
        chipsScroll.setHorizontalScrollBarEnabled(false);
        LinearLayout chipsRow = new LinearLayout(service);
        chipsRow.setOrientation(LinearLayout.HORIZONTAL);
        chipsRow.setPadding(0, dpToPx(4), 0, 0);

        String[][] auroraQuickChips = new String[][]{
                {"📖 Summarize Screen", "Read everything currently on my screen and summarize what is happening concisely."},
                {"💬 Reply to Screen", "Read the active conversation on my screen and draft the best 1st-person reply for me to send right now."},
                {"🧠 What should I say?", "Based on what the other person is asking on my screen, tell me what I should reply."},
                {"✨ Remember Screen", "Remember the key details currently shown on my screen in my Long-Term Memory Vault."}
        };
        for (final String[] chipData : auroraQuickChips) {
            TextView chip = new TextView(service);
            chip.setText(chipData[0]);
            chip.setTextColor(Color.parseColor("#E0F7FA"));
            chip.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f);
            chip.setPadding(dpToPx(11), dpToPx(5), dpToPx(11), dpToPx(5));
            GradientDrawable cBg = new GradientDrawable();
            cBg.setCornerRadius(dpToPx(14));
            cBg.setColor(Color.parseColor("#1800F2FF"));
            cBg.setStroke(dpToPx(0.8f), Color.parseColor("#4400F2FF"));
            chip.setBackground(cBg);
            LinearLayout.LayoutParams cLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            cLp.setMarginEnd(dpToPx(7));
            chip.setOnClickListener(v -> {
                v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
                stopAuroraVoiceListening();
                stopAuroraTts();
                executeAuroraScreenQuery(chipData[1]);
            });
            chipsRow.addView(chip, cLp);
        }
        chipsScroll.addView(chipsRow);
        hudCapsule.addView(chipsScroll);

        FrameLayout.LayoutParams hudParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        hudParams.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
        hudParams.setMargins(dpToPx(16), dpToPx(16), dpToPx(16), dpToPx(34));
        auroraOverlayRoot.addView(hudCapsule, hudParams);

        auroraParams = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                        | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
        );
        auroraParams.gravity = Gravity.TOP | Gravity.START;
    }

    public void showAuroraScreenOverlay() {
        if (isScreenLocked(service)) return;
        // Snapshot the current screen immediately before showing overlay
        lastAuroraScreenContext = extractScreenContext();
        lastAuroraDraftReply = "";
        auroraFollowupCount = 0;
        auroraModeState = 0;

        String appDisplay = (lastAuroraScreenContext != null && lastAuroraScreenContext.appName != null && !lastAuroraScreenContext.appName.isEmpty())
                ? lastAuroraScreenContext.appName
                : "Current Screen";
        if (auroraStatusBadge != null) {
            auroraStatusBadge.setText("✦ IRIS AURORA • Listening (" + appDisplay + ")");
        }
        if (auroraUserTranscriptView != null) {
            auroraUserTranscriptView.setText("Listening... Ask anything about " + appDisplay + " or tell me what to reply.");
        }
        if (auroraAiResponseView != null) {
            auroraAiResponseView.setText("");
            auroraAiResponseView.setVisibility(View.GONE);
        }
        if (auroraInjectButton != null) {
            auroraInjectButton.setVisibility(View.GONE);
        }

        if (auroraOverlayRoot != null && isAuroraAttached && !auroraOverlayRoot.isAttachedToWindow()) {
            isAuroraAttached = false;
        }
        if (!isAuroraAttached && auroraOverlayRoot != null) {
            try {
                auroraOverlayRoot.setAlpha(0f);
                windowManager.addView(auroraOverlayRoot, auroraParams);
                isAuroraAttached = true;
                auroraOverlayRoot.animate().alpha(1f).setDuration(180).start();
            } catch (Exception e) {
                Log.e(TAG, "Failed to attach Aurora screen overlay", e);
            }
        }
        startAuroraVoiceListening(false);
    }

    public void hideAuroraScreenOverlay() {
        stopAuroraVoiceListening();
        stopAuroraTts();
        if (isAuroraAttached && auroraOverlayRoot != null) {
            try {
                windowManager.removeView(auroraOverlayRoot);
            } catch (Exception ignored) {
            } finally {
                isAuroraAttached = false;
            }
        }
    }

    private void stopAuroraVoiceListening() {
        isAuroraListening = false;
        auroraVoiceLevel = 0f;
        if (auroraMicButton != null) auroraMicButton.setText("🎙️");
        if (auroraSpeechRecognizer != null) {
            try { auroraSpeechRecognizer.cancel(); } catch (Exception ignored) {}
        }
    }

    private void startAuroraVoiceListening(final boolean isFollowup) {
        if (!isAuroraAttached) return;
        stopAuroraTts();
        try {
            if (auroraSpeechRecognizer == null) {
                auroraSpeechRecognizer = SpeechRecognizer.createSpeechRecognizer(service);
                auroraSpeechRecognizer.setRecognitionListener(new RecognitionListener() {
                    @Override
                    public void onReadyForSpeech(Bundle params) {
                        auroraModeState = 0;
                        if (auroraMicButton != null) auroraMicButton.setText("🔴");
                    }

                    @Override
                    public void onBeginningOfSpeech() {}

                    @Override
                    public void onRmsChanged(float rmsdB) {
                        auroraVoiceLevel = Math.max(0f, Math.min(1f, (rmsdB + 2f) / 12f));
                    }

                    @Override
                    public void onBufferReceived(byte[] buffer) {}

                    @Override
                    public void onEndOfSpeech() {
                        auroraVoiceLevel = 0f;
                        isAuroraListening = false;
                        if (auroraMicButton != null) auroraMicButton.setText("🎙️");
                    }

                    @Override
                    public void onError(int error) {
                        auroraVoiceLevel = 0f;
                        isAuroraListening = false;
                        if (auroraMicButton != null) auroraMicButton.setText("🎙️");
                        if (auroraStatusBadge != null) {
                            auroraStatusBadge.setText("✦ IRIS AURORA • Tap 🎙️ or a chip below");
                        }
                    }

                    @Override
                    public void onResults(Bundle results) {
                        isAuroraListening = false;
                        auroraVoiceLevel = 0f;
                        if (auroraMicButton != null) auroraMicButton.setText("🎙️");
                        ArrayList<String> matches = results != null ? results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) : null;
                        if (matches != null && !matches.isEmpty() && matches.get(0) != null) {
                            String spoken = matches.get(0).trim();
                            if (!spoken.isEmpty()) {
                                executeAuroraScreenQuery(spoken);
                            }
                        }
                    }

                    @Override
                    public void onPartialResults(Bundle partialResults) {
                        ArrayList<String> partials = partialResults != null ? partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) : null;
                        if (partials != null && !partials.isEmpty() && partials.get(0) != null) {
                            String p = partials.get(0).trim();
                            if (!p.isEmpty() && auroraUserTranscriptView != null) {
                                auroraUserTranscriptView.setText("“" + p + "”");
                            }
                        }
                    }

                    @Override
                    public void onEvent(int eventType, Bundle params) {}
                });
            }

            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            isAuroraListening = true;
            auroraModeState = 0;
            if (auroraMicButton != null) auroraMicButton.setText("🔴");
            auroraSpeechRecognizer.startListening(intent);
        } catch (Exception e) {
            isAuroraListening = false;
            if (auroraMicButton != null) auroraMicButton.setText("🎙️");
        }
    }

    private void executeAuroraScreenQuery(final String userSpokenText) {
        if (userSpokenText == null || userSpokenText.trim().isEmpty()) return;
        final String cleanInput = userSpokenText.trim();

        // Check for conversational exit commands
        if (cleanInput.matches("(?i)^(?:stop|close|exit|cancel|bye|goodbye|thank\\s+you|thanks\\s+bye|that'?s\\s+all|done|nothing\\s+else)[.!]?$")) {
            if (auroraUserTranscriptView != null) auroraUserTranscriptView.setText("“" + cleanInput + "”");
            if (auroraAiResponseView != null) {
                auroraAiResponseView.setVisibility(View.VISIBLE);
                auroraAiResponseView.setText("Anytime. Closing Aurora.");
            }
            speakAuroraText("Anytime.", "AURORA_GOODBYE");
            mainHandler.postDelayed(this::hideAuroraScreenOverlay, 1100L);
            return;
        }

        // Refresh screen context so we have the latest visible screen nodes
        ScreenContextData latestCtx = extractScreenContext();
        if (latestCtx != null && !latestCtx.texts.isEmpty()) {
            lastAuroraScreenContext = latestCtx;
        }
        final ScreenContextData ctx = lastAuroraScreenContext != null ? lastAuroraScreenContext : new ScreenContextData();

        auroraModeState = 1; // THINKING (fast swirling aurora)
        if (auroraUserTranscriptView != null) {
            auroraUserTranscriptView.setText("“" + cleanInput + "”");
        }
        if (auroraStatusBadge != null) {
            auroraStatusBadge.setText("✦ IRIS AURORA • Reading " + (ctx.appName != null && !ctx.appName.isEmpty() ? ctx.appName : "Screen") + " & Thinking...");
        }
        if (auroraAiResponseView != null) {
            auroraAiResponseView.setVisibility(View.VISIBLE);
            auroraAiResponseView.setText("Analyzing live screen context...");
        }

        executor.execute(() -> {
            try {
                StringBuilder screenBlock = new StringBuilder();
                screenBlock.append("[LIVE FOREGROUND APPLICATION]: ").append(ctx.appName).append(" (").append(ctx.packageName).append(")\n");
                screenBlock.append("[SCREEN MODE]: ").append(ctx.screenMode).append("\n");
                if (ctx.partnerName != null && !ctx.partnerName.isEmpty()) {
                    screenBlock.append("[CHAT PARTNER]: ").append(ctx.partnerName).append("\n");
                }
                if (!ctx.activeCurrentTopic.isEmpty()) {
                    screenBlock.append("[ACTIVE CURRENT TOPIC ON SCREEN]:\n");
                    for (String line : ctx.activeCurrentTopic) {
                        screenBlock.append("- ").append(line).append("\n");
                    }
                }
                if (!ctx.olderResolvedTopic.isEmpty()) {
                    screenBlock.append("[OLDER RESOLVED TOPIC ON SCREEN]:\n");
                    for (String line : ctx.olderResolvedTopic) {
                        screenBlock.append("- ").append(line).append("\n");
                    }
                }
                if (ctx.activeCurrentTopic.isEmpty() && !ctx.texts.isEmpty()) {
                    screenBlock.append("[VISIBLE SCREEN CONTENT]:\n");
                    int start = Math.max(0, ctx.texts.size() - 28);
                    for (int i = start; i < ctx.texts.size(); i++) {
                        screenBlock.append("- ").append(ctx.texts.get(i)).append("\n");
                    }
                }

                String auroraSysPrompt = "You are IRIS Aurora, the native in-app screen-reading voice AI assistant running directly on top of the user's active Android app.\n"
                        + "RULES:\n"
                        + "1. Read the [LIVE SCREEN CONTEXT] carefully to answer the user's question about what is on their screen, what the other person is saying, or what they should do.\n"
                        + "2. Keep your spoken answer natural, warm, and concise (1 to 3 spoken sentences, no markdown asterisks or hashtags).\n"
                        + "3. DIRECT IN-APP REPLY INJECTION: Whenever the user asks you to reply, draft a message, tell the chat partner something, or what to say back, write the exact 1st-person message (as 'I'/'me') inside [[INJECT_REPLY: <exact message text to send>]] at the end of your response so IRIS can insert it directly into the app's typing bar.\n"
                        + "4. CONTINUITY & MEMORY: Maintain full continuity with the previous conversation turns and Long-Term Memory Vault. If the user shares a personal fact or asks you to remember something, append [[MEMORY: <concise fact>]] at the end.";

                String fullUserPrompt = "[LIVE SCREEN CONTEXT]:\n" + screenBlock + "\n[USER SPOKEN REQUEST]:\n" + cleanInput;
                String rawReply = queryLLMDirect(auroraSysPrompt, fullUserPrompt, cleanInput);

                // Extract [[INJECT_REPLY: ...]] if present
                String extractedDraft = "";
                Matcher replyMatcher = Pattern.compile("\\[\\[INJECT_REPLY:\\s*([\\s\\S]*?)\\]\\]", Pattern.CASE_INSENSITIVE).matcher(rawReply);
                if (replyMatcher.find()) {
                    extractedDraft = replyMatcher.group(1).trim();
                }
                final String cleanDisplayReply = rawReply
                        .replaceAll("(?i)\\[\\[INJECT_REPLY:\\s*[\\s\\S]*?\\]\\]", "")
                        .replaceAll("(?i)\\[\\[MEMORY:\\s*[^\\]]*\\]\\]", "")
                        .replaceAll("[*_#`]", "")
                        .trim();

                final String finalDraft = extractedDraft;
                final boolean userAskedToReply = cleanInput.matches("(?i).*(?:\\breply\\b|\\btell\\s+him\\b|\\btell\\s+her\\b|\\bsend\\b|\\bwrite\\b|\\bdraft\\b|\\bsay\\s+that\\b).*");

                mainHandler.post(() -> {
                    if (!isAuroraAttached) return;
                    String displayOut = cleanDisplayReply.isEmpty() ? finalDraft : cleanDisplayReply;
                    if (auroraAiResponseView != null) {
                        auroraAiResponseView.setVisibility(View.VISIBLE);
                        auroraAiResponseView.setText(displayOut);
                    }
                    if (!finalDraft.isEmpty()) {
                        lastAuroraDraftReply = finalDraft;
                        if (auroraInjectButton != null) {
                            auroraInjectButton.setVisibility(View.VISIBLE);
                        }
                        if (userAskedToReply) {
                            boolean injected = injectText(finalDraft);
                            copyToClipboard(finalDraft);
                            if (injected && auroraStatusBadge != null) {
                                auroraStatusBadge.setText("✦ IRIS AURORA • Reply Inserted into " + (ctx.appName != null ? ctx.appName : "App"));
                            }
                        }
                    } else if (userAskedToReply && !displayOut.isEmpty()) {
                        lastAuroraDraftReply = displayOut;
                        if (auroraInjectButton != null) {
                            auroraInjectButton.setVisibility(View.VISIBLE);
                        }
                    }
                    speakAuroraText(displayOut, "AURORA_TURN_" + System.currentTimeMillis());
                });
            } catch (Exception e) {
                mainHandler.post(() -> {
                    if (!isAuroraAttached) return;
                    auroraModeState = 3;
                    if (auroraStatusBadge != null) {
                        auroraStatusBadge.setText("✦ IRIS AURORA • Ready");
                    }
                    if (auroraAiResponseView != null) {
                        auroraAiResponseView.setVisibility(View.VISIBLE);
                        auroraAiResponseView.setText("Error: " + e.getMessage());
                    }
                });
            }
        });
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
        public String partnerName = "";
        public String detectedWritingDna = "";
        public String lastSpeakerRole = "";
        public String latestActiveTurn = "";
        public List<String> texts = new ArrayList<>();
        public List<String> olderResolvedTopic = new ArrayList<>();
        public List<String> activeCurrentTopic = new ArrayList<>();
        public String currentDraft = "";
        public String selectedText = "";
        public AccessibilityNodeInfo inputNode = null;
        public AccessibilityNodeInfo sendNode = null;
        public AccessibilityNodeInfo scrollableNode = null;
        public boolean hasInput = false;
        public Map<String, String> entities = new LinkedHashMap<>();
    }

    private static class ChatTurnNode {
        final String role; // "ME", "PARTNER", "DIVIDER"
        final String text;
        final Rect bounds;

        ChatTurnNode(String role, String text, Rect bounds) {
            this.role = role;
            this.text = text;
            this.bounds = bounds;
        }
    }

    private boolean isChatMetadataNoise(String text) {
        if (text == null) return true;
        String t = text.trim();
        if (t.isEmpty()) return true;
        if (CHAT_TIMESTAMP_NOISE_PATTERN.matcher(t).matches()) return true;
        if (t.startsWith("◈ IRIS //") || t.equals("IRIS COPILOT")) return true;
        if (t.length() <= 2 && t.matches("^[0-9:+•✓✔×✕▾▴⋯<>₹$]+$")) return true;
        String lower = t.toLowerCase();
        if (lower.contains("voice message") || lower.contains("voice note")
                || lower.contains("record voice") || lower.contains("record audio")
                || lower.contains("voice recorder") || lower.contains("hold to record")
                || lower.contains("slide to cancel") || lower.equals("audio")
                || lower.equals("sticker") || lower.equals("stickers")
                || lower.equals("gif") || lower.equals("gifs")
                || lower.equals("payment") || lower.equals("send payment")
                || lower.equals("scroll to bottom") || lower.equals("new chat")) {
            return true;
        }
        return false;
    }

    private boolean isInputPlaceholderHint(AccessibilityNodeInfo inputNode, String text) {
        if (text == null || text.trim().isEmpty()) return true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && inputNode != null && inputNode.isShowingHintText()) {
            return true;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && inputNode != null && inputNode.getHintText() != null) {
            if (text.trim().equalsIgnoreCase(inputNode.getHintText().toString().trim())) {
                return true;
            }
        }
        String lower = text.trim().toLowerCase();
        return lower.equals("message") || lower.equals("message...") || lower.equals("message…")
                || lower.equals("type a message") || lower.equals("type a message...")
                || lower.equals("write a message") || lower.equals("write a message...")
                || lower.equals("reply") || lower.equals("reply...") || lower.equals("add a comment...")
                || lower.equals("chat message") || lower.equals("text message");
    }

    private String cleanBubbleText(String rawText) {
        if (rawText == null) return "";
        String cleaned = TRAILING_TIME_CLEANER.matcher(rawText.trim()).replaceAll("").trim();
        return cleaned.isEmpty() ? rawText.trim() : cleaned;
    }

    private String analyzeUserWritingDna(List<String> myMessages) {
        if (myMessages == null || myMessages.isEmpty()) return "";
        int totalWords = 0;
        int lowercaseStarts = 0;
        int emojiOrExclam = 0;
        boolean hasHinglishOrSlang = false;

        for (String msg : myMessages) {
            String t = msg.trim();
            if (t.isEmpty()) continue;
            String[] words = t.split("\\s+");
            totalWords += words.length;
            char first = t.charAt(0);
            if (Character.isLowerCase(first)) lowercaseStarts++;
            if (t.contains("!") || t.contains("😂") || t.contains("👍") || t.contains("🔥") || t.contains("🙏") || t.contains("❤️")) {
                emojiOrExclam++;
            }
            String lower = t.toLowerCase();
            if (lower.matches(".*\\b(bhai|yaar|haan|nahi|kar|accha|theek|kya|abhi|kal|aaj|bro|nah|lowkey|rn|tbh|idk|lmk)\\b.*")) {
                hasHinglishOrSlang = true;
            }
        }

        int count = myMessages.size();
        int avgWords = Math.max(1, totalWords / count);
        boolean mostlyLower = lowercaseStarts > count / 2;

        StringBuilder dna = new StringBuilder("Detected [ME] Writing DNA from screen: ");
        dna.append(avgWords <= 6 ? "short punchy messages (~" + avgWords + " words)" : "conversational sentences (~" + avgWords + " words)");
        dna.append(mostlyLower ? ", relaxed lowercase style" : ", natural sentence casing");
        if (hasHinglishOrSlang) {
            dna.append(", uses casual slang/Hinglish matching the chat thread");
        }
        if (emojiOrExclam > 0) {
            dna.append(", expressive tone");
        }
        return dna.toString();
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
        AccessibilityNodeInfo root = null;
        int imeTopOnScreen = Integer.MAX_VALUE;

        // Always locate the actual TYPE_APPLICATION window root so an open keyboard never hijacks getRootInActiveWindow()
        try {
            List<AccessibilityWindowInfo> windows = service.getWindows();
            if (windows != null) {
                for (AccessibilityWindowInfo w : windows) {
                    if (w == null) continue;
                    Rect wb = new Rect();
                    w.getBoundsInScreen(wb);
                    if (w.getType() == AccessibilityWindowInfo.TYPE_INPUT_METHOD && wb.height() > dpToPx(80)) {
                        imeTopOnScreen = Math.min(imeTopOnScreen, wb.top);
                    }
                    AccessibilityNodeInfo wRoot = w.getRoot();
                    if (wRoot == null || wRoot.getPackageName() == null) continue;
                    String wPkg = wRoot.getPackageName().toString();
                    if (w.getType() == AccessibilityWindowInfo.TYPE_APPLICATION
                            && !wPkg.equals(service.getPackageName())
                            && !isTransientSystemOrKeyboardPackage(wPkg)) {
                        root = wRoot;
                    }
                }
            }
        } catch (Exception ignored) {}

        if (root == null) {
            root = service.getRootInActiveWindow();
        }
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
            String rawDraft = cs != null ? cs.toString().trim() : "";
            data.currentDraft = isInputPlaceholderHint(data.inputNode, rawDraft) ? "" : rawDraft;
        }

        Collections.sort(spatialNodes);
        DisplayMetrics dm = service.getResources().getDisplayMetrics();
        int screenW = dm.widthPixels > 0 ? dm.widthPixels : 1080;
        int screenH = dm.heightPixels > 0 ? dm.heightPixels : 2200;
        boolean isChat = "CHAT".equals(data.screenMode);

        Rect inputBounds = new Rect();
        int inputTopCutoff = (int) (screenH * 0.86f);
        if (imeTopOnScreen < screenH) {
            inputTopCutoff = Math.min(inputTopCutoff, imeTopOnScreen - dpToPx(58));
        }
        if (data.inputNode != null) {
            data.inputNode.getBoundsInScreen(inputBounds);
            if (inputBounds.top > dpToPx(140)) {
                inputTopCutoff = Math.min(inputTopCutoff, inputBounds.top - dpToPx(24));
            }
        }

        StringBuilder fullRawForEntities = new StringBuilder();
        List<ChatTurnNode> rawChatTurns = new ArrayList<>();
        List<String> mySamples = new ArrayList<>();

        for (SpatialNode sn : spatialNodes) {
            String rawText = sn.text;
            if (!data.currentDraft.isEmpty() && rawText.equals(data.currentDraft)) {
                continue;
            }
            fullRawForEntities.append(rawText).append(" ");

            if (isChat) {
                if (isChatMetadataNoise(rawText)) {
                    continue;
                }
                // Ignore any node overlapping or below the chat compose/typing bar & voice-mic row
                if (sn.bounds.top >= inputTopCutoff || sn.bounds.bottom >= inputTopCutoff + dpToPx(14)) {
                    continue;
                }
                // Top Header Bar: extract Partner / Contact / Group Name
                if (sn.bounds.top < dpToPx(106)) {
                    String hdr = rawText.trim();
                    if (data.partnerName.isEmpty()
                            && hdr.length() >= 2
                            && !hdr.matches("^\\d{1,2}:\\d{2}.*")
                            && !hdr.matches("^\\d+%$")
                            && !CHAT_DATE_DIVIDER_PATTERN.matcher(hdr).matches()) {
                        data.partnerName = hdr;
                    }
                    continue;
                }

                String cleanedMsg = cleanBubbleText(rawText);
                if (cleanedMsg.isEmpty() || isChatMetadataNoise(cleanedMsg)) {
                    continue;
                }

                int leftMargin = Math.max(0, sn.bounds.left);
                int rightMargin = Math.max(0, screenW - sn.bounds.right);
                int asymmetry = leftMargin - rightMargin;
                boolean isCenteredPill = Math.abs(asymmetry) <= dpToPx(24) && sn.bounds.width() < screenW * 0.65f;

                if (CHAT_DATE_DIVIDER_PATTERN.matcher(cleanedMsg).matches() || (isCenteredPill && cleanedMsg.length() <= 28)) {
                    rawChatTurns.add(new ChatTurnNode("DIVIDER", cleanedMsg, sn.bounds));
                    data.texts.add("[TOPIC_DIVIDER] " + cleanedMsg);
                } else if (asymmetry > dpToPx(14) || (rightMargin < dpToPx(62) && leftMargin > dpToPx(42))) {
                    // Right-anchored outgoing bubble -> Sent by Phone Owner [ME]
                    rawChatTurns.add(new ChatTurnNode("ME", cleanedMsg, sn.bounds));
                    mySamples.add(cleanedMsg);
                    data.texts.add("[ME] " + cleanedMsg);
                } else if (asymmetry < -dpToPx(14) || (leftMargin < dpToPx(84) && rightMargin > dpToPx(42))) {
                    // Left-anchored incoming bubble -> Sent by Contact [PARTNER]
                    String pTag = data.partnerName.isEmpty() ? "[PARTNER]" : "[PARTNER (" + data.partnerName + ")]";
                    rawChatTurns.add(new ChatTurnNode("PARTNER", cleanedMsg, sn.bounds));
                    data.texts.add(pTag + " " + cleanedMsg);
                } else {
                    // Wide full-width bubble fallback: classify by smaller edge margin
                    if (rightMargin < leftMargin) {
                        rawChatTurns.add(new ChatTurnNode("ME", cleanedMsg, sn.bounds));
                        mySamples.add(cleanedMsg);
                        data.texts.add("[ME] " + cleanedMsg);
                    } else {
                        String pTag = data.partnerName.isEmpty() ? "[PARTNER]" : "[PARTNER (" + data.partnerName + ")]";
                        rawChatTurns.add(new ChatTurnNode("PARTNER", cleanedMsg, sn.bounds));
                        data.texts.add(pTag + " " + cleanedMsg);
                    }
                }
            } else {
                data.texts.add(rawText);
            }
        }

        if (isChat && !rawChatTurns.isEmpty()) {
            data.detectedWritingDna = analyzeUserWritingDna(mySamples);
            String pLabel = data.partnerName.isEmpty() ? "PARTNER" : "PARTNER (" + data.partnerName + ")";

            // Segment conversation into [OLDER RESOLVED TOPIC] vs [ACTIVE CURRENT TOPIC]
            int splitIdx = 0;
            for (int i = 1; i < rawChatTurns.size(); i++) {
                ChatTurnNode prev = rawChatTurns.get(i - 1);
                ChatTurnNode curr = rawChatTurns.get(i);

                if ("DIVIDER".equals(curr.role)) {
                    splitIdx = Math.min(i + 1, rawChatTurns.size() - 1);
                    continue;
                }
                if ("DIVIDER".equals(prev.role)) {
                    splitIdx = i;
                    continue;
                }

                int verticalGap = curr.bounds.top - prev.bounds.bottom;
                boolean largeTimeOrVisualGap = verticalGap > dpToPx(46);
                boolean prevClosedOldTopic = TOPIC_CLOSURE_PATTERN.matcher(prev.text.trim()).matches();
                boolean currOpensNewTopic = NEW_TOPIC_OPENER_PATTERN.matcher(curr.text.trim()).matches();

                if (prevClosedOldTopic || currOpensNewTopic || largeTimeOrVisualGap) {
                    splitIdx = i;
                }
            }

            // Ensure if splitIdx leaves 0 non-divider turns, back up one turn
            if (splitIdx >= rawChatTurns.size()) {
                splitIdx = Math.max(0, rawChatTurns.size() - 1);
            }

            for (int i = 0; i < rawChatTurns.size(); i++) {
                ChatTurnNode turn = rawChatTurns.get(i);
                if ("DIVIDER".equals(turn.role)) continue;
                String formatted = ("ME".equals(turn.role) ? "[ME]: " : "[" + pLabel + "]: ") + turn.text;
                if (i < splitIdx) {
                    data.olderResolvedTopic.add(formatted);
                } else {
                    data.activeCurrentTopic.add(formatted);
                }
            }

            // Collect the consecutive messages from the very last speaker in the active topic
            String lastRole = "";
            List<String> latestTurnParts = new ArrayList<>();
            for (int i = rawChatTurns.size() - 1; i >= splitIdx; i--) {
                ChatTurnNode t = rawChatTurns.get(i);
                if ("DIVIDER".equals(t.role)) continue;
                if (lastRole.isEmpty()) {
                    lastRole = t.role;
                    latestTurnParts.add(0, t.text);
                } else if (lastRole.equals(t.role)) {
                    latestTurnParts.add(0, t.text);
                } else {
                    break;
                }
            }
            data.lastSpeakerRole = lastRole;
            if (!latestTurnParts.isEmpty()) {
                String speakerTag = "ME".equals(lastRole) ? "[ME]" : "[" + pLabel + "]";
                data.latestActiveTurn = speakerTag + ": " + android.text.TextUtils.join(" / ", latestTurnParts);
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
            CharSequence edText = node.getText();
            if (edText != null && edText.length() > 0 && selectedHolder.isEmpty()) {
                String s = edText.toString();
                int selStart = node.getTextSelectionStart();
                int selEnd = node.getTextSelectionEnd();
                if (selStart >= 0 && selEnd > selStart && selEnd <= s.length()) {
                    selectedHolder.add(s.substring(selStart, selEnd).trim());
                }
            }
            // Never add the editable typing box itself (or its "Message" hint) into spatialNodes!
            return;
        }

        if (node.isScrollable() && scrollHolder.isEmpty() && bounds.height() > dpToPx(180)) {
            scrollHolder.add(node);
        }

        CharSequence cd = node.getContentDescription();
        String viewId = node.getViewIdResourceName();
        String cdStr = cd != null ? cd.toString().trim().toLowerCase() : "";
        String idStr = viewId != null ? viewId.toLowerCase() : "";
        String clsStr = node.getClassName() != null ? node.getClassName().toString().toLowerCase() : "";

        if (node.isClickable() && sendHolder.isEmpty()) {
            if (cdStr.equals("send") || cdStr.equals("send message") || idStr.endsWith("/send") || idStr.endsWith("send_button") || idStr.endsWith("btn_send")) {
                sendHolder.add(node);
            }
        }

        // Skip compose bar, voice note mic button, camera, emoji, attachment & toolbar controls by viewId or className
        boolean isComposeOrControlId = idStr.endsWith("/entry") || idStr.contains("chat_input")
                || idStr.contains("input_layout") || idStr.contains("compose")
                || idStr.contains("voice_note") || idStr.contains("record")
                || idStr.contains("mic") || idStr.endsWith("/send")
                || idStr.contains("send_button") || idStr.contains("attach")
                || idStr.contains("camera") || idStr.contains("emoji")
                || idStr.contains("sticker") || idStr.contains("gif");
        boolean isIconControlWidget = clsStr.contains("imagebutton") || clsStr.contains("imageview");

        if (!isComposeOrControlId && !isIconControlWidget) {
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
        if (!data.partnerName.isEmpty()) {
            sb.append("Chat Partner / Contact Name: \"").append(data.partnerName).append("\"\n");
        }
        if ("CHAT".equals(data.screenMode)) {
            sb.append("Speaker Roles: [ME] = The human phone owner (you are ghostwriting FOR [ME] in 1st-person \"I\"); ")
              .append(data.partnerName.isEmpty() ? "[PARTNER]" : "[PARTNER (" + data.partnerName + ")]")
              .append(" = The other person talking to [ME].\n");
        }
        if (!data.detectedWritingDna.isEmpty()) {
            sb.append(data.detectedWritingDna).append("\n");
        }
        if (!data.selectedText.isEmpty()) {
            sb.append("User Highlighted/Selected Text: \"").append(data.selectedText).append("\"\n");
        }
        if (hasActiveDraft) {
            sb.append("Current Draft in Input Box (typed by [ME]): \"").append(data.currentDraft).append("\"\n");
        }

        StringBuilder previewSb = new StringBuilder();
        if (!data.partnerName.isEmpty()) {
            previewSb.append("PARTNER: ").append(data.partnerName).append("\n");
        }
        if (hasActiveDraft) {
            previewSb.append("DRAFT: ").append(data.currentDraft).append("\n---\n");
        }

        if ("CHAT".equals(data.screenMode) && !data.activeCurrentTopic.isEmpty() && deepScanBuffer.isEmpty()) {
            if (!data.olderResolvedTopic.isEmpty()) {
                sb.append("\n[OLDER RESOLVED TOPIC — ENDED EARLIER (BACKGROUND MEMORY ONLY, DO NOT REPLY TO THIS OLD TOPIC)]:\n");
                int oldStart = Math.max(0, data.olderResolvedTopic.size() - 12);
                for (int i = oldStart; i < data.olderResolvedTopic.size(); i++) {
                    sb.append("  ").append(data.olderResolvedTopic.get(i)).append("\n");
                }
            }
            sb.append("\n[ACTIVE CURRENT TOPIC — NEW/LIVE TOPIC (REPLY STRICTLY TO THIS)]:\n");
            for (String activeLine : data.activeCurrentTopic) {
                sb.append("  ").append(activeLine).append("\n");
                previewSb.append(activeLine).append("\n");
            }
            if (!data.latestActiveTurn.isEmpty()) {
                sb.append("\n>>> LATEST ACTIVE TURN TO RESPOND TO <<<\n  ").append(data.latestActiveTurn).append("\n");
                if ("ME".equals(data.lastSpeakerRole)) {
                    sb.append("Note: [ME] sent the last message above. Generate natural follow-up messages from [ME] to [PARTNER] (do NOT reply as [PARTNER] answering [ME]!).\n");
                } else {
                    sb.append("Note: [PARTNER] sent the last message above. Generate [ME]'s direct 1st-person replies to [PARTNER]'s latest active message.\n");
                }
            }
        } else {
            sb.append("Screen Content (ordered top-to-bottom):\n");
            int start = Math.max(0, combinedTexts.size() - 45);
            for (int i = start; i < combinedTexts.size(); i++) {
                String line = combinedTexts.get(i);
                sb.append("- ").append(line).append("\n");
                if (i >= Math.max(0, combinedTexts.size() - 8)) {
                    previewSb.append(line).append("\n");
                }
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

    private boolean isDiscontinuedNativeGeminiModel(String modelId) {
        if (modelId == null || modelId.trim().isEmpty()) return true;
        String id = modelId.trim().toLowerCase().replace("models/", "");
        try {
            SharedPreferences prefs = service.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String deadCsv = prefs.getString("copilot_dead_gemini_models_v1", "");
            if (!deadCsv.isEmpty()) {
                for (String dead : deadCsv.split(",")) {
                    if (id.equals(dead.trim())) return true;
                }
            }
        } catch (Exception ignored) {}
        return id.equals("gemini-pro") || id.equals("gemini-pro-vision") || id.equals("gemini-ultra")
                || id.startsWith("gemini-1.0") || id.startsWith("gemini-1.5") || id.startsWith("gemini-2.0")
                || id.contains("1.0") || id.contains("1.5-") || id.contains("2.0-")
                || id.contains("embedding") || id.contains("imagen") || id.contains("veo")
                || id.contains("tts") || id.contains("audio") || id.contains("vision")
                || id.contains("aqa") || id.contains("learnlm") || id.contains("bisect")
                || id.contains("thinking-exp") || id.contains("computer-use") || id.contains("robotics")
                || id.endsWith("-001") || id.endsWith("-002");
    }

    private void markNativeModelDiscontinued(String modelId, String errMsg) {
        if (modelId == null || errMsg == null) return;
        String id = modelId.trim().toLowerCase().replace("models/", "");
        if (id.isEmpty() || id.equals("gemini-flash-latest") || id.equals("gemini-flash-lite-latest")) return;
        String lowerErr = errMsg.toLowerCase();
        boolean isDead = lowerErr.contains("http 404") || lowerErr.contains("discontinued")
                || lowerErr.contains("deprecated") || lowerErr.contains("no longer available")
                || lowerErr.contains("not found") || lowerErr.contains("decommissioned")
                || lowerErr.contains("retired") || lowerErr.contains("shut down");
        if (!isDead) return;
        try {
            SharedPreferences prefs = service.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String deadCsv = prefs.getString("copilot_dead_gemini_models_v1", "");
            Set<String> set = new LinkedHashSet<>();
            if (!deadCsv.isEmpty()) {
                for (String s : deadCsv.split(",")) {
                    if (!s.trim().isEmpty()) set.add(s.trim());
                }
            }
            set.add(id);
            prefs.edit().putString("copilot_dead_gemini_models_v1", android.text.TextUtils.join(",", set)).apply();
        } catch (Exception ignored) {}
    }

    private String sanitizeNativeGeminiModel(String modelId) {
        if (modelId == null) return "gemini-2.5-flash";
        String cleaned = modelId.trim().replace("models/", "").replaceAll("\\s+", "-");
        if (cleaned.isEmpty() || isDiscontinuedNativeGeminiModel(cleaned)) {
            return isDiscontinuedNativeGeminiModel("gemini-2.5-flash") ? "gemini-flash-latest" : "gemini-2.5-flash";
        }
        return cleaned;
    }

    private String queryGeminiVision(String visionPrompt, String base64Jpeg) throws Exception {
        SharedPreferences prefs = service.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String rawGemini = prefs.getString(KEY_GEMINI_KEY, "");
        String rawApi = prefs.getString(KEY_API_KEY, "");
        String geminiKey = IrisKeystorePlugin.decryptNative(rawGemini);
        if (geminiKey.isEmpty()) geminiKey = IrisKeystorePlugin.decryptNative(rawApi);
        if (geminiKey.isEmpty()) {
            throw new Exception("Vision Scan requires a Gemini API key in IRIS Settings");
        }
        String modelId = sanitizeNativeGeminiModel(prefs.getString(KEY_MODEL, "gemini-2.5-flash"));
        if (modelId.toLowerCase().contains("gemma")) {
            modelId = "gemini-2.5-flash";
        }

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
                String systemPrompt = "Analyze the active Android app screen context. Respond directly, concisely, and naturally without self-introductions or filler words." + styleDir + lenDir;
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
                                + "1) Short & Casual (quick natural 1-liner matching [ME]'s texting style), "
                                + "2) Polite & Balanced (warm, clear, and natural), "
                                + "3) Detailed & Complete (thoughtful response addressing every point in the active topic).";
                    } else {
                        String tDesc = "POLITE".equals(replyFilter) ? "warm, polite, and courteous"
                                : "CASUAL".equals(replyFilter) ? "casual, friendly, and relaxed"
                                : "SHORT".equals(replyFilter) ? "ultra-short and direct (1 quick sentence)"
                                : "DETAILED".equals(replyFilter) ? "detailed, thorough, and well-explained (2-3 sentences)"
                                : "YES".equals(replyFilter) ? "agreeing / saying YES positively"
                                : "NO".equals(replyFilter) ? "politely declining / saying NO"
                                : "LATER".equals(replyFilter) ? "saying I am busy right now and will follow up later"
                                : "natural and context-appropriate";
                        toneInstr = "Generate 3 distinct replies all matching this style/stance: " + tDesc + ".";
                    }
                    systemPrompt = "You are a 1st-Person Human Ghostwriter writing the next text message strictly AS [ME] (the phone owner) to [PARTNER].\n"
                            + "CRITICAL RULES:\n"
                            + "1. IDENTITY: Write strictly in the first person (\"I\", \"me\", \"my\") as the human user [ME]. NEVER identify as an AI, NEVER mention \"Iris\" or \"Iris Copilot\", and NEVER sound like a customer-service bot.\n"
                            + "2. SPEAKER DIRECTION: [ME] is the phone owner sending this message. [PARTNER] is the other person. Answer [PARTNER]'s questions/comments from [ME]'s point of view. If [ME] sent the very last message on screen, write a natural follow-up from [ME] (do NOT answer [ME]'s own message as if you were [PARTNER]).\n"
                            + "3. TOPIC BOUNDARY ISOLATION: Focus 100% on the [ACTIVE CURRENT TOPIC] and the >>> LATEST ACTIVE TURN TO RESPOND TO <<<. Completely ignore any finished discussions inside [OLDER RESOLVED TOPIC — ENDED EARLIER]. Never mix old resolved topics with the new active topic.\n"
                            + "4. LANGUAGE & TONE MATCH: Match the exact language (English, Hinglish, Spanish, etc.), slang, formality, and rhythm used by [ME] in the chat.\n"
                            + toneInstr + styleDir
                            + "\nReturn ONLY a valid JSON array of 3 strings: [\"reply1\", \"reply2\", \"reply3\"]. No markdown wrapper, no explanation.";
                    userPrompt = lastExtractedContext + "\nGhostwrite 3 ready-to-send replies from [ME] for the active current topic now:";
                } else if ("SUMMARIZE".equals(action)) {
                    systemPrompt = "Summarize the key information on screen into 3 crisp, high-signal bullet points (- ), clearly separating any resolved earlier topic from the active current topic." + lenDir;
                    userPrompt = lastExtractedContext + "\nSummarize this screen:";
                } else if ("EXTRACT".equals(action)) {
                    systemPrompt = "Extract all key actionable items, dates/times, tasks, prices, specs, or important facts visible on this screen into a clean, structured bulleted list (- ).";
                    userPrompt = lastExtractedContext + "\nExtract key actionable items and facts from this screen:";
                } else if ("FACT_CHECK".equals(action)) {
                    String wikiContext = fetchWikipediaFacts(lastExtractedContext);
                    systemPrompt = "Verify the main claims, topics, or entities visible on this screen using the provided Live Web Encyclopedia Reference and your knowledge. Point out what is accurate, any context needed, and key facts.";
                    userPrompt = lastExtractedContext + wikiContext + "\nFact-check and explain the key claims/topics on this screen:";
                } else if (action.startsWith("CLIPBOARD_AI:")) {
                    String clipText = action.substring("CLIPBOARD_AI:".length());
                    systemPrompt = "The user [ME] copied this text to their clipboard. Provide: 1) A quick summary/explanation or translation if foreign, and 2) 2 smart 1st-person replies or improved rewrites written AS [ME] (never as an AI). Return a JSON array of 3 strings: [\"Insight / Translation: ...\", \"Reply/Rewrite 1\", \"Reply/Rewrite 2\"].";
                    userPrompt = "Copied Clipboard Text: \"" + clipText + "\"\nScreen Context:\n" + lastExtractedContext;
                } else if ("TRANSLATE".equals(action)) {
                    systemPrompt = "1) Translate the visible foreign messages/text in the [ACTIVE CURRENT TOPIC] into clear English. 2) If it's a chat, also provide 2 natural 1st-person replies written AS [ME] in [PARTNER]'s language (with English translation in parentheses).";
                    userPrompt = lastExtractedContext + "\nTranslate the screen content and suggest translated replies from [ME]:";
                } else if ("REWRITE".equals(action)) {
                    systemPrompt = "You are ghostwriting strictly AS the human user [ME]. Take [ME]'s Current Draft in Input Box (or [ME]'s latest message if no draft) and generate 3 improved 1st-person alternatives that fit the [ACTIVE CURRENT TOPIC]: 1. Short & Casual, 2. Polite & Professional, 3. Detailed & Articulate. NEVER mention Iris Copilot or sound like an AI. Return ONLY a JSON array of 3 strings: [\"version1\", \"version2\", \"version3\"].";
                    userPrompt = lastExtractedContext + "\nRewrite [ME]'s draft:";
                } else if (action.startsWith("REFINE_SHORT:")) {
                    String orig = action.substring("REFINE_SHORT:".length());
                    systemPrompt = "Rewrite the user's 1st-person message in 2 shorter, punchier human variations without losing its meaning. Return ONLY a JSON array of 2 strings: [\"short1\", \"short2\"].";
                    userPrompt = "Original message: \"" + orig + "\"\nMake it shorter and punchier:";
                } else if (action.startsWith("REFINE_DETAIL:")) {
                    String orig = action.substring("REFINE_DETAIL:".length());
                    systemPrompt = "Expand the user's 1st-person message into 2 more detailed, polite, and complete human variations. Return ONLY a JSON array of 2 strings: [\"detailed1\", \"detailed2\"].";
                    userPrompt = "Original message: \"" + orig + "\"\nMake it more detailed and complete:";
                } else if ("EXPLAIN".equals(action)) {
                    systemPrompt = "Explain the core concept, error, message, or content visible on this screen in clear terms." + lenDir;
                    userPrompt = lastExtractedContext + "\nExplain what is on this screen:";
                } else if (action.startsWith("COMPOSE:")) {
                    String rest = action.substring("COMPOSE:".length());
                    int colonIdx = rest.indexOf(':');
                    String instruction = colonIdx > 0 ? rest.substring(colonIdx + 1) : rest;
                    systemPrompt = "You are a 1st-Person Human Ghostwriter composing a message strictly AS [ME] (the phone owner) to [PARTNER]. Based on [ME]'s instruction and the [ACTIVE CURRENT TOPIC], generate 3 ready-to-send 1st-person message drafts: 1) Short & Casual, 2) Polite & Balanced, 3) Detailed & Complete. NEVER speak as an AI or mention Iris Copilot." + styleDir + lenDir + " Return ONLY a JSON array of 3 strings: [\"draft1\", \"draft2\", \"draft3\"]. No markdown wrapper, no filler.";
                    userPrompt = lastExtractedContext + "\nGhostwrite 3 messages from [ME] for this instruction: " + instruction;
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

    private String loadNativeMemoryBlock() {
        try {
            SharedPreferences prefs = service.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(KEY_MEMORY_VAULT, "[]");
            JSONArray arr = new JSONArray(raw);
            if (arr.length() == 0) return "";
            StringBuilder sb = new StringBuilder("\n[PERSISTENT LONG-TERM USER MEMORY VAULT — FACTS YOU REMEMBER ABOUT THE USER]:\n");
            for (int i = 0; i < arr.length(); i++) {
                String fact = arr.optString(i, "").trim();
                if (!fact.isEmpty()) {
                    sb.append(i + 1).append(". ").append(fact).append("\n");
                }
            }
            return sb.toString();
        } catch (Exception ignored) {
            return "";
        }
    }

    private JSONArray loadNativeConversationHistory() {
        try {
            SharedPreferences prefs = service.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(KEY_CONVERSATION_HISTORY, "[]");
            return new JSONArray(raw);
        } catch (Exception ignored) {
            return new JSONArray();
        }
    }

    private void recordNativeMemoryAndTurn(String userTurnText, String rawAiReply) {
        if ((userTurnText == null || userTurnText.isEmpty()) && (rawAiReply == null || rawAiReply.isEmpty())) return;
        try {
            SharedPreferences prefs = service.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            JSONArray memories = new JSONArray(prefs.getString(KEY_MEMORY_VAULT, "[]"));
            List<String> memList = new ArrayList<>();
            for (int i = 0; i < memories.length(); i++) {
                String m = memories.optString(i, "").trim();
                if (!m.isEmpty()) memList.add(m);
            }

            if (userTurnText != null) {
                Matcher remMatcher = Pattern.compile("(?i)(?:remember\\s+(?:that\\s+)?|don'?t\\s+forget\\s+(?:that\\s+)?|my\\s+name\\s+is\\s+|call\\s+me\\s+)(.{3,180})").matcher(userTurnText.trim());
                if (remMatcher.find()) {
                    String fact = "User fact: " + remMatcher.group(0).trim();
                    if (!memList.contains(fact)) memList.add(fact);
                }
            }

            if (rawAiReply != null) {
                Matcher tagMatcher = Pattern.compile("(?i)\\[\\[MEMORY:\\s*([^\\]]+)\\]\\]").matcher(rawAiReply);
                while (tagMatcher.find()) {
                    String fact = tagMatcher.group(1).trim();
                    if (!fact.isEmpty() && !memList.contains(fact)) {
                        memList.add(fact);
                    }
                }
            }

            while (memList.size() > 40) {
                memList.remove(0);
            }
            JSONArray updatedMemArr = new JSONArray();
            for (String f : memList) updatedMemArr.put(f);

            JSONArray history = loadNativeConversationHistory();
            List<JSONObject> turns = new ArrayList<>();
            for (int i = 0; i < history.length(); i++) {
                JSONObject obj = history.optJSONObject(i);
                if (obj != null) turns.add(obj);
            }
            if (userTurnText != null && !userTurnText.trim().isEmpty()) {
                turns.add(new JSONObject().put("role", "user").put("text", userTurnText.trim()));
            }
            if (rawAiReply != null && !rawAiReply.trim().isEmpty()) {
                String cleanAi = rawAiReply
                        .replaceAll("(?i)\\[\\[MEMORY:\\s*[^\\]]*\\]\\]", "")
                        .replaceAll("(?i)\\[\\[INJECT_REPLY:\\s*[\\s\\S]*?\\]\\]", "")
                        .trim();
                if (!cleanAi.isEmpty()) {
                    turns.add(new JSONObject().put("role", "assistant").put("text", cleanAi));
                }
            }
            while (turns.size() > 16) {
                turns.remove(0);
            }
            JSONArray updatedHistArr = new JSONArray();
            for (JSONObject t : turns) updatedHistArr.put(t);

            prefs.edit()
                    .putString(KEY_MEMORY_VAULT, updatedMemArr.toString())
                    .putString(KEY_CONVERSATION_HISTORY, updatedHistArr.toString())
                    .apply();
        } catch (Exception ignored) {}
    }

    private String queryLLMDirect(String systemPrompt, String userPrompt) throws Exception {
        return queryLLMDirect(systemPrompt, userPrompt, null);
    }

    private String queryLLMDirect(String systemPrompt, String userPrompt, String cleanUserTurnForHistory) throws Exception {
        String memoryBlock = loadNativeMemoryBlock();
        String enrichedSystemPrompt = systemPrompt + (memoryBlock.isEmpty() ? "" : ("\n" + memoryBlock));
        SharedPreferences prefs = service.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String backend = prefs.getString(KEY_BACKEND, "GEMINI");
        String rawApiKey = prefs.getString(KEY_API_KEY, "");
        String rawGeminiKey = prefs.getString(KEY_GEMINI_KEY, "");
        String rawGroqKey = prefs.getString(KEY_GROQ_KEY, "");
        if ((!rawApiKey.isEmpty() && !rawApiKey.startsWith(IrisKeystorePlugin.NATIVE_ENC_PREFIX))
                || (!rawGeminiKey.isEmpty() && !rawGeminiKey.startsWith(IrisKeystorePlugin.NATIVE_ENC_PREFIX))
                || (!rawGroqKey.isEmpty() && !rawGroqKey.startsWith(IrisKeystorePlugin.NATIVE_ENC_PREFIX))) {
            SharedPreferences.Editor ed = prefs.edit();
            if (!rawApiKey.isEmpty() && !rawApiKey.startsWith(IrisKeystorePlugin.NATIVE_ENC_PREFIX)) {
                ed.putString(KEY_API_KEY, IrisKeystorePlugin.encryptNative(rawApiKey));
            }
            if (!rawGeminiKey.isEmpty() && !rawGeminiKey.startsWith(IrisKeystorePlugin.NATIVE_ENC_PREFIX)) {
                ed.putString(KEY_GEMINI_KEY, IrisKeystorePlugin.encryptNative(rawGeminiKey));
            }
            if (!rawGroqKey.isEmpty() && !rawGroqKey.startsWith(IrisKeystorePlugin.NATIVE_ENC_PREFIX)) {
                ed.putString(KEY_GROQ_KEY, IrisKeystorePlugin.encryptNative(rawGroqKey));
            }
            ed.apply();
        }
        String apiKey = IrisKeystorePlugin.decryptNative(rawApiKey);
        String geminiKey = IrisKeystorePlugin.decryptNative(rawGeminiKey);
        String groqKey = IrisKeystorePlugin.decryptNative(rawGroqKey);
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

        String rawResult;
        if ("GROQ".equalsIgnoreCase(backend)) {
            String groqModel = prefs.getString(KEY_GROQ_MODEL, "llama-3.3-70b-versatile");
            try {
                rawResult = callGroqDirect(effectiveKey.trim(), groqModel, enrichedSystemPrompt, userPrompt);
            } catch (Exception firstErr) {
                String fallback = discoverActiveGroqModel(effectiveKey.trim(), groqModel);
                if (fallback != null && !fallback.equals(groqModel)) {
                    prefs.edit().putString(KEY_GROQ_MODEL, fallback).apply();
                    rawResult = callGroqDirect(effectiveKey.trim(), fallback, enrichedSystemPrompt, userPrompt);
                } else {
                    throw firstErr;
                }
            }
        } else {
            String cleanModel = sanitizeNativeGeminiModel(model);
            if (!cleanModel.equals(model)) {
                prefs.edit().putString(KEY_MODEL, cleanModel).apply();
            }
            try {
                rawResult = callGeminiDirect(effectiveKey.trim(), cleanModel, enrichedSystemPrompt, userPrompt);
            } catch (Exception firstErr) {
                markNativeModelDiscontinued(cleanModel, firstErr.getMessage());
                List<String> fallbackCandidates = new ArrayList<>();
                String discovered = discoverActiveGeminiModel(effectiveKey.trim(), cleanModel);
                if (discovered != null && !discovered.equals(cleanModel)) {
                    fallbackCandidates.add(discovered);
                }
                for (String evergreen : new String[]{"gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite"}) {
                    if (!evergreen.equals(cleanModel) && !isDiscontinuedNativeGeminiModel(evergreen) && !fallbackCandidates.contains(evergreen)) {
                        fallbackCandidates.add(evergreen);
                    }
                }
                String recovered = null;
                for (String fbModel : fallbackCandidates) {
                    try {
                        recovered = callGeminiDirect(effectiveKey.trim(), fbModel, enrichedSystemPrompt, userPrompt);
                        prefs.edit().putString(KEY_MODEL, fbModel).apply();
                        break;
                    } catch (Exception fbErr) {
                        markNativeModelDiscontinued(fbModel, fbErr.getMessage());
                    }
                }
                if (recovered == null) throw firstErr;
                rawResult = recovered;
            }
        }

        if (cleanUserTurnForHistory != null && !cleanUserTurnForHistory.isEmpty()) {
            recordNativeMemoryAndTurn(cleanUserTurnForHistory, rawResult);
        } else {
            recordNativeMemoryAndTurn(null, rawResult);
        }
        return rawResult;
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
        JSONArray history = loadNativeConversationHistory();
        int histStart = Math.max(0, history.length() - 10);
        for (int i = histStart; i < history.length(); i++) {
            JSONObject turn = history.optJSONObject(i);
            if (turn != null) {
                String r = turn.optString("role", "");
                String t = turn.optString("text", "");
                if (("user".equals(r) || "assistant".equals(r)) && !t.isEmpty()) {
                    messages.put(new JSONObject().put("role", r).put("content", t));
                }
            }
        }
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
        JSONArray history = loadNativeConversationHistory();
        int histStart = Math.max(0, history.length() - 10);
        boolean isGemma = modelId != null && modelId.toLowerCase().contains("gemma");
        if (isGemma) {
            String combinedPrompt = "[System Instructions]:\n" + systemPrompt + "\n\n[User Request]:\n" + userPrompt;
            contents.put(new JSONObject().put("role", "user").put("parts", new JSONArray().put(new JSONObject().put("text", combinedPrompt))));
            body.put("contents", contents);
        } else {
            for (int i = histStart; i < history.length(); i++) {
                JSONObject turn = history.optJSONObject(i);
                if (turn != null) {
                    String r = turn.optString("role", "");
                    String t = turn.optString("text", "");
                    if (!t.isEmpty() && ("user".equals(r) || "assistant".equals(r))) {
                        String gemRole = "user".equals(r) ? "user" : "model";
                        contents.put(new JSONObject().put("role", gemRole).put("parts", new JSONArray().put(new JSONObject().put("text", t))));
                    }
                }
            }
            contents.put(new JSONObject().put("role", "user").put("parts", new JSONArray().put(new JSONObject().put("text", userPrompt))));
            body.put("contents", contents);
            body.put("systemInstruction", new JSONObject().put("parts", new JSONArray().put(new JSONObject().put("text", systemPrompt))));
        }

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

    private double scoreNativeGeminiModel(String id) {
        if (id == null) return 0.0;
        String lower = id.trim().toLowerCase().replace("models/", "");
        if (lower.equals("gemini-flash-latest")) return 145.0;
        if (lower.equals("gemini-flash-lite-latest")) return 143.0;
        Matcher m = Pattern.compile("^gemini-(\\d+(?:\\.\\d+)?)-(flash-lite|flash|pro)(.*)$").matcher(lower);
        if (m.find()) {
            double ver = 2.5;
            try { ver = Double.parseDouble(m.group(1)); } catch (Exception ignored) {}
            String tier = m.group(2);
            String suffix = m.group(3) != null ? m.group(3) : "";
            boolean isPreviewOrExp = suffix.contains("preview") || suffix.contains("exp");
            double base = 100.0 + ver * 20.0;
            double tierBonus = "flash".equals(tier) ? 6.0 : "flash-lite".equals(tier) ? 4.0 : -14.0;
            double stabilityOffset = isPreviewOrExp ? -18.0 : 0.0;
            return base + tierBonus + stabilityOffset;
        }
        if (lower.startsWith("gemma-3-27b")) return 95.0;
        if (lower.startsWith("gemma-3-")) return 90.0;
        if (lower.contains("flash")) return 85.0;
        return 50.0;
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
                    String bestModel = null;
                    double bestScore = -1.0;
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
                        if (!supportsGen || rawName.equals(failedModel) || isDiscontinuedNativeGeminiModel(rawName)) {
                            continue;
                        }
                        double score = scoreNativeGeminiModel(rawName);
                        if (score > bestScore) {
                            bestScore = score;
                            bestModel = rawName;
                        }
                    }
                    return bestModel;
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
