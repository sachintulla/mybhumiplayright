# Bhu Bharati Playwright Microservice

## Deploy on Railway

1. Push this folder to a GitHub repo
2. Connect it to [Railway](https://railway.app)
3. Add environment variable: `TWO_CAPTCHA_KEY=your_key` (optional, for auto-solve)
4. Railway auto-detects Node.js and runs `npm start`

## Endpoints

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| POST | `/init-search` | `{district, mandal, village, surveyNo}` | `{sessionId, captchaImage}` |
| POST | `/submit-captcha` | `{sessionId, captchaText}` | `{status, data}` |
| POST | `/submit-captcha-auto` | `{sessionId, twoCaptchaKey?}` | `{status, data}` |
| GET | `/health` | - | `{status, activeSessions}` |

## Flow

### Manual CAPTCHA (user solves)
1. Call `/init-search` → get `captchaImage` (base64) + `sessionId`
2. Show image to user, user types the text
3. Call `/submit-captcha` with `{sessionId, captchaText}`

### Auto CAPTCHA (2captcha)
1. Call `/init-search` → get `sessionId`
2. Call `/submit-captcha-auto` with `{sessionId}`

## Railway Dockerfile (if needed)

```dockerfile
FROM mcr.microsoft.com/playwright:v1.44.0-jammy
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```
