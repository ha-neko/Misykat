# Misykat (مشكاة)

Aplikasi alarm Islami dengan fitur **auto-open di layar kunci** (lock screen), streaming audio Quran/kajian, adhan otomatis, dan rekomendasi konten.

> **Misykat** berasal dari QS An-Nur 24:35 — *"Misykat"* (مشكاة) artinya *relung* tempat diletakkannya lampu.

---

## ✨ Fitur Utama

- **Alarm lock-screen** — Saat alarm aktif, aplikasi otomatis muncul di layar kunci tanpa perlu tap notifikasi
- **Streaming audio** — Quran dari EveryDay Quran CDN, kajian Rodja, adhan otomatis
- **Fallback TTS** — Text-to-Speech sebagai cadangan terakhir jika semua URL streaming gagal
- **Waktu sholat** — Berdasarkan lokasi pengguna via `expo-location` + library `adhan`
- **Rekomendasi konten** — Sistem rekomendasi sederhana (lokal, tanpa server) berdasarkan preferensi pengguna
- **Dark/light theme** — Tersimpan di AsyncStorage
- **Dua bahasa** — Indonesia (default) dan Inggris
- **Ikon SVG** — Semua ikon menggunakan SVG (tanpa emoji)

---

## 🏗️ Arsitektur

```
┌─────────────────────────────────────────┐
│              JavaScript (React Native)   │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐ │
│  │ Screens │ │ Utils    │ │ Components│ │
│  └─────────┘ └──────────┘ └───────────┘ │
│         │            │                  │
│         ▼            ▼                  │
│  ┌──────────────────────────────────┐   │
│  │  expo-modules-core bridge        │   │
│  │  (requireOptionalNativeModule)   │   │
│  └──────────┬───────────────────────┘   │
└─────────────┼───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│           Native (Android)               │
│  ┌──────────────────────────────────┐   │
│  │ MisykatAlarmModule (Kotlin)      │◄──│─ Expo Module API
│  │   .scheduleAlarm()               │   │
│  │   .cancelAlarm()                 │   │
│  │   .getInitialAlarmData()         │   │
│  └──────────┬───────────────────────┘   │
│             │ Intent                     │
│             ▼                            │
│  ┌──────────────────────────────────┐   │
│  │ AlarmReceiver (BroadcastReceiver) │   │
│  │   → WakeLock + start MainActivity │   │
│  └──────────────────────────────────┘   │
│             │                            │
│             ▼                            │
│  ┌──────────────────────────────────┐   │
│  │ MainActivity (patched)           │   │
│  │   onNewIntent() → set data       │   │
│  │   setShowWhenLocked()            │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Alur Alarm

1. **JS** → `scheduleNativeAlarm(hour, minute, alarmId, contentType, isPrayer)`
2. **Native** → `MisykatAlarmModule.scheduleAlarm()` → `AlarmManager.setExactAndAllowWhileIdle()`
3. **Waktu tiba** → Android mengirim broadcast `com.misykat.ALARM`
4. **AlarmReceiver** → Acquire `FULL_WAKE_LOCK`, lalu `startActivity(MainActivity)` dengan flag NEW_TASK + SINGLE_TOP + NO_USER_ACTION, ditambah extra data (alarmId, contentType, isPrayer)
5. **MainActivity** → `onNewIntent()` menyimpan intent, `setShowWhenLocked(true)` + `setTurnScreenOn(true)` memastikan tampil di lock screen
6. **JS** → `App.js` mendeteksi `getInitialAlarmData()` → navigasi ke `AlarmRingingScreen`
7. **AlarmRingingScreen** → Streaming audio, dismiss notifikasi, tombol dismiss/mati

---

## 🧩 Native Module: Dua Pendekatan

### Pendekatan 1: ReactContextBaseJavaModule (GAGAL)

Awalnya menggunakan `ReactContextBaseJavaModule` + `ReactPackage` (bridge lama). Cocok untuk React Native < 0.68.

```
plugins/withAndroidAlarm.js → menulis MisykatAlarmModule.java + MisykatAlarmPackage.java
                           → patch MainApplication.kt untuk register MisykatAlarmPackage
```

**Masalah**: Dengan **New Architecture** (`newArchEnabled=true` di Expo SDK 54), bridge lama tidak lagi diakses oleh JavaScript. `NativeModules.MisykatAlarmModule` menjadi `undefined`.

### Pendekatan 2: Expo Modules API via shadow ExpoModulesPackageList (GAGAL)

Menggunakan Expo Module API (Kotlin `Module` class) dengan file shadow:

```
plugins/withAndroidAlarm.js → menulis MisykatAlarmModule.kt
                           → Generate shadow ExpoModulesPackageList.java (di src/main/java/)
```

Shadow file memuat SEMUA modul Expo (expo-notifications, expo-av, dll.) + `MisykatAlarmModule.class`.

**Masalah**: File shadow (`src/main/java/expo/modules/ExpoModulesPackageList.java`) bertabrakan dengan file yang sama persis yang di-generate oleh modul `expo` itu sendiri (di `node_modules/expo/android/build/`). DEX merger mendeteksi kelas duplikat → **build FAILED**.

### Pendekatan 3: autolinking via modules/ (BERHASIL)

Standar Expo Module API dengan direktori `modules/misykat-alarm/`:

```
modules/misykat-alarm/
├── package.json                  # Metadata paket
├── expo-module.config.json       # ◄── KUNCI: konfigurasi untuk autolinking
├── index.ts                      # JS re-export (opsional)
└── android/
    ├── build.gradle              # Library Android
    └── src/main/
        ├── AndroidManifest.xml
        └── java/com/misykat/alarm/
            └── MisykatAlarmModule.kt   # ◄── Kode native
```

**Cara kerja autolinking**:

1. **Gradle settings phase** → `expo-autolinking-settings` plugin memanggil:
   ```
   expo-modules-autolinking resolve --platform android --json
   ```
   Script ini membaca `package.json` dari `modules/misykat-alarm/`, lalu mencari `expo-module.config.json`. Jika ditemukan dan mendukung Android, modul ditambahkan sebagai Gradle project.

2. **Gradle build phase** → `expo-module-gradle-plugin` memanggil:
   ```
   expo-modules-autolinking generate-package-list --platform android
   ```
   Script ini membaca konfigurasi dari **`expo-module.config.json`** (bukan `package.json`!), lalu menghasilkan `ExpoModulesPackageList.java` yang mencakup `com.misykat.alarm.MisykatAlarmModule.class`.

3. **Runtime** → Expo runtime memanggil:
   ```java
   Class.forName("expo.modules.ExpoModulesPackageList")
   ```
   File ini dihasilkan oleh autolinking (bukan shadow), jadi tidak ada duplikasi dengan modul `expo`.

### Kenapa expo-module.config.json WAJIB ada?

Fungsi `discoverExpoModuleConfigAsync()` di `expo-modules-autolinking` hanya mencari file bernama **`expo-module.config.json`** atau **`unimodule.json`** di direktori module. Config di dalam `package.json` (`expo-module` field) **TIDAK** dibaca oleh fungsi discovery. Tanpa file ini, modul diabaikan sama sekali.

---

## 🔌 Config Plugin

File: `plugins/withAndroidAlarm.js`

Config plugin berjalan saat `expo prebuild` dan melakukan:

1. **AndroidManifest.xml** — Menambahkan permissions (WAKE_LOCK, SCHEDULE_EXACT_ALARM, USE_FULL_SCREEN_INTENT, dll.), atribut activity (showOnLockScreen, turnScreenOn, showWhenLocked), dan receiver `.AlarmReceiver` dengan intent filter `com.misykat.ALARM` + `BOOT_COMPLETED`.

2. **AlarmReceiver.java** — BroadcastReceiver yang:
   - Acquire FULL_WAKE_LOCK (10 detik)
   - Start `MainActivity` dengan flags NEW_TASK + SINGLE_TOP + CLEAR_TOP + NO_USER_ACTION
   - Pass extra data (alarmId, contentType, isPrayer, fromAlarmReceiver=true)

3. **MainActivity.kt** — Patch:
   - Override `onNewIntent()` untuk menyimpan intent terbaru
   - Tambah `setShowWhenLocked(true)` + `setTurnScreenOn(true)` di `onCreate()` (API 27+)
   - Fallback legacy window flags untuk API < 27

---

## 🏗️ Project Structure

```
aplikasi-alarm/
├── App.js                         # Root component: init alarm listeners, navigasi
├── app.json                       # Konfigurasi Expo
├── plugins/
│   └── withAndroidAlarm.js        # Config plugin untuk native Android
├── modules/
│   └── misykat-alarm/             # Native module (Expo Modules API)
│       ├── package.json
│       ├── expo-module.config.json
│       ├── index.ts
│       └── android/
│           ├── build.gradle
│           └── src/main/java/com/misykat/alarm/
│               └── MisykatAlarmModule.kt
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js          # Beranda: daftar alarm, selanjutnya
│   │   ├── AddAlarmScreen.js      # Tambah alarm baru
│   │   ├── AlarmRingingScreen.js  # Alarm aktif: streaming, dismiss
│   │   ├── PrayerTimesScreen.js   # Waktu sholat
│   │   ├── SettingsScreen.js      # Pengaturan: tema, bahasa, username, cache
│   │   └── PermissionScreen.js    # Onboarding izin (notif, full screen, alarm, lokasi)
│   ├── components/
│   │   └── TabIcons.js            # Ikon SVG untuk bottom tab
│   ├── utils/
│   │   ├── nativeAlarm.js         # Bridge JS ke MisykatAlarmModule
│   │   ├── notifications.js       # expo-notifications + native alarm scheduling
│   │   └── ...audio, cache, dll.
│   ├── theme/
│   │   └── ThemeContext.js         # Dark/light theme
│   └── i18n/
│       ├── LanguageContext.js      # Context bahasa
│       └── locales.js             # ID/EN translations
├── assets/
│   ├── icon.png                   # App icon 1024×1024
│   ├── adaptive-icon.png          # Adaptive icon Android
│   ├── splash-icon.png            # Splash screen
│   └── notification-icon.png      # Icon notifikasi
└── .github/workflows/
    └── build-apk.yml              # GitHub Actions: build APK otomatis
```

---

## 🔧 Build & Testing

### Via GitHub Actions (recommended)

Push ke branch `main` → workflow otomatis build:
```
git push origin main
```
Download APK dari: https://github.com/ha-neko/Misykat/actions

### Via EAS Build (Expo)

```bash
npx eas build --platform android --profile preview
```

### Via Local

```bash
npm ci
npx expo prebuild --clean
cd android
./gradlew assembleDebug    # APK debug
./gradlew assembleRelease  # APK release
```

---

## 📱 Izin yang Diperlukan

| Izin | Kegunaan |
|------|----------|
| `POST_NOTIFICATIONS` | Menampilkan notifikasi alarm |
| `USE_FULL_SCREEN_INTENT` | Membuka activity full-screen di lock screen |
| `SCHEDULE_EXACT_ALARM` | AlarmManager.setExactAndAllowWhileIdle() |
| `WAKE_LOCK` | POWER_MANAGER Wakelock agar CPU tetap aktif |
| `RECEIVE_BOOT_COMPLETED` | Re-schedule alarm setelah reboot |
| `ACCESS_FINE_LOCATION` | Menentukan lokasi untuk waktu sholat |

Izin diminta di `PermissionScreen.js` saat pertama kali aplikasi dijalankan.

---

## 🧪 Debugging Native Module

Jika alarm lock-screen tidak muncul:

1. **Cek apakah native module terdaftar**:
   ```javascript
   // Di Chrome DevTools / React Native Debugger
   const mod = requireOptionalNativeModule('MisykatAlarm');
   console.log('Module:', mod);
   ```

2. **Cek APK**:
   ```bash
   # Ekstrak APK dan cek apakah kelas ada
   unzip -l app-debug.apk | grep MisykatAlarmModule
   # Cek AndroidManifest
   aapt d xmltree app-debug.apk AndroidManifest.xml | grep -A5 AlarmReceiver
   ```

3. **Cek logcat**:
   ```bash
   adb logcat -s MisykatAlarmModule MisykatAlarm ReactNative
   ```

4. **Cek hasil autolinking**:
   ```bash
   node --no-warnings --eval "require('expo/bin/autolinking')" expo-modules-autolinking resolve --platform android --json
   ```
   Pastikan ada entry `misykat-alarm` dengan `modules: ["com.misykat.alarm.MisykatAlarmModule"]`.

---

## 🔄 Perbandingan Versi Build

| Versi | Approach | Hasil |
|-------|----------|-------|
| v10 | Old-style ReactContextBaseJavaModule + withMainApplication | Hanya notifikasi (bridge lama tidak jalan di New Arch) |
| v11 | Expo Modules API via modules/ (tanpa expo-module.config.json) | Hanya notifikasi (modul tidak terdaftar) |
| v12 | Old-style + dual JS lookup (requireOptionalNativeModule \|\| NativeModules) | Hanya notifikasi |
| v13 | Shadow ExpoModulesPackageList.java | Build FAILED (duplikat DEX) |
| v14 | modules/ + expo-module.config.json ✅ | Native module terdaftar ✅ |
