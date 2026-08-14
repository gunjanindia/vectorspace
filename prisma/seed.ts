import { PrismaClient, Role, CourseMode, LessonType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin@12345", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@vectorspaceacademy.com" },
    update: {},
    create: {
      name: "Vector Space Admin",
      email: "admin@vectorspaceacademy.com",
      passwordHash,
      role: Role.ADMIN
    }
  });

  const instructor = await prisma.user.upsert({
    where: { email: "instructor@vectorspaceacademy.com" },
    update: {},
    create: {
      name: "AI Faculty",
      email: "instructor@vectorspaceacademy.com",
      passwordHash,
      role: Role.INSTRUCTOR
    }
  });

  const course = await prisma.course.upsert({
    where: { slug: "generative-ai-prompt-engineering" },
    update: {},
    create: {
      slug: "generative-ai-prompt-engineering",
      title: "Generative AI & Prompt Engineering",
      shortDescription: "A practical introduction to GenAI, LLMs, prompting and real-world AI workflows.",
      description: "Learn the foundations of Generative AI and build practical skills through guided lessons and projects.",
      level: "Beginner",
      durationHours: 40,
      pricePaise: 999900,
      mode: CourseMode.HYBRID,
      published: true,
      featured: true,
      instructorId: instructor.id
    }
  });

  const existing = await prisma.courseModule.count({ where: { courseId: course.id } });
  if (!existing) {
    const m1 = await prisma.courseModule.create({
      data: { courseId: course.id, title: "AI & Generative AI Foundations", sortOrder: 1 }
    });
    await prisma.lesson.createMany({
      data: [
        { moduleId: m1.id, title: "What is Generative AI?", type: LessonType.VIDEO, durationMin: 18, sortOrder: 1, videoUrl: "" },
        { moduleId: m1.id, title: "LLMs Explained", type: LessonType.ARTICLE, durationMin: 20, sortOrder: 2, content: "Learn tokens, context windows, inference and model limitations." }
      ]
    });

    const m2 = await prisma.courseModule.create({
      data: { courseId: course.id, title: "Prompt Engineering", sortOrder: 2 }
    });
    await prisma.lesson.createMany({
      data: [
        { moduleId: m2.id, title: "Prompt Structure", type: LessonType.VIDEO, durationMin: 25, sortOrder: 1, videoUrl: "" },
        { moduleId: m2.id, title: "Practical Prompt Patterns", type: LessonType.ARTICLE, durationMin: 30, sortOrder: 2, content: "Practice role, context, constraints, examples and evaluation." }
      ]
    });
  }

  console.log("Seed complete.");
  console.log("Admin: admin@vectorspaceacademy.com / Admin@12345");
  console.log("Instructor: instructor@vectorspaceacademy.com / Admin@12345");
}

main().finally(() => prisma.$disconnect());
