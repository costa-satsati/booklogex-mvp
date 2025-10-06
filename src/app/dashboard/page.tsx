// app/dashboard/page.tsx
"use client";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-gray-600">
        This is your financial overview. Connect an organisation to begin.
      </p>
      <Button onClick={() => alert("TODO: open Add Organisation modal")}>
        Add Organisation
      </Button>
    </div>
  );
}
