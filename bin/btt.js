#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const { execSync } = require('child_process');
const path = require('path');

// Initialize commander
const program = new Command();

// Get package info
let packageInfo;
try {
  packageInfo = require('../package.json');
} catch (error) {
  packageInfo = { name: '@bt-toolkit/source', version: 'unknown' };
}

// Configure program
program
  .name('btt')
  .description(chalk.cyan('🛠️  BT-Toolkit CLI - Empowering Bible Translation Through Technology'))
  .version(packageInfo.version, '-v, --version', 'Show version information');

// Create command
program
  .command('create')
  .description('Create a new library, application, or documentation site')
  .option('-t, --type <type>', 'Project type (library, app, docs)')
  .option('-c, --category <category>', 'Project category')
  .option('-n, --name <name>', 'Project name')
  .action((options) => {
    console.log(chalk.cyan('🚀 Starting BT-Toolkit project creator...\n'));
    
    try {
      const scriptPath = path.join(__dirname, '..', 'scripts', 'create-project.js');
      
      // Set environment variables for non-interactive mode if options provided
      const env = { ...process.env };
      if (options.type) env.BTT_PROJECT_TYPE = options.type;
      if (options.category) env.BTT_PROJECT_CATEGORY = options.category;
      if (options.name) env.BTT_PROJECT_NAME = options.name;
      
      execSync(`node "${scriptPath}"`, {
        stdio: 'inherit',
        cwd: process.cwd(),
        env
      });
    } catch (error) {
      console.error(chalk.red('❌ Failed to run create command:'), error.message);
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .alias('ls')
  .description('List all projects in the monorepo')
  .option('-t, --type <type>', 'Filter by project type (lib, app)')
  .action((options) => {
    console.log(chalk.cyan('📋 BT-Toolkit Projects\n'));
    
    try {
      let command = 'npx nx show projects';
      if (options.type) {
        const typeMap = {
          'lib': 'library',
          'libs': 'library', 
          'library': 'library',
          'app': 'application',
          'apps': 'application',
          'application': 'application'
        };
        const projectType = typeMap[options.type.toLowerCase()];
        if (projectType) {
          command += ` --type=${projectType}`;
        }
      }
      
      execSync(command, { stdio: 'inherit' });
    } catch (error) {
      console.error(chalk.red('❌ Failed to list projects:'), error.message);
      process.exit(1);
    }
  });

// Build command
program
  .command('build')
  .description('Build projects')
  .option('-a, --all', 'Build all projects')
  .option('-l, --libs', 'Build all libraries')
  .option('-p, --project <name>', 'Build specific project')
  .action((options) => {
    console.log(chalk.cyan('🔨 Building projects...\n'));
    
    try {
      let command;
      if (options.all) {
        command = 'npx nx run-many -t build';
      } else if (options.libs) {
        command = 'npx nx run-many -t build --projects=tag:type:lib';
      } else if (options.project) {
        command = `npx nx build ${options.project}`;
      } else {
        console.log(chalk.yellow('ℹ️  Please specify what to build:'));
        console.log('  btt build --all        # Build everything');
        console.log('  btt build --libs       # Build all libraries');
        console.log('  btt build -p <name>    # Build specific project');
        return;
      }
      
      execSync(command, { stdio: 'inherit' });
      console.log(chalk.green('\n✅ Build completed successfully!'));
    } catch (error) {
      console.error(chalk.red('❌ Build failed:'), error.message);
      process.exit(1);
    }
  });

// Test command  
program
  .command('test')
  .description('Run tests')
  .option('-a, --all', 'Test all projects')
  .option('-l, --libs', 'Test all libraries')
  .option('-p, --project <name>', 'Test specific project')
  .option('-w, --watch', 'Watch mode')
  .action((options) => {
    console.log(chalk.cyan('🧪 Running tests...\n'));
    
    try {
      let command;
      if (options.all) {
        command = 'npx nx run-many -t test';
      } else if (options.libs) {
        command = 'npx nx run-many -t test --projects=tag:type:lib';
      } else if (options.project) {
        command = `npx nx test ${options.project}`;
      } else {
        console.log(chalk.yellow('ℹ️  Please specify what to test:'));
        console.log('  btt test --all         # Test everything');
        console.log('  btt test --libs        # Test all libraries');
        console.log('  btt test -p <name>     # Test specific project');
        return;
      }
      
      if (options.watch) {
        command += ' --watch';
      }
      
      execSync(command, { stdio: 'inherit' });
      if (!options.watch) {
        console.log(chalk.green('\n✅ Tests completed successfully!'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Tests failed:'), error.message);
      process.exit(1);
    }
  });

// Serve/Dev command
program
  .command('serve')
  .alias('dev')
  .description('Start development server for a project')
  .argument('<project>', 'Project name to serve')
  .option('-p, --port <port>', 'Port number')
  .option('-h, --host <host>', 'Host address')
  .action((project, options) => {
    console.log(chalk.cyan(`🚀 Starting development server for ${chalk.bold(project)}...\n`));
    
    try {
      let command = `npx nx serve ${project}`;
      
      if (options.port) {
        command += ` --port=${options.port}`;
      }
      if (options.host) {
        command += ` --host=${options.host}`;
      }
      
      execSync(command, { stdio: 'inherit' });
    } catch (error) {
      // Try 'dev' command if 'serve' fails
      try {
        let command = `npx nx dev ${project}`;
        if (options.port) {
          command += ` --port=${options.port}`;
        }
        if (options.host) {
          command += ` --host=${options.host}`;
        }
        execSync(command, { stdio: 'inherit' });
      } catch (devError) {
        console.error(chalk.red(`❌ Failed to serve ${project}:`), error.message);
        console.log(chalk.yellow('\n💡 Available commands for this project:'));
        try {
          execSync(`npx nx show project ${project}`, { stdio: 'inherit' });
        } catch (showError) {
          console.log(chalk.red('Could not show project information'));
        }
        process.exit(1);
      }
    }
  });

// Graph command
program
  .command('graph')
  .description('Show project dependency graph')
  .option('-f, --file <file>', 'Output file')
  .action((options) => {
    console.log(chalk.cyan('📊 Generating dependency graph...\n'));
    
    try {
      let command = 'npx nx graph';
      if (options.file) {
        command += ` --file=${options.file}`;
      }
      
      execSync(command, { stdio: 'inherit' });
    } catch (error) {
      console.error(chalk.red('❌ Failed to generate graph:'), error.message);
      process.exit(1);
    }
  });

// Clean command
program
  .command('clean')
  .description('Clean build artifacts and node_modules')
  .option('-a, --all', 'Clean everything including node_modules')
  .option('-d, --dist', 'Clean dist folder only')
  .action((options) => {
    console.log(chalk.cyan('🧹 Cleaning...\n'));
    
    try {
      if (options.all) {
        console.log(chalk.yellow('Removing node_modules and dist...'));
        execSync('rm -rf node_modules dist tmp', { stdio: 'inherit' });
        console.log(chalk.green('✅ Cleaned everything!'));
      } else if (options.dist) {
        console.log(chalk.yellow('Removing dist folder...'));
        execSync('rm -rf dist', { stdio: 'inherit' });
        console.log(chalk.green('✅ Cleaned dist folder!'));
      } else {
        console.log(chalk.yellow('Cleaning build artifacts...'));
        execSync('npx nx reset', { stdio: 'inherit' });
        console.log(chalk.green('✅ Cleaned build cache!'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Clean failed:'), error.message);
      process.exit(1);
    }
  });

// Help command (enhanced)
program
  .command('help')
  .description('Show help information')
  .argument('[command]', 'Show help for specific command')
  .action((command) => {
    if (command) {
      program.help();
    } else {
      showEnhancedHelp();
    }
  });

function showEnhancedHelp() {
  console.log(chalk.cyan.bold('🛠️  BT-Toolkit CLI'));
  console.log(chalk.cyan('==================\n'));
  console.log(chalk.gray('🌍 Empowering Bible Translation Through Technology'));
  console.log(chalk.gray('🔧 Building the Open Components Ecosystem (OCE)\n'));
  
  console.log(chalk.yellow.bold('📦 PROJECT MANAGEMENT'));
  console.log('  create                 Create new library, app, or docs site');
  console.log('  list, ls               List all projects in monorepo');
  console.log('  graph                  Show project dependency graph\n');
  
  console.log(chalk.yellow.bold('🔨 DEVELOPMENT'));
  console.log('  serve, dev <project>   Start development server');
  console.log('  build                  Build projects');
  console.log('  test                   Run tests');
  console.log('  clean                  Clean build artifacts\n');
  
  console.log(chalk.yellow.bold('📋 EXAMPLES'));
  console.log('  btt create             Interactive project creation');
  console.log('  btt list --type=lib    List all libraries');
  console.log('  btt serve blog         Start blog development server');
  console.log('  btt build --all        Build all projects');
  console.log('  btt test --libs        Test all libraries\n');
  
  console.log(chalk.gray('For more help: btt <command> --help'));
  console.log(chalk.gray('Repository: https://github.com/bt-toolkit/bt-toolkit'));
}

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  showEnhancedHelp();
} 