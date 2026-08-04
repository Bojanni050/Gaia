/**
 * Greeting — part of the ongoing relationship, not a static label.
 * First arrival ever: Gaia introduces herself. Every return after that:
 * she greets personally, shaped by the time of day.
 */
const NAME = 'Bo';

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function getGreeting() {
  const firstArrival = !localStorage.getItem('gaia.arrived');
  if (firstArrival) {
    localStorage.setItem('gaia.arrived', new Date().toISOString());
    return {
      title: "Hello. I'm Gaia.",
      sub: "A place to think, decide, and create — together, over time. I'll remember what matters and stay quiet when it doesn't.",
      first: true,
    };
  }

  const h = new Date().getHours();
  const timed = h < 5 ? `Still up, ${NAME}?`
    : h < 12 ? `Good morning, ${NAME}.`
    : h < 18 ? `Good afternoon, ${NAME}.`
    : `Good evening, ${NAME}.`;

  const title = pick([timed, timed, 'Welcome back.', 'Nice to see you again.', `Ready to continue, ${NAME}?`]);
  const sub = pick([
    "Whenever you're ready.",
    "Take your time — I'm here.",
    "What's on your mind?",
    "We can pick up wherever you like.",
    "No rush. We think at your pace.",
  ]);
  return { title, sub, first: false };
}
