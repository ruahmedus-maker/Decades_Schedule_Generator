import { GoogleGenAI, Type } from "@google/genai";
import type { Schedule, Bartender, Shift, FixedAssignment, TargetShifts, TimeOffRequest } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const scheduleSchema = {
  type: Type.ARRAY,
  description: "A complete 4-week schedule. Each element is an assigned shift for a specific floor and bar.",
  items: {
    type: Type.OBJECT,
    properties: {
      week: { type: Type.INTEGER, description: "The week number, from 1 to 4." },
      day: { type: Type.STRING, description: "The day of the shift, e.g., 'Thu', 'Fri', 'Sat', 'Sun', 'Sun_Night'." },
      floor: { type: Type.STRING, description: "The floor of the shift, e.g., 'Rooftop'." },
      bar: { type: Type.STRING, description: "The bar of the shift, e.g., 'Main Bar'." },
      bartenders: {
        type: Type.ARRAY,
        description: "An array of bartender names assigned to this shift. The array length must match 'bartendersNeeded' for that shift.",
        items: { type: Type.STRING }
      }
    },
    required: ["week", "day", "floor", "bar", "bartenders"],
  },
};


export async function generateSchedule(
    bartenders: Bartender[], 
    shifts: Shift[],
    fixedAssignments: FixedAssignment[],
    userConstraints: string,
    targetShifts: TargetShifts,
    timeOffRequests: TimeOffRequest[]
): Promise<Schedule> {
  const prompt = `
    You are an expert nightclub manager. Your task is to create a complete 4-week schedule for bartenders based on the provided data and rules.

    **1. Bartender Roster:**
    Here is the list of available bartenders with their experience tier, gender, and personal weekly unavailable days.
    - A lower tier number (e.g., 1) means more experienced.
    - 'unavailableDays' are recurring days a bartender can NEVER work in any week.
    \`\`\`json
    ${JSON.stringify(bartenders, null, 2)}
    \`\`\`

    **2. Required Shifts:**
    This is the template of all shifts that need to be filled *every week* for all 4 weeks of the month.
    \`\`\`json
    ${JSON.stringify(shifts, null, 2)}
    \`\`\`

    **3. Fixed Assignments:**
    These are mandatory, pre-assigned shifts that MUST be included in the final schedule.
    \`\`\`json
    ${JSON.stringify(fixedAssignments, null, 2)}
    \`\`\`

    **4. Bartender Shift Targets:**
    This object specifies the desired total number of shifts for each bartender for the entire 4-week period. Aim to meet these targets as closely as possible.
    \`\`\`json
    ${JSON.stringify(targetShifts, null, 2)}
    \`\`\`

    **5. Specific Time Off Requests:**
    These are non-recurring time off periods, like vacations. You MUST NOT schedule these bartenders between the start and end dates (inclusive). This is in ADDITION to their weekly 'unavailableDays'.
    \`\`\`json
    ${JSON.stringify(timeOffRequests, null, 2)}
    \`\`\`

    **6. Additional Manager Rules:**
    ${userConstraints}

    **7. Core Scheduling Instructions (Follow Strictly):**
    1.  **Generate a full 4-week schedule.** The final output must contain an entry for every single shift defined in the template for all 4 weeks.
    2.  **Fill All Shifts:** Every shift must be filled with the exact number of bartenders specified in its 'bartendersNeeded' property.
    3.  **Prioritize Shift Targets:** Your primary goal for fairness is to ensure each bartender's total shift count for the month is as close as possible to their specified target in "Bartender Shift Targets".
    4.  **Respect All Unavailability:** Do NOT schedule a bartender on one of their recurring 'unavailableDays'. Furthermore, you MUST NOT schedule them during a 'Time Off Request' period.
    5.  **Respect Fixed Assignments:** All fixed assignments MUST be included. A bartender with a fixed assignment can still be assigned to other shifts.
    6.  **No Double Booking:** A bartender CANNOT be assigned to more than one shift on the same day.
    7.  **Gender Balance:** For shifts where 'gender' is 'MF', the assigned 'bartenders' array must include at least one 'Male' and one 'Female' bartender.
    8.  **Output Format:** Your final output must be a single JSON array of schedule entry objects, with no extra commentary or text.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: scheduleSchema,
      },
    });

    const jsonText = response.text.trim();
    const scheduleData = JSON.parse(jsonText);

    if (!Array.isArray(scheduleData)) {
      throw new Error("AI response is not in the expected array format.");
    }
    
    // Basic validation, can be expanded
    const isValid = scheduleData.every(item => 
        typeof item.week === 'number' &&
        typeof item.day === 'string' &&
        typeof item.floor === 'string' &&
        typeof item.bar === 'string' &&
        Array.isArray(item.bartenders)
    );

    if (!isValid) {
        throw new Error("AI response contains malformed schedule entries.");
    }

    return scheduleData as Schedule;

  } catch (error) {
    console.error("Error generating schedule with Gemini:", error);
    if(error instanceof Error && error.message.includes('JSON')) {
        throw new Error("The AI returned an invalid JSON format. Please try rephrasing your constraints.");
    }
    throw new Error("Failed to generate schedule from AI. The AI's response may have been blocked or invalid. Check constraints and try again.");
  }
}