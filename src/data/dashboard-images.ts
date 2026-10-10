export const dashboardImages: Record<string, { src: string; alt: string }> = {
  coffee: {
    src: "/dashboard-images/coffee-beans.svg",
    alt: "Hạt cà phê trên bàn gỗ",
  },
  orange: {
    src: "/dashboard-images/orange-focus.svg",
    alt: "Không gian học tập tông cam",
  },
  neon: {
    src: "/dashboard-images/neon-night.svg",
    alt: "Thành phố neon về đêm",
  },
  beach: {
    src: "/dashboard-images/quiet-beach.svg",
    alt: "Bãi biển yên tĩnh",
  },
  book: {
    src: "/dashboard-images/reading-room.svg",
    alt: "Phòng đọc sách",
  },
};

export function getDashboardImage(imageKey?: string | null) {
  return dashboardImages[imageKey ?? "coffee"] ?? dashboardImages.coffee;
}
