# Canonical 2-K programs

The schools table is the source of truth. Reuse has_2k, has_3k and has_prek independently. Match normalized official DBNs (NYCEEC semsCode is the full official identifier). Preserve canonical names, IDs and URLs; source display names live in early_childhood_source. Name/address matches are review candidates only.

Do not write twok_centers or mirror provider datasets. Its legacy API projects schools where has_2k=true. All-school listings include 2-K-only providers. K–12 academic scores do not apply to early-childhood-only grade bands. Missing data is null; never invent enrollment or ratios.

Imports default to validated dry runs. Never deploy or apply production migrations without a separate explicit request. See reports/twok and docs/canonical-2k.md.
