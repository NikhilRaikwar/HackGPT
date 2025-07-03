# Event Insight Bot

Your AI-powered event information assistant. Submit any hackathon or event URL and get instant answers about prizes, rules, deadlines, and more.

## Project info

**URL**: https://lovable.dev/projects/327e44d1-48a5-4979-a509-6a9251fbc45a

## Setup Instructions

### Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials in the `.env` file:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   You can find these values in your Supabase project dashboard:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to Settings > API
   - Copy the Project URL and anon/public key

### Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

### Deployment

When deploying to production, make sure to set the environment variables in your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Security Notes

- Never commit your `.env` file to version control
- The anon key is safe to use in client-side code as it only provides limited access
- Row Level Security (RLS) is enabled on all tables to ensure data privacy
- All sensitive operations are handled server-side through Supabase Edge Functions

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/327e44d1-48a5-4979-a509-6a9251fbc45a) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Set up environment variables (see Setup Instructions above)
cp .env.example .env
# Edit .env with your Supabase credentials

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Database, Authentication, Edge Functions)
- OpenAI API (for embeddings and chat)

## Features

- **Event URL Crawling**: Submit any event URL and the system will crawl and process the content
- **AI-Powered Chat**: Ask questions about events and get intelligent responses
- **Vector Search**: Content is embedded and searchable using semantic similarity
- **User Authentication**: Secure user accounts with Supabase Auth
- **Real-time Updates**: Live status updates during crawling process

## Can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/327e44d1-48a5-4979-a509-6a9251fbc45a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)