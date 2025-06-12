# BT-Toolkit CLI

🛠️ Command-line interface for the BT-Toolkit monorepo

## Installation

The CLI is automatically available when you're working in the BT-Toolkit repository:

```bash
# Install dependencies (includes CLI)
npm install

# Link CLI for global usage (optional)
npm link
```

## Usage

```bash
btt <command> [options]
```

## Commands

### `btt create`

Interactive project creation wizard that helps you create:

- **📦 Libraries** - Reusable components for developers
  - `core` - Scripture utilities, text processing, foundational tools
  - `components` - React/UI components for translation interfaces  
  - `formats` - USFM, USX, OSIS parsers and converters
  - `analysis` - Quality checks, consistency validation
  - `utilities` - General-purpose helper functions

- **🚀 Applications** - Tools for translators or developers
  - `translation-tools` - Apps for Bible translators
  - `developer-tools` - Tools for developers and tech teams
  - `demos` - Example applications and showcases

- **📚 Documentation/Blog** - Astro sites for community content

### `btt help`

Show help information and available commands.

### `btt version`

Show the current version of BT-Toolkit CLI.

## Examples

```bash
# Create a new project (interactive)
btt create

# Show help
btt help

# Show version
btt version
```

## Project Structure

The CLI creates projects in the following structure:

```
bt-toolkit/
├── packages/           # Libraries (OCE components)
│   ├── core/          # Core utilities
│   ├── components/    # UI components  
│   ├── formats/       # Format parsers
│   ├── analysis/      # Quality tools
│   └── utilities/     # Helper functions
├── apps/              # Applications
│   ├── translation-tools/  # For translators
│   ├── developer-tools/    # For developers
│   ├── demos/             # Examples
│   └── community/         # Documentation sites
└── scripts/           # Build and utility scripts
```

## Development

The CLI is built using Node.js and integrates with Nx for project generation.

- Main CLI entry: `bin/btt.js`
- Project creation logic: `scripts/create-project.js`
- Configuration: `package.json` (bin field)

## Troubleshooting

### Command not found

If you get "command not found" error:

```bash
# Make sure you've installed dependencies
npm install

# Link the CLI globally
npm link

# Or run directly
./bin/btt.js help
```

### Permission errors

On Unix systems, make sure the script is executable:

```bash
chmod +x bin/btt.js
```

## Contributing

See the main [Contributing Guide](CONTRIBUTING.md) for development guidelines. 