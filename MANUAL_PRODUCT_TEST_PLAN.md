# COMPR manual product test plan

Do not enter personal data. Do not invent outcomes. Complete the empty result columns only while testing real public product pages in Chrome.

| # | Category | Source store and product | Selected variant | Expected recognition | Expected safe outcome | Actual result | Found price | Total incl. visible shipping | Match status | Reason code | Pass/fail | Note |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Electronics | Coolblue — Samsung Galaxy A57 | 256GB, black | Brand/model/capacity/colour | Only cheaper exact 256GB black; otherwise no reliable match | — | — | — | — | — | — | — |
| 2 | Electronics | MediaMarkt — Samsung Galaxy A57 | 128GB | Brand/model/capacity | Never recommend 256GB as same variant | — | — | — | — | — | — | — |
| 3 | Electronics | Belsimpel — current Samsung phone | Device-only purchase | Model/capacity/price type | Reject subscription/monthly amount | — | — | — | — | — | — | — |
| 4 | Electronics | Apple Store — iPhone current model | 256GB, black | Model/capacity/colour | Exact cheaper device-only offer or safe no-match | — | — | — | — | — | — | — |
| 5 | Electronics | Alternate — LG UltraGear monitor | Exact model, 27 inch | Model/screen size | Reject same series at 32 inch | — | — | — | — | — | — | — |
| 6 | Audio | Coolblue — Sony WH-1000XM5 | Black, new | WH compound model/colour | Reject WF earbuds and refurbished | — | — | — | — | — | — | — |
| 7 | Audio | MediaMarkt — Sony WF-1000XM5 | Black, new | WF compound model/colour | Reject WH headphones | — | — | — | — | — | — | — |
| 8 | Audio | Expert — JBL Tune 730BT | Black | Exact Tune model | Reject Tune 720BT | — | — | — | — | — | — | — |
| 9 | Audio | bol.com — JBL Charge 5 | Blue | Model/colour/condition | Reject Charge 6 and used offer | — | — | — | — | — | — | — |
| 10 | Shoes | Nike — Air Max 90 | EU 42, black | Model/selected size/colour | Only exact size and colour | — | — | — | — | — | — | — |
| 11 | Shoes | Zalando — Adidas Samba OG | EU 39, white/black | OG model/size/colour | Reject Samba XLG and wrong size | — | — | — | — | — | — | — |
| 12 | Shoes | Foot Locker — New Balance 740 | EU 43, silver | Model/size/colour | Reject 530 and different colour | — | — | — | — | — | — | — |
| 13 | Shoes | JD Sports — current Nike sneaker | Kids EU size | Model/size/audience | Reject adult or toddler variant | — | — | — | — | — | — | — |
| 14 | Clothing | Wehkamp — Levi's 501 jeans | Waist 32, black | Model/size/colour | Reject waist 34 | — | — | — | — | — | — | — |
| 15 | Clothing | H&M — named jacket | Size M, material shown | Name/size/material | No result if candidate omits required variant | — | — | — | — | — | — | — |
| 16 | Clothing | Zalando — branded women's shoe/apparel | Size L, women | Model/size/audience | Reject men's/kids version | — | — | — | — | — | — | — |
| 17 | Household | Coolblue — Dyson V15 Detect | Exact model, new | Model/condition | Reject motor, battery and refurbished unit | — | — | — | — | — | — | — |
| 18 | Household | bol.com — Oral-B iO6 | Single pack, black | Model/pack/colour | Reject two-pack as same product | — | — | — | — | — | — | — |
| 19 | Household | Amazon.nl — branded detergent | Exact pack quantity/weight | Brand/model/pack/weight | Reject different count or weight | — | — | — | — | — | — | — |
| 20 | Household | MediaMarkt — Philips appliance | Exact model, new | Brand/model/condition | Exact cheaper total or safe no-match | — | — | — | — | — | — | — |

For every row also verify: no stale result remains, only HTTP(S) links open, shipping uncertainty never produces a saving, retry is available after safe failure, and quota changes only after a genuinely reliable live match.
