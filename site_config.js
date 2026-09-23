// Site-level defaults for mujoco-wasm-play.
//
// Aggregator deployments can override this file to pin a default MuJoCo/forge
// dist id without patching any Play JS modules.
globalThis.PLAY_VER = '3.5.0';

// GitHub Pages serves this project below /Mujoco-Franka/, so keep the runtime
// distribution path relative to the site root rather than the domain root.
globalThis.__FORGE_DIST_BASE__ = './dist/{ver}/';

// Open the bundled Franka Panda model automatically on the public demo.
globalThis.PLAY_MODEL = 'local_model/franka_emika_panda/scene.xml';

// Optional: host built-in HDRI/EXR environment assets from a shared CDN bucket
// or object store instead of the repo-local `assets/env/` directory.
// globalThis.PLAY_ENV_ASSET_BASE = 'https://static.example.com/play-env/';
