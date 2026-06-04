---
name: llm-competitor
description: "Procedures for competing in LLM-era ML competitions — NLP/text classification, LLM fine-tuning tracks, and prompt/agent contests. Use when the task is a text or LLM competition graded by a hidden metric under latency/memory caps: rebuild the metric locally first, climb the prompt→few-shot→LoRA→full-finetune efficiency ladder only as far as the eval demands, audit label/data quality before touching architecture, and report mean of 3 seeds. Use when asked to improve an NLP leaderboard score, fine-tune a model for a contest, engineer a prompt against a held-out set, or check a text dataset for contamination/leakage."
version: 1.0.0
author: re-forge
license: MIT
tags: [llm, nlp, competition, fine-tuning, lora, qlora, prompt-engineering, evaluation, contamination, data-centric]
---

# LLM Competitor

Procedures for running an LLM-era ML competition the way strong competitors do: an
**NLP/text** contest, an **LLM fine-tuning** track, or a **prompt/agent** contest. This is the
text-and-LLM specialization of general competition practice; the broad six-phase backbone
(detect metric → plan → fan out → adversarially verify → evaluate-gate → ship) is inherited
from the `ml-competition` skill. Read that first if the task has a `train.csv`/`sample_submission`
shape; this skill fills the LLM-specific content: the eval rebuild, the efficiency ladder, the
data-centric loop, inference-budget realism, and the failure-mode list.

**Scope and honesty.** This skill has a deliberately thin evidence base. Where a claim is
well-established public practice it is stated plainly; where a choice is contested or
context-dependent it is marked as such. Do not overclaim. When a number would help, prefer
"measure it on your held-out set" over a borrowed constant.

## Operating principles

- **The hidden metric is the only judge; your local rebuild of it is your ground truth.** A
  leaderboard scores a fraction of a hidden set and is the largest source of self-deception.
  Trust a faithful local eval; treat each public-LB move as a weak signal until the local
  eval agrees.
- **Climb the efficiency ladder only as far as the eval demands.** Prompt → few-shot →
  LoRA/QLoRA → full fine-tune. Each rung costs more and overfits more easily; stop at the
  cheapest rung that clears the bar.
- **Data quality beats architecture changes.** A label audit, a deduplication pass, or a
  contamination check usually moves the metric more than swapping a model. Spend there first.
- **Grade under the real budget.** Most LLM contests cap latency and/or memory. A solution
  that wins offline but violates the cap scores zero. Measure latency/memory from the start.
- **Report mean of ≥3 seeds.** LLM fine-tuning and few-shot results have real seed variance;
  a single run is not a result.

## Phase A — EVAL-FIRST: rebuild the competition metric locally

Do this **before touching a model.** A model you cannot score faithfully is a model you are
tuning blind.

1. **Pin the exact metric and its direction.** Macro-F1 vs micro-F1, exact-match vs token-F1,
   ROUGE-L vs ROUGE-1, pass@1 vs pass@k, BLEU variant, a custom weighted score — each changes
   the whole strategy. Read the rules; if ambiguous, dispatch the `research` skill for the
   public metric definition. Confirm whether higher or lower wins.
2. **Re-implement the scorer and unit-test it.** Reproduce the official scorer (or wrap the
   official script) and verify it on any provided examples until your numbers match the
   public baseline to the decimal. If they do not match, you have the wrong metric — stop and
   fix it.
3. **Carve a held-out set the model never sees.** Split a portion of labelled data the model
   (and, for prompt contests, the **prompt-author**) never reads. For prompt/agent contests
   this is non-negotiable: prompts iterated against examples you keep staring at silently
   memorize them. Keep a **blind** slice you only score on, never inspect.
4. **Lock the validation scheme to the task structure.** Stratify by label for imbalanced
   classification; group by document/author/source when rows share an entity (GroupKFold) so
   the same entity never spans train and held-out; respect time order for temporal text.
5. **Establish baselines.** A trivial baseline (majority class / copy-input / empty answer)
   and one cheap real baseline (a zero-shot prompt, or a small fine-tuned encoder like a BERT
   family model for classification) set the floor and validate the harness end-to-end.

Exit: the local scorer reproduces the public baseline, a blind held-out set exists, the
validation scheme matches the data structure, and a baseline number is recorded.

## Phase B — THE EFFICIENCY LADDER: stop at the cheapest rung that clears the bar

Climb in order; promote to the next rung only when the current rung plateaus below target on
your held-out set. Each rung is more expensive and more prone to overfitting.

1. **Prompt engineering (rung 0).** Cheapest, no training. Write a clear instruction with an
   explicit output schema; constrain the output format so it is machine-scorable. Add
   reasoning steps only when the task is genuinely multi-step — chain-of-thought helps
   arithmetic/multi-hop reasoning but adds latency without accuracy gain on plain
   classification (Wei et al. 2022, arXiv:2201.11903). For format guarantees use constrained
   decoding (`outlines`/`guidance`) or structured-output APIs.
2. **Few-shot / in-context (rung 1).** Add 3–8 labelled exemplars. Choose **edge cases**, not
   prototypes; include one "tricky" example per class. Balance classes. Few-shot frequently
   closes most of the gap to a small fine-tune at zero training cost. Treat example selection
   and ordering as hyperparameters and score them on the held-out set.
3. **LoRA / QLoRA fine-tune (rung 2).** When prompting/few-shot plateaus below target and you
   have a few hundred-plus clean labelled examples, parameter-efficient fine-tuning is usually
   enough. LoRA freezes the base weights and trains small low-rank adapters (Hu et al. 2021,
   arXiv:2106.09685). QLoRA backs the frozen base with 4-bit NF4 quantization so a single
   consumer/prosumer GPU can fine-tune a large model, with quality reported comparable to
   16-bit fine-tuning on the studied setups (Dettmers et al. 2023, arXiv:2305.14314). Start
   with a modest adapter rank, train for a small number of epochs, and watch the held-out
   metric for overfitting (it turns up fast). Use existing skills (`peft`, `trl-fine-tuning`,
   `unsloth`, `axolotl`, `bitsandbytes`) — do not reimplement training.
4. **Full fine-tune (rung 3).** Reach for this only when LoRA/QLoRA is demonstrably
   capacity-bound (it has plateaued and the gap is large) **and** you have the compute,
   abundant clean data, and a budget cap that the larger result still satisfies. It is the
   most expensive rung and the easiest to overfit; many text competitions are won without it.

Decision rule: **promote a rung only on held-out evidence that the current rung has
plateaued below target** — never because the next rung sounds stronger. Record the held-out
score at each rung so the promotion is auditable.

## Phase C — DATA-CENTRIC ITERATION: audit data before architecture

Spend the first real iteration on the data, not the model.

1. **Label-quality audit.** Sample mislabelled-looking rows (e.g. confident model errors,
   high train loss, annotator-disagreement rows) and re-check them by hand. Fixing label
   noise is often the single highest-impact lever; it beats most architecture swaps. This is
   the data-centric view popularized in applied practice (Thakur, *Approaching (Almost) Any
   Machine Learning Problem*; see references).
2. **Deduplication.** Remove exact and near-duplicate texts within the training set; duplicates
   inflate apparent performance and waste capacity. Large-corpus work shows pervasive
   near-duplication and its harms (Dodge et al. 2021, arXiv:2104.08758). Use MinHash/LSH or
   embedding-cosine thresholds for near-duplicates.
3. **Contamination / leakage check against the test set.** Verify no test (or held-out)
   example, or a near-duplicate of one, appears in training data — and, for prompts/agents,
   that no answer is encoded in an id, filename, or timestamp. Benchmark contamination is a
   documented, easy-to-miss failure that silently inflates scores (Sainz et al. 2023,
   arXiv:2310.20410; Deng et al. 2024, arXiv:2311.04850). Run n-gram/substring overlap and
   embedding-nearest-neighbour checks between train and the hidden/held-out split where you
   have access to both.
4. **Targeted augmentation, measured.** Add data only where the label audit shows a real gap
   (an under-represented class, a hard slice). Re-score on the **blind** held-out set; keep
   the change only if it moves that number.

Exit: labels audited on the error-prone slices, duplicates removed, a contamination/leakage
check has run and is clean (or the leak is fixed), and any augmentation is justified by a
held-out gain.

## Phase D — INFERENCE-BUDGET REALISM: grade under the cap

LLM contests routinely cap latency, memory, or both. A solution that violates the cap scores
zero regardless of accuracy.

1. **Read the cap first** — max latency per example, GPU/CPU and memory, max model size,
   offline-vs-online, token limits. Treat it as a hard constraint on rung and model size.
2. **Measure your real footprint** — wall-clock latency per example and peak memory on the
   target-class hardware, not a guess. A few-shot prompt with a long context can blow a
   latency cap; a full-precision large model can blow a memory cap.
3. **Quantize to fit, then re-score.** 8-bit and 4-bit (NF4) quantization cut memory ~2–4×
   with typically small quality loss, and QLoRA shows 4-bit bases can even be fine-tuned
   (Dettmers et al. 2023, arXiv:2305.14314). Post-training 4-bit schemes (`awq`, `gptq`,
   `bitsandbytes`, `gguf` for CPU) are the usual tools. **Quantization is not free** — always
   re-score the quantized model on the held-out set; the loss is task-dependent, so measure it
   rather than assume it.
4. **Right-size the model.** A smaller model that fits the budget and is fine-tuned on clean
   data often beats a larger model you must cripple to fit. Pick the largest model that clears
   the cap with margin, not the largest model that exists.

Exit: the chosen solution meets the latency/memory cap with margin on target-class hardware,
and its held-out score is the **post-quantization** score.

## Phase E — FAILURE MODES TO HUNT (reject-mode gate)

Run these as an adversarial pass before trusting any score (the LLM analog of a leakage gate).

- **Overfitting the public leaderboard.** Tuning toward the public split until private-LB
  collapse. Mitigation: trust local held-out CV; track the public-LB↔local gap; a widening
  gap means you are chasing the public split. Do not burn submissions probing.
- **Prompt leakage / blind-set contamination.** Iterating a prompt against examples you keep
  reading silently memorizes them; the gain does not transfer. Mitigation: a blind held-out
  slice scored only, never inspected (Phase A.3).
- **Train/test (benchmark) contamination.** Test text leaking into training or pretraining
  inflates scores (Phase C.3). Mitigation: run the overlap + nearest-neighbour checks.
- **Seed variance reported as signal.** A one-run improvement inside the noise band.
  Mitigation: **report mean ± std over ≥3 seeds**; fine-tuning is genuinely seed-sensitive
  (Dodge et al. 2020, arXiv:2002.06305). A change inside seed std is not an improvement.
- **Format/parse failures.** A correct answer in the wrong format scores zero. Mitigation:
  constrained/structured decoding and a format validator before submission.
- **Latency/memory cap violation.** Offline-best, online-disqualified (Phase D). Mitigation:
  measure under the cap from the start.

For each finding: FIX (and show the diff / the corrected eval) or DEFEND with held-out
evidence. Resolved = rebuttal written and any fix applied.

## Ship

Refit/finalize the chosen rung, produce the submission in the **exact** required format
(validate programmatically against the sample), and record a reproducible write-up: the metric
and its rebuild, the ladder rung that won with its held-out score, the data-centric fixes, the
seed mean ± std, the post-quantization footprint vs the cap, and the public-LB↔local gap.

## Self-check before delivering

Answer each yes/no honestly; any "no" is a blocker.

1. Did you rebuild the competition metric locally and confirm it matches the public baseline
   before training anything?
2. Is there a blind held-out slice that the model — and, for prompt contests, the
   prompt-author — never saw?
3. Did you stop at the cheapest ladder rung that cleared the bar, with a recorded held-out
   score justifying each promotion?
4. Did you run a deduplication and a train/test contamination check, and is the result clean
   (or the leak fixed)?
5. Is the reported score a mean over ≥3 seeds (with std), and the held-out score the
   post-quantization number under the real latency/memory cap?
6. Does the submission pass a programmatic format check against the sample?

## References

Full citation list with verified URLs: `references/sources.md`.
