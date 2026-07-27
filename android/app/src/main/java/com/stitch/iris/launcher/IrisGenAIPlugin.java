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
    private Object modelClient = null;

    @PluginMethod
    public void checkAvailability(PluginCall call) {
        executor.execute(() -> {
            try {
                boolean available = isGenAIAvailable();
                if (available && modelClient == null) {
                    modelClient = initializeModelClient();
                }
                JSObject result = new JSObject();
                result.put("available", available && modelClient != null);
                result.put("deviceInfo", getDeviceInfo());
                if (!available) {
                    result.put("error", "ML Kit GenAI not available on this device");
                } else if (modelClient == null) {
                    result.put("error", "Failed to initialize model client");
                }
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
                boolean available = isGenAIAvailable();
                if (available) {
                    modelClient = initializeModelClient();
                }
                isModelReady = available && modelClient != null;
                JSObject result = new JSObject();
                result.put("initialized", isModelReady);
                result.put("model", modelName);
                if (!isModelReady) {
                    result.put("error", "On-device GenAI not available. Requires Pixel 9+, Samsung S24+ with Android AICore.");
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
                if (modelClient == null) {
                    modelClient = initializeModelClient();
                }
                if (modelClient == null) {
                    call.reject("Model not initialized. Check device compatibility.");
                    return;
                }

                String fullPrompt = prompt;
                if (systemInstruction != null && !systemInstruction.isEmpty()) {
                    fullPrompt = systemInstruction + "\n\n" + prompt;
                }

                String response = runInference(fullPrompt, temperature, maxTokens);
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
        generateText(call);
    }

    @PluginMethod
    public void isReady(PluginCall call) {
        JSObject result = new JSObject();
        result.put("ready", isModelReady);
        call.resolve(result);
    }

    private boolean isGenAIAvailable() {
        try {
            Class.forName("com.google.mlkit.genai.prompt.Generation");
            return true;
        } catch (ClassNotFoundException e) {
            Log.w(TAG, "ML Kit GenAI Prompt API not available", e);
            return false;
        }
    }

    private Object initializeModelClient() {
        try {
            Class<?> generationClass = Class.forName("com.google.mlkit.genai.prompt.Generation");
            Object instance = generationClass.getField("INSTANCE").get(null);
            Method getClientMethod = generationClass.getMethod("getClient");
            return getClientMethod.invoke(instance);
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize model client", e);
            return null;
        }
    }

    private String runInference(String prompt, double temperature, int maxTokens) throws Exception {
        try {
            Class<?> textPartClass = Class.forName("com.google.mlkit.genai.prompt.TextPart");
            Object textPart = textPartClass.getConstructor(String.class).newInstance(prompt);

            Class<?> reqBuilderClass = Class.forName("com.google.mlkit.genai.prompt.GenerateContentRequest$Builder");
            Object reqBuilder = reqBuilderClass.getConstructor(textPartClass).newInstance(textPart);

            Method setTemp = null;
            for (Method m : reqBuilderClass.getMethods()) {
                if (m.getName().equals("setTemperature") && m.getParameterCount() == 1) {
                    setTemp = m;
                    break;
                }
            }
            if (setTemp != null) {
                setTemp.invoke(reqBuilder, (Float) (float) temperature);
            }

            Method setMaxTokens = null;
            for (Method m : reqBuilderClass.getMethods()) {
                if (m.getName().equals("setMaxOutputTokens") && m.getParameterCount() == 1) {
                    setMaxTokens = m;
                    break;
                }
            }
            if (setMaxTokens != null) {
                setMaxTokens.invoke(reqBuilder, (Integer) maxTokens);
            }

            Object request = reqBuilderClass.getMethod("build").invoke(reqBuilder);

            Method generateMethod = null;
            for (Method m : modelClient.getClass().getMethods()) {
                if (m.getName().equals("generateContent") && m.getParameterCount() == 1) {
                    generateMethod = m;
                    break;
                }
            }
            if (generateMethod == null) {
                throw new Exception("generateContent method not found");
            }

            Object task = generateMethod.invoke(modelClient, request);

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
        } catch (Exception e) {
            Log.e(TAG, "Inference error", e);
            throw e;
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
                    try {
                        Method getText = response.getClass().getMethod("getText");
                        resultText[0] = (String) getText.invoke(response);
                    } catch (Exception e) {
                        resultText[0] = response.toString();
                    }
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
