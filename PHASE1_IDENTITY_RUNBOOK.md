# Phase 1 Identity Runbook

Last Updated: March 30, 2026

## Scope

This runbook covers the identity-only layer:

- `init_config`
- `register_agent`
- `update_capabilities`
- `verify_agent`
- `log_action`
- `rate_agent`
- `update_reputation`

Treasury deployment and x402 operations are out of scope for this document.

## Exit Criteria

Phase 1 is operationally complete when all of the following are true:

1. The Anchor identity/reputation suite passes on fresh localnet.
2. The devnet program ID and shipped IDLs are in sync.
3. Metadata API is reachable for agent registration payloads.
4. Oracle authority is configured and can submit `update_reputation`.
5. The shared devnet Merkle tree delegates mint authority to the program PDA.
6. Registration, verification, action logging, and rating have been manually verified on devnet from a non-admin wallet.

## Prerequisites

- Solana CLI installed and wallet configured
- Anchor CLI installed
- Node, npm, and yarn installed
- Wallet funded on devnet
- Metadata API deployed or locally reachable
- Oracle signing key available

## Local Verification

From repo root:

```bash
cd backend
yarn install
anchor build
solana-test-validator --reset --rpc-port 8899 --faucet-port 9900 --ledger /tmp/agentid-phase1-ledger
```

In a second terminal:

```bash
cd backend
anchor test --skip-local-validator --provider.cluster http://127.0.0.1:8899
```

Expected result:

- identity, security, and treasury suites pass
- local registration succeeds even if Bubblegum is not deployed locally
- devnet behavior still performs the real Bubblegum CPI when the program is present

## Devnet Deployment Checklist

1. Confirm `backend/target/idl/agentid_program.json` matches the current build.
2. Resync shipped IDLs to:
   - `frontend/src/idl/`
   - `backend/api/idl/`
   - `packages/sdk/src/idl/`
3. Confirm `backend/api/metadata/[agentName].ts` and `[agentId].ts` are deployed and returning valid JSON.
4. Verify the registration UI points to the intended metadata host.
5. Confirm the configured oracle authority is the expected signer in `init_config`.
6. Ensure the shared devnet Merkle tree exists.
   - Create one with `cd backend && ./node_modules/.bin/ts-node scripts/create-merkle-tree.ts` if needed.
7. Deploy the program to devnet.
8. Set the shared tree delegate to the program PDA.
   - Run `cd backend && ./node_modules/.bin/ts-node scripts/set-tree-delegate.ts`
9. Run the automated devnet verification or perform the same flow manually.
   - Recommended: `cd backend && ./node_modules/.bin/ts-node scripts/verify-phase1-devnet.ts`
   - Manual alternative: run registration from the frontend or a non-admin wallet.
10. Verify:
   - the `AgentIdentity` PDA exists
   - metadata URI is correct
   - `verify_agent` returns expected authorization data
   - `rate_agent` updates `human_rating_x10` and `rating_count`
   - `update_reputation` works only from the oracle signer
   - Bubblegum minting succeeds through the shared tree delegate PDA

## Operational Checks

After deployment, validate:

- `register_agent` rejects invalid names, empty metadata URIs, default agent wallets, empty capability sets, invalid service categories, and zero payment limits for payment-enabled agents
- `update_capabilities` rejects capability sets with everything disabled
- `log_action` rejects unknown action types and memos longer than 64 chars
- `verify_agent` fails closed for unknown action types
- `log_action` remains owner-only
- non-admin wallets can register against the shared devnet Merkle tree

## Recovery Steps

### Metadata API failure

- Restore metadata endpoint first
- Re-run frontend registration only after metadata JSON is reachable

### Oracle signer mismatch

- Read the `ProgramConfig` PDA
- Confirm `oracle_authority`
- Rotate by redeploying to a fresh environment or migrating config as needed

### IDL drift

- Rebuild Anchor
- Resync all shipped IDLs
- Rebuild frontend and SDK consumers

### Shared tree registration fails on devnet

- Confirm the deployed program and shipped IDLs are in sync
- Read the `ProgramConfig` PDA and confirm it exists
- Re-run `cd backend && ./node_modules/.bin/ts-node scripts/set-tree-delegate.ts`
- Retry registration from a non-admin wallet

### Localnet registration fails at Bubblegum

- Confirm you are on localnet
- Use the current program build, which skips the Bubblegum CPI if the Bubblegum program is unavailable locally
- If you need full Bubblegum behavior, test on devnet with the real program accounts

## Release Gate For Phase 1

Do not mark Phase 1 complete unless:

- local Anchor tests are green on a fresh validator
- devnet manual registration works from a non-admin wallet
- metadata API is live
- oracle authority is documented and validated
- shared tree delegate is set to the program PDA
- IDLs are synced across consumers
