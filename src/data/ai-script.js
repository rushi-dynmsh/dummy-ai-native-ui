// Example AI analyses and chat answers, written in the AI service's answer structure
// (use-the-chat-api.md: answer_type, answer, claims, confidence, machine_id, data_gaps,
// safety_flags, follow_up_questions). The numbers match the generated story (seed 447).
// These are examples, not output of the real AI.

const RIG_ID = "1";
const tool = (ref) => ({ kind: "tool", ref, detail: "" });
const doc = (detail) => ({ kind: "document", ref: "hpu-service-guide", detail });

const report = (fields) => ({
  answer_type: "answer",
  confidence: "medium",
  machine_id: RIG_ID,
  data_gaps: [],
  safety_flags: [],
  follow_up_questions: [],
  ...fields,
});

export const ANALYSES = [
  {
    trigger: "early warning opened on the cooler",
    title: "Early warning on the cooler",
    startS: 665,
    durationS: 40,
    component: "cooler",
    steps: [
      "Reading the cooler's last 10 cycles",
      "Comparing cooling with its normal range",
      "Checking the pump for the same pattern",
    ],
    report: report({
      answer:
        "The cooler on Hydraulic Rig 01 is starting to lose its grip: the oil leaves it 3 °C warmer than normal, and cooling pressure is falling. The pump looks normal.",
      claims: [
        { statement: "Cooler outlet temperature is 34.1 °C against about 31 °C normally", sources: [tool("get_channel_trend")] },
        { statement: "Cooling pressure A fell from 10.0 to 9.7 bar in 2 minutes", sources: [tool("get_cycle_statistics")] },
        { statement: "Motor power and supply pressure are unchanged", sources: [tool("compare_windows")] },
      ],
      data_gaps: ["Cooling water temperature is not measured on this machine."],
      follow_up_questions: ["Is the pump affected?", "How fast is it getting worse?"],
    }),
  },
  {
    trigger: "first PLC alarms on the cooler",
    title: "Cooler alarms",
    startS: 740,
    durationS: 45,
    component: "cooler",
    steps: [
      "Reading the active alarms",
      "Checking cooling pressures and flow",
      "Searching the service guide",
    ],
    report: report({
      answer:
        "The cooler on Hydraulic Rig 01 isn't removing enough heat. Cooling pressure is below its limit and the oil leaves the cooler 4 °C hotter than normal. Check the cooling water supply and the cooler filter first.",
      claims: [
        { statement: "Cooling pressure A is 9.5 bar, below its 9.6 bar limit", sources: [tool("get_alarm_states")] },
        { statement: "Cooler outlet temperature is 35.2 °C, above its 35 °C limit", sources: [tool("get_alarm_states")] },
        { statement: "A blocked filter or a closed cooling valve gives this pattern", sources: [doc("Section 6.2, cooler faults")] },
      ],
      follow_up_questions: ["What should I check first?", "Is it safe to keep running?", "How fast is it getting worse?"],
    }),
  },
  {
    trigger: "oil temperatures above their very-high limits",
    title: "Oil temperature very high",
    startS: 970,
    durationS: 35,
    component: "cooler",
    steps: [
      "Reading the escalated alarms",
      "Checking oil temperatures against their limits",
      "Checking vibration on the pump",
    ],
    report: report({
      answer:
        "Oil temperatures on Hydraulic Rig 01 are above their very-high limits and the pump has started to vibrate more. Stop the rig at the next safe point and let the oil cool before working on the cooler.",
      confidence: "high",
      claims: [
        { statement: "Oil temperature A is 50.9 °C, above its 50 °C limit", sources: [tool("get_alarm_states")] },
        { statement: "Cooler inlet temperature is 54.0 °C, above its 53 °C limit", sources: [tool("get_alarm_states")] },
        { statement: "Vibration reached 0.70 mm/s, its high limit", sources: [tool("get_channel_trend")] },
      ],
      safety_flags: ["Oil is above 50 °C: do not open the cooler or touch its pipes until it has cooled."],
      follow_up_questions: ["What happens if we keep running?", "What should I check first?"],
    }),
  },
];

const chat = (steps, fields) => ({ steps, report: report(fields) });

export const CHAT = {
  "Is the pump affected?": chat(["Reading pump power and pressure", "Comparing with the normal cycles"], {
    answer: "No. Motor power stays around 2,500 W and supply pressure around 160 bar, the same as in the healthy cycles. The change is in the cooling circuit only.",
    claims: [{ statement: "Motor power and supply pressure match the healthy cycles", sources: [tool("compare_windows")] }],
    follow_up_questions: ["How fast is it getting worse?"],
  }),
  "How fast is it getting worse?": chat(["Reading the cooler outlet trend", "Estimating the time to the limits"], {
    answer: "Quickly. The cooler outlet temperature is rising about 1 °C per minute. At this rate it will pass its very-high limit of 45 °C within about 10 minutes.",
    claims: [{ statement: "Cooler outlet temperature rises about 1 °C per minute", sources: [tool("get_channel_trend")] }],
    data_gaps: ["The estimate assumes the trend stays the same."],
    follow_up_questions: ["What should I check first?", "Is it safe to keep running?"],
  }),
  "What should I check first?": chat(["Searching the service guide", "Matching the steps to the readings"], {
    answer: "Check the cooling water supply valve is fully open, then clean the cooler's water-side filter. Both match falling cooling pressure with a healthy pump.",
    claims: [
      { statement: "A closed supply valve or a blocked filter lowers cooling pressure", sources: [doc("Section 6.2, cooler faults")] },
      { statement: "The pump is healthy", sources: [tool("compare_windows")] },
    ],
    follow_up_questions: ["Is it safe to keep running?"],
  }),
  "Is it safe to keep running?": chat(["Reading oil temperatures", "Checking the alarm limits"], {
    answer: "For a short time. Oil temperature A is still below its 50 °C very-high limit, but it is rising. Plan to stop the rig within the next 15 minutes if cooling does not recover.",
    claims: [{ statement: "Oil temperature A is below 50 °C and rising", sources: [tool("get_alarm_states")] }],
    safety_flags: ["Do not touch the cooler pipes: they are above 40 °C."],
    follow_up_questions: ["What should I check first?"],
  }),
  "What happens if we keep running?": chat(["Reading oil temperatures and vibration", "Searching the service guide"], {
    answer: "The oil will keep heating up. Above about 60 °C the oil thins, the pump wears faster and seals can fail. Stopping now avoids damage that would take the rig out for days.",
    claims: [
      { statement: "Oil temperatures are above their very-high limits", sources: [tool("get_alarm_states")] },
      { statement: "Hot, thin oil increases pump wear and seal failure", sources: [doc("Section 4.1, oil temperature")] },
    ],
    confidence: "high",
    safety_flags: ["Oil is above 50 °C: do not open the cooler or touch its pipes until it has cooled."],
  }),
};

export const FALLBACK = {
  steps: [],
  report: report({
    answer_type: "refusal",
    answer: "In this prototype I can answer the suggested questions.",
    claims: [],
    confidence: null,
    machine_id: null,
  }),
};
