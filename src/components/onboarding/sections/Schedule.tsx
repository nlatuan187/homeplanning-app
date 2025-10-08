'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Copy } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function Schedule({ onConfirm }: { onConfirm: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Đã sao chép vào bộ nhớ tạm!');
    }, (err) => {
      console.error('Could not copy text: ', err);
      toast.error('Không thể sao chép.');
    });
  };

  return (
    <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col z-10 bg-slate-950 text-white px-2">
      <header className="p-4 flex items-center relative border-b border-slate-800">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="absolute left-2">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-semibold text-center flex-grow">Đặt lịch tư vấn 1-1</h1>
      </header>

      <main className="flex-grow space-y-6 overflow-y-auto">
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold mb-3 flex items-center">
            <span className="w-2 h-2 bg-cyan-500 rounded-full mr-2"></span>
            Thông tin
          </h2>
          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span>Thời lượng:</span>
              <span>1 → 1,5 tiếng</span>
            </div>
            <div className="flex justify-between">
              <span>Chi phí:</span>
              <span>499.000 VNĐ/buổi tư vấn</span>
            </div>
            <div className="flex justify-between">
              <span>Nội dung:</span>
              <span>...</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">Tên</label>
            <Input
              id="name"
              type="text"
              placeholder="Nhập tên"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-transparent border-slate-700 text-white placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-2">Số điện thoại liên hệ</label>
            <Input
              id="phone"
              type="tel"
              placeholder="Nhập số điện thoại"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-3">Thông tin chuyển khoản</h2>

        <div className="flex flex-row items-center rounded-lg mb-20 max-md:mb-10">
          <div>
            <Image
              src="/QR.png"
              alt="QR Code"
              width={280}
              height={150}
              className=""
            />
          </div>
          <div className="text-slate-300 flex flex-col ml-5">
            <p className="text-sm">Ngân hàng Quân đội (MB)</p>
            <div className="flex items-center justify-center">
              <p className="font-semibold text-cyan-500 text-sm tracking-wider">9602345678</p>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard('9602345678')} title="Sao chép số tài khoản">
                <Copy className="h-4 w-4 text-slate-400 hover:text-white" />
              </Button>
            </div>
            <p>CÔNG TY CỔ PHẦN FINFUL</p>
            <p className="text-xs text-slate-400 mt-3">
              Vui lòng thanh toán 499.000 VNĐ để đặt lịch hẹn. Xác nhận hẹn sẽ được về số điện thoại của bạn.
            </p>
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-2 bg-slate-950 border-t border-slate-800 z-10">
          <Button onClick={onConfirm} className="w-full bg-white text-slate-950 hover:bg-slate-200 text-lg font-semibold py-3">
            Xác nhận đăng ký
          </Button>
        </div>
      </main>
    </div>
  );
}
