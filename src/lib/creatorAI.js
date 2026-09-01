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
Value proposition: ${p?.value_proposition || ''}
Content pillars: ${Array.isArray(p?.content_pillars) ? p.content_pillars.join(', ') : p?.content_pillars || ''}
Monetization goal: ${p?.monetization_goal || ''}
Posting frequency: ${p?.posting_frequency || ''}
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
      spoken_script: { type: 'string' },
      cuts: { type: 'array', items: { type: 'string' } },
      shot_list: { type: 'array', items: { type: 'string' } },
      b_roll: { type: 'array', items: { type: 'string' } },
      on_screen_text: { type: 'array', items: { type: 'string' } },
      caption: { type: 'string' },
      music_style: { type: 'string' },
      thumbnail_idea: { type: 'string' },
      video_length: { type: 'string' },
      cta: { type: 'string' },
      production_notes: { type: 'string' },
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
    `${profileContext(profile)}\n\nReel idea: "${idea}"\n\nBuild a complete, film-ready Reel script for this creator. Provide the strongest opening hook, a word-for-word spoken script, beat-by-beat cuts, a practical shot list, B-roll ideas, on-screen text lines, caption in their voice, music style, thumbnail idea, ideal video length, ending CTA, and concise production notes. Then score the Reel's viral potential out of 100 (viral_score) and break it down into six sub-scores (0-100): score_hook, score_pacing, score_clarity, score_emotion, score_shareability, score_audience_fit. Add a one-sentence summary of how to improve it.`,
    schema
  );
}

export async function generateDealOutreach(profile, deal) {
  const schema = {
    type: 'object',
    properties: {
      subject: { type: 'string' },
      body: { type: 'string' },
      follow_up: { type: 'string' },
      angle: { type: 'string' },
    },
  };
  return llm(
    profileContext(profile) +
      '\n\nBrand: ' + (deal.brand_name || deal.title) +
      '\nContact: ' + (deal.contact_name || 'Brand partnerships team') +
      '\nDeliverables: ' + (deal.deliverables || 'Creator partnership') +
      '\nTarget value: ' + (deal.deal_value ? '$' + deal.deal_value : 'Not set') +
      '\nNotes: ' + (deal.notes || '') +
      '\n\nCreate a specific, credible outreach email with a sharp collaboration angle. Avoid fake claims or invented audience metrics. Return a subject, email body, and short follow-up for four days later.',
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
export async function analyzePerformance(metrics, profile) {
  const schema = {
    type: 'object',
    properties: {
      performance_score: { type: 'number' },
      summary: { type: 'string' },
      wins: { type: 'array', items: { type: 'string' } },
      fixes: { type: 'array', items: { type: 'string' } },
      next_test: { type: 'string' },
    },
  };
  return llm(
    `${profileContext(profile)}\n\nAnalyze this real post without inventing missing data:
Platform: ${metrics.platform}
Title: ${metrics.content_title}
Views: ${metrics.views}
Likes: ${metrics.likes}
Comments: ${metrics.comments}
Shares: ${metrics.shares}
Saves: ${metrics.saves}
Completion rate: ${metrics.completion_rate}%
Followers gained: ${metrics.followers_gained}

Score performance from 0-100 relative to the creator's size and goals. Explain the result in plain language, give 2-4 evidence-based wins, 2-4 specific fixes, and one controlled next-post experiment. Do not claim retention drop-off timestamps because they were not provided.`,
    schema
  );
}

export async function generateTrendMatches(profile) {
  const schema = {
    type: 'object',
    properties: {
      trends: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            platform: { type: 'string', enum: ['instagram', 'tiktok', 'youtube', 'cross_platform'] },
            trend_name: { type: 'string' },
            signal: { type: 'string' },
            source_url: { type: 'string' },
            fit_score: { type: 'number' },
            urgency: { type: 'string', enum: ['post_today', 'this_week', 'watch', 'skip'] },
            fit_reason: { type: 'string' },
            original_angle: { type: 'string' },
            avoid_reason: { type: 'string' },
            hook: { type: 'string' },
          },
        },
      },
    },
  };
  return base44.integrations.Core.InvokeLLM({
    prompt: `${profileContext(profile)}\n\nFind up to six current short-form content trends or repeatable formats that fit this creator. Prioritize trends with a verifiable public source. For each: platform, specific trend name, evidence signal, source URL when available, fit score 0-100, urgency, why it fits, an original brand-safe angle, when to avoid it, and a ready-to-use hook. Never invent an audio title, popularity metric, or source URL. If verification is weak, call it a repeatable format and set urgency to watch.`,
    add_context_from_internet: true,
    response_json_schema: schema,
  });
}

export async function repurposeContent(sourceText, sourceType, profile) {
  const schema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      reel_script: { type: 'string' },
      carousel_slides: { type: 'array', items: { type: 'string' } },
      story_frames: { type: 'array', items: { type: 'string' } },
      caption: { type: 'string' },
      email: { type: 'string' },
      promo_post: { type: 'string' },
    },
  };
  return llm(
    `${profileContext(profile)}\n\nSource type: ${sourceType}
Creator's raw source:
${sourceText}

Preserve the creator's actual meaning and voice. Turn the source into: a title, a film-ready 30-60 second Reel script, a 6-8 slide carousel, 3-5 Story frames, a complete caption, a concise email, and one promotional message. Do not add personal stories, results, credentials, or promises that are not in the source.`,
    schema
  );
}

export async function draftLeadReply(profile, lead) {
  const schema = {
    type: 'object',
    properties: {
      classification: { type: 'string', enum: ['brand', 'customer', 'collaboration', 'fan', 'spam'] },
      estimated_value: { type: 'number' },
      reply: { type: 'string' },
      follow_up: { type: 'string' },
    },
  };
  return llm(
    `${profileContext(profile)}\n\nIncoming ${lead.platform} message from ${lead.contact_name}:
${lead.incoming_message}

Classify the opportunity. Draft a confident, concise reply in the creator's voice that moves legitimate business inquiries to the next step without accepting terms or inventing rates. Include a short follow-up for three business days later. Estimate value only when the message gives enough commercial context; otherwise return 0.`,
    schema
  );
}

export async function buildDigitalProduct(profile, input) {
  const schema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      promise: { type: 'string' },
      outline: { type: 'array', items: { type: 'string' } },
      landing_headline: { type: 'string' },
      landing_copy: { type: 'string' },
      launch_plan: { type: 'array', items: { type: 'string' } },
    },
  };
  return llm(
    `${profileContext(profile)}\n\nProduct idea: ${input.title}
Format: ${input.product_type}
Audience: ${input.audience || profile?.audience_description || ''}
Desired promise: ${input.promise}
Target price: $${input.price || 0}

Turn this into a credible minimum sellable product. Return a strong title, specific non-hype promise, 5-8 section outline, landing-page headline, conversion-focused landing copy, and a seven-step launch plan using the creator's current content channels. Do not invent testimonials, results, scarcity, or guarantees.`,
    schema
  );
}

export async function generateAgencyPlan(client) {
  const schema = {
    type: 'object',
    properties: {
      monthly_plan: { type: 'string' },
    },
  };
  return llm(
    `Create a concise monthly creator-management action plan for:
Client: ${client.client_name}
Brand: ${client.brand_name}
Niche: ${client.niche}
Goals: ${client.goals}
Monthly fee: $${client.monthly_fee || 0}

Use four sections: Outcomes, Weekly Content Cadence, Revenue Actions, and Review Metrics. Make the scope realistic for the stated retainer and do not invent business data.`,
    schema
  );
}

export async function generateContentBatch(sourceText, sourceType, profile) {
  const schema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      posts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['reel', 'carousel', 'post', 'story'] },
            title: { type: 'string' },
            hook: { type: 'string' },
            caption: { type: 'string' },
            hashtags: { type: 'array', items: { type: 'string' } },
            image_prompt: { type: 'string' },
            visual_style: { type: 'string' },
          },
        },
      },
      reel: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          hook: { type: 'string' },
          spoken_script: { type: 'string' },
          shot_list: { type: 'array', items: { type: 'string' } },
          on_screen_text: { type: 'array', items: { type: 'string' } },
          caption: { type: 'string' },
          video_length: { type: 'string' },
          cta: { type: 'string' },
          thumbnail_idea: { type: 'string' },
        },
      },
    },
  };
  return llm(
    `${profileContext(profile)}

Creator's raw source (${sourceType}):
${sourceText}

Turn this real material into a ready-to-post content batch for this creator, in their voice and visual style.
- title: a short batch name.
- posts: exactly 4 distinct post concepts mixing reels, carousels, and single posts. Each needs a scroll-stopping hook, a complete caption in their tone, 5-8 on-brand hashtags, a detailed image_prompt for an AI image generator (subject, composition, lighting, mood — NO text or words in the image), and a short visual_style note.
- reel: one film-ready short-form video script from the strongest angle: title, opening hook, word-for-word spoken script, a shot list, on-screen text lines, caption, ideal video length, ending CTA, and thumbnail idea.
Preserve the creator's actual meaning. Do not invent credentials, results, or quotes that are not in the source.`,
    schema
  );
}

export async function generateBatchImage(post, profile) {
  const style = [post.visual_style, profile?.visual_style].filter(Boolean).join('. ');
  const prompt = `${style ? style + '. ' : ''}Content visual: ${post.image_prompt}. Photographic, high quality, cinematic lighting, square composition, no text, no words, no watermark.`;
  const res = await base44.integrations.Core.GenerateImage({ prompt });
  return res?.url || res?.file_url || '';
}