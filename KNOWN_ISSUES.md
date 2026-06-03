# StudySphere Known Issues

## Closed Testing Build

1. Production authentication is still local/demo-first.
   - Reason: the public Android build does not yet use a real account backend.
   - Status: admin credentials are not shipped in the Android build, and student data remains local unless a backend is configured.

2. Admin analytics are disabled in public Android builds.
   - Reason: Admin credentials must not be shipped inside a public app bundle.
   - Status: Requires secured backend authentication before enabling in production.

3. Student data is local-first in this build.
   - Reason: The current app is packaged from a static web app.
   - Status: Suitable for closed testing; backend sync should be completed for production multi-device accounts.

4. Privacy policy URL must be hosted publicly.
   - Recommended URL: `https://www.studysphere.it.com/privacy.html`.
   - Status: In-app privacy page exists; website publication is a manual action.
