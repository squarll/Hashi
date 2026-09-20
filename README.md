# Hashi PWA v0.1

A local-first trigger and symptom journal designed for iPhone.

## Privacy architecture
- No account
- No backend/API
- No analytics SDK
- Journal data is stored in IndexedDB on the device/browser origin
- Export/import JSON backup is available in Settings
- Service worker caches the app shell for offline use after first load

## Deploy
Host this folder on any HTTPS static web host. No build step is required.

Important for iPhone: have Yaz add the site to her Home Screen before she starts logging, then always open Hashi from the Home Screen icon. Home Screen web apps maintain their own site storage.

## Current tracking
Triggers: Possible Gluten, Lactose, Sugar, Alcohol, Other
Symptoms: Nausea, Stomach Ache, Brain Fog, Low Energy, Mood Swing, Bloating, Headache, Diarrhea, Constipation, Reflux, Energy Crash
Vitamins: Selenium, Vitamin D, Vitamin B
Relief: Tums
Cycle: Period
Daily check-in: Overall, Energy, Brain, Stomach

## Upgrade path
The exported JSON is versioned (`schemaVersion: 1`) and uses event IDs, timestamps, day keys, event types, and values that can be mapped directly into a future SwiftData/native iOS database.
