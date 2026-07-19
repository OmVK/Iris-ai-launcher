package com.stitch.iris.launcher;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.lang.reflect.Method;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "IrisGenAI")
public class IrisGenAIPlugin extends Plugin {

    private static final String TAG = "IrisGenAI";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private boolean isModelReady = false;

    @PluginMethod
    public void checkAvailability(PluginCall call) {
        executor.execute(() -> {
            try {
                boolean available = isGenAIAvailable();
                JSObject result = new JSObject();
                result.put("available", available);
                result.put("deviceInfo", getDeviceInfo());
                call.resolve(result);
            } catch (Exception e) {
                Log.w(TAG, "GenAI availability check failed", e);
                JSObject result = new JSObject();
                result.put("available", false);
                result.put("error", e.getMessage());
                call.resolve(result);
            }
        });
    }

    @PluginMethod
    public void initializeModel(PluginCall call) {
        String modelName = call.getString("model", "gemini-nano");
        executor.execute(() -> {
            try {
                isModelReady = isGenAIAvailable();
                JSObject result = new JSObject();
                result.put("initialized", isModelReady);
                result.put("model", modelName);
                if (!isModelReady) {
                    result.put("error", "On-device GenAI not available on this device");
                }
                call.resolve(result);
            } catch (Exception e) {
                Log.e(TAG, "Model initialization failed", e);
                isModelReady = false;
                JSObject result = new JSObject();
                result.put("initialized", false);
                result.put("error", e.getMessage());
                call.resolve(result);
            }
        });
    }

    @PluginMethod
    public void generateText(PluginCall call) {
        String prompt = call.getString("prompt");
        String systemInstruction = call.getString("systemInstruction", "");
        double temperature = call.getDouble("temperature", 0.7);
        int maxTokens = call.getInt("maxTokens", 2048);

        if (prompt == null || prompt.isEmpty()) {
            call.reject("No prompt provided");
            return;
        }

        executor.execute(() -> {
            try {
                String response = runInference(prompt, systemInstruction, temperature, maxTokens);
                JSObject result = new JSObject();
                result.put("text", response);
                result.put("model", "gemini-nano");
                result.put("provider", "on-device");
                call.resolve(result);
            } catch (Exception e) {
                Log.e(TAG, "Inference failed", e);
                call.reject("On-device inference failed: " + e.getMessage(), e);
            }
        });
    }

    @PluginMethod
    public void generateTextStream(PluginCall call) {
        String prompt = call.getString("prompt");
        String systemInstruction = call.getString("systemInstruction", "");
        double temperature = call.getDouble("temperature", 0.7);
        int maxTokens = call.getInt("maxTokens", 2048);

        if (prompt == null || prompt.isEmpty()) {
            call.reject("No prompt provided");
            return;
        }

        executor.execute(() -> {
            try {
                String response = runInference(prompt, systemInstruction, temperature, maxTokens);
                JSObject result = new JSObject();
                result.put("text", response);
                result.put("model", "gemini-nano");
                result.put("provider", "on-device");
                result.put("streaming", false);
                call.resolve(result);
            } catch (Exception e) {
                Log.e(TAG, "Streaming inference failed", e);
                call.reject("On-device inference failed: " + e.getMessage(), e);
            }
        });
    }

    @PluginMethod
    public void isReady(PluginCall call) {
        JSObject result = new JSObject();
        result.put("ready", isModelReady);
        call.resolve(result);
    }

    private boolean isGenAIAvailable() {
        try {
            Class.forName("com.google.firebase.ai.ondevice.FirebaseAIOnDevice");
            return true;
        } catch (ClassNotFoundException e) {
            try {
                Class.forName("com.google.mlkit.genai.common.GenAI");
                return true;
            } catch (ClassNotFoundException e2) {
                Log.w(TAG, "ML Kit GenAI not available on this device");
                return false;
            }
        }
    }

    private String runInference(String prompt, String systemInstruction, double temperature, int maxTokens) throws Exception {
        StringBuilder fullPrompt = new StringBuilder();
        if (systemInstruction != null && !systemInstruction.isEmpty()) {
            fullPrompt.append(systemInstruction).append("\n\n");
        }
        fullPrompt.append(prompt);

        try {
            return runGenAIPrompt(fullPrompt.toString(), temperature, maxTokens);
        } catch (Exception e) {
            Log.e(TAG, "GenAI Prompt API failed", e);
            throw e;
        }
    }

    private String runGenAIPrompt(String prompt, double temperature, int maxTokens) throws Exception {
        try {
            Class<?> genAiClass = Class.forName("com.google.mlkit.genai.common.GenerationConfig");
            Object builder = genAiClass.getMethod("builder").invoke(null);

            Method setTemp = genAiClass.getMethod("setTemperature", float.class);
            builder = setTemp.invoke(builder, (float) temperature);

            Method setTopP = genAiClass.getMethod("setTopP", float.class);
            builder = setTopP.invoke(builder, 0.95f);

            Method setMaxOut = genAiClass.getMethod("setMaxOutputTokens", int.class);
            builder = setMaxOut.invoke(builder, maxTokens);

            Method build = genAiClass.getMethod("build");
            Object config = build.invoke(builder);

            Class<?> promptReqClass = Class.forName("com.google.mlkit.genai.prompt.PromptRequest");
            Object reqBuilder = promptReqClass.getMethod("builder", String.class).invoke(null, prompt);

            Method setConfig = promptReqClass.getMethod("setGenerationConfig", genAiClass);
            reqBuilder = setConfig.invoke(reqBuilder, config);

            Object request = promptReqClass.getMethod("build").invoke(reqBuilder);

            Class<?> promptApiClass = Class.forName("com.google.mlkit.genai.prompt.Prompt");
            Object client = promptApiClass.getMethod("getClient").invoke(null);

            Method runMethod = null;
            for (Method m : client.getClass().getMethods()) {
                if (m.getName().equals("runInference") && m.getParameterCount() == 1) {
                    runMethod = m;
                    break;
                }
            }
            if (runMethod == null) throw new Exception("runInference method not found");

            Object task = runMethod.invoke(client, request);

            final String[] resultText = new String[1];
            final CountDownLatch latch = new CountDownLatch(1);

            MethodaddOnSuccessListener(task, resultText, latch);
            MethodaddOnFailureListener(task, resultText, latch);

            if (!latch.await(30, TimeUnit.SECONDS)) {
                throw new Exception("On-device inference timed out after 30s");
            }

            if (resultText[0] == null) {
                throw new Exception("On-device inference returned null");
            }

            return resultText[0];
        } catch (ClassNotFoundException e) {
            throw new Exception("ML Kit GenAI SDK not available. Requires Pixel 9+, Samsung S24+ with Android AICore.");
        }
    }

    @SuppressWarnings("unchecked")
    private void MethodaddOnSuccessListener(Object task, String[] resultText, CountDownLatch latch) {
        try {
            Method method = null;
            for (Method m : task.getClass().getMethods()) {
                if (m.getName().equals("addOnSuccessListener") && m.getParameterCount() == 1) {
                    method = m;
                    break;
                }
            }
            if (method == null) return;

            Object listener = java.lang.reflect.Proxy.newProxyInstance(
                task.getClass().getClassLoader(),
                new Class<?>[]{ Class.forName("com.google.android.gms.tasks.OnSuccessListener") },
                (proxy, m, args) -> {
                    Object response = args[0];
                    Method getText = response.getClass().getMethod("getText");
                    resultText[0] = (String) getText.invoke(response);
                    latch.countDown();
                    return null;
                }
            );
            method.invoke(task, listener);
        } catch (Exception e) {
            Log.w(TAG, "Failed to add success listener", e);
            latch.countDown();
        }
    }

    @SuppressWarnings("unchecked")
    private void MethodaddOnFailureListener(Object task, String[] resultText, CountDownLatch latch) {
        try {
            Method method = null;
            for (Method m : task.getClass().getMethods()) {
                if (m.getName().equals("addOnFailureListener") && m.getParameterCount() == 1) {
                    method = m;
                    break;
                }
            }
            if (method == null) return;

            Object listener = java.lang.reflect.Proxy.newProxyInstance(
                task.getClass().getClassLoader(),
                new Class<?>[]{ Class.forName("com.google.android.gms.tasks.OnFailureListener") },
                (proxy, m, args) -> {
                    Log.e(TAG, "GenAI inference failed", (Throwable) args[0]);
                    resultText[0] = null;
                    latch.countDown();
                    return null;
                }
            );
            method.invoke(task, listener);
        } catch (Exception e) {
            Log.w(TAG, "Failed to add failure listener", e);
            latch.countDown();
        }
    }

    private String getDeviceInfo() {
        return String.format("Brand: %s, Model: %s, SDK: %d, CPU ABI: %s",
            android.os.Build.MANUFACTURER,
            android.os.Build.MODEL,
            android.os.Build.VERSION.SDK_INT,
            android.os.Build.SUPPORTED_ABIS.length > 0 ? android.os.Build.SUPPORTED_ABIS[0] : "unknown"
        );
    }
}
