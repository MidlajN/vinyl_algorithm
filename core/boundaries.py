import numpy as np


def _detect_outer_playable_from_polar(
    profile
):
    signal = profile[
        "smoothed"
    ]

    radii = profile[
        "radii"
    ]

    if len(signal) < 32:
        return float(
            radii[-1]
        )

    search_count = max(
        24,
        int(
            len(signal)
            * 0.30
        )
    )

    search_count = min(
        search_count,
        len(signal)
    )

    outer_signal = signal[
        -search_count:
    ]

    outer_radii = radii[
        -search_count:
    ]

    reverse_signal = outer_signal[
        ::-1
    ]

    reverse_radii = outer_radii[
        ::-1
    ]

    edge_window = max(
        3,
        search_count // 60
    )

    baseline = float(
        np.median(
            reverse_signal[
                :edge_window
            ]
        )
    )

    high_level = float(
        np.percentile(
            reverse_signal,
            90
        )
    )

    threshold = (
        baseline
        + max(
            0.08,
            (
                high_level
                - baseline
            )
            * 0.35
        )
    )

    sustain = max(
        5,
        search_count // 28
    )

    for i in range(
        0,
        len(reverse_signal)
        - sustain
    ):
        window = reverse_signal[
            i:
            i + sustain
        ]

        if (
            np.mean(
                window
            ) >= threshold
            and np.max(
                window
            ) >= threshold + 0.04
        ):
            return float(
                reverse_radii[
                    i
                ]
            )

    fallback_idx = min(
        len(reverse_radii) - 1,
        edge_window + sustain
    )

    return float(
        reverse_radii[
            fallback_idx
        ]
    )

    if best_idx is None:
        return float(
            reverse_radii[
                min(
                    len(reverse_radii) - 1,
                    lookahead
                )
            ]
        )

    return float(
        reverse_radii[
            best_idx
        ]
    )


def _find_low_activity_runs(
    signal,
    threshold
):
    runs = []
    start = None

    for i, value in enumerate(signal):
        if value <= threshold and start is None:
            start = i

        elif value > threshold and start is not None:
            runs.append(
                (
                    start,
                    i - 1
                )
            )

            start = None

    if start is not None:
        runs.append(
            (
                start,
                len(signal) - 1
            )
        )

    return runs


def _separator_consistency(
    profile,
    start_idx,
    end_idx
):
    texture_map = profile.get(
        "texture_map"
    )

    if texture_map is None:
        return 0.5

    band = texture_map[
        start_idx:end_idx + 1,
        :
    ]

    reference = np.percentile(
        texture_map,
        35
    )

    if reference <= 0:
        return 0.5

    angular_texture = np.mean(
        band,
        axis=0
    )

    return float(
        np.mean(
            angular_texture
            <= reference
        )
    )


def detect_separators(
    profile,
    inner_playable_radius_px,
    outer_playable_radius_px,
    pixels_per_mm=None
):
    """
    Detect smooth, low-activity annular bands inside the playable region.
    """

    radii = profile[
        "radii"
    ]

    signal = profile[
        "smoothed"
    ]

    playable_mask = (
        (radii >= inner_playable_radius_px + 4)
        & (radii <= outer_playable_radius_px - 4)
    )

    indexes = np.where(
        playable_mask
    )[0]

    if len(indexes) < 32:
        return []

    start_idx = int(
        indexes[0]
    )

    end_idx = int(
        indexes[-1]
    )

    candidates = []

    neighborhood = max(
        12,
        len(indexes) // 18
    )

    for i in range(
        start_idx + neighborhood,
        end_idx - neighborhood
    ):
        local = signal[
            i - 2:
            i + 3
        ]

        if signal[i] != np.min(
            local
        ):
            continue

        left_peak = float(
            np.max(
                signal[
                    i - neighborhood:
                    i + 1
                ]
            )
        )

        right_peak = float(
            np.max(
                signal[
                    i:
                    i + neighborhood + 1
                ]
            )
        )

        valley = float(
            signal[
                i
            ]
        )

        prominence = (
            min(
                left_peak,
                right_peak
            )
            - valley
        )

        if prominence < 0.05:
            continue

        cutoff = (
            valley
            + prominence
            * 0.45
        )

        band_start = i

        while (
            band_start > start_idx
            and signal[
                band_start
            ] <= cutoff
        ):
            band_start -= 1

        band_end = i

        while (
            band_end < end_idx
            and signal[
                band_end
            ] <= cutoff
        ):
            band_end += 1

        width_px = float(
            radii[
                band_end
            ]
            - radii[
                band_start
            ]
        )

        if (
            width_px < 1
            or width_px > 28
        ):
            continue

        consistency = _separator_consistency(
            profile,
            band_start,
            band_end
        )

        if consistency < 0.12:
            continue

        confidence = min(
            1.0,
            0.30
            + prominence
            + consistency
            * 0.35
        )

        if confidence < 0.43:
            continue

        candidates.append(
            {
                "start_idx": band_start,
                "end_idx": band_end,
                "center_idx": i,
                "width_px": width_px,
                "prominence": prominence,
                "angular_consistency": consistency,
                "confidence": confidence
            }
        )

    selected = []

    for candidate in sorted(
        candidates,
        key=lambda item: item[
            "confidence"
        ],
        reverse=True
    ):
        if any(
            abs(
                radii[
                    candidate[
                        "center_idx"
                    ]
                ]
                - radii[
                    existing[
                        "center_idx"
                    ]
                ]
            ) < 14
            for existing in selected
        ):
            continue

        selected.append(
            candidate
        )

    separators = []

    for candidate in sorted(
        selected,
        key=lambda item: radii[
            item[
                "center_idx"
            ]
        ],
        reverse=True
    ):
        separator = {
            "start_radius_px": float(
                radii[
                    candidate[
                        "start_idx"
                    ]
                ]
            ),
            "end_radius_px": float(
                radii[
                    candidate[
                        "end_idx"
                    ]
                ]
            ),
            "center_radius_px": float(
                radii[
                    candidate[
                        "center_idx"
                    ]
                ]
            ),
            "width_px": round(
                candidate[
                    "width_px"
                ],
                3
            ),
            "prominence": round(
                candidate[
                    "prominence"
                ],
                3
            ),
            "angular_consistency": round(
                candidate[
                    "angular_consistency"
                ],
                3
            ),
            "confidence": round(
                candidate[
                    "confidence"
                ],
                3
            )
        }

        if pixels_per_mm:
            separator[
                "center_radius_mm"
            ] = float(
                separator[
                    "center_radius_px"
                ]
                / pixels_per_mm
            )

        separators.append(
            separator
        )

    return separators


def detect_boundaries(profile):
    """
    Detect:
    - label boundary
    - inner playable radius
    """

    smoothed = profile["smoothed"]
    radii = profile["radii"]

    gradient = np.gradient(smoothed)

    search_end = int(
        len(smoothed) * 0.45
    )

    # -------------------------
    # Valley (deadwax)
    # -------------------------

    valley_idx = (
        np.argmin(
            smoothed[
                100:search_end
            ]
        )
        + 100
    )

    # -------------------------
    # Label boundary
    # -------------------------

    best_idx = valley_idx
    best_score = 0

    for i in range(
        100,
        valley_idx - 10
    ):
        window = gradient[
            i:i+10
        ]

        negative_strength = (
            -window[
                window < 0
            ].sum()
        )

        if (
            negative_strength
            > best_score
        ):
            best_score = (
                negative_strength
            )

            best_idx = i

    label_idx = best_idx

    # -------------------------
    # Inner playable
    # -------------------------

    post_signal = smoothed[
        valley_idx:
        search_end
    ]

    grad = np.gradient(
        post_signal
    )

    accel = np.gradient(
        grad
    )

    kernel = (
        np.ones(9) / 9
    )

    accel = np.convolve(
        accel,
        kernel,
        mode="same"
    )

    search_start = 10

    search_limit = min(
        120,
        len(accel)
    )

    best_local = np.argmax(
        accel[
            search_start:
            search_limit
        ]
    )

    playable_idx = (
        valley_idx
        + search_start
        + best_local
    )

    return {
        "label_radius_px":
            float(
                radii[
                    label_idx
                ]
            ),

        "inner_playable_radius_px":
            float(
                radii[
                    playable_idx
                ]
            )
    }


def detect_outer_playable(
    profile
):
    """
    Detect outer playable
    (lead-in → music groove transition)
    """

    if profile.get("kind") == "polar_annulus":
        return _detect_outer_playable_from_polar(
            profile
        )

    smoothed = profile[
        "smoothed"
    ]

    radii = profile[
        "radii"
    ]

    start_idx = int(
        len(smoothed)
        * 0.97
    )

    end_idx = int(
        len(smoothed)
        * 0.55
    )

    signal = smoothed[
        end_idx:start_idx + 1
    ][::-1]

    signal_radii = radii[
        end_idx:start_idx + 1
    ][::-1]

    if len(signal) < 32:
        return float(
            radii[
                int(
                    len(radii)
                    * 0.92
                )
            ]
        )

    outer_window = min(
        5,
        max(
            4,
            len(signal) // 48
        )
    )

    peak_window_end = min(
        len(signal),
        outer_window + max(
            16,
            len(signal) // 10
        )
    )

    smooth_level = float(
        np.median(
            signal[:outer_window]
        )
    )

    peak_level = float(
        np.percentile(
            signal[
                outer_window:
                peak_window_end
            ],
            90
        )
    )

    if peak_level <= smooth_level:
        fallback_idx = min(
            len(signal) - 1,
            outer_window + 6
        )

        return float(
            signal_radii[
                fallback_idx
            ]
        )

    rise_floor = max(
        2.0,
        (
            peak_level
            - smooth_level
        ) * 0.35
    )

    threshold = (
        smooth_level
        + rise_floor
    )

    sustain_window = max(
        5,
        len(signal) // 36
    )

    for i in range(
        0,
        len(signal)
        - sustain_window
    ):
        if signal[i] >= threshold:
            continue

        sustained = signal[
            i + 1:
            i + 1
            + sustain_window
        ]

        if np.all(
            sustained >= threshold
        ):
            crossing_idx = i + 1

            return float(
                signal_radii[
                    crossing_idx
                ]
            )

    fallback_idx = min(
        len(signal) - 1,
        outer_window + sustain_window
    )

    return float(
        signal_radii[
            fallback_idx
        ]
    )
