module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  // Runner-badge colors are composed dynamically (`bg-${color}-100`) from
  // src/lib/runners.ts, so they must be safelisted or Tailwind's JIT purges them.
  safelist: [
    // Live runner badge colors
    "bg-sky-100", "text-sky-700", "bg-sky-400",
    "bg-emerald-100", "text-emerald-700", "bg-emerald-400",
    "bg-violet-100", "text-violet-700", "bg-violet-400",
    "bg-zinc-100", "text-zinc-700", "bg-zinc-400",
    // Placeholder runner badge colors (gemini/azure/bedrock/custom)
    "bg-amber-100", "text-amber-700", "bg-amber-400",
    "bg-blue-100", "text-blue-700", "bg-blue-400",
    "bg-orange-100", "text-orange-700", "bg-orange-400",
    "bg-rose-100", "text-rose-700", "bg-rose-400",
  ],
  theme: {
    extend: {}
  },
  plugins: []
};
