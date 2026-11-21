package com.stitch.iris.launcher;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.service.voice.VoiceInteractionSession;
import android.service.voice.VoiceInteractionSessionService;
import android.util.Log;

public class IrisVoiceSessionService extends VoiceInteractionSessionService {
    private static final String TAG = "IrisVoiceSession";

    @Override
    public VoiceInteractionSession onNewSession(Bundle args) {
        return new IrisVoiceSession(this);
    }

    private static class IrisVoiceSession extends VoiceInteractionSession {
        public IrisVoiceSession(Context context) {
            super(context);
        }

        @Override
        public void onShow(Bundle args, int showFlags) {
            super.onShow(args, showFlags);
            Log.d(TAG, "System Assist gesture triggered! Launching IRIS Voice AI");
            try {
                LauncherPlugin.onVoiceAssistTriggered();
                Intent intent = new Intent(getContext(), MainActivity.class);
                intent.setAction(Intent.ACTION_ASSIST);
                intent.putExtra("iris_trigger_voice_assist", true);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                getContext().startActivity(intent);
            } catch (Exception e) {
                Log.e(TAG, "Failed to launch MainActivity from VoiceInteractionSession", e);
            } finally {
                hide();
            }
        }
    }
}
