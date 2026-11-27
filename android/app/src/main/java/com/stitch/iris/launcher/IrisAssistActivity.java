package com.stitch.iris.launcher;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

public class IrisAssistActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        overridePendingTransition(0, 0);

        if (!IrisFloatingCopilot.isScreenLocked(this)) {
            boolean handledInApp = IrisFloatingCopilot.triggerInAppAuroraAssistant(this);
            if (!handledInApp) {
                try {
                    LauncherPlugin.onVoiceAssistTriggered();
                    Intent intent = new Intent(this, MainActivity.class);
                    intent.setAction(Intent.ACTION_ASSIST);
                    intent.putExtra("iris_trigger_voice_assist", true);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    startActivity(intent);
                } catch (Exception ignored) {}
            }
        }

        finish();
        overridePendingTransition(0, 0);
    }
}
