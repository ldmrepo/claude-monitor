# Security Posture

## Current Design: Localhost Only

Claude Vault is designed for **single-developer, local use**. It runs on `localhost` and assumes a trusted network environment.

### What this means

- **No authentication** on any endpoint (hook ingestion, data APIs, dashboard UI)
- **No authorization** — anyone who can reach the server can read all session data
- **No TLS** — communication is plaintext HTTP
- All 10 hook endpoints accept unauthenticated POST requests
- All query APIs return full data without access control

### Why this is acceptable (for now)

- The server binds to `127.0.0.1` by default
- Only the local machine's Claude Code instance sends hooks
- Only the local developer views the dashboard
- No sensitive data leaves the machine

### When this is NOT acceptable

Do NOT expose Claude Vault to the internet or untrusted networks without adding:

1. **API key authentication** on hook endpoints (shared secret via env var)
2. **Session-based auth** on the dashboard (at minimum, a password)
3. **TLS termination** via reverse proxy (nginx/caddy)
4. **IP allowlist** if running on a VPN or shared network

### Data sensitivity

Hook payloads may contain:
- File paths from your project
- Command arguments (including potentially sensitive bash commands)
- Prompt excerpts
- Error messages with stack traces

These are stored in `raw_events.raw_payload_json`. The normalized `events` table stores excerpts only (truncated). No full prompt text or tool output is stored by default.

### Recommendations for shared/remote use

If you need to access the dashboard remotely (e.g., from mobile):
- Use **Tailscale** or similar mesh VPN
- Or use **SSH port forwarding**: `ssh -L 3000:localhost:3000 your-dev-machine`
- Do NOT open the port directly to the internet
