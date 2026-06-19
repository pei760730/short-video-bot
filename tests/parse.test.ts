import { describe, it, expect } from "vitest";
import { parseMessage, NoUrlError } from "../src/pipeline/parse.js";

describe("parseMessage", () => {
  it("抽出網址與備註", () => {
    const r = parseMessage({
      text: "https://www.tiktok.com/@u/video/123 健身梗很好笑",
      senderName: "Pei",
    });
    expect(r.rawUrl).toBe("https://www.tiktok.com/@u/video/123");
    expect(r.note).toBe("健身梗很好笑");
    expect(r.sender).toBe("Pei");
  });

  it("備註在前、網址在後也能抽", () => {
    const r = parseMessage({ text: "好笑 https://youtu.be/abc", senderName: "" });
    expect(r.rawUrl).toBe("https://youtu.be/abc");
    expect(r.note).toBe("好笑");
  });

  it("沒網址丟 NoUrlError", () => {
    expect(() => parseMessage({ text: "今天天氣真好" })).toThrow(NoUrlError);
  });

  it("沒提交者名 → unknown(不寫死 Pei)", () => {
    const r = parseMessage({ text: "https://x.com/a/status/1" });
    expect(r.sender).toBe("unknown");
  });
});
