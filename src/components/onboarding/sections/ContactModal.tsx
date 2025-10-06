import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (phone: string) => Promise<void>;
}

export default function ContactModal({ isOpen, onClose, onSubmit }: ContactModalProps) {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!/^\d{10}$/.test(phone)) {
        setError("Vui lòng nhập số điện thoại hợp lệ.");
        return;
    }
    setError("");
    setIsLoading(true);
    await onSubmit(phone);
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="items-center text-center">
          <Image src="/path/to/your/barrier-icon.svg" alt="Contact" width={80} height={80} className="mb-4" />
          <DialogTitle className="text-xl">Thông tin liên hệ</DialogTitle>
          <DialogDescription className="text-center px-4">
            Thông tin của bạn sẽ được gửi tới các chuyên gia tài chính của Finful. Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09..."
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