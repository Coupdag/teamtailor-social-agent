# TeamTailor Social Agent - Setup Guide

## 📋 Vaihe 1: LinkedIn API Setup

### 1.1 LinkedIn Developer Console
1. Mene [LinkedIn Developer Console](https://developer.linkedin.com/)
2. Valitse olemassa oleva app tai luo uusi
3. Varmista että **"Share on LinkedIn"** product on käytössä

### 1.2 Tarvittavat tiedot
- `LINKEDIN_CLIENT_ID`: App:n Client ID
- `LINKEDIN_CLIENT_SECRET`: App:n Client Secret  
- `LINKEDIN_ACCESS_TOKEN`: Organization access token
- `LINKEDIN_ORGANIZATION_ID`: Wippiiwork LinkedIn sivun organization ID

### 1.3 Organization ID:n löytäminen
```bash
# Käytä LinkedIn API:a
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee"
```

## 📘 Vaihe 2: Facebook API Setup

### 2.1 Facebook Developers
1. Mene [Facebook Developers](https://developers.facebook.com/)
2. Luo uusi app tai käytä olemassa olevaa
3. Lisää **"Pages"** permission

### 2.2 Tarvittavat tiedot
- `FACEBOOK_APP_ID`: App ID
- `FACEBOOK_APP_SECRET`: App Secret
- `FACEBOOK_ACCESS_TOKEN`: Page Access Token (pitkäkestoinen)
- `FACEBOOK_PAGE_ID`: Wippiiwork Facebook sivun ID

### 2.3 Page Access Token hankkiminen
1. Mene Graph API Explorer
2. Valitse app ja hanki User Access Token
3. Hae Page Access Token:
```bash
curl "https://graph.facebook.com/v18.0/me/accounts?access_token=USER_ACCESS_TOKEN"
```

## 🤖 Vaihe 3: OpenAI API Setup

1. Mene [OpenAI Platform](https://platform.openai.com/)
2. Luo API key
3. Lisää `OPENAI_API_KEY` .env tiedostoon

## ⚙️ Vaihe 4: TeamTailor Webhook Setup

### 4.1 Webhook URL
Aseta TeamTailoriin webhook URL:
```
https://your-domain.vercel.app/webhook/teamtailor
```

### 4.2 Webhook Events
Valitse seuraavat eventit:
- `job.created`
- `job.updated`

### 4.3 Webhook Secret
Luo vahva salasana ja lisää se:
- TeamTailor webhook asetuksiin
- `.env` tiedostoon `TEAMTAILOR_WEBHOOK_SECRET`

## 🚀 Vaihe 5: Deployment

### 5.1 Vercel Setup
```bash
# Asenna Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 5.2 Environment Variables
Lisää kaikki .env muuttujat Vercel dashboardiin:
- LINKEDIN_CLIENT_ID
- LINKEDIN_CLIENT_SECRET
- LINKEDIN_ACCESS_TOKEN
- LINKEDIN_ORGANIZATION_ID
- FACEBOOK_APP_ID
- FACEBOOK_APP_SECRET
- FACEBOOK_ACCESS_TOKEN
- FACEBOOK_PAGE_ID
- OPENAI_API_KEY
- TEAMTAILOR_WEBHOOK_SECRET
- WIPPIIWORK_BASE_URL

## 🧪 Vaihe 6: Testaus

### 6.1 Local Testing
```bash
npm run dev

# Testaa API yhteyksiä
curl http://localhost:3000/test/connections

# Testaa job postingia
curl -X POST http://localhost:3000/test/job-posting
```

### 6.2 Production Testing
```bash
# Testaa API yhteyksiä
curl https://your-domain.vercel.app/test/connections

# Testaa webhook (käytä ngrok lokaalisti)
curl -X POST https://your-domain.vercel.app/webhook/teamtailor \
  -H "Content-Type: application/json" \
  -H "X-TeamTailor-Signature: sha256=YOUR_SIGNATURE" \
  -d '{"event":"job.created","data":{...}}'
```

## 🔧 Troubleshooting

### LinkedIn Issues
- Tarkista access token voimassaolo
- Varmista organization permissions
- Tarkista API rate limits

### Facebook Issues
- Varmista page permissions
- Tarkista access token tyyppi (page vs user)
- Tarkista app review status

**🔥 YLEINEN ONGELMA: Facebook App Integration Stuck**
Jos Facebook API ei toimi vaikka kaikki näyttää olevan kunnossa:

1. Mene Facebook asetuksiin:
   - https://www.facebook.com/settings?tab=business_tools
   - TAI: Settings & Privacy → Settings → Business Integrations

2. Etsi sovelluksesi (esim. "Wippiiwork Social Agent")

3. Klikkaa **"Remove"** poistaaksesi sovelluksen

4. Käy uudelleen Facebook Developers consolessa ja anna permissions uudelleen

5. Hanki uusi access token

**Ratkaisu löytyi kun token:** `EAAMEHBb0USQBP1R99HmMTe6TNlFP4yHYWHTeRZCW5A0fPLDj3Yr5RJeyrXpb3APyMEbjOni5YWBTMgeqVg8TXXnzg0D05cBIsU0R78YnZCZCUZC9YkkxlItNEhFPTt2xIqvZA02LKxkFcTtbTI8nj7hJYuCwkcZBPKMvrWsggCv34qJOqyNuMtN2lyMbkxsvJ4RuWvBBUVon0wxrX6P38IBG8uE73pjNgs4BKqPcyPN1qqAqEn56iDePNHa1PsvfI2YjkE0fSgyaq7bFze788lgZDZD` alkoi toimimaan.

### Webhook Issues
- Tarkista signature validation
- Tarkista endpoint URL
- Tarkista TeamTailor event configuration
