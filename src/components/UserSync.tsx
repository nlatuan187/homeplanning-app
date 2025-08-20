"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export function UserSync() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user && user.primaryEmailAddress?.emailAddress) {
      // Lưu user vào database
      const saveUserToDatabase = async () => {
        try {
          const response = await fetch("/api/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          
          if (response.ok) {
            console.log("User synchronized with database successfully");
          } else {
            console.error("Failed to sync user with database");
          }
        } catch (error) {
          console.error("Error syncing user with database:", error);
        }
      };

      saveUserToDatabase();
    }
  }, [user, isLoaded]);

  // Component này không render gì cả, chỉ đồng bộ user
  return null;
} 