name: Run WhatsApp Bot 24/7

on:
  workflow_dispatch:
  schedule:
    - cron: '50 */5 * * *'

permissions:
  contents: write

jobs:
  run-bot:
    runs-on: ubuntu-latest
    timeout-minutes: 350

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Start Bot
        continue-on-error: true
        run: timeout 345m node index.js

      - name: Save Session Files
        if: always()
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .
          git commit -m "Auto-save bot session" || exit 0
          git push
