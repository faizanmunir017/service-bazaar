# Service Bazaar — APK build (EAS)

**Your backend URL:** `https://servicebazaar-backend-da7jfnktba-uc.a.run.app`

`frontend/.env` is for **local Expo** only. EAS cloud builds **ignore** `.env` (it is in `.gitignore`). You must set the same variable on EAS, then rebuild.

## Commands (PowerShell)

Run from the `frontend` folder:

```powershell
cd F:\Personal\Projects\service-bazaar\frontend

# 1) Optional — confirm API is live
(Invoke-WebRequest -Uri "https://servicebazaar-backend-da7jfnktba-uc.a.run.app/api/health" -UseBasicParsing).Content

# 2) Register URL on EAS for preview APK builds (one-time; use --force to overwrite)
eas env:create --name EXPO_PUBLIC_BACKEND_URL --value "https://servicebazaar-backend-da7jfnktba-uc.a.run.app" --environment preview --visibility plaintext --force

# 3) Confirm it is set
eas env:list --environment preview

# 4) Build APK
eas build -p android --profile preview
```

When the build finishes, open the link EAS prints (or scan the QR code) and install on your phone. Uninstall the old **frontend** APK if you still have it.

## Local development (Expo Go / emulator)

Keep `frontend/.env` as:

```env
EXPO_PUBLIC_BACKEND_URL=https://servicebazaar-backend-da7jfnktba-uc.a.run.app
```

Then restart Expo after any change:

```powershell
npm start
```

## App branding (this build)

- Name: **Service Bazaar**
- Package: `com.faizanmunir017.servicebazaar`
