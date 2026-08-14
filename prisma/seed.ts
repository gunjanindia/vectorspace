import { PrismaClient, Role, CourseMode, LessonType, EnrollmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin@12345", 12);
  const studentPasswordHash = await bcrypt.hash("Student@12345", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@vectorspaceacademy.com" },
    update: {},
    create: {
      name: "Vector Space Admin",
      email: "admin@vectorspaceacademy.com",
      passwordHash,
      role: Role.ADMIN,
      stars: 50
    }
  });

  const instructor = await prisma.user.upsert({
    where: { email: "instructor@vectorspaceacademy.com" },
    update: {},
    create: {
      name: "AI Faculty",
      email: "instructor@vectorspaceacademy.com",
      passwordHash,
      role: Role.INSTRUCTOR,
      stars: 120
    }
  });

  const student = await prisma.user.upsert({
    where: { email: "student@vectorspaceacademy.com" },
    update: {},
    create: {
      name: "Alex Johnson",
      email: "student@vectorspaceacademy.com",
      passwordHash: studentPasswordHash,
      role: Role.STUDENT,
      stars: 15
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

  // Ensure student is enrolled
  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: student.id,
        courseId: course.id
      }
    },
    update: {},
    create: {
      userId: student.id,
      courseId: course.id,
      status: EnrollmentStatus.ACTIVE
    }
  });

  // Check if modules already exist
  const existingModules = await prisma.courseModule.findMany({
    where: { courseId: course.id },
    include: { lessons: { include: { quizQuestions: true } } }
  });

  if (existingModules.length === 0) {
    // Module 1
    const m1 = await prisma.courseModule.create({
      data: { courseId: course.id, title: "AI & Generative AI Foundations", sortOrder: 1 }
    });

    await prisma.lesson.create({
      data: {
        moduleId: m1.id,
        title: "What is Generative AI?",
        type: LessonType.VIDEO,
        durationMin: 18,
        sortOrder: 1,
        videoUrl: "https://www.youtube.com/watch?v=2eWuYf-aZE4",
        description: "An engaging overview of Generative AI principles, history, and real-world use cases."
      }
    });

    await prisma.lesson.create({
      data: {
        moduleId: m1.id,
        title: "LLMs Explained",
        type: LessonType.ARTICLE,
        durationMin: 20,
        sortOrder: 2,
        content: `<h2>Understanding Large Language Models</h2>
<p>Large Language Models (LLMs) are deep learning models trained on vast amounts of text data. They predict the most probable next token given a sequence of preceding tokens.</p>
<h3>Core Concepts:</h3>
<ul>
  <li><strong>Tokens:</strong> Fundamental units of text (subwords, words, or characters).</li>
  <li><strong>Context Window:</strong> The maximum number of tokens a model can process at once.</li>
  <li><strong>Temperature:</strong> Controls randomness (0 = deterministic, 1 = creative).</li>
  <li><strong>System Prompt:</strong> Sets the persistent behavior, persona, and constraints of the model.</li>
</ul>`
      }
    });

    const quizLesson1 = await prisma.lesson.create({
      data: {
        moduleId: m1.id,
        title: "Knowledge Check: GenAI & LLMs Quiz",
        type: LessonType.QUIZ,
        durationMin: 10,
        sortOrder: 3,
        description: "Test your understanding of Generative AI and tokenization. Solve this quiz to unlock the next module and earn stars! ⭐"
      }
    });

    await prisma.quizQuestion.createMany({
      data: [
        {
          lessonId: quizLesson1.id,
          question: "What is the primary mechanism by which autoregressive LLMs generate text?",
          options: [
            "By searching a static relational database for matching answers",
            "By iteratively predicting the most probable next token given the prompt context",
            "By executing pre-compiled binary code rules",
            "By directly translating voice vibrations into ASCII characters"
          ],
          correctAnswer: 1,
          hint: "Think about how text is broken down into small pieces (tokens) and how the model guesses what follows sequentially.",
          explanation: "Autoregressive LLMs predict subsequent tokens one at a time conditioned on the prompt and previously generated tokens.",
          starsReward: 10,
          sortOrder: 1
        },
        {
          lessonId: quizLesson1.id,
          question: "How does setting a lower 'Temperature' (e.g. 0.1 vs 0.9) affect model outputs?",
          options: [
            "It makes the output more deterministic, focused, and repeatable",
            "It makes the output more random and hallucination-prone",
            "It speeds up CPU clock cycles on the server",
            "It automatically translates text into Spanish"
          ],
          correctAnswer: 0,
          hint: "Lower temperatures decrease randomness in token probability distribution.",
          explanation: "Lower temperature values (e.g., 0.0–0.2) force the model to pick the highest probability tokens, producing more predictable and consistent answers.",
          starsReward: 10,
          sortOrder: 2
        }
      ]
    });

    // Module 2
    const m2 = await prisma.courseModule.create({
      data: { courseId: course.id, title: "Prompt Engineering Essentials", sortOrder: 2 }
    });

    await prisma.lesson.create({
      data: {
        moduleId: m2.id,
        title: "Prompt Structure & Best Practices",
        type: LessonType.VIDEO,
        durationMin: 25,
        sortOrder: 1,
        videoUrl: "https://www.youtube.com/watch?v=jC4v5AS4RIM",
        description: "Master the structure of effective prompts: Role, Context, Task, Constraints, and Examples."
      }
    });

    await prisma.lesson.create({
      data: {
        moduleId: m2.id,
        title: "Few-Shot Prompting & Chain-of-Thought",
        type: LessonType.ARTICLE,
        durationMin: 30,
        sortOrder: 2,
        content: `<h2>Advanced Prompting Patterns</h2>
<p>Crafting effective prompts is both art and science. Learn how Few-Shot examples and Chain-of-Thought reasoning dramatically improve AI accuracy.</p>
<h3>Key Techniques:</h3>
<ol>
  <li><strong>Zero-Shot Prompting:</strong> Direct instruction without input/output demonstrations.</li>
  <li><strong>Few-Shot Prompting:</strong> Providing 2-3 worked examples before the actual task.</li>
  <li><strong>Chain-of-Thought (CoT):</strong> Asking the model to "think step by step" to break down complex multi-step problems.</li>
</ol>`
      }
    });

    const quizLesson2 = await prisma.lesson.create({
      data: {
        moduleId: m2.id,
        title: "Mastering Prompt Techniques Quiz",
        type: LessonType.QUIZ,
        durationMin: 15,
        sortOrder: 3,
        description: "Solve this interactive quiz on Few-Shot and Chain-of-Thought prompting to earn 20 Stars! ⭐"
      }
    });

    await prisma.quizQuestion.createMany({
      data: [
        {
          lessonId: quizLesson2.id,
          question: "What distinguishes 'Few-Shot Prompting' from 'Zero-Shot Prompting'?",
          options: [
            "Few-shot prompting takes fewer attempts to compile",
            "Few-shot prompting provides example input-output pairs inside the prompt to guide the model",
            "Zero-shot prompting requires fine-tuning the model weights with PyTorch",
            "Few-shot prompting is only usable for image generation"
          ],
          correctAnswer: 1,
          hint: "The word 'shots' refers to sample demonstrations or examples given in the prompt.",
          explanation: "Few-shot prompting includes exemplar input-output pairs within the context window, showing the model the expected format and reasoning pattern.",
          starsReward: 10,
          sortOrder: 1
        },
        {
          lessonId: quizLesson2.id,
          question: "Why is 'Chain-of-Thought' (CoT) prompting particularly effective for arithmetic and multi-step reasoning?",
          options: [
            "It increases model parameters during inference",
            "It gives the model intermediate reasoning tokens to work through the logic before arriving at the conclusion",
            "It encrypts the tokens for privacy",
            "It forces the LLM to access the internet for calculations"
          ],
          correctAnswer: 1,
          hint: "Encouraging the model to explain its reasoning step-by-step gives it more compute/tokens to think through the problem.",
          explanation: "Generating intermediate reasoning steps allows autoregressive models to decompose complex logic and avoid jumping to incorrect conclusions.",
          starsReward: 10,
          sortOrder: 2
        }
      ]
    });
  } else {
    // If modules exist, ensure quiz lessons and questions exist
    for (const module of existingModules) {
      let quizLessonId: string;
      const existingQuiz = module.lessons.find(l => l.type === LessonType.QUIZ);
      if (!existingQuiz) {
        const created = await prisma.lesson.create({
          data: {
            moduleId: module.id,
            title: module.sortOrder === 1 ? "Knowledge Check: GenAI & LLM Fundamentals Quiz" : "Mastering Prompt Techniques Quiz",
            type: LessonType.QUIZ,
            durationMin: 10,
            sortOrder: module.lessons.length + 1,
            description: "Test your understanding with this interactive quiz. Solve to unlock the next lesson and earn stars! ⭐"
          }
        });
        quizLessonId = created.id;
      } else {
        quizLessonId = existingQuiz.id;
      }

      const qCount = await prisma.quizQuestion.count({ where: { lessonId: quizLessonId } });
      if (qCount === 0) {
        if (module.sortOrder === 1) {
          await prisma.quizQuestion.createMany({
            data: [
              {
                lessonId: quizLessonId,
                question: "What is the primary mechanism by which autoregressive LLMs generate text?",
                options: [
                  "By searching a static relational database for matching answers",
                  "By iteratively predicting the most probable next token given the prompt context",
                  "By executing pre-compiled binary code rules",
                  "By directly translating voice vibrations into ASCII characters"
                ],
                correctAnswer: 1,
                hint: "Think about how text is broken down into small pieces (tokens) and how the model guesses what follows sequentially.",
                explanation: "Autoregressive LLMs predict subsequent tokens one at a time conditioned on the prompt and previously generated tokens.",
                starsReward: 10,
                sortOrder: 1
              },
              {
                lessonId: quizLessonId,
                question: "How does setting a lower 'Temperature' (e.g. 0.1 vs 0.8) affect model outputs?",
                options: [
                  "It makes the output more deterministic, focused, and repeatable",
                  "It makes the output more random and hallucination-prone",
                  "It speeds up CPU clock cycles on the server",
                  "It automatically translates text into Spanish"
                ],
                correctAnswer: 0,
                hint: "Lower temperatures decrease randomness in token probability distribution.",
                explanation: "Lower temperature values (e.g., 0.0–0.2) force the model to pick the highest probability tokens, producing more predictable and consistent answers.",
                starsReward: 10,
                sortOrder: 2
              }
            ]
          });
        } else {
          await prisma.quizQuestion.createMany({
            data: [
              {
                lessonId: quizLessonId,
                question: "What distinguishes 'Few-Shot Prompting' from 'Zero-Shot Prompting'?",
                options: [
                  "Few-shot prompting takes fewer attempts to compile",
                  "Few-shot prompting provides example input-output pairs inside the prompt to guide the model",
                  "Zero-shot prompting requires fine-tuning the model weights with PyTorch",
                  "Few-shot prompting is only usable for image generation"
                ],
                correctAnswer: 1,
                hint: "The word 'shots' refers to sample demonstrations or examples given in the prompt.",
                explanation: "Few-shot prompting includes exemplar input-output pairs within the context window, showing the model the expected format and reasoning pattern.",
                starsReward: 10,
                sortOrder: 1
              },
              {
                lessonId: quizLessonId,
                question: "Why is 'Chain-of-Thought' (CoT) prompting particularly effective for arithmetic and multi-step reasoning?",
                options: [
                  "It increases model parameters during inference",
                  "It gives the model intermediate reasoning tokens to work through the logic before arriving at the conclusion",
                  "It encrypts the tokens for privacy",
                  "It forces the LLM to access the internet for calculations"
                ],
                correctAnswer: 1,
                hint: "Encouraging the model to explain its reasoning step-by-step gives it more compute/tokens to think through the problem.",
                explanation: "Generating intermediate reasoning steps allows autoregressive models to decompose complex logic and avoid jumping to incorrect conclusions.",
                starsReward: 10,
                sortOrder: 2
              }
            ]
          });
        }
      }
    }
  }

  console.log("Seed complete with interactive quizzes & gamification stars!");
  console.log("Admin: admin@vectorspaceacademy.com / Admin@12345");
  console.log("Student: student@vectorspaceacademy.com / Student@12345");
}

main().finally(() => prisma.$disconnect());
