package com.stitch.iris.launcher;

import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;
import android.util.Log;

import androidx.annotation.Nullable;

public class LauncherTileService extends TileService {

    private static final String TAG = "IrisTileService";

    @Override
    public void onStartListening() {
        super.onStartListening();
        updateTile();
    }

    @Override
    public void onClick() {
        super.onClick();
        try {
            Intent intent = new Intent(this, MainActivity.class);
            intent.setAction(Intent.ACTION_MAIN);
            intent.addCategory(Intent.CATEGORY_LAUNCHER);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivityAndCollapse(intent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch settings via tile", e);
        }
    }

    private void updateTile() {
        try {
            Tile tile = getQsTile();
            if (tile != null) {
                tile.setLabel("IRIS Settings");
                tile.setContentDescription("Open IRIS Launcher settings");
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    tile.setState(Tile.STATE_ACTIVE);
                } else {
                    tile.setState(Tile.STATE_ACTIVE);
                }
                tile.updateTile();
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to update tile", e);
        }
    }
}
