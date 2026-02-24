# Claude Code Deobfuscator

A specialized two-pass de-obfuscator for Anthropic's Claude Code CLI, leveraging Gemini 2.5-flash-lite for initial labeling and Gemini 3-flash-preview for global consistency.

## Important Legal Notice

**Due to legal issues, the source code for Claude Code is NOT provided with this project.** Users must obtain the Claude Code source code themselves and place it in the appropriate location before running this tool.

## Prerequisites

- Node.js 18+
- Gemini API Key

## Installation

```bash
npm install
```

## Setup

1. Obtain Claude Code source code (not included due to legal restrictions)
2. Place your Claude Code JavaScript file in this directory
3. Set your Gemini API key:

```bash
export GEMINI_API_KEY="your-api-key-here"
```

## Usage

```bash
node deobfuscate.js <path-to-claude-code-js-file>
```

## How It Works

**Pass 1:** Uses Gemini 2.5-flash-lite to de-obfuscate the code in chunks, renaming variables and functions to descriptive names.

**Pass 2:** Uses Gemini 3-flash-preview to analyze the entire codebase for global consistency, ensuring consistent naming across the entire file.

## Output Files

- `*.pass1.js` - Output from Pass 1
- `*.final.js` - Final de-obfuscated output after Pass 2

## API Configuration

You can customize the models used:

```bash
export PASS1_MODEL="gemini-2.5-flash-lite"
export PASS2_MODEL="gemini-3-flash-preview"
```

## Pricing

- Pass 1 (2.5-flash-lite): $0.10/M input, $0.40/M output
- Pass 2 (3-flash-preview): $0.50/M input, $3.00/M output

## License

MIT
