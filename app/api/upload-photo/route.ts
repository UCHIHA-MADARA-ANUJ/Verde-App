import { NextRequest, NextResponse } from 'next/server';
import { ref as dbRef, set } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { put } from '@vercel/blob'; // Dynamic integration with Vercel's free Blob Storage!

// Secure Header validation keys (matches ESP32-CAM)
const SECURE_API_KEY = "119a08a6c901ef59e49fcbe77e4bf1c105467a9c69f17a0f";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate Request header
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== SECURE_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized. Secure API Key mismatch.' }, { status: 401 });
    }

    // 2. Read raw binary body as ArrayBuffer
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Empty payload buffer received.' }, { status: 400 });
    }

    console.log(`[UPLOAD API] Received JPEG image stream. Size: ${buffer.length} bytes`);

    let finalImageUrl = "";

    // 3. STORAGE RESOLUTION FOR BILLING RESTRICTIONS:
    // Since Firebase requires a paid plan (upgrade) to initialize Storage in some regions,
    // we use a dual-engine upload fallback designed to be 100% FREE!
    
    const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

    if (BLOB_READ_WRITE_TOKEN) {
      // ENGINE A: Vercel Blob Storage (100% FREE, 250MB included, no card required!)
      // Highly recommended for Vercel deployment!
      try {
        console.log("[UPLOAD API] Uploading to Vercel Blob Storage...");
        const blob = await put('current_capture.jpg', buffer, {
          access: 'public',
          addRandomSuffix: true, // Prevents browser caching lag!
          token: BLOB_READ_WRITE_TOKEN
        });
        finalImageUrl = blob.url;
        console.log(`[UPLOAD API] Vercel Blob upload successful! Public URL: ${finalImageUrl}`);
      } catch (blobErr: any) {
        console.error("[UPLOAD API] Vercel Blob upload failed, falling back to Base64:", blobErr);
      }
    }

    if (!finalImageUrl) {
      // ENGINE B: High-Compression Base64 Data URL (100% Free, Zero Configuration!)
      // Converts raw binary JPEG to standard base64 data URI and saves directly to Realtime Database.
      // Works flawlessly on localhost, GitHub Codespaces, and raw serverless without any external accounts!
      console.log("[UPLOAD API] Converting binary JPEG to standard Base64 Data URI...");
      const base64String = buffer.toString('base64');
      finalImageUrl = `data:image/jpeg;base64,${base64String}`;
      console.log(`[UPLOAD API] Base64 conversion complete. Payload length: ${finalImageUrl.length} characters.`);
    }

    // 4. Update the latest_scan node in RTDB with the image URL / Base64 Data!
    const latestScanRef = dbRef(db, 'latest_scan');
    await set(latestScanRef, {
      imageUrl: finalImageUrl,
      status: "scanned",
      captured_at: Date.now()
    });
    console.log(`[UPLOAD API] Realtime Database updated under /latest_scan node.`);

    // 5. Instantly clear the "capture_photo" trigger flag to release the UI spinner on dashboard!
    const captureFlagRef = dbRef(db, 'controls/capture_photo');
    await set(captureFlagRef, false);
    console.log(`[UPLOAD API] Realtime Database flag reset. /controls/capture_photo = false`);

    return NextResponse.json({ 
      success: true, 
      url: finalImageUrl.startsWith("data:") ? "Base64 payload saved in RTDB" : finalImageUrl,
      bytes: buffer.length 
    });

  } catch (error: any) {
    console.error('[UPLOAD API] Critical Server Failure:', error);
    
    // Attempt flag release on database even if write fails to prevent GUI lockouts
    try {
      const captureFlagRef = dbRef(db, 'controls/capture_photo');
      await set(captureFlagRef, false);
    } catch (e) {
      console.error('Failed to reset flag during error cleanup:', e);
    }

    return NextResponse.json({ 
      error: 'Failed to process camera upload.',
      details: error.message 
    }, { status: 500 });
  }
}
