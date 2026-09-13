import { NextResponse } from "next/server";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// ─── Firebase Admin Singleton ────────────────────────────────────────────────
// Lazy-initialized once per serverless cold start. Credentials come from
// server-only env vars — never exposed to the browser.
// ─────────────────────────────────────────────────────────────────────────────

let adminApp: App | undefined;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Ensure FIREBASE_PROJECT_ID, " +
      "FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in .env.local"
    );
  }

  adminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  return adminApp;
}

// ─── Constants & Rate Limiting ───────────────────────────────────────────────

const CREDIT_COST = 1; // Credits deducted per successful try-on generation
const AWS_BACKEND_URL =
  process.env.NEXT_PUBLIC_VTO_BACKEND_URL || "http://44.220.126.206:8000";

// In-memory rate limiting per user (max 5 requests per 60 seconds)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitRecord>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function isRateLimited(uid: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(uid);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(uid, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return true;
  }

  record.count += 1;
  return false;
}

// ─── POST /api/tryon/secure ──────────────────────────────────────────────────
// Secure server-side proxy: Firebase Auth → Credit Check → AWS GPU → Deduct
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // ── 1. Extract Bearer token ────────────────────────────────────────────
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized", message: "No authentication token provided." },
      { status: 401 }
    );
  }

  // ── 2. Verify Firebase ID token ────────────────────────────────────────
  let uid: string;
  try {
    const app = getAdminApp();
    const decodedToken = await getAuth(app).verifyIdToken(token);
    uid = decodedToken.uid;
  } catch (authError: any) {
    console.error("Firebase token verification failed:", authError.message);
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid or expired authentication token." },
      { status: 401 }
    );
  }

  // ── 2b. Rate Limiting ──────────────────────────────────────────────────
  if (isRateLimited(uid)) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Rate limit exceeded. Maximum 5 try-on requests per minute. Please wait before trying again.",
      },
      { status: 429 }
    );
  }

  // ── 3. Check credit balance ────────────────────────────────────────────
  const db = getFirestore(getAdminApp());
  const walletRef = db.collection("wallets").doc(uid);

  try {
    const walletSnap = await walletRef.get();
    const balance = walletSnap.exists ? (walletSnap.data()?.balance ?? 0) : 0;

    if (balance < CREDIT_COST) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: `Insufficient credits. You need ${CREDIT_COST} credit(s) but have ${balance}.`,
          required: CREDIT_COST,
          current: balance,
        },
        { status: 402 }
      );
    }
  } catch (walletError: any) {
    console.error("Wallet check failed:", walletError.message);
    return NextResponse.json(
      { error: "Server Error", message: "Failed to verify credit balance." },
      { status: 500 }
    );
  }

  // ── 4. Parse incoming FormData ─────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
    if (!formData.has("cloth_type")) {
      formData.append("cloth_type", "upper");
    }
  } catch (parseError: any) {
    return NextResponse.json(
      { error: "Bad Request", message: "Invalid form data." },
      { status: 400 }
    );
  }

  // ── 5. Forward to AWS CatVTON GPU backend ──────────────────────────────
  try {
    // ★ GARMENT DIAGNOSTICS: Log what the proxy is about to send to AWS
    const clothFile = formData.get("cloth_image");
    const personFile = formData.get("person_image");
    const clothType = formData.get("cloth_type");
    console.log(`[SECURE-VTO-PROXY] ══════════════════════════════════════`);
    console.log(`[SECURE-VTO-PROXY] person_image: ${personFile instanceof File ? `${personFile.name} (${personFile.size} bytes, ${personFile.type})` : typeof personFile}`);
    console.log(`[SECURE-VTO-PROXY] cloth_image:  ${clothFile instanceof File ? `${clothFile.name} (${clothFile.size} bytes, ${clothFile.type})` : typeof clothFile}`);
    console.log(`[SECURE-VTO-PROXY] cloth_type:   ${clothType}`);
    console.log(`[SECURE-VTO-PROXY] ══════════════════════════════════════`);

    if (!clothFile || typeof clothFile === 'string' || (clothFile as any).size < 100) {
      console.error("[SECURE-VTO-PROXY] Rejected: missing or invalid cloth_image");
      return NextResponse.json(
        { error: "Bad Request", message: "A valid garment image is required for Virtual Try-On." },
        { status: 400 }
      );
    }

    if (!personFile || typeof personFile === 'string' || (personFile as any).size < 100) {
      console.error("[SECURE-VTO-PROXY] Rejected: missing or invalid person_image");
      return NextResponse.json(
        { error: "Bad Request", message: "A valid person image is required for Virtual Try-On." },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 75000); // 75 seconds timeout

    console.log(`[SECURE-VTO-PROXY] Forwarding user ${uid} request to: ${AWS_BACKEND_URL}/api/tryon`);
    const response = await fetch(`${AWS_BACKEND_URL}/api/tryon`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown GPU error");
      console.error(`GPU Backend returned ${response.status}: ${errorText}`);
      return NextResponse.json(
        { error: "Generation Failed", message: `GPU backend error (HTTP ${response.status}).` },
        { status: 502 }
      );
    }

    // ── 6. Read GPU response ───────────────────────────────────────────
    const contentType = response.headers.get("content-type") || "";
    let resultPayload: any;

    try {
      if (contentType.includes("application/json")) {
        resultPayload = await response.json();
        
        let rawImg = resultPayload.result_image || resultPayload.image || "";
        if (!rawImg) {
          throw new Error("Missing result_image in JSON response");
        }
        
        // Normalize raw base64 without data URI scheme
        if (typeof rawImg === "string" && !rawImg.startsWith("data:") && !rawImg.startsWith("http")) {
          const prefix = rawImg.startsWith("iVBORw0KGgo") ? "data:image/png;base64," : "data:image/jpeg;base64,";
          rawImg = `${prefix}${rawImg}`;
        }

        resultPayload = {
          ...resultPayload,
          success: true,
          result_image: rawImg,
        };
      } else {
        // Binary image response — convert to base64 data URL
        const blob = await response.blob();
        if (blob.size === 0) {
          throw new Error("Received empty binary result from AWS VTO backend");
        }
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = contentType || "image/jpeg";
        resultPayload = {
          success: true,
          result_image: `data:${mimeType};base64,${base64}`,
        };
      }
    } catch (parseError: any) {
      console.error("Failed to parse GPU response:", parseError.message);
      return NextResponse.json(
        { error: "Generation Failed", message: "Received invalid or malformed response from VTO backend." },
        { status: 502 }
      );
    }

    // ── 7. Deduct credits (only on success) ────────────────────────────
    try {
      await walletRef.update({
        balance: FieldValue.increment(-CREDIT_COST),
      });

      // Log the credit transaction
      const txId = `tx_tryon_${uid.slice(0, 8)}_${Date.now()}`;
      await db.collection("creditTransactions").doc(txId).set({
        transactionId: txId,
        userId: uid,
        type: "tryon_generation",
        credits: -CREDIT_COST,
        description: "AWS CatVTON virtual try-on generation",
        timestamp: new Date().toISOString(),
      });
      console.log(`[SECURE-VTO-PROXY] Successfully deducted ${CREDIT_COST} credit for user ${uid}`);
    } catch (deductError: any) {
      // Log but don't fail the request — the user already got their result
      console.error("Credit deduction failed (non-fatal):", deductError.message);
    }

    // ── 8. Return result to frontend ───────────────────────────────────
    return NextResponse.json(resultPayload);

  } catch (gpuError: any) {
    console.error("GPU Backend connection error:", gpuError.message);
    return NextResponse.json(
      { error: "Generation Failed", message: "Failed to communicate with GPU backend." },
      { status: 502 }
    );
  }
}
