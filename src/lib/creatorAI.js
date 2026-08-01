import { base44 } from '@/api/base44Client';

async function llm(prompt, schema) {
  return base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: schema,
  });
}

export function profileContext(p) {
  return `Creator brand profile:
Name: ${p?.brand_name || 'Unknown'}
Niche: ${p?.niche || 'general'}
Personality: ${p?.personality || ''}
Voice: ${p?.voice || ''}
Visual style: ${p?.visual_style || ''}
Favorite phrases: ${p?.favorite_phrases || ''}
Goals: ${p?.goals || ''}
Products/Offers: ${p?.products || ''}
Boundaries: ${p?.boundaries || ''}
Audience: ${p?.audience_description || ''}
Followers: ${p?.follower_count ?? 'n/a'}
Avg views: ${p?.avg_views ?? 'n/a'}
Engagement rate: ${p?.engagement_rate ?? 'n/a'}%`;
}

export async function loadProfile() {
  const list = await base44.entities.CreatorProfile.list('-created_date', 1);
  return list[0] || null;
}

export async function saveProfile(data, existing) {
  if (existing?.id) return base44.entities.CreatorProfile.update(existing.id, data);
  return base44.entities.CreatorProfile.create(data);
}

export async function generateDailyPlan(profile) {
  const schema = {
    type: 'object',
    properties: {
      greeting: { type: 'string' },
      focus: { type: 'string' },
      actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            time: { type: 'string' },
            title: { type: 'string' },
            detail: { type: 'string' },
            type: { type: 'string' },
          },
        },
      },
      insight: { type: 'string' },
    },
  };
  return llm(
    `${profileContext(profile)}\n\nGenerate a personalized daily action plan for today to grow this creator's Instagram and monetization. Include 4-6 timed actions (type: content|engagement|monetization|growth), a one-line focus, a friendly greeting in their voice, and a sharp audience/growth insight.`,
    schema
  );
}

export async function generateContentWeek(profile) {
  const schema = {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            day: { type: 'string' },
            type: { type: 'string' },
            title: { type: 'string' },
            concept: { type: 'string' },
            hook: { type: 'string' },
            caption: { type: 'string' },
            cta: { type: 'string' },
            hashtags: { type: 'array', items: { type: 'string' } },
            best_time: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
    },
  };
  return llm(
    `${profileContext(profile)}\n\nCreate a 7-day Instagram content calendar tailored to this creator's niche, voice, and audience. Mix Reels, carousels, stories, and posts. Each item: day (Monday-Sunday), type (reel|carousel|story|post|live), title, concept, scroll-stopping hook, full caption in their voice, CTA, 5-10 hashtags, best posting time, and creator notes. Return 7-10 items.`,
    schema
  );
}

export async function buildReel(idea, profile) {
  const schema = {
    type: 'object',
    properties: {
      hook: { type: 'string' },
      opening: { type: 'string' },
      cuts: { type: 'array', items: { type: 'string' } },
      on_screen_text: { type: 'array', items: { type: 'string' } },
      caption: { type: 'string' },
      music_style: { type: 'string' },
      thumbnail_idea: { type: 'string' },
      video_length: { type: 'string' },
      cta: { type: 'string' },
      viral_score: { type: 'number' },
      score_hook: { type: 'number' },
      score_pacing: { type: 'number' },
      score_clarity: { type: 'number' },
      score_emotion: { type: 'number' },
      score_shareability: { type: 'number' },
      score_audience_fit: { type: 'number' },
      summary: { type: 'string' },
    },
  };
  return llm(
    `${profileContext(profile)}\n\nReel idea: "${idea}"\n\nBuild a viral Reel blueprint for this creator. Provide the strongest opening hook, where to cut the video (beat-by-beat), on-screen text lines, a caption in their voice, music style, thumbnail idea, ideal video length, and ending CTA. Then score the Reel's viral potential out of 100 (viral_score) and break it down into six sub-scores (0-100): score_hook, score_pacing, score_clarity, score_emotion, score_shareability, score_audience_fit. Add a one-sentence summary of how to improve it.`,
    schema
  );
}

export async function twinReply(history, profile) {
  const convo = history.map((m) => `${m.role === 'user' ? 'Creator' : 'Twin'}: ${m.content}`).join('\n');
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `${profileContext(profile)}\n\nYou are this creator's private Creator Twin AI — a content strategist, brand manager, growth analyst, and monetization coach combined. Write, brainstorm, pitch, plan launches, and turn ideas into posts in their exact voice. Be concise, specific, and high-signal. Use markdown when helpful.\n\nConversation so far:\n${convo}\n\nTwin:`,
  });
  return typeof res === 'string' ? res : res?.response || JSON.stringify(res);
}

export async function generateMediaKit(profile) {
  const schema = {
    type: 'object',
    properties: {
      headline: { type: 'string' },
      bio: { type: 'string' },
      stats_summary: { type: 'string' },
      audience_highlights: { type: 'array', items: { type: 'string' } },
      content_samples: { type: 'array', items: { type: 'string' } },
      packages: {
        type: 'array',
        items: {
          type: 'object',
          properties: { name: { type: 'string' }, deliverables: { type: 'string' }, price: { type: 'string' } },
        },
      },
      differentiators: { type: 'array', items: { type: 'string' } },
      contact_cta: { type: 'string' },
    },
  };
  return llm(
    `${profileContext(profile)}\n\nGenerate a professional media kit for this creator to land brand deals. Include a punchy headline, a 2-3 sentence bio in their voice, a stats summary, 3-4 audience highlights, 3 content sample descriptions, 3 campaign packages with deliverables and suggested price ranges, 3 differentiators vs typical creators, and a contact CTA.`,
    schema
  );
}

export async function calculatePricing(input) {
  const schema = {
    type: 'object',
    properties: {
      base_rate: { type: 'string' },
      recommendations: {
        type: 'array',
        items: {
          type: 'object',
          properties: { package: { type: 'string' }, deliverables: { type: 'string' }, price: { type: 'string' } },
        },
      },
      factors: { type: 'array', items: { type: 'string' } },
      notes: { type: 'string' },
    },
  };
  return llm(
    `Creator pricing inputs:\nFollowers: ${input.followers}\nAverage views: ${input.avg_views}\nEngagement rate: ${input.engagement}%\nNiche: ${input.niche}\nDeliverables: ${input.deliverables}\nUsage rights: ${input.usage}\nExclusivity: ${input.exclusivity}\nCampaign duration: ${input.duration}\n\nCalculate fair, competitive brand deal pricing. Give a base rate, 3-4 package recommendations with deliverables and price, the key factors driving the price, and a negotiation note.`,
    schema
  );
}

export async function generatePitch(profile, brand, goal) {
  const schema = {
    type: 'object',
    properties: {
      subject: { type: 'string' },
      body: { type: 'string' },
      follow_up: { type: 'string' },
    },
  };
  return llm(
    `${profileContext(profile)}\n\nWrite a brand pitch email to "${brand}" with the goal: ${goal}. Match the creator's voice. Return subject, body, and a short follow-up email to send 4 days later.`,
    schema
  );
}