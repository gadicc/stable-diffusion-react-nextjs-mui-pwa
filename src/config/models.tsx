interface Model {
  MODEL_ID: string;
  description: string;
  notes?: JSX.Element;
  defaults?: Record<string, unknown>;
  randomPrompts?: string[] | { $from: string };
  modelKeys?: {
    [key: string]: Record<string, unknown>;
  };
}

const models: Record<string, Model> = {
  "stabilityai/stable-diffusion-2-1-base": {
    MODEL_ID: "stabilityai/stable-diffusion-2-1-base",
    description: "Latest Stable Diffusion, Dec 6th. (512x512)",
    randomPrompts: { $from: "CompVis/stable-diffusion-v1-4" },
  },
  "stabilityai/stable-diffusion-2-1": {
    MODEL_ID: "stabilityai/stable-diffusion-2-1",
    description: "Latest Stable Diffusion, Dec 6th. (768x768)",
    randomPrompts: { $from: "CompVis/stable-diffusion-v1-4" },
  },
  "stabilityai/stable-diffusion-2-base": {
    MODEL_ID: "stabilityai/stable-diffusion-2-base",
    description: "Stable Diffusion from Nov 24th. (512x512)",
    randomPrompts: { $from: "CompVis/stable-diffusion-v1-4" },
  },
  "stabilityai/stable-diffusion-2": {
    MODEL_ID: "stabilityai/stable-diffusion-2",
    description: "Stable Diffusion from Nov 24th. (768x768)",
    randomPrompts: { $from: "CompVis/stable-diffusion-v1-4" },
  },
  "runwayml/stable-diffusion-v1-5": {
    MODEL_ID: "runwayml/stable-diffusion-v1-5",
    description: "Stable Diffusion from Oct 20th.",
    randomPrompts: { $from: "CompVis/stable-diffusion-v1-4" },
  },
  "runwayml/stable-diffusion-inpainting": {
    MODEL_ID: "runwayml/stable-diffusion-inpainting",
    description: "Fine-tuned SD; Best for Inpainting.",
    randomPrompts: { $from: "CompVis/stable-diffusion-v1-4" },
    notes: (
      <div style={{ color: "red" }}>
        {" "}
        Warning! Currently breaks easily on non-standard image sizes.
      </div>
    ),
  },
  "prompthero/openjourney-v2": {
    MODEL_ID: "prompthero/openjourney-v2",
    description: "SDv1.5 finetuned on Midjourney",
    randomPrompts: [
      "retro serie of different cars with different colors and shapes",
    ],
    notes: (
      <a href="https://huggingface.co/prompthero/openjourney-v2">
        Openjourney by PromptHero, Model Card
      </a>
    ),
  },
  "wd-1-4-anime_e1": {
    MODEL_ID: "wd-1-4-anime_e1",
    description: "Waifu Diffusion v1.4, Epoch 1, Dec 31",
    randomPrompts: [
      "masterpiece, best quality, 1girl, black eyes, black hair, black sweater, blue background, bob cut, closed mouth, glasses, medium hair, red-framed eyewear, simple background, solo, sweater, upper body, wide-eyed",
      "masterpiece, best quality, 1girl, aqua eyes, baseball cap, blonde hair, closed mouth, earrings, green background, hat, hoop earrings, jewelry, looking at viewer, shirt, short hair, simple background, solo, upper body, yellow shirt",
      "masterpiece, best quality, 1girl, black bra, black hair, black panties, blush, borrowed character, bra, breasts, cleavage, closed mouth, gradient hair, hair bun, heart, large breasts, lips, looking at viewer, multicolored hair, navel, panties, pointy ears, red hair, short hair, sweat, underwear",
      "masterpiece, best quality, high quality, yakumo ran, touhou, 1girl, :d, animal ears, blonde hair, breasts, cowboy shot, extra ears, fox ears, fox shadow puppet, fox tail, head tilt, large breasts, looking at viewer, multiple tails, no headwear, short hair, simple background, smile, solo, tabard, tail, white background, yellow eyes",
      "masterpiece, best quality, high quality, scenery, japanese shrine, no humans, absurdres",
    ],
    notes: (
      <a href="https://gist.github.com/harubaru/8581e780a1cf61352a739f2ec2eef09b">
        WD 1.4 Release Notes and Prompt Hints
      </a>
    ),
  },
  "hakurei/waifu-diffusion-v1-3": {
    MODEL_ID: "hakurei/waifu-diffusion-v1-3",
    description: "Best for Anime.  Final Release.  Oct 6",
    randomPrompts: [
      "1girl, witch, purple hair, facing the viewer, night sky, big moon, highly detailed",
      "chen, arknights, 1girl, animal ears, brown hair, cat ears, cat tail, closed mouth, earrings, face, hat, jewelry, lips, multiple tails, nekomata, painterly, red eyes, short hair, simple background, solo, tail, white background",
      "yakumo ran, arknights, 1girl, :d, animal ears, blonde hair, breasts, cowboy shot, extra ears, fox ears, fox shadow puppet, fox tail, head tilt, large breasts, looking at viewer, multiple tails, no headwear, short hair, simple background, smile, solo, tabard, tail, white background, yellow eyes",
    ],
    notes: (
      <a href="https://gist.github.com/harubaru/f727cedacae336d1f7877c4bbe2196e1">
        WD 1.3 Release Notes and Prompt Hints
      </a>
    ),
  },
  "Linaqruf/anything-v3.0": {
    MODEL_ID: "Linaqruf/anything-v3.0",
    description: "Anime Anything V3 (added Jan 2nd)",
    randomPrompts: [
      "1girl, brown hair, green eyes, colorful, autumn, cumulonimbus clouds, lighting, blue sky, falling leaves, garden",
      "1boy, medium hair, blonde hair, blue eyes, bishounen, colorful, autumn, cumulonimbus clouds, lighting, blue sky, falling leaves, garden",
      "scenery, shibuya tokyo, post-apocalypse, ruins, rust, sky, skyscraper, abandoned, blue sky, broken window, building, cloud, crane machine, outdoors, overgrown, pillar, sunset",
    ],
    notes: (
      <a href="https://gist.github.com/harubaru/f727cedacae336d1f7877c4bbe2196e1">
        WD 1.3 Release Notes and Prompt Hints
      </a>
    ),
  },
  "CompVis/stable-diffusion-v1-4": {
    MODEL_ID: "CompVis/stable-diffusion-v1-4",
    description: "Original model, best for most cases.",
    randomPrompts: [
      "Super Dog",
      "A digital illustration of a medieval town, 4k, detailed, trending in artstation, fantasy",
      "Cute and adorable ferret wizard, wearing coat and suit, steampunk, lantern, anthromorphic, Jean paptiste monge, oil painting",
      "<Scene>, skylight, soft shadows, depth of field, canon, f 1.8, 35mm",
    ],
  },
  "hakurei/waifu-diffusion": {
    MODEL_ID: "hakurei/waifu-diffusion",
    description: "Anime.  Original, previous model (v1.2)",
    randomPrompts: [
      "touhou hakurei_reimu 1girl solo portrait",
      // @leemengtaiwan
      // https://www.reddit.com/r/StableDiffusion/comments/x8un2h/testing_waifu_diffusion_see_prompt_comparison/
      "a portrait of a charming girl with a perfect face and long hair and tattoo on her cheek and cyberpunk headset, anime, captivating, aesthetic, hyper-detailed and intricate, realistic shaded, realistic proportion, symmetrical, concept art, full resolution, golden ratio, global resolution",
    ],
  },
  "rinna/japanese-stable-diffusion": {
    MODEL_ID: "rinna/japanese-stable-diffusion",
    description: "Japanese / Japanglish prompt input, style",
    randomPrompts: [
      // https://prtimes.jp/main/html/rd/p/000000035.000070041.html
      "サラリーマン 油絵",
      "夕暮れの神社の夏祭りを描いた水彩画",
      "ハンバーガー　浮世絵",
      "キラキラ瞳の猫",
      "宇宙の月でバイクで走るライダー",
      "かわいいわんこのイラスト",
    ],
  },
};

export default models;
