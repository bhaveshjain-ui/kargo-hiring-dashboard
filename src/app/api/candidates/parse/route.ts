import { NextRequest, NextResponse } from "next/server";
import { extractCvText } from "@/lib/parseCv";
import { detectPersonalDetails } from "@/lib/personalDetails";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let cvText: string;
  try {
    cvText = await extractCvText(buffer, file.name, file.type);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not read that file." },
      { status: 400 }
    );
  }

  if (!cvText || cvText.length < 20) {
    return NextResponse.json(
      { error: "Could not extract readable text from that file." },
      { status: 400 }
    );
  }

  const detected = detectPersonalDetails(cvText);

  return NextResponse.json({
    cvText,
    fileName: file.name,
    fileType: file.type || "text/plain",
    detected,
  });
}
