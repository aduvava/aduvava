import { handleRouteError, HttpError } from "@/lib/api";

export async function POST() {
  try {
    throw new HttpError(410, "Nạp tiền đã chuyển sang các gói VIP tại /vip.");
  } catch (error) {
    return handleRouteError(error);
  }
}
