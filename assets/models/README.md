# Mixamo Character Models

## 📂 Directory Structure

Place your Mixamo character models in this directory:

```
/assets/models/
  ├── Player_Aj.glb          # Player character model
  ├── NPC_Ty.glb              # NPC variant 1
  ├── NPC_Rufus.glb           # NPC variant 2
  ├── NPC_Malcolm.glb         # NPC variant 3
  └── animations/
      ├── Idle.glb
      ├── Walk.glb
      ├── Run.glb
      ├── Jump.glb
      └── Fall.glb
```

## 📥 How to Get Models

1. Visit [Mixamo.com](https://www.mixamo.com/)
2. Sign in with Adobe ID (free)
3. Select characters and animations
4. Download as **glTF Binary (.glb)** format
5. Place files in this directory

## ✅ Automatic Detection

The game will automatically detect if Mixamo models are available:
- ✅ **Models found**: Uses realistic Mixamo characters
- ⚠️ **Models not found**: Uses procedural rigged fallback
- 🔄 **Fallback system**: Ensures game always works

## 📖 Full Documentation

See `/MIXAMO_SETUP.md` in the project root for detailed setup instructions.

## 🎮 Current Mode

The game is currently running in **PROCEDURAL FALLBACK MODE**.
Add Mixamo models to enable realistic characters automatically.
