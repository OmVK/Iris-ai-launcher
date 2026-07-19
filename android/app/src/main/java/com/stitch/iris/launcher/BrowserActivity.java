package com.stitch.iris.launcher;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.TextView;

public class BrowserActivity extends Activity {
    private WebView webView;
    private ProgressBar progressBar;
    private TextView urlBar;
    private TextView statusText;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Fullscreen immersive
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
        );

        // Create layout programmatically
        android.widget.LinearLayout root = new android.widget.LinearLayout(this);
        root.setOrientation(android.widget.LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFF0A0E17);

        // Status bar
        android.widget.LinearLayout statusBar = new android.widget.LinearLayout(this);
        statusBar.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        statusBar.setPadding(dp(12), dp(4), dp(12), dp(4));
        statusBar.setBackgroundColor(0xFF0D1117);

        TextView incognitoLabel = new TextView(this);
        incognitoLabel.setText("● INCOGNITO");
        incognitoLabel.setTextSize(10);
        incognitoLabel.setTextColor(0xFF4ADE80);
        statusBar.addView(incognitoLabel);

        View closeBtn = createIconButton("✕", 0xFFEF4444, () -> finish());
        statusBar.addView(closeBtn);
        root.addView(statusBar, layoutParams(-1, -2));

        // Address bar
        android.widget.LinearLayout addrBar = new android.widget.LinearLayout(this);
        addrBar.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        addrBar.setPadding(dp(8), dp(4), dp(8), dp(4));
        addrBar.setBackgroundColor(0xFF0D1117);

        View backBtn = createIconButton("◀", 0x80FFFFFF, () -> {
            if (webView.canGoBack()) webView.goBack();
        });
        addrBar.addView(backBtn);

        View refreshBtn = createIconButton("↻", 0x80FFFFFF, () -> webView.reload());
        addrBar.addView(refreshBtn);

        urlBar = new TextView(this);
        urlBar.setTextSize(11);
        urlBar.setTextColor(0xFFAAAAAA);
        urlBar.setPadding(dp(8), dp(6), dp(8), dp(6));
        urlBar.setMaxLines(1);
        urlBar.setSingleLine(true);
        addrBar.addView(urlBar, layoutParams(0, 1.0f));
        root.addView(addrBar, layoutParams(-1, -2));

        // Progress bar
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setVisibility(View.GONE);
        root.addView(progressBar, layoutParams(-1, dp(2)));

        // WebView
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSaveFormData(false);
        settings.setSavePassword(false);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setVisibility(newProgress < 100 ? View.VISIBLE : View.GONE);
                progressBar.setProgress(newProgress);
            }

            @Override
            public void onReceivedTitle(WebView view, String title) {
                if (title != null && !title.isEmpty()) {
                    urlBar.setText(view.getUrl());
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                view.loadUrl(url);
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                urlBar.setText(url);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                urlBar.setText(url);
            }
        });

        root.addView(webView, new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f));

        // Bottom info bar
        android.widget.LinearLayout bottomBar = new android.widget.LinearLayout(this);
        bottomBar.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        bottomBar.setPadding(dp(12), dp(3), dp(12), dp(3));
        bottomBar.setBackgroundColor(0xFF0D1117);

        statusText = new TextView(this);
        statusText.setTextSize(8);
        statusText.setTextColor(0x30FFFFFF);
        bottomBar.addView(statusText);

        TextView dnsLabel = new TextView(this);
        dnsLabel.setText("NO LOGS • NO TRACKING");
        dnsLabel.setTextSize(8);
        dnsLabel.setTextColor(0x304ADE80);
        bottomBar.addView(dnsLabel, layoutParams(0, 1.0f));
        root.addView(bottomBar, layoutParams(-1, -2));

        setContentView(root, layoutParams(-1, -1));

        // Load URL
        String url = getIntent().getStringExtra("url");
        if (url != null && !url.isEmpty()) {
            urlBar.setText(url);
            statusText.setText(url);
            webView.loadUrl(url);
        }

        // Immersive fullscreen
        hideSystemBars();
    }

    private void hideSystemBars() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            if (getWindow().getInsetsController() != null) {
                getWindow().getInsetsController().hide(
                    android.view.WindowInsets.Type.statusBars() | android.view.WindowInsets.Type.navigationBars()
                );
                getWindow().getInsetsController().setSystemBarsBehavior(
                    android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private View createIconButton(String text, int color, Runnable onClick) {
        TextView btn = new TextView(this);
        btn.setText(text);
        btn.setTextSize(14);
        btn.setTextColor(color);
        btn.setPadding(dp(10), dp(6), dp(10), dp(6));
        btn.setOnClickListener(v -> onClick.run());
        return btn;
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density);
    }

    private android.widget.LinearLayout.LayoutParams layoutParams(int width) {
        return new android.widget.LinearLayout.LayoutParams(width, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    }

    private android.widget.LinearLayout.LayoutParams layoutParams(int width, float weight) {
        return new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.MATCH_PARENT, weight);
    }

    private android.widget.LinearLayout.LayoutParams layoutParams(int width, int height) {
        return new android.widget.LinearLayout.LayoutParams(width, height);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}
