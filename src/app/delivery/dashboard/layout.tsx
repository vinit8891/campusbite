import { ReactNode } from "react";

import DeliverySidebar from "./components/DeliverySidebar";

export default function DeliveryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex">

      <DeliverySidebar />

      <main className="ml-72 min-h-screen flex-1 bg-orange-50 p-8">

        {children}

      </main>

    </div>
  );
}