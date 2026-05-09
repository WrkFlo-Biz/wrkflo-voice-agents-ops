# VM Access Hardening State

Captured: 2026-05-09

Scope: `dev-workspace-vm` and `openclaw-gateway-vm` live Azure/Tailscale access state.

No Azure NSG, NIC, public IP, VM, Tailscale Serve, or host firewall changes were made during this pass.

## Executive Finding

Both VMs still depend on temporary trusted-IP public NSG rules for break-glass management access. The current trusted source is `174.232.30.68/32`.

Tailscale is already the right primary stable access path:

- `dev-workspace-vm` has working Tailscale access and Tailscale Serve for `/orch`.
- `openclaw-gateway-vm` has working Tailscale reachability and Tailscale Serve for OpenClaw.
- Public NSG rules for OpenClaw SSH, dashboard, and IBKR ports should remain until a maintenance change verifies Tailscale SSH plus Azure Run Command or Serial Console as recovery paths.

## Current Public NSG Rules

| VM | Rule | Port | Source | Current role |
|---|---|---:|---|---|
| `dev-workspace-vm` | `default-allow-ssh` | `22` | `174.232.30.68/32` | Temporary trusted-IP SSH |
| `openclaw-gateway-vm` | `default-allow-ssh` | `22` | `174.232.30.68/32` | Temporary trusted-IP SSH |
| `openclaw-gateway-vm` | `allow-dashboard` | `8501` | `174.232.30.68/32` | Temporary trusted-IP dashboard |
| `openclaw-gateway-vm` | `AllowIBKR` | `5000` | `174.232.30.68/32` | Temporary trusted-IP IBKR/API |
| `openclaw-gateway-vm` | `AllowIBKR2` | `5001` | `174.232.30.68/32` | Temporary trusted-IP IBKR/API |

## Tailscale State

| VM | MagicDNS | Tailscale IPv4 | State |
|---|---|---:|---|
| `dev-workspace-vm` | `dev-workspace-vm.tail18ff5a.ts.net` | `100.117.16.63` | Online |
| `openclaw-gateway-vm` | `openclaw-gateway-vm.tail18ff5a.ts.net` | `100.126.194.98` | Online |

Observed `dev-workspace-vm` Serve routes:

```text
https://dev-workspace-vm.tail18ff5a.ts.net
|-- /     proxy http://localhost:6080
|-- /api  proxy http://localhost:8787
|-- /orch proxy http://localhost:8100
```

Observed `openclaw-gateway-vm` Serve routes:

```text
tcp://openclaw-gateway-vm.tail18ff5a.ts.net:18789 -> tcp://127.0.0.1:18789
tcp://openclaw-gateway-vm.tail18ff5a.ts.net:443   -> tcp://127.0.0.1:18789
```

## Deferred NSG Removal Checklist

Only run NSG removal in a separate maintenance change:

1. Verify the current Mac and at least one second operator device can reach both VMs over Tailscale MagicDNS.
2. Verify Tailscale admin SSH or regular SSH over Tailscale for both VMs.
3. Verify Azure Run Command or Serial Console fallback for both VMs.
4. Verify `dev-workspace-vm` `/orch/healthz` and required operator URLs over Tailscale.
5. Verify `openclaw-gateway-vm` dashboard, OpenClaw gateway, and IBKR-required flows over Tailscale.
6. Remove public inbound NSG rules one VM and one service class at a time, with rollback commands prepared.

## Follow-Up Readiness Verification

Additional non-destructive checks on 2026-05-09:

- Primary Mac Tailscale ping succeeded to `dev-workspace-vm.tail18ff5a.ts.net` and `openclaw-gateway-vm.tail18ff5a.ts.net`.
- `https://dev-workspace-vm.tail18ff5a.ts.net/orch/healthz` returned `status: ok`.
- `openclaw-gateway-vm.tail18ff5a.ts.net` accepted Tailscale TCP connections on `443` and `18789`.
- Azure Run Command succeeded on both VMs with `hostname; tailscale status --self`.

Remaining gate before public NSG removal: verify Tailscale reachability and SSH from at least one second operator device, then run the public NSG removal runbook.

## Commands Used

Representative read-only checks:

```bash
az vm list -d
az vm nic list
az network nic list-effective-nsg
az network bastion list
az network vnet-gateway list
tailscale status --json
ssh ... hostname
ssh ... tailscale serve status
ssh ... ss -tlnp
curl ...tail18ff5a.ts.net...
```
