# VINYL APP FRONTEND — CODEX IMPLEMENTATION INSTRUCTIONS

## Project Goal

Build a **mobile-first premium PWA** for vinyl track selection.

This application enables users to:

1. Capture or upload a vinyl image
2. Analyze the vinyl using the backend API
3. View detected tracks
4. Select a track visually
5. Prepare for playback (frontend-only for MVP)

The product should feel:

```txt
Premium
Fast
Minimal
Music-focused
Modern
Tactile
```

Visual inspiration:

* Spotify (energy, music-first feel)
* Apple Music (spacing, polish, premium interactions)

Avoid cloning either.

Design language should feel like:

```txt
Spotify energy
+
Apple refinement
+
Physical vinyl personality
```

---

# 1. Technical Constraints

## Stack (Mandatory)

Use:

```txt
React
TypeScript
Vite
TailwindCSS
PWA
```

Required packages:

```txt
react-router-dom
framer-motion
lucide-react
axios
vite-plugin-pwa
```

Optional:

```txt
react-use
```

Do NOT add unnecessary dependencies.

---

## Architecture Philosophy

This is an MVP.

DO NOT overengineer.

### Forbidden

Do NOT add:

```txt
Redux
Zustand
MobX
Complex global state
Atomic design system
Feature-driven enterprise architecture
Heavy UI libraries
Material UI
Shadcn over-abstraction
```

### Use Instead

Prefer:

```txt
React Context
useState
useMemo
useReducer only if truly needed
```

Keep architecture simple and scalable.

---

# 2. App Type

This application is:

```txt
Mobile-first PWA
```

Must feel native on mobile.

Desktop should still work but is secondary.

Target width:

```txt
375px–480px
```

Design primarily for phones.

---

# 3. Core Product Flow

## Screen Flow

```txt
Launch
↓
Home Screen
↓
Capture / Upload
↓
Preview Screen
↓
Analyze Vinyl
↓
Loading Experience
↓
Results Screen
↓
Track Selection
↓
Play Track CTA
```

This flow must remain simple.

Do not add onboarding.

Do not add login.

Do not add accounts.

Do not add settings page for MVP.

---

# 4. Folder Structure

Use this structure exactly.

```txt
src/
│
├── app/
│   ├── router.tsx
│   └── providers.tsx
│
├── pages/
│   ├── HomePage.tsx
│   ├── PreviewPage.tsx
│   ├── AnalyzingPage.tsx
│   └── ResultsPage.tsx
│
├── components/
│   │
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   └── BottomActionBar.tsx
│   │
│   ├── upload/
│   │   ├── CaptureCard.tsx
│   │   ├── UploadCard.tsx
│   │   └── ImagePreview.tsx
│   │
│   ├── vinyl/
│   │   ├── VinylCanvas.tsx
│   │   ├── VinylTrackRing.tsx
│   │   ├── VinylAnimation.tsx
│   │   └── NeedleIndicator.tsx
│   │
│   ├── tracks/
│   │   ├── TrackList.tsx
│   │   ├── TrackCard.tsx
│   │   └── SelectedTrackCard.tsx
│   │
│   ├── loading/
│   │   ├── AnalysisLoader.tsx
│   │   └── LoaderStep.tsx
│   │
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── IconButton.tsx
│       └── ThemeToggle.tsx
│
├── context/
│   ├── ThemeContext.tsx
│   └── VinylContext.tsx
│
├── services/
│   ├── api.ts
│   └── vinyl.service.ts
│
├── hooks/
│   ├── useTheme.ts
│   └── useVinyl.ts
│
├── types/
│   └── vinyl.ts
│
├── constants/
│   └── theme.ts
│
└── styles/
    └── globals.css
```

Do not invent additional architecture.

---

# 5. State Management

Use one global context:

```txt
VinylContext
```

Store:

```ts
capturedImage
analysisResult
selectedTrack
isAnalyzing
theme
```

Nothing more.

Keep state intentionally minimal.

---

# 6. API Integration

Backend URL:

```txt
http://localhost:8080
```

Endpoint:

```txt
POST /api/analyse
```

Multipart upload:

```txt
image
```

Response:

```ts
type Track = {
  track_number: number;
  start_radius_px: number;
  end_radius_px: number;
  start_radius_mm: number;
  end_radius_mm: number;
  width_px: number;
  width_mm: number;
  servo_angle_deg: number;
};

type VinylAnalysisResponse = {
  success: boolean;
  tracks: Track[];
};
```

Create:

```txt
services/vinyl.service.ts
```

for API calls.

Keep network logic isolated.

---

# 7. Design Language

## Visual Identity

The UI should feel:

```txt
Dark
Musical
Premium
Minimal
Physical
```

Avoid generic SaaS feeling.

Avoid dashboard feeling.

This is a music experience.

---

## Rounded Geometry

Use large radii.

Example:

```txt
rounded-3xl
rounded-[32px]
```

No sharp corners.

---

## Shadows

Soft.

Never aggressive.

Avoid harsh black shadows.

Use:

```txt
soft elevation
subtle blur
layering
```

---

## Motion

Use subtle motion everywhere.

Mandatory:

```txt
Page transitions
Vinyl rotation
Track highlight animation
Bottom card slide-up
Button press feedback
```

Motion should feel:

```txt
organic
music-like
fluid
```

Never playful/cartoonish.

---

# 8. Theme System

Must support:

```txt
Dark
Light
```

Default:

```txt
Dark mode
```

### Dark Theme

Use:

```txt
near-black
deep gray
soft gradients
```

Not pure black.

Avoid OLED void black.

### Light Theme

Should feel:

```txt
Apple Music premium
```

Bright but soft.

Avoid sterile white.

---

# 9. Home Screen

## Goal

User immediately starts.

Primary CTA:

```txt
Capture Vinyl
```

Secondary:

```txt
Upload Image
```

Layout:

```txt
Top:
Branding

Middle:
Large hero card

Bottom:
Actions
```

### Capture

Should open:

```html
<input
 type="file"
 capture="environment"
/>
```

for camera-first behavior.

---

# 10. Preview Screen

After capture/upload.

Show:

```txt
Large image preview
```

Bottom actions:

```txt
Retake
Analyze Vinyl
```

Primary action:

```txt
Analyze Vinyl
```

Must feel premium.

Large button.

Sticky bottom.

---

# 11. Loading Experience

Critical.

Do NOT use spinner-only loading.

User waits:

```txt
3–5 seconds
```

We must make it feel intentional.

Create:

```txt
AnalyzingPage
```

### Visual

Stylized rotating vinyl.

Subtle glow.

Soft motion.

### Progressive Messages

Rotate through:

```txt
Detecting grooves
Finding track separators
Mapping playback positions
Preparing track layout
```

Animated transitions.

Should feel intelligent.

Not fake.

---

# 12. Results Screen

Most important screen.

Layout:

```txt
Top:
Header

Center:
Stylized Vinyl UI

Bottom:
Track list
```

---

# 13. Vinyl Visualization

Use:

```txt
Generated premium vinyl
```

Do NOT use uploaded image yet.

Future support required.

Architecture must allow:

```ts
mode:
"generated" | "image"
```

for future transition.

---

## Vinyl Behavior

Display:

```txt
Track rings
Selected track highlight
Subtle spinning idle state
```

When selecting:

```txt
Track glow
Ring animation
```

Needle visualization optional.

Premium feel required.

---

# 14. Track List

Bottom sheet style.

Each track:

```txt
Track 1
Track 2
Track 3
```

Show:

```txt
Track number
Servo angle
```

Example:

```txt
Track 2
34.3°
```

Card interactions:

```txt
tap
hover
selection animation
```

---

# 15. Selection UX

When user taps track:

Do NOT immediately play.

Instead:

Open mini-player style card.

Example:

```txt
────────────────────
Track 3 Selected
Servo Angle: 29°
[ Play This Track ]
────────────────────
```

Animate upward.

Feels tactile.

---

# 16. Play Button

Frontend only.

No hardware integration yet.

Button should:

```txt
simulate selected state
```

Prepare architecture for:

```txt
future hardware commands
```

---

# 17. Responsiveness

Primary:

```txt
mobile
```

Secondary:

```txt
tablet
desktop
```

Desktop should center content.

Do NOT stretch layouts.

---

# 18. PWA Requirements

Must support:

```txt
Installable
Standalone mode
Splash screen
Theme color
Offline shell
```

But:

No offline analysis.

Only UI shell offline.

---

# 19. Performance Rules

Avoid:

```txt
heavy rerenders
large libraries
unnecessary animations
```

Target:

```txt
smooth 60fps
```

especially vinyl animation.

---

# 20. Future Compatibility

Architecture must support:

### Future 1

Real image overlay:

```txt
generated → real vinyl image
```

### Future 2

Hardware communication:

```txt
ESP32
WiFi
Bluetooth
WebSocket
```

### Future 3

Track naming metadata.

Do not hardcode assumptions.

---

# 21. Development Order

Build in this exact order.

### Phase 1

App shell

### Phase 2

Theme system

### Phase 3

Capture/upload flow

### Phase 4

Preview screen

### Phase 5

API integration

### Phase 6

Loading experience

### Phase 7

Results screen

### Phase 8

Vinyl visualization

### Phase 9

Track selection UX

### Phase 10

Polish & animations

Do not jump phases.

---

# Final Rule

Prioritize:

```txt
Experience > features
```

This app should feel:

```txt
premium
focused
intentional
music-first
```

Never feel like:

```txt
admin dashboard
engineering tool
generic upload app
```
