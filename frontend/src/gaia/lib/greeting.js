/**
 * Greeting — part of the ongoing relationship, not a static label.
 * First arrival ever: Gaia introduces herself. Every return after that:
 * she greets personally, shaped by the time of day.
 */
const NAME = 'Bo';

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function getGreeting() {
  const currentLang = localStorage.getItem('gaia.lang') || 'nl';
  const firstArrival = !localStorage.getItem('gaia.arrived');

  if (firstArrival) {
    localStorage.setItem('gaia.arrived', new Date().toISOString());
    if (currentLang === 'nl') {
      return {
        title: "Hallo. Ik ben Gaia.",
        sub: "Een plek om samen na te denken, te beslissen en te creëren — door de tijd heen. Ik onthoud wat belangrijk is en blijf stil als dat niet zo is.",
        first: true,
      };
    } else {
      return {
        title: "Hello. I'm Gaia.",
        sub: "A place to think, decide, and create — together, over time. I'll remember what matters and stay quiet when it doesn't.",
        first: true,
      };
    }
  }

  const h = new Date().getHours();
  let timed;
  if (currentLang === 'nl') {
    timed = h < 5 ? `Nog wakker, ${NAME}?`
      : h < 12 ? `Goedemorgen, ${NAME}.`
      : h < 18 ? `Goedemiddag, ${NAME}.`
      : `Goedenavond, ${NAME}.`;
  } else {
    timed = h < 5 ? `Still up, ${NAME}?`
      : h < 12 ? `Good morning, ${NAME}.`
      : h < 18 ? `Good afternoon, ${NAME}.`
      : `Good evening, ${NAME}.`;
  }

  let title, sub;
  if (currentLang === 'nl') {
    title = pick([timed, timed, 'Welkom terug.', 'Fijn om je weer te zien.', `Klaar om verder te gaan, ${NAME}?`]);
    sub = pick([
      "Wanneer je er klaar voor bent.",
      "Neem je tijd — ik ben hier.",
      "Wat houdt je bezig?",
      "We kunnen de draad oppakken waar je maar wilt.",
      "Geen haast. We denken op jouw tempo.",
    ]);
  } else {
    title = pick([timed, timed, 'Welcome back.', 'Nice to see you again.', `Ready to continue, ${NAME}?`]);
    sub = pick([
      "Whenever you're ready.",
      "Take your time — I'm here.",
      "What's on your mind?",
      "We can pick up wherever you like.",
      "No rush. We think at your pace.",
    ]);
  }

  return { title, sub, first: false };
}
