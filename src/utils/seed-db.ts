
import prisma from "../lib/db.js";

const dummyUsers = [
  {
    name: "John Doe",
    email: "john.doe@example.com",
    
  },
  {
    name: "Jane Smith",
    email: "jane.smith@example.com",
  },
  {
    name: "Michael Brown",
    email: "michael.brown@example.com",
  },
  {
    name: "Emily Davis",
    email: "emily.davis@example.com",
  },
  {
    name: "Robert Wilson",
    email: "robert.wilson@example.com",
  },
  {
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
  },
  {
    name: "David Lee",
    email: "david.lee@example.com",
  },
  {
    name: "Lisa Anderson",
    email: "lisa.anderson@example.com",
  },
];

const seedDatabase = async () => {
  try {
    console.log("Seeding database with dummy users...");

    for (const user of dummyUsers) {
      console.log(`Checking if ${ user.email } exists...`);

      const existingUser = await prisma.user.findUnique({
        where: {
          email: user.email,
        },
      });

      if (existingUser) {
        console.log(`User ${ user.name } already exists.Skipping.`);
        continue;
      }

      await prisma.user.create({
        data: user,
      });

      console.log(`User ${ user.name } created.`);
    }

    console.log("Database seeding completed successfully.");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

seedDatabase();
