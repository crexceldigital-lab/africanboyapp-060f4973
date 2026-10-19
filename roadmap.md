# Monitoring findings
- [ ] Verify and fix relative product images in Fit Me.
- [x] Verify proposals table exists (already repaired; two saved offers).
- [ ] Fix database-backed legacy review actions and save failures.
- [ ] Handle all agreement download failures visibly.
- [ ] Run regression tests and verify affected flows.

# Wholesale proposal improvements
- [x] Improve existing PDF layout, goods-only totals, notices and signature fields.
- [x] Ensure downloads use saved offers and approved information, without invented fallback data.
- [x] Resolve current preview errors and run relevant tests (35 passed; preview build OK).
- [x] Generate real-offer and long-list PDFs; visually inspect every page and verify admin download (2-page real offer and 6-page stress test; corrected wrapped SKUs, crowded notices and unsupported representative claims).