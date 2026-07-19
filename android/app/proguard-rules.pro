# Capacitor bridge
-keep class com.getcapacitor.** { *; }
-keep class com.stitch.iris.launcher.** { *; }
-keep class com.stitch.iris.launcher.MainActivity { *; }
-keep class com.stitch.iris.launcher.LauncherPlugin { *; }

# Keep plugin method annotations for Capacitor reflection
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin <methods>;
}
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorCallback <methods>;
}

# AndroidX
-keep class androidx.** { *; }
-keep class androidx.biometric.** { *; }

# Cordova/Capacitor plugins
-keep class org.apache.cordova.** { *; }

# WebView JS interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Prevent stripping of service classes
-keep class * extends android.app.Service { *; }
-keep class * extends android.content.BroadcastReceiver { *; }

# ML Kit GenAI / Firebase AI on-device inference
-keep class com.google.mlkit.genai.** { *; }
-keep class com.google.firebase.ai.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_common.** { *; }

# Preserve line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
