"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Map } from "lucide-react";

interface BottomNavbarProps {
  planId: string;
}

export default function BottomNavbar({ planId }: BottomNavbarProps) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: `/plan/${planId}/roadmap`, label: "Roadmap", icon: Map },
  ];

  return (
    <nav className="container mx-auto max-w-5xl fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 h-16 z-50">
      <div className="flex justify-around items-center h-full max-w-lg mx-auto">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center text-sm transition-colors ${
                isActive ? "text-cyan-600" : "text-gray-400 hover:text-white"
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
