# AgentID Project Overview

This overview tracks what is complete in the repository, what is locally verified, and what still depends on deployment work.

## Phase Summary
| Phase | Status | Meaning |
| --- | --- | --- |
| 1 | Complete in repo | Anchor identity/reputation protocol is implemented and tested. |
| 2 | Complete in repo | Bubblegum registration path and shared-tree wiring are present. |
| 3 | Complete in repo | Metadata API, oracle service, and x402 middleware exist in working repo form. |
| 4 | Complete in repo | Frontend reads real on-chain state and exposes treasury controls. |
| 5 | Complete locally | Local verification is green across frontend, SDK, x402, metadata API typecheck, and Anchor tests. |
| 6 | In progress | India-compliance helpers/UI exist, but the product surface is still partial. |
| 7 | Complete in repo | SDK and ELIZA plugin are implemented. |
| 8 | In progress | Treasury and x402 foundations are present; the first paid treasury API route now exists, but live treasury validation and broader adoption remain. |

## Local Verification Checklist
- `cd frontend && npm test`
- `cd frontend && npm run build`
- `cd packages/sdk && npm test`
- `cd backend/x402 && npm test`
- `cd backend/api && npx tsc --noEmit`
- `cd backend && anchor test`

## Live Verification Still Required
1. Redeploy the frontend.
2. Redeploy the metadata API.
3. Confirm oracle webhook delivery with the deployed secrets.
4. Run a live treasury flow on devnet:
   - initialize treasury
   - deposit devnet USDC
   - update limits
   - pause and unpause
   - confirm payment enforcement behavior

## Phase 8 Next Work
1. Verify the new paid treasury route live after redeploy.
2. Keep improving treasury tooling in the SDK and frontend.
3. Add live smoke checks for treasury and payment flows after each deployment.
