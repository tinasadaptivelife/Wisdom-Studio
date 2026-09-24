export function isDictationSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isReadAloudSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function createRecognizer({ onResult, onEnd }) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
    }
    const trimmed = transcript.trim();
    if (trimmed) onResult(trimmed);
  };
  recognition.onend = () => onEnd?.();
  return recognition;
}

export function readAloud(text, { onEnd } = {}) {
  if (!isReadAloudSupported() || !text?.trim()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

export function stopReadingAloud() {
  if (isReadAloudSupported()) window.speechSynthesis.cancel();
}
