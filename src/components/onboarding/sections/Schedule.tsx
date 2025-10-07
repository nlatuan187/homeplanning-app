'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Copy } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function Schedule() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleConfirm = () => {
    // Handle confirmation logic here
    console.log({ name, phone });
    toast.success('Đăng ký thành công!');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Đã sao chép vào bộ nhớ tạm!');
    }, (err) => {
      console.error('Could not copy text: ', err);
      toast.error('Không thể sao chép.');
    });
  };

  return (
    <div className="bg-slate-950 text-white min-h-screen flex flex-col max-w-md mx-auto">
      <header className="p-4 flex items-center relative border-b border-slate-800">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="absolute left-2">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-semibold text-center flex-grow">Đặt lịch tư vấn 1-1</h1>
      </header>

      <main className="flex-grow p-4 space-y-6 overflow-y-auto pb-24">
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

        <div className="text-center">
          <h2 className="text-lg font-semibold mb-3">Thông tin chuyển khoản</h2>
          <div className="flex flex-col items-center bg-slate-900 p-4 rounded-lg border border-slate-800">
            {/* Make sure to add your QR code image to the public folder */}
            <Image
              src="/qr-code-placeholder.png"
              alt="QR Code"
              width={140}
              height={140}
              className="mb-4"
            />
            <div className="text-slate-300 space-y-1">
              <p>Ngân hàng Quân đội (MB)</p>
              <div className="flex items-center justify-center space-x-2">
                <p className="font-semibold text-white text-lg tracking-wider">9602345678</p>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard('9602345678')} title="Sao chép số tài khoản">
                  <Copy className="h-4 w-4 text-slate-400 hover:text-white" />
                </Button>
              </div>
              <p>CÔNG TY CỔ PHẦN FINFUL</p>
            </div>
            <p className="text-xs text-slate-400 mt-3 max-w-xs">
              Vui lòng thanh toán 499.000 VNĐ để đặt lịch hẹn. Xác nhận hẹn sẽ được về số điện thoại của bạn.
            </p>
          </div>
        </div>
      </main>

      <footer className="p-4 bg-slate-950 border-t border-slate-800 fixed bottom-0 w-full max-w-md">
        <Button onClick={handleConfirm} className="w-full bg-white text-slate-950 hover:bg-slate-200 text-lg font-semibold py-3">
          Xác nhận đăng ký
        </Button>
      </footer>
    </div>
  );
}
