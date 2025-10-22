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
      day: { type: Type.STRING, description: "The day of the shift, e.g., 'Mon', 'Thu', 'Sun_Night'." },
      floor: { type: Type.STRING, description: "The floor of the shift, e.g., 'Rooftop'." },
      bar: { type: Type.STRING, description: "The bar of the shift, e.g., 'Main Bar'." },
      bartenders: {
        type: Type.ARRAY,
        description: "An array of bartender names assigned to this shift. The array length must match 'bartendersNeeded' for that shift, unless it's a special event fixed shift.",
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
    You are an expert nightclub manager. Your task is to create a complete 4-week schedule for bartenders by following a strict set of priorities.

    **Input Data:**

    1.  **Bartender Roster:**
        -   Experience tiers (lower is better), gender, and RECURRING weekly unavailable days.
        \`\`\`json
        ${JSON.stringify(bartenders, null, 2)}
        \`\`\`

    2.  **Required Regular Shifts (Thu-Sun):**
        -   This is the template of all shifts that need to be filled *every week* on the regular operating days (Thursday to Sunday Night).
        \`\`\`json
        ${JSON.stringify(shifts, null, 2)}
        \`\`\`

    3.  **Fixed Assignments (Highest Priority):**
        -   Mandatory, pre-assigned shifts. Some may be on special event days (Mon, Tue, Wed) which are NOT in the 'Required Regular Shifts' template. These are one-off events.
        \`\`\`json
        ${JSON.stringify(fixedAssignments, null, 2)}
        \`\`\`

    4.  **Bartender Shift Targets:**
        -   The desired total number of shifts for each bartender for the entire 4-week period. This is your main goal for fairness.
        \`\`\`json
        ${JSON.stringify(targetShifts, null, 2)}
        \`\`\`

    5.  **Specific Time Off Requests:**
        -   Non-recurring vacation periods. These bartenders MUST NOT be scheduled during these date ranges.
        \`\`\`json
        ${JSON.stringify(timeOffRequests, null, 2)}
        \`\`\`

    6.  **Additional Manager Rules:**
        -   ${userConstraints}

    **Core Scheduling Instructions (Follow This Logic Precisely):**

    1.  **Phase 1: Place ALL Fixed Assignments.**
        -   Your first and most important step is to add EVERY shift from the "Fixed Assignments" list to the schedule. These are non-negotiable and must appear in the final output exactly as specified.
        -   If a fixed assignment is on a special event day (Mon-Wed), add only that single shift for the day.

    2.  **Phase 2: Fill Remaining Shifts to Meet Targets.**
        -   After all fixed shifts are placed, fill ALL remaining "Required Regular Shifts" from the template for all 4 weeks.
        -   Your **PRIMARY GOAL** is to meet the "Bartender Shift Targets". Distribute the shifts so that each bartender's final monthly count is as close as possible to their target number.
        -   To ensure variety and fairness in assignments, **randomize your selection** of bartenders for each slot from the pool of those who are available and still need shifts to meet their target.

    3.  **Absolute Rules (Non-Negotiable Constraints):**
        -   You must adhere to these rules at all times:
        -   **Availability:** A bartender can NEVER be scheduled on one of their recurring 'unavailableDays' OR during a 'Time Off Request' period. This is the most critical constraint.
        -   **No Double Booking:** A bartender CANNOT be assigned to more than one shift on the same day.
        -   **Gender Balance:** For shifts where 'gender' is 'MF', you must assign at least one 'Male' and one 'Female' bartender.
        -   **Full Staffing:** Every shift from the template must be filled with the exact number of bartenders specified in 'bartendersNeeded'.

    **Final Output Requirement:**
    -   Your final output must be a single JSON array of schedule entry objects, with no extra commentary or text. It should contain all the fixed shifts and all the filled regular shifts.
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