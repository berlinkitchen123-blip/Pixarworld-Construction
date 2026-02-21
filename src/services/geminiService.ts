import { GoogleGenAI, Type } from "@google/genai";
import { ProjectScope } from "../types.ts";

export const getAISuggestedItems = async (scope: ProjectScope) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest 5 common construction items/services for a "${scope}" project. Provide item name, type (Goods or Service), typical unit (Box, Sqft, Sqmt, etc.), a generic HSN code, a placeholder sale rate, and a standard GST rate (0, 5, 12, 18, or 28).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["Goods", "Service"] },
              unit: { type: Type.STRING },
              hsnCode: { type: Type.STRING },
              saleRate: { type: Type.NUMBER },
              gstRate: { type: Type.NUMBER }
            },
            required: ["name", "type", "unit", "hsnCode", "saleRate", "gstRate"]
          }
        }
      }
    });

    // Safely extract text output from response
    const jsonStr = response.text || "[]";
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};