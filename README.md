# AntiFriz Roleplay Stuff

[![Foundry VTT](https://img.shields.io/badge/Foundry-v13-informational)](https://foundryvtt.com/)
[![License](https://img.shields.io/github/license/Anti-Friz/antifriz-roleplay-stuff)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/Anti-Friz/antifriz-roleplay-stuff)](https://github.com/Anti-Friz/antifriz-roleplay-stuff/releases/latest)

A Foundry VTT module that enhances roleplay immersion by adding character music players and portrait galleries directly to Actor and Item sheets.

## ✨ Features

### 🎵 Character Music Player
- Add and manage background music tracks for your characters and items
- Built-in audio player with playback controls (play, pause, stop, seek)
- Organize tracks by customizable categories (Theme, Combat, Dramatic, Ambient, etc.)
- **GM Broadcast** - Stream music to specific players or all connected clients
- **Permission System** - Control who can see/play each track (Everyone, Owner, GM Only, or Custom players)
- Persistent music settings per actor/item
- Real-time synchronization across all connected clients

### 🖼️ Portrait Gallery
- Create visual galleries for characters and items
- Separate tabs for **Portraits** and **Tokens** (Actors only)
- One-click switch between portraits/tokens
- **Permission System** - Control visibility per image (Everyone, Owner, GM Only, or Custom players)
- Image search and filtering
- Click to view full-size image popout
- Perfect for character art, items, locations, and more

### ⚙️ Flexible Configuration
- Toggle music and gallery buttons independently for Actors and Items
- **Custom Music Categories** - Create, edit, reorder your own categories with drag & drop
- Granular control through module settings
- Debug mode for troubleshooting

## 📦 Installation

### Via Manifest URL
1. In Foundry VTT, go to **Add-on Modules** tab
2. Click **Install Module**
3. Paste this manifest URL:
   ```
   https://github.com/Anti-Friz/antifriz-roleplay-stuff/releases/latest/download/module.json
   ```
4. Click **Install**

### Manual Installation
1. Download the latest release from [GitHub Releases](https://github.com/Anti-Friz/antifriz-roleplay-stuff/releases)
2. Extract the zip file to your Foundry `Data/modules` directory
3. Restart Foundry VTT
4. Enable the module in your world's **Manage Modules** settings

## 🚀 Usage

### For Actors
1. Open any Actor sheet
2. Look for the 🎵 **Music** and 🖼️ **Gallery** buttons in the header
3. Click to open the respective interface
4. Add tracks or images using the provided controls

### For Items
1. Open any Item sheet
2. Music and Gallery buttons work the same as for Actors
3. Perfect for legendary items with their own themes or visual lore

### Module Settings
Access module settings via **Configure Settings → Module Settings → AntiFriz Roleplay Stuff**:
- **Show Music Button (Actors)** - Toggle music button on Actor sheets
- **Show Gallery Button (Actors)** - Toggle gallery button on Actor sheets
- **Show Music Button (Items)** - Toggle music button on Item sheets
- **Show Gallery Button (Items)** - Toggle gallery button on Item sheets
- **Music Categories** - Configure custom music categories (GM only)
- **Debug Mode** - Enable console logging for troubleshooting

## 🛠️ Technical Details

Built with modern web technologies for optimal performance:
- **[TyphonJS Runtime Library (TRL)](https://github.com/typhonjs-fvtt-lib/runtime)** - Advanced Svelte integration for Foundry VTT
- **[Svelte 4](https://svelte.dev/)** - Reactive UI framework
- **[Vite](https://vitejs.dev/)** - Lightning-fast build tooling
- **ES Modules (ESM)** - Modern JavaScript architecture
- **Socket.io** - Real-time client synchronization

### Project Structure
```
src/
├── apps/                       # SvelteApp application classes
│   ├── characterSheetAddition/ # Music & Gallery apps
│   └── settings/               # Settings apps (Music Categories)
├── config/                     # Module configuration constants
├── hooks/                      # Foundry hooks & settings registration
├── utils/                      # Helper functions (permissions, logger)
├── view/                       # Svelte UI components
│   └── components/             # Reusable Svelte components
└── styles/
    └── components/             # SCSS component stylesheets
```

## 🔧 Development

### Prerequisites
- Node.js 18+ and npm
- Foundry VTT v13+
- Basic knowledge of JavaScript/Svelte (optional)


### Setup
```bash
# Clone the repository
git clone https://github.com/Anti-Friz/antifriz-roleplay-stuff.git
cd antifriz-roleplay-stuff

# Install dependencies
npm install

# Build for production
npm run build

# Run dev server with hot module replacement (HMR)
npm run dev
```

### Development Workflow
1. Run `npm run dev` to start the Vite dev server (port 30001)
2. HMR will automatically update your running module in real-time
3. Make changes to `.mjs`, `.svelte`, or `.scss` files
4. See changes instantly without reloading Foundry

See [`.github/copilot-instructions.md`](.github/copilot-instructions.md) for detailed coding guidelines.

## 🤝 Contributing

Contributions are welcome! Please feel free to:
- Report bugs via [GitHub Issues](https://github.com/Anti-Friz/antifriz-roleplay-stuff/issues)
- Submit feature requests
- Open pull requests with improvements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [TyphonJS Runtime Library](https://github.com/typhonjs-fvtt-lib/runtime)
- Inspired by the Foundry VTT community's creativity
- Thanks to all contributors and testers

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Anti-Friz/antifriz-roleplay-stuff/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Anti-Friz/antifriz-roleplay-stuff/discussions)
- **TyphonJS Discord**: [![TyphonJS Discord](https://img.shields.io/discord/737953117999726592?label=TyphonJS)](https://typhonjs.io/discord/)

---

Made with ❤️ for the Foundry VTT community
