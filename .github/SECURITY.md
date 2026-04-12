# Security Policy

## Supported Versions

Currently, the following versions of AgentID are supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |

## Reporting a Vulnerability

We take the security of AgentID seriously. If you have discovered a security vulnerability, please report it to us responsibly.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please send an email to the repository maintainers with:

1. A description of the vulnerability
2. Steps to reproduce the issue
3. Potential impact of the vulnerability
4. Any suggested fixes (if you have them)

### What to Expect

- You should receive an acknowledgment within 48 hours
- We will investigate and validate the vulnerability
- We will work on a fix and coordinate disclosure timing with you
- We will credit you in the security advisory (unless you prefer to remain anonymous)

## Security Best Practices

When using AgentID:

1. **Never commit secrets**: Don't commit private keys, seed phrases, or API keys to the repository
2. **Use environment variables**: Store sensitive configuration in environment variables
3. **Keep dependencies updated**: Regularly update npm packages and Rust crates
4. **Audit smart contracts**: Have smart contracts audited before mainnet deployment
5. **Use secure RPC endpoints**: Only connect to trusted Solana RPC endpoints
6. **Validate all inputs**: Always validate and sanitize user inputs
7. **Follow principle of least privilege**: Grant minimum necessary permissions

## Known Security Considerations

- This project is in active development and has not been audited
- The Anchor program should be thoroughly tested and audited before mainnet deployment
- Treasury and payment features involve real assets and require careful security review
- Always test on devnet/testnet before deploying to mainnet

## Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed. Updates will be announced through:

- GitHub Security Advisories
- Release notes
- Repository README

## Responsible Disclosure

We request that security researchers:

- Give us reasonable time to respond to and fix vulnerabilities before public disclosure
- Make a good faith effort to avoid privacy violations and service disruptions
- Do not access or modify data that doesn't belong to you
- Contact us first before sharing details of the vulnerability publicly
