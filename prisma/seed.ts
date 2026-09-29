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

  // content starts empty (not a placeholder sentence) so the pipeline can
  // reliably tell "no JD entered yet" apart from real JD text — see
  // src/lib/jdMatch.ts.
  for (const role of ["PM", "SPM"] as RubricRole[]) {
    await prisma.jobDescription.upsert({
      where: { role },
      update: {},
      create: { role, content: "" },
    });
  }

  console.log("Seeded rubric criteria and empty job description rows.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
