# Recipe Tracker

A web application for tracking cooking recipes as they evolve over time, with version history stored in GitHub.

## Features

- 🔐 **GitHub Authentication** - Sign in with your GitHub account
- 📝 **Recipe Management** - Create, edit, and organize your recipes
- 📸 **Image Support** - Upload and manage images for your recipes
- 📚 **Recipe Book** - Organize all your recipes in one place
- 📊 **Version History** - Track changes to recipes over time using Git commits
- 💾 **GitHub Storage** - All recipes are stored in a private GitHub repository

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A GitHub account
- A GitHub OAuth App

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create a GitHub OAuth App:**
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click "New OAuth App"
   - Set Application name: "Recipe Tracker" (or any name)
   - Set Homepage URL: `http://localhost:3000` (for development)
   - Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
   - Click "Register application"
   - Copy the Client ID and generate a Client Secret

3. **Configure environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_random_secret_here
   GITHUB_REPO_NAME=recipes
   ```
   
   Generate a random secret for `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## How It Works

### Repository Structure

When you first sign in, the app creates a private GitHub repository (default name: `recipes`). Recipes are organized as follows:

```
recipes/
├── recipe-name/
│   ├── recipe-name.txt
│   └── images/
│       └── (recipe images)
├── another-recipe/
│   ├── another-recipe.txt
│   └── images/
│       └── (recipe images)
└── ...
```

### Recipe Format

Recipes are stored in a simple text format:

```
Recipe: Chocolate Cake

Ingredients:
- 2 cups (240 g) all-purpose flour
- 2 cups (396 g) sugar
- ...

Instructions:
- Add flour, sugar, cocoa...
- Mix together on medium speed...
```

### Version Tracking

Every time you update a recipe, a new Git commit is created with your changes. You can view the full history of changes in the recipe view.

## Development

### Project Structure

```
├── pages/
│   ├── api/
│   │   ├── auth/          # NextAuth authentication
│   │   └── recipes/       # Recipe API endpoints
│   ├── recipes/           # Recipe pages (view, edit, create)
│   └── index.tsx          # Home page
├── lib/
│   └── github.ts          # GitHub API utilities
├── types/
│   └── next-auth.d.ts     # TypeScript type definitions
└── styles/
    └── globals.css         # Global styles
```

### Tech Stack

- **Next.js 14** - React framework
- **NextAuth.js** - Authentication
- **Octokit** - GitHub API client
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Update GitHub OAuth App callback URL to your Vercel domain
5. Deploy!

### Other Platforms

Make sure to:
- Set `NEXTAUTH_URL` to your production URL
- Update GitHub OAuth App callback URL
- Set all required environment variables

## License

MIT

