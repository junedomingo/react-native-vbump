import chalk from 'chalk';
import Table from 'cli-table3';

/**
 * Handle user cancellation gracefully
 * Detects various cancellation scenarios and exits cleanly
 * @param {Error} error - Error object to check
 */
export function handleUserCancellation(error) {
  if (
    error.isTtyError ||
    error.message.includes('force closed') ||
    error.message.includes('User force closed') ||
    error.message.includes('canceled')
  ) {
    console.log(chalk.yellow('\n👋 Operation cancelled by user.'));
    process.exit(0);
  }
  throw error;
}

/**
 * Display comprehensive results table showing all version changes
 * Creates a formatted table with before/after values for all modified files
 * @param {Array<Object>} changes - Array of change objects
 */
export function displayResults(changes) {
  console.log(chalk.green.bold('\n🎉 Version bump completed successfully!'));

  if (!changes || changes.length === 0) {
    console.log(chalk.yellow('No changes were made.'));
    return;
  }

  // Create comprehensive table showing all changes
  const allChangesTable = new Table({
    head: ['Platform', 'Item', 'Before', 'After'],
    colWidths: [15, 25, 15, 15],
    style: {
      head: ['green', 'bold'],
      border: ['gray'],
    },
  });

  // Add all collected changes to the table
  changes.forEach((change) => {
    allChangesTable.push([
      change.platform,
      change.item,
      chalk.yellow(change.oldValue),
      chalk.green.bold(change.newValue),
    ]);
  });

  console.log('\n' + allChangesTable.toString());
}

/**
 * Show next steps and helpful information after version bump
 * Provides git commands and additional context about changes made
 * @param {Object} options - Configuration options including dry run status
 */
export function showNextSteps(options) {
  // Simple next steps without table
  console.log(chalk.blue.bold('\n💡 Next steps:'));
  console.log(`   ${chalk.gray('git add .')}`);
  console.log(`   ${chalk.gray('git commit -m "chore: bump version"')}`);

  // Show package.json note if it was actually updated
  if (options.packageJsonUpdated) {
    console.log(`   ${chalk.gray('Note: package.json version was also updated')}`);
  }

  // Show dry run information if applicable
  if (options.dryRun) {
    console.log(chalk.yellow.bold('\n⚠️  This was a dry run - no files were modified.'));
    console.log(chalk.yellow('   Remove --dry-run to apply the changes.'));
  }
}
