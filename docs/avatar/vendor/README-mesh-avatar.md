# mesh-avatar runtime

- Project: https://github.com/shinshin86/mesh-avatar-studio
- Package: `mesh-avatar@0.2.1`
- Package source commit: `a0ecf112bf01ffa266886a78980d9b5f58229bd6`
- Distribution: https://registry.npmjs.org/mesh-avatar/-/mesh-avatar-0.2.1.tgz
- `mesh-avatar-0.2.1.mjs` starts from package `dist/index.js`, renamed for ESM loading, with the portrait-v9 local patches described below.
- Package tarball SHA-512: `ivddBt81dayDE+kh4gYUmLzZt6CRBGBvZdjgGu0wwffeM0l1U70OfwCTfpiYYRRQOzWj/6pPxiaDW5iylFKpjw==`
- MIT license: `LICENSE-mesh-avatar.md`. The bundled fflate notice remains at the top of the distribution.
- No upstream sample artwork is included. This project supplies its own illustration and rig.

The layer-building utility is also retained under `tools/mesh-avatar/`, with its source reference and license attribution. Running that offline tool requires Pillow, NumPy and OpenCV; playing the avatar does not require them.

## Local portrait-v9 patches

These changes are local and are not claimed to exist in upstream mesh-avatar@0.2.1. They activate only for `rig.portrait: {version: 2, teeth: false}`; the original example and standard archives retain their old behavior.

- `built/subject.png` supplies per-vertex deformation weights. Background and picture borders remain pinned; the mask combines edge-connected background exclusion with a conservative feathered head region. This is not semantic 3D reconstruction or a general-purpose segmentation model.
- Matching CPU/GLSL eyelid closure moves both edges to the same line. The builder retains a continuous upper-lid stroke, so closing an eye does not erase the eyelid.
- `built/mouth_upper.png` and `built/mouth_lower.png` retain lip texture. Their vertices move around a continuous, size-relative mouth aperture. Portrait shaders disable teeth and reduce tongue saturation.
- Archive validation requires the three portrait assets and checks mask dimensions at load time. Existing standard archives do not need them.

The original MIT and fflate notices are retained. Tests cover old archive round trips, portrait archive round trips, visible closed lids, tooth-free aperture, pinned patterned background and live parameter integration.
