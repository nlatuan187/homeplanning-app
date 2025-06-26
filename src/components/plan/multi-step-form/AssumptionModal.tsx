"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AssumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  currentValue: string;
  explanation: string;
  onConfirm: () => void;
}

export const AssumptionModal = ({
  isOpen,
  onClose,
  title,
  currentValue,
  explanation,
  onConfirm,
}: AssumptionModalProps) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-[#1C1C1E] border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="py-8 text-center">
          <div className="text-7xl font-bold text-yellow-400 mb-4">
            {currentValue}
          </div>
          <p className="text-base text-gray-300 px-4">
            {explanation}
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full bg-gray-600 hover:bg-gray-500"
          >
            Thay đổi giả định
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 