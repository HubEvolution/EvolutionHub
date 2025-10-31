# Image Enhancer MVP - Deployment Guide

## Feature Flags Configuration

### Current Production Settings
- `PUBLIC_ENHANCER_MVP_MODE = "1"` (MVP enabled)
- `PUBLIC_ENHANCER_LEGACY_MODE = "0"` (Legacy disabled)

### Rollback Strategy

#### Immediate Rollback (Emergency)
```bash
# Disable MVP and enable legacy
npx wrangler secret put PUBLIC_ENHANCER_MVP_MODE --env production
# Set value to: "0"

npx wrangler secret put PUBLIC_ENHANCER_LEGACY_MODE --env production  
# Set value to: "1"

# Deploy changes
npx wrangler deploy --env production
```

#### Gradual Rollback (A/B Testing)
```bash
# Enable both MVP and legacy for testing
npx wrangler secret put PUBLIC_ENHANCER_MVP_MODE --env production
# Set value to: "1"

npx wrangler secret put PUBLIC_ENHANCER_LEGACY_MODE --env production
# Set value to: "1"

# Deploy changes
npx wrangler deploy --env production
```

## Performance Monitoring

### Key Metrics to Monitor
1. **Page Load Performance**
   - Time to Interactive for Image Enhancer pages
   - Bundle size impact (ImagEnhancerRouter.js: ~20KB gzipped)

2. **User Experience Metrics**
   - Upload success rate
   - Enhancement processing time
   - Error rates (file validation, API failures)

3. **Resource Usage**
   - R2 storage for enhanced images
   - Workers AI API calls
   - Database usage tracking

### Monitoring Tools
- Cloudflare Analytics: Page views, error rates
- Workers Analytics: Function execution time, success rate
- R2 Analytics: Storage usage, download metrics
- Client-side logging via `clientLogger`

## Health Checks

### Production URL Testing
```bash
# Test MVP interface
curl -I https://hub-evolution.com/en/tools/imag-enhancer/app

# Test API endpoint
curl -X POST https://hub-evolution.com/api/ai-image/generate \
  -H "Content-Type: multipart/form-data" \
  -F "image=@test.jpg" \
  -F "model=@cf/runwayml/stable-diffusion-v1-5-img2img"
```

### Browser Testing Checklist
- [ ] MVP interface loads correctly
- [ ] File upload works (drag & drop, click)
- [ ] Model selection shows Workers AI models only
- [ ] Enhancement process completes successfully
- [ ] Download functionality works
- [ ] Start over returns to upload state
- [ ] Usage information displays correctly
- [ ] Error handling for invalid files

## Troubleshooting

### Common Issues

#### MVP Not Loading
1. Check feature flags in production
2. Verify ImagEnhancerRouter.js is deployed
3. Check browser console for JavaScript errors

#### File Upload Failures
1. Verify file type validation
2. Check file size limits (10MB)
3. Monitor API endpoint health

#### Enhancement Processing Failures
1. Check Workers AI service status
2. Verify R2 bucket permissions
3. Monitor rate limiting thresholds

#### Performance Issues
1. Monitor bundle size impact
2. Check for memory leaks in React components
3. Optimize image processing pipeline

## Security Considerations

### Client-Side Security
- CSRF tokens enforced via `ensureCsrfToken()`
- File type validation on both client and server
- Rate limiting per user plan

### Server-Side Security
- Workers AI model restrictions by environment
- R2 upload permissions scoped to AI images
- Usage tracking and quota enforcement

## Future Improvements

### MVP Enhancements
1. Add progress indicators for long-running enhancements
2. Implement batch processing for multiple images
3. Add more Workers AI model options
4. Implement image preview before enhancement

### Technical Debt
1. Replace `any` types in legacy components
2. Migrate remaining components to strict TypeScript
3. Implement comprehensive error boundaries
4. Add performance monitoring dashboard

## Support Contacts

### Technical Issues
- Check Cloudflare Workers dashboard
- Review deployment logs
- Monitor error rates in analytics

### Rollback Assistance
- Use immediate rollback procedure for critical issues
- Contact Cloudflare support for Workers AI problems
- Monitor user feedback channels for UX issues
