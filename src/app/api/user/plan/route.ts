import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        // Use hybrid auth verification
        const { verifyMobileToken } = await import('@/lib/mobileAuth');
        const userId = await verifyMobileToken(req);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const plan = await db.plan.findFirst({
            where: { userId },
            include: { familySupport: true },
        });

        return NextResponse.json({ plan });
    } catch (error) {
        console.error("Error fetching plan:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
