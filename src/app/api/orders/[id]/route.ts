import { NextRequest, NextResponse } from "next/server";
import { getInMemoryOrder } from "@/lib/inMemoryOrders";

type RouteProps = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(
  _req: NextRequest,
  props: RouteProps
) {
  try {
    const rawParams = await props.params;
    const id = rawParams?.id ? decodeURIComponent(rawParams.id) : "";

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required." },
        { status: 400 }
      );
    }

    const order = getInMemoryOrder(id);

    if (!order) {
      return NextResponse.json(
        { error: `Order #${id} not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch order.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
