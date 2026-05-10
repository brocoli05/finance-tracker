export interface MockPrediction {
  predictedMonthTotal: number
  goalAtRisk: boolean
  confidenceLevel: 'high' | 'medium' | 'low'
  suggestion: string
  estimatedSavings: number
}

export const DEFAULT_PREDICTION: MockPrediction = {
  predictedMonthTotal: 1500,
  goalAtRisk: false,
  confidenceLevel: 'high',
  suggestion: 'Reduce dining out expenses',
  estimatedSavings: 200,
}

export function createMockAnthropicResponse(prediction: MockPrediction = DEFAULT_PREDICTION) {
  return {
    id: 'msg_mock_123',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: JSON.stringify(prediction) }],
    model: 'claude-haiku-4-5',
    stop_reason: 'end_turn',
    usage: { input_tokens: 100, output_tokens: 50 },
  }
}
