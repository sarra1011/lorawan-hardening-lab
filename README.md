# LoRaWAN Hardening Lab

[![Test and deploy](https://github.com/sarra1011/lorawan-hardening-lab/actions/workflows/pages.yml/badge.svg)](https://github.com/sarra1011/lorawan-hardening-lab/actions/workflows/pages.yml)

An interactive simulator for **OWASP ISVS 4.6.2**:

> Verify that the network, join and application servers of the LoRaWAN ecosystem are appropriately hardened according to industry best practices and benchmarks.

Switch hardening controls on and off for a ChirpStack v4 back-end, fire 12 attacks against it, and watch the score, the stack map and the generated configuration files change in real time.

**Live demo:** https://sarra1011.github.io/lorawan-hardening-lab/

**Tutoriel (français) :** [docs/TUTORIAL.fr.md](docs/TUTORIAL.fr.md)


## What you can do

- Toggle **22 hardening controls** across the MQTT broker, network server, join server, application server and gateway link.
- Run **12 attacks** one by one, or all at once, and read the commands and server replies in the terminal.
- Use **Apply the fix and re-run** after a breach to see the same attack get blocked.
- Watch the **stack map** colour each server by its weakest control.
- See what a **sniffer on the wire** captures: readable JSON in clear text, or encrypted TLS records.
- Read the **generated configuration** (`chirpstack.toml`, `region_eu868.toml`, `mosquitto.conf`, `gateway-bridge.toml`). The insecure lines are highlighted in red.
- Copy a **markdown report** of the current configuration and attack results.

Three presets get you started: **Default install** (0/100), **TLS only** (28/100) and **Fully hardened** (100/100).

## Controls

| Server | Controls |
|---|---|
| MQTT broker (Mosquitto) | MQ-01 no clear-text listener, MQ-02 anonymous access refused, MQ-03 TLS 1.2+, MQ-04 mutual TLS, MQ-05 topic ACL without `#` |
| Network server (ChirpStack) | NS-01 TLS to the broker, NS-02 client certificate, NS-03 unknown gateways rejected, NS-04 only the deployed region, NS-05 metrics on localhost, NS-07 production log level |
| Join server | JS-01 built-in join server, JS-02 join replay refused (DevNonce), JS-03 root keys protected at rest |
| Application server | AS-01 strong API secret, AS-02 HTTPS with HSTS, AS-03 default admin replaced, AS-04 integration over TLS, AS-05 PostgreSQL `sslmode=verify-full`, AS-06 database and Redis private |
| Gateway link | GW-01 Basics Station mutual TLS, GW-02 Semtech UDP 1700 closed |

Severity weights are 5 (critical), 3 (high), 2 (medium) and 1 (low). The score is the weight of the enabled controls divided by the total weight.

## Attacks

| # | Attack | Stopped by |
|---|---|---|
| A1 | Sniff MQTT traffic | MQ-01, NS-01, AS-04 |
| A2 | Anonymous subscribe to `#` | MQ-02, MQ-05, MQ-04 |
| A3 | Log in with `admin/admin` | AS-03 |
| A4 | Capture web credentials | AS-02 |
| A5 | Forge an API token | AS-01 |
| A6 | Rogue gateway injection | GW-01, GW-02, NS-03, MQ-02, MQ-05 |
| A7 | TLS downgrade | MQ-01, MQ-03 |
| A8 | Replay a JoinRequest | JS-02 |
| A9 | Root keys over an external join server | JS-01 |
| A10 | Direct PostgreSQL and Redis access | AS-06, AS-05 |
| A11 | Scrape metrics and debug logs | NS-05, NS-07 |
| A12 | Steal a database backup | JS-03 |

Some controls, such as NS-02, NS-04 and MQ-04, are defence in depth: no single attack in the lab depends on them alone.

## Run it locally

No build step and no dependencies. The page is a single `index.html`.

```bash
git clone https://github.com/sarra1011/lorawan-hardening-lab.git
cd lorawan-hardening-lab
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Tests

```bash
node tests/logic.test.js     # scoring, attacks and generated configs, no install needed
npm install
npx playwright install chromium
npm run test:smoke           # opens the page in a browser, clicks through it, fails on any JavaScript error
```

`npm test` runs both. The same tests run in GitHub Actions on every push and pull request.

## Deployment

The workflow in `.github/workflows/pages.yml` runs the tests and, on `main` only, publishes `index.html` to GitHub Pages. In the repository settings, set **Pages → Source** to **GitHub Actions**.

## Project structure

```
index.html                       the whole simulator (HTML, CSS and JavaScript)
tests/logic.test.js              logic tests
tests/smoke.test.mjs             browser smoke test (Playwright)
.github/workflows/pages.yml      test and deploy to GitHub Pages
docs/TUTORIAL.fr.md              step-by-step tutorial (French)
docs/screenshot.png              screenshot used in this README
```

## Limits of the simulation

This is a teaching model. Attack outcomes follow the documented configuration keys of ChirpStack v4, ChirpStack Gateway Bridge and Mosquitto, and the control IDs line up with a hardening audit of those three components. The page sends no network traffic. Controls that are organisational, such as hardware security modules for root keys or physical gateway protection, can only be represented as a switch here. Verify a real deployment with a configuration audit and live probes against a stack you own.

## References

- [OWASP IoT Security Verification Standard (ISVS)](https://owasp.org/www-project-iot-security-verification-standard/)
- [ChirpStack documentation](https://www.chirpstack.io/docs/)
- [Eclipse Mosquitto configuration](https://mosquitto.org/man/mosquitto-conf-5.html)
- [LoRaWAN specification, LoRa Alliance](https://lora-alliance.org/resource_hub/lorawan-specification-v1-1/)

## Author

Sarra Bahlous, ENSI (École Nationale des Sciences de l'Informatique), IoT Security course.
