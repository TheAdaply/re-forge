# LLM Competitor — sources

Public citations behind the heuristics in `../SKILL.md`. URLs verified to load at authoring
time (arXiv/ACL/GitHub return 200). General well-known practice ("build a baseline first",
"deduplicate", "validate the submission format") is stated without citation by design.

## Efficiency ladder (fine-tuning)

- **LoRA — Low-Rank Adaptation of Large Language Models.** Hu et al., 2021.
  <https://arxiv.org/abs/2106.09685> — freezes base weights, trains small low-rank adapters;
  the basis for rung 2.
- **QLoRA — Efficient Finetuning of Quantized LLMs.** Dettmers et al., 2023.
  <https://arxiv.org/abs/2305.14314> — 4-bit NF4 frozen base + LoRA adapters; reports quality
  comparable to 16-bit fine-tuning on the studied setups and enables large-model fine-tuning on
  a single GPU. Basis for rung 2 (QLoRA) and the Phase-D quantization claim.

## Prompting

- **Chain-of-Thought Prompting Elicits Reasoning in Large Language Models.** Wei et al., 2022.
  <https://arxiv.org/abs/2201.11903> — CoT helps multi-step reasoning; basis for "add reasoning
  steps only when the task is genuinely multi-step."
- **Pre-train, Prompt, and Predict (prompting survey).** Liu et al., 2021.
  <https://arxiv.org/abs/2107.13586> — background for the prompt/few-shot rungs.

## Data-centric iteration

- **Documenting Large Webtext Corpora (C4).** Dodge et al., 2021.
  <https://arxiv.org/abs/2104.08758> — documents pervasive near-duplication and benchmark
  contamination in web corpora; basis for the deduplication and contamination phases.
- **Approaching (Almost) Any Machine Learning Problem.** Abhishek Thakur (book; companion repo).
  <https://github.com/abhishekkrthakur/approachingalmost> — applied data-centric / cross-
  validation discipline from a Kaggle Grandmaster; basis for the label-quality-first stance.
- **Approaching (Almost) Any NLP Problem on Kaggle.** Abhishek Thakur (notebook).
  <https://www.kaggle.com/code/abhishek/approaching-almost-any-nlp-problem-on-kaggle> —
  competition-grandmaster NLP workflow reference.

## Contamination / leakage

- **NLP Evaluation in Trouble: data contamination.** Sainz et al., 2023.
  <https://arxiv.org/abs/2310.20410> — frames benchmark/test contamination as a measurement
  threat; basis for the train/test contamination check.
- **Investigating Data Contamination in Modern Benchmarks.** Deng et al., 2024.
  <https://arxiv.org/abs/2311.04850> — methods to detect contamination; supports the
  overlap + nearest-neighbour check.

## Seed variance

- **Fine-Tuning Pretrained Language Models: weight initializations, data orders, early
  stopping.** Dodge et al., 2020. <https://arxiv.org/abs/2002.06305> — documents large
  run-to-run variance in fine-tuning; basis for "report mean ± std over ≥3 seeds."

## Inference-budget / quantization tooling

Covered by existing re-forge skills rather than re-derived here: `bitsandbytes`, `awq`, `gptq`,
`gguf` (CPU), `peft`, `trl-fine-tuning`, `unsloth`, `axolotl`, `outlines`, `guidance`. The
load-bearing quantization-quality claim traces to QLoRA (Dettmers et al. 2023, above), with the
explicit caveat in Phase D that quantization loss is task-dependent and must be re-scored.
