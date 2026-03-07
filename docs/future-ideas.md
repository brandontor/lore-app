# Future Ideas

Ideas that have been scoped and considered but deferred for later.

---

## Video Generation — Tier 3 Controls

These were planned alongside the Tier 1 (quality fixes) and Tier 2 (user controls) work but deferred as premature.

### Model Tier Selector

Add a Standard / Pro / Master dropdown in the wizard with cost estimates shown inline. Kling v2.1 supports all three tiers, so this is a UI-only change plus updating `FAL_VIDEO_MODEL` per-request. Store the chosen model in `videos.fal_model` (already exists).

### Kling v3 `elements` for Character Consistency

Pass character portrait images as reference elements to Kling v3's `elements` param so characters look consistent across all generated videos in a campaign. Prerequisites:
- Kling v3 must be available on fal.ai with `elements` support
- Characters need `portrait_url` set (already supported in the app)
- Need to fetch portrait URLs at generation time and pass them alongside the keyframe

### Start/End Frame Interpolation

Let the user designate a "scene end" image (could be another keyframe or an uploaded image) for Kling v3 to interpolate between start and end frames. This would give full director-level control over scene composition. Prerequisites:
- Kling v3 `image_end_url` param support on fal.ai
- UI in the wizard to optionally attach an end frame image per scene
