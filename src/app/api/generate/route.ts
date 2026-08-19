import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || "");

/**
 * Interface for model objects returned by the Gemini API.
 */
interface GeminiModel {
  name: string;
  version: string;
  displayName: string;
  description: string;
  supportedGenerationMethods: string[];
}

/**
 * Cache for discovered models to avoid redundant API calls.
 */
interface ModelCache {
  models: string[];
  lastFetched: number;
}

let modelCache: ModelCache = {
  models: [],
  lastFetched: 0,
};

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Discovers and prioritizes available Gemini models.
 * Optimized for Vercel Hobby plan (10s timeout).
 */
async function getAvailableModels(): Promise<string[]> {
  // Prioritized list of known fast and capable models.
  // Prioritizing Gemini 3.5 Flash and Gemini 3 Flash for maximum intelligence and speed.
  const priorityModels = [
    "gemini-3.5-flash",
    "gemini-3-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-1.5-flash-lite"
  ];

  const now = Date.now();
  // If we have cached models, return them (prioritizing our hardcoded list)
  if (modelCache.models.length > 0 && now - modelCache.lastFetched < CACHE_TTL) {
    return Array.from(new Set([...priorityModels, ...modelCache.models]));
  }

  // On Hobby plan, we try to avoid the extra discovery API call if possible
  // but we can kick it off in the background or do it once.
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`,
      {
        signal: AbortSignal.timeout(2000), // Strict 2s timeout for discovery
        next: { revalidate: 3600 } // Cache discovery response for 1 hour
      }
    );
    const data = await response.json();

    if (!data.models) {
      return priorityModels;
    }

    const allModels: GeminiModel[] = data.models;
    const supportedModels = allModels.filter((m) =>
      m.supportedGenerationMethods?.includes("generateContent")
    );

    const categorize = (model: GeminiModel) => {
      const name = model.name.toLowerCase();
      if (!name.includes("flash")) return 10;

      const isLite = name.includes("lite");
      const base = isLite ? 5 : 0;

      if (name.includes("3.5")) return base + 0;
      if (name.includes("3.1")) return base + 1;
      if (name.includes("3")) return base + 2;
      if (name.includes("2.0")) return base + 3;
      if (name.includes("1.5")) return base + 4;

      return base + 5;
    };

    const sortedModels = supportedModels.sort((a, b) => {
      const catA = categorize(a);
      const catB = categorize(b);
      if (catA !== catB) return catA - catB;
      return b.name.localeCompare(a.name);
    });

    const modelNames = sortedModels.map((m) => m.name.replace("models/", ""));
    const finalModels = Array.from(new Set([...priorityModels, ...modelNames]));

    modelCache = {
      models: finalModels,
      lastFetched: now,
    };

    return finalModels;
  } catch (error) {
    console.error("Error discovering models:", error);
    return priorityModels;
  }
}

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const registration = formData.get("registration") as File;
    const timetable = formData.get("timetable") as File;

    if (!registration || !timetable) {
      return NextResponse.json(
        { error: "Missing required files: registration and timetable" },
        { status: 400 }
      );
    }

    const regBuffer = Buffer.from(await registration.arrayBuffer());
    const tableBuffer = Buffer.from(await timetable.arrayBuffer());

    console.log(`Registration size: ${regBuffer.length} bytes, Timetable size: ${tableBuffer.length} bytes`);

    // Basic size validation for Gemini inlineData (approx 4MB limit for many models/plans)
    if (regBuffer.length + tableBuffer.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: "The combined size of your files is too large. Please try with smaller PDFs.",
          code: "PAYLOAD_TOO_LARGE"
        },
        { status: 413 }
      );
    }

    // Optimized for Hobby Plan: Try top 5 models and set strict timeouts
    // We try more models now to handle quota failures
    const allModels = await getAvailableModels();
    const modelsToTry = allModels.slice(0, 5);

    const systemInstruction = `
      You are an expert data analyst. Your task is to cross-reference two provided documents:
      1. A Registration PDF (student's enrolled courses).
      2. A University Timetable PDF (general schedule).

      Instructions:
      - Extract specific schedule entries (day, time, venue) for ONLY the courses listed in the registration document.
      - If a course has multiple sessions/parts, include all of them.
      - Return the result as a strict JSON array of objects.
      - Fields: courseCode (string), courseName (string, the full name/title of the course extracted from the documents), day (string, e.g., "Monday"), time (string, e.g., "08:00 - 10:00"), venue (string).
      - Use English and return ONLY the JSON. No preamble or markdown.
    `;

    const userPrompt = "Please cross-reference the student's registration document with the university timetable and return the complete schedule in the specified JSON format.";

    let lastError: Error | null = null;
    let responseText = "";
    let successfulModel = "";

    for (const modelName of modelsToTry) {
      const startTime = Date.now();
      try {
        console.log(`Attempting with model: ${modelName}`);
        const model = genAI.getGenerativeModel(
          {
            model: modelName,
            systemInstruction: systemInstruction
          },
          { timeout: 8000 }
        );

        const result = await model.generateContent([
          {
            text: userPrompt
          },
          {
            inlineData: {
              data: regBuffer.toString("base64"),
              mimeType: "application/pdf",
            },
          },
          {
            inlineData: {
              data: tableBuffer.toString("base64"),
              mimeType: "application/pdf",
            },
          },
        ]);

        const response = await result.response;

        // Check for safety filter blocks
        const candidates = response.candidates || [];
        if (candidates.length > 0 && candidates[0].finishReason === "SAFETY") {
          throw new Error("Content was blocked by safety filters.");
        }

        responseText = response.text().trim();
        const duration = Date.now() - startTime;
        console.log(`Successfully generated content with ${modelName} in ${duration}ms`);

        if (responseText) {
          successfulModel = modelName;
          break;
        } else {
          console.warn(`Model ${modelName} returned an empty response.`);
        }
      } catch (err) {
        const error = err as Error;
        lastError = error;
        const duration = Date.now() - startTime;
        console.warn(`Failed with ${modelName} after ${duration}ms:`, error.message);

        // Specific handling for non-retryable errors
        if (error.message?.includes("429") || error.message?.includes("Quota")) {
          // If rate limited, we can try the next model (which might have different quota)
          continue;
        }

        // If it's a timeout or we're running out of time on Hobby plan, don't try next model
        if (error.message?.includes("DEADLINE_EXCEEDED") || error.message?.includes("timeout")) {
          break;
        }

        // For other errors, continue to try the next model
        continue;
      }
    }

    if (!responseText) {
      const errorMsg = lastError?.message || "";
      const isTimeout = errorMsg.includes("DEADLINE_EXCEEDED") || errorMsg.includes("timeout");
      const isLocationError = errorMsg.includes("location is not supported");

      return NextResponse.json(
        {
          error: isLocationError
            ? "Gemini AI is not available in your current location."
            : (isTimeout ? "The request timed out. Please try again." : "Failed to generate schedule. Please try again later."),
          code: isLocationError ? "LOCATION_NOT_SUPPORTED" : (isTimeout ? "TIMEOUT" : "MODEL_FAILURE"),
          details: errorMsg
        },
        { status: isLocationError ? 403 : (isTimeout ? 504 : 500) }
      );
    }

    const cleanedJson = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "");

    try {
      const schedule = JSON.parse(cleanedJson);
      return NextResponse.json({
        schedule,
        debug: { model: successfulModel }
      });
    } catch {
      console.error("Failed to parse JSON from Gemini:", responseText);
      return NextResponse.json(
        { error: "The AI returned an unreadable format. Please try again.", code: "PARSE_ERROR" },
        { status: 500 }
      );
    }
  } catch (error) {
    const err = error as Error;
    console.error("API Error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
