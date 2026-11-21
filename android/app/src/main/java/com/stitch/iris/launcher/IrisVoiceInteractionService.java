package com.stitch.iris.launcher;

import android.service.voice.VoiceInteractionService;
import android.util.Log;

public class IrisVoiceInteractionService extends VoiceInteractionService {
    private static final String TAG = "IrisVoiceInteraction";

    @Override
    public void onReady() {
        super.onReady();
        Log.d(TAG, "IRIS VoiceInteractionService ready as system Digital Assistant");
    }
}
