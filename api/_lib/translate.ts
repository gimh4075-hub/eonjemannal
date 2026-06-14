// 공지/안내 문구를 4개 언어로 번역 — Claude API (native fetch, 의존성 없음)

export type Translations = { ko: string; en: string; ja: string; zh: string }

const LANG_NAMES = {
  ko: 'Korean',
  en: 'English',
  ja: 'Japanese',
  zh: 'Simplified Chinese',
}

/**
 * 원문을 한국어·영어·일본어·중국어로 번역.
 * ANTHROPIC_API_KEY 가 없거나 실패하면 원문을 모든 언어에 그대로 사용.
 */
export async function translateNotice(message: string): Promise<Translations> {
  const fallback: Translations = { ko: message, en: message, ja: message, zh: message }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return fallback

  const prompt =
    `You are a translator for a group-scheduling web app's notice banner.\n` +
    `Translate the notice below into ${LANG_NAMES.ko}, ${LANG_NAMES.en}, ${LANG_NAMES.ja}, and ${LANG_NAMES.zh}.\n` +
    `Rules:\n` +
    `- Keep it concise and natural for a short UI banner.\n` +
    `- Preserve any emoji and proper nouns.\n` +
    `- For the language the notice is already written in, keep it essentially unchanged.\n` +
    `- Respond with ONLY a JSON object, no markdown, no explanation.\n` +
    `- JSON keys must be exactly: ko, en, ja, zh.\n\n` +
    `Notice:\n${message}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: prompt },
          // 프리필로 JSON 출력 유도
          { role: 'assistant', content: '{' },
        ],
      }),
    })

    if (!res.ok) return fallback

    const data = (await res.json()) as any
    const text = data?.content?.[0]?.text ?? ''
    // 프리필 '{' 를 다시 붙여 완전한 JSON 으로 복원
    const jsonStr = '{' + text
    const parsed = extractJson(jsonStr)
    if (!parsed) return fallback

    return {
      ko: typeof parsed.ko === 'string' && parsed.ko.trim() ? parsed.ko.trim() : message,
      en: typeof parsed.en === 'string' && parsed.en.trim() ? parsed.en.trim() : message,
      ja: typeof parsed.ja === 'string' && parsed.ja.trim() ? parsed.ja.trim() : message,
      zh: typeof parsed.zh === 'string' && parsed.zh.trim() ? parsed.zh.trim() : message,
    }
  } catch {
    return fallback
  }
}

function extractJson(s: string): any | null {
  // 가장 바깥쪽 중괄호 범위를 잘라 파싱 시도
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(s.slice(start, end + 1))
  } catch {
    return null
  }
}
