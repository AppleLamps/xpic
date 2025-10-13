<div align="center">

# 𝕏-pressionist

### Your 𝕏 profile, visualized by AI

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 📖 Overview

**𝕏-pressionist** is an AI-powered web application that transforms X (formerly Twitter) profiles into unique, artistic visualizations. By analyzing an X account's posts and personality, the app generates humorous and creative cartoon-style images that capture the essence of the account.

The application leverages cutting-edge AI models:
- **Grok-4-Fast** for intelligent account analysis and prompt generation
- **Gemini 2.5 Flash Image** for high-quality image generation

## ✨ Features

- **AI-Powered Analysis**: Analyzes X account posts to understand personality and themes
- **Unique Image Generation**: Creates custom cartoon-style visualizations based on account analysis
- **Prompt History Sidebar**: Save and manage up to 50 generated prompts with local storage
- **One-Click Download**: Download generated images instantly
- **Copy Prompts**: Easily copy generated prompts to clipboard
- **Responsive Design**: Beautiful glass-morphism UI that works on all devices
- **Smart Caching**: Efficient caching system to reduce API costs and improve performance
- **Keyboard Shortcuts**: Quick access with `Ctrl/Cmd + B` to toggle sidebar

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager
- Supabase account (for backend functions)
- API keys for:
  - xAI (Grok API)
  - OpenRouter (for Gemini access)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AppleLamps/xpic.git
   cd xpic
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory with your Supabase configuration:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Configure Supabase Edge Functions**

   Set up the following secrets in your Supabase project:
   ```bash
   XAI_API_KEY=your_xai_api_key
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to `http://localhost:5173`

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Sonner** - Toast notifications

### Backend
- **Supabase** - Backend as a Service
- **Supabase Edge Functions** - Serverless functions
- **PostgreSQL** - Database for caching

### AI Services
- **xAI Grok-4-Fast** - Account analysis and prompt generation
- **Google Gemini 2.5 Flash Image** - Image generation via OpenRouter

## 📁 Project Structure

```
xpic/
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   └── PromptHistorySidebar.tsx
│   ├── hooks/            # Custom React hooks
│   ├── integrations/     # Supabase integration
│   ├── pages/            # Page components
│   ├── lib/              # Utility functions
│   └── App.tsx           # Main app component
├── supabase/
│   ├── functions/        # Edge functions
│   │   ├── analyze-account/
│   │   └── generate-image/
│   └── migrations/       # Database migrations
├── public/               # Static assets
└── package.json
```

## 🎯 Usage

1. **Enter an X Handle**: Type any X (Twitter) username in the input field
2. **Generate Image**: Click the "Generate Image" button
3. **View Results**: The AI will analyze the account and generate a unique image
4. **Download or Copy**: Download the image or copy the prompt for later use
5. **Access History**: Use the sidebar (sparkle icon) to view your generation history

For detailed usage instructions, see [USAGE_GUIDE.md](./USAGE_GUIDE.md)

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🌐 Deployment

The application can be deployed to any static hosting service:

- **Vercel**: Connect your GitHub repository
- **Netlify**: Deploy with continuous integration
- **Cloudflare Pages**: Fast global CDN deployment

Make sure to configure environment variables in your hosting platform.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 👨‍💻 Creator

**Apple Lamps**
- X (Twitter): [@lamps_apple](https://x.com/lamps_apple)
- GitHub: [@AppleLamps](https://github.com/AppleLamps)

## 💖 Support

If you find this project useful, consider supporting the API costs:

- [Buy Me a Coffee](https://buymeacoffee.com/applelampsg)
- [Cash App: $applelamps](https://cash.app/$applelamps)

## 🙏 Acknowledgments

- Special thanks to all donors who help cover API costs
- Built with [shadcn/ui](https://ui.shadcn.com/) components
- Powered by [xAI Grok](https://x.ai/) and [Google Gemini](https://deepmind.google/technologies/gemini/)

---

<div align="center">

Made with ⚡ by [Apple Lamps](https://x.com/lamps_apple)

</div>
