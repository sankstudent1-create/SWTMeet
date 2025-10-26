# 📱 SWTMeet Android App - Complete Guide

## ✅ Setup Complete!

Your SWTMeet Android app has been successfully created using **Capacitor**!

---

## 📂 **Project Structure**

```
SWTMeet/
├── android/                    # Android native project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── assets/        # Web app files
│   │   │   ├── java/          # Android Java code
│   │   │   ├── res/           # Android resources
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   ├── gradle/
│   └── build.gradle
├── www/                        # Web app source (copied from root)
│   ├── index.html
│   ├── meeting.html
│   ├── auth.html
│   ├── *.js files
│   ├── *.css files
│   └── assets/
├── capacitor.config.json       # Capacitor configuration
└── package.json
```

---

## 🚀 **How to Build & Run**

### **Prerequisites:**
- ✅ Android Studio installed
- ✅ Java JDK 11+ installed
- ✅ Android SDK installed
- ✅ USB Debugging enabled on Android device (or emulator)

### **Step 1: Open in Android Studio**
```bash
cd /home/sanket/CascadeProjects/windsurf-project-6/SWTMeet
npx cap open android
```

This will open the project in Android Studio.

### **Step 2: Sync Gradle**
- Android Studio will automatically sync Gradle files
- Wait for "Gradle sync finished" message

### **Step 3: Run on Device/Emulator**

**Option A: Physical Device**
```
1. Connect your Android phone via USB
2. Enable USB Debugging in Developer Options
3. Click the green "Run" button in Android Studio
4. Select your device
5. App will install and launch
```

**Option B: Android Emulator**
```
1. Open AVD Manager in Android Studio
2. Create a new Virtual Device (e.g., Pixel 6)
3. Start the emulator
4. Click "Run" button
5. Select the emulator
```

### **Step 4: Build APK**
```bash
cd android
./gradlew assembleDebug
```

APK will be created at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### **Step 5: Build Release APK**
```bash
cd android
./gradlew assembleRelease
```

---

## 🔧 **Development Workflow**

### **1. Make Changes to Web App**
Edit your HTML/CSS/JS files in the root directory or `www/` folder.

### **2. Sync Changes to Android**
```bash
# Copy changes to www/ if you edited root files
cp *.html *.js *.css www/

# Sync to Android
npx cap sync android
```

### **3. Hot Reload (Development)**
```bash
# Run a local server
npx serve www -p 3000

# Update capacitor.config.json temporarily:
{
  "server": {
    "url": "http://192.168.1.X:3000",  # Your computer's IP
    "cleartext": true
  }
}

# Then run: npx cap sync android
# Now app will load from your dev server with hot reload!
```

---

## 📝 **Required Permissions**

The app already has these permissions configured in `AndroidManifest.xml`:

```xml
<!-- Camera -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />

<!-- Microphone -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />

<!-- Internet -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Media -->
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

---

## 🎨 **Customization**

### **1. App Icon**
```
1. Create app icon (1024x1024 PNG)
2. Use Android Asset Studio or online generator
3. Replace icons in: android/app/src/main/res/
   - mipmap-mdpi/
   - mipmap-hdpi/
   - mipmap-xhdpi/
   - mipmap-xxhdpi/
   - mipmap-xxxhdpi/
```

### **2. App Name**
Edit `android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">SWTMeet</string>
<string name="title_activity_main">SWTMeet</string>
```

### **3. Splash Screen**
Edit `android/app/src/main/res/values/styles.xml`:
```xml
<item name="android:background">@drawable/splash</item>
```

Add splash image to: `android/app/src/main/res/drawable/splash.png`

### **4. Package Name (if needed)**
- App ID: `com.swtmeet.app`
- To change: Update `capacitor.config.json` and run `npx cap sync`

---

## 🔐 **Signing the App (for Release)**

### **1. Generate Keystore**
```bash
keytool -genkey -v -keystore swtmeet-release.keystore \
  -alias swtmeet -keyalg RSA -keysize 2048 -validity 10000
```

### **2. Configure Gradle**
Create `android/key.properties`:
```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=swtmeet
storeFile=../swtmeet-release.keystore
```

Add to `android/app/build.gradle`:
```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### **3. Build Signed APK**
```bash
cd android
./gradlew assembleRelease
```

Signed APK: `android/app/build/outputs/apk/release/app-release.apk`

---

## 📦 **Publishing to Google Play Store**

### **1. Create App Bundle**
```bash
cd android
./gradlew bundleRelease
```

AAB file: `android/app/build/outputs/bundle/release/app-release.aab`

### **2. Google Play Console**
1. Go to https://play.google.com/console
2. Create new app
3. Fill in app details
4. Upload AAB file
5. Complete store listing
6. Submit for review

---

## 🧪 **Testing Checklist**

### **Basic Functionality:**
- [ ] App launches successfully
- [ ] UI loads properly
- [ ] Can navigate between pages
- [ ] Authentication works
- [ ] Can create/join meetings

### **Permissions:**
- [ ] Camera permission requested
- [ ] Microphone permission requested
- [ ] Permissions work when granted
- [ ] App doesn't crash when denied

### **WebRTC Features:**
- [ ] Camera preview works
- [ ] Microphone captures audio
- [ ] Video call connects
- [ ] Screen sharing works (Android 10+)
- [ ] Chat messages send/receive

### **Performance:**
- [ ] App doesn't lag
- [ ] No memory leaks
- [ ] Battery usage reasonable
- [ ] Network usage reasonable

---

## 🐛 **Common Issues & Solutions**

### **Issue 1: App crashes on launch**
**Solution:**
```bash
# Clear cache and rebuild
cd android
./gradlew clean
./gradlew assembleDebug
```

### **Issue 2: WebRTC not working**
**Solution:**
- Check camera/mic permissions granted
- Ensure HTTPS or localhost (WebRTC requirement)
- Check AndroidManifest.xml has all permissions

### **Issue 3: White screen on launch**
**Solution:**
```bash
# Re-sync web assets
npx cap copy android
npx cap sync android
```

### **Issue 4: Build fails**
**Solution:**
```bash
# Update Android SDK/Gradle
cd android
./gradlew --version
# Update in Android Studio: Tools → SDK Manager
```

---

## 📊 **App Specifications**

| Property | Value |
|----------|-------|
| **Package Name** | com.swtmeet.app |
| **Min SDK** | 22 (Android 5.1) |
| **Target SDK** | 34 (Android 14) |
| **Framework** | Capacitor 7.x |
| **Engine** | WebView (Chromium) |
| **Size** | ~10-15 MB |

---

## 🎯 **Next Steps**

### **Immediate:**
1. ✅ Open in Android Studio: `npx cap open android`
2. ✅ Run on device/emulator
3. ✅ Test all features
4. ✅ Customize app icon and splash screen

### **Before Release:**
1. ⏳ Add app icon (1024x1024)
2. ⏳ Add splash screen
3. ⏳ Test on multiple devices
4. ⏳ Generate signed release APK
5. ⏳ Create app store listing

### **Enhancements:**
1. ⏳ Add push notifications
2. ⏳ Add app shortcuts
3. ⏳ Optimize performance
4. ⏳ Add analytics
5. ⏳ Add crash reporting

---

## 📱 **Capacitor Plugins Available**

You can add more native features:

```bash
# Push Notifications
npm install @capacitor/push-notifications

# Local Notifications
npm install @capacitor/local-notifications

# File System
npm install @capacitor/filesystem

# Share
npm install @capacitor/share

# Status Bar
npm install @capacitor/status-bar

# Splash Screen
npm install @capacitor/splash-screen
```

After installing, run: `npx cap sync android`

---

## 🔗 **Useful Commands**

```bash
# Open Android Studio
npx cap open android

# Sync web → Android
npx cap sync android

# Copy only (faster than sync)
npx cap copy android

# Update native plugins
npx cap update android

# Run on device
npx cap run android

# Check doctor (troubleshooting)
npx cap doctor android
```

---

## 📚 **Resources**

- Capacitor Docs: https://capacitorjs.com/docs
- Android Studio: https://developer.android.com/studio
- WebRTC Android: https://webrtc.github.io/webrtc-org/native-code/android/
- Capacitor Plugins: https://capacitorjs.com/docs/plugins
- Google Play Console: https://play.google.com/console

---

## ✅ **Status**

| Component | Status |
|-----------|--------|
| **Project Setup** | ✅ Complete |
| **Android Project** | ✅ Created |
| **Permissions** | ✅ Configured |
| **Web Assets** | ✅ Copied |
| **Configuration** | ✅ Done |
| **Ready to Build** | ✅ Yes |

---

## 🎉 **You're Ready!**

Your SWTMeet Android app is fully configured and ready to build!

**Quick Start:**
```bash
npx cap open android
```

Then click the green **Run** button in Android Studio! 🚀
