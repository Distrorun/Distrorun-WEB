import PullPage from "@/components/registry/pull-page";
import { Suspense } from "react";

export default async function Page({ params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PullPage packageName={name} />
        </Suspense>
    );
}
