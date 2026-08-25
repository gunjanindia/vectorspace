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
    update: {
      title: "Founding AI Director & Mentor",
      bio: "Over 12 years of industry AI and LLM systems architecture experience. Mentored 1,500+ developers."
    },
    create: {
      name: "AI Faculty",
      email: "instructor@vectorspaceacademy.com",
      passwordHash,
      role: Role.INSTRUCTOR,
      title: "Founding AI Director & Mentor",
      bio: "Over 12 years of industry AI and LLM systems architecture experience. Mentored 1,500+ developers.",
      stars: 120
    }
  });

  const instructorSarah = await prisma.user.upsert({
    where: { email: "sarah.chen@vectorspaceacademy.com" },
    update: {
      title: "Principal ML Research Scientist",
      bio: "Specializing in autoregressive transformer models, prompt optimization, multi-agent frameworks, and enterprise vector search."
    },
    create: {
      name: "Dr. Sarah Chen",
      email: "sarah.chen@vectorspaceacademy.com",
      passwordHash,
      role: Role.INSTRUCTOR,
      title: "Principal ML Research Scientist",
      bio: "Specializing in autoregressive transformer models, prompt optimization, multi-agent frameworks, and enterprise vector search.",
      stars: 250
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
</ul>
<h3>Example: Basic Chat Completion in Python</h3>
<p>Here is how you can invoke an LLM using the OpenAI Python SDK:</p>
<pre class="code-block" data-language="python"><code class="language-python">import openai

# Configure client
client = openai.OpenAI(api_key="your-api-key")

response = client.chat.completions.create(
    model="gpt-4o",
    temperature=0.7,
    messages=[
        {"role": "system", "content": "You are an expert AI tutor at Vector Space."},
        {"role": "user", "content": "Explain embeddings in 2 sentences."}
    ]
)

print(response.choices[0].message.content)</code></pre>
<p>Notice how the <code>messages</code> array passes role-based objects (<code>system</code>, <code>user</code>, and <code>assistant</code>) to structure the conversation flow.</p>`
      }
    });

    await prisma.lesson.create({
      data: {
        moduleId: m1.id,
        title: "Developer Environment & Git Setup",
        type: LessonType.ARTICLE,
        durationMin: 15,
        sortOrder: 3,
        content: `<h2>Developer Environment Setup</h2>
<p>Before building AI applications, configure your terminal environment and version control system.</p>
<h3>Essential Terminal & Git Commands</h3>
<p>Run these commands in your shell to verify and install Git:</p>
<pre class="code-block" data-language="bash"><code class="language-bash"># Check if Git is already installed
git --version

# macOS (using Homebrew)
brew install git

# Windows: download from https://git-scm.com and run the installer

# Ubuntu/Debian Linux
sudo apt update && sudo apt install git</code></pre>
<p>Once installed, you can clone course repositories and push your AI projects directly to GitHub.</p>`
      }
    });

    const quizLesson1 = await prisma.lesson.create({
      data: {
        moduleId: m1.id,
        title: "Knowledge Check: GenAI & LLMs Quiz",
        type: LessonType.QUIZ,
        durationMin: 10,
        sortOrder: 4,
        description: "Test your understanding of Generative AI and tokenization. Solve this quiz to unlock the next module and earn stars! ⭐"
      }
    });

    await prisma.quizQuestion.createMany({
      data: [
        {
          lessonId: quizLesson1.id,
          question: "What is the primary mechanism by which autoregressive LLMs generate text?",
          options: [
            "Predicting the next token probabilistically",
            "Looking up answers in a relational SQL database",
            "Compiling syntax trees into bytecode",
            "Searching the live web for each character"
          ],
          correctAnswer: 0,
          explanation: "Autoregressive LLMs predict the most statistically probable next token sequentially based on previous context tokens.",
          starsReward: 10,
          sortOrder: 1
        },
        {
          lessonId: quizLesson1.id,
          question: "Which parameter controls randomness and creativity in LLM output generation?",
          options: [
            "Top-K only",
            "Temperature",
            "Batch Size",
            "Learning Rate"
          ],
          correctAnswer: 1,
          explanation: "Temperature scales the logits before softmax: 0 yields deterministic greedy outputs, while higher values (e.g., 0.8) increase diversity.",
          starsReward: 10,
          sortOrder: 2
        }
      ]
    });

    // Module 2
    const m2 = await prisma.courseModule.create({
      data: { courseId: course.id, title: "Prompt Engineering & Few-Shot Techniques", sortOrder: 2 }
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
</ol>
<h3>Few-Shot + CoT Prompt Template (JSON Output)</h3>
<pre class="code-block" data-language="javascript"><code class="language-javascript">const prompt = \`
You are a financial entity extractor. Given a sentence, extract companies and amounts.
Reason step-by-step before returning the JSON object.

Example 1:
Input: "Apple acquired Beats for $3 Billion in May 2014."
Thought: Identified company "Apple", acquired "Beats", value "$3B".
Output: {"company": "Apple", "target": "Beats", "deal_value_usd": 3000000000}

Example 2:
Input: "Microsoft invested 10 billion dollars into OpenAI."
Thought: Identified company "Microsoft", target "OpenAI", amount "$10B".
Output: {"company": "Microsoft", "target": "OpenAI", "deal_value_usd": 10000000000}

Now process this input:
Input: "\${userInput}"
\`;</code></pre>
<p>By providing explicit input/thought/output demonstrations, the model adheres strictly to the desired JSON schema without hallucinations.</p>`
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

  // Seed Learning Paths
  const courseGenAI = await prisma.course.findUnique({ where: { slug: "generative-ai-prompt-engineering" } });
  const courseFullStack = await prisma.course.findFirst({ where: { slug: { contains: "full-stack" } } });

  const pathGenAI = await prisma.learningPath.upsert({
    where: { slug: "generative-ai-specialist" },
    update: {},
    create: {
      slug: "generative-ai-specialist",
      title: "Generative AI & LLM Specialist",
      icon: "🤖",
      level: "Beginner to Intermediate",
      shortDescription: "Master generative AI, token dynamics, advanced prompt patterns, and practical LLM workflows.",
      description: "A comprehensive learning path guiding you from core LLM concepts and tokenization mechanics to mastering Few-Shot prompting, Chain-of-Thought reasoning, RAG architectures, and AI system evaluation.",
      published: true,
      featured: true,
      sortOrder: 1
    }
  });

  const pathFullStack = await prisma.learningPath.upsert({
    where: { slug: "full-stack-ai-developer" },
    update: {},
    create: {
      slug: "full-stack-ai-developer",
      title: "Full-Stack AI Developer",
      icon: "⚡",
      level: "Intermediate to Advanced",
      shortDescription: "Go from AI fundamentals to building complete full-stack AI applications, agents, and production systems.",
      description: "Designed for software engineers and developers looking to architect and build full-stack generative AI solutions, autonomous agent workflows, vector search integrations, and enterprise deployment pipelines.",
      published: true,
      featured: true,
      sortOrder: 2
    }
  });

  const pathFoundations = await prisma.learningPath.upsert({
    where: { slug: "ai-prompt-engineering-foundations" },
    update: {},
    create: {
      slug: "ai-prompt-engineering-foundations",
      title: "AI & Prompt Engineering Foundations",
      icon: "🧠",
      level: "Beginner",
      shortDescription: "Step-by-step foundation path for beginners to master prompt patterns, LLM evaluation, and real-world tools.",
      description: "The ideal starting point for anyone new to generative AI. Learn how foundation models work, how to craft robust prompts, avoid hallucinations, and apply AI in everyday tasks.",
      published: true,
      featured: true,
      sortOrder: 3
    }
  });

  // Link courses to learning paths
  if (courseGenAI) {
    await prisma.learningPathCourse.upsert({
      where: {
        learningPathId_courseId: {
          learningPathId: pathGenAI.id,
          courseId: courseGenAI.id
        }
      },
      update: { sortOrder: 1 },
      create: {
        learningPathId: pathGenAI.id,
        courseId: courseGenAI.id,
        sortOrder: 1
      }
    });

    await prisma.learningPathCourse.upsert({
      where: {
        learningPathId_courseId: {
          learningPathId: pathFoundations.id,
          courseId: courseGenAI.id
        }
      },
      update: { sortOrder: 1 },
      create: {
        learningPathId: pathFoundations.id,
        courseId: courseGenAI.id,
        sortOrder: 1
      }
    });

    await prisma.learningPathCourse.upsert({
      where: {
        learningPathId_courseId: {
          learningPathId: pathFullStack.id,
          courseId: courseGenAI.id
        }
      },
      update: { sortOrder: 1 },
      create: {
        learningPathId: pathFullStack.id,
        courseId: courseGenAI.id,
        sortOrder: 1
      }
    });
  }

  if (courseFullStack) {
    await prisma.learningPathCourse.upsert({
      where: {
        learningPathId_courseId: {
          learningPathId: pathFullStack.id,
          courseId: courseFullStack.id
        }
      },
      update: { sortOrder: 2 },
      create: {
        learningPathId: pathFullStack.id,
        courseId: courseFullStack.id,
        sortOrder: 2
      }
    });
  }

  // Seed Promo / Offer Codes
  await prisma.promoCode.upsert({
    where: { code: "AI50" },
    update: {},
    create: {
      code: "AI50",
      description: "50% off on all AI courses (Limited Time Special)",
      discountType: "PERCENTAGE",
      discountValue: 50,
      maxDiscountPaise: 1000000, // max ₹10,000 discount
      minOrderPaise: 0,
      active: true,
      usageLimit: 500
    }
  });

  await prisma.promoCode.upsert({
    where: { code: "WELCOME1000" },
    update: {},
    create: {
      code: "WELCOME1000",
      description: "Flat ₹1,000 instant discount on course enrollment",
      discountType: "FLAT",
      discountValue: 100000, // ₹1,000 in paise
      minOrderPaise: 200000, // min order ₹2,000
      active: true,
      usageLimit: 1000
    }
  });

  if (courseGenAI) {
    await prisma.promoCode.upsert({
      where: { code: "GENAI100" },
      update: {},
      create: {
        code: "GENAI100",
        description: "100% Full Scholarship coupon for Generative AI & Prompt Engineering",
        discountType: "PERCENTAGE",
        discountValue: 100,
        applicableCourseId: courseGenAI.id,
        active: true,
        usageLimit: 50
      }
    });
  }

  if (courseFullStack) {
    await prisma.promoCode.upsert({
      where: { code: "EXEC30" },
      update: {},
      create: {
        code: "EXEC30",
        description: "30% off on Executive Program in Full-Stack AI",
        discountType: "PERCENTAGE",
        discountValue: 30,
        applicableCourseId: courseFullStack.id,
        active: true,
        usageLimit: 100
      }
    });
  }

  // Seed Batches / Cohorts
  if (courseGenAI) {
    const batch1 = await prisma.batch.create({
      data: {
        name: "Weekend Hybrid AI Cohort 01",
        mode: CourseMode.HYBRID,
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45), // 45 days
        schedule: "Sat & Sun, 10:00 AM – 1:00 PM IST",
        classroom: "Lab 3B, Tech Block + Live Zoom/Meet",
        meetingLink: "https://meet.google.com/vsa-genai-cohort1",
        capacity: 25,
        status: "UPCOMING",
        courseId: courseGenAI.id,
        instructorId: instructor.id
      }
    });

    const batch2 = await prisma.batch.create({
      data: {
        name: "Weekday Evening Live Online Cohort",
        mode: CourseMode.ONLINE,
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // 14 days
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
        schedule: "Mon, Wed, Fri, 7:00 PM – 9:00 PM IST",
        meetingLink: "https://meet.google.com/vsa-genai-evening",
        capacity: 30,
        status: "UPCOMING",
        courseId: courseGenAI.id,
        instructorId: instructorSarah.id
      }
    });

    // Link student's existing enrollment to batch1
    await prisma.enrollment.updateMany({
      where: { userId: student.id, courseId: courseGenAI.id },
      data: { batchId: batch1.id }
    });
  }

  if (courseFullStack) {
    await prisma.batch.create({
      data: {
        name: "Full-Stack AI Saturday In-Classroom Intensive",
        mode: CourseMode.OFFLINE,
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
        schedule: "Saturday, 9:30 AM – 5:30 PM IST (Full-Day In-Person)",
        classroom: "Hall A, Vector Space Campus, Bengaluru",
        capacity: 20, // Limited seat
        status: "UPCOMING",
        courseId: courseFullStack.id,
        instructorId: instructorSarah.id
      }
    });
  }

  // Seed Additional Enrolled Students & Course Ratings/Reviews
  const studentPriya = await prisma.user.upsert({
    where: { email: "priya.sharma@example.com" },
    update: {},
    create: {
      name: "Priya Sharma",
      email: "priya.sharma@example.com",
      passwordHash: studentPasswordHash,
      role: Role.STUDENT,
      stars: 45
    }
  });

  const studentRohan = await prisma.user.upsert({
    where: { email: "rohan.mehta@example.com" },
    update: {},
    create: {
      name: "Rohan Mehta",
      email: "rohan.mehta@example.com",
      passwordHash: studentPasswordHash,
      role: Role.STUDENT,
      stars: 30
    }
  });

  const studentAnanya = await prisma.user.upsert({
    where: { email: "ananya.iyer@example.com" },
    update: {},
    create: {
      name: "Ananya Iyer",
      email: "ananya.iyer@example.com",
      passwordHash: studentPasswordHash,
      role: Role.STUDENT,
      stars: 60
    }
  });

  // Enroll students in courses and seed reviews
  const allCourses = await prisma.course.findMany();
  for (const c of allCourses) {
    // Enroll Alex, Priya, Rohan, Ananya
    const learners = [
      { user: student, rating: 5, comment: "The interactive quizzes with instant explanations and token mechanics are fantastic! Truly practical." },
      { user: studentPriya, rating: 5, comment: "Best course on Generative AI and prompt engineering. The concepts are explained with tremendous clarity." },
      { user: studentRohan, rating: 5, comment: "The hands-on examples and live code snippets made complex LLM architectures easy to grasp." },
      { user: studentAnanya, rating: 4, comment: "Super comprehensive curriculum. Loved the project walkthroughs and step-by-step guidance." }
    ];

    for (const learner of learners) {
      await prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: learner.user.id,
            courseId: c.id
          }
        },
        update: {},
        create: {
          userId: learner.user.id,
          courseId: c.id,
          status: EnrollmentStatus.ACTIVE
        }
      });

      await prisma.courseReview.upsert({
        where: {
          userId_courseId: {
            userId: learner.user.id,
            courseId: c.id
          }
        },
        update: {
          rating: learner.rating,
          comment: learner.comment
        },
        create: {
          userId: learner.user.id,
          courseId: c.id,
          rating: learner.rating,
          comment: learner.comment
        }
      });
    }
  }

  console.log("Seed complete with interactive quizzes, gamification stars, learning paths, promo codes, batches, and student star ratings/reviews!");
  console.log("Admin: admin@vectorspaceacademy.com / Admin@12345");
  console.log("Student: student@vectorspaceacademy.com / Student@12345");
  console.log("Instructor: sarah.chen@vectorspaceacademy.com / Admin@12345");
}

main().finally(() => prisma.$disconnect());
