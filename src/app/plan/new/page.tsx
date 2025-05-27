import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import PlanForm, { ExistingPlanData, SectionType } from "@/components/plan/plan-form";
import { notFound } from "next/navigation";

interface NewPlanPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NewPlanPage({ searchParams }: NewPlanPageProps) {
  const user = await currentUser(); // This is the Clerk user object

  if (!user || !user.id) { // Added check for user.id
    redirect("/sign-in"); // Or handle error appropriately
  }

  const primaryEmailObject = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
  const userEmail = primaryEmailObject?.emailAddress;

  if (!userEmail) {
    console.error(`Clerk user ${user.id} has no primary email address.`);
    // Return a user-friendly error message or redirect
    // For now, rendering a simple error message:
    return (
      <main className="min-h-screen bg-slate-950 p-4 text-white">
        <div className="container mx-auto max-w-3xl text-center">
          <p>Lỗi: Không tìm thấy địa chỉ email cho người dùng. Vui lòng kiểm tra thông tin tài khoản Clerk của bạn.</p>
        </div>
      </main>
    );
  }

  // Upsert logic for user in DB
  let dbUser = await db.user.findUnique({
    where: { id: user.id }, // Check by Clerk ID (which is stored as 'id' in your DB User table)
  });

  if (dbUser) {
    // User with this Clerk ID exists. Update their email if it changed in Clerk.
    if (dbUser.email !== userEmail) {
      dbUser = await db.user.update({
        where: { id: user.id },
        data: { email: userEmail },
      });
      console.log(`User email updated for Clerk ID: ${user.id}`);
    }
  } else {
    // No user found with this Clerk ID. Check if the email is already in use.
    const userByEmail = await db.user.findUnique({
      where: { email: userEmail },
    });

    if (userByEmail) {
      // Email exists, likely from an old (e.g., dev) Clerk instance.
      // Update this existing DB record to use the new (e.g., prod) Clerk ID.
      console.warn(`Email ${userEmail} found with existing DB user ID ${userByEmail.id}. Updating to new Clerk ID ${user.id}.`);
      dbUser = await db.user.update({
        where: { email: userEmail }, // Find by the existing email
        data: {
          id: user.id, // Update the 'id' field (which stores clerkId) to the new Clerk ID
          email: userEmail, // Ensure email is also set/updated if needed
        },
      });
      console.log(`DB User record for ${userEmail} now linked to Clerk ID: ${user.id}`);
    } else {
      // No user by Clerk ID and no user by email. This is a genuinely new user.
      console.log(`Creating new DB user for Clerk ID: ${user.id}, Email: ${userEmail}`);
      dbUser = await db.user.create({
        data: {
          id: user.id, // This is clerkUser.id
          email: userEmail,
        },
      });
    }
  }
  // At this point, dbUser should be the synchronized user from your database.

  // Check if we're in edit mode
  const searchParamsData = await searchParams;
  const editPlanId = searchParamsData.edit as string | undefined;
  const startSection = searchParamsData.section as string | undefined;
  let existingPlanData = undefined; // Renamed to avoid conflict with Prisma type
  let editMode = false;

  if (editPlanId) {
    const planFromDb = await db.plan.findUnique({ // Renamed to avoid conflict
      where: {
        id: editPlanId,
      },
    });

    // Verify the user owns the plan using the Clerk user ID
    if (!planFromDb || planFromDb.userId !== user.id) { 
      notFound();
    }
    existingPlanData = planFromDb;
    editMode = true;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4">
      <div className="container mx-auto max-w-3xl">
        <PlanForm 
          userId={user.id} // Pass Clerk ID
          existingPlan={existingPlanData as ExistingPlanData | undefined} // Cast or ensure types match
          editMode={editMode} 
          startSection={startSection as SectionType | undefined}
        />
      </div>
    </main>
  );
}
