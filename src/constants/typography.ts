export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
    letterSpacing: -0.6,
  },

  h1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
    letterSpacing: -0.4,
  },

  h2: {
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "700" as const,
    letterSpacing: -0.2,
  },

  h3: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "600" as const,
    letterSpacing: -0.1,
  },

  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },

  bodyMedium: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500" as const,
    letterSpacing: 0,
  },

  small: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },

  caption: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500" as const,
    letterSpacing: 0.1,
  },

  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600" as const,
    letterSpacing: 0,
  },
} as const;