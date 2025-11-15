import OpenAI from 'openai';
import { TeamTailorJob } from '../types';
import config from '../utils/config';
import logger from '../utils/logger';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Generate social media text for a job posting
 */
export async function generateSocialMediaText(
  job: TeamTailorJob,
  platform: 'linkedin' | 'facebook'
): Promise<string> {
  const startTime = Date.now();

  try {
    logger.info('Starting generateSocialMediaText', {
      jobId: job.id,
      platform,
      jobTitle: job.title,
      company: job.company.name,
    });

    logger.info('Creating prompt', { jobId: job.id, platform });
    const prompt = createPrompt(job, platform);
    logger.info('Prompt created', {
      jobId: job.id,
      platform,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 200) + '...'
    });

    logger.info('About to call OpenAI API', {
      jobId: job.id,
      platform,
      model: config.openai.model,
    });

    console.log(`🔑 CONSOLE: OpenAI API key exists: ${!!config.openai.apiKey}`);
    console.log(`🔑 CONSOLE: OpenAI API key length: ${config.openai.apiKey?.length || 0}`);
    console.log(`🔑 CONSOLE: OpenAI API key prefix: ${config.openai.apiKey?.substring(0, 10) || 'none'}...`);

    // Create OpenAI request with timeout
    console.log(`🚀 CONSOLE: Creating OpenAI request for job ${job.id}`);

    let openaiRequest;
    try {
      openaiRequest = openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: getSystemPrompt(platform),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: platform === 'linkedin' ? 1000 : 800,
        temperature: 0.7,
      });
      console.log(`✅ CONSOLE: OpenAI request created successfully for job ${job.id}`);
    } catch (error) {
      console.log(`❌ CONSOLE: Failed to create OpenAI request for job ${job.id}:`, error);
      throw error;
    }

    // Add aggressive timeout tracking with heartbeat (15s for Pro plan)
    const timeoutPromise = new Promise((_, reject) => {
      // Heartbeat every 2 seconds
      const heartbeat = setInterval(() => {
        console.log(`💓 CONSOLE: OpenAI API still waiting... (job ${job.id}, platform ${platform})`);
      }, 2000);

      setTimeout(() => {
        clearInterval(heartbeat);
        console.log(`⏰ CONSOLE: OpenAI API TIMEOUT after 15s (job ${job.id}, platform ${platform})`);
        logger.error('OpenAI API timeout', {
          jobId: job.id,
          platform,
          timeoutSeconds: 15,
        });
        reject(new Error('OpenAI API timeout after 15 seconds'));
      }, 15000);
    });

    logger.info('Racing OpenAI API call against timeout', {
      jobId: job.id,
      platform,
      timeoutSeconds: 15,
    });

    console.log(`🚀 CONSOLE: Starting OpenAI API race for job ${job.id} platform ${platform}`);

    console.log(`⏳ CONSOLE: Starting Promise.race for job ${job.id}...`);

    const response = await Promise.race([openaiRequest, timeoutPromise]) as any;
    console.log(`🏁 CONSOLE: Promise.race completed for job ${job.id}`);
    console.log(`✅ CONSOLE: OpenAI API completed for job ${job.id}`, {
      responseId: response?.id,
      model: response?.model,
      usage: response?.usage
    });

    logger.info('OpenAI API call completed', {
      jobId: job.id,
      platform,
      elapsedMs: Date.now() - startTime,
      responseId: response.id,
      model: response.model,
      usage: response.usage,
    });

    const generatedText = response.choices[0]?.message?.content?.trim();

    if (!generatedText) {
      logger.error('No text generated from OpenAI', {
        jobId: job.id,
        platform,
        response: JSON.stringify(response, null, 2),
      });
      throw new Error('No text generated from OpenAI');
    }

    logger.info('Successfully generated social media text', {
      jobId: job.id,
      platform,
      textLength: generatedText.length,
      textPreview: generatedText.substring(0, 100) + '...',
      elapsedMs: Date.now() - startTime,
    });

    return generatedText;

  } catch (error) {
    const isTimeout = error instanceof Error && error.message.includes('timeout');

    logger.error('Failed to generate social media text', {
      jobId: job.id,
      platform,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error,
      errorName: error instanceof Error ? error.name : 'Unknown',
      elapsedMs: Date.now() - startTime,
      isTimeout,
      fullError: JSON.stringify(error, null, 2),
    });

    logger.info('Using fallback text generation due to OpenAI failure', {
      jobId: job.id,
      platform,
      reason: isTimeout ? 'timeout' : 'api_error'
    });

    // Fallback to template-based text
    const fallbackText = generateFallbackText(job, platform);

    logger.info('Fallback text generated successfully', {
      jobId: job.id,
      platform,
      textLength: fallbackText.length,
      textPreview: fallbackText.substring(0, 100) + '...',
      elapsedMs: Date.now() - startTime,
    });

    return fallbackText;
  }
}

/**
 * Create prompt for AI text generation
 */
function createPrompt(job: TeamTailorJob, platform: 'linkedin' | 'facebook'): string {
  const locationText = job.location ? `, ${job.location.name}` : '';
  const departmentText = job.department ? ` (${job.department.name})` : '';
  
  return `
Luo ${platform === 'linkedin' ? 'LinkedIn' : 'Facebook'} postaus uudelle työpaikalle:

Työpaikan tiedot:
- Otsikko: ${job.title}
- Yritys: ${job.company.name}
- Sijainti: ${job.location?.name || 'Ei määritelty'}
- Osasto: ${job.department?.name || 'Ei määritelty'}
- Työsuhteen tyyppi: ${job.employment_type}
- Kuvaus: ${job.excerpt || job.body.substring(0, 200)}

Postauksen tulee:
- Olla houkutteleva ja ammattimainen
- Sisältää relevantteja hashtageja
- Kannustaa hakemaan työpaikkaa
- Olla sopivan pituinen ${platform === 'linkedin' ? 'LinkedInille (max 1300 merkkiä)' : 'Facebookille (max 500 merkkiä)'}
- Olla suomeksi
- Sisältää call-to-action
- Korostaa Wippiiwork-brändiä työnvälittäjänä

TÄRKEÄÄ: ÄLÄ sisällytä mitään URL-linkkejä tai web-osoitteita tekstiin. Linkki lisätään automaattisesti.
  `.trim();
}

/**
 * Get system prompt for the platform
 */
function getSystemPrompt(platform: 'linkedin' | 'facebook'): string {
  const wippiiPrompt = `
🧩 Wippii Work -agentin julkaisurakenne

🟢 OTSIKKO
Muoto aina: [Asiakasyritys] etsii [rooli] – hae nyt!

💡 Vaihtoehtoisia muunnelmia (vaihtele automaattisesti):

🧱 Perusmuodot:
- [Asiakasyritys] etsii [rooli] – hae nyt!
- Töitä tarjolla: [rooli] @ [Asiakasyritys]
- Liity [Asiakasyritys] tiimiin [roolina]!
- [Asiakasyritys] hakee uutta [roolia] joukkoonsa!

⚡ Nopea haku:
- [Asiakasyritys] etsii [rooli] heti – toimi nopeasti!
- Paikka auki nyt: [rooli] @ [Asiakasyritys]
- Tartu tilaisuuteen – [Asiakasyritys] palkkaa nyt [roolin]!

❤️ Lämmin & ihmisläheinen:
- [Asiakasyritys] etsii tyyppiä, jolla on sydän mukana – hae [rooliksi]!
- Paikallinen työ, hyvä porukka – [Asiakasyritys] etsii [roolia].
- Hymy ratkaisee – [Asiakasyritys] hakee [roolia].

🚀 Inspiroiva:
- [Asiakasyritys] etsii osaajaa rakentamaan tulevaisuutta [roolissa].
- Tee urasi seuraava siirto: [rooli] @ [Asiakasyritys].

🌿 Paikallinen:
- [Asiakasyritys] etsii työntekijää omalta alueelta – hae nyt!
- Töitä läheltä: [rooli] @ [Asiakasyritys].

✨ Someystävällinen:
- 🚨 Uusi työpaikka auki! [Asiakasyritys] etsii [roolia].
- 🔥 Nyt haussa [rooli] – liity [Asiakasyritys] tiimiin!
- 💼 Uusi mahdollisuus: [rooli] @ [Asiakasyritys].

🟢 KUVAUS (3-4 virkettä):
1. Avaa työn luonne: mitä tehdään ja miksi tärkeää
2. Kerro millainen ihminen sopii (ei ikä/kokemus-oletuksia)
3. Miksi houkutteleva (paikallisuus, yhteishenki, ura, joustavuus)
4. Toimintaan kehottava lause

🧠 Tyyliesimerkit:
- Junior: "Työ sopii sinulle, joka haluat oppia käytännön kautta"
- Tekijätaso: "Pääset tekemään näkyvää jälkeä ja pitämään arjen rullaamassa"
- Asiantuntija: "Tehtävä tarjoaa vastuuta, vapautta ja mahdollisuuden vaikuttaa"
- Paikallinen: "Työpaikka sijaitsee lähellä ja ympärillä on tuttu porukka"

🟢 CTA-lopetuslauseet:
- ⚡ Paikka täytetään heti sopivan löydyttyä – toimi nopeasti!
- 🧭 Jätä hakemus helposti verkossa – aloitetaan keskustelu!
- 💼 Hae työpaikkaa nyt – aloitetaan keskustelu!
- 👉 Kiinnostuitko? Ota yhteyttä ja keskustellaan lisää!

🧭 TYYLIOHJEET:
- Tiivis, ihmisläheinen, positiivinen, paikallinen, helposti lähestyttävä
- ÄLÄ toista fraaseja kuten "asenne ratkaisee" ellei ilmoitus mainitse
- ÄLÄ kirjoita HR-jargonia - kirjoita kuin selittäisit hyvälle kaverille
- Wippii Work sävy: selkeä ja aito
  `.trim();

  if (platform === 'linkedin') {
    return `${wippiiPrompt}

📱 LINKEDIN-ERITYISPIIRTEET:
- Ammattimainen mutta lämmin sävy
- Voi olla hieman pidempi ja yksityiskohtaisempi
- Käytä relevantteja ammattihashtageja (#työpaikka #rekrytointi #[kaupunki])
- Korosta uramahdollisuuksia ja kehittymistä
- Emojit maltillisesti, mutta käytä niitä selkeyteen
`;
  } else {
    return `${wippiiPrompt}

📘 FACEBOOK-ERITYISPIIRTEET:
- Rennompi ja henkilökohtaisempi sävy
- Lyhyempi ja ytimekkäämpi
- Enemmän emojeja elävöittämään tekstiä
- Korosta työpaikan hyviä puolia ja yhteisöllisyyttä
- Helposti luettava ja jaettava
- Käytä hashtageja säästeliäästi
`;
  }
}

/**
 * Generate fallback text if AI generation fails
 */
function generateFallbackText(job: TeamTailorJob, platform: 'linkedin' | 'facebook'): string {
  const locationText = job.location ? ` ${job.location.name}ssa` : '';
  const departmentText = job.department ? ` ${job.department.name}-osastolle` : '';
  
  if (platform === 'linkedin') {
    return `🚀 Uusi työmahdollisuus: ${job.title}

${job.company.name} etsii${departmentText} osaavaa ${job.title.toLowerCase()}a${locationText}.

${job.excerpt || 'Loistava mahdollisuus kehittää uraasi ammattitaitoisessa ympäristössä!'}

Hae nyt ja ota seuraava askel urallasi! 💼

#työpaikka #ura #${job.company.name.replace(/\s+/g, '').toLowerCase()} #wippiiwork #rekrytointi`;
  } else {
    return `🎯 ${job.company.name} hakee: ${job.title}${locationText}

${job.excerpt || 'Kiinnostava työmahdollisuus odottaa!'}

Hae nyt! 👆

#työpaikka #${job.company.name.replace(/\s+/g, '').toLowerCase()} #wippiiwork`;
  }
}
