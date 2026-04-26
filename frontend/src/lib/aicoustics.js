// ai-coustics noise cancellation for the live mic stream.
//
// The ai-coustics Web SDK ships an AudioWorklet processor that takes a
// mic MediaStream and returns a denoised MediaStream. We slot it in
// between getUserMedia() and gradbot's audio pipeline so gradbot still
// thinks it's reading raw mic audio — but it's been cleaned first.
//
// Best-effort: if the SDK isn't installed (or the API key is missing),
// we passthrough the original stream so the live demo still works.
// Replace the dynamic import below with the actual ai-coustics package
// name once `npm i` has resolved it (their hackathon docs/challenge
// brief give the exact entry point).

const SDK_CANDIDATES = [
  // Fill in the real package name from the ai-coustics docs.
  // Common naming patterns: "@ai-coustics/web-sdk", "@ai-coustics/lite",
  // "@ai-coustics/audio-enhancement". The first that resolves wins.
  "@ai-coustics/web-sdk",
  "@ai-coustics/lite",
  "@ai-coustics/sdk",
];

async function loadSdk() {
  if (import.meta.env.VITE_AIC_DISABLED === "1") return null;
  for (const name of SDK_CANDIDATES) {
    try {
      // Vite leaves dynamic imports it can't resolve as runtime fetches,
      // so a missing package becomes a runtime catch instead of a build
      // failure.
      // eslint-disable-next-line no-await-in-loop
      const mod = await import(/* @vite-ignore */ name);
      return mod;
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * Wrap a mic MediaStream with ai-coustics denoise. Returns the denoised
 * stream (or the original if the SDK isn't available).
 */
export async function enhanceStream(stream) {
  const mod = await loadSdk();
  if (!mod) {
    console.warn("[ai-coustics] SDK not loaded — passthrough");
    return stream;
  }
  try {
    const apiKey = import.meta.env.VITE_AIC_API_KEY;
    // The exact factory name depends on which package above resolved.
    // Common shapes:
    //   const enhancer = await mod.create({ apiKey });  return enhancer.enhance(stream);
    //   const enhanced = await mod.enhance(stream, { apiKey });
    if (typeof mod.enhance === "function") {
      return await mod.enhance(stream, { apiKey });
    }
    if (typeof mod.create === "function") {
      const enhancer = await mod.create({ apiKey });
      return await enhancer.enhance(stream);
    }
    if (mod.default) {
      const enhancer = await mod.default({ apiKey });
      return await enhancer.enhance(stream);
    }
    throw new Error("unknown ai-coustics SDK shape");
  } catch (err) {
    console.warn("[ai-coustics] enhance failed, falling back to raw mic:", err);
    return stream;
  }
}
