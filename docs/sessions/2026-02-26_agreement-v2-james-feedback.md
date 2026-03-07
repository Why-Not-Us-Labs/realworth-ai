# Session: Beta Agreement v2 — James's Feedback
**Date:** February 26, 2026
**Focus:** Review meeting notes/transcript, draft Slack recap, revise 30-Day Beta Agreement based on James's feedback

## Executive Summary

Reviewed the Feb 25 Granola meeting notes and full transcript from the RealWorth x Bullseye sync. Drafted a concise Slack recap message using "economy of language" style. Caught and corrected a misattribution (10+ hrs/week was Graham, not James — James's time commitment is still TBD). Then reviewed James's detailed feedback on the 30-Day Beta Agreement and drafted v2 addressing all four concerns. Gavin agreed with all of James's feedback ("we do it all with him or don't do it at all").

## Key Decisions

1. **Exclusivity is real** — Removed the blanket 30-day opt-out. Exclusivity stands for full 2 years unless material breach, missed volume thresholds, or mutual agreement.
2. **Vertical IP protection** — New Section 9.2 protects sneaker/streetwear model improvements trained with James's data from being deployed to competitors during exclusivity.
3. **Joint work scoped** — Section 9.4 prevents either party from selling jointly developed work to direct competitors during exclusivity.
4. **Transaction fee range locked** — 1-5% per completed transaction, exact rate TBD after staff testing, changes require mutual agreement.
5. **Exclusivity survives beta termination** — Section 10 clarified that ending the beta doesn't kill the 2-year exclusivity.

## James's Feedback (4 Items)

| Section | Issue | Resolution in v2 |
|---------|-------|-------------------|
| 4.2 (Exclusivity Opt-Out) | Blanket 30-day opt-out undermines 2-year exclusivity | Replaced with cause-based termination only: breach (30-day cure), volume thresholds (2 quarters + 90-day notice), or mutual agreement |
| 7.1 (Transaction Fees) | No range specified, could surprise either party | Added 1-5% range, mutual agreement to finalize and adjust |
| 9.1 (IP) | Vertical-specific model improvements could go to competitors | New 9.2: vertical improvements can't be deployed to competing sneaker/streetwear retailers without James's consent during exclusivity |
| 9.3 (Jointly Developed Work) | "Respective businesses" too vague | Defined "direct competitor", prohibited licensing joint work to competitors during exclusivity |

## Files Created/Changed

### New Files
- `legal/partnership/30_DAY_BETA_AGREEMENT_V2.md` — Full v2 agreement (gitignored)
- `~/Desktop/RealWorth x Bullseye - 30 Day Beta Agreement v2.docx` — Word doc for James
- Google Drive: `08 Legal and IP/RealWorth x Bullseye - 30 Day Beta Agreement v2.docx`

### No Code Changes
- No application code modified this session
- `sammy@whynotus.ai` admin access was already done (commit `c9e2312`)

## Meeting Transcript Insights

From the Feb 25 meeting transcript:
- **Gavin**: 50% RealWorth / 50% job search, Fri-Mon best days
- **Graham**: 10+ hrs/week, weeknights preferred (explicitly stated)
- **James**: TBD — "I need to see a week here to get an exact idea" (settling in Italy)
- James offered to find consulting work at Bullseye for Gavin (process improvement, separate from RealWorth)
- James wants equity + transaction fees, not just being a client
- Both sides agreed beta is smart but James needs to know his investment (expertise, data, network) is protected
- Patent vs trade secret decision deferred — speed to market prioritized
- Need to hide rationale/methodology from public interface before launch

## User Preferences Noted
- **"Economy of language"** — Gavin wants Slack messages tight, concise, no fluff
- **"We do it all with him or don't do it at all"** — Full alignment with James's feedback, no pushback

## Commits
- None this session (agreement docs in gitignored `legal/` directory, docx on Desktop)

## Next Session Priorities
1. **James's response to v2** — May need v3 adjustments
2. **Define volume thresholds** (Section 4.2b requires within 60 days)
3. **James's time commitment** — Follow up once he's settled in Italy
4. **Resume Bullseye portal dev**: share links, accept offer flow, Shopify integration
5. **Verify share links** after `user_id` nullable fix
6. **Hide rationale from public interface** — James + meeting consensus: show offer, not method
