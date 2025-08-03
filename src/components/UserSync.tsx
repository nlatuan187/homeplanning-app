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
            body: JSON.stringify({
              id: user.id,
              email: user.primaryEmailAddress?.emailAddress,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            }),
          });
          
          if (response.ok) {
            console.log("User saved to database successfully");
          } else {
            console.error("Failed to save user to database");
          }
        } catch (error) {
          console.error("Error saving user to database:", error);
        }
      };

      saveUserToDatabase();
    }
  }, [user, isLoaded]);

  // Component này không render gì cả, chỉ đồng bộ user
  return null;
} 