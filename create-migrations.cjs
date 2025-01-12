const readline = require('readline');
const { exec } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log('Welcome to the migration file generator!');

  while (true) {
    const tableName = await askQuestion(
      "Enter the table name for migration (or type 'exit' to quit): "
    );

    if (tableName.toLowerCase() === 'exit') {
      console.log('Exiting...');
      break;
    }

    if (!tableName.trim()) {
      console.log('Table name cannot be empty. Please try again.');
      continue;
    }

    console.log(`Creating migration for table: ${tableName}...`);

    // Execute db-migrate command
    exec(
      `db-migrate create ${tableName} --sql-file`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(
            `Error creating migration for ${tableName}:`,
            error.message
          );
        } else if (stderr) {
          console.error(`stderr: ${stderr}`);
        } else {
          console.log(`Migration created successfully for ${tableName}:`);
          console.log(stdout);
        }
      }
    );
  }

  rl.close();
}

main().catch((error) => {
  console.error('An error occurred:', error.message);
  rl.close();
});
