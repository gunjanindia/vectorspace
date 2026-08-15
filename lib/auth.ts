import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./prisma";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "development-only-secret-change-me"
);

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const jar = await cookies();
  jar.set("vsa_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get("vsa_session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return db.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, stars: true, phone: true }
    });
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export interface UserRank {
  level: number;
  title: string;
  badgeIcon: string;
  minStars: number;
  nextStars: number | null;
  progressPercent: number;
}

export function calculateUserRank(stars: number): UserRank {
  const tiers = [
    { level: 1, title: "AI Novice", badgeIcon: "🌱", minStars: 0, nextStars: 30 },
    { level: 2, title: "Vector Explorer", badgeIcon: "🌟", minStars: 30, nextStars: 80 },
    { level: 3, title: "Prompt Crafter", badgeIcon: "⚡", minStars: 80, nextStars: 150 },
    { level: 4, title: "Model Whisperer", badgeIcon: "🔮", minStars: 150, nextStars: 250 },
    { level: 5, title: "AI Grandmaster", badgeIcon: "👑", minStars: 250, nextStars: null }
  ];

  for (let i = tiers.length - 1; i >= 0; i--) {
    const tier = tiers[i];
    if (stars >= tier.minStars) {
      const currentLevelStars = stars - tier.minStars;
      const range = tier.nextStars ? tier.nextStars - tier.minStars : 100;
      const progressPercent = tier.nextStars ? Math.min(100, Math.round((currentLevelStars / range) * 100)) : 100;
      return {
        level: tier.level,
        title: tier.title,
        badgeIcon: tier.badgeIcon,
        minStars: tier.minStars,
        nextStars: tier.nextStars,
        progressPercent
      };
    }
  }

  return {
    level: 1,
    title: "AI Novice",
    badgeIcon: "🌱",
    minStars: 0,
    nextStars: 30,
    progressPercent: 0
  };
}
