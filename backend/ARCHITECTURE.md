# Vinyl Track Position Detection System — Architecture Document (V1)

## 1. Project Objective

Build a deterministic computer vision system that detects song positions on a physical vinyl record from a user-uploaded image and maps selected tracks to physical needle drop coordinates.

The system should allow:

```txt
User selects Track 1 / Track 2 / Track 3...
↓
Needle moves radially
↓
Drops near song beginning
↓
Playback begins naturally
```

The system does not use music metadata.

Tracks are inferred directly from visible groove separator rings.

---

# 2. Product Scope (V1)

## Supported

* Real stationary vinyl record
* User uploads phone photo
* Full vinyl visible
* Mostly top-down image
* Visible groove separators
* Standard vinyl dimensions
* User can retake image if confidence is low

### Initial support

* 12-inch vinyl records

Future support:

* 7-inch
* 10-inch
* Custom profiles

---

## Not Supported (V1)

* Cropped vinyl
* Rotating vinyl during capture
* Severe perspective distortion
* Extremely poor lighting
* Hidden/occluded record
* Automatic metadata/song name detection

Tracks will be labeled:

```txt
Track 1
Track 2
Track 3
...
```

---

# 3. Core Philosophy

This system is **not an AI/ML problem**.

The project uses:

```txt
Deterministic Computer Vision
+
Signal Processing
+
Geometry
```

Reasoning:

Vinyl grooves follow strong physical rules and are highly structured.

A deterministic pipeline is:

* explainable
* debuggable
* stable
* hardware-friendly

---

# 4. Physical Constraints

## Standard Vinyl Geometry

### Disc

```txt
Diameter: 12 inches
Radius: 6 inches
304.8 mm diameter
152.4 mm radius
```

### Label

```txt
Diameter: 4 inches
Radius: 2 inches
101.6 mm diameter
50.8 mm radius
```

Important:

Playable groove area is **not standardized**.

Different manufacturers/mastering may change:

* outer groove start
* inner groove end
* deadwax size

Therefore:

```txt
Playable region MUST be dynamically detected
```

and cannot be hardcoded.

---

# 5. High-Level Pipeline

```txt
Image Upload
      ↓
Geometry Detection
      ↓
Physical Calibration
      ↓
Playable Region Detection
      ↓
Polar Transform
      ↓
Groove Signal Extraction
      ↓
Separator Detection
      ↓
Track Generation
      ↓
Needle Coordinate Calculation
```

---

# 6. Image Capture Assumptions

The system assumes:

### Required

* entire vinyl visible
* vinyl stationary
* image taken from near top-down
* decent lighting
* hard surface background preferred

### Recommended

* flashlight at slight angle
* avoid cloth/fabric background
* avoid strong shadows

The system may reject poor images.

---

# 7. Geometry Detection Module

## Goal

Detect vinyl geometry.

Output:

```ts
type VinylGeometry = {
  centerX: number
  centerY: number
  outerRadiusPx: number
  labelRadiusPx: number
}
```

---

## Responsibilities

### Detect outer disc edge

Find:

```txt
12-inch outer boundary
```

Purpose:

* establish scale
* determine record center

---

### Detect center label

Find:

```txt
4-inch label
```

Purpose:

* secondary geometric anchor
* perspective validation
* scale verification

---

## Confidence Checks

Reject image if:

### Disc clipped

Part of vinyl missing.

### Geometry mismatch

Center label and outer disc disagree.

### Excessive tilt

Strong perspective distortion.

### Low confidence

Detection score below threshold.

Example:

```txt
minimum confidence = 0.75
```

---

# 8. Physical Calibration Module

## Goal

Convert:

```txt
pixels ↔ millimeters
```

Formula:

```txt
pixelsPerMM =
outerRadiusPx
/
152.4
```

Output:

```ts
type Calibration = {
  pixelsPerMM: number
}
```

This enables:

```txt
Image coordinates
→
Real-world needle coordinates
```

---

# 9. Playable Region Detection

## Problem

Playable area varies by manufacturer.

Cannot hardcode:

```txt
groove start
groove end
```

---

## Goal

Automatically detect:

```txt
playableOuterRadius
playableInnerRadius
```

---

## Signal Pattern

Expected radial topology:

```txt
outer rim
↓
grooves begin
↓
track region
↓
deadwax
↓
label
```

The system detects:

### Groove start

Transition:

```txt
smooth → textured
```

### Groove end

Transition:

```txt
textured → smooth
```

Output:

```ts
type PlayableRegion = {
  grooveOuterRadiusMM: number
  grooveInnerRadiusMM: number
}
```

---

# 10. Polar Transform Module

## Purpose

Convert circular groove structure into linear representation.

Transform:

```txt
(radius, angle)
```

into:

```txt
(x = angle)
(y = radius)
```

Conceptually:

```txt
Before:
⭕ vinyl grooves

After:

──────────────── angle →
████████████████
████████████████
──── separator ────
████████████████
──── separator ────
████████████████
radius ↓
```

Benefits:

* simplifies analysis
* easier separator detection
* robust against local defects

---

# 11. Groove Signal Extraction

## Goal

Generate:

```txt
activity(radius)
```

This is the most important signal in the system.

---

## Principle

We do NOT use:

```txt
brightness
```

because:

* glare
* reflections
* colored lighting

Instead use:

```txt
texture energy
```

Likely methods:

### Gradient magnitude

Preferred V1 candidate.

Measures groove detail density.

### Laplacian variance

Secondary candidate.

Measures microstructure.

---

## Reflection Resistance

For every radius:

Average signal across:

```txt
0° → 360°
```

This removes:

* reflections
* shadows
* local scratches
* noise

Expected graph:

```txt
high

██████████
██████████
___gap____
██████████
___gap____
██████████

low
```

Valleys represent separator regions.

---

# 12. Separator Detection Module

## Goal

Detect silent bands between songs.

Output:

```ts
type Separator = {
  startMM: number
  endMM: number
  confidence: number
}
```

---

## Rules

### Minimum spacing rule

Reject impossible separators.

Example:

```txt
0.2 mm spacing
```

Likely noise.

---

### Valley prominence rule

Separator must show significant groove reduction.

---

### Angular consistency rule

Separator must exist across large angular region.

Reject:

```txt
reflection artifacts
```

---

# 13. Track Generation

No metadata available.

Tracks generated automatically.

Example:

```txt
Track 1
Track 2
Track 3
```

Tracks are derived from separator regions.

Output:

```ts
type Track = {
  id: number
  startMM: number
  endMM: number
}
```

---

# 14. Needle Drop Strategy

## Final Decision (V1)

Needle should drop:

```txt
slightly outward
from detected song start
```

NOT:

```txt
separator center
```

Reason:

Preserves intro and naturally enters groove.

Formula:

```txt
dropPoint =
trackStart
-
adaptiveOffset
```

(outward direction)

---

## Adaptive Offset

Avoid fixed values.

Offset depends on separator width.

Example:

```txt
offset =
min(
 separatorWidth × 0.4,
 0.8 mm
)
```

Benefits:

* narrow separator → smaller offset
* wide separator → safe landing
* avoids overshooting

---

## Special Case: Track 1

Track 1 has no previous separator.

Rule:

```txt
dropPoint =
playableOuterRadius
+
safe inward offset
```

---

# 15. Confidence System

The system may reject bad scans.

Confidence sources:

### Geometry confidence

Circle detection quality.

### Groove confidence

Playable area reliability.

### Separator confidence

Track boundary certainty.

Output:

```ts
type DetectionResult = {
  confidence: number
  tracks: Track[]
}
```

If:

```txt
confidence < threshold
```

Request retake.

Example message:

```txt
Couldn’t reliably detect track boundaries.
Please retake the image in better lighting.
```

---

# 16. Future Roadmap

## V2

* perspective correction
* multi-size support
* smarter lighting correction

## V3

* hardware integration
* motor calibration
* homing logic
* live needle preview

## V4

* optional metadata enrichment
* track naming
* album recognition
