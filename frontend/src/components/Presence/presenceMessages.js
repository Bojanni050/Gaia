export const presenceMessages = {
  general: [
    "I'm thinking...",
    "Give me a moment...",
    "I'm putting the pieces together...",
    "Almost there..."
  ],
  personal: [
    "I'm thinking back...",
    "I'm taking a moment to reflect...",
    "I want to answer this carefully..."
  ],
  technical: [
    "I'm working through this...",
    "I'm checking the details...",
    "I'm putting the pieces together..."
  ],
  creative: [
    "I'm looking for the right words...",
    "Let me shape this...",
    "Putting the pieces together..."
  ],
  image: [
    "I'm looking closely...",
    "Give me a second...",
    "Almost there..."
  ],
  document: [
    "I'm reading through it...",
    "I'm putting the pieces together..."
  ]
};

// Fallback message if for some reason arrays are empty or type is unknown
export const defaultPresenceMessage = "I'm thinking...";
