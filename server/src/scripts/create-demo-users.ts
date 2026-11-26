import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import db from "../common/db/index.js";
import { organisations, users, classrooms, classroomTeachers, classroomStudents, plans } from "../common/db/schema.js";
import { assignPlanToOrganisation } from "../module/billing/subscription.service.js";

// Creates one demo manager, teacher and student, each with a random email and a random password, so nothing about them can be
// guessed. They are verified already (no email is sent), live in one "Abhyas Demo" organisation, and the student is in a demo
// classroom taught by the teacher. The passwords are printed once and only their hashes are stored.
//
// Set DATABASE_URL to the database to write to (a value set in the shell wins over the one in .env), then:
//   npx tsx src/scripts/create-demo-users.ts          shows what it would do and changes nothing
//   npx tsx src/scripts/create-demo-users.ts --yes    creates the accounts
// Every run makes a new trio; the organisation is reused.

const ORG_NAME = "Abhyas Demo";
const EMAIL_DOMAIN = process.env.DEMO_EMAIL_DOMAIN || "demo.abhyas.karanop.in";

const LOWER = "abcdefghjkmnpqrstuvwxyz23456789";
const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

const pick = (chars: string, length: number) => {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
};

// 20 random characters: always has an uppercase letter and a number, which the sign-up rules ask for.
const makePassword = () => {
  while (true) {
    const password = pick(PASSWORD_CHARS, 20);
    if (/[A-Z]/.test(password) && /\d/.test(password)) return password;
  }
};

const makeAccount = (role: "manager" | "teacher" | "student") => ({
  role,
  name: `Demo ${role[0]!.toUpperCase()}${role.slice(1)}`,
  email: `${role}.${pick(LOWER, 10)}@${EMAIL_DOMAIN}`,
  password: makePassword(),
});

const main = async () => {
  const confirmed = process.argv.includes("--yes");
  const target = (() => {
    try {
      return new URL(process.env.DATABASE_URL!).host;
    } catch {
      return "(DATABASE_URL is missing or not a valid URL)";
    }
  })();

  console.log(`Database: ${target}`);
  if (!confirmed) {
    console.log(`Dry run. It would create the organisation "${ORG_NAME}" (if missing), a demo manager, teacher and student with random emails @${EMAIL_DOMAIN}, and a demo classroom.`);
    console.log("Run again with --yes to create them.");
    return;
  }

  const accounts = [makeAccount("manager"), makeAccount("teacher"), makeAccount("student")];
  const hashes = await Promise.all(accounts.map((a) => bcrypt.hash(a.password, 12)));

  let [organisation] = await db.select().from(organisations).where(eq(organisations.name, ORG_NAME));
  if (!organisation) [organisation] = await db.insert(organisations).values({ name: ORG_NAME }).returning();
  if (!organisation) throw new Error("Could not create the organisation");

  const created = await Promise.all(
    accounts.map(async (a, i) => {
      const [user] = await db
        .insert(users)
        .values({
          name: a.name,
          email: a.email,
          password: hashes[i]!,
          role: a.role,
          organisationId: organisation!.id,
          isVerified: true,
        })
        .returning();
      return user!;
    }),
  );
  const [manager, teacher, student] = created as [typeof created[number], typeof created[number], typeof created[number]];

  // A classroom for the demo teacher, with the demo student in it. Its join code is revoked, so nobody can join it with a code.
  const [classroom] = await db
    .insert(classrooms)
    .values({
      name: "Demo Classroom",
      organisationId: organisation.id,
      createdBy: teacher.id,
      joinCode: pick("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8),
      joinCodeExpiresAt: new Date(),
      joinCodeMaxUses: 1,
      joinCodeRevoked: true,
    })
    .returning();
  await db.insert(classroomTeachers).values({ classroomId: classroom!.id, teacherId: teacher.id });
  await db.insert(classroomStudents).values({ classroomId: classroom!.id, studentId: student.id, joinedVia: "code" });

  // The organisation needs a plan for the usage limits to work. The "basic" plan is used when it exists.
  const [plan] = await db.select().from(plans).where(eq(plans.name, "basic"));
  if (plan) await assignPlanToOrganisation(organisation.id, plan.id).catch((err) => console.warn("Could not assign the basic plan:", err.message));
  else console.warn('No plan called "basic" was found, so the organisation has no plan.');

  console.log(`\nCreated in "${ORG_NAME}". Copy these now: the passwords are not stored anywhere and cannot be shown again.\n`);
  console.table(accounts.map((a) => ({ role: a.role, email: a.email, password: a.password })));
  console.log(`Manager id ${manager.id}, teacher id ${teacher.id}, student id ${student.id}`);
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
