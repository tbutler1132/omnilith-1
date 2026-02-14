# 010 — The Economic Ceiling: Revenue Without Optimization

## Context

The Foundation establishes a viable range for the platform's relationship to economics: economic viability is the floor (the platform must sustain itself to persist), economic optimization is the ceiling (the moment the platform optimizes for transactions, engagement, or growth at the expense of the conditions for beauty, it has crossed the viable range). The Foundation also says the constitutional floor should be structural, not rule-based — "the architecture makes crossing it structurally impossible or self-defeating."

Phase 5 introduces the economic layer: paywall policies, revenue distribution, the platform taking a cut. The Foundation already contemplates this: "Paid artifacts as a visibility level. Nodes can have subscriptions. The platform takes a cut."

The question: how do you build an economic layer that sustains the platform without creating the measurement infrastructure that enables extraction? Revenue creates measurable flows. Measurable flows create optimization incentives. Optimization incentives erode the conditions for beauty. Where do you break this chain?

## Decision

### The line that matters

The distinction is not "does economic data exist" — it is **who uses it and for what.** Economic data flowing to stewards about their own organisms is a bank statement. Economic data flowing to the rendering layer to influence surfacing, prominence, or recommendations is extraction.

The structural constraint: **economic data flows to stewards privately. It never flows to the rendering layer.** Vitality — which drives rendering prominence — is measured by creative activity (state changes, proposals, composition, contributor engagement). Never by consumption. Never by revenue. These are separate systems that do not cross.

### The economic model

**1. Base subscription to inhabit the platform.** This sustains infrastructure. The platform's survival is decoupled from the volume of transactions inside it. The platform is incentivized to make the ecology worth inhabiting, not to maximize commerce within it. The subscription is the floor — it covers costs regardless of how much economic activity happens.

**2. The platform takes a modest cut of transactions.** Already in the Foundation. Lets the platform participate in the upside when its inhabitants thrive. The key: this cut does not create internal optimization pressure because the platform already has its subscription floor. The cut is sustenance, not survival. The specific percentage is a business decision to be made when implementing Phase 5. It should be modest — enough to sustain, not enough to incentivize the platform to maximize transactions.

**3. Stewards see their own economic data, privately.** Revenue per organism, distribution breakdowns, transaction history. This is operational information necessary for running a creative practice. What the platform does NOT provide:
- Comparison to other communities or organisms ("top earning," "similar organisms earn X")
- Optimization suggestions or growth analytics
- Trend lines or projections that invite strategic thinking
- Conversion funnels or A/B testing tools

You see your bank statement. The bank does not send you your neighbor's income.

**4. No consumption metrics — structurally absent.** This is the hard line. No play counts. No view counts. No download counts. No time-spent measurements. The data does not exist in the infrastructure. The event system records mutations (state changes, proposals, integrations), never passive consumption (someone viewed an organism, someone played audio). This is structural — the measurement apparatus is not built. You cannot optimize for engagement because engagement is not measured. You cannot A/B test content because there are no metrics to compare.

This is the single decision that makes everything else work. Every other concession in the economic model is manageable. But the moment consumption is measured, the staircase to the ceiling exists. Someone will want to surface "popular" organisms. Someone will argue it's just information. They would be right — it is information. But it is information that restructures the relationship between the creator and their work. The creator begins thinking "what gets plays" instead of "what has coherence." That is the viable range collapsing.

**5. No comparative economic data.** No leaderboards. No "trending." No rankings. No platform-wide economic analytics. The absence of comparison prevents the optimization race between communities. Each community's economic reality is private to its stewards.

**6. Pricing is a curatorial act.** Setting a price on an organism is a deliberate act by the steward — a statement about the organism's relationship to the world, like surfacing is a statement about its place in the ecology. The platform provides no dynamic pricing, no price optimization tools, no "suggested price based on similar organisms." Pricing is a decision, not a variable.

### The analogy

A good city charges property taxes — a predictable cost of being there. It uses revenue to maintain infrastructure. What happens inside the buildings is the inhabitants' business. The city does not take a cut of every meal sold. It does not optimize restaurant placement for foot traffic. It does not show restaurateurs their competitors' revenue. It maintains the conditions for urban life and trusts that viable activity will sustain itself within those conditions.

A mall takes a percentage of every sale, optimizes tenant placement, measures foot traffic and conversion rates. The mall's survival depends on maximizing consumption. Everything in the mall eventually looks the same because everything is optimized for the same metrics.

Omnilith should be a city, not a mall. The subscription is property tax. The transaction cut is a modest levy. The infrastructure is maintained. What flourishes inside is not the platform's business to optimize.

### Precedents

Bandcamp operated profitably for over a decade on a 15% revenue share with minimal engagement metrics — no algorithmic recommendations, no engagement optimization, no trending lists driven by consumption data. Are.na sustains itself on a $7/month subscription with no consumption metrics. Ghost charges creators a monthly fee and provides publishing infrastructure without engagement analytics. These are real, sustainable businesses. None are venture-scale — and Omnilith's own viable range suggests it should not aim for venture scale. Infinite growth is the ceiling applied to the platform itself.

## What this means architecturally

**The event system's scope must be explicitly limited.** Events record actions — state appended, proposal opened, organism composed, proposal integrated. Events must never record passive consumption — organism viewed, audio played, page read. This scope limitation should be documented as a design constraint on the event system, not left to convention.

**Economic policy organisms are Tier 4 content types.** They enter through the content type registry like everything else. Paywall Policy and Revenue Distribution Policy are organisms composed inside the things they govern. They participate in the proposal evaluation loop (the evaluator checks access credentials). No kernel changes required.

**The rendering layer has a structural boundary.** The rendering layer reads vitality (creative activity) and uses it for prominence. It never reads economic data. It never reads consumption data (which doesn't exist). This boundary should be enforced by the data available to the rendering layer — it simply cannot access economic data because the API doesn't expose it in a form the rendering layer consumes.

**The query port does not support consumption queries.** The query port supports queries about organisms, states, composition, relationships, and vitality. It does not support queries like "most viewed," "most played," or "highest revenue" because the underlying data either doesn't exist (consumption) or isn't exposed to the query port (revenue, which flows through the economic layer's own internal data).

## What this does NOT decide

- The specific subscription price or transaction percentage. Business decisions for Phase 5.
- Whether the subscription is per-user, per-community, or tiered. To be determined.
- The exact scope of economic data visible to stewards. The principle is "bank statement, not analytics dashboard," but the specific data points need design work.
- How the economic layer interacts with visibility policies. Paywall policies are visibility policies with an economic condition — the boundary between Tier 2 and Tier 4 content types needs careful design.
- Whether external analytics tools (third-party play counters, etc.) should be actively prevented or simply not facilitated. The platform doesn't build them, but should it block them?

## The concession and the constraint

The pragmatic concession: the platform takes a cut of transactions and stewards see their own economic data. This is not the purest possible position — a pure position would be subscription-only with no economic data at all. But it is honest about the reality that working artists need economic information about their own practice, and the platform benefits from participating modestly in the ecology's economic health.

The immovable constraint: no consumption metrics. This is the structural wall. Everything else in the economic model is negotiable. This is not. The absence of consumption measurement is what prevents the economic layer from becoming an optimization engine. It is the architectural equivalent of the Foundation's "no engagement metrics" — not a rule within the system, but a feature of the system's shape.
