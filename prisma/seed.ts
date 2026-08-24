import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@clinic.test" },
    update: {},
    create: {
      email: "admin@clinic.test",
      passwordHash,
      name: "Clinic Admin",
      role: "ADMIN",
    },
  });

  console.log("Seeded admin:", admin.email, "password: admin123");

  // one sample doctor so you have something to book immediately
  const doctorUser = await prisma.user.upsert({
    where: { email: "doctor@clinic.test" },
    update: {},
    create: {
      email: "doctor@clinic.test",
      passwordHash: await bcrypt.hash("doctor123", 10),
      name: "Dr. Asha Verma",
      role: "DOCTOR",
      doctorProfile: {
        create: {
          specialisation: "General Physician",
          slotDurationMin: 30,
          workingHours: {
            mon: ["09:00", "17:00"],
            tue: ["09:00", "17:00"],
            wed: ["09:00", "17:00"],
            thu: ["09:00", "17:00"],
            fri: ["09:00", "17:00"],
          },
        },
      },
    },
  });

  console.log("Seeded doctor:", doctorUser.email, "password: doctor123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
