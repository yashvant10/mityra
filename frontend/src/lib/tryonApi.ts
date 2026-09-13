// axios is no longer used — VTO requests use native fetch directly to AWS

// ───────────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────────


export interface TryOnResponse {
  success?: boolean;
  result_image?: string;
  image?: string;
  resultImage?: string;
  image_url?: string;
  url?: string;
  output_image?: string;
  result?: string;
  resultImageUrl?: string;
  output?: string | string[];
  images?: string[];
  data?: Record<string, unknown>;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export interface TryOnError {
  detail?: string;
  message?: string;
  error?: string;
}


// ───────────────────────────────────────────────────────────────────────────────
// Generate Try-On (Secure Proxy: /api/tryon/secure)
// ───────────────────────────────────────────────────────────────────────────────

const SECURE_PROXY_URL = "/api/tryon/secure";

export const generateTryOn = async (
  personImage: File | Blob,
  clothImage: File | Blob,
  token?: string
): Promise<TryOnResponse> => {
  const formData = new FormData();

  formData.append(
    "person_image",
    personImage instanceof File
      ? personImage
      : new File([personImage], "person.jpg", {
          type: personImage.type || "image/jpeg",
        })
  );

  formData.append(
    "cloth_image",
    clothImage instanceof File
      ? clothImage
      : new File([clothImage], "cloth.jpg", {
          type: clothImage.type || "image/jpeg",
        })
  );

  formData.append("cloth_type", "upper");

  // ★ VTO GARMENT DIAGNOSTICS — trace the exact cloth image in FormData
  const clothEntry = formData.get("cloth_image");
  if (clothEntry && typeof clothEntry !== 'string') {
    console.log("══════════════════════════════════════════════");
    console.log("[VTO-API] cloth_image in FormData:");
    console.log("[VTO-API]   type:", (clothEntry as File).type);
    console.log("[VTO-API]   size:", (clothEntry as File).size, "bytes");
    console.log("[VTO-API]   name:", (clothEntry as File).name || "(blob)");
    console.log("══════════════════════════════════════════════");
  }

  console.log("======================================");
  console.log("Calling Secure VTO Proxy:", SECURE_PROXY_URL);
  console.log("Has auth token:", !!token);
  console.log("======================================");

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 75000); // 75s timeout

    const response = await fetch(SECURE_PROXY_URL, {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        const errorText = await response.text().catch(() => "Server error");
        errorData = { message: errorText };
      }
      throw new Error(
        errorData.message || errorData.error || `Try-on failed (HTTP ${response.status})`
      );
    }

    const resultPayload: TryOnResponse = await response.json();
    console.log("Response keys:", Object.keys(resultPayload));

    if (resultPayload.success === false) {
      throw new Error(
        resultPayload.error ||
          resultPayload.message ||
          "Backend returned success=false"
      );
    }

    return resultPayload;
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error(
        "Virtual Try-On timed out. The GPU backend may be under heavy load — please try again."
      );
    }
    throw error;
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// URL → Blob
// ───────────────────────────────────────────────────────────────────────────────

export const urlToBlob = async (
  imageUrl: string
): Promise<Blob> => {
  console.log("[VTO-BLOB] urlToBlob called with:", imageUrl?.slice(0, 120));
  
  if (imageUrl.startsWith("data:")) {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    console.log("[VTO-BLOB] Converted data: URI to blob:", blob.size, "bytes", blob.type);
    return blob;
  }

  // Use the backend proxy to fetch external images to bypass strict CORS policies on Amazon/Myntra/Flipkart
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const proxyUrl = `${apiUrl}/tryon/proxy-image?url=${encodeURIComponent(imageUrl)}&_t=${Date.now()}`;

  console.log("[VTO-BLOB] Fetching via proxy:", proxyUrl.slice(0, 120));
  const response = await fetch(proxyUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch image via proxy: ${response.statusText}`
    );
  }

  const blob = await response.blob();
  console.log("[VTO-BLOB] Proxy returned blob:", blob.size, "bytes", blob.type);
  return blob;
};

// ───────────────────────────────────────────────────────────────────────────────
// Base64 → File
// ───────────────────────────────────────────────────────────────────────────────

export const base64ToFile = (
  base64: string,
  filename = "image.jpg",
  mimeType = "image/jpeg"
): File => {
  const base64Data = base64.includes(",")
    ? base64.split(",")[1]
    : base64;

  const byteString = atob(base64Data);

  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new File([ab], filename, {
    type: mimeType,
  });
};
