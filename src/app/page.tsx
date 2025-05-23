import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  // If user is already logged in, redirect to dashboard
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Home Planning Solution</CardTitle>
          <CardDescription className="text-center">
            Lập kế hoạch tài chính cá nhân để mua nhà đầu tiên của bạn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-400 text-center">
            Công cụ giúp bạn lập kế hoạch tài chính, đánh giá khả năng chi trả và theo dõi tiến trình để sở hữu ngôi nhà đầu tiên.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button asChild className="w-full">
            <Link href="/sign-in">Đăng nhập</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/sign-up">Đăng ký</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
