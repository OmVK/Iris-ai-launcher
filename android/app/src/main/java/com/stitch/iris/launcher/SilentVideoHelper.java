package com.stitch.iris.launcher;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.SurfaceTexture;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.hardware.camera2.params.StreamConfigurationMap;
import android.media.MediaRecorder;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Log;
import android.util.Size;
import android.view.Surface;

import androidx.annotation.NonNull;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class SilentVideoHelper {
    private static final String TAG = "SilentVideoHelper";

    public interface VideoCallback {
        void onRecordingDone(String filePath, boolean success);
    }

    @SuppressLint("MissingPermission")
    public static void recordSilently(Context context, String facingStr, int durationSecs, VideoCallback callback) {
        new Thread(() -> {
            HandlerThread backgroundThread = null;
            CameraDevice[] cameraHolder = new CameraDevice[1];
            MediaRecorder recorder = null;
            SurfaceTexture dummyTexture = null;
            Surface dummySurface = null;
            String outputFilePath = null;

            try {
                int targetFacing = "front".equalsIgnoreCase(facingStr) || "1".equals(facingStr)
                        ? CameraCharacteristics.LENS_FACING_FRONT
                        : CameraCharacteristics.LENS_FACING_BACK;

                CameraManager manager = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
                String targetCameraId = null;
                for (String cameraId : manager.getCameraIdList()) {
                    CameraCharacteristics chars = manager.getCameraCharacteristics(cameraId);
                    Integer facing = chars.get(CameraCharacteristics.LENS_FACING);
                    if (facing != null && facing == targetFacing) {
                        targetCameraId = cameraId;
                        break;
                    }
                }

                if (targetCameraId == null) {
                    Log.e(TAG, "No camera found matching facing: " + facingStr);
                    if (callback != null) callback.onRecordingDone(null, false);
                    return;
                }

                CameraCharacteristics characteristics = manager.getCameraCharacteristics(targetCameraId);
                StreamConfigurationMap map = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
                Size videoSize = new Size(1280, 720);
                if (map != null) {
                    Size[] choices = map.getOutputSizes(MediaRecorder.class);
                    if (choices != null && choices.length > 0) {
                        for (Size s : choices) {
                            if (s.getWidth() <= 1280 && s.getHeight() <= 720) {
                                videoSize = s;
                                break;
                            }
                        }
                    }
                }

                File captureDir = new File(context.getFilesDir(), "silent_captures");
                if (!captureDir.exists()) {
                    captureDir.mkdirs();
                }

                String prefix = "front".equalsIgnoreCase(facingStr) ? "vault_video_front_" : "vault_video_back_";
                File outputFile = new File(captureDir, prefix + System.currentTimeMillis() + ".mp4");
                outputFilePath = outputFile.getAbsolutePath();

                recorder = new MediaRecorder();
                try {
                    recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
                } catch (Exception e) {
                    Log.w(TAG, "Audio recording unavailable, proceeding video-only: " + e.getMessage());
                }

                recorder.setVideoSource(MediaRecorder.VideoSource.SURFACE);
                recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
                recorder.setOutputFile(outputFilePath);
                recorder.setVideoEncodingBitRate(3000000);
                recorder.setVideoFrameRate(30);
                recorder.setVideoSize(videoSize.getWidth(), videoSize.getHeight());
                recorder.setVideoEncoder(MediaRecorder.VideoEncoder.H264);
                try {
                    recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
                } catch (Exception ignored) {}

                recorder.prepare();
                Surface recorderSurface = recorder.getSurface();

                dummyTexture = new SurfaceTexture(10);
                dummyTexture.setDefaultBufferSize(videoSize.getWidth(), videoSize.getHeight());
                dummySurface = new Surface(dummyTexture);

                backgroundThread = new HandlerThread("SilentVideoBG");
                backgroundThread.start();
                Handler backgroundHandler = new Handler(backgroundThread.getLooper());

                final MediaRecorder finalRecorder = recorder;
                final Surface finalDummySurface = dummySurface;
                final String finalPath = outputFilePath;
                final int durationMs = Math.max(3000, durationSecs * 1000);

                manager.openCamera(targetCameraId, new CameraDevice.StateCallback() {
                    @Override
                    public void onOpened(@NonNull CameraDevice camera) {
                        cameraHolder[0] = camera;
                        try {
                            List<Surface> surfaces = new ArrayList<>();
                            surfaces.add(recorderSurface);
                            surfaces.add(finalDummySurface);

                            CaptureRequest.Builder builder = camera.createCaptureRequest(CameraDevice.TEMPLATE_RECORD);
                            builder.addTarget(recorderSurface);
                            builder.addTarget(finalDummySurface);

                            camera.createCaptureSession(surfaces, new android.hardware.camera2.CameraCaptureSession.StateCallback() {
                                @Override
                                public void onConfigured(@NonNull android.hardware.camera2.CameraCaptureSession session) {
                                    try {
                                        session.setRepeatingRequest(builder.build(), null, backgroundHandler);
                                        finalRecorder.start();
                                        Log.i(TAG, "Silent video recording started for " + durationSecs + " seconds.");

                                        // Stop after requested duration
                                        backgroundHandler.postDelayed(() -> {
                                            try {
                                                session.stopRepeating();
                                                session.abortCaptures();
                                                finalRecorder.stop();
                                                finalRecorder.reset();
                                                finalRecorder.release();
                                            } catch (Exception e) {
                                                Log.w(TAG, "Error stopping recorder: " + e.getMessage());
                                            }
                                            try {
                                                camera.close();
                                                cameraHolder[0] = null;
                                            } catch (Exception ignored) {}

                                            if (callback != null) {
                                                callback.onRecordingDone(finalPath, true);
                                            }
                                        }, durationMs);

                                    } catch (Exception e) {
                                        Log.e(TAG, "Failed to start recording session: " + e.getMessage());
                                        if (callback != null) callback.onRecordingDone(null, false);
                                    }
                                }

                                @Override
                                public void onConfigureFailed(@NonNull android.hardware.camera2.CameraCaptureSession session) {
                                    Log.e(TAG, "Recording capture session configuration failed");
                                    if (callback != null) callback.onRecordingDone(null, false);
                                }
                            }, backgroundHandler);

                        } catch (Exception e) {
                            Log.e(TAG, "Failed opening recording session: " + e.getMessage());
                            if (callback != null) callback.onRecordingDone(null, false);
                        }
                    }

                    @Override
                    public void onDisconnected(@NonNull CameraDevice camera) {
                        camera.close();
                        cameraHolder[0] = null;
                    }

                    @Override
                    public void onError(@NonNull CameraDevice camera, int error) {
                        Log.e(TAG, "Camera error during video recording: " + error);
                        camera.close();
                        cameraHolder[0] = null;
                        if (callback != null) callback.onRecordingDone(null, false);
                    }
                }, backgroundHandler);

            } catch (Exception e) {
                Log.e(TAG, "Silent video failed: " + e.getMessage(), e);
                if (callback != null) callback.onRecordingDone(null, false);
            }
        }).start();
    }
}
