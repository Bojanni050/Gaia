/**
 * Gaia's lexicon — her own quiet language, kept in one place so it can evolve.
 * Supports multiple languages with Dutch as the default.
 */
export const LANGUAGES = {
  nl: {
    newPage: 'Begin een pagina',
    untitled: 'Naamloze pagina',
    reconsider: 'Heroverweeg',
    revise: 'Herzien',
    keep: 'Kopieer',
    shape: 'Vorm dit',
    saveShape: 'Wijzigingen behouden',
    discard: 'Laten zoals het was',
    memoryOpen: 'Wat ik begrijp',
    memoryTitle: 'Wat ik begrijp',
    memoryLede: 'Een rustig verslag van wat ik over je te weten ben gekomen. Om te behouden of los te laten.',
    memoryEmpty: 'Ik leer je nog kennen. Er is hier nog niets — en dat is prima.',
    forget: 'Loslaten',
    
    // Composer and dropzone
    composerPlaceholder: 'Zeg wat je wilt, of denk hardop…',
    dropOverlay: 'Sleep bestanden hierheen om bij te voegen',

    // Conversation actions and status
    healthWhisper: 'Ik kan mijn denkmotor momenteel niet bereiken. Neem je tijd — ik ben er als je klaar bent om het opnieuw te proberen.',
    cancel: 'Annuleren',
    saveRegenerate: 'Opslaan & Heroverwegen',
    retry: 'Opnieuw proberen',
    thoughtProcess: 'Gedachtegang',
    
    // Sidebar footer
    footLine1: 'Een levenslange persoonlijke intelligentie,',
    footLine2: 'die groeit door begrip.',

    // Mobile navigation
    openMenu: 'Menu openen',
    closeMenu: 'Menu sluiten',

    // Presence words
    thinking: 'denken',
    speaking: 'spreken',
    listening: 'luisteren',
  },
  en: {
    newPage: 'Begin a page',
    untitled: 'Untitled page',
    reconsider: 'Reconsider',
    revise: 'Revise',
    keep: 'Keep a copy',
    shape: 'Shape this',
    saveShape: 'Keep changes',
    discard: 'Leave as it was',
    memoryOpen: 'What I understand',
    memoryTitle: 'What I understand',
    memoryLede: 'A quiet record of what I’ve come to understand about you. Yours to keep or to let go.',
    memoryEmpty: 'I’m still getting to know you. There’s nothing here yet — and that’s alright.',
    forget: 'Let go',
    
    // Composer and dropzone
    composerPlaceholder: 'Say anything, or just think out loud…',
    dropOverlay: 'Drop files to attach',

    // Conversation actions and status
    healthWhisper: "I can't reach my reason engine right now. Take your time — I'm here when you're ready to try again.",
    cancel: 'Cancel',
    saveRegenerate: 'Save & Reconsider',
    retry: 'Retry',
    thoughtProcess: 'Thought process',

    // Sidebar footer
    footLine1: 'A lifelong personal intelligence,',
    footLine2: 'growing through understanding.',

    // Mobile navigation
    openMenu: 'Open menu',
    closeMenu: 'Close menu',

    // Presence words
    thinking: 'thinking',
    speaking: 'speaking',
    listening: 'listening',
  }
};

const defaultLang = 'nl';

export const L = new Proxy({}, {
  get(target, prop) {
    const currentLang = localStorage.getItem('gaia.lang') || defaultLang;
    const langData = LANGUAGES[currentLang] || LANGUAGES[defaultLang];
    return langData[prop] || LANGUAGES.en[prop] || prop;
  }
});

export const DOMAIN_LABEL = new Proxy({}, {
  get(target, prop) {
    const currentLang = localStorage.getItem('gaia.lang') || defaultLang;
    const langData = LANGUAGES[currentLang] || LANGUAGES[defaultLang];
    return langData[prop] || LANGUAGES.en[prop] || prop;
  }
});
