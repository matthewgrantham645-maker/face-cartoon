# Live2D comparison dependencies

- `pixi-6.5.10.min.js`: unchanged browser bundle from https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js ; MIT, `LICENSE-Pixi.txt`. Source: https://github.com/pixijs/pixijs/tree/v6.5.10 .
- `pixi-live2d-display-0.4.0.min.js`: unchanged Cubism 4 bundle from https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.min.js ; MIT, `LICENSE-pixi-live2d.txt`. Source: https://github.com/guansss/pixi-live2d-display/tree/v0.4.0 .
- KalidoKit mapping reference: https://github.com/yeemachine/kalidokit/tree/main/docs/live2d . This adapter changes smoothing to a time-based single stage, shares the app's pose, disables autonomous motion/blink/focus, and applies input before model physics. Mesh and Cubism Z parameters have opposite signs for the same screen-space roll; the two renderer adapters perform that conversion separately.
- Hiyori resources already existed under `docs/models/hiyori/` in this fork; this update does not add or alter those files. These Live2D sample assets have their own terms: https://www.live2d.com/en/learn/sample/model-terms/ . They are not covered by the MIT licenses of the JavaScript adapters.
- **Cubism Core is not included.** Official hosting URL used at runtime: https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js . Download page: https://www.live2d.com/en/sdk/download/web/ . Core remains subject to https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html . Preserve its embedded license notice in an SDK copy.
- The local Python server caches only this fixed official asset in RAM and supports normal system / HTTPS_PROXY settings; the static-app fallback requests the same official host. Users can select a locally obtained SDK Core instead. That path is ignored by git. No alternative third-party Core mirrors are used.
- Pixi application's automatic ticker and Live2D autoUpdate are disabled. The app's one animation loop drives both renderers; the reference is capped at 30 draws/sec and stops drawing while hidden.

Bundle checksums:

- `pixi-6.5.10.min.js`: SHA-256 `403f2f2ee8145fa17f60c5c89403056efe2680e5096ec2762036486914ed19c5`
- `pixi-live2d-display-0.4.0.min.js`: SHA-256 `af1267e6d52759b245766c578d905bfa025b532d5c3cc727c370957c4409e21b`
