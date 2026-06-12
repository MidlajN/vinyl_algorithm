// ─── Adaptive Resolution ──────────────────────────────────────────────────────
//
// Mobile cameras shoot 3000-4000px wide images. Processing full-res is wasteful.
// We target an outer disc radius of ~420-560px — enough for accurate detection.
// The resize happens on the main thread before transfer to the worker, so the
// worker never allocates memory for the full-res image.

export interface DeviceCapability {
  memoryGB: number;         // navigator.deviceMemory (falls back to 4)
  cpuCores: number;         // navigator.hardwareConcurrency (falls back to 4)
  targetLongestSide: number;
}

export function detectDeviceCapability(): DeviceCapability {
  // deviceMemory not available in all browsers; default to mid-range
  const memoryGB = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cpuCores = navigator.hardwareConcurrency ?? 4;

  let targetLongestSide: number;
  if (memoryGB >= 8 && cpuCores >= 8) {
    targetLongestSide = 3200; // high-end
  } else if (memoryGB >= 4) {
    targetLongestSide = 2400; // mid-range
  } else {
    targetLongestSide = 2000; // low-end
  }

  return { memoryGB, cpuCores, targetLongestSide };
}

export function computeTargetDimensions(
  width: number,
  height: number,
  targetLongestSide: number,
): { width: number; height: number; scale: number } {
  const longest = Math.max(width, height);
  if (longest <= targetLongestSide) {
    return { width, height, scale: 1.0 };
  }
  const scale = targetLongestSide / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    scale,
  };
}

// Runs on main thread. Resizes using OffscreenCanvas for zero-copy.
export function resizeImageData(
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number,
): ImageData {
  const srcCanvas = new OffscreenCanvas(imageData.width, imageData.height);
  srcCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

  const dstCanvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = dstCanvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);

  return ctx.getImageData(0, 0, targetWidth, targetHeight);
}

// Convenience: detect capability and resize in one call.
export function adaptiveResize(
  imageData: ImageData,
  overrideSize?: number,
): { imageData: ImageData; scale: number; targetLongestSide: number } {
  const { targetLongestSide } = detectDeviceCapability();
  const target = overrideSize ?? targetLongestSide;
  const dims = computeTargetDimensions(imageData.width, imageData.height, target);

  if (dims.scale === 1.0) {
    return { imageData, scale: 1.0, targetLongestSide: target };
  }

  const resized = resizeImageData(imageData, dims.width, dims.height);
  return { imageData: resized, scale: dims.scale, targetLongestSide: target };
}
