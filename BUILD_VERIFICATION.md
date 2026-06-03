# StudySphere Android Build Verification

Date: June 3, 2026  
Release owner: leveragex254@gmail.com  
Website: https://www.studysphere.it.com  
Package: com.studysphere.app  
Version: 1.0.1  
Version code: 2  
Minimum SDK: 24  
Target SDK: 36  
Compile SDK: 36  
Release mode: Free student toolkit, no Premium/payments

## Final Files

- Play Console AAB: `dist/android/StudySphere-v1.0.1-free-play-console.aab`
  - Size: 1,511,350 bytes
  - SHA-256: `C04F6C184B62DC0DB3D99DADBDF1970F240DCA7A0A2A3624C312674D24DE09C0`
- Shareable APK: `dist/android/StudySphere-v1.0.1-free-release.apk`
  - Size: 1,144,521 bytes
  - SHA-256: `C76D4C195801794BED419CE928DDAEB8C3DB4016B498B6631E6F8EC64D90F548`

## Verification Completed

- JavaScript syntax checks passed for app scripts, packaging scripts, and server.
- Android web assets regenerated with `npm run prepare:mobile`.
- Desktop web assets regenerated with `npm run prepare:desktop`.
- Capacitor sync completed with `npm run android:sync`.
- Android release build completed with `bundleRelease assembleRelease`.
- APK metadata confirms package `com.studysphere.app`, version `1.0.1`, versionCode `2`, minSdk `24`, targetSdk `36`.
- APK signature verification passed with APK Signature Scheme v2.
- AAB signature verification returned `jar verified`.
- Premium/Billing/Pesapal/Stripe/payment page references were removed from user-facing app files.

## Notes

- The AAB uses the local StudySphere upload key. `jarsigner` warns that the upload certificate is self-signed, which is expected for a local upload key before Google Play App Signing handles store distribution.
- Android release lint passed earlier in this release pass before the final free-version rebuild. The final lint rerun was interrupted by user input, but the final build, metadata, and signatures completed successfully.
- Public Android builds keep admin credentials disabled. Real admin analytics should use backend authentication before production.

## Manual Play Console Actions

- Upload `dist/android/StudySphere-v1.0.1-free-play-console.aab` to Play Console.
- Host the privacy page publicly at `https://www.studysphere.it.com/privacy.html`.
- Complete Data safety, Content rating, app screenshots, icon/feature graphic, and Closed testing setup.
- Keep `android/studysphere-upload.jks` and `android/keystore.properties` safe and private.
