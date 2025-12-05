# Storage Setup Guides

Choose your preferred storage option and follow the setup guide below.

## Option 1: Firebase Storage (Easiest - Already Using Firebase)

### Why Choose This?
- ✅ Already in your stack
- ✅ Free tier: 5GB storage, 1GB/day downloads
- ✅ Zero additional setup
- ✅ CDN-backed URLs

### Setup Steps

1. **Update storage adapter import** in `uploadController.js`:
   ```javascript
   // Change from:
   import storageAdapter from "../../config/storageAdapter.js";
   
   // To:
   import storageAdapter from "../../config/storageAdapterFirebase.js";
   ```

2. **Set environment variable** (optional, auto-detects in production):
   ```bash
   USE_FIREBASE_STORAGE=true
   ```

3. **That's it!** Firebase Storage is already configured in your project.

### Cost
- Free: 5GB storage, 1GB/day downloads
- Paid: $0.026/GB storage, $0.12/GB downloads

---

## Option 2: Cloudflare R2 (Best Value - No Egress Fees)

### Why Choose This?
- ✅ **No egress fees** (unlike S3)
- ✅ Free tier: 10GB storage/month
- ✅ Very affordable
- ✅ Fast CDN

### Setup Steps

1. **Install AWS SDK** (S3-compatible):
   ```bash
   npm install @aws-sdk/client-s3
   ```

2. **Create Cloudflare R2 bucket**:
   - Go to Cloudflare Dashboard → R2
   - Create a bucket (e.g., `gametribe-games`)
   - Note your bucket name

3. **Create API Token**:
   - Go to R2 → Manage R2 API Tokens
   - Create token with Read/Write permissions
   - Save Access Key ID and Secret Access Key

4. **Set environment variables** in Vercel:
   ```
   S3_ENABLED=true
   S3_PROVIDER=Cloudflare R2
   S3_BUCKET_NAME=gametribe-games
   S3_REGION=auto
   S3_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
   S3_ACCESS_KEY_ID=your_access_key_id
   S3_SECRET_ACCESS_KEY=your_secret_access_key
   S3_PUBLIC_URL_BASE=https://pub-[random-id].r2.dev
   S3_FORCE_PATH_STYLE=false
   ```

5. **Update storage adapter** in `uploadController.js`:
   ```javascript
   import storageAdapter from "../../config/storageAdapterS3.js";
   ```

### Cost
- Free: 10GB storage/month
- Paid: $0.015/GB storage, $0 egress

---

## Option 3: AWS S3 (Most Popular)

### Why Choose This?
- ✅ Industry standard
- ✅ Excellent reliability
- ✅ Great documentation
- ✅ Free tier available

### Setup Steps

1. **Install AWS SDK**:
   ```bash
   npm install @aws-sdk/client-s3
   ```

2. **Create S3 bucket**:
   - Go to AWS Console → S3
   - Create bucket (e.g., `gametribe-games`)
   - Enable public access for bucket
   - Set bucket policy for public read access

3. **Create IAM user**:
   - Go to IAM → Users → Create user
   - Attach policy: `AmazonS3FullAccess` (or custom policy)
   - Create access keys
   - Save Access Key ID and Secret Access Key

4. **Set environment variables** in Vercel:
   ```
   S3_ENABLED=true
   S3_PROVIDER=AWS S3
   S3_BUCKET_NAME=gametribe-games
   S3_REGION=us-east-1
   S3_ACCESS_KEY_ID=your_access_key_id
   S3_SECRET_ACCESS_KEY=your_secret_access_key
   ```

5. **Update storage adapter** in `uploadController.js`:
   ```javascript
   import storageAdapter from "../../config/storageAdapterS3.js";
   ```

### Cost
- Free: 5GB storage, 20K requests/month
- Paid: $0.023/GB storage, $0.09/GB egress

---

## Option 4: DigitalOcean Spaces (Simple & Affordable)

### Why Choose This?
- ✅ Simple setup
- ✅ Good pricing
- ✅ Free tier: 250GB/month

### Setup Steps

1. **Install AWS SDK**:
   ```bash
   npm install @aws-sdk/client-s3
   ```

2. **Create Space**:
   - Go to DigitalOcean → Spaces
   - Create space (e.g., `gametribe-games`)
   - Choose region
   - Enable CDN (optional but recommended)

3. **Create API Key**:
   - Go to API → Spaces Keys
   - Generate new key
   - Save Access Key and Secret Key

4. **Set environment variables** in Vercel:
   ```
   S3_ENABLED=true
   S3_PROVIDER=DigitalOcean Spaces
   S3_BUCKET_NAME=gametribe-games
   S3_REGION=nyc3
   S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
   S3_ACCESS_KEY_ID=your_access_key
   S3_SECRET_ACCESS_KEY=your_secret_key
   S3_PUBLIC_URL_BASE=https://gametribe-games.nyc3.cdn.digitaloceanspaces.com
   S3_FORCE_PATH_STYLE=false
   ```

5. **Update storage adapter** in `uploadController.js`:
   ```javascript
   import storageAdapter from "../../config/storageAdapterS3.js";
   ```

### Cost
- Free: 250GB storage/month (trial)
- Paid: $5/month for 250GB + bandwidth

---

## Option 5: Backblaze B2 (Cheapest)

### Why Choose This?
- ✅ Cheapest storage costs
- ✅ Free tier: 10GB storage
- ✅ Good for large files

### Setup Steps

1. **Install AWS SDK**:
   ```bash
   npm install @aws-sdk/client-s3
   ```

2. **Create B2 bucket**:
   - Go to Backblaze → B2 Cloud Storage
   - Create bucket (e.g., `gametribe-games`)
   - Make it public

3. **Create Application Key**:
   - Go to App Keys → Add New Application Key
   - Give it read/write access
   - Save Key ID and Application Key

4. **Set environment variables** in Vercel:
   ```
   S3_ENABLED=true
   S3_PROVIDER=Backblaze B2
   S3_BUCKET_NAME=gametribe-games
   S3_REGION=us-west-000
   S3_ENDPOINT=https://s3.us-west-000.backblazeb2.com
   S3_ACCESS_KEY_ID=your_key_id
   S3_SECRET_ACCESS_KEY=your_application_key
   S3_PUBLIC_URL_BASE=https://f[random-id].backblazeb2.com/file/gametribe-games
   S3_FORCE_PATH_STYLE=true
   ```

5. **Update storage adapter** in `uploadController.js`:
   ```javascript
   import storageAdapter from "../../config/storageAdapterS3.js";
   ```

### Cost
- Free: 10GB storage
- Paid: $0.005/GB storage, $0.01/GB egress

---

## Quick Comparison

| Option | Setup Difficulty | Free Tier | Best For |
|--------|------------------|-----------|----------|
| **Firebase Storage** | ⭐ Easiest | 5GB | Already using Firebase |
| **Cloudflare R2** | ⭐⭐ Medium | 10GB | Best value, no egress fees |
| **AWS S3** | ⭐⭐⭐ Hard | 5GB | Industry standard |
| **DigitalOcean Spaces** | ⭐⭐ Medium | 250GB | Simple, good pricing |
| **Backblaze B2** | ⭐⭐ Medium | 10GB | Cheapest option |

---

## Recommendation

**For your use case, I recommend:**

1. **Firebase Storage** - If you want the easiest setup (already configured!)
2. **Cloudflare R2** - If you want the best value and don't mind a bit more setup
3. **DigitalOcean Spaces** - If you want simplicity with a generous free tier

Choose one and I'll help you implement it!


