export const playAudio = (src: string): void => {
  const audio = new Audio(src);
  audio.play().catch(() => {});
};

export const speakLetter = (letter: string): void => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  // Using lowercase for single letters often avoids "Chapter" or "Capital" prefixes in some voices
  const utterance = new SpeechSynthesisUtterance(letter.toLowerCase());
  utterance.lang = "en-US";
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
};

export const speakWord = (word: string): void => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word.trim());
  utterance.lang = "en-US";
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
};

export const speakLetterAndWord = (letter: string, word: string): void => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  // Sanitize the letter to be just the character, lowercase avoids formal "Chapter" prefixing on macOS
  const cleanLetter = letter.trim().toLowerCase();
  const letterUtterance = new SpeechSynthesisUtterance(cleanLetter);
  letterUtterance.lang = "en-US";
  letterUtterance.rate = 0.85;

  const wordUtterance = new SpeechSynthesisUtterance(word.trim());
  wordUtterance.lang = "en-US";
  wordUtterance.rate = 0.85;

  letterUtterance.onend = () => {
    setTimeout(() => {
      window.speechSynthesis.speak(wordUtterance);
    }, 500);
  };

  window.speechSynthesis.speak(letterUtterance);
};

export const speakPraise = (stars: number): void => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  
  let text = "";
  if (stars === 3) {
    text = "太棒了！滿分三顆星";
  } else if (stars === 2) {
    text = "好棒喔！快要成功了";
  } else {
    text = "加油！你一定可以的";
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-TW";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
};
