import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const PLANS: Record<string, { price: number; credits: number; name: string }> = {
  starter: { price: 49, credits: 5, name: "Starter" },
  basic: { price: 89, credits: 10, name: "Basic" },
  popular: { price: 199, credits: 25, name: "Popular" },
  pro: { price: 349, credits: 50, name: "Pro" },
  ultimate: { price: 599, credits: 100, name: "Ultimate" },
};

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Mock User ID
    const userId = "mock-user-id-123";
    const body = await req.json();
    const { planId } = body;

    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Initialize Razorpay
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Missing Razorpay Keys on Server");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const internalOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Razorpay amount is in paise (multiply by 100)
    const options = {
      amount: plan.price * 100,
      currency: "INR",
      receipt: internalOrderId,
    };

    const rzpOrder = await razorpay.orders.create(options);

    console.log("Mock Payment Transaction Saved for:", rzpOrder.id);

    return NextResponse.json({
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("Create Order Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
