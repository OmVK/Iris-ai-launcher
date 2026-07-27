package com.stitch.iris.launcher;

import android.app.backup.BackupAgent;
import android.app.backup.BackupDataInput;
import android.app.backup.BackupDataOutput;
import android.content.SharedPreferences;
import android.os.ParcelFileDescriptor;
import android.util.Log;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Map;

public class IrisBackupAgent extends BackupAgent {

    private static final String TAG = "IrisBackupAgent";

    @Override
    public void onBackup(ParcelFileDescriptor oldState, BackupDataOutput data, ParcelFileDescriptor newState) throws IOException {
        try {
            SharedPreferences prefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);
            Map<String, ?> allPrefs = prefs.getAll();

            JSONObject backup = new JSONObject();
            for (Map.Entry<String, ?> entry : allPrefs.entrySet()) {
                String key = entry.getKey();
                if (key.startsWith("CapacitorStorage")) continue;
                Object value = entry.getValue();
                if (value != null) {
                    backup.put(key, value.toString());
                }
            }

            String json = backup.toString();
            byte[] bytes = json.getBytes("UTF-8");

            data.writeEntityHeader("iris_backup", bytes.length);
            data.writeEntityData(bytes, bytes.length);

            Log.d(TAG, "Backup completed: " + backup.length() + " keys");
        } catch (Exception e) {
            Log.e(TAG, "Backup failed", e);
        }
    }

    @Override
    public void onRestore(BackupDataInput data, int appVersionCode, ParcelFileDescriptor newState) throws IOException {
        try {
            byte[] buffer = new byte[data.getDataSize()];
            data.readEntityData(buffer, 0, buffer.length);

            String json = new String(buffer, "UTF-8");
            JSONObject backup = new JSONObject(json);

            SharedPreferences prefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            Iterator<String> keys = backup.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                editor.putString(key, backup.getString(key));
            }
            editor.apply();

            Log.d(TAG, "Restore completed: " + backup.length() + " keys");
        } catch (Exception e) {
            Log.e(TAG, "Restore failed", e);
        }
    }
}
