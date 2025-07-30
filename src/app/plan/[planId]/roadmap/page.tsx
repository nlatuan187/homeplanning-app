import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function MilestonePlanScreen() {
  return (
    <main className="min-h-screen bg-black text-white md:p-4">
      <div className="container mx-auto max-w-5xl">
        <div className="min-h-screen bg-black text-white font-sans">
          <header className="container mx-auto px-4 py-3 flex items-center justify-center relative sticky top-0 bg-black z-40">
            <Button variant="ghost" size="icon" className="text-white absolute left-4">
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div className="text-base font-bold">KẾ HOẠCH HÀNH ĐỘNG</div>
          </header>

          {/* Info Card */}
          <div className="bg-white mt-4 p-4 flex gap-4 items-center ">
            <Image
              src="/avatar.png"
              alt="Avatar"
              width={48}
              height={48}
              className="rounded-full"
            />
            <div className="flex-1 text-sm text-black">
              <div className="font-semibold">Mua chung cư tại Hà Nội</div>
              <ul className="list-disc list-inside text-xs mt-1">
                <li>Thời gian mua: <span className="font-semibold">Tháng 9/2026</span></li>
                <li>Giá trị căn nhà: <span className="font-semibold">2,2 tỷ</span></li>
              </ul>
              <div className="w-full h-2 bg-slate-700 rounded-full mt-2">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '15%' }}></div>
              </div>
            </div>
            <div className="text-sm font-semibold text-black">15%</div>
          </div>

          {/* Milestone Section */}
          <div className="mt-6 px-8 space-y-12">
            {/* Milestone 1 */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-cyan-500 flex items-center justify-center bg-cyan-800">
                  <span className="text-3xl">✔</span>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-1 h-10 bg-dotted-cyan"></div>
              </div>
              <div>
                <div className="font-semibold">Cột mốc số 1</div>
                <div className="text-slate-300 text-sm">Tích lũy đạt 550 triệu</div>
              </div>
            </div>

            {/* Milestone 2 */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-cyan-500 flex items-center justify-center bg-neutral-900">
                  <Image src="/icon-milestone2.png" alt="m2" width={24} height={24} />
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-1 h-10 bg-dotted"></div>
              </div>
              <div>
                <div className="font-semibold">Cột mốc số 2</div>
                <div className="text-slate-300 text-sm">Tích lũy đạt 600 triệu</div>
              </div>
            </div>

            {/* Milestone 3 */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-gray-600 flex items-center justify-center bg-neutral-900">
                  <Image src="/icon-milestone3.png" alt="m3" width={24} height={24} />
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-1 h-10 bg-dotted"></div>
              </div>
              <div>
                <div className="font-semibold">Cột mốc số 3</div>
                <div className="text-slate-300 text-sm">Tích lũy đạt 700 triệu</div>
              </div>
            </div>

            {/* Milestone 4 */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-gray-600 flex items-center justify-center bg-neutral-900">
                  <Image src="/icon-milestone4.png" alt="m4" width={24} height={24} />
                </div>
              </div>
              <div>
                <div className="font-semibold">Cột mốc số 4</div>
                <div className="text-slate-300 text-sm">Tích lũy đạt ...</div>
              </div>
            </div>
          </div>

          {/* Button */}
          <div className="mt-8 px-4">
            <button className="w-full bg-white text-black font-semibold py-2 rounded-xl">Đọc kế hoạch tài chính chuyên sâu</button>
          </div>
        </div>
      </div>
    </main>
  );
}
