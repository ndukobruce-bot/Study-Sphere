# StudySphere Android Release Checklist

Release owner: leveragex254@gmail.com  
Website: https://www.studysphere.it.com  
Package name: com.studysphere.app  
Current release: 1.0.1 (versionCode 2)

## Build Readiness

- [x] Android project exists under `android/`.
- [x] App targets SDK 36.
- [x] Minimum SDK is 24.
- [x] Release build type is configured.
- [x] R8 code shrinking is enabled for release.
- [x] Resource shrinking is enabled for release.
- [x] Release signing is configured through ignored local keystore files.
- [x] App Bundle generation is configured.

## Security

- [x] Android cleartext traffic is disabled.
- [x] Android backup is disabled for local student data.
- [x] Admin password is not shipped in the Android build.
- [x] Paid access has been removed for this release.
- [x] All student tools are free in the Android build.

## Play Console

- [ ] Create or verify app listing in Play Console under leveragex254@gmail.com.
- [ ] Upload the release `.aab`.
- [ ] Add privacy policy URL: `https://www.studysphere.it.com/privacy.html`.
- [ ] Complete Data safety form.
- [ ] Complete Content rating questionnaire.
- [ ] Add app icon, feature graphic, screenshots, and descriptions.
- [ ] Create Closed testing track.
- [ ] Add tester email list or Google Group.
- [ ] Submit for closed testing review.

## Manual Items Before Production

- [ ] Host the privacy policy publicly on the StudySphere website.
- [ ] Move real authentication/admin analytics to a backend before enabling admin features in public builds.
- [ ] Add a production account deletion/data export flow if backend accounts are introduced.
