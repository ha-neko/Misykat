# Key changes in latest commit (0806cb99)

1. **Alarm auto-show when phone ON**: added back `launchAlarmActivity()` direct call. When phone is unlocked, the activity launches directly to show alarm screen. When phone is locked, the CATEGORY_CALL notification's fullScreenIntent handles it (confirmed working).

2. **Stats fix**: 
   - `totalRecommended`, `totalEngaged`, `totalSkipped` now tracked in `recommendation.js`
   - Default profile includes all three fields (set to 0)
   - `trackInteraction` increments engaged/skipped counters
   - `getRecommendedContent` increments recommended counter on each recommendation
   - Added missing locale keys

3. **Hijri calendar + UI polish** (from previous commit): see summary above
