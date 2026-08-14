package com.stitch.iris.launcher;

import android.annotation.SuppressLint;
import android.content.Context;
import android.media.MediaRecorder;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import java.io.File;

public class SilentAudioHelper {
    private static final String TAG = "SilentAudioHelper";

    public interface AudioCallback {
        void onRecordingDone(String filePath, boolean success);
    }

    @SuppressLint("MissingPermission")
    public static void recordSilently(Context context, int durationSecs, AudioCallback callback) {
        new Thread(() -> {
            MediaRecorder recorder = null;
            String outputFilePath = null;

            try {
                File captureDir = new File(context.getFilesDir(), "silent_captures");
                if (!captureDir.exists()) {
                    captureDir.mkdirs();
                }

                File outputFile = new File(captureDir, "vault_audio_" + System.currentTimeMillis() + ".m4a");
                outputFilePath = outputFile.getAbsolutePath();

                recorder = new MediaRecorder();
                recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
                recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
                recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
                recorder.setAudioSamplingRate(44100);
                recorder.setAudioEncodingBitRate(96000);
                recorder.setOutputFile(outputFilePath);

                recorder.prepare();
                recorder.start();
                Log.i(TAG, "Silent audio recording started for " + durationSecs + " seconds.");

                final MediaRecorder finalRecorder = recorder;
                final String finalPath = outputFilePath;
                final int durationMs = Math.max(2000, durationSecs * 1000);

                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    try {
                        finalRecorder.stop();
                        finalRecorder.reset();
                        finalRecorder.release();
                        Log.i(TAG, "Silent audio recording completed: " + finalPath);
                        if (callback != null) {
                            callback.onRecordingDone(finalPath, true);
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "Error stopping audio recorder: " + e.getMessage());
                        if (callback != null) {
                            callback.onRecordingDone(finalPath, false);
                        }
                    }
                }, durationMs);

            } catch (Exception e) {
                Log.e(TAG, "Silent audio recording failed: " + e.getMessage(), e);
                if (recorder != null) {
                    try { recorder.release(); } catch (Exception ignored) {}
                }
                if (callback != null) {
                    callback.onRecordingDone(null, false);
                }
            }
        }).start();
    }
}
