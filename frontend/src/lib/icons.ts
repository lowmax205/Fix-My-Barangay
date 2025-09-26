import type { Metadata } from "next";

// Server-safe icon generation function
export function generateIconDataUri(
  size: number = 192,
  color: string = "#2563eb"
): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${color}" rx="${
    size * 0.125
  }"/>
      <g transform="translate(${size * 0.2}, ${size * 0.2})">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" 
              fill="white" 
              transform="scale(${size * 0.025})" 
              stroke="white" 
              stroke-width="2"/>
        <circle cx="${size * 0.3}" cy="${size * 0.275}" r="${
    size * 0.075
  }" fill="${color}"/>
      </g>
    </svg>
  `;

  // Use Buffer for Node.js environment (server-side) or btoa for browser
  if (typeof window === "undefined") {
    // Server-side: use Buffer
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  } else {
    // Client-side: use btoa
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
}

// Pre-generate favicons at build time
const favicon32 = generateIconDataUri(32, "#2563eb");
const faviconApple = generateIconDataUri(180, "#2563eb");

// Create favicon metadata
export function getFaviconMetadata(): Metadata["icons"] {
  return {
    icon: favicon32,
    shortcut: favicon32,
    apple: faviconApple,
  };
}
