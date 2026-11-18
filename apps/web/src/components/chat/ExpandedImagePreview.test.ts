import { ChatAttachmentId, EnvironmentId } from "@t3tools/contracts";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { buildExpandedImagePreview, resolveMarkdownMediaPreview } from "./ExpandedImagePreview";

describe("resolveMarkdownMediaPreview", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ["t3code:", "https:"],
    ["t3code-dev:", "https:"],
    ["http:", "http:"],
    ["https:", "https:"],
  ])(
    "resolves protocol-relative media on %s without changing its source",
    async (pageProtocol, mediaProtocol) => {
      vi.stubGlobal("window", { location: { protocol: pageProtocol } });
      const source = "//cdn.example.com/recording.mp4?token=a%2FB&v=1#t=2";
      const preview = await resolveMarkdownMediaPreview({
        source,
        createAssetUrl: async () => {
          throw new Error("Remote media must not request a local asset URL.");
        },
      });

      expect(preview?.images[0]).toMatchObject({
        src: `${mediaProtocol}${source}`,
        originalUrl: source,
        actionsSource: {
          src: `${mediaProtocol}${source}`,
          reference: { kind: "url", url: source },
        },
      });
    },
  );
});

describe("buildExpandedImagePreview", () => {
  it.each(["image", "file"] as const)("keeps a renewable asset for a stored %s image", (type) => {
    const environmentId = EnvironmentId.make("remote");
    const attachment = {
      id: ChatAttachmentId.make("stored"),
      name: "photo.png",
      mimeType: "image/png",
      sizeBytes: 10,
      previewUrl: "https://host/image?expired",
    };
    const preview = buildExpandedImagePreview(
      [type === "image" ? { ...attachment, type: "image" } : { ...attachment, type: "file" }],
      "stored",
      undefined,
      environmentId,
    );
    expect(preview?.images[0]?.actionsSource?.asset).toEqual({
      environmentId,
      resource: {
        _tag: "attachment",
        attachmentId: "stored",
        fileName: "photo.png",
        mimeType: "image/png",
      },
    });
    expect(preview?.images[0]?.attachmentId).toBeUndefined();
  });

  it("keeps MIME type for stored images without a filename extension", () => {
    const preview = buildExpandedImagePreview(
      [
        {
          type: "image",
          id: "heic-1",
          name: "photo",
          mimeType: "image/heic",
          sizeBytes: 3,
          previewUrl: "blob:heic",
        },
      ],
      "heic-1",
    );
    expect(preview?.images[0]).toMatchObject({
      name: "photo",
      mimeType: "image/heic",
      src: "blob:heic",
    });
  });
});
