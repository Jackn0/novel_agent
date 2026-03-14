import { NextResponse } from "next/server";

// POST: 重启提示（不再自动重启，因为端口占用问题难以解决）
export async function POST() {
  // 直接返回成功，前端会显示手动重启提示
  return NextResponse.json({
    success: true,
    message: "请手动重启服务",
    manualRestart: true,
  });
}
