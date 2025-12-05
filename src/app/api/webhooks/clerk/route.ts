import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the endpoint
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  // Do something with the payload
  // For this guide, you simply log the payload to the console
  const { id } = evt.data
  const eventType = evt.type

  console.log(`Webhook with and ID of ${id} and type of ${eventType}`)
  console.log('Webhook body:', body)

  if (eventType === 'user.created' || eventType === 'user.updated' || eventType === 'user.deleted') {
    const { id } = evt.data;
    if (!id) {
      return new NextResponse('Error: No user ID found', { status: 400 });
    }

    if (eventType === 'user.deleted') {
      try {
        await db.user.delete({ where: { id } });
        return new NextResponse('User deleted successfully', { status: 200 });
      } catch (error) {
        console.error('Error deleting user from database:', error);
        return new NextResponse('Error deleting user', { status: 500 });
      }
    }

    const { email_addresses, primary_email_address_id } = evt.data;

    // Tìm email chính
    const primaryEmail = email_addresses.find(email => email.id === primary_email_address_id);
    const email = primaryEmail?.email_address;

    if (!email) {
      return new NextResponse('Error: No primary email found', { status: 400 });
    }

    try {
      // Logic Upsert (Tạo hoặc Cập nhật)
      // 1. Tìm user bằng ID
      let dbUser = await db.user.findUnique({
        where: { id: id },
      });

      if (dbUser) {
        // User tồn tại -> Cập nhật email nếu thay đổi
        if (dbUser.email !== email) {
          await db.user.update({
            where: { id: id },
            data: { email: email },
          });
        }
      } else {
        // Không tìm thấy bằng ID -> Tìm bằng Email (trường hợp user cũ)
        const userByEmail = await db.user.findUnique({
          where: { email: email },
        });

        if (userByEmail) {
          // Tìm thấy bằng email -> Cập nhật ID mới từ Clerk
          await db.user.update({
            where: { email: email },
            data: { id: id },
          });
        } else {
          // Không tìm thấy gì -> Tạo mới hoàn toàn
          await db.user.create({
            data: {
              id: id,
              email: email,
            },
          });
        }
      }
      return new NextResponse('User synced successfully', { status: 200 });

    } catch (error) {
      console.error('Error syncing user to database:', error);
      return new NextResponse('Error syncing user', { status: 500 });
    }
  }

  return new Response('', { status: 200 })
}
