> Interactive wizard: docs/artifacts/VetAssistBrainstormWizard_DualScope.jsx (locked 2026-05-02)

# VETASSIST PRE-1: MENTALROBERTA CRISIS DETECTOR SWAP
Captured: 4/29/2026

---

## SIGNAL ACQUISITION — How the Model Reads the Room

What is the primary detection strategy?
[ ] MentalRoBERTa semantic classifier only: Catches nuanced intent keyword lists miss ("I just want it all to stop"); adds ~100–200ms CPU latency per request.
[ ] Keyword regex primary + MentalRoBERTa secondary escalation: Zero-latency first pass, ML catches what regex misses; two code paths to maintain and keep in sync.
[ ] MentalRoBERTa primary + keyword regex safety net: ML leads, regex is the hard floor that catches model blind spots; defense-in-depth at ~100–250ms total.
[ ] Ensemble: regex score + model confidence averaged into a single signal: Most robust, hardest to tune; threshold calibration requires labeled veteran-specific data.

What confidence threshold fires the CrisisLineBanner?
[ ] >= 0.70 (aggressive): Lowest false-negative rate; vets see the banner more than strictly necessary; errs on the side of safety.
[ ] >= 0.80 (balanced): Tuned to MentalRoBERTa's published F1 on SuicideWatch benchmark data; recommended starting point.
[ ] >= 0.85 (conservative): Fewer false positives; higher risk of missing a genuine crisis; only acceptable if keyword safety net is running in parallel.
[ ] Threshold is a named constant in packages/shared-config, hot-swappable without redeploy: Required by zero-hardcoded-values standard regardless of which value is chosen.

What happens when MentalRoBERTa is unavailable (model load failure, OOM, cold start timeout)?
[ ] Fail open -> fall back to keyword regex silently: Banner still fires on known crisis keywords; no user-facing error; degraded mode is invisible.
[ ] Fail open -> fall back to keyword regex + emit CriticalAlert event on Observer bus: Keyword fallback runs immediately; downstream subscribers (logging, on-call) react to the alert event; no polling.
[ ] Fail closed -> block the request and surface a safe error page: Maximally safe from liability standpoint; worst user experience; only viable with near-100% model uptime.

---

## THE MODEL'S HOME — Runtime and Hosting

Where does MentalRoBERTa inference execute?
[ ] In-process Node.js via onnxruntime-node (ONNX export): Model runs inside the Fastify API process; no extra service to deploy; adds ~150MB RAM; requires ONNX export step in CI.
[ ] Python sidecar (FastAPI + HuggingFace transformers): Best ecosystem fit for the model; runs as a separate Railway service; inter-process HTTP call adds ~5–20ms overhead on top of inference.
[ ] Hugging Face Inference API free tier: Zero infra and RAM cost; adds ~200–500ms network hop; free tier rate limits could cause crisis detection to silently skip under load.
[ ] Ollama local model server (carried from Bob): Already in Marcus's stack; MentalRoBERTa is not a standard Ollama model and requires manual GGUF conversion — non-trivial.

Where does the model artifact live?
[ ] Downloaded at Railway container startup from HuggingFace Hub, pinned to commit SHA: Always reproducible; adds cold-start latency; SHA pinned in packages/shared-config as named constant.
[ ] Stored in Railway persistent volume, downloaded once on first deploy: Eliminates repeated download cost; decouples model version from code deploys; volume management adds ops surface.
[ ] Bundled via Git LFS (carried from IslandEscape): Model weights version-controlled with code; works offline; ~500MB LFS object; LFS already configured in Marcus's git.

If using ONNX in-process, what is the export strategy?
[ ] Export at CI build time via HuggingFace optimum CLI (quantized INT8): Official path; deterministic; adds a build step; quantized model is ~4x smaller and faster on CPU.
[ ] Use a pre-exported ONNX from HuggingFace Hub ONNX community repo: Fastest setup; less control over quantization; verify Apache 2.0 license compatibility before shipping.
[ ] Skip ONNX entirely — use Python sidecar with native PyTorch: No conversion complexity; larger memory footprint; sidecar architecture required.

---

## PIPELINE WIRING — Where It Lives in the Data Flow

Where in the VetAssist critical data flow does the detector run?
[ ] After PII scrubber middleware, before AI Orchestrator (mirrors current keyword position): Consistent with the existing flow diagram; text is already PII-clean when the model sees it.
[ ] As a Fastify onRequest hook, parallel to PII scrubber (both resolve before handler proceeds): Reduces total latency by ~40%; requires Promise.all coordination; both must complete before any response.
[ ] Inside packages/ai-engine as a named pre-processor gate: Keeps AI-adjacent logic in one package; slightly couples the engine to safety logic; cleaner than scattering it across middleware.

How does the detector publish its result?
[ ] Emits a typed CrisisSignal event on the Observer bus (packages/shared-types): Zero coupling; any subscriber reacts independently; consistent with Observer pattern standard.
[ ] Returns CrisisResult inline in middleware response, no event bus: Simpler for MVP; couples the caller to the detector's return type; adding subscribers later requires modifying call sites.
[ ] Emits CrisisSignal event AND returns inline result: Observer for side effects (audit log, moderation queue), inline for immediate banner trigger; belt-and-suspenders.

What TypeScript contract does the detector expose?
[ ] Interface CrisisDetector { detect(text: string): Promise<CrisisResult> } where CrisisResult = { triggered: boolean; confidence: number; method: 'ml' | 'regex' | 'ensemble' }: Typed, auditable, mockable in tests.
[ ] Standalone function detectCrisis(text: string): Promise<boolean>: Simplest contract; discards confidence score needed for threshold tuning and compliance audit log.
[ ] Class CrisisDetector with private model handle and config injected at construction, public detect() only: Most restrictive access per universal-coding-standards; model handle never leaks; preferred.

---

## COMPLIANCE FORTRESS — Audit, Logging, and the Non-Dismissable Banner

What gets written to the audit log when detection fires?
[ ] Event type + confidence score + detection method + timestamp (no text, no PII): Rich enough for threshold tuning and compliance review; zero reconstruction risk.
[ ] Event type + timestamp only: Minimum viable audit trail; compliant; loses the confidence score data needed to tune the threshold over time.
[ ] Full structured CrisisAuditEvent emitted as Observer event to a dedicated crisis audit stream: Decoupled; new audit consumers (compliance dashboard, export) subscribe without touching detection logic.

How is CrisisLineBanner non-dismissable enforced at the component level?
[ ] No onDismiss prop exists in CrisisLineBanner's TypeScript interface: Interface-level enforcement; impossible to accidentally wire a close button; preferred.
[ ] CrisisLineBanner rendered at layout level above all page content (not inside page components): Structural enforcement; pages cannot conditionally suppress it by not rendering it.
[ ] Both — interface has no dismiss prop AND it renders at layout level: Defense-in-depth; neither code nor structure can suppress the banner.

What test coverage gates the merge?
[ ] >= 20 labeled crisis/non-crisis samples with veteran-specific phrasing (matches npx turbo test:pii 20-case standard): Minimum bar; covers combat trauma, survivor guilt, and MST-adjacent phrasing.
[ ] Integration test: raw text input -> CrisisLineBanner renders, no mocks on the detector itself: Catches model load failures and pipeline wiring bugs that unit tests miss.
[ ] Adversarial cases: obfuscated spelling, mixed-language input, sarcasm markers: Required before any public-facing traffic; MentalRoBERTa was not trained on adversarial inputs.
[ ] npx turbo test:compliance green before merge: Non-negotiable per VetAssist CLAUDE.md.

---

## PERFORMANCE AND COLD START — The Railway Reality

What is the acceptable p95 latency budget for the detector?
[ ] < 150ms: Achievable with quantized ONNX INT8 on Railway CPU; tight but realistic.
[ ] < 300ms: Comfortable for CPU inference; adds noticeable latency to first AI response; acceptable with a loading state.
[ ] < 500ms with user-visible loading indicator: Worst option for crisis UX — speed matters when someone is in distress; only accept if no other option exists.

What is the cold-start mitigation strategy on Railway?
[ ] Pre-warm model handle at Fastify server startup, cache in module scope: Model loads once at boot; all subsequent requests pay inference cost only; standard pattern.
[ ] Keep-alive ping from Bob's GitHub Actions schedule (carried from Bob): Bob already runs weekdays 6 AM PST; extend it to ping the VetAssist health endpoint — zero additional cost.
[ ] Railway always-on instance (paid add-on): Eliminates cold starts entirely; increases monthly cost; revisit after MVP traffic data justifies it.

How is the model version pinned to prevent silent regression?
[ ] Model commit SHA stored as named constant in packages/shared-config: Deterministic; zero-hardcoded-values compliant; SHA changes are a tracked code change.
[ ] Model artifact SHA-256 hash verified at startup against a config value: Integrity-checked; catches corrupted downloads or tampered weights before they serve predictions.
[ ] Both SHA pin + startup hash verification: Belt-and-suspenders; pin controls which model, hash ensures what arrived is what was pinned.
