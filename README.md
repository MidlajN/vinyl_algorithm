# Sweep: Vinyl Track Detection System

## Architecture & Technical Documentation

---

# 1. Introduction

## 1.1 What is Sweep?

**Sweep** is a computer vision system developed to automatically detect track positions on vinyl records using a photograph of the record surface.

The system is part of a larger ecosystem that combines:

```text
Computer Vision
        ↓
Track Detection
        ↓
User Verification
        ↓
Firebase Realtime Database
        ↓
Player Firmware
        ↓
Automatic Needle Positioning
```

Instead of requiring a user to manually identify where songs begin and end on a vinyl record, Sweep analyzes a vinyl image and estimates:

* Track separator positions
* Playable groove regions
* Label boundaries
* Vinyl geometry
* Track segmentation

The detected tracks are shown to the user for verification before being saved and used by the firmware of the player.

Sweep is therefore not just an image-processing application, but a **computer vision layer for a physical vinyl playback system**.

---

## 1.2 The Problem Sweep Solves

Traditional vinyl players are mechanical systems.

A user manually places the needle on a record and must visually estimate where a specific song begins.

This becomes a problem when:

* The user wants to jump to a specific song
* The player must move automatically
* The track boundaries are difficult to identify visually
* A smart vinyl system needs precise positioning data

Vinyl records contain physical grooves that encode audio.

Between tracks, there are smoother regions called **separator regions** or **dead wax bands**, where groove density changes.

These regions appear visually different from the music grooves and can be detected computationally.

The challenge is that:

```text
Vinyl records are not perfectly uniform.
```

Detection accuracy changes depending on:

* Camera angle
* Reflections and lighting
* Dust and scratches
* Record wear
* Label brightness
* Groove contrast
* Manufacturing differences between pressings

Because of this variability, Sweep was intentionally designed as an **assistive detection system** rather than a fully autonomous system.

---

## 1.3 Human-in-the-Loop Verification

A core design decision in Sweep was:

```text
Detection should be assistive,
not blindly automatic.
```

Even highly accurate computer vision systems can occasionally produce incorrect detections.

Examples:

* False separator detection
* Missing tracks
* Reflections mistaken as groove transitions
* Geometric distortion from angled photographs

Instead of directly sending computer-generated results to the firmware, Sweep introduces a **verification step**.

### Workflow

```text
User uploads vinyl image
            ↓
Sweep detects tracks
            ↓
Detected tracks rendered visually
            ↓
User verifies result
            ↓
User presses Confirm
            ↓
Track data saved to Firebase
            ↓
Firmware consumes track positions
```

This approach gives Sweep two major advantages:

### 1. Reliability

The firmware only receives validated track positions.

This prevents incorrect needle placement.

### 2. Faster Product Development

The system can tolerate occasional imperfect detections because the user acts as the final validator.

This allowed development to move faster without requiring unrealistic detection perfection before shipping.

---

# 2. Original Sweep Architecture (Backend System)

## 2.1 Why Sweep Started as a Backend System

The first implementation of Sweep was designed as a **backend-driven computer vision system**.

At the start of development, this was the most practical architecture because:

### Python has strong computer vision tooling

The ecosystem already contained mature libraries:

* OpenCV
* NumPy
* SciPy
* Image processing utilities
* Signal analysis tools

These libraries made rapid experimentation easier.

Instead of solving infrastructure problems first, development could focus entirely on:

```text
Can track detection actually work?
```

The backend approach allowed fast iteration of:

* Groove analysis
* Separator detection
* Geometry correction
* Vinyl normalization
* Label detection

before worrying about frontend integration.

---

## 2.2 Intended Backend Stack

The original planned architecture used:

### Frontend

```text
Firebase Hosted Web App
```

Responsibilities:

* Upload image
* Display preview
* Show detected tracks
* User confirmation
* Save validated data

### Backend

```text
FastAPI + Python + OpenCV
```

Responsibilities:

* Receive image upload
* Run detection pipeline
* Return geometry and track data

### Database

```text
Firebase Realtime Database
```

Responsibilities:

* Store confirmed track positions
* Synchronize with hardware

### Firmware Layer

Responsibilities:

* Read track metadata
* Position the needle
* Enable automatic song selection

---

## 2.3 Original Backend Workflow

The first architecture followed this flow:

```text
User uploads/takes vinyl image
            ↓
Frontend sends image to FastAPI API
            ↓
Python OpenCV pipeline runs
            ↓
Backend detects:
    - vinyl geometry
    - playable area
    - separator regions
    - tracks
            ↓
JSON result returned
            ↓
Frontend renders detected tracks
            ↓
User verifies output
            ↓
User presses Confirm
            ↓
Firebase Realtime Database updated
            ↓
Firmware consumes track metadata
```

In simplified form:

```text
Frontend
    ↓
FastAPI
    ↓
Python/OpenCV
    ↓
Detection Result
    ↓
User Confirmation
    ↓
Firebase RTDB
    ↓
Firmware
```

---

## 2.4 Why FastAPI Was Chosen

FastAPI was selected because it matched the requirements of Sweep.

### 1. Fast experimentation

The detection pipeline changed frequently during development.

FastAPI allowed rapid testing without complex backend setup.

### 2. Good performance for API workloads

Even though computer vision is CPU-heavy, FastAPI made it easy to expose:

```text
POST /analyze
```

style endpoints.

### 3. Easy integration with Python OpenCV

The computer vision pipeline was already written in Python.

Using FastAPI avoided unnecessary translation or infrastructure complexity.

Example flow:

```python
image
    ↓
OpenCV pipeline
    ↓
separator detection
    ↓
track JSON
```

---

## 2.5 Why the Backend Architecture Worked

Technically, the backend system was successful.

It proved:

```text
Vinyl track detection is feasible.
```

The Python implementation achieved:

* Accurate groove separation
* Reliable geometry estimation
* Perspective correction
* Track detection
* Debug visualization
* Deterministic outputs

Most importantly:

```text
The algorithm itself worked.
```

This was a major milestone because the hardest engineering problem was never deployment.

It was:

```text
Can we reliably detect tracks
from a vinyl photograph?
```

The backend proved that this was possible.

However, solving the technical problem exposed a new challenge:

```text
The architecture itself
became the bottleneck.
```
