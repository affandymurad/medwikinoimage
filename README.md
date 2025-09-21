# README.md

# medwikinoimage

medwikinoimage is a Node.js tool for analyzing wiki markup source code from https://mdwiki.org/wiki/Main_Page. It reads wiki markup from `input.txt`, checks each MedWiki article link, and automatically identifies articles that **do not** contain images. The results are written to a numbered output file (e.g., `output1.txt`, `output2.txt`, etc.) in the same directory.

Google Docs result sample = https://docs.google.com/document/d/1V1m1ehXtt0AYOMw7iCulfR8Di9Vdw7QvXqz-xM6H7o4/edit?usp=sharing

## Features

- Reads wiki markup source code from `input.txt`
- Detects and lists MedWiki article links that do **not** contain images
- Writes the results to a numbered output file (e.g., `output1.txt`, `output2.txt`, etc.)

## Prerequisites

- Node.js v16 or higher
- npm

## Installation

1. Clone the repository:
   ```sh
   git clone <your-repo-url>
   cd medwikinoimage
   ```
2. Install dependencies:
   ```sh
   npm install
   ```

## Usage

1. Place your wiki markup source code in a file named `input.txt` in the project directory.
2. Run the tool:
   ```sh
   node index.js
   ```
3. The tool will process `input.txt` and write the results to a new output file (e.g., `output1.txt`).

## Customization

- You can modify the processing logic in `index.js` to suit your specific wiki markup format or requirements.

## License

ISC