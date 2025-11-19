'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Accept() {
  const router = useRouter();

  return (
    <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col z-10 bg-[#121212] text-white px-2">
      <div className="relative flex items-center h-10 mb-4">
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
          <Button
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
          >
            <ArrowLeftIcon className="w-6 h-6 text-white" />
          </Button>
        </div>
      </div>
      <div className="flex-grow flex flex-col items-center justify-center text-center -mt-10">
        <Image src="/accept.png" alt="Giả định & Chiến lược" width={200} height={200} className="mb-6" />
        <h1 className="text-lg text-center font-semibold mb-3">Chúng tôi đã nhận được thông tin của bạn!</h1>
        <p className="text-lg text-center mb-3 text-slate-400">
            Các chuyên gia sẽ liên hệ với bạn trong thời gian sớm nhất
        </p>
      </div>
    </div>
  );
}
