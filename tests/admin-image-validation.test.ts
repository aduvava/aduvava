import { describe, it } from "node:test";
import assert from "node:assert/strict";
const { validateMotivationImageBuffer } = require("../admin-server/image-file-validation.js");

describe("Admin motivation image upload validation", () => {
  it("accepts a PNG with a valid signature and bounded dimensions", () => {
    const png = Buffer.alloc(33);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png, 0);
    png.writeUInt32BE(13, 8);
    png.write("IHDR", 12);
    png.writeUInt32BE(800, 16);
    png.writeUInt32BE(600, 20);
    assert.equal(validateMotivationImageBuffer(png, "illustration.png").mimeType, "image/png");
    assert.throws(() => validateMotivationImageBuffer(png, "illustration.gif"));
  });

  it("rejects HTML/SVG disguised as supported images", () => {
    const body = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>');
    assert.throws(() => validateMotivationImageBuffer(body, "trick.png"));
    assert.throws(() => validateMotivationImageBuffer(body, "trick.jpg"));
    assert.throws(() => validateMotivationImageBuffer(body, "trick.webp"));
  });

  it("rejects giant declared dimensions and oversized buffers", () => {
    const gif = Buffer.alloc(20);
    gif.write("GIF89a", 0);
    gif.writeUInt16LE(65535, 6);
    gif.writeUInt16LE(65535, 8);
    assert.throws(() => validateMotivationImageBuffer(gif, "oversized.gif"));
    assert.throws(() => validateMotivationImageBuffer(Buffer.alloc(5 * 1024 * 1024 + 1), "huge.png"));
  });
});
