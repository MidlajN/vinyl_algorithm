// Mirrors backend/core/preprocess.py
// Input: RGBA Mat (from cv.matFromImageData)
// Output: { gray, blurred } — caller must delete both

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function preprocess(cv: any, src: any): { gray: any; blurred: any } {
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const blurred = new cv.Mat();
  const ksize = new cv.Size(9, 9);
  cv.GaussianBlur(gray, blurred, ksize, 2, 2);

  return { gray, blurred };
}
