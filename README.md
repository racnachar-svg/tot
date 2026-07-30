# Kahwet Al Aatik — Daily Operations

Solution-oriented order log for **Kahwet Al Aatik** (قهوة العتيق) in Tripoli, Lebanon.

Customers log what they enjoyed. The owner gets an honest daily count to match against the till — not a cash register, a clearer day of operations.

## What it solves

| Problem | How this helps |
| --- | --- |
| Orders get lost in conversation | Customers leave a clear itemized record |
| Till and memory disagree | Owner verifies each entry against the till |
| Closing the night is messy | One-tap **Daily close sheet** to copy/share |
| Regulars deserve a faster path | Personal links + “use last order” |
| Monthly patterns are invisible | Product, customer, category, and busy-day analysis |

## Views

1. **Customer order** — name, menu by category, log order  
2. **Owner records** — today’s stats, verify/flag, personal links, monthly analysis, daily close

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

Orders are stored in the browser (`localStorage`) so the demo works without a backend. For a real café launch, connect a shared database and protect the owner view with login.

## Brand

Built for Kahwet Al Aatik — open daily **4 PM — 4 AM**.
