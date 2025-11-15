# TeamTailor Social Agent

Automaattinen agentti joka kuuntelee TeamTailor webhookeja ja postaa uudet työpaikat automaattisesti LinkedIn ja Facebook -profiileihin.

## 🧪 TESTING MODE - TÄRKEÄÄ!

**HUOM:** Tämä on testiympäristö! LinkedIn ja Facebook postaukset on POISTETTU KÄYTÖSTÄ turvallisuussyistä.

### Nykyinen tila:
- ✅ **Google Chat** - KÄYTÖSSÄ (testikanava)
- ❌ **LinkedIn** - POISTETTU KÄYTÖSTÄ (testikäytön ajaksi)
- ❌ **Facebook** - POISTETTU KÄYTÖSTÄ (testikäytön ajaksi)

### Kuinka palauttaa LinkedIn ja Facebook käyttöön:

1. **Avaa tiedosto:** `src/services/jobProcessor.ts`
2. **Etsi rivi ~78:** `// DISABLED FOR TESTING - LinkedIn posting`
3. **Poista kommentit** LinkedIn ja Facebook postausten edestä:

```javascript
// MUUTA TÄMÄ:
// postToLinkedIn({
//   platform: 'linkedin',
//   content: linkedInText,
//   jobUrl,
// }),

// TAKAISIN TÄHÄN:
postToLinkedIn({
  platform: 'linkedin',
  content: linkedInText,
  jobUrl,
}),
```

4. **Tee sama Facebook-postaukselle**
5. **Päivitä platform-loggaus** (rivi ~120): `const platforms = ['LinkedIn', 'Facebook', 'Google Chat'];`
6. **Päivitä console.log** (rivi ~76): `About to post to LinkedIn and Facebook`

🚀 **Auto-deployment enabled** - Pushes to main branch automatically deploy to production!

## 🚀 Ominaisuudet

- **TeamTailor Webhook Integration**: Kuuntelee uusia työpaikkoja TeamTailorista
- **LinkedIn API**: Postaa automaattisesti LinkedIn Company Page:lle
- **Facebook API**: Postaa automaattisesti Facebook Business Page:lle  
- **AI-Powered Text Generation**: Luo optimoidut tekstit molemmille alustoille
- **TypeScript**: Täysi tyyppiturvallisuus
- **Vercel Ready**: Valmis deploymentiin Verceliin

## 📋 Vaatimukset

- Node.js >= 18.0.0
- LinkedIn Developer App (Share on LinkedIn API)
- Facebook Developer App (Pages API)
- OpenAI API Key (tekstin generointiin)
- TeamTailor webhook access

## 🛠️ Asennus

1. **Kloonaa ja asenna riippuvuudet:**
```bash
cd wippii-agentit/teamtailor-social-agent
npm install
```

2. **Kopioi ympäristömuuttujat:**
```bash
cp .env.example .env
```

3. **Täytä .env tiedosto:**
- LinkedIn API credentials
- Facebook API credentials  
- OpenAI API key
- TeamTailor webhook secret

4. **Käynnistä kehitysympäristössä:**
```bash
npm run dev
```

## 🔧 Konfiguraatio

### LinkedIn API Setup
1. Mene [LinkedIn Developer Console](https://developer.linkedin.com/)
2. Valitse "Share on LinkedIn" product
3. Hanki Organization ID ja Access Token

### Facebook API Setup  
1. Mene [Facebook Developers](https://developers.facebook.com/)
2. Luo uusi app ja valitse "Business" tyyppi
3. Lisää "Pages" permission
4. Hanki Page Access Token

### TeamTailor Webhook
1. Aseta webhook URL: `https://your-domain.com/webhook/teamtailor`
2. Valitse events: `job.created`, `job.updated`

## 📁 Projektin rakenne

```
src/
├── handlers/          # Webhook ja API handlerit
├── services/          # Business logic
├── utils/            # Apufunktiot ja konfiguraatio
├── types/            # TypeScript tyypit
└── app.ts            # Express sovellus
```

## 🚀 Deployment

### Vercel (Auto-deployment from GitHub)
Projekti on konfiguroitu automaattiseen deploymentiin:
- **GitHub Repository**: https://github.com/Coupdag/teamtailor-social-agent
- **Production URL**: https://teamtailor-social-agent.vercel.app
- **Auto-deploy**: Jokainen push `main` branchiin käynnistää automaattisen deploymentin

### Manuaalinen deployment
```bash
npm run build
vercel --prod
```

### Ympäristömuuttujat Vercelissä
Lisää kaikki .env muuttujat Vercel dashboardiin.

## 📝 API Endpoints

- `GET /health` - Terveystarkistus
- `POST /webhook/teamtailor` - TeamTailor webhook vastaanotin
- `GET /test/connections` - Testaa API yhteyksiä (vain dev)
- `POST /test/job-posting` - Testaa job posting workflow (vain dev)

## 🔍 Lokitus

Sovellus käyttää Winston-loggeria:
- `logs/error.log` - Virheet
- `logs/combined.log` - Kaikki logit
- Console output kehitysympäristössä

## 🎯 Workflow

1. **TeamTailor webhook** → Uusi työpaikka julkaistaan
2. **Webhook vastaanotin** → Validoi ja käsittelee datan
3. **AI tekstin generointi** → Luo optimoidut tekstit LinkedIn ja Facebook
4. **Social media posting** → Postaa molemmille alustoille samanaikaisesti
5. **Lokitus ja seuranta** → Tallentaa tulokset ja virheet

## 🔧 Kehitysympäristö

```bash
# Käynnistä kehityspalvelin
npm run dev

# Testaa API yhteyksiä
curl http://localhost:3000/test/connections

# Simuloi job posting
curl -X POST http://localhost:3000/test/job-posting
```

## 📊 Monitoring

Sovellus lokittaa kaikki tapahtumat Winston-loggerilla:
- Webhook vastaanotot
- API kutsut LinkedIn/Facebook
- AI tekstin generointi
- Virheet ja poikkeukset

## 🚨 Troubleshooting

Katso yksityiskohtaiset ohjeet: [SETUP.md](./SETUP.md)
