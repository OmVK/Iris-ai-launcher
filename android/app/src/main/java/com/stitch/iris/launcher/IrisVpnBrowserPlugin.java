package com.stitch.iris.launcher;

import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "IrisVpnBrowser")
public class IrisVpnBrowserPlugin extends Plugin {

    @PluginMethod
    public void startVpnBrowser(PluginCall call) {
        String url = call.getString("url", "https://search.censys.io");

        Intent browserIntent = new Intent(getContext(), BrowserActivity.class);
        browserIntent.putExtra("url", url);
        browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(browserIntent);

        JSObject result = new JSObject();
        result.put("status", "started");
        result.put("url", url);
        call.resolve(result);
    }

    @PluginMethod
    public void stopVpnBrowser(PluginCall call) {
        JSObject result = new JSObject();
        result.put("status", "stopped");
        call.resolve(result);
    }

    @PluginMethod
    public void isVpnActive(PluginCall call) {
        JSObject result = new JSObject();
        result.put("active", false);
        call.resolve(result);
    }
}
