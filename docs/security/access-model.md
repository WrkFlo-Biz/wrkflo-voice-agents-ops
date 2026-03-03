# Access Model

- Admin operations should be serialized to avoid config drift.
- Runtime edits must use lock protocol and version snapshots.
- Prefer secret references over plaintext headers in tool configs.
