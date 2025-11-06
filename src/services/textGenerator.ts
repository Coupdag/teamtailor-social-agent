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
  try {
    const prompt = createPrompt(job, platform);
    
    logger.info('Generating social media text', {
      jobId: job.id,
      platform,
      jobTitle: job.title,
      company: job.company.name,
    });

    const response = await openai.chat.completions.create({
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

    const generatedText = response.choices[0]?.message?.content?.trim();

    if (!generatedText) {
      throw new Error('No text generated from OpenAI');
    }

    logger.info('Successfully generated social media text', {
      jobId: job.id,
      platform,
      textLength: generatedText.length,
    });

    return generatedText;

  } catch (error) {
    logger.error('Failed to generate social media text', {
      jobId: job.id,
      platform,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // Fallback to template-based text
    return generateFallbackText(job, platform);
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

Älä sisällytä linkkiä - se lisätään automaattisesti.
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
- 👉 Katso tarkemmat tiedot ja hae: [linkki]
- ⚡ Paikka täytetään heti sopivan löydyttyä – toimi nopeasti!
- 💼 Lue lisää tehtävästä ja hae heti: [linkki]
- 🧭 Jätä hakemus helposti verkossa – aloitetaan keskustelu!

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
