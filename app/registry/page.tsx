import RegistryPage from "@/components/registry/page";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegistryPage />
    </Suspense>
  );
}
