'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from "react";

// Add this type declaration
declare global {
    interface Window {
      gtag: (
        command: 'config' | 'js' | 'event',
        ...args: any[]
      ) => void;
    }
}

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

export function Analytics() {
    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
        if (!GA_TRACKING_ID || typeof window.gtag !== 'function') {
            return;
        }

        const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
        window.gtag('config', GA_TRACKING_ID, {
            page_path: url,
        });

    }, [pathname, searchParams]);

    if (!GA_TRACKING_ID) {
        return null;
    }

    return (
        <>
            <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
            />
            <Script
                id="google-analytics"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${GA_TRACKING_ID}');
                    `,
                }}
            />
        </>
    )
}