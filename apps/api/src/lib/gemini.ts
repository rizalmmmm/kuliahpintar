// Google Gemini client — lazy init dengan abstraction layer untuk swap provider
import { FinishReason, GoogleGenerativeAI, type GenerationConfig } from '@google/generative-ai'

let _genAI: GoogleGenerativeAI | null = null

function getGenAI() {
  if (_genAI) return _genAI
  const key = process.env['GEMINI_API_KEY']
  if (!key) throw new Error('GEMINI_API_KEY harus di-set di .env')
  _genAI = new GoogleGenerativeAI(key)
  return _genAI
}

// Default 2.5-flash — free tier gemini-2.0-flash sudah dihapus Google (quota 0)
const modelName = () => process.env['GEMINI_MODEL'] ?? 'gemini-2.5-flash'

export function getModel() {
  return getGenAI().getGenerativeModel({ model: modelName() })
}

export async function generateText(prompt: string): Promise<string> {
  const result = await getModel().generateContent(prompt)
  return result.response.text()
}

export async function generateTextWithSystem(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const model = getGenAI().getGenerativeModel({
    model: modelName(),
    systemInstruction: systemPrompt,
  })
  const result = await model.generateContent(userMessage)
  return result.response.text()
}

export async function generateJson(systemPrompt: string, userMessage: string): Promise<unknown> {
  const model = getGenAI().getGenerativeModel({
    model: modelName(),
    systemInstruction: systemPrompt,
    generationConfig: { responseMimeType: 'application/json' },
  })
  const result = await model.generateContent(userMessage)
  return JSON.parse(result.response.text())
}

export async function generateChat(
  systemPrompt: string,
  history: { role: 'user' | 'model'; content: string }[],
  userMessage: string
): Promise<string> {
  const model = getGenAI().getGenerativeModel({
    model: modelName(),
    systemInstruction: systemPrompt,
  })
  const chat = model.startChat({
    history: history.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
  })
  const result = await chat.sendMessage(userMessage)
  return result.response.text()
}

// Ekstrak teks dari file (PDF/gambar) — Gemini membaca file langsung via inlineData,
// tanpa perlu library parsing PDF atau OCR sendiri.
export async function extractTextFromFiles(
  systemPrompt: string,
  files: { mimeType: string; data: Buffer }[],
  maxOutputTokens: number
): Promise<{ teks: string; terpotong: boolean }> {
  const generationConfig: GenerationConfig & { thinkingConfig?: { thinkingBudget: number } } = {
    maxOutputTokens,
    temperature: 0,
    // Transkripsi tidak butuh reasoning — matikan thinking agar token output tidak habis di situ
    thinkingConfig: { thinkingBudget: 0 },
  }
  const model = getGenAI().getGenerativeModel({
    model: modelName(),
    systemInstruction: systemPrompt,
    generationConfig,
  })
  const result = await model.generateContent([
    ...files.map((f) => ({
      inlineData: { mimeType: f.mimeType, data: f.data.toString('base64') },
    })),
    { text: 'Ekstrak isi materi dari file di atas.' },
  ])
  const finish = result.response.candidates?.[0]?.finishReason
  return {
    teks: result.response.text(),
    terpotong: finish === FinishReason.MAX_TOKENS,
  }
}
