// Google Gemini client — lazy init dengan abstraction layer untuk swap provider
import { GoogleGenerativeAI } from '@google/generative-ai'

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
