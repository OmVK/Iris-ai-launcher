package com.stitch.iris.launcher;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Parcelable;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Collections;
import java.util.Set;

public class IrisNotificationListenerService extends NotificationListenerService {

    private static final String TAG = "IrisNotificationService";
    public static final String ACTION_NOTIFICATION_UPDATED = "com.stitch.iris.launcher.NOTIFICATION_UPDATED";
    public static final String PREFS_NAME = "iris_launcher_prefs";
    public static final String KEY_LOCKED_PACKAGES = "locked_packages_set";
    public static final String KEY_NOTIFICATION_ARCHIVE = "iris_native_notif_archive";
    public static final String KEY_ARCHIVE_CLEARED_AT = "iris_notif_archive_cleared_at";
    public static final String KEY_DELETED_ARCHIVE_IDS = "iris_notif_deleted_ids";
    private static final int MAX_ARCHIVE_SIZE = 100;
    private static final java.util.concurrent.ConcurrentHashMap<String, String> appLabelCache = new java.util.concurrent.ConcurrentHashMap<>();
    private static final java.util.concurrent.ConcurrentHashMap<String, Notification.Action> replyActions = new java.util.concurrent.ConcurrentHashMap<>();
    private static final java.util.regex.Pattern OTP_PATTERN = java.util.regex.Pattern.compile(
            "(?i)(?:otp|code|pin|verification|passcode|security\\s+code|auth|login|is|use)[^0-9]{0,20}\\b(\\d{4,8})\\b|\\b(\\d{4,8})\\b[^0-9]{0,20}(?:is\\s+your|verification|otp|code|passcode)"
    );
    private static IrisNotificationListenerService instance;

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        instance = this;
        Log.d(TAG, "Notification Listener Connected");
        cancelAllVaultNotificationsNow();
        archiveCurrentlyActiveNotifications();
        broadcastUpdate();
    }

    @Override
    public void onListenerDisconnected() {
        super.onListenerDisconnected();
        instance = null;
    }

    private Set<String> getLockedPackages() {
        Set<String> pkgs = LauncherPlugin.getVaultPackages();
        if (pkgs != null && !pkgs.isEmpty()) {
            return pkgs;
        }
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            return prefs.getStringSet(KEY_LOCKED_PACKAGES, Collections.emptySet());
        } catch (Exception e) {
            Log.e(TAG, "Error reading locked packages from prefs", e);
            return Collections.emptySet();
        }
    }

    private boolean isPackageLocked(String pkg) {
        if (pkg == null) return false;
        Set<String> locked = getLockedPackages();
        return locked != null && locked.contains(pkg);
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            if (sbn == null) return;
            String pkg = sbn.getPackageName();
            if (pkg != null && isPackageLocked(pkg)) {
                cancelNotification(sbn.getKey());
                try {
                    cancelNotification(sbn.getPackageName(), sbn.getTag(), sbn.getId());
                } catch (Exception ignored) {}
                Log.d(TAG, "BLOCKED and cancelled notification for locked app: " + pkg);
                return;
            }
            JSONObject extracted = extractNotificationJson(sbn);
            if (extracted != null) {
                recordToNativeArchive(this, extracted);
                LauncherPlugin.onNotificationPostedEvent(extracted);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error handling onNotificationPosted", e);
        }
        broadcastUpdate();
    }

    private void archiveCurrentlyActiveNotifications() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            long clearedAt = prefs.getLong(KEY_ARCHIVE_CLEARED_AT, 0L);
            StatusBarNotification[] active = getActiveNotifications();
            if (active == null) return;
            for (StatusBarNotification sbn : active) {
                if (sbn == null || isPackageLocked(sbn.getPackageName())) continue;
                if (clearedAt > 0 && sbn.getPostTime() <= clearedAt) continue;
                JSONObject extracted = extractNotificationJson(sbn);
                if (extracted != null) {
                    recordToNativeArchive(this, extracted);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error archiving active notifications on connect", e);
        }
    }

    private String resolveAppLabel(String pkg) {
        if (pkg == null || pkg.isEmpty()) return "";
        String cached = appLabelCache.get(pkg);
        if (cached != null) return cached;
        try {
            PackageManager pm = getPackageManager();
            ApplicationInfo ai = pm.getApplicationInfo(pkg, 0);
            CharSequence label = pm.getApplicationLabel(ai);
            String resolved = label != null ? label.toString() : pkg;
            appLabelCache.put(pkg, resolved);
            return resolved;
        } catch (Exception e) {
            appLabelCache.put(pkg, pkg);
            return pkg;
        }
    }

    private static boolean isDeletedPlaceholderText(String text) {
        if (text == null) return false;
        String lower = text.trim().toLowerCase();
        return lower.equals("this message was deleted")
                || lower.equals("this message was deleted.")
                || lower.equals("you deleted this message")
                || lower.equals("you deleted this message.")
                || lower.equals("message deleted")
                || lower.contains("this message was deleted")
                || lower.contains("unsent a message");
    }

    private JSONObject extractNotificationJson(StatusBarNotification sbn) {
        if (sbn == null) return null;
        String pkg = sbn.getPackageName();
        if (pkg == null || pkg.isEmpty()) return null;
        if (pkg.equals(getPackageName()) || pkg.equals("android") || pkg.equals("com.android.systemui")) {
            return null;
        }

        Notification n = sbn.getNotification();
        if (n == null || n.extras == null) return null;

        // Skip group summary headers (e.g. WhatsApp "2 messages from 2 chats") so only real messages are logged
        if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) {
            return null;
        }

        // Skip media transport / playback controls
        boolean isMedia = Notification.CATEGORY_TRANSPORT.equals(n.category)
                || n.extras.containsKey(Notification.EXTRA_MEDIA_SESSION);
        if (isMedia) return null;

        // Skip silent ongoing progress bars (downloads, backups) unless clearable
        if (!sbn.isClearable() && n.extras.getInt(Notification.EXTRA_PROGRESS_MAX, 0) > 0) {
            return null;
        }

        Bundle extras = n.extras;
        CharSequence convTitleSeq = extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE);
        CharSequence titleSeq = extras.getCharSequence(Notification.EXTRA_TITLE);
        if (titleSeq == null || titleSeq.length() == 0) {
            titleSeq = extras.getCharSequence(Notification.EXTRA_TITLE_BIG);
        }

        String title = titleSeq != null ? titleSeq.toString().trim() : "";
        String convTitle = convTitleSeq != null ? convTitleSeq.toString().trim() : "";
        if (!convTitle.isEmpty() && !title.isEmpty() && !title.equals(convTitle) && !title.startsWith(convTitle)) {
            title = convTitle + " • " + title;
        } else if (title.isEmpty() && !convTitle.isEmpty()) {
            title = convTitle;
        }

        String text = "";

        // 1. MessagingStyle (WhatsApp, Telegram, Instagram, Google Messages)
        try {
            Parcelable[] msgParcelables = extras.getParcelableArray(Notification.EXTRA_MESSAGES);
            if (msgParcelables != null && msgParcelables.length > 0) {
                Parcelable lastP = msgParcelables[msgParcelables.length - 1];
                if (lastP instanceof Bundle) {
                    Bundle msgBundle = (Bundle) lastP;
                    CharSequence msgText = msgBundle.getCharSequence("text");
                    CharSequence sender = msgBundle.getCharSequence("sender");
                    if (msgText != null && msgText.length() > 0) {
                        text = msgText.toString().trim();
                    }
                    if (title.isEmpty() && sender != null && sender.length() > 0) {
                        title = sender.toString().trim();
                    }
                }
            }
        } catch (Exception ignored) {}

        // 2. BigText fallback (long messages)
        if (text.isEmpty()) {
            CharSequence bigTextSeq = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
            if (bigTextSeq != null && bigTextSeq.length() > 0) {
                text = bigTextSeq.toString().trim();
            }
        }

        // 3. Standard EXTRA_TEXT fallback
        if (text.isEmpty()) {
            CharSequence textSeq = extras.getCharSequence(Notification.EXTRA_TEXT);
            if (textSeq != null && textSeq.length() > 0) {
                text = textSeq.toString().trim();
            }
        }

        // 4. InboxStyle EXTRA_TEXT_LINES fallback
        if (text.isEmpty()) {
            CharSequence[] lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
            if (lines != null && lines.length > 0) {
                CharSequence lastLine = lines[lines.length - 1];
                if (lastLine != null) {
                    text = lastLine.toString().trim();
                }
            }
        }

        if (title.isEmpty() && text.isEmpty()) return null;

        // Ignore WhatsApp/Signal background "Checking for new messages..." noise
        String lowerText = text.toLowerCase();
        if (lowerText.equals("checking for new messages")
                || lowerText.equals("checking for messages…")
                || lowerText.equals("running in background")) {
            return null;
        }

        try {
            JSONObject obj = new JSONObject();
            long postTime = sbn.getPostTime() > 0 ? sbn.getPostTime() : System.currentTimeMillis();
            String recordId = postTime + "_" + Math.abs((pkg + title + text).hashCode());
            obj.put("id", recordId);
            obj.put("sbnId", sbn.getId());
            obj.put("key", sbn.getKey());
            obj.put("packageId", pkg);
            obj.put("appName", resolveAppLabel(pkg));
            obj.put("title", title);
            obj.put("text", text);
            obj.put("postTime", postTime);
            obj.put("timestamp", System.currentTimeMillis());
            obj.put("deletedBySender", isDeletedPlaceholderText(text));
            obj.put("dismissedFromSystem", false);

            // Detect inline reply RemoteInput action
            boolean canReply = false;
            if (n.actions != null) {
                for (Notification.Action action : n.actions) {
                    if (action != null && action.actionIntent != null && action.getRemoteInputs() != null && action.getRemoteInputs().length > 0) {
                        canReply = true;
                        if (sbn.getKey() != null) replyActions.put(sbn.getKey(), action);
                        replyActions.put(recordId, action);
                        replyActions.put(pkg, action);
                        break;
                    }
                }
            }
            obj.put("canReply", canReply);

            // Detect 4-8 digit OTP / verification code
            String otpCode = extractOtpCode(title + " " + text);
            if (otpCode != null && !otpCode.isEmpty()) {
                obj.put("otpCode", otpCode);
            }

            return obj;
        } catch (Exception e) {
            return null;
        }
    }

    public static String extractOtpCode(String combined) {
        if (combined == null || combined.isEmpty()) return null;
        try {
            java.util.regex.Matcher m = OTP_PATTERN.matcher(combined);
            if (m.find()) {
                String g1 = m.group(1);
                String g2 = m.group(2);
                return g1 != null ? g1 : g2;
            }
        } catch (Exception ignored) {}
        return null;
    }

    public static boolean sendInlineReply(Context context, String keyOrId, String replyText) {
        if (context == null || keyOrId == null || replyText == null || replyText.trim().isEmpty()) {
            return false;
        }
        Notification.Action action = replyActions.get(keyOrId);
        if (action == null || action.actionIntent == null || action.getRemoteInputs() == null) {
            return false;
        }
        try {
            android.content.Intent intent = new android.content.Intent();
            Bundle bundle = new Bundle();
            for (android.app.RemoteInput remoteInput : action.getRemoteInputs()) {
                bundle.putCharSequence(remoteInput.getResultKey(), replyText.trim());
            }
            android.app.RemoteInput.addResultsToIntent(action.getRemoteInputs(), intent, bundle);
            action.actionIntent.send(context, 0, intent);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Failed to send inline reply", e);
            return false;
        }
    }

    private static java.util.Set<String> getDeletedArchiveIds(SharedPreferences prefs) {
        java.util.Set<String> set = new java.util.HashSet<>();
        if (prefs == null) return set;
        try {
            String raw = prefs.getString(KEY_DELETED_ARCHIVE_IDS, "[]");
            JSONArray arr = new JSONArray(raw);
            for (int i = 0; i < arr.length(); i++) {
                String val = arr.optString(i, "");
                if (!val.isEmpty()) set.add(val);
            }
        } catch (Exception ignored) {}
        return set;
    }

    private static void saveDeletedArchiveIds(SharedPreferences prefs, java.util.Set<String> ids) {
        if (prefs == null || ids == null) return;
        try {
            JSONArray arr = new JSONArray();
            int count = 0;
            for (String s : ids) {
                if (s != null && !s.isEmpty()) {
                    arr.put(s);
                    if (++count >= 300) break;
                }
            }
            prefs.edit().putString(KEY_DELETED_ARCHIVE_IDS, arr.toString()).commit();
        } catch (Exception ignored) {}
    }

    private static boolean isDeletedArchiveItem( java.util.Set<String> deletedIds, JSONObject item) {
        if (deletedIds == null || deletedIds.isEmpty() || item == null) return false;
        String id = item.optString("id", "");
        String key = item.optString("key", "");
        String pkg = item.optString("packageId", "");
        String title = item.optString("title", "");
        String text = item.optString("text", "");
        String sig = pkg + "|" + title + "|" + text;
        return (!id.isEmpty() && deletedIds.contains(id))
                || (!key.isEmpty() && deletedIds.contains(key))
                || deletedIds.contains(sig);
    }

    public static synchronized void recordToNativeArchive(Context context, JSONObject incoming) {
        if (context == null || incoming == null) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            long clearedAt = prefs.getLong(KEY_ARCHIVE_CLEARED_AT, 0L);
            long postTime = incoming.optLong("postTime", 0L);
            if (clearedAt > 0 && postTime > 0 && postTime <= clearedAt) {
                return;
            }
            java.util.Set<String> deletedIds = getDeletedArchiveIds(prefs);
            if (isDeletedArchiveItem(deletedIds, incoming)) {
                return;
            }
            String raw = prefs.getString(KEY_NOTIFICATION_ARCHIVE, "[]");
            JSONArray current = new JSONArray(raw);

            String pkg = incoming.optString("packageId", "");
            String title = incoming.optString("title", "");
            String text = incoming.optString("text", "");
            String key = incoming.optString("key", "");
            long now = System.currentTimeMillis();

            // Check if this is a "This message was deleted" update from WhatsApp/Telegram/Instagram
            if (isDeletedPlaceholderText(text)) {
                boolean markedExisting = false;
                for (int i = 0; i < current.length(); i++) {
                    JSONObject item = current.getJSONObject(i);
                    if (pkg.equals(item.optString("packageId", ""))) {
                        String itemTitle = item.optString("title", "");
                        if (title.isEmpty() || itemTitle.equals(title) || itemTitle.contains(title) || title.contains(itemTitle)) {
                            item.put("deletedBySender", true);
                            item.put("deletedAt", now);
                            markedExisting = true;
                            break;
                        }
                    }
                }
                if (markedExisting) {
                    prefs.edit().putString(KEY_NOTIFICATION_ARCHIVE, current.toString()).apply();
                    return;
                }
            }

            // Deduplicate identical (packageId + title + text) within 60 seconds
            for (int i = 0; i < Math.min(current.length(), 25); i++) {
                JSONObject item = current.getJSONObject(i);
                if (pkg.equals(item.optString("packageId", ""))
                        && title.equals(item.optString("title", ""))
                        && text.equals(item.optString("text", ""))) {
                    long prevTs = item.optLong("timestamp", 0);
                    if (Math.abs(now - prevTs) < 60000) {
                        return;
                    }
                }
            }

            JSONArray updated = new JSONArray();
            updated.put(incoming);
            for (int i = 0; i < current.length() && updated.length() < MAX_ARCHIVE_SIZE; i++) {
                updated.put(current.getJSONObject(i));
            }
            prefs.edit().putString(KEY_NOTIFICATION_ARCHIVE, updated.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Failed recording to native notification archive", e);
        }
    }

    public static synchronized void markRemovedInNativeArchive(Context context, StatusBarNotification sbn, int reason) {
        if (context == null || sbn == null) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(KEY_NOTIFICATION_ARCHIVE, "[]");
            JSONArray current = new JSONArray(raw);
            String key = sbn.getKey();
            String pkg = sbn.getPackageName();
            // REASON_APP_CANCEL (8) or REASON_APP_CANCEL_ALL (9) indicates the app itself revoked/unsent the notification
            boolean revokedByApp = (reason == NotificationListenerService.REASON_APP_CANCEL);

            boolean changed = false;
            for (int i = 0; i < current.length(); i++) {
                JSONObject item = current.getJSONObject(i);
                if ((key != null && key.equals(item.optString("key", "")))
                        || (i == 0 && pkg != null && pkg.equals(item.optString("packageId", "")))) {
                    item.put("dismissedFromSystem", true);
                    if (revokedByApp) {
                        item.put("deletedBySender", true);
                    }
                    changed = true;
                    if (key != null && key.equals(item.optString("key", ""))) break;
                }
            }
            if (changed) {
                prefs.edit().putString(KEY_NOTIFICATION_ARCHIVE, current.toString()).apply();
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed marking removed in native archive", e);
        }
    }

    public static synchronized JSONArray getArchivedNotificationsJson(Context context) {
        if (context == null) return new JSONArray();
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(KEY_NOTIFICATION_ARCHIVE, "[]");
            return new JSONArray(raw);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    public static synchronized void clearNativeArchive(Context context) {
        if (context == null) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                .putString(KEY_NOTIFICATION_ARCHIVE, "[]")
                .putString(KEY_DELETED_ARCHIVE_IDS, "[]")
                .putLong(KEY_ARCHIVE_CLEARED_AT, System.currentTimeMillis())
                .commit();
        } catch (Exception ignored) {}
    }

    public static synchronized void deleteFromNativeArchive(Context context, String id) {
        if (context == null || id == null || id.isEmpty()) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            java.util.Set<String> deletedIds = getDeletedArchiveIds(prefs);
            deletedIds.add(id);

            String raw = prefs.getString(KEY_NOTIFICATION_ARCHIVE, "[]");
            JSONArray current = new JSONArray(raw);
            JSONArray next = new JSONArray();
            for (int i = 0; i < current.length(); i++) {
                JSONObject item = current.getJSONObject(i);
                String itemId = item.optString("id", "");
                String itemKey = item.optString("key", "");
                String itemPkg = item.optString("packageId", "");
                String itemTitle = item.optString("title", "");
                String itemText = item.optString("text", "");
                String itemSig = itemPkg + "|" + itemTitle + "|" + itemText;
                String itemAppSig = itemPkg + "|" + item.optString("appName", "") + "|" + itemText;
                if (id.equals(itemId) || id.equals(itemKey) || id.equals(itemSig) || id.equals(itemAppSig)) {
                    if (!itemId.isEmpty()) deletedIds.add(itemId);
                    if (!itemKey.isEmpty()) deletedIds.add(itemKey);
                    deletedIds.add(itemSig);
                } else {
                    next.put(item);
                }
            }
            saveDeletedArchiveIds(prefs, deletedIds);
            prefs.edit().putString(KEY_NOTIFICATION_ARCHIVE, next.toString()).commit();
        } catch (Exception ignored) {}
    }

    public void cancelVaultNotification(String packageId) {
        try {
            StatusBarNotification[] active = getActiveNotifications();
            if (active == null) return;
            for (StatusBarNotification sbn : active) {
                if (packageId != null && packageId.equals(sbn.getPackageName())) {
                    cancelNotification(sbn.getKey());
                    try {
                        cancelNotification(sbn.getPackageName(), sbn.getTag(), sbn.getId());
                    } catch (Exception ignored) {}
                    Log.d(TAG, "Cancelled notification for locked app: " + packageId);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling vault notification", e);
        }
    }

    public void cancelAllVaultNotificationsNow() {
        try {
            Set<String> vaultPkgs = getLockedPackages();
            if (vaultPkgs == null || vaultPkgs.isEmpty()) return;
            StatusBarNotification[] active = getActiveNotifications();
            if (active == null) return;
            for (StatusBarNotification sbn : active) {
                String pkg = sbn.getPackageName();
                if (pkg != null && vaultPkgs.contains(pkg)) {
                    cancelNotification(sbn.getKey());
                    try {
                        cancelNotification(sbn.getPackageName(), sbn.getTag(), sbn.getId());
                    } catch (Exception ignored) {}
                    Log.d(TAG, "Cancelled locked app notification from: " + pkg);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling all vault notifications", e);
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        markRemovedInNativeArchive(this, sbn, 0);
        broadcastUpdate();
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn, RankingMap rankingMap, int reason) {
        markRemovedInNativeArchive(this, sbn, reason);
        broadcastUpdate();
    }

    public static IrisNotificationListenerService getInstance() {
        return instance;
    }

    public JSONArray getActiveNotificationsJson() {
        JSONArray jsonArray = new JSONArray();
        try {
            StatusBarNotification[] activeNotifications = getActiveNotifications();
            if (activeNotifications != null) {
                Set<String> lockedPkgs = getLockedPackages();
                for (StatusBarNotification sbn : activeNotifications) {
                    if (!sbn.isClearable()) continue;

                    String pkg = sbn.getPackageName();
                    if (pkg != null && lockedPkgs != null && lockedPkgs.contains(pkg)) {
                        cancelNotification(sbn.getKey());
                        continue;
                    }

                    JSONObject extracted = extractNotificationJson(sbn);
                    if (extracted != null) {
                        jsonArray.put(extracted);
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting active notifications", e);
        }
        return jsonArray;
    }

    public static String sanitizePii(String input) {
        if (input == null || input.isEmpty()) return "";
        // 1. Scrub OTPs & authentication codes
        String sanitized = input.replaceAll("(?i)\\b(?:otp|code|pin|verification|auth|password|passcode)\\s*[:=-]?\\s*\\d{4,8}\\b", "[PROTECTED_OTP]");
        // 2. Scrub standalone 6-digit verification codes
        sanitized = sanitized.replaceAll("\\b\\d{3}[-\\s]\\d{3}\\b", "[SECURE_CODE]");
        // 3. Scrub credit card / payment account sequences
        sanitized = sanitized.replaceAll("\\b(?:\\d[ -]*?){13,19}\\b", "[CONFIDENTIAL_ACCOUNT]");
        // 4. Scrub email addresses
        sanitized = sanitized.replaceAll("(?i)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", "[REDACTED_EMAIL]");
        // 5. Scrub international phone numbers
        sanitized = sanitized.replaceAll("(?i)(\\+?\\d{1,3}[- .]?)?\\(?\\d{3}\\)?[- .]?\\d{3}[- .]?\\d{4}", "[REDACTED_PHONE]");
        // 6. Scrub crypto addresses (Ethereum / Bitcoin)
        sanitized = sanitized.replaceAll("\\b0x[a-fA-F0-9]{40}\\b", "[CRYPTO_ADDR]");
        sanitized = sanitized.replaceAll("\\b(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}\\b", "[CRYPTO_ADDR]");
        // 7. Scrub UPI IDs
        sanitized = sanitized.replaceAll("(?i)[a-zA-Z0-9.\\-_]{2,256}@[a-zA-Z]{2,64}", "[UPI_HANDLE]");
        return sanitized;
    }

    public void dismissNotification(String key) {
        try {
            cancelNotification(key);
            broadcastUpdate();
        } catch (Exception e) {
            Log.e(TAG, "Failed to dismiss notification", e);
        }
    }

    public JSONObject getActiveMediaInfo() {
        JSONObject result = new JSONObject();
        try {
            android.media.session.MediaSessionManager msm = (android.media.session.MediaSessionManager) getSystemService(Context.MEDIA_SESSION_SERVICE);
            if (msm != null) {
                android.content.ComponentName comp = new android.content.ComponentName(this, IrisNotificationListenerService.class);
                java.util.List<android.media.session.MediaController> controllers = msm.getActiveSessions(comp);
                if (controllers != null && !controllers.isEmpty()) {
                    android.media.session.MediaController chosen = controllers.get(0);
                    for (android.media.session.MediaController c : controllers) {
                        android.media.session.PlaybackState state = c.getPlaybackState();
                        if (state != null && state.getState() == android.media.session.PlaybackState.STATE_PLAYING) {
                            chosen = c;
                            break;
                        }
                    }
                    result.put("packageId", chosen.getPackageName());
                    android.media.session.PlaybackState state = chosen.getPlaybackState();
                    boolean playing = state != null && state.getState() == android.media.session.PlaybackState.STATE_PLAYING;
                    result.put("isPlaying", playing);

                    android.media.MediaMetadata meta = chosen.getMetadata();
                    if (meta != null) {
                        CharSequence title = meta.getText(android.media.MediaMetadata.METADATA_KEY_TITLE);
                        if (title == null) title = meta.getText(android.media.MediaMetadata.METADATA_KEY_DISPLAY_TITLE);
                        CharSequence artist = meta.getText(android.media.MediaMetadata.METADATA_KEY_ARTIST);
                        if (artist == null) artist = meta.getText(android.media.MediaMetadata.METADATA_KEY_ALBUM_ARTIST);
                        CharSequence album = meta.getText(android.media.MediaMetadata.METADATA_KEY_ALBUM);

                        result.put("title", title != null ? title.toString() : "");
                        result.put("artist", artist != null ? artist.toString() : "");
                        result.put("album", album != null ? album.toString() : "");
                    }
                    return result;
                }
            }
        } catch (Exception e) {
            Log.d(TAG, "MediaSessionManager query fallback: " + e.getMessage());
        }

        // Fallback: inspect active media/transport notifications
        try {
            StatusBarNotification[] active = getActiveNotifications();
            if (active != null) {
                for (StatusBarNotification sbn : active) {
                    Notification n = sbn.getNotification();
                    if (n == null || n.extras == null) continue;
                    boolean isMedia = Notification.CATEGORY_TRANSPORT.equals(n.category)
                            || n.extras.containsKey(Notification.EXTRA_MEDIA_SESSION);
                    if (!isMedia) continue;

                    String title = n.extras.getString(Notification.EXTRA_TITLE, "");
                    CharSequence textSeq = n.extras.getCharSequence(Notification.EXTRA_TEXT);
                    String artist = textSeq != null ? textSeq.toString() : "";
                    result.put("packageId", sbn.getPackageName());
                    result.put("title", title);
                    result.put("artist", artist);
                    result.put("isPlaying", !sbn.isClearable());
                    return result;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error inspecting media notifications", e);
        }
        return result;
    }

    public boolean dispatchActiveMediaTransport(String key) {
        try {
            android.media.session.MediaSessionManager msm = (android.media.session.MediaSessionManager) getSystemService(Context.MEDIA_SESSION_SERVICE);
            if (msm == null) return false;
            android.content.ComponentName comp = new android.content.ComponentName(this, IrisNotificationListenerService.class);
            java.util.List<android.media.session.MediaController> controllers = msm.getActiveSessions(comp);
            if (controllers == null || controllers.isEmpty()) return false;

            android.media.session.MediaController target = controllers.get(0);
            for (android.media.session.MediaController c : controllers) {
                android.media.session.PlaybackState state = c.getPlaybackState();
                if (state != null && state.getState() == android.media.session.PlaybackState.STATE_PLAYING) {
                    target = c;
                    break;
                }
            }
            android.media.session.MediaController.TransportControls controls = target.getTransportControls();
            if ("next".equals(key)) {
                controls.skipToNext();
                return true;
            } else if ("previous".equals(key)) {
                controls.skipToPrevious();
                return true;
            } else if ("play_pause".equals(key)) {
                android.media.session.PlaybackState state = target.getPlaybackState();
                if (state != null && state.getState() == android.media.session.PlaybackState.STATE_PLAYING) {
                    controls.pause();
                } else {
                    controls.play();
                }
                return true;
            }
        } catch (Exception e) {
            Log.d(TAG, "TransportControls fallback to key event: " + e.getMessage());
        }
        return false;
    }

    private void broadcastUpdate() {
        LauncherPlugin.onNotificationChanged();
    }
}
