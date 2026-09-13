import OpenAI from 'openai';
import config from '../config';
import { STYLIST_SYSTEM_PROMPT } from '../ai/prompts';
import { ChatMessage } from '../models/types';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

export const chatWithStylist = async (
  messages: ChatMessage[],
  userPreferences?: string
): Promise<string> => {
  const systemPrompt = userPreferences
    ? `${STYLIST_SYSTEM_PROMPT}\n\nUser's style preferences: ${userPreferences}`
    : STYLIST_SYSTEM_PROMPT;

  const formattedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
  ];

  const completion = await openai.chat.completions.create({
    model: config.openai.model,
    messages: formattedMessages,
    max_tokens: 1000,
    temperature: 0.8,
  });

  return completion.choices[0]?.message?.content || 'I apologize, I could not generate a response. Please try again.';
};

export const analyzeFashionImage = async (imageUrl: string): Promise<string> => {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a luxury fashion analyst. Analyze the clothing in this image and provide detailed insights about style, color palette, occasion suitability, and styling suggestions.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this fashion item or outfit:' },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: 500,
  });

  return completion.choices[0]?.message?.content || 'Unable to analyze this image.';
};

export const generateOutfitSuggestions = async (
  wardrobeDescription: string,
  occasion: string
): Promise<string> => {
  const completion = await openai.chat.completions.create({
    model: config.openai.model,
    messages: [
      {
        role: 'system',
        content: 'You are a luxury personal fashion stylist. Generate outfit suggestions based on the user\'s wardrobe and occasion. Be specific, creative, and consider color coordination, seasonality, and current trends.',
      },
      {
        role: 'user',
        content: `My wardrobe includes: ${wardrobeDescription}\n\nI need outfit suggestions for: ${occasion}`,
      },
    ],
    max_tokens: 800,
    temperature: 0.9,
  });

  return completion.choices[0]?.message?.content || 'Unable to generate suggestions.';
};

export const generateDalleTryOn = async (
  userImageUrl: string,
  clothingImageUrl: string
): Promise<string> => {
  console.log('Analyzing user photo with GPT-4o Vision...');
  // 1. Analyze user photo to describe appearance and setting (ignoring clothes)
  const userAnalysisCompletion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a professional fashion image analyzer. Describe the person in this image: their gender, age group, detailed physical features, ethnicity, hair style and color, and their precise location background/setting. Do NOT describe the clothes they are currently wearing. Be highly detailed and write it in a single concise paragraph of 2-3 sentences.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe the person and setting in this photo:' },
          { type: 'image_url', image_url: { url: userImageUrl } },
        ],
      },
    ],
    max_tokens: 250,
  });
  const userDescription = userAnalysisCompletion.choices[0]?.message?.content || 'A stylish person in a beautiful location';

  console.log('Analyzing clothing item with GPT-4o Vision...');
  // 2. Analyze clothing photo to describe detailed garments
  const clothAnalysisCompletion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert luxury garment catalog describer. Analyze this garment in detail. Describe its type (polo shirt, t-shirt, jacket, etc.), color, patterns, text prints, logos, collar style, and material texture. Provide a clean, specific description of this garment in a single paragraph so that a text-to-image AI can draw it identical to the original image.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this garment in detail:' },
          { type: 'image_url', image_url: { url: clothingImageUrl } },
        ],
      },
    ],
    max_tokens: 250,
  });
  const clothingDescription = clothAnalysisCompletion.choices[0]?.message?.content || 'A stylish garment';

  console.log('Synthesizing DALL-E 3 prompt...');
  // 3. Generate prompt
  const dallePrompt = `A premium, high-resolution, photorealistic fashion editorial photo of ${userDescription}. They are wearing a ${clothingDescription}. The lighting, camera angle, and scene atmosphere must perfectly match and blend. High fashion portrait, 8k resolution, cinematic lighting, ultra-detailed textures, professional photography.`;

  console.log(`Calling DALL-E 3 with prompt: ${dallePrompt}`);

  // 4. Call DALL-E 3
  const dalleResponse = await openai.images.generate({
    model: 'dalle-3' as any, // DALL-E 3 model spec
    prompt: dallePrompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
  });

  const generatedUrl = dalleResponse?.data?.[0]?.url;
  if (!generatedUrl) {
    throw new Error('DALL-E 3 did not return an image URL');
  }

  return generatedUrl;
};

