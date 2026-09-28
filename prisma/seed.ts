import { PrismaClient } from "@prisma/client";
import { RUBRICS, RubricRole } from "../src/lib/rubric";

const prisma = new PrismaClient();

async function main() {
  for (const role of Object.keys(RUBRICS) as RubricRole[]) {
    for (const criterion of RUBRICS[role]) {
      await prisma.rubricCriterion.upsert({
        where: { role_order: { role, order: criterion.order } },
        update: {
          name: criterion.name,
          description: criterion.description,
          weight: criterion.weight,
        },
        create: {
          role,
          order: criterion.order,
          name: criterion.name,
          description: criterion.description,
          weight: criterion.weight,
        },
      });
    }
  }

  for (const role of ["PM", "SPM"] as RubricRole[]) {
    await prisma.jobDescription.upsert({
      where: { role },
      update: {},
      create: {
        role,
        content: `Paste the ${role} job description here from /settings before candidates are pre-screened against it.`,
      },
    });
  }

  console.log("Seeded rubric criteria and placeholder job descriptions.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
