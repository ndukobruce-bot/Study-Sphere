# StudySphere Play Store Deployment Guide

Account email: leveragex254@gmail.com  
Website: https://www.studysphere.it.com  
Package name: com.studysphere.app

## Upload Target

Upload the Android App Bundle:

`dist/android/StudySphere-v1.0.1-play-console.aab`

Do not upload the APK for Play Console release tracks. APKs are only for direct device testing.

## Closed Testing Steps

1. Open Google Play Console with `leveragex254@gmail.com`.
2. Select StudySphere or create a new app.
3. Confirm package name: `com.studysphere.app`.
4. Go to Testing > Closed testing.
5. Create a new release.
6. Upload the `.aab`.
7. Add release notes from `RELEASE_NOTES.md`.
8. Add testers by email list or Google Group.
9. Complete required policy sections:
   - App content
   - Data safety
   - Privacy policy
   - Content rating
   - Target audience
10. Review and submit the closed testing release.

## Required Store Links

Privacy policy URL:

`https://www.studysphere.it.com/privacy.html`

If that page is not live yet, publish the contents of `privacy.html` to the website first.

## Signing Notes

The project contains local ignored signing files:

- `android/studysphere-upload.jks`
- `android/keystore.properties`

Keep both private and backed up. Future updates require the same upload key unless Play App Signing key reset is performed.
