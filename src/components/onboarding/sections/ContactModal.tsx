import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (phone: string, assumptionData?: any) => Promise<void>;
  currentPhone?: string | null;
}

export default function ContactModal({ isOpen, onClose, onSubmit, currentPhone}: ContactModalProps) {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setPhone("");
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const phoneToSubmit = phone || currentPhone;
    if (!phoneToSubmit || !/^\d{10}$/.test(phoneToSubmit)) {
        setError("Vui lòng nhập số điện thoại hợp lệ.");
        return;
    }
    setError("");
    setIsLoading(true);
    await onSubmit(phoneToSubmit);
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-950">
        <DialogHeader className="items-center text-center">
          <Image src="/barrier.png" alt="Contact" width={80} height={80} className="mb-4" />
          <DialogTitle className="text-xl">Trò chuyện cùng chuyên gia</DialogTitle>
          <DialogDescription className="text-center px-4">
            Thông tin của bạn sẽ được gửi tới các chuyên gia tài chính của Finful để chúng tôi có thể hỗ trợ bạn miễn phí.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={currentPhone || "Nhập số điện thoại của bạn"}
            className="col-span-3"
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={isLoading} className="w-full bg-cyan-500 hover:bg-cyan-600">
            {isLoading ? "Đang gửi..." : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}