package com.aplikasi_alarm;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wl = pm.newWakeLock(
            PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
            PowerManager.ACQUIRE_CAUSES_WAKEUP |
            PowerManager.ON_AFTER_RELEASE,
            "alarm:WakeLock"
        );
        wl.acquire(15000);

        Intent activity = new Intent(context, MainActivity.class);
        activity.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        activity.putExtra("alarmData", intent.getStringExtra("alarmData"));
        activity.putExtra("isPrayer", intent.getBooleanExtra("isPrayer", false));

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getActivity(context, 0, activity, flags);

        NotificationChannel ch = new NotificationChannel(
            "alarm", "Alarm Islami", NotificationManager.IMPORTANCE_HIGH
        );
        ch.setBypassDnd(true);

        Notification notif = new Notification.Builder(context, "alarm")
            .setSmallIcon(android.R.drawable.ic_dialog_alarm)
            .setContentTitle(intent.getStringExtra("title"))
            .setContentText(intent.getStringExtra("body"))
            .setFullScreenIntent(pi, true)
            .setPriority(Notification.PRIORITY_MAX)
            .setAutoCancel(true)
            .setCategory(Notification.CATEGORY_ALARM)
            .build();

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        nm.createNotificationChannel(ch);
        nm.notify(1001, notif);

        wl.release();
    }
}
