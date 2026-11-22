import { env, pipeline } from '@huggingface/transformers';

export const AI_MODEL_VERSION = 'findora-minilm-v1';

env.cacheDir = process.env.FINDORA_MODEL_CACHE || './.cache/findora-models';

let extractorPromise;

async function getExtractor() {
  if (!extractorPromise) {
    console.log('Loading local AI model (first run downloads model files).');
    extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' });
  }
  return extractorPromise;
}

export function createEmbedder() {
  return {
    model: AI_MODEL_VERSION,
    async embed(text) {
      const extractor = await getExtractor();
      const result = await extractor(text, { pooling: 'mean', normalize: true });
      return result.tolist()[0];
    },
  };
}
