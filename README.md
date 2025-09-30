# Folio

Folio is a minimalist, performant, and clean static site generator for hosting novels. Built with Next.js and Tailwind CSS, it transforms your Markdown files into a beautiful, responsive, and easily readable website.

## Features

- Blazing Fast Performance: Built with Next.js Static Site Generation (SSG) for instant page loads.
- Markdown-Based: Write your chapters in standard Markdown.
- Simple Data Structure: All content is managed through a simple file and folder structure—no database needed.
- Responsive & Minimalist Design: A clean, readable interface that works perfectly on desktop and mobile.
- Automatic Dark Mode: Adapts to the user's system-level light or dark theme.
- Interactive Homepage: Group novels by genre or author, and sort them by date or title.
- Localization Support: UI text can be easily translated by editing simple JSON files.

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm (comes with Node.js)

### Installation

1. Clone the repository:

   ```shell
   git clone https://github.com/cty012/folio.git
   cd folio
   ```

2. Install dependencies:

   ```shell
   npm install
   ```

3. Run the development server:

   ```shell
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How to Add Content

All your novel data and content live in the `/data` directory.

### Content Structure

The project uses a specific folder structure to organize novels and chapters:

```
/data
├── settings.json
└── [novel-id]/
    ├── index.json
    └── chapter-1.md
    └── chapter-2.md
    └── ...
```

- `settings.json`: Contains global site settings, such as the language ("language": "en").
- `[novel-id]/`: A folder for each novel. The folder name can be any unique identifier for the novel.
- `index.json`: Holds all the metadata for a single novel, including its title, author, description, and a list of chapters.
- `chapter-[number].md`: The actual content for each chapter, written in Markdown. The file name must correspond to the chapter number defined in index.json.

## Building for Production

This project is configured to export a fully static website, which can be hosted on any static hosting service (like GitHub Pages, Vercel, or Netlify).

> Note: The project needs to be rebuilt each time you add or modify content in the `/data` directory.

1. Run the build command:

   ```shell
   npm run build
   ```

2. Find the output:

   The complete, standalone website will be generated in the `/out` folder. You can upload the contents of this folder to your hosting provider, or set up CI/CD to automate deployment.

To test the production build locally, you can use a simple server:

```shell
# Navigate into the output directory
cd out

# Use Python's built-in server (if you have Python 3)
python -m http.server
```

## Technology Stack

- Framework: Next.js
- Styling: Tailwind CSS with the Typography plugin
- Language: TypeScript
- Markdown Processing: Remark
