# Deployment Guide - TeamTailor Social Agent

## 🚀 Vercel Deployment (Suositeltu)

### 1. Valmistele projekti

```bash
# Varmista että build toimii
npm run build

# Testaa lokaalisti
npm run dev
```

### 2. Asenna Vercel CLI

```bash
npm i -g vercel
vercel login
```

### 3. Deploy projektiin

```bash
# Ensimmäinen deployment
vercel

# Production deployment
vercel --prod
```

### 4. Aseta ympäristömuuttujat

Mene Vercel dashboardiin ja lisää seuraavat muuttujat:

**LinkedIn:**
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_ORGANIZATION_ID`

**Facebook:**
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `FACEBOOK_ACCESS_TOKEN`
- `FACEBOOK_PAGE_ID`

**OpenAI:**
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-4`

**TeamTailor:**
- `TEAMTAILOR_WEBHOOK_SECRET`

**Wippiiwork:**
- `WIPPIIWORK_BASE_URL=https://wippiiwork.com`

**Muut:**
- `NODE_ENV=production`
- `LOG_LEVEL=info`

### 5. Testaa deployment

```bash
# Testaa health endpoint
curl https://your-app.vercel.app/health

# Testaa API yhteyksiä (jos dev mode)
curl https://your-app.vercel.app/test/connections
```

## 🐳 Docker Deployment (Vaihtoehtoinen)

### 1. Luo Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY logs/ ./logs/

EXPOSE 3000

CMD ["node", "dist/app.js"]
```

### 2. Build ja run

```bash
# Build image
docker build -t teamtailor-social-agent .

# Run container
docker run -p 3000:3000 --env-file .env teamtailor-social-agent
```

## ☁️ AWS Lambda Deployment

### 1. Asenna serverless

```bash
npm i -g serverless
```

### 2. Luo serverless.yml

```yaml
service: teamtailor-social-agent

provider:
  name: aws
  runtime: nodejs18.x
  region: eu-north-1

functions:
  app:
    handler: dist/app.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
    environment:
      NODE_ENV: production
      # Lisää kaikki env muuttujat tähän
```

### 3. Deploy

```bash
serverless deploy
```

## 🔧 TeamTailor Webhook Konfiguraatio

### 1. Webhook URL

Aseta TeamTailoriin:
```
https://your-domain.vercel.app/webhook/teamtailor
```

### 2. Events

Valitse:
- ✅ `job.created`
- ✅ `job.updated`
- ❌ `job.deleted` (valinnainen)

### 3. Secret

Luo vahva salasana ja aseta se:
- TeamTailor webhook asetuksiin
- Environment variableen `TEAMTAILOR_WEBHOOK_SECRET`

## 📊 Monitoring ja Logging

### Vercel Logs

```bash
# Katso real-time logeja
vercel logs --follow

# Katso viimeisimpiä logeja
vercel logs
```

### Custom Monitoring

Voit integroida:
- **Sentry** - Error tracking
- **DataDog** - Application monitoring
- **LogRocket** - Session replay

## 🔒 Security Checklist

- ✅ Webhook signature validation
- ✅ HTTPS pakollinen
- ✅ Environment variables suojattu
- ✅ Rate limiting (Vercel hoitaa)
- ✅ CORS konfiguroitu
- ✅ Helmet security headers

## 🚨 Troubleshooting

### Deployment Issues

1. **Build fails**: Tarkista TypeScript virheet
2. **Environment variables**: Varmista että kaikki on asetettu
3. **API connections**: Testaa `/test/connections` endpoint

### Runtime Issues

1. **Webhook ei toimi**: Tarkista signature validation
2. **LinkedIn posting fails**: Tarkista access token ja permissions
3. **Facebook posting fails**: Tarkista page permissions

### Performance

- Vercel function timeout: max 30s (riittää)
- Memory limit: 1024MB (riittää)
- Cold start: ~2-3s (normaali)
