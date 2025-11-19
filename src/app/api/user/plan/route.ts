import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const plan = await db.plan.findFirst({
            where: { userId: user.id },
            include: { familySupport: true },
        });

        return NextResponse.json({ plan });
    } catch (error) {
        console.error("Error fetching plan:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
