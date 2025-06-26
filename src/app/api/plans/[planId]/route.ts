import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { calculateAffordability } from "@/lib/calculations/affordability";

export async function GET(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const { userId } = await auth();
    const { planId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const plan = await db.plan.findUnique({
      where: {
        id: planId,
        userId,
      },
      include: {
        familySupport: true,
      },
    });

    if (!plan) {
      return new NextResponse("Plan not found", { status: 404 });
    }

    // Calculate affordability
    const affordabilityResult = calculateAffordability(plan);

    return NextResponse.json({
      plan,
      affordabilityResult,
    });
  } catch (error) {
    console.error("[PLAN_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const { userId } = await auth();
    const { planId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();

    const plan = await db.plan.findUnique({
      where: {
        id: planId,
        userId,
      },
      include: {
        familySupport: true,
      },
    });

    if (!plan) {
      return new NextResponse("Plan not found", { status: 404 });
    }

    // Update the plan
    const updatedPlan = await db.plan.update({
      where: {
        id: planId,
      },
      data: {
        ...body,
      },
    });

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error("[PLAN_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const { userId } = await auth();
    const { planId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const plan = await db.plan.findUnique({
      where: {
        id: planId,
        userId,
      },
      include: {
        familySupport: true,
      },
    });

    if (!plan) {
      return new NextResponse("Plan not found", { status: 404 });
    }

    // Delete the plan
    await db.plan.delete({
      where: {
        id: planId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[PLAN_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
