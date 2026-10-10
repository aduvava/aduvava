import fs from "node:fs";
import path from "node:path";

import { getDailyQuote } from "@/data/motivational-quotes";

type DashboardQuote = {
  id?: string;
  text?: string;
  author?: string;
  isActive?: boolean;
  createdAt?: string;
};

type DashboardImage = {
  id?: string;
  title?: string;
  alt?: string;
  src?: string;
  isActive?: boolean;
  createdAt?: string;
};

type DashboardContentConfig = {
  quotes?: DashboardQuote[];
  images?: DashboardImage[];
};

const dashboardContentPath = path.join(process.cwd(), "admin-server", "data", "dashboard-content.json");

function readDashboardContentConfig(): DashboardContentConfig {
  try {
    if (!fs.existsSync(dashboardContentPath)) return {};
    return JSON.parse(fs.readFileSync(dashboardContentPath, "utf8")) as DashboardContentConfig;
  } catch {
    return {};
  }
}

function pickDailyItem<T>(items: T[], date: Date) {
  if (!items.length) return undefined;
  const dayOfYear = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(date.getFullYear(), 0, 0)) /
      86_400_000,
  );
  return items[dayOfYear % items.length];
}

export function getDashboardContent(date = new Date()) {
  const config = readDashboardContentConfig();
  const quotes = (config.quotes ?? []).filter((item) => item.text?.trim());
  const activeQuote = quotes.find((item) => item.isActive) ?? pickDailyItem(quotes, date);
  const images = (config.images ?? []).filter((item) => item.src?.trim());
  const activeImage = images.find((item) => item.isActive) ?? images[0];

  return {
    quote: activeQuote?.text?.trim() || getDailyQuote(date),
    image: activeImage?.src
      ? {
          src: activeImage.src,
          alt: activeImage.alt?.trim() || activeImage.title?.trim() || "Ảnh động lực",
          title: activeImage.title?.trim() || "Ảnh động lực",
        }
      : null,
  };
}
