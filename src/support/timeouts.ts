// AI/LLM operations can legitimately take a long time depending on provider load.
// Keep ordinary navigation/action timeouts finite, but never fail an E2E scenario
// solely because an AI result took too long to arrive.
export const AI_RESULT_TIMEOUT = 0;
