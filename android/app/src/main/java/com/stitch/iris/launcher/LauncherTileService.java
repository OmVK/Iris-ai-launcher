package com.stitch.iris.launcher;

import android.content.Intent;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;
import android.util.Log;

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
            intent.setAction(Intent.ACTION_ASSIST);
            intent.putExtra("iris_trigger_voice_assist", true);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivityAndCollapse(intent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch IRIS Voice AI via tile", e);
        }
    }

    private void updateTile() {
        try {
            Tile tile = getQsTile();
            if (tile != null) {
                tile.setLabel("IRIS Voice AI");
                tile.setContentDescription("Launch IRIS AI Voice Assistant");
                tile.setState(Tile.STATE_ACTIVE);
                tile.updateTile();
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to update tile", e);
        }
    }
}
