# Hashi v0.3

A private, offline-capable journal. This update builds on v0.2 and retains the existing `hashi-db` IndexedDB database and stores. No account, analytics, remote fonts, or health-data uploads are added.

## What changed

- Sleep: poor / okay / good sleep, optional hours and notes. Log against the morning you woke up.
- Caffeine: drink type, servings, optional total caffeine in mg and notes.
- Food: breakfast, lunch, dinner and snacks with free-text foods / ingredients.
- Water: US fluid ounces, with a daily total.
- Tap a history day for its summary and chronological entries. Tap an entry to edit its date, time and details or delete it. Daily vitamins, period and check-ins are editable too.
- Dark forest green background, cream cards and delicate white leaf outlines.
- Backup and ChatGPT journal exports include the new structured details. Older backups remain importable.
- New entries use local calendar dates; existing records retain their original day assignments.

## Update the existing GitHub app

1. In Yazzy's currently installed Hashi app, open Settings and Export backup. Keep the JSON file.
2. Extract this ZIP. Upload its contents into the SAME folder of the SAME GitHub repository that currently contains `index.html`. Replace matching files; do not create an extra enclosing folder.
3. Commit the update and wait for the existing GitHub Pages deployment to finish.
4. Fully close Hashi, reopen it while online, and reopen once more if the old screen remains. Settings should show Hashi v0.3.

Keep using the same installed app and website address. Do not uninstall it or clear website data. Updating the site files does not clear its database. No backup import is needed for a normal update. This archive does not deploy itself.

The existing Home Screen icon is retained; the botanical design is inside the app.

## Export for ChatGPT

Settings → Export journal for ChatGPT creates readable JSON with dated events, meal notes, sleep hours, caffeine servings / optional mg, water amounts, vitamins, check-ins and cycle markers. Sharing it is manual. Export backup is the restore format; the AI journal is a separate analysis format.

Blank optional numbers mean unknown, not zero. Sleep and caffeine are separately categorized journal entries; the existing on-device Insights panel continues to use trigger and symptom logs. All categories are available in the ChatGPT export.
