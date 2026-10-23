# mesh-avatar runtime

- Project: https://github.com/shinshin86/mesh-avatar-studio
- Package: `mesh-avatar@0.2.1`
- Package source commit: `a0ecf112bf01ffa266886a78980d9b5f58229bd6`
- Distribution: https://registry.npmjs.org/mesh-avatar/-/mesh-avatar-0.2.1.tgz
- `mesh-avatar-0.2.1.mjs` starts from package `dist/index.js`, renamed for ESM loading, with the portrait-v9/v10 local patches described below.
- Package tarball SHA-512: `ivddBt81dayDE+kh4gYUmLzZt6CRBGBvZdjgGu0wwffeM0l1U70OfwCTfpiYYRRQOzWj/6pPxiaDW5iylFKpjw==`
- MIT license: `LICENSE-mesh-avatar.md`. The bundled fflate notice remains at the top of the distribution.
- No upstream sample artwork is included. This project supplies its own illustration and rig.

The layer-building utility is also retained under `tools/mesh-avatar/`, with its source reference and license attribution. Running that offline tool requires Pillow, NumPy and OpenCV; playing the avatar does not require them.

## Local portrait-v9/v10 patches

These changes are local and are not claimed to exist in upstream mesh-avatar@0.2.1. They activate only for `rig.portrait: {version: 2, teeth: false}`; the original example and standard archives retain their old behavior.

- `built/subject.png` supplies per-vertex deformation weights. Background and picture borders remain pinned; the mask combines edge-connected background exclusion with a conservative feathered head region. This is not semantic 3D reconstruction or a general-purpose segmentation model.
- Matching CPU/GLSL eyelid closure moves both edges to the same line. With `portrait.blinkLid: true`, the builder stores a continuous closure-only stroke in the existing crease asset, rather than painting it into the original lash. It follows lash deformation and fades in only below 0.55 openness (full opacity at 0.15), so fully open eyes retain their original pixels. Older v9 portrait archives still load; rebuilding from source is necessary to remove their baked-in line.
- `built/mouth_upper.png` and `built/mouth_lower.png` retain lip texture. Their vertices move around a continuous, size-relative mouth aperture. CPU and GLSL share the same rotated coordinates, rounded square-root profile, restrained width range (0.94–0.86 half-width) and maximum gap of 0.24 half-width (12% full width); the builder splits lip pixels along the matching fitted curve. Portrait shaders disable teeth and reduce tongue saturation.
- Archive validation requires the three portrait assets and checks mask dimensions at load time. Existing standard archives do not need them.

The original MIT and fflate notices are retained. Tests cover old archive round trips, portrait archive round trips, pixel-exact open-eye layer reconstruction, visible closed lids, bounded continuous tooth-free aperture, pinned patterned background and live parameter integration.
