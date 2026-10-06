# Field PM Tracker Prototype

This is a static mobile-friendly prototype for tracking preventive maintenance by job site.

## Included
- Add job sites
- Add/edit/archive/rental/out-of-service equipment
- Store unit, serial, owner, hours, oil/filter information, notes
- Add hour-based maintenance intervals
- Due soon / overdue calculations
- Log completed service
- Export/import JSON backups
- Installable PWA structure when hosted over HTTPS

## Important
This prototype stores data in the browser's localStorage on one device.
It does not yet include cloud accounts, team logins, email reminders, or cross-device sync.

To run on a computer:
1. Open `index.html` directly, or
2. Serve the folder with a basic local web server.

For iPhone home-screen installation and offline caching, host the folder on an HTTPS web host.
Deployment retry
