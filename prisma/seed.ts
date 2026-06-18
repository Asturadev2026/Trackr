import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@trackr.dev"
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!"
  const name = process.env.SEED_ADMIN_NAME ?? "Admin User"

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Admin user already exists: ${email}`)
    return
  }

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, name, password: hashed, role: "ADMIN", isActive: true },
  })

  console.log(`✓ Admin user created:`)
  console.log(`  Email:    ${email}`)
  console.log(`  Password: ${password}`)
  console.log(`  ID:       ${user.id}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
