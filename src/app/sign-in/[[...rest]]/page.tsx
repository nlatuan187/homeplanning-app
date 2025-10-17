// src/app/manual-sign-in/page.tsx
import SignInForm from "@/components/auth/signInForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-950">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-white">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold tracking-tight">BẠN ĐÃ SẴN SÀNG</CardTitle>
          <CardDescription className="text-center">
            Chinh phục <span className="text-cyan-500">căn nhà đầu tiên?</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm />
          <div className="mt-4 text-center text-sm">
            Chưa có tài khoản?{" "}
            <Link href="/sign-up" className="underline text-cyan-500">
              Đăng ký
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}