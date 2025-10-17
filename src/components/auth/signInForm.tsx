"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { toast } from "react-hot-toast";
import { Mail, KeyRound, Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" width="24" height="24">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.356-11.303-7.918l-6.522,5.023C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C44.57,34.053,48,28.661,48,24C48,22.659,47.862,21.35,47.611,20.083z"></path>
  </svg>
);

const AppleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19.16 11.43c.02-3.41-2.2-5.46-5.04-5.46-2.06 0-3.61 1.22-4.63 1.22-1.05 0-2.93-1.25-4.43-1.22-2.81.06-5.18 2.2-5.06 5.61.11 2.58 1.63 4.63 3.16 6.13.9.9 1.93 1.96 3.23 1.93 1.25-.03 1.63-.63 3.38-.63.95 0 2.25.63 3.38.63 1.31 0 2.28-1.03 3.21-1.93a5.2 5.2 0 0 0 2.71-3.68c-.12-.06-2.58-.97-2.58-3.32Z"/><path fill="currentColor" d="M15.22 4.63c.95-.98 1.55-2.3 1.34-3.63-.95.03-2.28.6-3.23 1.58-.89.92-1.61 2.25-1.4 3.55.97-.03 2.34-.55 3.29-1.5Z"/></svg>
);


export default function SignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setIsSubmitting(true);
    try {
      const result = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        toast.success("Đăng nhập thành công!");
        router.push("/dashboard");
      } else {
        console.log(JSON.stringify(result, null, 2));
        toast.error("Thông tin đăng nhập không chính xác.");
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.longMessage || "Email hoặc mật khẩu không đúng.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signInWith = async (strategy: 'oauth_google' | 'oauth_apple') => {
    if (!isLoaded) return;
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (err: any) {
      toast.error(err.errors?.[0]?.longMessage || "Không thể đăng nhập, vui lòng thử lại.");
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="email"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            placeholder="Nhập email"
            className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-400 focus:ring-cyan-500"
            required
          />
        </div>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
            className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-400 focus:ring-cyan-500"
            required
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
            {!showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
          </button>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Checkbox id="remember-me" className="border-gray-600 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500" />
            <label htmlFor="remember-me" className="text-gray-400">Nhớ mật khẩu</label>
          </div>
          <Link href="/forgot-password" className="text-cyan-500 hover:underline">
            Quên mật khẩu?
          </Link>
        </div>
        <Button type="submit" disabled={isSubmitting} className="w-full bg-cyan-500 hover:bg-cyan-600 font-bold text-base text-white">
          {isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-900 px-2 text-slate-400">hoặc</span>
        </div>
      </div>

      <div className="space-y-3">
        <Button onClick={() => signInWith('oauth_google')} variant="outline" className="w-full flex items-center justify-center gap-2 bg-slate-900 border-slate-700 hover:bg-slate-800 hover:text-white">
          <GoogleIcon />
          Tiếp tục với Google
        </Button>
        <Button onClick={() => signInWith('oauth_apple')} variant="outline" className="w-full flex items-center justify-center gap-2 bg-slate-900 border-slate-700 hover:bg-slate-800 hover:text-white">
          <AppleIcon />
          Tiếp tục với Apple
        </Button>
      </div>
    </div>
  );
}