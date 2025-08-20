// Script to update existing plans with userEmail values

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function updatePlansWithEmail() {
  try {
    console.log('Starting to update plans with userEmail values...');

    // Get all plans that don't have a userEmail
    const plans = await prisma.plan.findMany({
      where: {
        userEmail: null,
      } as Prisma.PlanWhereInput,
      include: {
        user: true,
      },
    });

    console.log(`Found ${plans.length} plans without userEmail`);

    // Update each plan with the user's email
    for (const plan of plans) {
      try {
        if (plan.user && plan.user.email) {
          // Update the plan with the user's email
          await prisma.plan.update({
            where: {
              id: plan.id,
            },
            data: {
              userEmail: plan.user.email,
            } as Prisma.PlanUpdateInput,
          });

          console.log(`Updated plan ${plan.id} with email ${plan.user.email}`);
        } else {
          console.log(`No email found for user ${plan.userId} (plan ${plan.id})`);
        }
      } catch (error) {
        console.error(`Error updating plan ${plan.id}:`, error);
      }
    }

    console.log('Finished updating plans with userEmail values');
  } catch (error) {
    console.error('Error updating plans with userEmail values:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
updatePlansWithEmail();
