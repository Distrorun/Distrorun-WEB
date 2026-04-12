import CliAuthPage from "@/components/cli-auth/page";
import { Suspense } from "react";

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[var(--bg-primary)]" />}>
            <CliAuthPage />
        </Suspense>
    );
}
