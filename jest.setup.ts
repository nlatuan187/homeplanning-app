import '@testing-library/jest-dom'
import 'whatwg-fetch' // Polyfill fetch API

// Polyfill for Next.js Request/Response
if (typeof global.Request === 'undefined') {
    global.Request = class Request {
        constructor(input: any, init: any) {
            return { ...init, url: input } as any
        }
    } as any
}
if (typeof global.Response === 'undefined') {
    global.Response = class Response {
        constructor(body: any, init: any) {
            return { ...init, body, json: async () => JSON.parse(body) } as any
        }
        static json(data: any, init: any) {
            return { ...init, body: JSON.stringify(data), json: async () => data } as any
        }
    } as any
}

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};
