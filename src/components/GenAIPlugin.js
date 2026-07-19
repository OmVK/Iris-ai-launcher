import { registerPlugin } from '@capacitor/core'

const IrisGenAI = registerPlugin('IrisGenAI')

export const GenAI = {
  async checkAvailability() {
    try {
      const result = await IrisGenAI.checkAvailability()
      return { available: result.available, deviceInfo: result.deviceInfo || '' }
    } catch (e) {
      console.warn('GenAI checkAvailability failed:', e)
      return { available: false, deviceInfo: '', error: e.message }
    }
  },

  async initializeModel(model = 'gemini-nano') {
    try {
      const result = await IrisGenAI.initializeModel({ model })
      return { initialized: result.initialized, model: result.model }
    } catch (e) {
      console.warn('GenAI initializeModel failed:', e)
      return { initialized: false, error: e.message }
    }
  },

  async generateText(prompt, options = {}) {
    try {
      const result = await IrisGenAI.generateText({
        prompt,
        systemInstruction: options.systemInstruction || '',
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 2048
      })
      return { text: result.text, model: result.model, provider: result.provider }
    } catch (e) {
      console.warn('GenAI generateText failed:', e)
      throw e
    }
  },

  async isReady() {
    try {
      const result = await IrisGenAI.isReady()
      return result.ready
    } catch {
      return false
    }
  }
}
