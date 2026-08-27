const { execSync } = require('child_process');
const path = require('path');
const prisma = require('./src/db/prisma');
const prismaFromDb = require('./src/db');

async function runPrismaSchemaQA() {
  console.log('?? Starting SCRUM-3 Prisma Multi-Tenant Relational Schema QA Suite...\n');
  let passed = 0;
  let total = 6;

  // Test 1: Validate Prisma Schema Syntax
  try {
    const validateOut = execSync('npx prisma validate', { cwd: __dirname, encoding: 'utf8' });
    if (validateOut.includes('is valid') || validateOut.includes('valid')) {
      console.log('  ? PASSED [Test 1]: npx prisma validate reported 0 syntax or relational schema errors');
      passed++;
    } else {
      console.error('  ? FAILED [Test 1]: Prisma validate output unexpected:', validateOut);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 1] Exception:', err.message);
  }

  // Test 2: Singleton PrismaClient Instance Equality
  try {
    if (prisma && prismaFromDb && prisma === prismaFromDb) {
      console.log('  ? PASSED [Test 2]: Singleton PrismaClient correctly exported from src/db/prisma.js and re-exported in src/db.js');
      passed++;
    } else {
      console.error('  ? FAILED [Test 2]: Prisma instances are not referentially identical');
    }
  } catch (err) {
    console.error('  ? FAILED [Test 2] Exception:', err.message);
  }

  // Test 3: Relational Cascade Integrity (Delete Company cascades Role, Parameter, Transaction)
  const testCompId = 'test-cascade-' + Date.now();
  try {
    // 1. Create Company
    const comp = await prisma.company.create({
      data: {
        id: testCompId,
        name: 'Cascade Test Corp',
        code: 'CASCADE_' + Date.now(),
        gstin: '24TESTC1234A1Z5'
      }
    });

    // 2. Create related Role, Parameter, Transaction
    const role = await prisma.role.create({
      data: {
        name: 'Cascade Manager',
        companyId: testCompId
      }
    });

    const param = await prisma.parameter.create({
      data: {
        companyId: testCompId,
        key: 'cascade_key',
        value: 'cascade_val'
      }
    });

    const tx = await prisma.transaction.create({
      data: {
        companyId: testCompId,
        amount: 1500.0,
        currency: 'INR'
      }
    });

    // 3. Create User referencing Company and Role
    const user = await prisma.user.create({
      data: {
        name: 'Cascade User',
        email: `cascade_user_${Date.now()}@test.in`,
        companyId: testCompId,
        roleId: role.id
      }
    });

    // 4. Delete Company -> Check cascade
    await prisma.company.delete({
      where: { id: testCompId }
    });

    const roleAfter = await prisma.role.findUnique({ where: { id: role.id } });
    const paramAfter = await prisma.parameter.findUnique({ where: { id: param.id } });
    const txAfter = await prisma.transaction.findUnique({ where: { id: tx.id } });
    const userAfter = await prisma.user.findUnique({ where: { id: user.id } });

    if (!roleAfter && !paramAfter && !txAfter && userAfter && userAfter.companyId === null) {
      console.log('  ? PASSED [Test 3]: Relational cascades (Cascade on Role/Param/Tx, SetNull on User) operate with 100% integrity');
      passed++;
    } else {
      console.error('  ? FAILED [Test 3]: Relational cascade state mismatch', { roleAfter, paramAfter, txAfter, userAfter });
    }

    // Cleanup user
    if (userAfter) {
      await prisma.user.delete({ where: { id: userAfter.id } });
    }
  } catch (err) {
    console.error('  ? FAILED [Test 3] Exception:', err.message);
  }

  // Test 4: Compound Unique Key on Parameter (companyId + key)
  const uniqueCompId = 'test-unique-' + Date.now();
  try {
    await prisma.company.create({
      data: {
        id: uniqueCompId,
        name: 'Unique Test Corp',
        code: 'UNIQUE_' + Date.now()
      }
    });

    await prisma.parameter.create({
      data: {
        companyId: uniqueCompId,
        key: 'duplicate_key',
        value: 'val1'
      }
    });

    let duplicateBlocked = false;
    try {
      await prisma.parameter.create({
        data: {
          companyId: uniqueCompId,
          key: 'duplicate_key',
          value: 'val2'
        }
      });
    } catch (e) {
      duplicateBlocked = true;
    }

    if (duplicateBlocked) {
      console.log('  ? PASSED [Test 4]: Compound unique constraint (companyId + key) prevents duplicate parameters');
      passed++;
    } else {
      console.error('  ? FAILED [Test 4]: Duplicate parameter was allowed');
    }
  } catch (err) {
    console.error('  ? FAILED [Test 4] Exception:', err.message);
  }

  // Test 5: Compound Unique Key on Role (companyId + name)
  try {
    await prisma.role.create({
      data: {
        companyId: uniqueCompId,
        name: 'DUPLICATE_ROLE'
      }
    });

    let dupRoleBlocked = false;
    try {
      await prisma.role.create({
        data: {
          companyId: uniqueCompId,
          name: 'DUPLICATE_ROLE'
        }
      });
    } catch (e) {
      dupRoleBlocked = true;
    }

    if (dupRoleBlocked) {
      console.log('  ? PASSED [Test 5]: Compound unique constraint (companyId + name) prevents duplicate roles');
      passed++;
    } else {
      console.error('  ? FAILED [Test 5]: Duplicate role was allowed');
    }

    // Cleanup unique test company
    await prisma.company.delete({ where: { id: uniqueCompId } });
  } catch (err) {
    console.error('  ? FAILED [Test 5] Exception:', err.message);
  }

  // Test 6: Migration SQL File Existence
  try {
    const fs = require('fs');
    const migrationFile = path.join(__dirname, 'prisma', 'migrations', '0_init', 'migration.sql');
    if (fs.existsSync(migrationFile) && fs.readFileSync(migrationFile, 'utf8').length > 500) {
      console.log('  ? PASSED [Test 6]: Migration SQL evolution trail properly generated in prisma/migrations/0_init/migration.sql');
      passed++;
    } else {
      console.error('  ? FAILED [Test 6]: Migration SQL file missing or empty');
    }
  } catch (err) {
    console.error('  ? FAILED [Test 6] Exception:', err.message);
  }

  console.log(`\n?? PRISMA SCHEMA QA RESULTS: ${passed}/${total} Tests Passed.`);
  if (passed === total) {
    console.log('?? SCRUM-3 PRISMA MULTI-TENANT SCHEMA & MIGRATIONS VALIDATION PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runPrismaSchemaQA()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
