package com.stitch.iris.launcher;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.security.KeyStore;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "IrisKeystore")
public class IrisKeystorePlugin extends Plugin {

    private static final String KEYSTORE_PROVIDER = "AndroidKeyStore";
    private static final String KEY_ALIAS = "iris_api_key_master";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    @PluginMethod
    public void storeValue(PluginCall call) {
        String value = call.getString("value");
        if (value == null || value.isEmpty()) {
            call.reject("No value provided");
            return;
        }
        try {
            SecretKey key = getOrCreateKey();
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key);
            byte[] iv = cipher.getIV();
            byte[] ciphertext = cipher.doFinal(value.getBytes("UTF-8"));

            String encoded = Base64.getEncoder().encodeToString(iv)
                    + "." + Base64.getEncoder().encodeToString(ciphertext);

            JSObject result = new JSObject();
            result.put("encrypted", encoded);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Keystore encrypt failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void retrieveValue(PluginCall call) {
        String encrypted = call.getString("encrypted");
        if (encrypted == null || encrypted.isEmpty()) {
            call.reject("No encrypted data provided");
            return;
        }
        try {
            String[] parts = encrypted.split("\\.", 2);
            if (parts.length != 2) {
                call.reject("Invalid encrypted format");
                return;
            }
            byte[] iv = Base64.getDecoder().decode(parts[0]);
            byte[] ciphertext = Base64.getDecoder().decode(parts[1]);

            SecretKey key = getOrCreateKey();
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, key, spec);
            byte[] plaintext = cipher.doFinal(ciphertext);

            JSObject result = new JSObject();
            result.put("value", new String(plaintext, "UTF-8"));
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Keystore decrypt failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void deleteKey(PluginCall call) {
        try {
            KeyStore ks = KeyStore.getInstance(KEYSTORE_PROVIDER);
            ks.load(null);
            ks.deleteEntry(KEY_ALIAS);
            JSObject result = new JSObject();
            result.put("deleted", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Keystore delete failed: " + e.getMessage());
        }
    }

    private SecretKey getOrCreateKey() throws Exception {
        KeyStore ks = KeyStore.getInstance(KEYSTORE_PROVIDER);
        ks.load(null);

        if (ks.containsAlias(KEY_ALIAS)) {
            return ((KeyStore.SecretKeyEntry) ks.getEntry(KEY_ALIAS, null)).getSecretKey();
        }

        KeyGenerator kg = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES, KEYSTORE_PROVIDER);
        kg.init(new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build());
        return kg.generateKey();
    }
}
