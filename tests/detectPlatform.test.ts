import { describe, it, expect } from "vitest";
import { detectPlatform } from "../src/pipeline/detectPlatform.js";

describe("detectPlatform", () => {
  const cases: [string, string][] = [
    ["https://www.tiktok.com/@u/video/123", "TikTok"],
    ["https://youtu.be/abcdefghijk", "YouTube"],
    ["https://www.youtube.com/shorts/abcdefghijk", "YouTube"],
    ["https://www.facebook.com/watch?v=1", "Facebook"],
    ["https://fb.watch/xyz", "Facebook"],
    ["https://www.instagram.com/reel/abc", "Instagram"],
    ["https://x.com/a/status/1", "X"],
    ["https://twitter.com/a/status/1", "X"],
    ["https://www.douyin.com/video/123", "抖音"],
    ["https://xhslink.com/abc", "小紅書"],
    ["https://www.xiaohongshu.com/explore/abc", "小紅書"],
  ];

  for (const [url, platform] of cases) {
    it(`${platform} ← ${url}`, () => {
      const r = detectPlatform(url);
      expect(r.platform).toBe(platform);
      expect(r.confidence).toBe("high");
      expect(r.method).toBe("domain_match");
      expect(r.icon).not.toBe("");
    });
  }

  it("不認得 → fallback Instagram(medium)", () => {
    const r = detectPlatform("https://example.com/whatever");
    expect(r.platform).toBe("Instagram");
    expect(r.confidence).toBe("medium");
    expect(r.method).toBe("fallback");
  });

  it("空字串 → error/low", () => {
    const r = detectPlatform("");
    expect(r.method).toBe("error");
    expect(r.confidence).toBe("low");
  });
});
