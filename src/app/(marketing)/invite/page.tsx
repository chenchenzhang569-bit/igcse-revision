import { Suspense } from "react";
import InviteContent from "./InviteContent";

export const revalidate = 86400;

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">Loading...</div>}>
      <InviteContent />
    </Suspense>
  );
}
