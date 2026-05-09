# VM Public NSG Removal Controlled Window

Use this runbook only during an approved maintenance window. Do not remove the
temporary public VM NSG rules until Tailscale access and Azure recovery paths are
verified from two operator devices.

Source state: `docs/infrastructure/vm-access-hardening-state-2026-05-09.md`.

Status: primary Mac Tailscale reachability, `dev-workspace-vm` `/orch/healthz`,
OpenClaw Tailscale ports `443` and `18789`, and Azure Run Command fallback were
verified on 2026-05-09. Public NSG removal is still blocked until a second
operator device verifies reachability and SSH.

## Scope

| VM | Resource group | NSG | Temporary public rules |
|---|---|---|---|
| `dev-workspace-vm` | `dev-ws-westus2` | `dev-workspace-vmNSG` | `default-allow-ssh` TCP `22` from `174.232.30.68/32` |
| `openclaw-gateway-vm` | `openclaw-rg` | `openclaw-gateway-vmNSG` | `default-allow-ssh` TCP `22`, `allow-dashboard` TCP `8501`, `AllowIBKR` TCP `5000`, `AllowIBKR2` TCP `5001` from `174.232.30.68/32` |

Tailscale facts captured 2026-05-09:

| VM | MagicDNS | Tailscale IPv4 |
|---|---|---:|
| `dev-workspace-vm` | `dev-workspace-vm.tail18ff5a.ts.net` | `100.117.16.63` |
| `openclaw-gateway-vm` | `openclaw-gateway-vm.tail18ff5a.ts.net` | `100.126.194.98` |

Observed Serve routes:

```text
https://dev-workspace-vm.tail18ff5a.ts.net
|-- /     proxy http://localhost:6080
|-- /api  proxy http://localhost:8787
|-- /orch proxy http://localhost:8100

tcp://openclaw-gateway-vm.tail18ff5a.ts.net:18789 -> tcp://127.0.0.1:18789
tcp://openclaw-gateway-vm.tail18ff5a.ts.net:443   -> tcp://127.0.0.1:18789
```

## Abort Criteria

Abort before changing NSGs if any item is true:

- Fewer than two operator devices can reach both MagicDNS names over Tailscale.
- Tailscale SSH or regular SSH over Tailscale fails for either VM.
- Neither Azure Run Command nor Serial Console is verified for both VMs.
- `dev-workspace-vm` `/orch/healthz` or required operator URLs fail over Tailscale.
- `openclaw-gateway-vm` dashboard, gateway, or IBKR-required flows fail over Tailscale.
- Current NSG rule state does not match the expected rule names, ports, or source
  `174.232.30.68/32`.
- The operator cannot capture rollback rule JSON before deletion.
- Rollback command arguments cannot be resolved from the captured rule JSON.

## Prechecks

Run from the primary operator device and repeat the Tailscale checks from a
second operator device.

1. Confirm Azure account and subscription context.

```bash
az account show -o table
```

2. Capture current rollback evidence before any delete.

```bash
mkdir -p /tmp/vm-nsg-removal-rollback

az network nsg rule show \
  --resource-group dev-ws-westus2 \
  --nsg-name dev-workspace-vmNSG \
  --name default-allow-ssh \
  -o json > /tmp/vm-nsg-removal-rollback/dev-workspace-vm-default-allow-ssh.json

az network nsg rule show \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name default-allow-ssh \
  -o json > /tmp/vm-nsg-removal-rollback/openclaw-gateway-vm-default-allow-ssh.json

az network nsg rule show \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name allow-dashboard \
  -o json > /tmp/vm-nsg-removal-rollback/openclaw-gateway-vm-allow-dashboard.json

az network nsg rule show \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name AllowIBKR \
  -o json > /tmp/vm-nsg-removal-rollback/openclaw-gateway-vm-AllowIBKR.json

az network nsg rule show \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name AllowIBKR2 \
  -o json > /tmp/vm-nsg-removal-rollback/openclaw-gateway-vm-AllowIBKR2.json
```

3. Confirm each rule still has the expected source and port.

```bash
az network nsg rule list \
  --resource-group dev-ws-westus2 \
  --nsg-name dev-workspace-vmNSG \
  --query "[?name=='default-allow-ssh'].{name:name,priority:priority,access:access,sourcePrefix:sourceAddressPrefix,sourcePrefixes:sourceAddressPrefixes,dstPort:destinationPortRange,dstPorts:destinationPortRanges}" \
  -o table

az network nsg rule list \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --query "[?contains(['default-allow-ssh','allow-dashboard','AllowIBKR','AllowIBKR2'], name)].{name:name,priority:priority,access:access,sourcePrefix:sourceAddressPrefix,sourcePrefixes:sourceAddressPrefixes,dstPort:destinationPortRange,dstPorts:destinationPortRanges}" \
  -o table
```

4. Verify MagicDNS and Tailscale IP reachability from both operator devices.

```bash
tailscale status
tailscale ping dev-workspace-vm.tail18ff5a.ts.net
tailscale ping openclaw-gateway-vm.tail18ff5a.ts.net
ping -c 3 100.117.16.63
ping -c 3 100.126.194.98
```

5. Verify Tailscale SSH or regular SSH over Tailscale for both VMs.

```bash
tailscale ssh <vm-user>@dev-workspace-vm.tail18ff5a.ts.net 'hostname; tailscale status --self'
tailscale ssh <vm-user>@openclaw-gateway-vm.tail18ff5a.ts.net 'hostname; tailscale status --self'

# If these hosts use regular SSH over Tailscale instead of Tailscale SSH:
ssh <vm-user>@dev-workspace-vm.tail18ff5a.ts.net 'hostname; tailscale status --self'
ssh <vm-user>@openclaw-gateway-vm.tail18ff5a.ts.net 'hostname; tailscale status --self'
```

6. Verify Azure recovery access for both VMs. Run Command is sufficient if it
returns successfully; otherwise verify Serial Console before proceeding.

```bash
az vm run-command invoke \
  --resource-group dev-ws-westus2 \
  --name dev-workspace-vm \
  --command-id RunShellScript \
  --scripts 'hostname; tailscale status --self; ss -tlnp'

az vm run-command invoke \
  --resource-group openclaw-rg \
  --name openclaw-gateway-vm \
  --command-id RunShellScript \
  --scripts 'hostname; tailscale status --self; ss -tlnp'

# If Run Command is unavailable, verify Serial Console access instead:
az serial-console connect --resource-group dev-ws-westus2 --name dev-workspace-vm
az serial-console connect --resource-group openclaw-rg --name openclaw-gateway-vm
```

7. Verify Tailscale Serve and service paths.

```bash
tailscale ssh <vm-user>@dev-workspace-vm.tail18ff5a.ts.net 'tailscale serve status'
tailscale ssh <vm-user>@openclaw-gateway-vm.tail18ff5a.ts.net 'tailscale serve status'

curl -fsS https://dev-workspace-vm.tail18ff5a.ts.net/orch/healthz
curl -fsS https://dev-workspace-vm.tail18ff5a.ts.net/api/health || true
curl -fsSI https://dev-workspace-vm.tail18ff5a.ts.net/

nc -vz openclaw-gateway-vm.tail18ff5a.ts.net 443
nc -vz openclaw-gateway-vm.tail18ff5a.ts.net 18789
curl -fsSI http://openclaw-gateway-vm.tail18ff5a.ts.net:8501/ || true
nc -vz openclaw-gateway-vm.tail18ff5a.ts.net 5000 || true
nc -vz openclaw-gateway-vm.tail18ff5a.ts.net 5001 || true
```

For commands marked `|| true`, confirm the expected application-specific result
before proceeding. Do not proceed on an unexplained failure.

## Remove Public NSG Rules

Remove one VM and one service class at a time. After each delete, run the
validation section before continuing.

### Option A: Delete Rules

```bash
az network nsg rule delete \
  --resource-group dev-ws-westus2 \
  --nsg-name dev-workspace-vmNSG \
  --name default-allow-ssh

az network nsg rule delete \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name default-allow-ssh

az network nsg rule delete \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name allow-dashboard

az network nsg rule delete \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name AllowIBKR

az network nsg rule delete \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name AllowIBKR2
```

### Option B: Controlled Update Instead Of Delete

Use this only if the change window approves retaining the rule object while
removing the old trusted source. Replace `<new-private-or-approved-cidr>` with
an approved non-public management source, or abort.

```bash
az network nsg rule update \
  --resource-group dev-ws-westus2 \
  --nsg-name dev-workspace-vmNSG \
  --name default-allow-ssh \
  --source-address-prefixes <new-private-or-approved-cidr>

az network nsg rule update \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name default-allow-ssh \
  --source-address-prefixes <new-private-or-approved-cidr>

az network nsg rule update \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name allow-dashboard \
  --source-address-prefixes <new-private-or-approved-cidr>

az network nsg rule update \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name AllowIBKR \
  --source-address-prefixes <new-private-or-approved-cidr>

az network nsg rule update \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name AllowIBKR2 \
  --source-address-prefixes <new-private-or-approved-cidr>
```

## Validation

Run after each service class and again at the end.

1. Confirm the removed rules are absent or no longer reference
   `174.232.30.68/32`.

```bash
az network nsg rule list \
  --resource-group dev-ws-westus2 \
  --nsg-name dev-workspace-vmNSG \
  --query "[?name=='default-allow-ssh']" \
  -o table

az network nsg rule list \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --query "[?contains(['default-allow-ssh','allow-dashboard','AllowIBKR','AllowIBKR2'], name)]" \
  -o table
```

2. Confirm effective NSGs on the VM NICs.

```bash
az network nic list-effective-nsg \
  --resource-group dev-ws-westus2 \
  --name <dev-workspace-vm-nic-name> \
  -o table

az network nic list-effective-nsg \
  --resource-group openclaw-rg \
  --name <openclaw-gateway-vm-nic-name> \
  -o table
```

3. Confirm Tailscale access and app paths still work from both operator devices.

```bash
tailscale ping dev-workspace-vm.tail18ff5a.ts.net
tailscale ping openclaw-gateway-vm.tail18ff5a.ts.net
tailscale ssh <vm-user>@dev-workspace-vm.tail18ff5a.ts.net 'hostname'
tailscale ssh <vm-user>@openclaw-gateway-vm.tail18ff5a.ts.net 'hostname'
curl -fsS https://dev-workspace-vm.tail18ff5a.ts.net/orch/healthz
nc -vz openclaw-gateway-vm.tail18ff5a.ts.net 443
nc -vz openclaw-gateway-vm.tail18ff5a.ts.net 18789
```

4. Confirm Azure recovery still works.

```bash
az vm run-command invoke \
  --resource-group dev-ws-westus2 \
  --name dev-workspace-vm \
  --command-id RunShellScript \
  --scripts 'hostname'

az vm run-command invoke \
  --resource-group openclaw-rg \
  --name openclaw-gateway-vm \
  --command-id RunShellScript \
  --scripts 'hostname'
```

## Rollback

Rollback immediately if Tailscale SSH, required service paths, or Azure recovery
access fails after any NSG change.

### If Rules Still Exist

Restore the previous trusted public source:

```bash
az network nsg rule update \
  --resource-group dev-ws-westus2 \
  --nsg-name dev-workspace-vmNSG \
  --name default-allow-ssh \
  --source-address-prefixes 174.232.30.68/32

az network nsg rule update \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name default-allow-ssh \
  --source-address-prefixes 174.232.30.68/32

az network nsg rule update \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name allow-dashboard \
  --source-address-prefixes 174.232.30.68/32

az network nsg rule update \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name AllowIBKR \
  --source-address-prefixes 174.232.30.68/32

az network nsg rule update \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name AllowIBKR2 \
  --source-address-prefixes 174.232.30.68/32
```

### If Rules Were Deleted

Use the captured JSON to fill each `<captured-...>` value. Preserve the original
priority, direction, protocol, access, destination prefix, and destination port.

```bash
az network nsg rule create \
  --resource-group dev-ws-westus2 \
  --nsg-name dev-workspace-vmNSG \
  --name default-allow-ssh \
  --priority <captured-priority> \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes 174.232.30.68/32 \
  --source-port-ranges '*' \
  --destination-address-prefixes <captured-destination-address-prefixes> \
  --destination-port-ranges 22

az network nsg rule create \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name default-allow-ssh \
  --priority <captured-priority> \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes 174.232.30.68/32 \
  --source-port-ranges '*' \
  --destination-address-prefixes <captured-destination-address-prefixes> \
  --destination-port-ranges 22

az network nsg rule create \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name allow-dashboard \
  --priority <captured-priority> \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes 174.232.30.68/32 \
  --source-port-ranges '*' \
  --destination-address-prefixes <captured-destination-address-prefixes> \
  --destination-port-ranges 8501

az network nsg rule create \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name AllowIBKR \
  --priority <captured-priority> \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes 174.232.30.68/32 \
  --source-port-ranges '*' \
  --destination-address-prefixes <captured-destination-address-prefixes> \
  --destination-port-ranges 5000

az network nsg rule create \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name AllowIBKR2 \
  --priority <captured-priority> \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes 174.232.30.68/32 \
  --source-port-ranges '*' \
  --destination-address-prefixes <captured-destination-address-prefixes> \
  --destination-port-ranges 5001
```

After rollback, rerun validation and record the failed gate before scheduling a
new change window.
