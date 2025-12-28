# Terrain Assets

## 📂 Directory Structure

Place your terrain GLB/GLTF models in this directory:

```
/assets/terrain/
  ├── volcanic-highland.glb    # Main terrain (default path)
  ├── normal.png               # Normal map (optional)
  ├── ao.png                   # Ambient occlusion map (optional)
  └── README.md                # This file
```

## 📥 How to Add Terrain

1. **Export from your 3D software** (Blender, Maya, etc.)
   - Export as **glTF Binary (.glb)** or **glTF (.gltf)**
   - Recommended format: `.glb` (single file with embedded textures)
   - Ensure meshes have proper normals and UVs

2. **Place the file** in `/assets/terrain/`
   - Default name: `volcanic-highland.glb`
   - Or use a custom path with `loadTerrain('/assets/terrain/your-file.glb')`

3. **Optimize for performance**
   - Keep poly count reasonable (< 100k triangles recommended)
   - Use texture compression if possible
   - Bake lighting/shadows into textures for better performance

## ✅ Automatic Fallback

The terrain system has built-in fallback handling:
- ✅ **Terrain file found**: Loads your custom GLB terrain
- ⚠️ **File not found**: Uses flat plane (1000x1000) as fallback
- 🔄 **Error handling**: Detailed error messages guide you to fix issues

## 🛠️ Expected File Format

- **Format**: glTF Binary (.glb) or glTF (.gltf)
- **Content Type**: `model/gltf-binary` or `model/gltf+json`
- **Texture Support**: Embedded or external PNG/JPG textures
- **Materials**: PBR materials (roughness/metalness supported)

## 🐛 Troubleshooting

If you see errors in the console:

### "Terrain file not found (404)"
- Verify the file exists at `/assets/terrain/volcanic-highland.glb`
- Check file name spelling and case sensitivity
- Ensure the dev server is serving the assets directory

### "Invalid content type"
- Re-export from your 3D software as GLB format
- Verify the file is not corrupted (try opening in a GLB viewer)

### "Invalid GLB/GLTF Format"
- The file may be corrupted
- Try re-exporting from your 3D software
- Validate the GLB using online tools like [glTF Validator](https://github.khronos.org/glTF-Validator/)

## 🎮 Current Mode

The game is currently running in **FALLBACK TERRAIN MODE**.
Add a terrain GLB file to enable custom terrain automatically.

## 📖 More Information

See the TerrainImporter class in `/js/terrain-importer.js` for implementation details.
