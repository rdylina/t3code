import { expect, it, vi } from "vite-plus/test";
import { createAnimationFrameSheet } from "./imageAnimation";

it("reports unsupported decoding without reading the image bytes", async () => {
  const previous = Reflect.get(globalThis, "ImageDecoder");
  vi.stubGlobal("ImageDecoder", undefined);
  using _decoder = { [Symbol.dispose]: () => vi.stubGlobal("ImageDecoder", previous) };
  const blob = new Blob();
  using bytes = vi.spyOn(blob, "arrayBuffer");
  await expect(createAnimationFrameSheet(blob, "image.gif")).rejects.toThrow(
    "GIF frame editing requires a browser with ImageDecoder support",
  );
  expect(bytes).not.toHaveBeenCalled();
});

it("rejects oversized GIF sources before allocating their bytes", async () => {
  const previous = Reflect.get(globalThis, "ImageDecoder");
  vi.stubGlobal("ImageDecoder", { isTypeSupported: async () => true });
  using _decoder = { [Symbol.dispose]: () => vi.stubGlobal("ImageDecoder", previous) };
  const blob = new Blob();
  Object.defineProperty(blob, "size", { value: 32 * 1024 * 1024 + 1 });
  using bytes = vi.spyOn(blob, "arrayBuffer");
  await expect(createAnimationFrameSheet(blob, "large.gif")).rejects.toThrow(
    "GIF frame editing supports images up to 32 MB.",
  );
  expect(bytes).not.toHaveBeenCalled();
});

it.each([
  { width: 8001, height: 8000, count: 1, error: "This GIF has unsupported frame dimensions." },
  { width: 8000, height: 8000, count: 2, error: "This GIF is too large to edit as a frame sheet." },
])(
  "closes the decoder and first frame when rejecting $width×$height×$count",
  async ({ width, height, count, error }) => {
    const previous = Reflect.get(globalThis, "ImageDecoder");
    const closeFrame = vi.fn();
    const closeDecoder = vi.fn();
    const decode = vi.fn(async () => ({
      image: { displayWidth: width, displayHeight: height, close: closeFrame },
    }));
    vi.stubGlobal(
      "ImageDecoder",
      class {
        static isTypeSupported = async () => true;
        tracks = { ready: Promise.resolve(), selectedTrack: { frameCount: count } };
        decode = decode;
        close = closeDecoder;
      },
    );
    using _decoder = { [Symbol.dispose]: () => vi.stubGlobal("ImageDecoder", previous) };
    await expect(createAnimationFrameSheet(new Blob(), "large.gif")).rejects.toThrow(error);
    expect(decode).toHaveBeenCalledOnce();
    expect(closeFrame).toHaveBeenCalledOnce();
    expect(closeDecoder).toHaveBeenCalledOnce();
  },
);
