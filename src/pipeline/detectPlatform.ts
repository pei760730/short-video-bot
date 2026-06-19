/**
 * Detect Platform — 依優先序比對 domain 判斷平台。
 * 比對不到 → fallback 到 Instagram(confidence=medium),沿用 n8n 行為。
 */
import type { Platform, PlatformInfo } from "../types.js";

interface Rule {
  platform: Platform;
  icon: string;
  /** 命中其一即判定。 */
  domains: string[];
}

/** 順序即優先序,先命中先贏。 */
const RULES: Rule[] = [
  { platform: "TikTok", icon: "🎵", domains: ["tiktok.com"] },
  { platform: "YouTube", icon: "📺", domains: ["youtube.com", "youtu.be"] },
  { platform: "Facebook", icon: "📘", domains: ["facebook.com", "fb.com", "fb.watch"] },
  { platform: "Instagram", icon: "📸", domains: ["instagram.com"] },
  { platform: "X", icon: "🐦", domains: ["x.com", "twitter.com"] },
  { platform: "抖音", icon: "🎶", domains: ["douyin.com"] },
  { platform: "小紅書", icon: "📕", domains: ["xhslink.com", "xiaohongshu.com"] },
];

export const PLATFORM_ICON: Record<Platform, string> = Object.fromEntries(
  RULES.map((r) => [r.platform, r.icon]),
) as Record<Platform, string>;

export function detectPlatform(cleanUrl: string): PlatformInfo {
  const lower = (cleanUrl ?? "").toLowerCase();
  if (!lower) {
    return { platform: "Instagram", icon: "📸", confidence: "low", method: "error" };
  }
  for (const rule of RULES) {
    if (rule.domains.some((d) => lower.includes(d))) {
      return {
        platform: rule.platform,
        icon: rule.icon,
        confidence: "high",
        method: "domain_match",
      };
    }
  }
  // fallback:沿用 n8n —— 不認得就猜 Instagram,但標 medium 讓人看得出是猜的
  return { platform: "Instagram", icon: "📸", confidence: "medium", method: "fallback" };
}
