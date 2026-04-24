const SENSITIVE_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
  { regex: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, replacement: "***.***.***-**" },
  { regex: /\b\d{11}\b/g, replacement: "***********" },
  { regex: /\b\d{14}\b/g, replacement: "**************" },
  { regex: /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, replacement: "**** **** **** ****" }
];

export function anonymizeText(input: string) {
  let result = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern.regex, pattern.replacement);
  }
  return result;
}
