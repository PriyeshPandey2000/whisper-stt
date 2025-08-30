# Whispering Desktop App → SaaS Conversion Tasks

## Overview
Converting the open-source Whispering desktop app to a SaaS model with unified auth, embedded API keys, usage tracking, and tiered pricing.

## Core Architecture Changes

### 1. Authentication Integration
- [ ] Add Supabase client to desktop app
- [ ] Build login/signup UI flows in desktop app
- [ ] Implement secure session storage in desktop app
- [ ] Add "Sign in with existing account" flow for current users
- [ ] Test auth flow end-to-end

### 2. API Key Management
- [ ] Replace BYOK (Bring Your Own Key) system with embedded keys
- [ ] Securely embed your API keys in desktop app
- [ ] Remove API key input fields from settings UI
- [ ] Update transcription services to use embedded keys
- [ ] Add API key rotation mechanism

### 3. Usage Tracking System
- [ ] Implement usage tracking in desktop app after each API call
- [ ] Create usage tracking functions for different providers:
  - [ ] OpenAI (token-based): Extract `usage.total_tokens` from response
  - [ ] Groq (token-based): Extract token usage from response
  - [ ] Deepgram (duration-based): Track audio duration
  - [ ] ElevenLabs (duration-based): Track audio duration
- [ ] Calculate costs based on provider pricing + markup
- [ ] Store usage locally in desktop app
- [ ] Implement periodic sync of usage data to backend

## Database & Backend Setup

### 4. Database Schema
- [ ] Add usage tracking table:
  ```sql
  api_usage (
    id, user_id, provider, model, 
    tokens_used, duration_seconds, 
    provider_cost_cents, user_cost_cents, 
    created_at
  )
  ```
- [ ] Add subscription management tables:
  ```sql
  subscriptions (
    id, user_id, plan_type, status, 
    current_period_start, current_period_end, 
    usage_limit_minutes
  )
  ```
- [ ] Add billing/payment tables for Stripe integration

### 5. Backend API Endpoints (Next.js)
- [ ] Create usage reporting endpoint (`/api/usage/report`)
- [ ] Create subscription management endpoints
- [ ] Create billing/payment endpoints
- [ ] Add usage analytics endpoints for user dashboard

## Pricing & Billing Implementation

### 6. Three-Tier Pricing System
- [ ] **Basic Tier**: $9/month (500 minutes)
  - [ ] Implement monthly limit checking
  - [ ] Add upgrade prompts when approaching limit
- [ ] **Pro Tier**: $19/month (1,500 minutes)
  - [ ] Implement monthly limit checking
  - [ ] Add upgrade/downgrade options
- [ ] **Usage-Based Tier**: $0.015/minute
  - [ ] Implement real-time cost calculation
  - [ ] Add balance/credits system
  - [ ] Add auto-recharge options

### 7. Billing Integration
- [ ] Integrate Stripe for subscription billing
- [ ] Implement usage-based billing for power users
- [ ] Add payment method management
- [ ] Implement billing alerts/notifications
- [ ] Add invoice generation

## Desktop App UI Updates

### 8. User Account Management
- [ ] Add account section to desktop app showing:
  - [ ] Current plan and usage
  - [ ] Billing information
  - [ ] Usage history
  - [ ] Plan upgrade/downgrade options
- [ ] Add billing/payment UI in desktop app
- [ ] Implement usage alerts (approaching limits)

### 9. Settings UI Modifications
- [ ] Remove API key input fields
- [ ] Add plan selection UI
- [ ] Add usage monitoring dashboard
- [ ] Update provider selection based on chosen plan

## Website & Distribution

### 10. Next.js Website Updates
- [ ] Update website for pure marketing/distribution (no auth needed)
- [ ] Add download pages for desktop app installers
- [ ] Create pricing page showcasing three tiers
- [ ] Add customer testimonials/case studies
- [ ] Implement app auto-updater hosting

### 11. App Distribution & Updates
- [ ] Set up CI/CD pipeline for building signed installers
- [ ] Host update manifests on website
- [ ] Implement auto-update notifications in desktop app
- [ ] Add version control and rollback capabilities
- [ ] Test update mechanism across platforms (Mac/Windows/Linux)

## Migration & Launch Strategy

### 12. User Migration
- [ ] Plan migration strategy for existing open-source users
- [ ] Implement freemium model transition
- [ ] Offer migration credits for existing users
- [ ] Create clear communication about benefits of hosted version
- [ ] Add gradual BYOK deprecation timeline

### 13. Testing & Quality Assurance
- [ ] Test all pricing tiers thoroughly
- [ ] Test usage tracking accuracy across all providers
- [ ] Test billing calculations and Stripe integration
- [ ] Test auto-updater mechanism
- [ ] Conduct security audit of embedded API keys
- [ ] Performance test with high usage scenarios

### 14. Launch Preparation
- [ ] Prepare marketing materials
- [ ] Set up customer support system
- [ ] Create user onboarding flow
- [ ] Implement analytics and monitoring
- [ ] Prepare documentation and help articles

## Cost & Profit Analysis

### Expected Profit Margins (based on realistic model usage mix):
- **Basic ($9/month)**: ~89% profit margin
- **Pro ($19/month)**: ~84% profit margin  
- **Usage-based ($0.015/min)**: ~70-90% profit margin

### Supported Models & Costs:
- **OpenAI**: $0.003-0.006/min
- **Groq**: $0.00033-0.00185/min (cheapest)
- **Deepgram**: $0.0025-0.0059/min
- **ElevenLabs**: $0.0067/min (most expensive)

## Timeline Estimate
- **Phase 1** (Auth + Usage Tracking): 2-3 weeks
- **Phase 2** (Billing + Pricing): 2-3 weeks  
- **Phase 3** (UI Updates + Testing): 1-2 weeks
- **Phase 4** (Launch Prep + Migration): 1 week

**Total Estimated Timeline**: 6-9 weeks

## Success Metrics
- [ ] User conversion rate from open-source to paid
- [ ] Monthly recurring revenue growth
- [ ] Customer acquisition cost vs. lifetime value
- [ ] Usage tracking accuracy (compare to provider bills)
- [ ] Customer satisfaction and retention rates

# Screenshot Context Integration (Competitive Feature)

## Overview
Add screenshot context to transformations to compete with WispFlow and SuperWhisper. This allows the LLM to see what's on screen during transformation for better formatting, spelling, and contextual understanding.

## Core Implementation

### 1. Screenshot Capture Service
- [ ] Create ScreenshotService using Tauri native capabilities
- [ ] Implement cross-platform screenshot capture (macOS/Windows/Linux)
- [ ] Add base64 encoding for API transmission
- [ ] Implement screenshot compression/resizing for API efficiency
- [ ] Add error handling for screenshot permissions

### 2. Enhanced Completion Services
- [ ] Modify CompletionService interface to support multimodal inputs:
  - [ ] Add `screenshots?: string[]` parameter
  - [ ] Update type definitions in `completion/types.ts`
- [ ] Update OpenAI service to handle vision models (gpt-4o series)
- [ ] Update Anthropic service to handle vision models (claude-sonnet-4-0)  
- [ ] Update Google service to handle vision models (gemini-2.5-flash)
- [ ] Update Groq service with vision fallback (limited support)
- [ ] Implement automatic model routing to vision-capable models when screenshots provided

### 3. Database Schema Updates
- [ ] Add screenshot context fields to transformation steps:
  ```typescript
  'prompt_transform.enableScreenshotContext': boolean;
  'prompt_transform.screenshotData'?: string; // for debugging/reproduction
  ```
- [ ] Update transformation run tracking to include screenshot usage
- [ ] Add settings for screenshot capture behavior

### 4. Enhanced Transformation Pipeline
- [ ] Modify `handleStep` function in `transformer.ts` to:
  - [ ] Capture screenshot at transformation time (not recording time)
  - [ ] Pass screenshot to completion services when enabled
  - [ ] Handle screenshot capture errors gracefully
- [ ] Update transformation step execution to include visual context
- [ ] Add screenshot timing optimization (capture once per transformation run)

### 5. UI Settings and Controls
- [ ] Add global screenshot context setting in settings UI
- [ ] Add per-transformation screenshot toggle in transformation editor
- [ ] Add screenshot quality/resolution settings
- [ ] Add privacy controls:
  - [ ] Enable/disable screenshot context
  - [ ] Clear screenshot data after transformation
  - [ ] Screenshot preview/confirmation option
- [ ] Add visual indicators when screenshot context is active

### 6. Privacy and Performance Features
- [ ] Implement opt-in screenshot capture (disabled by default)
- [ ] Add screenshot data cleanup after transformation completion
- [ ] Implement screenshot caching for multiple transformation steps
- [ ] Add user consent/permission handling
- [ ] Implement screenshot blur/redaction for sensitive areas (future enhancement)

## Technical Architecture Decisions

### Screenshot Timing Strategy
- Capture at **transformation time** (not recording time) for real-time context
- Cache screenshot during transformation run to avoid multiple captures
- Clean up screenshot data after transformation completion

### Model Selection Strategy  
- Automatically route to vision-capable models when screenshots enabled
- Graceful fallback to text-only models if vision models unavailable
- Clear user feedback about model selection based on screenshot context

### Privacy-First Approach
- Screenshots never stored permanently
- Local processing only
- Clear user controls and transparency
- Opt-in rather than opt-out

## Implementation Priority
1. **Phase 1**: Screenshot service and basic capture
2. **Phase 2**: Enhanced completion service interfaces
3. **Phase 3**: Transformation pipeline integration
4. **Phase 4**: UI controls and settings
5. **Phase 5**: Privacy features and performance optimization
6. **Phase 6**: Testing across all AI providers

