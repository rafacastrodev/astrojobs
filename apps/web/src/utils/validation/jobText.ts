export const UNSAFE_JOB_TEXT_MESSAGE = 'HTML and script are not allowed'

const UNSAFE_MARKUP =
  /<\s*\/?\s*[a-zA-Z!]|javascript\s*:|data\s*:\s*text\/html|\bon\w+\s*=|&\s*#|&lt;/i

export function jobTextLooksUnsafe(value: string) {
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (code < 32 && character !== '\t' && character !== '\n' && character !== '\r') {
      return true
    }
  }
  return UNSAFE_MARKUP.test(value)
}
