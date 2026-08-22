import "dotenv/config";
import { eq } from "drizzle-orm";
import db from "../common/db/index.js";
import { plans } from "../common/db/schema.js";

const DEFAULT_PLANS = [
  {
    name: "basic",
    isCustom: false,
    period: "monthly",
    price: 0,
    baseStudents: 100,
    bufferStudents: 20,
    maxQuestionGenerations: 10000,
    maxQuestionEvaluations: 10000,
    isActive: true,
  },
  {
    name: "pro",
    isCustom: false,
    period: "monthly",
    price: 0,
    baseStudents: 200,
    bufferStudents: 40,
    maxQuestionGenerations: 25000,
    maxQuestionEvaluations: 25000,
    isActive: true,
  },
  {
    name: "custom",
    isCustom: true,
    period: "monthly",
    price: 0,
    baseStudents: 0,
    bufferStudents: 0,
    maxQuestionGenerations: 0,
    maxQuestionEvaluations: 0,
    isActive: true,
  },
];

const seedPlans = async () => {
  console.log("Seeding subscription plans...");
  let created = 0;
  let skipped = 0;

  for (const plan of DEFAULT_PLANS) {
    const [existing] = await db.select().from(plans).where(eq(plans.name, plan.name));
    if (existing) {
      console.log(`- Plan "${plan.name}" already exists, skipping.`);
      skipped++;
      continue;
    }
    await db.insert(plans).values(plan);
    console.log(`- Created plan "${plan.name}".`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
};

seedPlans().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
