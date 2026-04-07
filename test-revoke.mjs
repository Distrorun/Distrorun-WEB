import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
});
// Let's test the signature
console.log(typeof authClient.revokeOtherSessions);
