#!/usr/bin/env node

const { execSync } = require('child_process');
const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

async function createProject() {
  console.log(chalk.cyan.bold('🛠️  BT-Toolkit Project Creator'));
  console.log(chalk.cyan('=====================================\n'));
  console.log(chalk.gray('🌍 Empowering Bible Translation Through Technology'));
  console.log(chalk.gray('🔧 Building the Open Components Ecosystem (OCE)\n'));

  try {
    // Check for environment variables (for non-interactive mode)
    const envProjectType = process.env.BTT_PROJECT_TYPE;
    const envCategory = process.env.BTT_PROJECT_CATEGORY;
    const envName = process.env.BTT_PROJECT_NAME;

    let answers = {};

    // Project type selection
    if (envProjectType) {
      answers.projectType = envProjectType;
    } else {
      const projectTypeAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'projectType',
          message: 'What type of project do you want to create?',
          choices: [
            {
              name: '📦 Library - Reusable component for developers',
              value: 'library',
              short: 'Library'
            },
            {
              name: '🚀 Application - Tool for translators or developers', 
              value: 'application',
              short: 'Application'
            },
            {
              name: '📚 Documentation/Blog - Astro site for community content',
              value: 'documentation',
              short: 'Documentation'
            }
          ]
        }
      ]);
      answers.projectType = projectTypeAnswer.projectType;
    }

    // Category selection based on project type
    if (answers.projectType === 'library') {
      if (envCategory) {
        answers.category = envCategory;
      } else {
        const categoryAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'category',
            message: 'Choose library category:',
            choices: [
              {
                name: 'core - Scripture utilities, text processing, foundational tools',
                value: 'core',
                short: 'Core'
              },
              {
                name: 'components - React/UI components for translation interfaces',
                value: 'components',
                short: 'Components'
              },
              {
                name: 'formats - USFM, USX, OSIS parsers and converters',
                value: 'formats',
                short: 'Formats'
              },
              {
                name: 'analysis - Quality checks, consistency validation',
                value: 'analysis',
                short: 'Analysis'
              },
              {
                name: 'utilities - General-purpose helper functions',
                value: 'utilities',
                short: 'Utilities'
              }
            ]
          }
        ]);
        answers.category = categoryAnswer.category;
      }
    } else if (answers.projectType === 'application') {
      if (envCategory) {
        answers.category = envCategory;
      } else {
        const categoryAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'category',
            message: 'Choose application category:',
            choices: [
              {
                name: 'translation-tools - Apps for Bible translators',
                value: 'translation-tools',
                short: 'Translation Tools'
              },
              {
                name: 'developer-tools - Tools for developers and tech teams',
                value: 'developer-tools',
                short: 'Developer Tools'
              },
              {
                name: 'demos - Example applications and showcases',
                value: 'demos',
                short: 'Demos'
              }
            ]
          }
        ]);
        answers.category = categoryAnswer.category;
      }

      // Framework selection for applications
      const frameworkAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'framework',
          message: 'Choose application framework:',
          choices: [
            {
              name: 'React (Vite) - Modern React app with Vite',
              value: 'react',
              short: 'React'
            },
            {
              name: 'Next.js - Full-stack React framework',
              value: 'nextjs',
              short: 'Next.js'
            },
            {
              name: 'Node.js - Backend service or CLI tool',
              value: 'nodejs',
              short: 'Node.js'
            }
          ]
        }
      ]);
      answers.framework = frameworkAnswer.framework;
    }

    // Project name
    if (envName) {
      answers.name = envName;
    } else {
      const nameAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: answers.projectType === 'library' ? 'Enter package name:' : 
                   answers.projectType === 'application' ? 'Enter application name:' : 'Enter site name:',
          validate: (input) => {
            if (!input) {
              return 'Name is required';
            }
            if (!/^[a-z0-9-]+$/.test(input)) {
              return 'Please use kebab-case (lowercase letters, numbers, and hyphens only)';
            }
            return true;
          },
          transformer: (input) => input.toLowerCase().replace(/[^a-z0-9-]/g, '-')
        }
      ]);
      answers.name = nameAnswer.name;
    }

    // Generate project configuration
    const config = generateProjectConfig(answers);
    
    // Show summary
    console.log(chalk.yellow('\n📋 Project Summary:'));
    console.log(`${chalk.gray('Type:')} ${config.category}`);
    console.log(`${chalk.gray('Name:')} ${config.displayName}`);
    console.log(`${chalk.gray('Location:')} ${config.projectPath}`);
    if (config.importPath) {
      console.log(`${chalk.gray('Import Path:')} ${config.importPath}`);
    }
    console.log(`${chalk.gray('Command:')} ${config.command}\n`);

    // Confirmation
    const confirmAnswer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Do you want to proceed with creating this project?',
        default: true
      }
    ]);

    if (!confirmAnswer.proceed) {
      console.log(chalk.yellow('👋 Operation cancelled.'));
      return;
    }

    // Create project
    console.log(chalk.cyan('\n🚀 Creating project...\n'));
    
    // Ensure directories exist
    ensureDirectoriesExist(config);
    
    // Execute command
    execSync(config.command, { stdio: 'inherit' });
    
    // Post-creation setup
    await postCreationSetup(config);
    
    // Success message and next steps
    showNextSteps(config);

  } catch (error) {
    console.error(chalk.red('\n❌ Error creating project:'), error.message);
    console.log(chalk.yellow('\n🔧 Troubleshooting:'));
    console.log('   - Make sure you have the latest Nx CLI: npm install -g nx@latest');
    console.log('   - Ensure you\'re in the monorepo root directory');
    console.log('   - Check that all dependencies are installed: npm install');
    process.exit(1);
  }
}

function generateProjectConfig(answers) {
  let command, projectPath, importPath, category, displayName;

  if (answers.projectType === 'library') {
    importPath = `@bt-toolkit/${answers.category}-${answers.name}`;
    projectPath = `packages/${answers.category}/${answers.name}`;
    displayName = answers.name;
    
    if (answers.category === 'components') {
      command = `npx nx g @nx/react:library ${answers.name} --publishable --bundler=rollup --directory=packages/${answers.category} --importPath=${importPath} --unitTestRunner=jest --style=css`;
    } else {
      command = `npx nx g @nx/js:library ${answers.name} --publishable --bundler=tsc --directory=packages/${answers.category} --importPath=${importPath} --unitTestRunner=jest`;
    }
    
    category = `${answers.category.charAt(0).toUpperCase() + answers.category.slice(1)} Library`;

  } else if (answers.projectType === 'application') {
    projectPath = `apps/${answers.category}/${answers.name}`;
    displayName = answers.name;

    switch (answers.framework) {
      case 'react':
        command = `npx nx g @nx/react:application ${answers.name} --directory=apps/${answers.category} --bundler=vite --unitTestRunner=jest --e2eTestRunner=playwright`;
        category = 'React Application';
        break;
      case 'nextjs':
        command = `npx nx g @nx/next:application ${answers.name} --directory=apps/${answers.category}`;
        category = 'Next.js Application';
        break;
      case 'nodejs':
        command = `npx nx g @nx/node:application ${answers.name} --directory=apps/${answers.category}`;
        category = 'Node.js Application';
        break;
    }

  } else if (answers.projectType === 'documentation') {
    projectPath = `apps/community/${answers.name}`;
    displayName = answers.name;
    command = `npx nx add @nxtensions/astro && npx nx g @nxtensions/astro:application ${answers.name} --directory=apps/community`;
    category = 'Astro Documentation Site';
  }

  return {
    ...answers,
    command,
    projectPath,
    importPath,
    category,
    displayName
  };
}

function ensureDirectoriesExist(config) {
  const parts = config.projectPath.split('/');
  parts.pop(); // Remove the project name
  const parentDir = path.join(process.cwd(), ...parts);
  
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
    console.log(chalk.gray(`   ✅ Created directory: ${parentDir}`));
  }
}

async function postCreationSetup(config) {
  if (config.projectType === 'library') {
    console.log(chalk.cyan('\n🔧 Setting up library structure...'));
    
    // Create a comprehensive README for the library
    const readmePath = path.join(process.cwd(), config.projectPath, 'README.md');
    const readmeContent = generateLibraryReadme(config);
    
    fs.writeFileSync(readmePath, readmeContent);
    console.log(chalk.gray('   ✅ Created comprehensive README.md'));
    
    // Create basic example file
    if (config.category === 'components') {
      // For React components, the generator already creates good structure
      console.log(chalk.gray('   ✅ React component structure ready'));
    } else {
      // Create a basic index.ts with example exports
      const indexPath = path.join(process.cwd(), config.projectPath, 'src', 'index.ts');
      const indexContent = generateLibraryIndex(config);
      
      if (fs.existsSync(path.dirname(indexPath))) {
        fs.writeFileSync(indexPath, indexContent);
        console.log(chalk.gray('   ✅ Created example index.ts'));
      }
    }
  }
}

function generateLibraryReadme(config) {
  return `# ${config.importPath}

${config.category} for the BT-Toolkit ecosystem.

## Installation

\`\`\`bash
npm install ${config.importPath}
\`\`\`

## Usage

\`\`\`typescript
import { } from '${config.importPath}';

// Your code here
\`\`\`

## Development

\`\`\`bash
# Build the library
nx build ${config.category}-${config.name}

# Test the library  
nx test ${config.category}-${config.name}

# Lint the library
nx lint ${config.category}-${config.name}
\`\`\`

## OCE Standards

This library follows the Open Components Ecosystem (OCE) standards:

- ✅ TypeScript definitions included
- ✅ Comprehensive test coverage
- ✅ Compatible with other OCE components
- ✅ Follows OCE naming conventions

## API Documentation

<!-- Add your API documentation here -->

## Examples

<!-- Add usage examples here -->

## Contributing

See the main [BT-Toolkit Contributing Guide](../../../CONTRIBUTING.md) for development guidelines.

## License

MIT License - see [LICENSE](../../../LICENSE) for details.
`;
}

function generateLibraryIndex(config) {
  const examples = {
    core: `/**
 * Core utilities for scripture processing and text manipulation
 */

export function parseScriptureReference(reference: string): ScriptureReference {
  // Implementation here
  throw new Error('Not implemented yet');
}

export interface ScriptureReference {
  book: string;
  chapter: number;
  verse?: number;
}`,
    formats: `/**
 * Format parsers and converters for ${config.name}
 */

export function parse${config.name.charAt(0).toUpperCase() + config.name.slice(1)}(content: string): ParsedContent {
  // Implementation here
  throw new Error('Not implemented yet');
}

export interface ParsedContent {
  type: string;
  content: unknown;
}`,
    analysis: `/**
 * Analysis tools for ${config.name}
 */

export function analyze${config.name.charAt(0).toUpperCase() + config.name.slice(1)}(content: string): AnalysisResult {
  // Implementation here
  throw new Error('Not implemented yet');
}

export interface AnalysisResult {
  score: number;
  issues: Issue[];
}

export interface Issue {
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}`,
    utilities: `/**
 * Utility functions for ${config.name}
 */

export function ${config.name.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}Util(input: string): string {
  // Implementation here
  return input;
}`
  };

  return examples[config.category] || `/**
 * ${config.category} library for ${config.name}
 */

export function hello(): string {
  return 'Hello from ${config.importPath}!';
}`;
}

function showNextSteps(config) {
  console.log(chalk.green('\n✅ Project created successfully!'));
  console.log(chalk.gray(`📁 Project location: ${config.projectPath}\n`));
  
  console.log(chalk.yellow.bold('📋 Next Steps:'));
  console.log(chalk.gray(`   cd ${config.projectPath}`));
  
  if (config.projectType === 'library') {
    console.log(chalk.gray(`   nx build ${config.category}-${config.name}`));
    console.log(chalk.gray(`   nx test ${config.category}-${config.name}`));
    console.log(chalk.yellow('\n💡 Usage in other projects:'));
    console.log(chalk.gray(`   npm install ${config.importPath}`));
    console.log(chalk.gray(`   import { } from '${config.importPath}';`));
    console.log(chalk.yellow('\n🌐 OCE Development:'));
    console.log(chalk.gray('   - Follow OCE interface specifications'));
    console.log(chalk.gray('   - Include comprehensive TypeScript definitions'));
    console.log(chalk.gray('   - Write integration tests with other OCE components'));
    console.log(chalk.gray('   - Document compatibility with OCE ecosystem'));
  } else if (config.projectType === 'application') {
    console.log(chalk.gray(`   btt serve ${config.name}  # Start development server`));
    console.log(chalk.gray(`   nx build ${config.name}   # Build for production`));
    console.log(chalk.gray(`   nx test ${config.name}    # Run tests`));
  } else {
    console.log(chalk.gray(`   btt serve ${config.name}  # Start development server`));
    console.log(chalk.gray(`   nx build ${config.name}   # Build for production`));
  }
  
  console.log(chalk.yellow('\n📖 Resources:'));
  console.log(chalk.gray('   - README.md - Project-specific information'));
  console.log(chalk.gray('   - BIBLE_TRANSLATION_GUIDE.md - Domain-specific guidance'));
  console.log(chalk.gray('   - docs/ - Detailed documentation\n'));
}

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Goodbye!'));
  process.exit(0);
});

createProject(); 