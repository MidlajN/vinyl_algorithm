// ─── Pipeline Orchestrator — Full pipeline (Phases 1–4) ──────────────────────
//
// Stage order mirrors backend/services/vinyl_analyser.py exactly:
//   load_image → preprocess → detect_outer_ellipse → crop_to_disc →
//   rectify_disc → preprocess_rectified → detect_outer_ellipse_rectified →
//   normalize → detect_label_ring → refine_geometry → refine_rectification →
//   preprocess_micro → detect_outer_ellipse_micro →
//   detect_spindle →
//   normalize_final → detect_label_ring_final → refine_geometry_final →
//   detect_playable_boundaries → build_radial_texture_profile →
//   detect_track_separators → build_tracks → calculate_servo_angle
//
// MEMORY CONTRACT: every cv.Mat MUST be deleted in finally blocks.

import type { AnalysisResult, AnalysisConfig, VinylGeometry } from '../types';
import { PipelineTimer }         from '../benchmark/timer';
import { preprocess }            from './preprocess';
import { detectOuterEllipse }    from './ellipse';
import { cropToDisc }            from './cropDisc';
import { rectifyDisc }           from './rectify';
import { normalizeVinyl }        from './normalize';
import { detectLabelRing }       from './label';
import { refineGeometry }        from './geometryRefine';
import { refineRectification }   from './refineRectify';
import { detectSpindle }         from './spindle';
import { detectPlayableBoundaries } from './playable';
import { buildRadialTextureProfile } from './texture';
import { detectTrackSeparators } from './separators';
import { buildTracks }           from './tracks';
import { calculateServoAngle, PIVOT_TO_SPINDLE_MM, ARM_LENGTH_MM, SERVO_ZERO_OFFSET_DEG }
  from './tonearm';
import {
  addMatDebugImage,
  addOverlayDebugImage,
  addPlayableMaskDebugImage,
  createDebugCollector,
  debugStage,
  drawCircle,
  geometryDebug,
  labelDebug,
  profileStats,
  separatorDebug,
} from './debug';

type ProgressFn = (stage: string, idx: number, total: number) => void;
const TOTAL_STAGES = 22;

// ── Stub helpers (noopencv=1 mode) ───────────────────────────────────────────

function stubOuter(w: number, h: number): VinylGeometry {
  const r = Math.min(w, h) * 0.43;
  return { center: [w / 2, h / 2], radiusPx: r, majorRadiusPx: r * 1.01, minorRadiusPx: r, angle: 0 };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function emptyMat(cv: any): any {
  return new cv.Mat();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runPipeline(
  cv: any,
  imageData: ImageData,
  config: AnalysisConfig,
  onProgress: ProgressFn = () => {},
): Promise<AnalysisResult> {
  const timer = new PipelineTimer();
  timer.mark('total');
  const stub = Boolean(cv._stub);
  const debug = createDebugCollector(Boolean(config.debug));

  // ── 1: Load ───────────────────────────────────────────────────────────────
  onProgress('load_image', 0, TOTAL_STAGES);
  timer.mark('load_image');
  const src = cv.matFromImageData(imageData);
  try {
    if (!stub && src.empty()) throw new Error('Image failed to load into cv.Mat');
    debugStage(debug, 'load_image', {
      imageDataWidth: imageData.width,
      imageDataHeight: imageData.height,
      matWidth: src.cols,
      matHeight: src.rows,
    });
    await addMatDebugImage(debug, '01-original', src);
    timer.end('load_image');

    // ── 2: Preprocess ────────────────────────────────────────────────────
    onProgress('preprocess', 1, TOTAL_STAGES);
    timer.mark('preprocess');
    const { gray, blurred: _b1 } = preprocess(cv, src);
    _b1.delete();
    try {
      if (!stub && (gray.rows < 200 || gray.cols < 200))
        throw new Error(`Image too small: ${gray.cols}×${gray.rows}`);
      debugStage(debug, 'preprocess', {
        width: gray.cols,
        height: gray.rows,
      });
      await addMatDebugImage(debug, '02-preprocessed', gray);
      timer.end('preprocess');

      // ── 3: Outer ellipse ─────────────────────────────────────────────
      onProgress('detect_outer_ellipse', 2, TOTAL_STAGES);
      timer.mark('detect_outer_ellipse');
      const outer0 = stub ? stubOuter(imageData.width, imageData.height)
                           : detectOuterEllipse(cv, gray);
      debugStage(debug, 'outer', geometryDebug(outer0));
      timer.end('detect_outer_ellipse');

      // ── 4: Crop to disc ──────────────────────────────────────────────
      onProgress('crop_to_disc', 3, TOTAL_STAGES);
      timer.mark('crop_to_disc');
      const { cropped, outer: croppedOuter } = stub
        ? { cropped: src, outer: outer0 }
        : cropToDisc(cv, src, outer0, 20);
      try {
        debugStage(debug, 'crop', {
          croppedWidth: cropped.cols,
          croppedHeight: cropped.rows,
          localOuterCenter: croppedOuter.center,
          radiusPx: croppedOuter.radiusPx,
        });
        await addMatDebugImage(debug, '03-cropped', cropped);
        timer.end('crop_to_disc');

        // ── 5: Rectify ───────────────────────────────────────────────
        onProgress('rectify_disc', 4, TOTAL_STAGES);
        timer.mark('rectify_disc');
        const rectified = stub ? cropped : rectifyDisc(cv, cropped, croppedOuter);
        try {
          debugStage(debug, 'rectification', {
            sourceWidth: cropped.cols,
            sourceHeight: cropped.rows,
            rectifiedWidth: rectified.cols,
            rectifiedHeight: rectified.rows,
            center: croppedOuter.center,
            majorRadiusPx: croppedOuter.majorRadiusPx,
            minorRadiusPx: croppedOuter.minorRadiusPx,
            rotation: croppedOuter.angle,
            scaleY: croppedOuter.majorRadiusPx / croppedOuter.minorRadiusPx,
          });
          await addMatDebugImage(debug, '04-rectified', rectified);
          timer.end('rectify_disc');

          // ── 6: Preprocess rectified ──────────────────────────────
          onProgress('preprocess_rectified', 5, TOTAL_STAGES);
          timer.mark('preprocess_rectified');
          const { gray: grayRect, blurred: _b2 } = preprocess(cv, rectified);
          _b2.delete();
          try {
            timer.end('preprocess_rectified');

            // ── 7: Ellipse on rectified ──────────────────────────
            onProgress('detect_outer_ellipse_rectified', 6, TOTAL_STAGES);
            timer.mark('detect_outer_ellipse_rectified');
            let outer = stub ? croppedOuter : detectOuterEllipse(cv, grayRect);
            debugStage(debug, 'outer_rectified', geometryDebug(outer));
            timer.end('detect_outer_ellipse_rectified');

            // ── 8: Normalize (pass 1) ────────────────────────────
            onProgress('normalize', 7, TOTAL_STAGES);
            timer.mark('normalize');
            const norm1 = stub ? emptyMat(cv) : normalizeVinyl(cv, rectified, outer);
            try {
              debugStage(debug, 'normalize', {
                normalizedWidth: norm1.cols,
                normalizedHeight: norm1.rows,
              });
              timer.end('normalize');

              // ── 9: Label ring (pass 1) ───────────────────────
              onProgress('detect_label_ring', 8, TOTAL_STAGES);
              timer.mark('detect_label_ring');
              const label1 = stub
                ? { center: outer.center, radiusPx: outer.radiusPx * (50 / 152.4), score: 0, leftTransition: 0, rightTransition: 0 }
                : detectLabelRing(cv, norm1, outer);
              debugStage(debug, 'label_initial', labelDebug(label1, outer));
              timer.end('detect_label_ring');

              // ── 10: Refine geometry (pass 1) ─────────────────
              onProgress('refine_geometry', 9, TOTAL_STAGES);
              timer.mark('refine_geometry');
              const refined1 = refineGeometry(outer, label1);
              debugStage(debug, 'refine_geometry', {
                centerX: refined1.centerX,
                centerY: refined1.centerY,
                expectedLabelRadiusPx: refined1.expectedLabelRadiusPx,
                detectedLabelRadiusPx: refined1.detectedLabelRadiusPx,
                scaleFactor: refined1.scaleFactor,
                translationDx: refined1.translationDx,
                translationDy: refined1.translationDy,
                centerErrorPx: refined1.centerErrorPx,
                geometryConfidence: refined1.geometryConfidence,
              });
              timer.end('refine_geometry');

              // ── 11: Micro-rectify ────────────────────────────
              onProgress('refine_rectification', 10, TOTAL_STAGES);
              timer.mark('refine_rectification');
              const microRect = stub ? rectified : refineRectification(cv, rectified, outer, refined1);
              try {
                debugStage(debug, 'micro_rectification', {
                  sourceWidth: rectified.cols,
                  sourceHeight: rectified.rows,
                  microRectifiedWidth: microRect.cols,
                  microRectifiedHeight: microRect.rows,
                  translationDx: refined1.translationDx,
                  translationDy: refined1.translationDy,
                });
                timer.end('refine_rectification');

                // ── 12: Preprocess micro ─────────────────────
                onProgress('preprocess_micro', 11, TOTAL_STAGES);
                timer.mark('preprocess_micro');
                const { gray: grayMicro, blurred: _b3 } = preprocess(cv, microRect);
                _b3.delete();
                try {
                  timer.end('preprocess_micro');

                  // ── 13: Ellipse on micro-rectified ───────
                  onProgress('detect_outer_ellipse_micro', 12, TOTAL_STAGES);
                  timer.mark('detect_outer_ellipse_micro');
                  const microOuter = stub ? outer : detectOuterEllipse(cv, grayMicro);
                  debugStage(debug, 'outer_micro', geometryDebug(microOuter));
                  timer.end('detect_outer_ellipse_micro');

                  // Update outer geometry from micro pass
                  outer = { ...outer, center: microOuter.center, radiusPx: microOuter.radiusPx,
                            majorRadiusPx: microOuter.majorRadiusPx, minorRadiusPx: microOuter.minorRadiusPx };

                  // ── 14: Detect spindle ───────────────────
                  onProgress('detect_spindle', 13, TOTAL_STAGES);
                  timer.mark('detect_spindle');
                  const spindleCenter: [number, number] = [refined1.centerX, refined1.centerY];
                  const spindle = stub
                    ? { x: outer.center[0], y: outer.center[1], radiusPx: outer.radiusPx / 152.4 * 3.62, score: 0 }
                    : detectSpindle(cv, microRect, spindleCenter, outer);
                  debugStage(debug, 'spindle', {
                    center: [spindle.x, spindle.y],
                    centerX: spindle.x,
                    centerY: spindle.y,
                    radiusPx: spindle.radiusPx,
                    score: spindle.score,
                  });
                  timer.end('detect_spindle');

                  // ── 15: Normalize (pass 2, final) ────────
                  onProgress('normalize_final', 14, TOTAL_STAGES);
                  timer.mark('normalize_final');
                  const norm2 = stub ? emptyMat(cv) : normalizeVinyl(cv, microRect, outer);
                  try {
                    debugStage(debug, 'normalize_final', {
                      normalizedWidth: norm2.cols,
                      normalizedHeight: norm2.rows,
                    });
                    await addMatDebugImage(debug, '05-normalized', norm2);
                    timer.end('normalize_final');

                    // ── 16: Label ring (pass 2) ──────────
                    onProgress('detect_label_ring_final', 15, TOTAL_STAGES);
                    timer.mark('detect_label_ring_final');
                    const label2 = stub
                      ? label1
                      : detectLabelRing(cv, norm2, outer);
                    debugStage(debug, 'label', labelDebug(label2, outer));
                    timer.end('detect_label_ring_final');

                    // ── 17: Refine geometry (pass 2) ─────
                    onProgress('refine_geometry_final', 16, TOTAL_STAGES);
                    timer.mark('refine_geometry_final');
                    refineGeometry(outer, label2);
                    timer.end('refine_geometry_final');

                    const ppm = outer.radiusPx / 152.4;

                    // ── 18: Playable boundaries ──────────
                    onProgress('detect_playable_boundaries', 17, TOTAL_STAGES);
                    timer.mark('detect_playable_boundaries');
                    let playable;
                    if (stub) {
                      playable = {
                        outerPlayableRadiusPx: outer.radiusPx * 0.92,
                        innerPlayableRadiusPx: label2.radiusPx * 1.1,
                      };
                    } else {
                      const px2: Uint8Array = norm2.data as Uint8Array;
                      const step2: number   = (norm2.step as Uint32Array)[0];
                      playable = detectPlayableBoundaries(
                        px2, norm2.cols, norm2.rows, step2,
                        outer, spindle, label2,
                      );
                    }
                    debugStage(debug, 'playable', {
                      innerPlayableRadiusPx: playable.innerPlayableRadiusPx,
                      outerPlayableRadiusPx: playable.outerPlayableRadiusPx,
                    });
                    await addPlayableMaskDebugImage(
                      debug,
                      '06-playable-mask',
                      norm2.cols,
                      norm2.rows,
                      spindle,
                      playable,
                    );
                    await addOverlayDebugImage(debug, '07-radial-boundary-overlay', norm2, (context) => {
                      drawCircle(context, outer.center[0], outer.center[1], outer.radiusPx, '#00aaff', 3);
                      drawCircle(context, label2.center[0], label2.center[1], label2.radiusPx, '#ffaa00', 3);
                      drawCircle(context, spindle.x, spindle.y, spindle.radiusPx, '#ff00ff', 3);
                      drawCircle(context, spindle.x, spindle.y, playable.innerPlayableRadiusPx, '#00ff66', 2);
                      drawCircle(context, spindle.x, spindle.y, playable.outerPlayableRadiusPx, '#00ff66', 2);
                    });
                    timer.end('detect_playable_boundaries');

                    // ── 19: Radial texture profile ───────
                    onProgress('build_radial_texture_profile', 18, TOTAL_STAGES);
                    timer.mark('build_radial_texture_profile');
                    let profile;
                    if (stub) {
                      const stubLen = 10;
                      profile = { radii: new Int32Array(stubLen), energy: new Float32Array(stubLen) };
                    } else {
                      const px2: Uint8Array = norm2.data as Uint8Array;
                      const step2: number   = (norm2.step as Uint32Array)[0];
                      profile = buildRadialTextureProfile(
                        px2, norm2.cols, norm2.rows, step2,
                        spindle,
                        playable.innerPlayableRadiusPx,
                        playable.outerPlayableRadiusPx,
                      );
                    }
                    debugStage(debug, 'profile', profileStats(profile));
                    timer.end('build_radial_texture_profile');

                    // ── 20: Track separator detection ────
                    onProgress('detect_track_separators', 19, TOTAL_STAGES);
                    timer.mark('detect_track_separators');
                    const sepResult = detectTrackSeparators(profile, playable, ppm);
                    debugStage(debug, 'separators', separatorDebug(sepResult.separators, sepResult.count + 1));
                    await addOverlayDebugImage(debug, '08-separator-overlay', norm2, (context) => {
                      drawCircle(context, spindle.x, spindle.y, playable.innerPlayableRadiusPx, '#00ff66', 2);
                      drawCircle(context, spindle.x, spindle.y, playable.outerPlayableRadiusPx, '#00ff66', 2);
                      for (const separator of sepResult.separators) {
                        drawCircle(context, spindle.x, spindle.y, separator.radiusPx, '#ff3333', 2);
                      }
                    });
                    timer.end('detect_track_separators');

                    // ── 21: Build tracks + servo angles ──
                    onProgress('build_tracks', 20, TOTAL_STAGES);
                    timer.mark('build_tracks');
                    const tracks = buildTracks(playable, sepResult.separators, ppm);
                    for (const t of tracks) {
                      t.servoAngleDeg = Math.round(calculateServoAngle(
                        t.startRadiusMm,
                        PIVOT_TO_SPINDLE_MM,
                        ARM_LENGTH_MM,
                        SERVO_ZERO_OFFSET_DEG,
                      ) * 100) / 100;
                    }
                    debugStage(debug, 'tracks', {
                      trackCount: tracks.length,
                      tracks: tracks.map((track) => ({
                        trackNumber: track.trackNumber,
                        startRadiusPx: track.startRadiusPx,
                        endRadiusPx: track.endRadiusPx,
                        startRadiusMm: track.startRadiusMm,
                        endRadiusMm: track.endRadiusMm,
                        widthPx: track.widthPx,
                        widthMm: track.widthMm,
                        servoAngleDeg: track.servoAngleDeg,
                      })),
                    });
                    timer.end('build_tracks');

                    timer.end('total');

                    return {
                      success:    true,
                      tracks,
                      separators: sepResult.separators,
                      ppm,
                      timings:    timer.getTimings(),
                      debug,
                    };
                  } finally {
                    if (!stub) norm2.delete();
                  }
                } finally {
                  grayMicro.delete();
                }
              } finally {
                if (!stub) microRect.delete();
              }
            } finally {
              if (!stub) norm1.delete();
            }
          } finally {
            grayRect.delete();
          }
        } finally {
          if (!stub) rectified.delete();
        }
      } finally {
        if (!stub) cropped.delete();
      }
    } finally {
      gray.delete();
    }
  } finally {
    src.delete();
  }
}
